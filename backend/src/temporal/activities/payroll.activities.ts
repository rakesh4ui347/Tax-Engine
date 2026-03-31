/**
 * Temporal Activities for Payroll Processing
 *
 * Activities are the side-effectful units of work in a Temporal workflow.
 * Each activity function here maps to a step in the payroll lifecycle.
 *
 * The worker registers these with the Temporal task queue "payroll-queue".
 * Run the worker with: ts-node src/temporal/worker.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Activity Interface ───────────────────────────────────────────────────────

export interface PayrollActivities {
  calculatePayrollActivity(input: { payrollRunId: string }): Promise<void>;
  waitForApprovalActivity(input: { payrollRunId: string }): Promise<boolean>;
  processPayrollActivity(input: { payrollRunId: string; approverId: string; userId: string }): Promise<void>;
  sendWebhookActivity(input: { companyId: string; event: string; payload: Record<string, unknown> }): Promise<void>;
  markRunFailedActivity(input: { payrollRunId: string; reason: string }): Promise<void>;
}

// ─── Activity: Calculate Payroll ──────────────────────────────────────────────

export async function calculatePayrollActivity({ payrollRunId }: { payrollRunId: string }): Promise<void> {
  const run = await prisma.payrollRun.findUnique({ where: { id: payrollRunId } });
  if (!run) throw new Error(`PayrollRun ${payrollRunId} not found`);

  if (run.status !== 'DRAFT' && run.status !== 'PROCESSING') {
    throw new Error(`Cannot calculate run in status ${run.status}`);
  }

  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: { status: 'PROCESSING' },
  });

  // The actual calculation is done by PayrollService.calculateRun()
  // In a full worker setup, inject PayrollService via NestJS application context.
  // For now, flag as processing so the NestJS service can pick it up.
}

// ─── Activity: Wait for Approval ──────────────────────────────────────────────

export async function waitForApprovalActivity({ payrollRunId }: { payrollRunId: string }): Promise<boolean> {
  // Poll for approval for up to 48 hours (Temporal handles the timer)
  const run = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: { approvals: true },
  });

  if (!run) throw new Error(`PayrollRun ${payrollRunId} not found`);

  const approved = run.approvals.some((a: any) => a.status === 'APPROVED');
  const voided = run.status === 'VOIDED';

  return approved && !voided;
}

// ─── Activity: Process Payroll (Disbursement) ─────────────────────────────────

export async function processPayrollActivity({ payrollRunId }: { payrollRunId: string; approverId: string; userId: string }): Promise<void> {
  const run = await prisma.payrollRun.findUnique({ where: { id: payrollRunId } });
  if (!run) throw new Error(`PayrollRun ${payrollRunId} not found`);

  // In production: trigger ACH/wire transfers for each pay stub here.
  // For now: mark as COMPLETED and record processedAt timestamp.
  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: {
      status: 'COMPLETED',
      processedAt: new Date(),
    },
  });
}

// ─── Activity: Send Webhook ────────────────────────────────────────────────────

export async function sendWebhookActivity({ companyId, event, payload }: { companyId: string; event: string; payload: Record<string, unknown> }): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      companyId,
      isActive: true,
      events: { has: event as any },
    },
  });

  for (const webhook of webhooks) {
    await prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: event as any,
        payload: payload as any,
        idempotencyKey: `${companyId}-${event}-${webhook.id}-${Date.now()}`,
        status: 'PENDING',
      },
    });
  }
}

// ─── Activity: Mark Run Failed ────────────────────────────────────────────────

export async function markRunFailedActivity({ payrollRunId, reason }: { payrollRunId: string; reason: string }): Promise<void> {
  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: { status: 'FAILED' },
  });

  await prisma.auditLog.create({
    data: {
      action: 'PAYROLL_RUN_FAILED',
      resource: 'PayrollRun',
      resourceId: payrollRunId,
      newValue: { reason },
    },
  });
}

// ─── Activity: Generate Tax Liabilities ──────────────────────────────────────

export async function generateTaxLiabilitiesActivity(payrollRunId: string): Promise<void> {
  const payStubs = await prisma.payStub.findMany({
    where: { payrollRunId },
    include: { taxLines: true },
  });

  const run = await prisma.payrollRun.findUnique({ where: { id: payrollRunId } });
  if (!run) return;

  const taxYear = new Date(run.payDate).getFullYear();
  const quarter = Math.ceil((new Date(run.payDate).getMonth() + 1) / 3);
  const period = `${taxYear}-Q${quarter}`;

  // Aggregate all tax lines by code + state
  const liabilityMap = new Map<string, number>();

  for (const stub of payStubs) {
    for (const line of stub.taxLines) {
      const key = `${line.taxCode}|${line.state ?? ''}|${line.locality ?? ''}`;
      liabilityMap.set(key, (liabilityMap.get(key) ?? 0) + Number(line.amount));
    }
  }

  // Upsert TaxLiability rows
  for (const [key, amount] of liabilityMap) {
    const [taxCode, state, locality] = key.split('|');

    await prisma.taxLiability.upsert({
      where: {
        companyId_payrollRunId_taxCode_state_locality: {
          companyId: run.companyId,
          payrollRunId: run.id,
          taxCode: taxCode as any,
          state: (state || null) as any,
          locality: (locality || null) as any,
        },
      },
      create: {
        companyId: run.companyId,
        payrollRunId: run.id,
        taxCode: taxCode as any,
        taxYear,
        period,
        state: state || null,
        locality: locality || null,
        amount,
        liabilityBucket: getLiabilityBucket(taxCode),
        filingStatus: 'PENDING',
      },
      update: { amount },
    });
  }
}

function getLiabilityBucket(taxCode: string): any {
  if (['FIT'].includes(taxCode)) return 'FEDERAL';
  if (['SS_EMPLOYEE', 'SS_EMPLOYER', 'MEDICARE_EMPLOYEE', 'MEDICARE_EMPLOYER', 'ADDL_MEDICARE'].includes(taxCode)) return 'FICA';
  if (taxCode === 'FUTA') return 'FUTA';
  if (taxCode.startsWith('SUI')) return 'SUI';
  if (['PA_LOCAL', 'NYC_LOCAL', 'CITY'].includes(taxCode)) return 'LOCAL';
  return 'STATE';
}
