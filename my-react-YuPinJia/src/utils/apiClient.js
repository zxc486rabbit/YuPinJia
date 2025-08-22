// src/utils/apiClient.js
import axios from "axios";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";
const REFRESH_URL = `${API_BASE}/Account/refresh`;

let isRefreshing = false;
let pendingQueue = []; // 佇列：等待 refresh 完成後重試

const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: "application/json" },
});

// 讀/寫 Token：統一管理
export function getTokens() {
  return {
    accessToken: localStorage.getItem("accessToken") || "",
    refreshToken: localStorage.getItem("refreshToken") || "",
  };
}
export function setAuthHeader(token) {
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  else delete api.defaults.headers.common["Authorization"];
}

// 主動呼叫 Refresh API
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
  return newAT;
}

// 每次請求自動夾帶 Bearer
api.interceptors.request.use((config) => {
  const at = localStorage.getItem("accessToken");
  if (at) config.headers.Authorization = `Bearer ${at}`;
  return config;
});

// 401 時自動 refresh 一次，成功就重試原請求
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response) return Promise.reject(error);

    if (response.status === 401 && !config._retry) {
      config._retry = true;

      // 若已在 refresh，掛到佇列，等成功後重試
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            resolve(api(config));
          });
        });
      }

      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        // 喚醒所有等待中的請求
        pendingQueue.forEach((cb) => cb(newToken));
        pendingQueue = [];
        isRefreshing = false;

        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config); // 重試
      } catch (e) {
        isRefreshing = false;
        pendingQueue = [];
        // 讓呼叫端決定後續（通常登出）
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
