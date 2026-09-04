import React, { useState } from "react";

export default function MapLegend() {
  const [open, setOpen] = useState(true);

  return (
    <div className={`map-legend ${open ? "" : "collapsed"}`}>
      <button className="map-legend-toggle" onClick={() => setOpen((o) => !o)}>
        Legend {open ? "−" : "+"}
      </button>
      {open && (
        <div className="map-legend-body">
          <div className="map-legend-row">
            <span className="legend-dot" style={{ background: "#E63946" }} /> High risk
          </div>
          <div className="map-legend-row">
            <span className="legend-dot" style={{ background: "#F4A340" }} /> Medium risk
          </div>
          <div className="map-legend-row">
            <span className="legend-dot" style={{ background: "#2EC4B6" }} /> Low risk
          </div>
          <div className="map-legend-row">
            <span className="legend-swatch-line" /> Dashed = projected drift
          </div>
          <div className="map-legend-row">
            <span className="legend-swatch-dots" /> Dotted = recent track
          </div>
          <div className="map-legend-row">
            <span className="legend-note">Marker size ≈ iceberg size (km²)</span>
          </div>
        </div>
      )}
    </div>
  );
}
