import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import MemberModal from "./MemberModal";
import ReservedModal from "./ReservedModal";
import CartTable from "./CartTable";
import { getMemberPrice, isDealer } from "../utils/getMemberPrice";
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
  stockMap = {},
  isGuideSelf,
  setIsGuideSelf,
}) {
  const [showModal, setShowModal] = useState(false);
  const [showReserved, setShowReserved] = useState(false);
  const [savedOrders, setSavedOrders] = useState([]);
  const [usedPoints, setUsedPoints] = useState(0);

  const discountPerPoint = 1;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const originalTotal = items.reduce(
    (sum, item) => sum + (item.unitPrice ?? 0) * item.quantity,
    0
  );
  const discountedTotal = items.reduce(
    (sum, item) =>
      sum + getMemberPrice(item.unitPrice, currentMember) * item.quantity,
    0
  );

  const subtotal = discountedTotal;
  const pointDiscount = usedPoints * discountPerPoint;
  const finalTotal = Math.max(subtotal - pointDiscount, 0);

  useEffect(() => {
    if (!currentMember || !isGuideSelf) return;
    if (currentMember.subType !== "導遊") return;

    const guidePrice = subtotal;
    const customerPrice = originalTotal;
    const rebate = customerPrice - guidePrice;

    if (rebate > 0) {
      const cashback = {
        guideId: currentMember.memberId,
        guideName: currentMember.fullName,
        amount: rebate,
        at: Date.now(),
      };

      const prev = JSON.parse(localStorage.getItem("guideRebates") || "[]");
      const updated = [cashback, ...prev];
      localStorage.setItem("guideRebates", JSON.stringify(updated));
    }
  }, [subtotal, originalTotal, currentMember, isGuideSelf]);

  const handleShowReserved = () => {
    const list = JSON.parse(localStorage.getItem("savedOrders") || "[]");
    setSavedOrders(list.sort((a, b) => b.savedAt - a.savedAt));
    setShowReserved(true);
  };

  useEffect(() => {
    if (typeof onCartSummaryChange === "function") {
      onCartSummaryChange({ subtotal, usedPoints, finalTotal });
    }
  }, [subtotal, usedPoints, finalTotal]);

  const handleTempSave = () => {
    if (!currentMember) {
      Swal.fire("請先登入會員再暫存訂單", "", "warning");
      return;
    }
    if (items.length === 0) return;

    const newSave = {
      key: Date.now(),
      memberId: currentMember?.id,
      memberName: currentMember?.fullName,
      items,
      savedAt: Date.now(),
    };
    const next = [newSave, ...savedOrders];
    localStorage.setItem("savedOrders", JSON.stringify(next));
    setSavedOrders(next);

    updateQuantity("__CLEAR__", 0);
    Swal.fire({ title: "成功", text: "訂單已暫存！", icon: "success" });
  };

  const restoreOrder = (order) => {
    if (order.memberId !== currentMember?.id) {
      Swal.fire({
        title: `此暫存訂單屬於會員「${order.memberName}」`,
        text: "是否切換至該會員後取回？",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "確定",
        cancelButtonText: "取消",
      }).then((result) => {
        if (!result.isConfirmed) return;
        const targetMember = members.find((m) => m.id === order.memberId);
        if (!targetMember) {
          Swal.fire({ title: "錯誤", text: "找不到該會員", icon: "error" });
          return;
        }
        updateQuantity("__CLEAR__", 0);
        setUsedPoints(0);
        handleSwitchByInput(targetMember);
        actuallyRestore(order);
      });
    } else {
      actuallyRestore(order);
    }
  };

  const actuallyRestore = (order) => {
    if ((currentMember?.rewardPoints || 0) < usedPoints) {
      Swal.fire({ title: "點數不足", text: "會員點數不足以折抵", icon: "warning" });
      return;
    }

    const outOfStock = order.items.find(
      (it) => stockMap[it.id] !== undefined && it.quantity > stockMap[it.id]
    );
    if (outOfStock) {
      Swal.fire({
        title: "庫存不足",
        text: `商品「${outOfStock.name}」庫存不足，剩餘 ${stockMap[outOfStock.id] || 0}`,
        icon: "warning",
      });
      return;
    }

    order.items.forEach((it) => updateQuantity(it.id, it.quantity, true, it));

    const latestMember = members.find((m) => m.id === currentMember?.id);
    if (latestMember) {
      const updatedMember = {
        ...currentMember,
        rewardPoints: latestMember.rewardPoints ?? currentMember.rewardPoints,
      };
      setCurrentMember(updatedMember);

      const updatedCheckoutData = JSON.parse(localStorage.getItem("checkoutData") || "{}");
      localStorage.setItem(
        "checkoutData",
        JSON.stringify({ ...updatedCheckoutData, member: { ...updatedMember } })
      );
    }

    const remain = savedOrders.filter((o) => o.key !== order.key);
    localStorage.setItem("savedOrders", JSON.stringify(remain));
    setSavedOrders(remain);
    setShowReserved(false);

    Swal.fire({ title: "成功", text: "已取回暫存訂單", icon: "success" });
  };

  const handleSwitchByInput = (member) => {
  updateQuantity("__CLEAR__", 0);
  setUsedPoints(0);

  const distributor = member.isDistributor
    ? (JSON.parse(localStorage.getItem("distributors") || "[]") || []).find(
        (d) => d.memberId === member.id
      )
    : null;

  const normalized = {
    ...member,
    fullName: member.fullName ?? member.name ?? "未命名會員",
    rewardPoints: member.rewardPoints ?? member.points ?? 0,
    type: member.isDistributor ? "VIP" : "一般",
    level: `LV${member.memberLevel ?? 0}`,
    discountRate: member.isDistributor ? 0.9 : 1,
    subType: distributor?.buyerType === 1 ? "導遊" : distributor?.buyerType === 2 ? "經銷商" : "",
  };

  const isSameMember =
    currentMember?.memberId === normalized?.memberId &&
    currentMember?.subType === normalized?.subType;

  if (isSameMember) return; // ❗️避免無限循環

  if (normalized.type === "VIP" && normalized.subType === "導遊") {
    Swal.fire({
      title: "<strong>請選擇結帳身份</strong>",
      html: `
        <div style="display: flex; gap: 1rem; justify-content: center; margin-top:1rem;">
          <div id="guideSelf" style="flex:1;cursor:pointer;padding: 1.5rem;border: 1px solid #ddd;border-radius: 8px;background: #f9f9f9;font-size: 1.5rem;font-weight: 600;text-align: center;">
            導遊<br/><span style="font-size:1.2rem; color:#28a745">(${Math.round(normalized.discountRate * 10)}折)</span>
          </div>
          <div id="customer" style="flex:1;cursor:pointer;padding: 1.5rem;border: 1px solid #ddd;border-radius: 8px;background: #f9f9f9;font-size: 1.5rem;font-weight: 600;text-align: center;">
            客人<br/><span style="font-size:1.2rem; color:#007bff">(原價)</span>
          </div>
        </div>`,
      showCancelButton: true,
      cancelButtonText: `<div style="font-size:1.2rem; padding:0.5rem 1rem;">取消</div>`,
      showConfirmButton: false,
      didOpen: () => {
        const guideSelfBtn = Swal.getPopup().querySelector("#guideSelf");
        const customerBtn = Swal.getPopup().querySelector("#customer");

        guideSelfBtn.addEventListener("click", () => {
          if (isSameMember && isGuideSelf === true) {
            Swal.close();
            return;
          }
          Swal.close();
          setCurrentMember(normalized);
          setIsGuideSelf(true);
          localStorage.setItem("currentMember", JSON.stringify(normalized));
        });

        customerBtn.addEventListener("click", () => {
          if (isSameMember && isGuideSelf === false) {
            Swal.close();
            return;
          }
          Swal.close();
          setCurrentMember(normalized);
          setIsGuideSelf(false);
          localStorage.setItem("currentMember", JSON.stringify(normalized));
        });
      },
    });
  } else {
    setCurrentMember(normalized);
    setIsGuideSelf(false);
    localStorage.setItem("currentMember", JSON.stringify(normalized));
  }
};


  useEffect(() => {
  // console.log("🛒 Cart currentMember:", currentMember);
}, [currentMember]);
  return (
    <div className="cart py-3">
      <div className="w-100">
        <div className="d-flex justify-content-center mb-3 mt-2">
          <button className="grayButton me-4" onClick={handleTempSave}>
            <FaRegEdit className="me-1" /> 暫存訂單
          </button>
          <button className="pinkButton" onClick={handleShowReserved}>
            <FaCheckCircle className="me-1" /> 已保留訂單
          </button>
        </div>

        <div className="d-flex align-items-center px-3">
          <div style={{ flex: 1 }}>
            <div className="d-flex align-items-center mb-1">
              <FaUser className="me-1" />
              {currentMember ? `會員：${currentMember.fullName}` : "尚未登入會員"}
            </div>
            {currentMember && (
              <div className="d-flex align-items-center text-muted small">
                <FaGem className="me-1" /> {currentMember?.type}
                <span className="mx-3">
                  <FaMedal className="me-1" /> {currentMember?.level}
                </span>
                <FaTicketAlt className="me-1" /> 點數：{currentMember?.rewardPoints}
              </div>
            )}
          </div>
          <button className="change-button ms-3 py-1" onClick={() => setShowModal(true)}>
            <FaExchangeAlt className="me-1" /> 切換會員
          </button>
          <button
            className="btn btn-outline-danger ms-2"
            onClick={() =>
              Swal.fire({
                title: "確認清空購物車？",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "清空",
                cancelButtonText: "取消",
              }).then((result) => {
                if (result.isConfirmed) {
                  updateQuantity("__CLEAR__", 0);
                  Swal.fire({ title: "已清空", text: "購物車已清空", icon: "success" });
                }
              })
            }
          >
            清空購物車
          </button>
        </div>

        <div className="no-scrollbar mt-3" style={{ height: "57vh" }}>
          <CartTable
            items={items}
            updateQuantity={updateQuantity}
            currentMember={currentMember}
          />
        </div>
      </div>

      <div className="w-100 mt-2 px-4" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
        <div className="d-flex justify-content-between mb-1">
          <span>商品總數</span>
          <span className="text-value">{totalQuantity}</span>
        </div>

        <div className="d-flex justify-content-between mb-1">
          <span>小計</span>
          <span className="text-value">${subtotal.toLocaleString()}</span>
        </div>

        <div className="d-flex justify-content-between align-items-center mb-1">
          <span>點數折抵</span>
          <div className="d-flex align-items-center">
            <input
              type="number"
              value={usedPoints === 0 ? "" : usedPoints}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                const safeVal = Math.min(
                  Math.max(val || 0, 0),
                  currentMember?.rewardPoints || 0
                );
                setUsedPoints(safeVal);
              }}
              disabled={!currentMember}
              className="form-control text-end me-2"
              style={{ width: "100px", color: "#C75D00" }}
            />
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setUsedPoints(currentMember?.rewardPoints || 0)}
            >
              全折
            </button>
          </div>
        </div>

        <hr />

        <div className="d-flex justify-content-between" style={{ color: "#A40000" }}>
          <span>總價</span>
          <span className="text-value">
            ${finalTotal.toLocaleString()}
            {isDealer(currentMember) && (
              <span className="text-success ms-2 small">
                ({Math.round((currentMember?.discountRate ?? 1) * 10)}折)
              </span>
            )}
          </span>
        </div>
      </div>

      {members?.length > 0 && (
        <MemberModal
          show={showModal}
          onHide={() => setShowModal(false)}
          members={members}
          onSelect={handleSwitchByInput}
          member={currentMember}
        />
      )}
      <ReservedModal
        show={showReserved}
        onHide={() => setShowReserved(false)}
        orders={savedOrders}
        onRestore={restoreOrder}
      />
    </div>
  );
}