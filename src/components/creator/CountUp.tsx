"use client";

import { useEffect, useState } from "react";

export function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = display;
    const end = value;
    if (start === end) return;
    const duration = 650;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate from last painted value
  }, [value]);

  return (
    <span className="tabular-nums">
      ₹{display.toLocaleString("en-IN")}
    </span>
  );
}
