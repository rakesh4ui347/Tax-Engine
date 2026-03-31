import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Temporal SDK imports are wrapped to allow the app to run without Temporal in dev
let Client: any;
let Connection: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sdk = require('@temporalio/client');
  Client = sdk.Client;
  Connection = sdk.Connection;
} catch {
  // Temporal SDK not installed — skip
}

@Injectable()
export class TemporalService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TemporalService.name);
  private client: any = null;
  private connection: any = null;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const address = this.config.get<string>('TEMPORAL_ADDRESS');
    const namespace = this.config.get<string>('TEMPORAL_NAMESPACE', 'payroll-engine');

    if (!address || !Client) {
      this.logger.warn('Temporal not configured — workflow orchestration disabled');
      return;
    }

    try {
      this.connection = await Connection.connect({ address });
      this.client = new Client({ connection: this.connection, namespace });
      this.logger.log(`Connected to Temporal at ${address} (namespace: ${namespace})`);
    } catch (err) {
      this.logger.error(`Failed to connect to Temporal: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.connection) {
      await this.connection.close();
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Start a payroll run workflow via Temporal.
   * Falls back to no-op if Temporal is not configured.
   */
  async startPayrollWorkflow(payrollRunId: string): Promise<string | null> {
    if (!this.isAvailable()) {
      this.logger.warn(`Temporal unavailable — payroll workflow skipped for run ${payrollRunId}`);
      return null;
    }

    const workflowId = `payroll-run-${payrollRunId}`;

    try {
      await this.client.start('payrollRunWorkflow', {
        taskQueue: 'payroll-queue',
        workflowId,
        args: [payrollRunId],
      });
      this.logger.log(`Started payroll workflow: ${workflowId}`);
      return workflowId;
    } catch (err) {
      this.logger.error(`Failed to start payroll workflow ${workflowId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Start a tax filing workflow (aggregates liabilities → generates forms → submits).
   * See workflows/tax-filing.workflow.ts for full flow.
   */
  async startTaxFilingWorkflow(params: {
    companyId: string;
    period: string;
    taxYear: number;
    filingDueDate: string;
    requiresConfirmation?: boolean;
  }): Promise<string | null> {
    if (!this.isAvailable()) {
      this.logger.warn(`Temporal unavailable — tax filing workflow skipped for ${params.companyId} / ${params.period}`);
      return null;
    }

    const workflowId = `tax-filing-${params.companyId}-${params.period}`;

    try {
      await this.client.start('taxFilingWorkflow', {
        taskQueue: 'payroll-queue',
        workflowId,
        args: [{
          ...params,
          requiresConfirmation: params.requiresConfirmation ?? true,
        }],
      });
      this.logger.log(`Started tax filing workflow: ${workflowId}`);
      return workflowId;
    } catch (err) {
      this.logger.error(`Failed to start tax filing workflow ${workflowId}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Signal a running workflow (e.g. approval received).
   */
  async signalWorkflow(workflowId: string, signalName: string, payload?: any): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const handle = this.client.getHandle(workflowId);
      await handle.signal(signalName, payload);
      this.logger.log(`Sent signal "${signalName}" to workflow ${workflowId}`);
    } catch (err) {
      this.logger.error(`Failed to signal workflow ${workflowId}: ${err.message}`);
    }
  }

  /**
   * Query workflow state.
   */
  async queryWorkflow<T>(workflowId: string, queryType: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const handle = this.client.getHandle(workflowId);
      return await handle.query(queryType);
    } catch {
      return null;
    }
  }

  /**
   * Cancel a running workflow.
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const handle = this.client.getHandle(workflowId);
      await handle.cancel();
      this.logger.log(`Cancelled workflow ${workflowId}`);
    } catch (err) {
      this.logger.error(`Failed to cancel workflow ${workflowId}: ${err.message}`);
    }
  }
}
