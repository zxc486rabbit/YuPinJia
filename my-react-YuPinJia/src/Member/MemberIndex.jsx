import { useState } from "react";
import NavbarItem from "../components/NavbarItem"; //navbar模組
import CreateMember from "./CreateMember"; //建立會員
import MemberOverview from "./MemberOverview/MemberOverview"; //會員總覽
import CreditLog from "./CreditLog"; //賒帳紀錄
import TransPay from "./TransPay"; //還款紀錄
import Blacklist from "./Blacklist"; //黑名單

export default function MemberIndex() {
  // 設定當前顯示的內容
  const [activeTab, setActiveTab] = useState("建立會員");
  return (
    <>
      <div className="navbar d-flex  justify-content-between text-center w-100 px-4">
        <div className="d-flex">
          <NavbarItem
            text="建立會員"
            active={activeTab === "建立會員"}
            onClick={() => setActiveTab("建立會員")}
          />
          <NavbarItem
            text="會員總覽"
            active={activeTab === "會員總覽"}
            onClick={() => setActiveTab("會員總覽")}
          />
          <NavbarItem
            text="賒帳紀錄"
            active={activeTab === "賒帳紀錄"}
            onClick={() => setActiveTab("賒帳紀錄")}
          />
          <NavbarItem
            text="還款紀錄"
            active={activeTab === "還款紀錄"}
            onClick={() => setActiveTab("還款紀錄")}
          />
          <NavbarItem
            text="黑名單"
            active={activeTab === "黑名單"}
            onClick={() => setActiveTab("黑名單")}
          />
        </div>
      </div>
      {/* 內容區域 */}
      <div className="content-container" style={{ height: "89vh" }}>
        {activeTab === "建立會員" && <CreateMember />}
        {activeTab === "會員總覽" && <MemberOverview />}
        {activeTab === "賒帳紀錄" && <CreditLog />}
        {activeTab === "還款紀錄" && <TransPay />}
        {activeTab === "黑名單" && <Blacklist />}
      </div>
    </>
  );
}
