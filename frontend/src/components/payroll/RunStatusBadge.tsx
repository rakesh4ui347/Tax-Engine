import { PayrollRunStatus } from '@/types/api';
import { Badge } from '@/components/ui/Badge';

interface RunStatusBadgeProps {
  status: PayrollRunStatus;
}

const statusConfig: Record<PayrollRunStatus, {
  label: string;
  variant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple';
}> = {
  [PayrollRunStatus.DRAFT]: { label: 'Draft', variant: 'default' },
  [PayrollRunStatus.PENDING_APPROVAL]: { label: 'Pending Approval', variant: 'warning' },
  [PayrollRunStatus.APPROVED]: { label: 'Approved', variant: 'primary' },
  [PayrollRunStatus.PROCESSING]: { label: 'Processing', variant: 'purple' },
  [PayrollRunStatus.COMPLETED]: { label: 'Completed', variant: 'success' },
  [PayrollRunStatus.FAILED]: { label: 'Failed', variant: 'danger' },
  [PayrollRunStatus.CANCELLED]: { label: 'Cancelled', variant: 'default' },
};

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'default' as const };
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}
