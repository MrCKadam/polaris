import React, { useState } from "react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "high", label: "Red" },
  { key: "medium", label: "Yellow" },
  { key: "low", label: "Green" },
];

export default function IcebergList({ icebergs, selectedId, onSelect }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = icebergs
    .filter((ib) => filter === "all" || ib.risk_level === filter)
    .filter((ib) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return ib.id.toLowerCase().includes(q) || ib.name.toLowerCase().includes(q);
    });

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by ID or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-tab filter-${f.key} ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="iceberg-list">
        {filtered
          .slice()
          .sort((a, b) => b.risk_score - a.risk_score)
          .map((ib) => (
            <button
              key={ib.id}
              className={`iceberg-row ${ib.id === selectedId ? "selected" : ""}`}
              onClick={() => onSelect(ib.id)}
            >
              <span className={`risk-dot risk-${ib.risk_level}`} />
              <span className="iceberg-row-main">
                <span className="iceberg-row-name">{ib.name}</span>
                <span className="iceberg-row-sub">{ib.size_km2} km² · {ib.drift_speed_kmh} km/h</span>
              </span>
              <span className="iceberg-row-score">{ib.risk_score}</span>
            </button>
          ))}
        {filtered.length === 0 && <div className="detail-card empty">No icebergs in this category.</div>}
      </div>
    </div>
  );
}
