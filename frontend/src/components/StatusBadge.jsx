export default function StatusBadge({ status }) {
  const map = {
    SUBMITTED:    { label: 'Submitted',    cls: 'badge-submitted', icon: '📬' },
    UNDER_REVIEW: { label: 'Under Review', cls: 'badge-review',    icon: '🔍' },
    APPROVED:     { label: 'Approved',     cls: 'badge-approved',  icon: '✅' },
    REJECTED:     { label: 'Rejected',     cls: 'badge-rejected',  icon: '❌' },
  };
  const config = map[status] || { label: status, cls: 'badge-submitted', icon: '•' };
  return (
    <span className={`badge ${config.cls}`}>
      {config.icon} {config.label}
    </span>
  );
}
