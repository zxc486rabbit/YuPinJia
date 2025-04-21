import { useState } from "react";
import NavbarItem from "../components/NavbarItem"; //navbar模組
import Setting from "./Setting"; //密碼變更


export default function SettingIndex() {
   // 設定當前顯示的內容
   const [activeTab, setActiveTab] = useState("密碼變更");
  return (
    <>
      <div className="navbar d-flex  justify-content-between text-center w-100 px-4">
        <div className="d-flex">
          <NavbarItem text="密碼變更" active={activeTab === "密碼變更"} onClick={() => setActiveTab("密碼變更")}/>
        </div>
      </div>
      {/* 內容區域 */}
      <div className="content-container" style={{height: "89vh"}}>
        {activeTab === "密碼變更" && <Setting />}
      </div>
    </>
  );
}
