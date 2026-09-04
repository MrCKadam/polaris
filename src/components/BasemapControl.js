import React from "react";

const OPTIONS = [
  { key: "satellite", label: "Satellite" },
  { key: "topo", label: "Topo" },
  { key: "radar", label: "SAR Radar" },
];

export default function BasemapControl({ basemap, onChange }) {
  return (
    <div className="basemap-control">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          className={basemap === opt.key ? "active" : ""}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
