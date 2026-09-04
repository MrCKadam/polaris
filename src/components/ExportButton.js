import React from "react";

function buildReport(icebergs, alerts, stats) {
  const now = new Date().toISOString();
  const lines = [];
  lines.push(`# Antarctic Navigator - Situation Report`);
  lines.push(`Generated: ${now}`);
  lines.push("");
  if (stats) {
    lines.push(`## Fleet Summary`);
    lines.push(`- Total tracked: ${stats.total_icebergs}`);
    lines.push(`- High risk: ${stats.high_risk}`);
    lines.push(`- Medium risk: ${stats.medium_risk}`);
    lines.push(`- Low risk: ${stats.low_risk}`);
    lines.push(`- Avg drift speed: ${stats.avg_drift_speed_kmh} km/h`);
    lines.push("");
  }
  lines.push(`## Icebergs`);
  icebergs
    .slice()
    .sort((a, b) => b.risk_score - a.risk_score)
    .forEach((ib) => {
      lines.push(`### ${ib.name} (${ib.id})`);
      lines.push(`- Risk: ${ib.risk_level.toUpperCase()} (${ib.risk_score})`);
      lines.push(`- Position: ${ib.lat.toFixed(2)}, ${ib.lon.toFixed(2)}`);
      lines.push(`- Size: ${ib.size_km2} km²`);
      lines.push(`- Drift: ${ib.drift_speed_kmh} km/h @ ${ib.drift_direction_deg}°`);
      lines.push(`- Distance to lane: ${ib.distance_to_lane_km} km`);
      lines.push(`- Time to impact: ${ib.time_to_impact_h} h`);
      lines.push("");
    });
  if (alerts && alerts.length > 0) {
    lines.push(`## Active Alerts`);
    alerts.forEach((a) => lines.push(`- [${a.level.toUpperCase()}] ${a.message}`));
  }
  return lines.join("\n");
}

export default function ExportButton({ icebergs, alerts, stats }) {
  const handleExport = () => {
    const report = buildReport(icebergs, alerts, stats);
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `antarctic-navigator-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button className="export-btn" onClick={handleExport} disabled={!icebergs || icebergs.length === 0}>
      Export report
    </button>
  );
}
