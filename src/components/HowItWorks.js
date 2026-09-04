import React from "react";

const STAGES = [
  {
    title: "1. Data ingestion",
    text: "Sea-ice concentration, iceberg positions, ocean currents, and wind fields are pulled from satellite and reanalysis sources (NSIDC, Copernicus Marine Service, ERA5) and fed into the pipeline.",
  },
  {
    title: "2. Detection",
    text: "SAR (Synthetic Aperture Radar) satellite imagery is processed to identify and size icebergs — SAR is used because it works through cloud cover and polar darkness, unlike optical imagery.",
  },
  {
    title: "3. Drift prediction",
    text: "A physics baseline (ocean current + windage) projects each iceberg's motion forward in time. An uncertainty cone widens the further out the prediction goes, reflecting compounding forecast error.",
  },
  {
    title: "4. Risk scoring",
    text: "Each iceberg gets a 0–100 risk score from proximity to shipping lanes, drift speed, size, and time-to-impact — this drives the red/yellow/green classification you see on the map.",
  },
  {
    title: "5. Route planning",
    text: "An A* pathfinding algorithm searches for the shortest route between two ports that avoids all current and predicted high-risk zones, then compares it against the straight-line shortest path.",
  },
];

export default function HowItWorks({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>How it works</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {STAGES.map((s) => (
            <div className="modal-stage" key={s.title}>
              <div className="modal-stage-title">{s.title}</div>
              <div className="modal-stage-text">{s.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
