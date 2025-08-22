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
  FaSyncAlt,
} from "react-icons/fa";
import axios from "axios";

export default function Cart({
  items,
  updateQuantity,
  currentMember,
  setCurrentMember, // 父層包裝過的方法
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
  const discountedTotal = items.reduce(
    (sum, item) =>
      sum + getMemberPrice(item.unitPrice, currentMember) * item.quantity,
    0
  );
  const subtotal = discountedTotal;
  const pointDiscount = usedPoints * discountPerPoint;
  const finalTotal = Math.max(subtotal - pointDiscount, 0);

// ─────────────────────────────────────────────
  // 共用：查單一會員 / 查經銷商 / 標準化
  const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

  async function fetchMemberById(memberId) {
    try {
      // 依你後端實際路由調整（先試 /t_Member/{id}，不行就 ?id=，最後全量過濾）
      const try1 = await axios.get(`${API_BASE}/t_Member/${memberId}`).catch(() => null);
      if (try1?.data?.id) return try1.data;

      const try2 = await axios.get(`${API_BASE}/t_Member`, { params: { id: memberId } }).catch(() => null);
      if (Array.isArray(try2?.data)) {
        const found = try2.data.find((m) => m.id === memberId);
        if (found) return found;
      } else if (try2?.data?.id === memberId) {
        return try2.data;
      }

      const try3 = await axios.get(`${API_BASE}/t_Member`).catch(() => null);
      if (Array.isArray(try3?.data)) {
        return try3.data.find((m) => m.id === memberId) || null;
      }
    } catch (e) {
      console.error("fetchMemberById 失敗", e);
    }
    return null;
  }

  async function fetchDistributorByMemberId(memberId) {
    try {
      const { data } = await axios.get(`${API_BASE}/t_Distributor`, { params: { memberId } });
      if (Array.isArray(data)) return data.find((d) => d.memberId === memberId) || null;
      return data?.memberId === memberId ? data : null;
    } catch (e) {
      return null;
    }
  }

  function normalizeMember(base, dist) {
    const buyerType = dist?.buyerType ?? null; // 1=導遊,2=廠商
    const isDistributor = !!dist;
    const subType = buyerType === 1 ? "導遊" : buyerType === 2 ? "廠商" : (base?.memberType === "導遊" ? "導遊" : base?.memberType === "經銷商" ? "廠商" : "");
    const discountRate = isDistributor ? Number(dist?.discountRate ?? 1) : (base?.discountRate ?? 1);

    const point = Number(base?.cashbackPoint ?? base?.rewardPoints ?? base?.points ?? 0);
    return {
      ...base,
      id: base?.id ?? base?.memberId,
      memberId: base?.id ?? base?.memberId,
      fullName: base?.fullName ?? base?.name ?? "未命名會員",
      contactPhone: base?.contactPhone ?? base?.phone ?? base?.mobile ?? "",
      memberLevel: base?.memberLevel ?? 0,
      cashbackPoint: point,
      rewardPoints: point, // 別名，給舊程式相容
      isDistributor,
      buyerType,
      subType,
      discountRate: Number(discountRate || 1),
      type: isDistributor ? "VIP" : "一般",
      level: `LV${base?.memberLevel ?? 0}`,
    };
  }
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (typeof onCartSummaryChange === "function") {
      onCartSummaryChange({ subtotal, usedPoints, finalTotal });
    }
  }, [subtotal, usedPoints, finalTotal]);

  const handleShowReserved = () => {
    const list = JSON.parse(localStorage.getItem("savedOrders") || "[]");
    setSavedOrders(list.sort((a, b) => b.savedAt - a.savedAt));
    setShowReserved(true);
  };

  const removeItem = (productId) => {
    updateQuantity(productId, 0);
  };

  // 暫存訂單
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
    setSavedOrders(next);
    localStorage.setItem("savedOrders", JSON.stringify(next));

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
      }).then(async (result) => {
        if (!result.isConfirmed) return;

        const target = await fetchMemberById(order.memberId);
        if (!target) return Swal.fire({ title: "錯誤", text: "找不到該會員", icon: "error" });
        handleSwitchByInput(target, () => actuallyRestore(order)); // 切換成功後才恢復
      });
    } else {
      handleSwitchByInput(currentMember, () => actuallyRestore(order));
    }
  };

  const actuallyRestore = (order) => {
    if ((currentMember?.cashbackPoint || 0) < usedPoints) {
      Swal.fire({
        title: "點數不足",
        text: "會員點數不足以折抵",
        icon: "warning",
      });
      return;
    }

    const outOfStock = order.items.find(
      (it) => stockMap[it.id] !== undefined && it.quantity > stockMap[it.id]
    );
    if (outOfStock) {
      Swal.fire({
        title: "庫存不足",
        text: `商品「${outOfStock.name}」庫存不足，剩餘 ${
          stockMap[outOfStock.id] || 0
        }`,
        icon: "warning",
      });
      return;
    }

    order.items.forEach((it) => updateQuantity(it.id, it.quantity, true, it));

    const remain = savedOrders.filter((o) => o.key !== order.key);
    setSavedOrders(remain);
    // 同步更新 localStorage
    localStorage.setItem("savedOrders", JSON.stringify(remain));
    setShowReserved(false);

    Swal.fire({ title: "成功", text: "已取回暫存訂單", icon: "success" });
  };

  const handleSwitchByInput = async (member, afterSelect) => {
    // 若已帶齊身份/折扣就直接用；否則查 t_Distributor 後標準化
    let normalized = member;
    const needEnrich =
      member?.discountRate == null &&
      member?.buyerType == null &&
      !member?.subType &&
      member?.isDistributor == null;

    if (needEnrich) {
      const dist = await fetchDistributorByMemberId(member?.id ?? member?.memberId);
      normalized = normalizeMember(member, dist);
    } else {
      normalized = normalizeMember(member, member?.isDistributor ? { buyerType: member?.buyerType, discountRate: member?.discountRate, memberId: member?.id ?? member?.memberId } : null);
    }

    setCurrentMember(normalized);
    setUsedPoints(0); // 切換會員重置折抵，避免前一位的點數殘留

    if (normalized.subType === "導遊") {
      Swal.fire({
        title: "<strong>請選擇結帳身份</strong>",
        html: `
        <div style="display: flex; gap: 1rem; justify-content: center; margin-top:1rem;">
          <div id="guideSelf" style="flex:1;cursor:pointer;padding: 1.5rem;border: 1px solid #ddd;border-radius: 8px;background: #f9f9f9;font-size: 1.5rem;font-weight: 600;text-align: center;">
            導遊本人結帳<br/><span style="font-size:1.2rem; color:#28a745">(9折)</span>
          </div>
          <div id="customer" style="flex:1;cursor:pointer;padding: 1.5rem;border: 1px solid #ddd;border-radius: 8px;background: #f9f9f9;font-size: 1.5rem;font-weight: 600;text-align: center;">
            客人結帳<br/><span style="font-size:1.2rem; color:#007bff">(原價)</span>
          </div>
        </div>`,
        showCancelButton: true,
        cancelButtonText: `<div style="font-size:1.2rem; padding:0.5rem 1rem;">取消</div>`,
        showConfirmButton: false,
        didOpen: () => {
          const popup = Swal.getPopup();

          // 導遊本人
          popup?.querySelector("#guideSelf")?.addEventListener("click", () => {
            Swal.close();
            setIsGuideSelf(true);
            localStorage.setItem("checkout_payer", "guide");

            const updatedMember = {
              ...normalized,
              discountRate: 0.9, // 導遊本人折扣
            };
            setCurrentMember(updatedMember);

            if (afterSelect) afterSelect();
          });

          // 客人結帳
          popup?.querySelector("#customer")?.addEventListener("click", () => {
            Swal.close();
            setIsGuideSelf(false);
            localStorage.setItem("checkout_payer", "customer");

            const updatedMember = {
              ...normalized,
              discountRate: 1, // 客人結帳原價
            };
            setCurrentMember(updatedMember);

            if (afterSelect) afterSelect();
          });
        },
      });
    } else {
      setIsGuideSelf(false);
      if (afterSelect) afterSelect();
    }
  };

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
              {currentMember
                ? `會員：${currentMember.fullName}`
                : "尚未登入會員"}
            </div>
            {currentMember && (
              <div className="d-flex align-items-center text-muted small">
                <FaGem className="me-1" /> {currentMember?.type}
                <span className="mx-3">
                  <FaMedal className="me-1" /> {currentMember?.level}
                </span>
                <FaTicketAlt className="me-1" /> 點數：
                {currentMember?.cashbackPoint}
              </div>
            )}
          </div>
          <button
            className="change-button ms-3"
            onClick={() => setShowModal(true)}
          >
            <FaSyncAlt className="me-1" /> 切換會員
          </button>

          {currentMember?.subType === "導遊" && (
            <button
              className="btn btn-outline-secondary ms-2 "
              onClick={() => handleSwitchByInput(currentMember)}
            >
              <FaExchangeAlt className="me-1" />
            </button>
          )}

          {/* <button
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
                  Swal.fire({
                    title: "已清空",
                    text: "購物車已清空",
                    icon: "success",
                  });
                }
              })
            }
          >
            清空購物車
          </button> */}
        </div>

        <div className="no-scrollbar mt-3" style={{ height: "56vh" }}>
          <CartTable
            items={items}
            updateQuantity={updateQuantity}
            currentMember={currentMember}
            removeItem={removeItem}
          />
        </div>
      </div>

      <div
        className="w-100 mt-2 px-4"
        style={{ fontSize: "1.2rem", fontWeight: "bold" }}
      >
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
                const maxByCashback = currentMember?.cashbackPoint || 0;
                const maxBySubtotal = Math.floor(subtotal / discountPerPoint);
                const safeVal = Math.min(
                  Math.max(val || 0, 0),
                  maxByCashback,
                  maxBySubtotal
                );
                setUsedPoints(safeVal);
              }}
              disabled={!currentMember}
              className="form-control text-end me-2"
              style={{ width: "100px", color: "#C75D00" }}
            />
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => {
                const maxByCashback = currentMember?.cashbackPoint || 0;
                const maxBySubtotal = Math.floor(subtotal / discountPerPoint);
                setUsedPoints(Math.min(maxByCashback, maxBySubtotal));
              }}
            >
              全折
            </button>
          </div>
        </div>

        <hr />

        <div
          className="d-flex justify-content-between"
          style={{ color: "#A40000" }}
        >
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

      <MemberModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSelect={handleSwitchByInput}  // 傳回的 member 這裡會自動補齊身份/折扣
      />
      <ReservedModal
        show={showReserved}
        onHide={() => setShowReserved(false)}
        orders={savedOrders}
        onRestore={restoreOrder}
      />
    </div>
  );
}
