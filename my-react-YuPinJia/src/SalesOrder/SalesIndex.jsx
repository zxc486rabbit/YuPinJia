import { useState } from "react";
import NavbarItem from "../components/NavbarItem"; //navbar模組
import Sales from "./Sales"; //訂單總覽
import ReturnGoods from "./ReturnGoods"; //退貨總覽
// import TransPay from "./TransPay"; //還款紀錄
import Give from "./Give"; //贈送紀錄
import PickupOrders from "./PickupOrders"; // 待取訂單（新增）

export default function SalesIndex() {
   // 設定當前顯示的內容
   const [activeTab, setActiveTab] = useState("訂單總覽");
  return (
    <>
      <div className="navbar d-flex  justify-content-between text-center w-100 px-4">
        <div className="d-flex">
          <NavbarItem text="訂單總覽" active={activeTab === "訂單總覽"} onClick={() => setActiveTab("訂單總覽")}/>
          <NavbarItem text="退貨總覽" active={activeTab === "退貨總覽"} onClick={() => setActiveTab("退貨總覽")} />
          <NavbarItem text="待取訂單" active={activeTab === "待取訂單"} onClick={() => setActiveTab("待取訂單")} />
          {/* <NavbarItem text="還款紀錄" active={activeTab === "還款紀錄"} onClick={() => setActiveTab("還款紀錄")}/> */}
          <NavbarItem text="贈送紀錄" active={activeTab === "贈送紀錄"} onClick={() => setActiveTab("贈送紀錄")}/>
        </div>
      </div>
      {/* 內容區域 */}
      <div className="content-container" style={{height: "89vh"}}>
        {activeTab === "訂單總覽" && <Sales />}
        {activeTab === "退貨總覽" && <ReturnGoods />}
        {activeTab === "待取訂單" && <PickupOrders />}
        {/* {activeTab === "還款紀錄" && <TransPay />} */}
        {activeTab === "贈送紀錄" && <Give />}
      </div>
    </>
  );
}
