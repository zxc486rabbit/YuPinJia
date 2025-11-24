// src/utils/apiClient.js
import axios from "axios";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";
const REFRESH_URL = `${API_BASE}/Account/refresh`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

// ===== 工具：把 timestamp 轉成毫秒（支援秒/毫秒/ISO）=====
export function tsToMs(ts) {
  if (ts == null) return null;
  if (typeof ts === "number") {
    if (ts > 1e12) return ts;        // ms
    if (ts > 1e9) return ts * 1000;  // sec → ms
    return ts;
  }
  const n = Number(ts);
  if (!Number.isNaN(n)) return tsToMs(n);
  const d = Date.parse(ts);
  return Number.isNaN(d) ? null : d;
}

// ===== Token 讀寫 =====
export function getTokens() {
  return {
    accessToken: localStorage.getItem("accessToken") || "",
    refreshToken: localStorage.getItem("refreshToken") || "",
    accessTokenExpiredAt: tsToMs(localStorage.getItem("accessTokenExpiredAt")),
    refreshTokenExpiredAt: tsToMs(localStorage.getItem("refreshTokenExpiredAt")),
  };
}

export function setAuthHeader(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

function saveTokens({ accessToken, refreshToken, accessTokenExpiredAt, refreshTokenExpiredAt }) {
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  const atMs = tsToMs(accessTokenExpiredAt);
  const rtMs = tsToMs(refreshTokenExpiredAt);
  if (atMs) localStorage.setItem("accessTokenExpiredAt", String(atMs));
  if (rtMs) localStorage.setItem("refreshTokenExpiredAt", String(rtMs));
  if (accessToken) setAuthHeader(accessToken);
}

// ===== 主動呼叫 Refresh API（★加上 __skipAuthRefresh 避免被攔截器再攔一次）=====
export async function refreshAccessToken() {
  const { accessToken, refreshToken } = getTokens();
  if (!refreshToken) throw new Error("No refreshToken to refresh.");

  const res = await axios.post(
    REFRESH_URL,
    { accessToken, refreshToken },
    {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      __skipAuthRefresh: true, // ★ 關鍵
    }
  );

  const {
    accessToken: newAT,
    refreshToken: newRT,
    accessTokenExpiredAt,
    refreshTokenExpiredAt,
  } = res?.data || {};

  if (!newAT) throw new Error("Refresh response missing accessToken.");

  saveTokens({
    accessToken: newAT,
    refreshToken: newRT || undefined,
    accessTokenExpiredAt,
    refreshTokenExpiredAt,
  });

  return {
    accessToken: newAT,
    refreshToken: newRT || undefined,
    accessTokenExpiredAt: tsToMs(accessTokenExpiredAt),
    refreshTokenExpiredAt: tsToMs(refreshTokenExpiredAt),
  };
}

// ===== 基本帶 Token（雙保險）=====
api.interceptors.request.use((config) => {
  const at = localStorage.getItem("accessToken");
  if (at && !config.headers?.Authorization) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${at}`;
  }
  if (!config.headers["Content-Type"]) config.headers["Content-Type"] = "application/json";
  if (!config.headers.Accept) config.headers.Accept = "application/json";
  return config;
});

// 不在這裡做 401 自動刷新（統一交由 httpBootstrap.js）
export default api;
