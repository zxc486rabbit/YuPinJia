// src/utils/time.js

// 2025-10-13
export const toDateOnly = (d) => {
  const dt = d ? new Date(d) : new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// 以「本地時間 + 時區偏移」格式化：2025-10-13T15:30:00+08:00
export const toIsoLocalWithOffset = (d) => {
  const dt = d ? new Date(d) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const tz = -dt.getTimezoneOffset(); // 分
  const sign = tz >= 0 ? "+" : "-";
  const hh = pad(Math.floor(Math.abs(tz) / 60));
  const mm = pad(Math.abs(tz) % 60);
  const y = dt.getFullYear();
  const m = pad(dt.getMonth() + 1);
  const day = pad(dt.getDate());
  const h = pad(dt.getHours());
  const min = pad(dt.getMinutes());
  const s = pad(dt.getSeconds());
  return `${y}-${m}-${day}T${h}:${min}:${s}${sign}${hh}:${mm}`;
};
