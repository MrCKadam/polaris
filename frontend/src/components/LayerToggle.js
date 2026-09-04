import React from "react";

export default function LayerToggle({ showWind, onToggleWind }) {
  return (
    <div className="layer-toggle">
      <label>
        <input type="checkbox" checked={showWind} onChange={(e) => onToggleWind(e.target.checked)} />
        Wind / current vectors
      </label>
      <div className="layer-legend">
        <span className="legend-swatch legend-wind" /> Wind (amber)
        <span className="legend-swatch legend-current" /> Current (teal)
      </div>
    </div>
  );
}
