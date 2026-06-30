// The admin console uses a wider, deliberately distinct status-color
// vocabulary than the branded mobile apps -- operators scanning a table or
// map need to tell seven lifecycle stages apart at a glance, which a
// brand-constrained 3-tier palette can't do. Customer/partner app UI keeps
// its own brand-consistent 3-tier system; this one is dashboard-only.
const STATUS_CONFIG = {
  REQUESTED: { label: 'Requested', color: '#2196F3', live: true }, // Blue
  ASSIGNED: { label: 'Assigned', color: '#FB8C00', live: false }, // Orange
  EN_ROUTE: { label: 'En route', color: '#9C27B0', live: true }, // Purple
  ARRIVED: { label: 'Arrived', color: '#00897B', live: false }, // Teal
  IN_PROGRESS: { label: 'In progress', color: '#FFA000', live: true }, // Amber
  COMPLETED: { label: 'Completed', color: '#43A047', live: false }, // Green
  CANCELLED: { label: 'Cancelled', color: '#E53935', live: false }, // Red
  NO_PARTNER_FOUND: { label: 'No partner found', color: '#E53935', live: false },
  APPROVED: { label: 'Approved', color: '#43A047', live: false },
  PENDING_REVIEW: { label: 'Pending review', color: '#FB8C00', live: true },
  REJECTED: { label: 'Rejected', color: '#E53935', live: false },
  NOT_SUBMITTED: { label: 'Not submitted', color: '#9C9C9C', live: false },
  SUCCESS: { label: 'Success', color: '#43A047', live: false },
  FAILED: { label: 'Failed', color: '#E53935', live: false },
  CREATED: { label: 'Created', color: '#2196F3', live: false },
  ACTIVE: { label: 'Active', color: '#43A047', live: false },
  SUSPENDED: { label: 'Suspended', color: '#FB8C00', live: false },
  BLOCKED: { label: 'Blocked', color: '#E53935', live: false },
  PENDING: { label: 'Pending', color: '#9C9C9C', live: false },
};

export default function BeaconBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, color: '#9C9C9C', live: false };
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ borderColor: `${config.color}40`, backgroundColor: `${config.color}14`, color: config.color }}
    >
      <span className={`beacon-dot ${config.live ? 'is-live' : ''}`} style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}
