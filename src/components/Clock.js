import React, { useEffect, useState } from "react";

function formatUTC(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const h = pad(date.getUTCHours());
  const m = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  const day = pad(date.getUTCDate());
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  return { time: `${h}:${m}:${s}`, date: `${day} ${month} ${year}` };
}

export default function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { time, date } = formatUTC(now);

  return (
    <div className="clock">
      <span className="clock-time">{time}</span>
      <span className="clock-date">{date} UTC</span>
    </div>
  );
}
