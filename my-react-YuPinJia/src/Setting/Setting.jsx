// Setting.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios"; // 保留給『舊密碼驗證：登入』用
import Swal from "sweetalert2";
import api from "../utils/apiClient"; // ⬅️ 變更密碼用我們的 api（自動帶Bearer/自動refresh）
import { useEmployee } from "../utils/EmployeeContext";
import { useNavigate } from "react-router-dom";

// API 路徑
const LOGIN_URL = "https://yupinjia.hyjr.com.tw/api/api/Account/login";
const CHANGE_PWD_URL =
  "https://yupinjia.hyjr.com.tw/api/api/Account/change-password";

// 是否在送出 change-password 前把新密碼做 SHA-256（與登入流程一致）
const HASH_BEFORE_SEND = true;

// 以瀏覽器 Web Crypto 產生 SHA-256（hex, 小寫）
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function Setting() {
  // ✅ 正確取得目前登入者（currentUser），裡面再拿 .user
  const { currentUser, logout } = useEmployee();
  const navigate = useNavigate();
  const profile = currentUser?.user || {}; // { account, chineseName, ... }

  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);

  // 初始化顯示資料
  useEffect(() => {
    setName(profile?.chineseName || "—");
    setAccount(profile?.account || "");
  }, [profile]);

  const canSubmit = useMemo(() => {
    return account && oldPwd && newPwd && confirmPwd && newPwd === confirmPwd;
  }, [account, oldPwd, newPwd, confirmPwd]);

  // 先用原密碼驗證（防呆），再呼叫 change-password
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    if (newPwd.length < 6) {
      await Swal.fire({ icon: "warning", title: "新密碼長度至少 6 碼" });
      return;
    }
    if (newPwd === oldPwd) {
      await Swal.fire({ icon: "warning", title: "新密碼不可與原密碼相同" });
      return;
    }

    setLoading(true);
    try {
      // 1) 驗證原密碼（與登入相同送法：username/password + SHA-256）
      const oldHashed = await sha256Hex(oldPwd);
      const loginRes = await axios.post(
        LOGIN_URL,
        {
          username: account,
          password: oldHashed,
          fromMobile: true,
        },
        {
          headers: {
            // ✅ 改成一般 JSON
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          validateStatus: () => true,
        }
      );

      if (loginRes.status < 200 || loginRes.status >= 300) {
        await Swal.fire({
          icon: "error",
          title: "原密碼不正確",
          text: "請重新輸入。",
        });
        return;
      }

      // 2) 準備變更密碼 payload（可選擇是否先雜湊）
      let newToSend = newPwd;
      let confirmToSend = confirmPwd;
      if (HASH_BEFORE_SEND) {
        const hashedNew = await sha256Hex(newPwd);
        newToSend = hashedNew;
        confirmToSend = hashedNew; // 與 API 規格一致
      }

      // 3) 呼叫 change-password（帶 Bearer；用 api 會自動加 Authorization/遇401自動refresh）
      const res = await api.post(
        CHANGE_PWD_URL,
        {
          userAccount: account,
          newPassword: newToSend,
          confirmNewPassword: confirmToSend,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          validateStatus: () => true,
        }
      );

      if (res.status >= 200 && res.status < 300) {
        await Swal.fire({
          icon: "success",
          title: "密碼變更成功",
          text: "請重新登入。",
          confirmButtonText: "重新登入",
        });
        logout();
        navigate("/login");
      } else {
        throw new Error(
          res?.data?.title ||
            res?.data?.message ||
            `密碼變更失敗（HTTP ${res.status}）`
        );
      }
    } catch (err) {
      console.error("密碼變更失敗：", err?.response || err);
      await Swal.fire({
        icon: "error",
        title: "密碼變更失敗",
        text: err?.message || "請稍後再試。",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5 ms-5">
      <div className="card shadow" style={{ maxWidth: "40%" }}>
        <div className="card-body p-4">
          <h2 className="mb-4 fw-bold">密碼變更</h2>

          <form onSubmit={handleSubmit}>
            <div className="row g-4 px-3">
              <div className="col-md-12">
                <label className="form-label fw-bold">姓名</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  disabled
                  readOnly
                />
              </div>

              <div className="col-md-12">
                <label className="form-label fw-bold">帳號</label>
                <input
                  type="text"
                  className="form-control"
                  value={account}
                  disabled
                  readOnly
                />
              </div>

              <div className="col-md-12">
                <label className="form-label fw-bold">原密碼</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="請輸入原密碼"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                />
              </div>

              <div className="col-md-12">
                <label className="form-label fw-bold">新密碼</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="請輸入欲變更之密碼"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                />
              </div>

              <div className="col-md-12">
                <label className="form-label fw-bold">確認密碼</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="再次確認新密碼"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              </div>
            </div>

            <div className="text-center mt-4">
              <button
                type="submit"
                className="add-button"
                disabled={!canSubmit || loading}
              >
                {loading ? "處理中…" : "確認送出"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
