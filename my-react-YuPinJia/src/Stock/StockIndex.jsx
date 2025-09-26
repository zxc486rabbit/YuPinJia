import { useState } from "react";
import NavbarItem from "../components/NavbarItem"; //navbar模組
import Stock from "./Stock"; //庫存
import Restock from "./Restock"; //進貨
// import Receive from "./Receive"; //領貨
import Adjust from "./Adjust"; //調貨
import Check from "./Check"; //盤點

export default function StockIndex() {
   // 設定當前顯示的內容
   const [activeTab, setActiveTab] = useState("庫存");
  return (
    <>
      <div className="navbar d-flex  justify-content-between text-center w-100 px-4">
        <div className="d-flex">
          <NavbarItem text="庫存" active={activeTab === "庫存"} onClick={() => setActiveTab("庫存")}/>
          <NavbarItem text="進貨" active={activeTab === "進貨"} onClick={() => setActiveTab("進貨")} />
          {/* <NavbarItem text="領貨" active={activeTab === "領貨"} onClick={() => setActiveTab("領貨")} /> */}
          <NavbarItem text="調貨" active={activeTab === "調貨"} onClick={() => setActiveTab("調貨")}/>
          <NavbarItem text="盤點" active={activeTab === "盤點"} onClick={() => setActiveTab("盤點")}/>
        </div>
      </div>
      {/* 內容區域 */}
      <div className="content-container" style={{height: "89vh"}}>
        {activeTab === "庫存" && <Stock />}
        {activeTab === "進貨" && <Restock />}
        {/* {activeTab === "領貨" && <Receive />} */}
        {activeTab === "調貨" && <Adjust />}
        {activeTab === "盤點" && <Check />}
      </div>
    </>
  );
}
