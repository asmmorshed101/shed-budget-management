
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "blue",
}) {
  return (
    <div className="stat-card">
      <div className="stat-info">
        <p>{title}</p>
        <h2>{value}</h2>
        <span>{subtitle}</span>
      </div>

      <div className={`stat-icon ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  );
}
