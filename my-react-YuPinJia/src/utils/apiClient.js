// src/utils/apiClient.js
import axios from "axios";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";
const REFRESH_URL = `${API_BASE}/Account/refresh`;

// 通知其他分頁有新 token
const TOKEN_VERSION_KEY = "auth:tokenVersion";

const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

// ===== 工具：把 timestamp 轉成毫秒（支援秒/毫秒/ISO）=====
function tsToMs(ts) {
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

  // ★ 通知其他分頁 token 已更新
  localStorage.setItem(TOKEN_VERSION_KEY, String(Date.now()));
}

// ===== 主動呼叫 Refresh API（相容兩種規格；不旋轉 RT 也可）=====
export async function refreshAccessToken() {
  const { refreshToken } = getTokens();
  if (!refreshToken) throw new Error("No refreshToken to refresh.");

  // 方案 A：body 只帶 refreshToken
  try {
    const resA = await axios.post(
      REFRESH_URL,
      { refreshToken }, // ★ 不要帶 accessToken
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        __skipAuthRefresh: true,
      }
    );

    const {
      accessToken: newAT,
      accessTokenExpiredAt,
      refreshToken: maybeNewRT,
      refreshTokenExpiredAt: maybeRtAt,
    } = resA?.data || {};

    if (!newAT) throw new Error("Refresh response missing accessToken.");

    saveTokens({
      accessToken: newAT,
      refreshToken: maybeNewRT || refreshToken,
      accessTokenExpiredAt,
      refreshTokenExpiredAt: maybeRtAt || localStorage.getItem("refreshTokenExpiredAt"),
    });

    return {
      accessToken: newAT,
      refreshToken: maybeNewRT || refreshToken,
      accessTokenExpiredAt: tsToMs(accessTokenExpiredAt),
      refreshTokenExpiredAt: tsToMs(maybeRtAt || localStorage.getItem("refreshTokenExpiredAt")),
    };
  } catch (errA) {
    // 方案 B：Authorization: Bearer <refreshToken>；body 可為 null
    try {
      const resB = await axios.post(
        REFRESH_URL,
        null,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${refreshToken}`,
          },
          __skipAuthRefresh: true,
        }
      );

      const {
        accessToken: newAT,
        accessTokenExpiredAt,
        refreshToken: maybeNewRT,
        refreshTokenExpiredAt: maybeRtAt,
      } = resB?.data || {};

      if (!newAT) throw new Error("Refresh response missing accessToken.");

      saveTokens({
        accessToken: newAT,
        refreshToken: maybeNewRT || refreshToken,
        accessTokenExpiredAt,
        refreshTokenExpiredAt: maybeRtAt || localStorage.getItem("refreshTokenExpiredAt"),
      });

      return {
        accessToken: newAT,
        refreshToken: maybeNewRT || refreshToken,
        accessTokenExpiredAt: tsToMs(accessTokenExpiredAt),
        refreshTokenExpiredAt: tsToMs(maybeRtAt || localStorage.getItem("refreshTokenExpiredAt")),
      };
    } catch (errB) {
      const e = errB?.response?.data || errB || errA;
      throw e;
    }
  }
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
