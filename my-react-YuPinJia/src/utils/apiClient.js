import axios from "axios";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";
const REFRESH_URL = `${API_BASE}/Account/refresh`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

// ---- Token 讀寫 ----
export function getTokens() {
  return {
    accessToken: localStorage.getItem("accessToken") || "",
    refreshToken: localStorage.getItem("refreshToken") || "",
    accessTokenExpiredAt: localStorage.getItem("accessTokenExpiredAt") || "",
    refreshTokenExpiredAt: localStorage.getItem("refreshTokenExpiredAt") || "",
  };
}
export function setAuthHeader(token) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

// 主動 Refresh（供 httpBootstrap 呼叫）
export async function refreshAccessToken() {
  const { accessToken, refreshToken } = getTokens();
  if (!refreshToken) throw new Error("No refreshToken to refresh.");

  const res = await axios.post(
    REFRESH_URL,
    { accessToken, refreshToken },
    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
  );

  const {
    accessToken: newAT,
    refreshToken: newRT,
    accessTokenExpiredAt,
    refreshTokenExpiredAt,
  } = res.data || {};

  if (!newAT) throw new Error("Refresh response missing accessToken.");

  localStorage.setItem("accessToken", newAT);
  if (newRT) localStorage.setItem("refreshToken", newRT);
  if (accessTokenExpiredAt) localStorage.setItem("accessTokenExpiredAt", accessTokenExpiredAt);
  if (refreshTokenExpiredAt) localStorage.setItem("refreshTokenExpiredAt", refreshTokenExpiredAt);

  setAuthHeader(newAT);
  // 回傳給 httpBootstrap 使用
  return { accessToken: newAT, refreshToken: newRT, accessTokenExpiredAt, refreshTokenExpiredAt };
}

// 基本帶 Token（雙保險）
api.interceptors.request.use((config) => {
  const at = localStorage.getItem("accessToken");
  if (at) config.headers.Authorization = `Bearer ${at}`;
  if (!config.headers["Content-Type"]) config.headers["Content-Type"] = "application/json";
  if (!config.headers.Accept) config.headers.Accept = "application/json";
  return config;
});

// ⚠️ 不要在這裡再做 401 自動 refresh，交給 httpBootstrap.js 統一處理
// api.interceptors.response.use((res) => res, (err) => Promise.reject(err));

export default api;
