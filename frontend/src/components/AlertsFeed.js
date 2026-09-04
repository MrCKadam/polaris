import React from "react";

export default function AlertsFeed({ alerts }) {
  if (!Array.isArray(alerts) || alerts.length === 0) return null;
  return (
    <div className="alerts-feed">
      <div className="alerts-title">Alerts</div>
      {alerts.map((a) => (
        <div key={a.id} className={`alert-row alert-${a.level}`}>
          {a.message}
        </div>
      ))}
    </div>
  );
}
