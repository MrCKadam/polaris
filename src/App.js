import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "./api";
import MapView from "./components/MapView";
import TimelineSlider from "./components/TimelineSlider";
import IcebergList from "./components/IcebergList";
import IcebergDetail from "./components/IcebergDetail";
import RoutePlanner from "./components/RoutePlanner";
import AlertsFeed from "./components/AlertsFeed";
import StatsBar from "./components/StatsBar";
import LayerToggle from "./components/LayerToggle";
import Dashboard from "./components/Dashboard";
import BasemapControl from "./components/BasemapControl";
import Clock from "./components/Clock";
import HowItWorks from "./components/HowItWorks";
import ToastStack from "./components/ToastStack";
import ExportButton from "./components/ExportButton";
import { SkeletonBar, SkeletonList } from "./components/Skeleton";

export default function App() {
  const [icebergs, setIcebergs] = useState([]);
  const [predictions, setPredictions] = useState({}); // { [id]: {predictions:[...]} }
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [horizonHours, setHorizonHours] = useState(12);
  const [routePath, setRoutePath] = useState(null);
  const [tab, setTab] = useState("icebergs"); // "icebergs" | "route" | "dashboard"
  const [showWind, setShowWind] = useState(false);
  const [basemap, setBasemap] = useState("satellite");
  const [loadError, setLoadError] = useState(null);
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [pickingMode, setPickingMode] = useState(null); // "start" | "end" | null
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const seenAlertIds = useRef(new Set());

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((alert) => {
    const toastId = `${alert.id}-${Date.now()}`;
    setToasts((prev) => [...prev, { ...alert, toastId }].slice(-4));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
    }, 7000);
  }, []);

  // Initial data load
  useEffect(() => {
    (async () => {
      try {
        const [ibs, al, st] = await Promise.all([
          api.getIcebergs(),
          api.getAlerts(),
          api.getStats(),
        ]);
        setIcebergs(Array.isArray(ibs) ? ibs : []);
        setAlerts(Array.isArray(al) ? al : []);
        setStats(st && typeof st === "object" ? st : null);

        // Mark existing alerts as "seen" so we don't toast the whole
        // initial batch - only genuinely new ones going forward.
        if (Array.isArray(al)) {
          al.forEach((a) => seenAlertIds.current.add(a.id));
        }

        // fetch drift predictions for every iceberg up front, once.
        // allSettled so one bad/missing prediction can't take down the rest.
        const preds = {};
        const results = await Promise.allSettled(
          ibs.map((ib) => api.getPrediction(ib.id))
        );
        results.forEach((result, i) => {
          if (result.status === "fulfilled") {
            preds[ibs[i].id] = result.value;
          }
        });
        setPredictions(preds);
      } catch (e) {
        setLoadError("Could not reach the backend at http://127.0.0.1:8010 — is it running?");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Poll for genuinely new high-risk alerts every 20s and toast them
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const al = await api.getAlerts();
        if (!Array.isArray(al)) return;
        setAlerts(al);
        al.forEach((a) => {
          if (!seenAlertIds.current.has(a.id)) {
            seenAlertIds.current.add(a.id);
            if (a.level === "high") pushToast(a);
          }
        });
      } catch (e) {
        // silent - a missed poll isn't worth surfacing an error for
      }
    }, 20000);
    return () => clearInterval(id);
  }, [pushToast]);

  const handleSelect = useCallback((id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    setTab("icebergs");
  }, []);

  const handleMapPick = useCallback((lat, lon) => {
    if (pickingMode === "start") setRouteStart({ lat, lon });
    if (pickingMode === "end") setRouteEnd({ lat, lon });
    setPickingMode(null);
  }, [pickingMode]);

  const selectedIceberg = icebergs.find((ib) => ib.id === selectedId) || null;
  const selectedPrediction = selectedId ? predictions[selectedId]?.predictions
    ? predictions[selectedId]
    : null : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <span className="brand-name">Antarctic Navigator</span>
        </div>
        <StatsBar stats={stats} />
        <Clock />
        <button className="how-it-works-btn" onClick={() => setShowHowItWorks(true)}>How it works</button>
        <ExportButton icebergs={icebergs} alerts={alerts} stats={stats} />
        <div className="status">
          <span className="status-dot" /> System live
        </div>
      </header>

      {showHowItWorks && <HowItWorks onClose={() => setShowHowItWorks(false)} />}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {loadError && <div className="load-error">{loadError}</div>}

      <main className="layout">
        <section className="map-pane">
          <MapView
            icebergs={icebergs}
            predictions={Object.fromEntries(
              Object.entries(predictions).map(([id, v]) => [id, v.predictions])
            )}
            horizonHours={horizonHours}
            selectedId={selectedId}
            onSelect={handleSelect}
            routePath={routePath}
            showWind={showWind}
            basemap={basemap}
            pickingMode={pickingMode}
            onMapPick={handleMapPick}
            routeStart={routeStart}
            routeEnd={routeEnd}
            animateShip={true}
          />
          <BasemapControl basemap={basemap} onChange={setBasemap} />
          <LayerToggle showWind={showWind} onToggleWind={setShowWind} />
          <TimelineSlider hours={horizonHours} onChange={setHorizonHours} />
        </section>

        <aside className="side-pane">
          <div className="tabs">
            <button className={tab === "icebergs" ? "active" : ""} onClick={() => setTab("icebergs")}>
              Icebergs
            </button>
            <button className={tab === "route" ? "active" : ""} onClick={() => setTab("route")}>
              Route planner
            </button>
            <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
              Dashboard
            </button>
          </div>

          {tab === "icebergs" && (
            <>
              {loading ? (
                <div className="detail-card">
                  <SkeletonBar width="60%" height={16} />
                  <div style={{ height: 10 }} />
                  <SkeletonBar width="90%" height={10} />
                  <div style={{ height: 6 }} />
                  <SkeletonBar width="80%" height={10} />
                  <div style={{ height: 16 }} />
                  <SkeletonList rows={4} />
                </div>
              ) : (
                <>
                  <IcebergDetail iceberg={selectedIceberg} prediction={selectedPrediction} />
                  <IcebergList icebergs={icebergs} selectedId={selectedId} onSelect={handleSelect} />
                </>
              )}
            </>
          )}

          {tab === "route" && (
            <RoutePlanner
              routeStart={routeStart}
              routeEnd={routeEnd}
              onSetStart={setRouteStart}
              onSetEnd={setRouteEnd}
              onClearPoints={() => { setRouteStart(null); setRouteEnd(null); setRoutePath(null); }}
              pickingMode={pickingMode}
              onSetPickingMode={setPickingMode}
              onResult={setRoutePath}
            />
          )}

          {tab === "dashboard" && <Dashboard icebergs={icebergs} stats={stats} />}

          <AlertsFeed alerts={alerts} />
        </aside>
      </main>
    </div>
  );
}
