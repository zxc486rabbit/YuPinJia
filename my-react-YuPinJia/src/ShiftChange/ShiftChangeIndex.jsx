import { useState } from "react";
import NavbarItem from "../components/NavbarItem"; //navbar模組
import ShiftChange from "./ShiftChange"; //交接班
import ShiftChangeLog from "./ShiftChangeLog"; //交接班紀錄
import StoreExpense from "./StoreExpense"; // 門市支出

export default function ShiftChangeIndex() {
  // 設定當前顯示的內容
  const [activeTab, setActiveTab] = useState("交接班");
  return (
    <>
      <div className="navbar d-flex  justify-content-between text-center w-100 px-4">
        <div className="d-flex">
          <NavbarItem
            text="交接班"
            active={activeTab === "交接班"}
            onClick={() => setActiveTab("交接班")}
          />
          <NavbarItem
            text="交接班紀錄"
            active={activeTab === "交接班紀錄"}
            onClick={() => setActiveTab("交接班紀錄")}
          />
          <NavbarItem
            text="門市支出"
            active={activeTab === "門市支出"}
            onClick={() => setActiveTab("門市支出")}
          />
        </div>
      </div>
      {/* 內容區域 */}
      <div className="content-container" style={{ height: "89vh" }}>
        {activeTab === "交接班" && <ShiftChange />}
        {activeTab === "交接班紀錄" && <ShiftChangeLog />}
         {activeTab === "門市支出" && <StoreExpense />}
      </div>
    </>
  );
}
