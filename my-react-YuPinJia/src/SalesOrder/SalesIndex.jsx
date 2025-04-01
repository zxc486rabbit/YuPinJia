import { useState } from "react";
import NavbarItem from "../components/NavbarItem"; //navbar模組
import Sales from "./Sales"; //訂單總覽

export default function SalesIndex() {
   // 設定當前顯示的內容
   const [activeTab, setActiveTab] = useState("訂單總覽");
  return (
    <>
      <div className="navbar d-flex  justify-content-between text-center w-100 px-4">
        <div className="d-flex">
          <NavbarItem text="訂單總覽" active onClick={() => setActiveTab("訂單總覽")}/>
          <NavbarItem text="退貨總覽" onClick={() => setActiveTab("退貨總覽")}/>
          <NavbarItem text="匯款紀錄" onClick={() => setActiveTab("匯款紀錄")}/>
          <NavbarItem text="贈送紀錄" onClick={() => setActiveTab("贈送紀錄")}/>
        </div>
      </div>
      {/* 內容區域 */}
      <div className="content-container" style={{height: "89vh"}}>
        {activeTab === "訂單總覽" && <Sales/>}
        {activeTab === "退貨總覽" && <div>這是退貨總覽內容</div>}
        {activeTab === "匯款紀錄" && <div>這是匯款紀錄內容</div>}
        {activeTab === "贈送紀錄" && <div>這是贈送紀錄內容</div>}
      </div>
    </>
  );
}
