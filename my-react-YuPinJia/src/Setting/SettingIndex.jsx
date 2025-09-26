import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useEmployee } from "../utils/EmployeeContext";

import NavbarItem from "../components/NavbarItem"; // navbar模組
import Setting from "./Setting"; // 密碼變更

// ⬇️ 新增：客顯視窗工具
import { openCustomerWindow, saveCustomerDisplayRect } from "../utils/customerDisplayWindow";

export default function SettingIndex() {
  const [activeTab, setActiveTab] = useState("密碼變更");
  const { logout } = useEmployee();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "確定要登出嗎？",
      text: "登出後需要重新登入才能繼續操作。",
      showCancelButton: true,
      confirmButtonText: "登出",
      cancelButtonText: "取消",
      reverseButtons: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
    });
    if (result.isConfirmed) {
      logout();
      navigate("/login");
    }
  };

  // ⬇️ 新增：開啟客顯畫面
  const handleOpenCustomer = () => {
    const win = openCustomerWindow("/customer-display");
    if (!win) {
      Swal.fire({
        icon: "info",
        title: "被瀏覽器阻擋了",
        text: "請允許此網站開啟彈出視窗，或改用右上角地址列的彈出視窗允許按鈕後再試一次。",
      });
      return;
    }
    Swal.fire({
      icon: "success",
      title: "已開啟客顯畫面",
      text: "請把視窗拖到螢幕 2 並最大化，接著點「記住目前位置」。",
      timer: 1800,
      showConfirmButton: false,
    });
  };

  // ⬇️ 新增：記住目前客顯視窗位置
  const handleRememberPosition = () => {
    try {
      // 這裡是呼叫「目前頁面」的座標；建議到「客顯視窗」中再呼叫更準確
      saveCustomerDisplayRect(window);
      Swal.fire({
        icon: "success",
        title: "已記住客顯視窗位置",
        text: "下次開啟將自動出現在同樣的螢幕與位置。",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "記錄失敗",
        text: "請確認您已開啟客顯視窗，並非全螢幕模式後再試。",
      });
    }
  };

  return (
    <>
      <div className="navbar d-flex justify-content-between text-center w-100 px-4">
        <div className="d-flex">
          <NavbarItem
            text="密碼變更"
            active={activeTab === "密碼變更"}
            onClick={() => setActiveTab("密碼變更")}
          />

          {/* ⬇️ 新增：客顯設定 分頁 */}
          <NavbarItem
            text="客顯設定"
            active={activeTab === "客顯設定"}
            onClick={() => setActiveTab("客顯設定")}
          />
        </div>

        {/* 右側登出按鈕（紅色風格） */}
        <div className="d-flex align-items-center">
          <button
            onClick={handleLogout}
            className="btn"
            style={{
              background: "#e12d2d",
              color: "#fff",
              borderRadius: 12,
              padding: "8px 14px",
              fontWeight: 700,
              boxShadow: "0 3px 8px rgba(225,45,45,.25)",
            }}
          >
            登出
          </button>
        </div>
      </div>

      {/* 內容區域 */}
      <div className="content-container" style={{ height: "89vh" }}>
        {activeTab === "密碼變更" && <Setting />}

        {activeTab === "客顯設定" && (
          <div className="container py-4">
            <div
              className="p-4"
              style={{
                background: "#fff",
                borderRadius: 16,
                boxShadow: "0 6px 18px rgba(0,0,0,.08)",
                maxWidth: 720,
              }}
            >
              <h3 className="mb-3" style={{ fontWeight: 800 }}>
                客顯（第二螢幕）設定
              </h3>
              <p className="text-muted" style={{ lineHeight: 1.7 }}>
                第一次請先「開啟客顯畫面」後，把視窗拖到螢幕 2 並最大化，再按「記住目前位置」。
                之後每次按「開啟客顯畫面」就會自動到同樣的位置與大小。
              </p>

              <div className="d-flex gap-3 mt-4 flex-wrap">
                <button
                  onClick={handleOpenCustomer}
                  className="btn"
                  style={{
                    background: "#0ea5e9",
                    color: "#fff",
                    borderRadius: 12,
                    padding: "10px 16px",
                    fontWeight: 700,
                    boxShadow: "0 3px 12px rgba(14,165,233,.25)",
                  }}
                >
                  開啟客顯畫面
                </button>

                <button
                  onClick={handleRememberPosition}
                  className="btn"
                  style={{
                    background: "#10b981",
                    color: "#fff",
                    borderRadius: 12,
                    padding: "10px 16px",
                    fontWeight: 700,
                    boxShadow: "0 3px 12px rgba(16,185,129,.25)",
                  }}
                >
                  記住目前位置
                </button>
              </div>

              <hr className="my-4" />

              <div className="text-muted" style={{ fontSize: 14 }}>
                小提醒：
                <ul className="mt-2" style={{ paddingLeft: 18 }}>
                  <li>若瀏覽器阻擋彈出視窗，請允許此網站開啟彈出視窗。</li>
                  <li>不同機台的解析度可能不同；每台機器各自記一次位置即可。</li>
                  <li>若要更穩定（像 App），可用 Chrome 啟動參數 <code>--app</code> 與 <code>--window-position</code> 在作業系統啟動時自動開啟。</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
