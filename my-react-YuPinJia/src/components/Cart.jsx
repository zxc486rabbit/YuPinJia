import { useState, useEffect } from "react";
import MemberModal from "./MemberModal"; // 會員切換
import ReservedModal from "./ReservedModal"; // 已保留訂單
import CartTable from "./CartTable";
import {
  FaGem,
  FaMedal,
  FaTicketAlt,
  FaUser,
  FaExchangeAlt,
  FaRegEdit,
  FaCheckCircle,
} from "react-icons/fa";

export default function Cart({
  items,
  updateQuantity,
  currentMember,
  setCurrentMember,
  members,
   onCartSummaryChange,
}) {
  const [showModal, setShowModal] = useState(false); // 控制 modal 開關
  const [showReserved, setShowReserved] = useState(false); // 已保留訂單
  const [savedOrders, setSavedOrders] = useState([]); // localStorage 讀取
  const [usedPoints, setUsedPoints] = useState(0); // 使用者輸入的折抵點數

  const handleSwitchByInput = (member) => {
    setCurrentMember(member);
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const discountPerPoint = 1;
const pointDiscount = usedPoints * discountPerPoint;
const finalTotal = Math.max(subtotal - pointDiscount, 0);

  /* 讀暫存訂單列表 */
  useEffect(() => {
    const list = JSON.parse(localStorage.getItem("savedOrders") || "[]");
    setSavedOrders(list);
  }, []);

  useEffect(() => {
  if (typeof onCartSummaryChange === "function") {
    onCartSummaryChange({ subtotal, usedPoints, finalTotal });
  }
}, [subtotal, usedPoints, finalTotal]);

  /* ↘️ 1. 暫存按鈕 */
  const handleTempSave = () => {
    if (items.length === 0) return;
    const newSave = {
      key: Date.now(), // 唯一鍵
      memberId: currentMember?.id,
      memberName: currentMember?.name,
      items,
      savedAt: Date.now(),
    };
    const next = [newSave, ...savedOrders];
    localStorage.setItem("savedOrders", JSON.stringify(next));
    setSavedOrders(next);
    alert("訂單已暫存！");
    // 清空購物車 (呼叫父層函式或自行 setState，這裡示範最簡單做法)
    updateQuantity("__CLEAR__", 0); // 父層需判斷這個特殊 id 代表清空
  };

  /* ↘️ 2. 取回暫存訂單 */
  const restoreOrder = (order) => {
    order.items.forEach((it) => updateQuantity(it.id, it.quantity, true)); // 追加進購物車
    const remain = savedOrders.filter((o) => o.key !== order.key);
    localStorage.setItem("savedOrders", JSON.stringify(remain));
    setSavedOrders(remain);
    setShowReserved(false);
  };

  return (
    <div className="cart py-3">
      <div className="w-100">
        <div className="d-flex justify-content-center mb-3 mt-2">
          <button className="grayButton me-4" onClick={handleTempSave}>
            <FaRegEdit className="me-1" />
            暫存訂單
          </button>
          <button className="pinkButton" onClick={() => setShowReserved(true)}>
            <FaCheckCircle className="me-1" />
            已保留訂單
          </button>
        </div>

        {/* 切換會員 */}
        <div className="d-flex align-items-center px-3">
          <div style={{ flex: 1 }}>
            <div className="d-flex align-items-center mb-1">
              <FaUser className="me-1" />
              會員：{currentMember?.name}
            </div>
            <div className="d-flex align-items-center text-muted small">
              <FaGem className="me-1" /> {currentMember?.type}
              <span className="mx-3">
                <FaMedal className="me-1" />
                {currentMember?.level}
              </span>
              <FaTicketAlt className="me-1" /> 點數：{currentMember?.points}
            </div>
          </div>
          <button
            className="change-button ms-3 py-1"
            onClick={() => setShowModal(true)}
          >
            <FaExchangeAlt className="me-1" /> 切換會員
          </button>
        </div>

        <div className="no-scrollbar mt-3" style={{ height: "57vh" }}>
          <CartTable items={items} updateQuantity={updateQuantity} />
        </div>
      </div>

      {/* 計算區 */}
<div className="w-100 mt-2 px-4" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
  {/* 商品總數 */}
  <div className="d-flex justify-content-between mb-1">
    <span>商品總數</span>
    <span className="text-value">{totalQuantity}</span>
  </div>

  {/* 小計 */}
  <div className="d-flex justify-content-between mb-1">
    <span>小計</span>
    <span className="text-value">${subtotal.toLocaleString()}</span>
  </div>

  {/* 點數折抵輸入欄 + 全折按鈕 */}
  <div className="d-flex justify-content-between align-items-center mb-1">
    <span>點數折抵</span>
    <div className="d-flex align-items-center">
      <input
        type="number"
        value={usedPoints}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          const safeVal = Math.min(Math.max(val || 0, 0), currentMember?.points || 0);
          setUsedPoints(safeVal);
        }}
        className="form-control text-end me-2"
        style={{ width: "100px", color: "#C75D00" }}
      />
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setUsedPoints(currentMember?.points || 0)}
      >
        全折
      </button>
    </div>
  </div>

  <hr />

  {/* 總價 */}
  <div className="d-flex justify-content-between" style={{ color: "#A40000" }}>
    <span>總價</span>
    <span className="text-value">${finalTotal.toLocaleString()}</span>
  </div>
</div>

      {/* 切換會員 Modal */}
      {members?.length > 0 && (
        <MemberModal
          show={showModal}
          onHide={() => setShowModal(false)}
          members={members}
          onSelect={handleSwitchByInput}
          member={currentMember}
        />
      )}

      {/* 末尾加上 ReservedModal */}
      <ReservedModal
        show={showReserved}
        onHide={() => setShowReserved(false)}
        orders={savedOrders}
        onRestore={restoreOrder}
      />
    </div>
  );
}
