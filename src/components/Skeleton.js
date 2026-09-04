import React from "react";

export function SkeletonBar({ width = "100%", height = 12 }) {
  return <div className="skeleton-bar" style={{ width, height }} />;
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i}>
          <div className="skeleton-dot" />
          <div className="skeleton-row-lines">
            <SkeletonBar width="70%" height={10} />
            <SkeletonBar width="45%" height={8} />
          </div>
        </div>
      ))}
    </div>
  );
}
