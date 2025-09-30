// src/utils/httpBootstrap.js
// 讓整個 App 的 axios / fetch 自動帶 Token，並處理 600/401：refresh 後重送一次

import axios from "axios";
import api, { getTokens, refreshAccessToken } from "./apiClient";

// ---- 讀 token ----
function readAccessToken() {
  return getTokens?.().accessToken || localStorage.getItem("accessToken") || "";
}
function readRefreshToken() {
  return getTokens?.().refreshToken || localStorage.getItem("refreshToken") || "";
}

// ---- 集中 refresh（避免並發重複刷新）----
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
    const r = await refreshAccessToken(); // 會寫回 localStorage + 設定 Authorization
    const at = r?.accessToken || readAccessToken();
    waitQueue.forEach((p) => p.resolve(at));
    waitQueue = [];
    return at;
  } catch (err) {
    waitQueue.forEach((p) => p.reject(err));
    waitQueue = [];
    // refresh 失敗：清掉並導回登入
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessTokenExpiredAt");
    localStorage.removeItem("refreshTokenExpiredAt");
    if (typeof window !== "undefined") window.location.assign("/login");
    throw err;
  } finally {
    refreshing = false;
  }
}

// ---- 判斷回應是否需要 refresh（支援多種欄位/格式）----
async function shouldRefreshByResponse(res) {
  try {
    if (!res) return false;
    if (res.status === 401 || res.status === 600) return true;

    // 嘗試解析 body 內容
    const cloned = res.clone?.() ?? res; // axios res 沒有 clone，但有 data
    let text;
    if ("data" in cloned && cloned.data != null) {
      // axios
      const json = cloned.data;
      const bodyCode =
        json?.code ??
        json?.status ??
        json?.Status ??
        json?.StatusCode ??
        json?.errorCode ??
        null;
      if (Number(bodyCode) === 600) return true;
      if ((json?.success === false || json?.ok === false) && Number(bodyCode) === 600) {
        return true;
      }
    } else if (cloned?.text) {
      // fetch
      text = await cloned.text();
      if (!text) return false;
      try {
        const json = JSON.parse(text);
        const bodyCode =
          json?.code ??
          json?.status ??
          json?.Status ??
          json?.StatusCode ??
          json?.errorCode ??
          null;
        if (Number(bodyCode) === 600) return true;
        if ((json?.success === false || json?.ok === false) && Number(bodyCode) === 600) {
          return true;
        }
      } catch {
        // 純文字時，嘗試抓常見 pattern
        if (/\b(?:code|status)\s*[:=]\s*["']?600["']?/i.test(text)) return true;
      }
    }
  } catch {
    // 忽略解析錯誤
  }
  return false;
}

// ======================= 1) 全域 axios 攔截器 =======================
axios.interceptors.request.use((config) => {
  const token = readAccessToken();
  config.headers = config.headers || {};
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers["Content-Type"] && !config.data) {
    config.headers["Content-Type"] = "application/json";
  }
  if (!config.headers.Accept) config.headers.Accept = "application/json";
  return config;
});

axios.interceptors.response.use(
  async (res) => {
    // ★ 跳過被標記 __skipAuthRefresh 的請求（例如 refresh API）
    if (res?.config?.__skipAuthRefresh) return res;

    if (await shouldRefreshByResponse(res)) {
      const original = res.config || {};
      if (original._retry || original.__skipAuthRefresh) return res;
      original._retry = true;
      const newToken = await ensureAccessToken();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return axios(original);
    }
    return res;
  },
  async (error) => {
    const resp = error?.response;
    const original = error?.config;
    if (!resp || !original) throw error;
    if (original.__skipAuthRefresh) throw error;

    if ((resp.status === 600 || resp.status === 401) && !original._retry) {
      original._retry = true;
      const newToken = await ensureAccessToken();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return axios(original);
    }
    throw error;
  }
);

// ======================= 2) 你的 api 實例攔截器 =======================
api.interceptors.request.use((config) => {
  const token = readAccessToken();
  config.headers = config.headers || {};
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers["Content-Type"] && !config.data) {
    config.headers["Content-Type"] = "application/json";
  }
  if (!config.headers.Accept) config.headers.Accept = "application/json";
  return config;
});

api.interceptors.response.use(
  async (res) => {
    if (res?.config?.__skipAuthRefresh) return res;

    if (await shouldRefreshByResponse(res)) {
      const original = res.config || {};
      if (original._retry || original.__skipAuthRefresh) return res;
      original._retry = true;
      const newToken = await ensureAccessToken();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    return res;
  },
  async (error) => {
    const resp = error?.response;
    const original = error?.config;
    if (!resp || !original) throw error;
    if (original.__skipAuthRefresh) throw error;

    if ((resp.status === 600 || resp.status === 401) && !original._retry) {
      original._retry = true;
      const newToken = await ensureAccessToken();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    throw error;
  }
);

// ======================= 3) 全域 fetch shim =======================
// 讓任何 window.fetch(...) 自動：帶 Bearer、偵測 600/401 → refresh → 重送一次
if (typeof window !== "undefined" && !window.__FETCH_AUTH_SHIM_INSTALLED__) {
  const _origFetch = window.fetch?.bind(window);
  if (_origFetch) {
    window.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input.url;
      const headers = new Headers(
        (init && init.headers) ||
          (typeof input !== "string" ? input.headers : undefined) ||
          {}
      );

      // 自動帶 Token
      const token = readAccessToken();
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      if (!headers.has("Accept")) headers.set("Accept", "application/json");
      if (!headers.has("Content-Type") && !init.body) {
        headers.set("Content-Type", "application/json");
      }

      // ★ 避開 refresh 端點（讓 refreshAccessToken 自己處理）
      if (String(url).includes("/Account/refresh")) {
        return _origFetch(url, { ...init, headers });
      }

      let res = await _origFetch(url, { ...init, headers });

      const needRefresh =
        res.status === 401 ||
        res.status === 600 ||
        (await shouldRefreshByResponse(res));

      if (needRefresh && !init._retry) {
        try {
          const newToken = await ensureAccessToken();
          const headers2 = new Headers(headers);
          if (newToken) headers2.set("Authorization", `Bearer ${newToken}`);
          res = await _origFetch(url, { ...init, headers: headers2, _retry: true });
        } catch (e) {
          // ensureAccessToken 已處理清 Token + 導回 /login
          throw e;
        }
      }

      return res;
    };
    window.__FETCH_AUTH_SHIM_INSTALLED__ = true;
  }
}
