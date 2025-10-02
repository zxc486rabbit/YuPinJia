// src/utils/LoginPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { useEmployee } from "./EmployeeContext";
import api, { setAuthHeader, tsToMs } from "./apiClient";
import styles from "./LoginPage.module.css";

const LOGIN_URL = "https://yupinjia.hyjr.com.tw/api/api/Account/login";
const USERINFO_URL = "https://yupinjia.hyjr.com.tw/api/api/Account/userInfo";
const STORE_LIST_URL = "https://yupinjia.hyjr.com.tw/api/api/Dropdown/GetStoreList";

// SHA-256 (hex, lower-case)
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractErrorMessage(err) {
  const data = err?.response?.data;
  const status = err?.response?.status;

  const fromCommonFields =
    data?.title || data?.message || data?.error || data?.detail || data?.details;

  const modelStateMsg = data?.errors ? Object.values(data.errors).flat().join("；") : null;

  if (!fromCommonFields && (status === 400 || status === 401)) {
    return "帳號或密碼錯誤，請再試一次。";
  }

  return modelStateMsg || fromCommonFields || err?.message || "登入失敗，請稍後再試。";
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useEmployee();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  // 門市下拉
  const [stores, setStores] = useState([]); // [{label,value,key}]
  const [storeId, setStoreId] = useState(() => Number(localStorage.getItem("storeId")) || 0);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState("");

  // 登入流程
  const [loading, setLoading] = useState(false);

  // 是否要先做 SHA256（若後端已做 TLS + 不需前端雜湊，可設為 false）
  const HASH_BEFORE_SEND = true;

  // 讀取門市清單
  useEffect(() => {
    let mounted = true;
    (async () => {
      setStoreLoading(true);
      setStoreError("");
      try {
        const res = await axios.get(STORE_LIST_URL, {
          headers: { Accept: "application/json" },
          params: { ts: Date.now() },
        });
        const arr = Array.isArray(res.data) ? res.data : [];
        if (!mounted) return;
        setStores(arr);

        if (!storeId && arr.length > 0) {
          setStoreId(Number(arr[0].value) || 0);
        }
      } catch (e) {
        if (!mounted) return;
        setStoreError("無法載入門市清單，請重新整理頁面。");
      } finally {
        if (mounted) setStoreLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []); // 首次載入

  const canSubmit = useMemo(() => {
    return !!employeeId && !!password && !!storeId && !loading && !storeLoading;
  }, [employeeId, password, storeId, loading, storeLoading]);

  const handleLogin = async () => {
    if (!canSubmit) {
      if (!employeeId || !password) {
        await Swal.fire({ icon: "warning", title: "請輸入帳號與密碼" });
      } else if (!storeId) {
        await Swal.fire({ icon: "warning", title: "請選擇門市" });
      }
      return;
    }

    setLoading(true);
    try {
      const pwdToSend = HASH_BEFORE_SEND ? await sha256Hex(password) : password;

      // 送登入（包含 storeId）
      const res = await axios.post(
        LOGIN_URL,
        {
          username: employeeId,
          password: pwdToSend,
          storeId: Number(storeId),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const {
        accessToken,
        refreshToken,
        accessTokenExpiredAt,
        refreshTokenExpiredAt,
      } = res.data || {};

      if (!accessToken) {
        throw new Error("登入回應缺少 accessToken");
      }

      // 存 Token — 一律轉毫秒字串（避免邊界誤判）
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      const atMs = tsToMs(accessTokenExpiredAt);
      const rtMs = tsToMs(refreshTokenExpiredAt);
      if (atMs) localStorage.setItem("accessTokenExpiredAt", String(atMs));
      if (rtMs) localStorage.setItem("refreshTokenExpiredAt", String(rtMs));

      // 存 storeId（全域使用）
      localStorage.setItem("storeId", String(storeId));

      // 設定 Authorization
      setAuthHeader(accessToken);

      // 取使用者資訊
      const info = await api.get(USERINFO_URL, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        params: { ts: Date.now() },
      });

      const userInfo = info?.data?.user ?? info?.data ?? {};
      const privileges = info?.data?.privileges ?? null;

      // 將選擇的 storeId 寫入 user 物件（方便之後從 Context 直接讀）
      const userWithStore = { ...userInfo, storeId: Number(storeId) };

      // 寫入 Context
      login({
        user: userWithStore,
        privileges,
        tokens: {
          accessToken,
          refreshToken,
          accessTokenExpiredAt: atMs,
          refreshTokenExpiredAt: rtMs,
        },
      });

      // 進系統
      navigate("/");
    } catch (err) {
      console.error("登入失敗：", err?.response || err);
      const msg = extractErrorMessage(err);
      await Swal.fire({ icon: "error", title: "登入失敗", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPageContainer}>
      <div className={styles.loginBox}>
        <h2>員工登入</h2>

        {/* 帳號 */}
        <div className={styles.inputContainer}>
          <input
            type="text"
            className={styles.inputField}
            placeholder="員工帳號"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>

        {/* 密碼 */}
        <div className={styles.inputContainer}>
          <input
            type="password"
            className={styles.inputField}
            placeholder="密碼"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            disabled={loading}
          />
        </div>

        {/* 門市下拉 */}
        <div className={styles.inputContainer}>
          <select
            className={styles.selectField ?? styles.inputField}
            value={storeId || ""}
            onChange={(e) => setStoreId(Number(e.target.value))}
            disabled={loading || storeLoading}
          >
            {storeLoading && <option value="">載入門市中...</option>}
            {!storeLoading && stores.length === 0 && (
              <option value="">無可選門市</option>
            )}
            {!storeLoading &&
              stores.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
          </select>
          {storeError && (
            <div className={styles.hintText} style={{ color: "#c53030" }}>
              {storeError}
            </div>
          )}
        </div>

        {/* 登入按鈕 */}
        <button className={styles.loginBtn} onClick={handleLogin} disabled={!canSubmit}>
          {loading ? "登入中..." : "登入"}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
