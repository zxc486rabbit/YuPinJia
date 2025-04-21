import { useState } from "react";
import NavbarItem from "../components/NavbarItem"; //navbar模組
import CustomerComplain from "./CustomerComplain"; //客訴


export default function CustomerComplainIndex() {
   // 設定當前顯示的內容
   const [activeTab, setActiveTab] = useState("客訴");
  return (
    <>
      <div className="navbar d-flex  justify-content-between text-center w-100 px-4">
        <div className="d-flex">
          <NavbarItem text="客訴" active={activeTab === "客訴"} onClick={() => setActiveTab("客訴")}/>
        </div>
      </div>
      {/* 內容區域 */}
      <div className="content-container" style={{height: "89vh"}}>
        {activeTab === "客訴" && <CustomerComplain />}
      </div>
    </>
  );
}
