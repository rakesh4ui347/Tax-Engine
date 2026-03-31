import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  log,
  sleep,
} from '@temporalio/workflow';

// ─── Signals ─────────────────────────────────────────────────────────────────

export const confirmFilingSignal = defineSignal<[{ confirmedBy: string; notes?: string }]>(
  'confirmFiling',
);

export const cancelFilingSignal = defineSignal<[{ cancelledBy: string; reason: string }]>(
  'cancelFiling',
);

// ─── Activity proxies ─────────────────────────────────────────────────────────

interface TaxFilingActivities {
  aggregateTaxLiabilitiesActivity(input: { companyId: string; period: string; taxYear: number }): Promise<{ liabilityIds: string[]; totalAmount: number }>;
  generateFilingPackageActivity(input: { companyId: string; period: string; taxYear: number; liabilityIds: string[] }): Promise<{ packageId: string; formTypes: string[] }>;
  submitFilingActivity(input: { packageId: string; companyId: string }): Promise<{ confirmationNumber: string; submittedAt: string }>;
  markLiabilitiesPaidActivity(input: { liabilityIds: string[]; paidAt: string }): Promise<void>;
  sendFilingWebhookActivity(input: { companyId: string; event: string; payload: any }): Promise<void>;
  markFilingFailedActivity(input: { companyId: string; period: string; reason: string }): Promise<void>;
}

const {
  aggregateTaxLiabilitiesActivity,
  generateFilingPackageActivity,
  submitFilingActivity,
  markLiabilitiesPaidActivity,
  sendFilingWebhookActivity,
  markFilingFailedActivity,
} = proxyActivities<TaxFilingActivities>({
  startToCloseTimeout: '30 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
});

// ─── Workflow input ───────────────────────────────────────────────────────────

export interface TaxFilingWorkflowInput {
  companyId: string;
  period: string;   // e.g. '2025-Q1' or '2025-03'
  taxYear: number;
  filingDueDate: string; // ISO date string — workflow warns if approaching
  requiresConfirmation: boolean; // if true, waits for human confirm signal
}

// ─── taxFilingWorkflow ────────────────────────────────────────────────────────
//
// Steps:
//  1. Aggregate tax liabilities for the period
//  2. Generate the filing package (Form 941 / FUTA 940 / state returns)
//  3. Optionally wait for human confirmation (48-hour window before due date)
//  4. Submit the filing to tax authorities
//  5. Mark liabilities as paid and send TAX_FILING_SUBMITTED webhook

export async function taxFilingWorkflow(input: TaxFilingWorkflowInput): Promise<void> {
  const { companyId, period, taxYear, filingDueDate, requiresConfirmation } = input;

  log.info('Starting tax filing workflow', { companyId, period, taxYear });

  let confirmed = !requiresConfirmation; // auto-confirm if not required
  let cancelled = false;
  let cancellationReason = '';

  setHandler(confirmFilingSignal, ({ confirmedBy, notes }) => {
    confirmed = true;
    log.info('Tax filing confirmed', { companyId, period, confirmedBy, notes });
  });

  setHandler(cancelFilingSignal, ({ cancelledBy, reason }) => {
    cancelled = true;
    cancellationReason = reason;
    log.info('Tax filing cancelled', { companyId, period, cancelledBy, reason });
  });

  try {
    // Step 1: Aggregate liabilities
    log.info('Aggregating tax liabilities', { companyId, period });
    const { liabilityIds, totalAmount } = await aggregateTaxLiabilitiesActivity({
      companyId,
      period,
      taxYear,
    });

    if (liabilityIds.length === 0) {
      log.info('No tax liabilities for period — nothing to file', { companyId, period });
      return;
    }

    log.info('Tax liabilities aggregated', { companyId, period, count: liabilityIds.length, totalAmount });

    // Step 2: Generate filing package
    const { packageId, formTypes } = await generateFilingPackageActivity({
      companyId,
      period,
      taxYear,
      liabilityIds,
    });

    log.info('Filing package generated', { packageId, formTypes });

    // Step 3: Wait for confirmation (if required)
    if (requiresConfirmation) {
      log.info('Waiting for filing confirmation', { companyId, period });

      // Warn 48 hours before due date deadline
      const dueMs = new Date(filingDueDate).getTime() - Date.now();
      const warnMs = Math.max(0, dueMs - 48 * 60 * 60 * 1000);
      if (warnMs > 0) {
        await sleep(warnMs);
        if (!confirmed && !cancelled) {
          await sendFilingWebhookActivity({
            companyId,
            event: 'TAX_FILING_SUBMITTED',
            payload: {
              companyId,
              period,
              packageId,
              warning: 'Filing confirmation due within 48 hours',
              dueDate: filingDueDate,
            },
          });
        }
      }

      // Wait up to remaining time for confirmation
      const remainingMs = Math.max(0, new Date(filingDueDate).getTime() - Date.now());
      const confirmationReceived = await condition(
        () => confirmed || cancelled,
        `${Math.ceil(remainingMs / 1000)} seconds`,
      );

      if (!confirmationReceived || cancelled) {
        const reason = cancelled ? cancellationReason : 'Confirmation timeout — filing deadline passed';
        log.warn('Tax filing cancelled or timed out', { companyId, period, reason });
        await markFilingFailedActivity({ companyId, period, reason });
        await sendFilingWebhookActivity({
          companyId,
          event: 'TAX_FILING_SUBMITTED',
          payload: { companyId, period, status: 'CANCELLED', reason },
        });
        return;
      }
    }

    // Step 4: Submit filing
    log.info('Submitting tax filing', { packageId });
    const { confirmationNumber, submittedAt } = await submitFilingActivity({
      packageId,
      companyId,
    });

    log.info('Tax filing submitted', { companyId, period, confirmationNumber });

    // Step 5: Mark liabilities as paid
    await markLiabilitiesPaidActivity({ liabilityIds, paidAt: submittedAt });

    // Step 6: Notify
    await sendFilingWebhookActivity({
      companyId,
      event: 'TAX_FILING_SUBMITTED',
      payload: {
        companyId,
        period,
        taxYear,
        packageId,
        formTypes,
        confirmationNumber,
        submittedAt,
        liabilityCount: liabilityIds.length,
        totalAmount,
      },
    });

    log.info('Tax filing workflow completed', { companyId, period, confirmationNumber });
  } catch (err) {
    log.error('Tax filing workflow failed', { companyId, period, error: String(err) });

    await markFilingFailedActivity({
      companyId,
      period,
      reason: String(err),
    }).catch((e) => log.error('Failed to mark filing failed', { error: String(e) }));

    await sendFilingWebhookActivity({
      companyId,
      event: 'TAX_FILING_SUBMITTED',
      payload: { companyId, period, status: 'FAILED', error: String(err) },
    }).catch((e) => log.error('Failed to send failure webhook', { error: String(e) }));

    throw err;
  }
}
