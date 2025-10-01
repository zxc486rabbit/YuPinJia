// Cart.jsx
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import MemberModal from "./MemberModal";
import ReservedModal from "./ReservedModal";
import CartTable from "./CartTable";
import { isDealer } from "../utils/getMemberPrice";
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
  setCurrentMember,
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

  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity ?? 0),
    0
  );
  const subtotal = items.reduce((sum, item) => {
    const unit = Number(
      item.unitPrice ?? item.calculatedPrice ?? item.price ?? 0
    );
    const qty = Number(item.quantity ?? 0);
    return sum + unit * qty;
  }, 0);
  const pointDiscount = usedPoints * discountPerPoint;
  const finalTotal = Math.max(subtotal - pointDiscount, 0);

  // ────────────────── 會員/經銷商查詢與標準化 ──────────────────
  const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

  async function fetchMemberById(memberId) {
    try {
      const try1 = await axios
        .get(`${API_BASE}/t_Member/${memberId}`)
        .catch(() => null);
      if (try1?.data?.id) return try1.data;

      const try2 = await axios
        .get(`${API_BASE}/t_Member`, { params: { id: memberId } })
        .catch(() => null);
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
      const tryQuery = await axios
        .get(`${API_BASE}/t_Distributor`, { params: { memberId } })
        .catch(() => null);
      if (Array.isArray(tryQuery?.data)) {
        const found = tryQuery.data.find((d) => d.memberId === memberId);
        if (found) return found;
      } else if (tryQuery?.data?.memberId === memberId) {
        return tryQuery.data;
      }

      const tryPath = await axios
        .get(`${API_BASE}/t_Distributor/${memberId}`)
        .catch(() => null);
      if (tryPath?.data) return tryPath.data;
      return null;
    } catch {
      return null;
    }
  }

  function normalizeMember(base, dist) {
    const buyerType = dist?.buyerType ?? null; // 1=導遊, 2=廠商
    const isDistributor = !!dist;
    const subType =
      buyerType === 1
        ? "導遊"
        : buyerType === 2
        ? "廠商"
        : base?.memberType === "導遊"
        ? "導遊"
        : base?.memberType === "經銷商"
        ? "廠商"
        : "";

    const discountRate = isDistributor
      ? Number(dist?.discountRate ?? 1)
      : base?.discountRate ?? 1;

    const point = Number(
      base?.cashbackPoint ?? base?.rewardPoints ?? base?.points ?? 0
    );

    const isSelfCredit =
      typeof dist?.isSelfCredit === "boolean"
        ? dist.isSelfCredit
        : typeof dist?.IsSelfCredit === "boolean"
        ? dist.IsSelfCredit
        : false;

    const isGuestCredit =
      typeof dist?.isGuestCredit === "boolean"
        ? dist.isGuestCredit
        : typeof dist?.IsGuestCredit === "boolean"
        ? dist.IsGuestCredit
        : false;

    return {
      ...base,
      id: base?.id ?? base?.memberId,
      memberId: base?.id ?? base?.memberId,
      fullName: base?.fullName ?? base?.name ?? "未命名會員",
      contactPhone: base?.contactPhone ?? base?.phone ?? base?.mobile ?? "",
      memberLevel: base?.memberLevel ?? 0,
      cashbackPoint: point,
      rewardPoints: point,
      isDistributor,
      buyerType,
      subType,
      discountRate: Number(discountRate || 1),
      type: isDistributor ? "VIP" : "一般",
      level: `LV${base?.memberLevel ?? 0}`,
      isSelfCredit,
      isGuestCredit,
      distributorId: dist?.id ?? null,
    };
  }
  // ──────────────────────────────────────────────────────────────

  useEffect(() => {
    onCartSummaryChange?.({ subtotal, usedPoints, finalTotal });
  }, [subtotal, usedPoints, finalTotal, onCartSummaryChange]);

  const handleShowReserved = () => {
    const list = JSON.parse(localStorage.getItem("savedOrders") || "[]");
    setSavedOrders(list.sort((a, b) => b.savedAt - a.savedAt));
    setShowReserved(true);
  };

  const removeItem = (productId) => {
    updateQuantity(productId, 0);
  };

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
        if (!target)
          return Swal.fire({
            title: "錯誤",
            text: "找不到該會員",
            icon: "error",
          });
        handleSwitchByInput(target, () => actuallyRestore(order));
      });
    } else {
      handleSwitchByInput(currentMember, () => actuallyRestore(order));
    }
  };

  const actuallyRestore = async (order) => {
    if ((currentMember?.cashbackPoint || 0) < usedPoints) {
      await Swal.fire({
        title: "點數不足",
        text: "會員點數不足以折抵",
        icon: "warning",
      });
      return;
    }

    const insuff = [];
    order.items.forEach((it) => {
      const key = it.productId ?? it.id;
      const stockLeft =
        stockMap[key] === undefined ? Infinity : Number(stockMap[key] ?? 0);
      const qty = Number(it.quantity ?? 0);
      if (qty > stockLeft) {
        insuff.push({
          name: it.name ?? it.productName ?? `#${key}`,
          want: qty,
          left: isFinite(stockLeft) ? stockLeft : "未知",
          key,
        });
      }
    });

    if (insuff.length > 0) {
      const htmlList = insuff
        .map(
          (x) =>
            `<div style="text-align:left">• ${x.name}：需求 ${x.want}，庫存 ${x.left}</div>`
        )
        .join("");
      const { isConfirmed } = await Swal.fire({
        icon: "warning",
        title: "部分品項庫存不足",
        html:
          `<div style="margin-bottom:.5rem;">仍要取回並繼續結帳嗎？（將標記為「超售」）</div>` +
          htmlList,
        showCancelButton: true,
        confirmButtonText: "繼續取回",
        cancelButtonText: "取消",
      });
      if (!isConfirmed) return;
    }

    order.items.forEach((it) => {
      const key = it.productId ?? it.id;
      const stockLeft =
        stockMap[key] === undefined ? Infinity : Number(stockMap[key] ?? 0);
      const qty = Number(it.quantity ?? 0);
      const isOversell = qty > stockLeft;

      const payload = {
        ...it,
        oversell: isOversell || it.oversell === true,
        inventoryNote: isOversell
          ? `庫存不足（剩餘 ${isFinite(stockLeft) ? stockLeft : "未知"}）`
          : it.inventoryNote,
      };

      updateQuantity(key, qty, true, payload);
    });

    const remain = savedOrders.filter((o) => o.key !== order.key);
    setSavedOrders(remain);
    localStorage.setItem("savedOrders", JSON.stringify(remain));
    setShowReserved(false);

    Swal.fire({
      title: "已取回",
      text: "暫存訂單已加入購物車",
      icon: "success",
    });
  };

  const handleSwitchByInput = async (member, afterSelect) => {
    let normalized = member;
    const needEnrich =
      member?.discountRate == null &&
      member?.buyerType == null &&
      !member?.subType &&
      member?.isDistributor == null;

    if (needEnrich) {
      const dist = await fetchDistributorByMemberId(
        member?.id ?? member?.memberId
      );
      normalized = normalizeMember(member, dist);
    } else {
      normalized = normalizeMember(
        member,
        member?.isDistributor
          ? {
              buyerType: member?.buyerType,
              discountRate: member?.discountRate,
              isSelfCredit: member?.isSelfCredit,
              isGuestCredit: member?.isGuestCredit,
              id: member?.distributorId,
              memberId: member?.id ?? member?.memberId,
            }
          : null
      );
    }

    setCurrentMember(normalized);
    setUsedPoints(0);

    if (normalized.subType === "導遊") {
      Swal.fire({
        title: "<strong>請選擇結帳身份</strong>",
        html: `
        <div style="display: flex; gap: 1rem; justify-content: center; margin-top:1rem;">
          <div id="guideSelf" style="flex:1;cursor:pointer;padding: 1.5rem;border: 1px solid #ddd;border-radius: 8px;background: #f9f9f9;font-size: 1.5rem;font-weight: 600;text-align: center;">
            導遊本人結帳<br/><span style="font-size:1.1rem; color:#28a745">（經銷價）</span>
          </div>
          <div id="customer" style="flex:1;cursor:pointer;padding: 1.5rem;border: 1px solid #ddd;border-radius: 8px;background: #f9f9f9;font-size: 1.5rem;font-weight: 600;text-align: center;">
            客人結帳<br/><span style="font-size:1.1rem; color:#007bff">（門市價／原價）</span>
          </div>
        </div>`,
        showCancelButton: true,
        cancelButtonText: `<div style="font-size:1.2rem; padding:0.5rem 1rem;">取消</div>`,
        showConfirmButton: false,
        didOpen: () => {
          const popup = Swal.getPopup();
          popup?.querySelector("#guideSelf")?.addEventListener("click", () => {
            Swal.close();
            setIsGuideSelf(true);
            localStorage.setItem("checkout_payer", "guide");
            const updatedMember = { ...normalized };
            setCurrentMember(updatedMember);
            if (afterSelect) afterSelect();
          });

          popup?.querySelector("#customer")?.addEventListener("click", () => {
            Swal.close();
            setIsGuideSelf(false);
            localStorage.setItem("checkout_payer", "customer");
            const updatedMember = { ...normalized };
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

  const creditAllowed = currentMember?.isDistributor
    ? isGuideSelf
      ? !!currentMember?.isSelfCredit
      : !!currentMember?.isGuestCredit
    : false;

  // ─────────────── 美化：頂部會員資訊卡 ───────────────
  const memberName = currentMember?.fullName || "尚未登入會員";
  const memberType = currentMember?.memberType ?? currentMember?.type ?? "";
  const memberLevel =
    currentMember?.levelName ??
    currentMember?.levelCode ??
    currentMember?.level ??
    "";
  const points = Number(currentMember?.cashbackPoint ?? 0);

  return (
    <div className="cart">
      <div className="w-100">
        {/* 操作按鈕列 */}
        <div className="top-actions mb-3 px-4">
          <button className="grayButton me-4" onClick={handleTempSave}>
            <FaRegEdit className="me-1" /> 暫存訂單
          </button>
          <button className="pinkButton" onClick={handleShowReserved}>
            <FaCheckCircle className="me-1" /> 已保留訂單
          </button>
        </div>

        {/* 會員資訊卡（美化） */}
        <div
          className="px-3 py-3"
          style={{
            borderRadius: 12,
            background:
              "linear-gradient(135deg, rgba(53,122,189,0.12), rgba(232,62,143,0.08))",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            margin: "0 8px",
          }}
        >
          <div className="d-flex align-items-center">
            {/* Avatar 圓形 */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #357ABD 0%, #6f9ed1 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 18,
                marginRight: 12,
                boxShadow: "0 4px 10px rgba(53,122,189,0.25)",
              }}
            >
              <FaUser />
            </div>

            {/* 姓名 + 標籤 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="text-truncate"
                style={{
                  fontWeight: 800,
                  fontSize: "1.15rem",
                  color: "#2f3b4a",
                }}
                title={memberName}
              >
                {memberName}
              </div>

              {currentMember ? (
                <div
                  className="d-flex align-items-center flex-wrap"
                  style={{ gap: 8, marginTop: 4 }}
                >
                  {memberType && (
                    <span
                      className="badge"
                      style={{
                        background: "#eef5ff",
                        color: "#2a5fb9",
                        border: "1px solid #d6e6ff",
                        fontWeight: 700,
                      }}
                    >
                      <FaGem className="me-1" /> {memberType}
                    </span>
                  )}
                  {memberLevel && (
                    <span
                      className="badge"
                      style={{
                        background: "#fff3f8",
                        color: "#d63384",
                        border: "1px solid #ffd6e9",
                        fontWeight: 700,
                      }}
                    >
                      <FaMedal className="me-1" /> {memberLevel}
                    </span>
                  )}
                  <span
                    className="badge"
                    style={{
                      background: "#f8fff3",
                      color: "#2b8a3e",
                      border: "1px solid #d7f2dc",
                      fontWeight: 700,
                    }}
                    title="可折抵點數"
                  >
                    <FaTicketAlt className="me-1" /> 點數 {points}
                  </span>
                </div>
              ) : (
                <div className="text-muted small">尚未登入會員</div>
              )}
            </div>

            {/* 右側：切換/身份切換 */}
            <div className="d-flex align-items-center">
              <button
                className="change-button ms-2"
                onClick={() => setShowModal(true)}
                title="切換會員"
              >
                {/* <FaSyncAlt className="me-1" />  */}
                切換會員
              </button>

              {currentMember?.subType === "導遊" && (
                <button
                  className="btn btn-outline-secondary ms-2"
                  onClick={() => handleSwitchByInput(currentMember)}
                  title="切換導遊本人/客人結帳"
                >
                  <FaExchangeAlt className="me-1" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 購物車明細 */}
        <div className="no-scrollbar mt-3" style={{ height: "43vh" }}>
          <CartTable
            items={items}
            updateQuantity={updateQuantity}
            currentMember={currentMember}
            removeItem={removeItem}
          />
        </div>
      </div>

      {/* 計價區 */}
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
              style={{ width: "110px", color: "#C75D00", fontWeight: 700 }}
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
        onSelect={handleSwitchByInput}
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
