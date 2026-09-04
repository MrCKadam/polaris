"""
Antarctic Navigator - Backend
FastAPI service serving iceberg data, drift predictions, risk scores,
a safe-route planner, alerts, and summary stats.

Run:
    pip install fastapi uvicorn pydantic
    uvicorn main:app --reload
Then open http://127.0.0.1:8000/docs to see all endpoints.
"""

import json
import math
import heapq
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="Antarctic Navigator API")

# Allow the React dev server (and any origin, for hackathon simplicity) to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = Path(__file__).parent / "data" / "icebergs.json"

# In-memory "database" - loaded once at startup, no real DB needed for a demo
with open(DATA_PATH, "r") as f:
    ICEBERGS = json.load(f)

# ---------------------------------------------------------------------------
# Pydantic models (request validation, so bad input can't crash a live demo)
# ---------------------------------------------------------------------------

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    horizon_hours: int = 24  # how far ahead to treat iceberg drift as a hazard


class LatLon(BaseModel):
    lat: float
    lon: float


# ---------------------------------------------------------------------------
# Risk scoring
# ---------------------------------------------------------------------------

def compute_risk(iceberg: dict) -> dict:
    """
    Combines proximity to shipping lane, drift speed, size, and time-to-impact
    into a single 0-100 risk score. Weights are tuned to feel sensible, not
    derived from real maritime insurance data - good enough for a demo.
    """
    distance = iceberg["distance_to_lane_km"]
    speed = iceberg["drift_speed_kmh"]
    size = iceberg["size_km2"]

    proximity_factor = max(0.0, 1 - distance / 100)      # closer = riskier
    speed_factor = min(speed / 5.0, 1.0)                  # faster = riskier
    size_factor = min(size / 300.0, 1.0)                  # bigger = riskier

    time_to_impact_h = distance / speed if speed > 0 else 999
    urgency_factor = max(0.0, 1 - time_to_impact_h / 48)  # sooner = riskier

    score = (
        proximity_factor * 40
        + speed_factor * 20
        + size_factor * 15
        + urgency_factor * 25
    )
    score = round(min(100, max(0, score)), 1)

    if score >= 65:
        level = "high"
    elif score >= 35:
        level = "medium"
    else:
        level = "low"

    return {
        "score": score,
        "level": level,
        "time_to_impact_h": round(time_to_impact_h, 1),
    }


def enrich(iceberg: dict) -> dict:
    risk = compute_risk(iceberg)
    return {**iceberg, "risk_score": risk["score"], "risk_level": risk["level"],
            "time_to_impact_h": risk["time_to_impact_h"]}


# ---------------------------------------------------------------------------
# Drift prediction (physics baseline: current + windage)
# ---------------------------------------------------------------------------

KM_PER_DEG_LAT = 111.0


def predict_position(iceberg: dict, hours: float) -> dict:
    """
    Projects iceberg position `hours` ahead using its drift vector
    (already a current + ~2.5% windage blend in the source data).
    Uncertainty radius grows with the sqrt of time, which is the standard
    shape for compounding drift error and also looks right on a map.
    """
    speed = iceberg["drift_speed_kmh"]
    bearing_deg = iceberg["drift_direction_deg"]
    bearing_rad = math.radians(bearing_deg)

    distance_km = speed * hours
    dlat = (distance_km * math.cos(bearing_rad)) / KM_PER_DEG_LAT
    dlon = (distance_km * math.sin(bearing_rad)) / (
        KM_PER_DEG_LAT * math.cos(math.radians(iceberg["lat"])) or 1
    )

    predicted_lat = iceberg["lat"] + dlat
    predicted_lon = iceberg["lon"] + dlon
    uncertainty_km = 2 + 1.1 * math.sqrt(max(hours, 0))

    return {
        "hours": hours,
        "lat": round(predicted_lat, 4),
        "lon": round(predicted_lon, 4),
        "uncertainty_km": round(uncertainty_km, 1),
    }


# ---------------------------------------------------------------------------
# Route planning - grid-based A*, icebergs (+ predicted drift) are obstacles
# ---------------------------------------------------------------------------

GRID_STEP_DEG = 0.25  # ~28km cells - coarse enough to be fast, fine enough to look real


def hazard_cells(horizon_hours: int) -> set:
    """Cells to avoid: each iceberg's current position AND its predicted
    position at horizon_hours, buffered by a radius scaled to size + risk."""
    cells = set()
    for ib in ICEBERGS:
        risk = compute_risk(ib)
        buffer_km = 15 + (ib["size_km2"] ** 0.5) + risk["score"] / 5
        for point in (
            {"lat": ib["lat"], "lon": ib["lon"]},
            predict_position(ib, horizon_hours),
        ):
            buffer_deg = buffer_km / KM_PER_DEG_LAT
            steps = max(1, int(buffer_deg / GRID_STEP_DEG))
            base_r = round(point["lat"] / GRID_STEP_DEG)
            base_c = round(point["lon"] / GRID_STEP_DEG)
            for dr in range(-steps, steps + 1):
                for dc in range(-steps, steps + 1):
                    if dr * dr + dc * dc <= steps * steps:
                        cells.add((base_r + dr, base_c + dc))
    return cells


def astar_route(start: LatLon, end: LatLon, horizon_hours: int) -> Optional[List[List[float]]]:
    def to_cell(p): return (round(p.lat / GRID_STEP_DEG), round(p.lon / GRID_STEP_DEG))
    def to_latlon(cell): return [cell[0] * GRID_STEP_DEG, cell[1] * GRID_STEP_DEG]
    def heuristic(a, b): return math.hypot(a[0] - b[0], a[1] - b[1])

    start_c, end_c = to_cell(start), to_cell(end)
    blocked = hazard_cells(horizon_hours)

    open_set = [(0, start_c)]
    came_from = {}
    g_score = {start_c: 0}
    neighbors = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

    visited_cap = 20000  # safety cap so a bad request can't hang the demo
    visited = 0

    while open_set and visited < visited_cap:
        visited += 1
        _, current = heapq.heappop(open_set)

        if heuristic(current, end_c) < 1.5:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            path.reverse()
            path.append(end_c)
            return [to_latlon(c) for c in path]

        for dr, dc in neighbors:
            neighbor = (current[0] + dr, current[1] + dc)
            if neighbor in blocked:
                continue
            tentative_g = g_score[current] + math.hypot(dr, dc)
            if tentative_g < g_score.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score = tentative_g + heuristic(neighbor, end_c)
                heapq.heappush(open_set, (f_score, neighbor))

    return None  # no safe route found within cap


def straight_line_km(a: LatLon, b: LatLon) -> float:
    dlat = (b.lat - a.lat) * KM_PER_DEG_LAT
    dlon = (b.lon - a.lon) * KM_PER_DEG_LAT * math.cos(math.radians((a.lat + b.lat) / 2))
    return math.hypot(dlat, dlon)


def path_length_km(path: List[List[float]]) -> float:
    total = 0.0
    for i in range(len(path) - 1):
        a = LatLon(lat=path[i][0], lon=path[i][1])
        b = LatLon(lat=path[i+1][0], lon=path[i+1][1])
        total += straight_line_km(a, b)
    return total


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/icebergs")
def get_icebergs(risk: Optional[str] = Query(None, description="filter: low | medium | high")):
    enriched = [enrich(ib) for ib in ICEBERGS]
    if risk:
        enriched = [ib for ib in enriched if ib["risk_level"] == risk]
    return enriched


@app.get("/icebergs/{iceberg_id}")
def get_iceberg(iceberg_id: str):
    match = next((ib for ib in ICEBERGS if ib["id"] == iceberg_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Iceberg not found")
    return enrich(match)


@app.get("/predict/{iceberg_id}")
def get_prediction(iceberg_id: str):
    match = next((ib for ib in ICEBERGS if ib["id"] == iceberg_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Iceberg not found")
    # Negative hours reuse the same drift-vector physics run backward, giving a
    # "trail" of recent track behind the iceberg's current position; positive
    # hours are the forward projection used for the timeline slider.
    horizons = [-24, -12, -6, 0, 6, 12, 24, 48]
    return {
        "id": iceberg_id,
        "predictions": [predict_position(match, h) for h in horizons],
    }


# ---------------------------------------------------------------------------
# Simulated 7-day fleet trend, for the dashboard's "how are things trending"
# story. There's no real historical archive wired up for this demo, so this
# is a deterministic, clearly-labeled synthetic walk seeded off today's live
# stats - NOT a claim about actual past conditions.
# ---------------------------------------------------------------------------

import random
from datetime import datetime, timedelta, timezone


@app.get("/history")
def get_history(days: int = Query(7, ge=2, le=30)):
    enriched = [enrich(ib) for ib in ICEBERGS]
    today_high = sum(1 for ib in enriched if ib["risk_level"] == "high")
    today_medium = sum(1 for ib in enriched if ib["risk_level"] == "medium")
    today_low = sum(1 for ib in enriched if ib["risk_level"] == "low")
    today_speed = sum(ib["drift_speed_kmh"] for ib in enriched) / len(enriched)

    rng = random.Random(42)  # fixed seed -> stable across requests/reloads
    points = []
    now = datetime.now(timezone.utc)
    high, medium, low, speed = today_high, today_medium, today_low, today_speed

    # Walk backward from today so the series ends exactly on today's real stats
    for i in range(days):
        points.append({
            "date": (now - timedelta(days=i)).strftime("%Y-%m-%d"),
            "high_risk": max(0, round(high)),
            "medium_risk": max(0, round(medium)),
            "low_risk": max(0, round(low)),
            "avg_drift_speed_kmh": round(max(0.1, speed), 2),
        })
        high += rng.uniform(-1.4, 1.2)
        medium += rng.uniform(-1.2, 1.4)
        low += rng.uniform(-1.0, 1.0)
        speed += rng.uniform(-0.25, 0.25)

    points.reverse()
    return {"simulated": True, "note": "Synthetic demo trend, seeded from today's live stats.", "days": points}


@app.post("/route")
def get_route(req: RouteRequest):
    start = LatLon(lat=req.start_lat, lon=req.start_lon)
    end = LatLon(lat=req.end_lat, lon=req.end_lon)

    safe_path = astar_route(start, end, req.horizon_hours)
    shortest_km = straight_line_km(start, end)

    if not safe_path:
        return {
            "found": False,
            "message": "No safe route found within the search area - try a wider start/end gap.",
            "shortest_distance_km": round(shortest_km, 1),
        }

    safe_km = path_length_km(safe_path)
    return {
        "found": True,
        "safe_route": safe_path,
        "safe_distance_km": round(safe_km, 1),
        "shortest_distance_km": round(shortest_km, 1),
        "extra_distance_km": round(safe_km - shortest_km, 1),
        "estimated_hours_at_20kmh": round(safe_km / 20, 1),
    }


@app.get("/alerts")
def get_alerts():
    enriched = sorted([enrich(ib) for ib in ICEBERGS], key=lambda x: -x["risk_score"])
    alerts = []
    for ib in enriched[:4]:
        if ib["risk_level"] == "high":
            alerts.append({
                "id": ib["id"],
                "message": f"{ib['name']} entering shipping lane range - ETA {ib['time_to_impact_h']}h",
                "level": "high",
            })
        elif ib["risk_level"] == "medium":
            alerts.append({
                "id": ib["id"],
                "message": f"{ib['name']} drift trending toward lane - monitor",
                "level": "medium",
            })
    return alerts


@app.get("/stats")
def get_stats():
    enriched = [enrich(ib) for ib in ICEBERGS]
    return {
        "total_icebergs": len(enriched),
        "high_risk": sum(1 for ib in enriched if ib["risk_level"] == "high"),
        "medium_risk": sum(1 for ib in enriched if ib["risk_level"] == "medium"),
        "low_risk": sum(1 for ib in enriched if ib["risk_level"] == "low"),
        "avg_drift_speed_kmh": round(
            sum(ib["drift_speed_kmh"] for ib in enriched) / len(enriched), 2
        ),
    }


@app.get("/")
def root():
    return {"status": "ok", "message": "Antarctic Navigator API - see /docs"}
