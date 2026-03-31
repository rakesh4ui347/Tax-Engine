import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  sleep,
  log,
} from '@temporalio/workflow';
import type { PayrollActivities } from '../activities/payroll.activities';

// ─── Signals ─────────────────────────────────────────────────────────────────

export const approvePayrollSignal = defineSignal<[{ approverId: string; notes?: string }]>(
  'approvePayroll',
);

export const rejectPayrollSignal = defineSignal<[{ approverId: string; reason: string }]>(
  'rejectPayroll',
);

// ─── Activity proxies ─────────────────────────────────────────────────────────

const {
  calculatePayrollActivity,
  waitForApprovalActivity,
  processPayrollActivity,
  sendWebhookActivity,
  markRunFailedActivity,
} = proxyActivities<PayrollActivities>({
  startToCloseTimeout: '30 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '5 seconds',
    backoffCoefficient: 2,
  },
});

// ─── Workflow ─────────────────────────────────────────────────────────────────

export interface PayrollWorkflowInput {
  payrollRunId: string;
  companyId: string;
  userId: string;
}

export async function payrollRunWorkflow(input: PayrollWorkflowInput): Promise<void> {
  const { payrollRunId, companyId, userId } = input;

  log.info('Starting payroll workflow', { payrollRunId });

  let approved = false;
  let rejected = false;
  let rejectionReason = '';
  let approverId = '';

  // Set up signal handlers for approval/rejection
  setHandler(approvePayrollSignal, ({ approverId: aid, notes }) => {
    approved = true;
    approverId = aid;
    log.info('Payroll approved via signal', { payrollRunId, approverId: aid });
  });

  setHandler(rejectPayrollSignal, ({ approverId: aid, reason }) => {
    rejected = true;
    approverId = aid;
    rejectionReason = reason;
    log.info('Payroll rejected via signal', { payrollRunId, reason });
  });

  try {
    // Step 1: Calculate payroll (taxes, deductions, net pay)
    log.info('Calculating payroll', { payrollRunId });
    await calculatePayrollActivity({ payrollRunId });

    log.info('Payroll calculated, waiting for approval', { payrollRunId });

    // Step 2: Wait for approval signal (or timeout after 48 hours)
    const approvalReceived = await condition(
      () => approved || rejected,
      '48 hours',
    );

    if (!approvalReceived) {
      // Timed out waiting for approval
      log.warn('Payroll approval timed out, marking as failed', { payrollRunId });
      await markRunFailedActivity({ payrollRunId, reason: 'Approval timeout (48h)' });
      await sendWebhookActivity({
        companyId,
        event: 'PAYROLL_RUN_FAILED',
        payload: { payrollRunId, reason: 'Approval timeout' },
      });
      return;
    }

    if (rejected) {
      log.info('Payroll rejected, marking as failed', { payrollRunId, rejectionReason });
      await markRunFailedActivity({ payrollRunId, reason: rejectionReason });
      await sendWebhookActivity({
        companyId,
        event: 'PAYROLL_RUN_FAILED',
        payload: { payrollRunId, reason: rejectionReason, rejectedBy: approverId },
      });
      return;
    }

    // Step 3: Process payroll (disbursement)
    log.info('Processing approved payroll', { payrollRunId });
    await processPayrollActivity({ payrollRunId, approverId, userId });

    // Step 4: Send completion webhook
    await sendWebhookActivity({
      companyId,
      event: 'PAYROLL_RUN_COMPLETED',
      payload: {
        payrollRunId,
        processedAt: new Date().toISOString(),
      },
    });

    log.info('Payroll workflow completed successfully', { payrollRunId });
  } catch (err) {
    log.error('Payroll workflow failed', { payrollRunId, error: String(err) });

    await markRunFailedActivity({
      payrollRunId,
      reason: String(err),
    }).catch((e) => log.error('Failed to mark run failed', { error: String(e) }));

    await sendWebhookActivity({
      companyId,
      event: 'PAYROLL_RUN_FAILED',
      payload: { payrollRunId, error: String(err) },
    }).catch((e) => log.error('Failed to send failure webhook', { error: String(e) }));

    throw err;
  }
}
