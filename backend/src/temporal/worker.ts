/**
 * Temporal Worker — run this process separately alongside the NestJS API.
 *
 * Usage:
 *   npx ts-node src/temporal/worker.ts
 *
 * Or with ts-node-dev:
 *   npx ts-node-dev src/temporal/worker.ts
 */

import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities/payroll.activities';

async function run() {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  const namespace = process.env.TEMPORAL_NAMESPACE || 'payroll-engine';

  const connection = await NativeConnection.connect({ address });

  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue: 'payroll-queue',
    workflowsPath: require.resolve('./workflows/payroll.workflow'),
    activities,
  });

  console.log(`Temporal worker started — queue: payroll-queue @ ${address}`);
  await worker.run();
}

run().catch((err) => {
  console.error('Temporal worker failed:', err);
  process.exit(1);
});
