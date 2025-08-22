import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useEmployee } from "./EmployeeContext";
import api, { setAuthHeader } from "./apiClient";
import Swal from "sweetalert2";
import styles from "./LoginPage.module.css";

const LOGIN_URL = "https://yupinjia.hyjr.com.tw/api/api/Account/login";
const USERINFO_URL = "https://yupinjia.hyjr.com.tw/api/api/Account/userInfo";

// SHA-256 (hex, lower-case)
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const LoginPage = () => {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useEmployee();
  const navigate = useNavigate();

  // 1) 可切換是否先做 SHA-256（後端若不需要，請設為 false）
  const HASH_BEFORE_SEND = true;

  const handleLogin = async () => {
    if (loading) return;
    if (!employeeId || !password) {
      await Swal.fire({ icon: "warning", title: "請輸入帳號與密碼" });
      return;
    }
    setLoading(true);
    try {
      // 1) 決定送出的密碼（依後端需求）
      const pwdToSend = HASH_BEFORE_SEND ? await sha256Hex(password) : password;

      // 2) 依 Swagger：username/password + 特定 Header
      const res = await axios.post(
        LOGIN_URL,
        {
          username: employeeId,
          password: pwdToSend,
          fromMobile: true, // 可選，Swagger 範例有放
          // logoutMessage: "string" // 可選
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
      if (!accessToken) throw new Error("登入回應缺少 accessToken");

      // 3) 存 Token 並預設到 axios
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken || "");
      localStorage.setItem("accessTokenExpiredAt", accessTokenExpiredAt || "");
      localStorage.setItem(
        "refreshTokenExpiredAt",
        refreshTokenExpiredAt || ""
      );
      setAuthHeader(accessToken);

      // 4) 取 userInfo（帶 Bearer）
      const info = await api.get(USERINFO_URL);

      const userInfo = info.data?.user || {};
      const privileges = info.data?.privileges || {};

      // 5) 寫入你的 Context 後導頁
      login({
        employeeId: userInfo?.account || employeeId,
        name: userInfo?.chineseName || "員工名稱",
        user: userInfo,
        privileges,
        tokens: {
          accessToken,
          refreshToken,
          accessTokenExpiredAt,
          refreshTokenExpiredAt,
        },
      });

      navigate("/");
    } catch (err) {
      console.error("登入失敗：", err?.response || err);
      const msg =
        err?.response?.data?.title ||
        err?.response?.data?.message ||
        err?.message ||
        "登入失敗，請確認帳號與密碼。";
      await Swal.fire({ icon: "error", title: "登入失敗", text: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPageContainer}>
      <div className={styles.loginBox}>
        <h2>員工登入</h2>
        <div className={styles.inputContainer}>
          <input
            type="text"
            className={styles.inputField}
            placeholder="員工帳號"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={loading}
          />
        </div>
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
        <button
          className={styles.loginBtn}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "登入中..." : "登入"}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
