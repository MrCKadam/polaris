import React from "react";

const MARKS = [0, 6, 12, 24, 48];

export default function TimelineSlider({ hours, onChange }) {
  return (
    <div className="timeline">
      <div className="timeline-label">
        Drift projection: <span>{hours === 0 ? "Now" : `+${hours}h`}</span>
      </div>
      <input
        type="range"
        min={0}
        max={48}
        step={1}
        value={hours}
        onChange={(e) => onChange(Number(e.target.value))}
        className="timeline-slider"
      />
      <div className="timeline-marks">
        {MARKS.map((m) => (
          <span key={m} onClick={() => onChange(m)}>{m === 0 ? "Now" : `${m}h`}</span>
        ))}
      </div>
    </div>
  );
}
