// utils/httpBootstrap.js
// 目的：在 app 啟動時跑一次，讓所有 axios / fetch 都自動帶 Token，並處理 600/401。

import axios from "axios";
import api, { getTokens, /* 可選：setAuthHeader, */ refreshAccessToken } from "./apiClient";

// ---- 共用小工具 ----
function readAccessToken() {
  return getTokens?.().accessToken || localStorage.getItem("accessToken") || "";
}
function readRefreshToken() {
  return getTokens?.().refreshToken || localStorage.getItem("refreshToken") || "";
}

// 避免並發重複 refresh
let refreshing = false;
let waitQueue = [];

async function ensureAccessToken() {
  // 已在刷新 → 等待
  if (refreshing) {
    return new Promise((resolve, reject) => waitQueue.push({ resolve, reject }));
  }
  refreshing = true;
  try {
    const rt = readRefreshToken();
    if (!rt) throw new Error("NO_REFRESH_TOKEN");
    const r = await refreshAccessToken(); // 你在 apiClient 實作的刷新（建議回寫 localStorage）
    // 釋放等待者
    waitQueue.forEach((p) => p.resolve(r?.accessToken || readAccessToken()));
    waitQueue = [];
    return r?.accessToken || readAccessToken();
  } catch (err) {
    waitQueue.forEach((p) => p.reject(err));
    waitQueue = [];
    throw err;
  } finally {
    refreshing = false;
  }
}

// ---- 1) 全域 axios（防呆：即使有人直接 import axios 也能帶到 Token） ----
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
    // 有些後端 200 但 body.code=600
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
        return axios(original); // 用全域 axios 重送（對方可能就是用 axios 直打）
      } catch (e) {
        // 刷新失敗 → 清 Token 讓上層做登出
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        throw e;
      }
    }
    throw error;
  }
);

// ---- 2) 針對你的 api 實例也掛（雙保險） ----
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
        return api(original); // 用相同實例重送
      } catch (e) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        throw e;
      }
    }
    throw error;
  }
);

// ---- 3) fetch shim（可選：若專案內還有 fetch，讓它也自動帶 Token + 刷新重送） ----
if (typeof window !== "undefined" && !window.__FETCH_AUTH_SHIM_INSTALLED__) {
  const _origFetch = window.fetch?.bind(window);
  if (_origFetch) {
    window.fetch = async (input, init = {}) => {
      // 對 Request 物件或字串都支援
      let url = typeof input === "string" ? input : input.url;
      let headers = new Headers((init && init.headers) || (typeof input !== "string" ? input.headers : undefined) || {});
      const token = readAccessToken();
      if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("Accept")) headers.set("Accept", "application/json");
      if (!headers.has("Content-Type") && (!init || !init.body)) {
        headers.set("Content-Type", "application/json");
      }

      const doFetch = (overrideInit) =>
        _origFetch(input, {
          ...init,
          ...overrideInit,
          headers,
        });

      let res = await doFetch();
      // 某些閘道會傳 200 但 body.code=600 → 嘗試解析
      let bodyCode = null;
      try {
        const cloned = res.clone();
        const txt = await cloned.text();
        if (txt) {
          const json = JSON.parse(txt);
          bodyCode = json?.code ?? json?.status ?? null;
        }
      } catch {}

      if ((res.status === 600 || res.status === 401 || bodyCode === 600) && !init?._retry) {
        try {
          const newToken = await ensureAccessToken();
          headers.set("Authorization", `Bearer ${newToken}`);
          res = await _origFetch(url, { ...init, headers, _retry: true });
        } catch (e) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          throw e;
        }
      }

      return res;
    };
    window.__FETCH_AUTH_SHIM_INSTALLED__ = true;
  }
}
