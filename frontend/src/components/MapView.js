import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, Circle, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

const RISK_COLOR = { high: "#E63946", medium: "#F4A340", low: "#2EC4B6" };

const BASEMAPS = {
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
  },
  topo: {
    label: "Topo",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, DeLorme, NAVTEQ",
  },
  radar: {
    label: "SAR Radar",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Light Gray Canvas",
  },
};

function pinIcon(color, label) {
  const svg = `
    <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.8 0 0 5.8 0 13c0 9.75 13 21 13 21s13-11.25 13-21c0-7.2-5.8-13-13-13z"
            fill="${color}" stroke="#050C13" stroke-width="1.5"/>
      <text x="13" y="17" font-size="12" font-weight="700" text-anchor="middle" fill="#050C13"
            font-family="monospace">${label}</text>
    </svg>`;
  return L.divIcon({ html: svg, className: "pin-icon", iconSize: [26, 34], iconAnchor: [13, 34] });
}

function shipIcon(bearingDeg) {
  const svg = `
    <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg"
         style="transform: rotate(${bearingDeg}deg); transform-origin: center;">
      <polygon points="13,1 22,22 13,17 4,22" fill="#EAF2F5" stroke="#050C13" stroke-width="1.5" />
    </svg>`;
  return L.divIcon({ html: svg, className: "ship-icon", iconSize: [26, 26], iconAnchor: [13, 13] });
}

function bearingBetween(a, b) {
  const [lat1, lon1] = a, [lat2, lon2] = b;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Captures map clicks while in "pick start/end" mode
function ClickCapture({ pickingMode, onPick }) {
  useMapEvents({
    click(e) {
      if (pickingMode) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Projects an iceberg's position forward OR backward in time using its
// current drift vector - negative hours traces where it likely was.
function projectPoint(ib, hours) {
  const bearingRad = (ib.drift_direction_deg * Math.PI) / 180;
  const distanceKm = ib.drift_speed_kmh * hours;
  const dlat = (distanceKm * Math.cos(bearingRad)) / 111;
  const dlon = (distanceKm * Math.sin(bearingRad)) / (111 * Math.cos((ib.lat * Math.PI) / 180) || 1);
  return [ib.lat + dlat, ib.lon + dlon];
}

// Radius scaled to iceberg size so bigger bergs read as visually bigger,
// clamped so tiny/huge sizes don't break the map's readability.
function sizeRadius(size_km2, isSelected) {
  const base = 4 + Math.sqrt(Math.max(size_km2, 0)) * 0.55;
  const clamped = Math.min(16, Math.max(4, base));
  return isSelected ? clamped + 3 : clamped;
}

// Rough illustrative confidence for a projection - falls off with time,
// mirrors the same shape as the uncertainty radius so the two agree.
function confidenceAtHour(hours) {
  return Math.round(Math.max(20, 95 - hours * 1.4));
}

// Button that fits the map view to every current iceberg position
function ZoomToFit({ icebergs }) {
  const map = useMap();
  const handleClick = () => {
    if (!icebergs || icebergs.length === 0) return;
    const bounds = icebergs.map((ib) => [ib.lat, ib.lon]);
    map.fitBounds(bounds, { padding: [50, 50] });
  };
  return (
    <button className="zoom-fit-btn" onClick={handleClick} title="Fit all icebergs in view">
      ⤢ Fit all
    </button>
  );
}

// Animates a ship marker walking the safe route once it's found
function ShipAnimator({ path }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    if (!path || path.length < 2) return;
    const id = setInterval(() => {
      setIdx((i) => (i + 1 < path.length ? i + 1 : i));
    }, 120);
    return () => clearInterval(id);
  }, [path]);

  if (!path || path.length === 0) return null;
  // Clamp defensively: idx can briefly point past the end of a NEW
  // (shorter) path for one render, before the effect above resets it.
  const safeIdx = Math.min(idx, path.length - 1);
  const pos = path[safeIdx];
  const next = path[Math.min(safeIdx + 1, path.length - 1)];
  if (!pos || !next) return null;
  const bearing = bearingBetween(pos, next);

  return <Marker position={pos} icon={shipIcon(bearing)} interactive={false} />;
}

// Builds a small rotated arrow icon for wind/current vectors.
// bearingDeg follows compass convention (0 = north, 90 = east).
function arrowIcon(bearingDeg, color, lengthPx) {
  const cx = (lengthPx + 10) / 2;
  const svg = `
    <svg width="${lengthPx + 10}" height="${lengthPx + 10}" viewBox="0 0 ${lengthPx + 10} ${lengthPx + 10}"
         style="transform: rotate(${bearingDeg}deg); transform-origin: center;">
      <line x1="${cx}" y1="${lengthPx + 8}" x2="${cx}" y2="4"
            stroke="#050C13" stroke-width="4.5" stroke-linecap="round" opacity="0.55" />
      <polygon points="${cx - 5},11 ${cx + 5},11 ${cx},1"
               fill="#050C13" opacity="0.55" />
      <line x1="${cx}" y1="${lengthPx + 8}" x2="${cx}" y2="4"
            stroke="${color}" stroke-width="2.5" stroke-linecap="round" />
      <polygon points="${cx - 4},10 ${cx + 4},10 ${cx},2"
               fill="${color}" />
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "wind-arrow-icon",
    iconSize: [lengthPx + 10, lengthPx + 10],
    iconAnchor: [cx, cx],
  });
}

// Finds the predicted point closest to the slider's chosen hour for one iceberg
function pointAtHour(predictions, hour) {
  if (!Array.isArray(predictions) || predictions.length === 0) return null;
  const closest = predictions.reduce((closest, p) =>
    Math.abs(p.hours - hour) < Math.abs(closest.hours - hour) ? p : closest
  );
  // guard against malformed/partial data so the map never crashes
  if (
    !closest ||
    typeof closest.lat !== "number" ||
    typeof closest.lon !== "number" ||
    Number.isNaN(closest.lat) ||
    Number.isNaN(closest.lon)
  ) {
    return null;
  }
  return closest;
}

export default function MapView({
  icebergs, predictions, horizonHours, selectedId, onSelect, routePath,
  showWind, basemap, pickingMode, onMapPick, routeStart, routeEnd, animateShip,
}) {
  const active = BASEMAPS[basemap] || BASEMAPS.satellite;

  return (
    <MapContainer
      center={[-64, -56]}
      zoom={5}
      minZoom={3}
      maxBounds={[[-90, -180], [-20, 180]]}
      maxBoundsViscosity={1.0}
      worldCopyJump={false}
      className={`map-container ${pickingMode ? "picking-mode" : ""}`}
      scrollWheelZoom={true}
    >
      <ClickCapture pickingMode={pickingMode} onPick={onMapPick} />
      <TileLayer
        key={basemap}
        attribution={active.attribution}
        url={active.url}
        noWrap={true}
      />

      {icebergs.map((ib) => {
        const preds = predictions[ib.id];
        const projected = pointAtHour(preds, horizonHours);
        const color = RISK_COLOR[ib.risk_level] || "#EAF2F5";
        const isSelected = ib.id === selectedId;

        return (
          <React.Fragment key={ib.id}>
            {/* historical trail - illustrative backward projection, fades toward the past */}
            <Polyline
              positions={[projectPoint(ib, -12), projectPoint(ib, -6), [ib.lat, ib.lon]]}
              pathOptions={{ color, weight: 1, opacity: 0.3, dashArray: "1 5" }}
            />

            {/* current position */}
            <CircleMarker
              center={[ib.lat, ib.lon]}
              radius={sizeRadius(ib.size_km2, isSelected)}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: isSelected ? 3 : 1 }}
              eventHandlers={{ click: () => onSelect(ib.id) }}
            >
              <Tooltip direction="top">{ib.name} · {ib.risk_level.toUpperCase()} · {ib.size_km2} km²</Tooltip>
            </CircleMarker>

            {/* projected drift path + position at slider hour */}
            {projected && horizonHours > 0 && (
              <>
                <Polyline
                  positions={[[ib.lat, ib.lon], [projected.lat, projected.lon]]}
                  pathOptions={{ color, weight: 1.5, dashArray: "4 6", opacity: 0.7 }}
                />
                <Circle
                  center={[projected.lat, projected.lon]}
                  radius={projected.uncertainty_km * 1000}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1, opacity: 0.5 }}
                />
                <CircleMarker
                  center={[projected.lat, projected.lon]}
                  radius={4}
                  pathOptions={{ color, fillColor: "#0B1E33", fillOpacity: 1, weight: 2 }}
                >
                  <Tooltip direction="top">
                    +{horizonHours}h · ±{projected.uncertainty_km} km · {confidenceAtHour(horizonHours)}% confidence
                  </Tooltip>
                </CircleMarker>
              </>
            )}

            {/* wind vector - offset slightly north of the iceberg so it doesn't overlap the marker */}
            {showWind && (
              <Marker
                position={[ib.lat + 0.15, ib.lon]}
                icon={arrowIcon(ib.wind_direction_deg, "#F4A340", Math.min(30, 10 + ib.wind_speed_kmh))}
                interactive={false}
              />
            )}
            {/* current vector - offset south */}
            {showWind && (
              <Marker
                position={[ib.lat - 0.15, ib.lon]}
                icon={arrowIcon(ib.current_direction_deg, "#2EC4B6", Math.min(30, 10 + ib.current_speed_kmh * 6))}
                interactive={false}
              />
            )}
          </React.Fragment>
        );
      })}

      {routePath && routePath.length > 1 && (
        <>
          <Polyline
            positions={routePath}
            pathOptions={{ color: "#0B1E33", weight: 6, opacity: 0.6 }}
          />
          <Polyline
            positions={routePath}
            pathOptions={{ color: "#EAF2F5", weight: 3, opacity: 0.95 }}
          />
          {animateShip && <ShipAnimator path={routePath} />}
        </>
      )}

      {routeStart && (
        <Marker position={[routeStart.lat, routeStart.lon]} icon={pinIcon("#2EC4B6", "S")} interactive={false} />
      )}
      {routeEnd && (
        <Marker position={[routeEnd.lat, routeEnd.lon]} icon={pinIcon("#E63946", "E")} interactive={false} />
      )}

      <ZoomToFit icebergs={icebergs} />

      <div className="map-legend">
        <div className="map-legend-item"><span className="legend-dot legend-dot-high" />High risk</div>
        <div className="map-legend-item"><span className="legend-dot legend-dot-medium" />Medium risk</div>
        <div className="map-legend-item"><span className="legend-dot legend-dot-low" />Low risk</div>
      </div>
    </MapContainer>
  );
}
