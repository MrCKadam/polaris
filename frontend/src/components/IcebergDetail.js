import React from "react";

export default function IcebergDetail({ iceberg, prediction }) {
  if (!iceberg) {
    return <div className="detail-card empty">Select an iceberg on the map or list to see details.</div>;
  }

  const p24 = prediction?.predictions?.find((p) => p.hours === 24);

  return (
    <div className="detail-card">
      <div className="detail-header">
        <h3>{iceberg.name}</h3>
        <span className={`risk-badge risk-${iceberg.risk_level}`}>
          {iceberg.risk_level.toUpperCase()} · {iceberg.risk_score}
        </span>
      </div>
      <dl className="detail-grid">
        <dt>Position</dt><dd>{iceberg.lat.toFixed(2)}, {iceberg.lon.toFixed(2)}</dd>
        <dt>Size</dt><dd>{iceberg.size_km2} km²</dd>
        <dt>Drift speed</dt><dd>{iceberg.drift_speed_kmh} km/h @ {iceberg.drift_direction_deg}°</dd>
        <dt>Wind</dt><dd>{iceberg.wind_speed_kmh} km/h @ {iceberg.wind_direction_deg}°</dd>
        <dt>Ocean current</dt><dd>{iceberg.current_speed_kmh} km/h @ {iceberg.current_direction_deg}°</dd>
        <dt>Distance to lane</dt><dd>{iceberg.distance_to_lane_km} km</dd>
        <dt>Time to impact</dt><dd>{iceberg.time_to_impact_h} h</dd>
        {iceberg.detected_at && (
          <>
            <dt>First detected</dt>
            <dd>{new Date(iceberg.detected_at).toUTCString().slice(0, 22)}</dd>
          </>
        )}
        {p24 && (
          <>
            <dt>+24h position</dt>
            <dd>{p24.lat.toFixed(2)}, {p24.lon.toFixed(2)} (±{p24.uncertainty_km} km)</dd>
          </>
        )}
      </dl>
    </div>
  );
}
