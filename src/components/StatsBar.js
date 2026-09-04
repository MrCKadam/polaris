import React from "react";

export default function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="stats-bar">
      <div className="stat"><span>{stats.total_icebergs}</span><label>Tracked</label></div>
      <div className="stat stat-high"><span>{stats.high_risk}</span><label>High risk</label></div>
      <div className="stat stat-medium"><span>{stats.medium_risk}</span><label>Medium risk</label></div>
      <div className="stat"><span>{stats.avg_drift_speed_kmh}</span><label>Avg drift km/h</label></div>
    </div>
  );
}
