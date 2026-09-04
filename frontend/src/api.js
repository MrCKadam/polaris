const BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8010";

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  getIcebergs: () => get("/icebergs"),
  getIceberg: (id) => get(`/icebergs/${id}`),
  getPrediction: (id) => get(`/predict/${id}`),
  getAlerts: () => get("/alerts"),
  getStats: () => get("/stats"),
  getRoute: (payload) => post("/route", payload),
};
