import React, { useState } from "react";
import { api } from "../api";

const PRESETS = {
  "Ushuaia → Palmer Station": { start: [-54.8, -68.3], end: [-64.77, -64.05] },
  "Punta Arenas → Neko Harbour": { start: [-53.16, -70.9], end: [-64.83, -62.55] },
};

export default function RoutePlanner({
  routeStart, routeEnd, onSetStart, onSetEnd, onClearPoints,
  pickingMode, onSetPickingMode, onResult,
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const applyPreset = (name) => {
    const { start, end } = PRESETS[name];
    onSetStart({ lat: start[0], lon: start[1] });
    onSetEnd({ lat: end[0], lon: end[1] });
    setResult(null);
    onResult(null);
  };

  const findRoute = async () => {
    if (!routeStart || !routeEnd) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRoute({
        start_lat: routeStart.lat, start_lon: routeStart.lon,
        end_lat: routeEnd.lat, end_lon: routeEnd.lon,
        horizon_hours: 24,
      });
      setResult(res);
      onResult(res.found ? res.safe_route : null);
    } catch (e) {
      setError("Could not reach the route service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="route-planner">
      <label className="route-label">Quick presets</label>
      <select
        className="route-select"
        defaultValue=""
        onChange={(e) => e.target.value && applyPreset(e.target.value)}
      >
        <option value="" disabled>Choose a preset…</option>
        {Object.keys(PRESETS).map((k) => <option key={k} value={k}>{k}</option>)}
      </select>

      <label className="route-label">Or click points on the map</label>
      <div className="pick-buttons">
        <button
          className={`pick-btn ${pickingMode === "start" ? "active" : ""}`}
          onClick={() => onSetPickingMode(pickingMode === "start" ? null : "start")}
        >
          {routeStart ? `Start: ${routeStart.lat.toFixed(2)}, ${routeStart.lon.toFixed(2)}` : "Pick start point"}
        </button>
        <button
          className={`pick-btn ${pickingMode === "end" ? "active" : ""}`}
          onClick={() => onSetPickingMode(pickingMode === "end" ? null : "end")}
        >
          {routeEnd ? `End: ${routeEnd.lat.toFixed(2)}, ${routeEnd.lon.toFixed(2)}` : "Pick end point"}
        </button>
      </div>
      {pickingMode && (
        <p className="pick-hint">Click anywhere on the map to set the {pickingMode} point.</p>
      )}
      {(routeStart || routeEnd) && (
        <button className="clear-btn" onClick={() => { onClearPoints(); setResult(null); onResult(null); }}>
          Clear points
        </button>
      )}

      <button className="route-btn" onClick={findRoute} disabled={loading || !routeStart || !routeEnd}>
        {loading ? "Calculating…" : "Find safe route"}
      </button>

      {error && <p className="route-error">{error}</p>}

      {result && result.found && (
        <div className="route-result">
          <div><span>Safe route</span><strong>{result.safe_distance_km} km</strong></div>
          <div><span>Shortest possible</span><strong>{result.shortest_distance_km} km</strong></div>
          <div><span>Detour cost</span><strong>+{result.extra_distance_km} km</strong></div>
          <div><span>Est. transit</span><strong>{result.estimated_hours_at_20kmh} h</strong></div>
        </div>
      )}
      {result && !result.found && (
        <p className="route-error">{result.message}</p>
      )}
    </div>
  );
}
