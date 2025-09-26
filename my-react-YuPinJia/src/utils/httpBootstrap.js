import axios from "axios";
import api, { getTokens, refreshAccessToken } from "./apiClient";

function readAccessToken() {
  return getTokens?.().accessToken || localStorage.getItem("accessToken") || "";
}
function readRefreshToken() {
  return getTokens?.().refreshToken || localStorage.getItem("refreshToken") || "";
}

let refreshing = false;
let waitQueue = [];

async function ensureAccessToken() {
  if (refreshing) {
    return new Promise((resolve, reject) => waitQueue.push({ resolve, reject }));
  }
  refreshing = true;
  try {
    const rt = readRefreshToken();
    if (!rt) throw new Error("NO_REFRESH_TOKEN");
    const r = await refreshAccessToken();
    waitQueue.forEach((p) => p.resolve(r?.accessToken || readAccessToken()));
    waitQueue = [];
    return r?.accessToken || readAccessToken();
  } catch (err) {
    waitQueue.forEach((p) => p.reject(err));
    waitQueue = [];
    // 統一處理：清掉並導回登入
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    if (typeof window !== "undefined") window.location.assign("/login");
    throw err;
  } finally {
    refreshing = false;
  }
}

// 全域 axios
axios.interceptors.request.use((config) => {
  const token = readAccessToken();
  config.headers = config.headers || {};
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers["Content-Type"]) config.headers["Content-Type"] = "application/json";
  if (!config.headers.Accept) config.headers.Accept = "application/json";
  return config;
});
axios.interceptors.response.use(
  (res) => {
    const bodyCode = res?.data?.code ?? res?.data?.status;
    if (bodyCode === 600) {
      const err = new Error("AUTH_600");
      err.response = { status: 600, config: res.config };
      throw err;
    }
    return res;
  },
  async (error) => {
    const resp = error?.response;
    const original = resp?.config;
    if (!resp || !original) throw error;

    if ((resp.status === 600 || resp.status === 401) && !original._retry) {
      original._retry = true;
      try {
        const newToken = await ensureAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return axios(original);
      } catch (e) {
        throw e; // 已在 ensureAccessToken 導回 /login
      }
    }
    throw error;
  }
);

// 你的 api 實例（雙保險）
api.interceptors.request.use((config) => {
  const token = readAccessToken();
  config.headers = config.headers || {};
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers["Content-Type"]) config.headers["Content-Type"] = "application/json";
  if (!config.headers.Accept) config.headers.Accept = "application/json";
  return config;
});
api.interceptors.response.use(
  (res) => {
    const bodyCode = res?.data?.code ?? res?.data?.status;
    if (bodyCode === 600) {
      const err = new Error("AUTH_600");
      err.response = { status: 600, config: res.config };
      throw err;
    }
    return res;
  },
  async (error) => {
    const resp = error?.response;
    const original = resp?.config;
    if (!resp || !original) throw error;

    if ((resp.status === 600 || resp.status === 401) && !original._retry) {
      original._retry = true;
      try {
        const newToken = await ensureAccessToken();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        throw e; // 已在 ensureAccessToken 導回 /login
      }
    }
    throw error;
  }
);

// fetch shim（略，同你現有；若保留，確保這檔只 import 一次）
