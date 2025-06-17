import { useState, useEffect } from "react";
import MemberModal from "./MemberModal";
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

export default function Cart({ items, updateQuantity, currentMember, setCurrentMember, members }) {
  const [showModal, setShowModal] = useState(false); // 控制 modal 開關

  const handleSwitchByInput = (member) => {
    setCurrentMember(member);
  };

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const discountPerPoint = 1;
  const pointDiscount = (currentMember?.points || 0) * discountPerPoint;
  const finalTotal = Math.max(subtotal - pointDiscount, 0);

  return (
    <div className="cart py-3">
      <div className="w-100">
        <div className="d-flex justify-content-center mb-3 mt-2">
          <button className="grayButton me-4">
            <FaRegEdit className="me-1" />
            暫存訂單
          </button>
          <button className="pinkButton">
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
          <button className="change-button ms-3 py-1" onClick={() => setShowModal(true)}>
            <FaExchangeAlt className="me-1" /> 切換會員
          </button>
        </div>

        <div className="no-scrollbar mt-3" style={{ height: "57vh" }}>
          <CartTable items={items} updateQuantity={updateQuantity} />
        </div>
      </div>

      {/* 計算區 */}
      <div className="w-100 mt-2 px-4" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
        <div className="d-flex justify-content-between">
          <span>商品總數</span>
          <span>{totalQuantity}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span>小計</span>
          <span>${subtotal.toLocaleString()}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span>點數折抵</span>
          <span style={{ color: "#C75D00" }}>-{pointDiscount}</span>
        </div>
        <hr />
        <div className="d-flex justify-content-between" style={{ color: "#A40000" }}>
          <span>總價</span>
          <span>${finalTotal.toLocaleString()}</span>
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
    </div>
  );
}