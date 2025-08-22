// ./CheckoutFlow.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

// 子元件
import CheckoutSummary from "./components/CheckoutSummary";
import DeliverySelector from "./components/DeliverySelector";
import PaymentInvoice from "./components/PaymentInvoice";
import PrintingOverlay from "./components/PrintingOverlay";
import SignatureModal from "./components/SignatureModal";
import { useEmployee } from "../../utils/EmployeeContext";

// 樣式
import styles from "./styles";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

// ===== 配送/付款 雙向碼表 =====
const DELIVERY_CODE = {
  現場帶走: 0,
  機場提貨: 1,
  碼頭提貨: 2,
  宅配到府: 3,
  店到店: 4, // 依後端實際碼表調整
  訂單自取: 5, // ★ 關鍵：訂單自取=5（對應 PendingOrder）
};
const CODE_TO_DELIVERY = Object.fromEntries(
  Object.entries(DELIVERY_CODE).map(([k, v]) => [v, k])
);
const toDeliveryCode = (label) => DELIVERY_CODE[label] ?? 0;

const PAYMENT_CODE = { 現金: 0, 匯款: 1, 支票: 2, 刷卡: 3 };
const CODE_TO_PAYMENT = { 0: "現金", 1: "匯款", 2: "支票", 3: "刷卡" };
const toPaymentCode = (label) => PAYMENT_CODE[label] ?? 0;

// 後端要 YYYY-MM-DD
const toDateOnly = (d) => {
  const dt = d ? new Date(d) : new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function CheckoutFlow({
  onComplete,
  cartItems = [],
  currentMember = {},
  usedPoints = 0,
  initialSubtotal,
  initialFinalTotal,
}) {
  const navigate = useNavigate();
  const { currentUser, refreshUserInfo } = useEmployee() || {};
  const employeeUser = currentUser?.user || {};

  const operatorNameFromUser =
    employeeUser.chineseName || employeeUser.account || "操作員";
  const staffIdFromUser = Number(employeeUser.staffId ?? 0);
  const storeIdFromUser = Number(employeeUser.storeId ?? 0);

  // Steps / 狀態
  const [step, setStep] = useState(1);
  const [showSignature, setShowSignature] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // 表單
  const [delivery, setDelivery] = useState("");
  const [lockDelivery, setLockDelivery] = useState(false);
  const [payment, setPayment] = useState("");
  const [carrier, setCarrier] = useState("");
  const [printing, setPrinting] = useState(false);
  const [invoiceTaxId, setInvoiceTaxId] = useState("");

  const [customerName, setCustomerName] = useState(currentMember.name || "");
  const [customerPhone, setCustomerPhone] = useState(
    currentMember.contactPhone || ""
  );
  const [pickupLocation, setPickupLocation] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(""); // 匯款/支票金額
  const [creditCardInfo, setCreditCardInfo] = useState(""); // 刷卡資訊
  const [openInvoiceNow, setOpenInvoiceNow] = useState(true);
  const [pickupTime, setPickupTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [note, setNote] = useState("");
  // 新增：用來存最後的結帳時間（以伺服器回傳優先，否則用前端時間）
  const [checkoutTime, setCheckoutTime] = useState(null);

  // 角色
  const [isGuideSelf, setIsGuideSelf] = useState(false);
  const [checkoutPayer, setCheckoutPayer] = useState("CUSTOMER");

  // 待取來源識別
  const [isFromPickup, setIsFromPickup] = useState(false);
  const [pickupSalesOrderId, setPickupSalesOrderId] = useState(null);
  const [originalOrderNumber, setOriginalOrderNumber] = useState("");
  const [originalDeliveryCode, setOriginalDeliveryCode] = useState(5); // 預設自取=5

  const deliveryOptions = [
    { label: "現場帶走", icon: null },
    { label: "機場提貨", icon: null },
    { label: "碼頭提貨", icon: null },
    { label: "宅配到府", icon: null },
    { label: "店到店", icon: null },
    { label: "訂單自取", icon: null },
  ];

  const paymentOptions = ["現金", "匯款", "支票", "刷卡"];
  const carrierOptions = ["紙本發票", "手機載具", "自然人憑證", "統一編號"];

  const needExtraInfo = [
    "店到店",
    "機場提貨",
    "碼頭提貨",
    "宅配到府",
    "訂單自取",
  ].includes(delivery);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function extractOrderIdFromResponse(res, orderNumber) {
    let newOrderId = 0;

    // 優先試：JSON 物件 / 純數字 / 陣列
    try {
      const data = await res.clone().json();
      if (typeof data === "number") {
        newOrderId = Number(data);
      } else if (Array.isArray(data) && data[0]?.id) {
        newOrderId = Number(data[0].id);
      } else if (data && typeof data === "object") {
        newOrderId = Number(
          data.id ?? data.Id ?? data.orderId ?? data.OrderId ?? 0
        );
      }
    } catch {
      /* 不是 JSON 沒關係，往下走 */
    }

    // 再試：純文字裡面擷取 "id": 123
    if (!newOrderId) {
      try {
        const txt = await res.clone().text();
        const m = txt && txt.match(/"id"\s*:\s*(\d+)/i); // 或者回傳 "Id": 123
        if (m) newOrderId = Number(m[1]);
        else if (/^\d+$/.test(txt.trim())) newOrderId = Number(txt.trim());
      } catch {}
    }

    // 再試：Location / location header
    if (!newOrderId) {
      const loc = res.headers.get("Location") || res.headers.get("location");
      const m = loc && loc.match(/\/t_SalesOrder\/(\d+)\b/i);
      if (m) newOrderId = Number(m[1]);
    }

    // 最後招：用 orderNumber 去 PendingOrder 回抓（重試 2 次，避免延遲）
    if (!newOrderId && orderNumber) {
      for (let i = 0; i < 2 && !newOrderId; i++) {
        try {
          const r2 = await fetch(`${API_BASE}/t_SalesOrder/PendingOrder`);
          if (r2.ok) {
            const list = await r2.json();
            const hit = Array.isArray(list)
              ? list.find((o) => String(o.orderNumber) === String(orderNumber))
              : null;
            if (hit?.id) newOrderId = Number(hit.id);
          }
        } catch {}
        if (!newOrderId) await sleep(300);
      }
    }

    return newOrderId;
  }

  // ===== 顯示金額 =====
  const extFinal = Number(initialFinalTotal);
  const useExternalTotals = Number.isFinite(extFinal);

  // 折扣倍率：以 member.discountRate 為主（沒有就 1）
  const discountRate = Number(
    currentMember?.discountRate ?? (isGuideSelf ? 0.9 : 1)
  );

  const totalOriginal = cartItems.reduce(
    (sum, i) => sum + Number(i.unitPrice ?? 0) * Number(i.quantity ?? 1),
    0
  );

  // 點數折抵金額（若有）
  const offsetAmount = Math.max(0, Number(usedPoints) || 0);

  const calcDiscountPrice = (price) =>
    Math.round(Number(price) * (discountRate || 1));

  const couponDiscount = Number(usedPoints ?? 0);
  const showDiscount =
    discountRate < 1 ||
    (useExternalTotals &&
      extFinal < Math.max(0, totalOriginal - couponDiscount));

  const totalDiscounted = showDiscount
    ? cartItems.reduce(
        (sum, i) =>
          sum +
          calcDiscountPrice(Number(i.unitPrice ?? 0)) * Number(i.quantity ?? 1),
        0
      )
    : totalOriginal;

  const computedFinalTotal = Math.max(0, totalDiscounted - couponDiscount);

  const finalTotal = useExternalTotals ? extFinal : computedFinalTotal;

  const discountAmount = totalOriginal - totalDiscounted;

  // ===== 付款方式選擇 =====
  const handlePaymentMethodChange = (method) => {
    setPayment(method);
  };

  // ===== 送主檔（待取=PUT；一般=POST）+ 新增明細 =====
  const submitOrder = async (orderPayload, updatedCartItems) => {
    console.log("[Order payload]", orderPayload);
    try {
      setSubmitting(true);

      // ★★★ 結帳時間：此刻才算「確認結帳」 ★★★
      const now = new Date();
      const checkoutTimeIso = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
      ).toISOString();
      let effectiveCheckoutTime = checkoutTimeIso; // ← 之後都用它回傳

      // ====== 待取訂單：更新主檔 (PUT) ======
      if (isFromPickup) {
        const targetId = Number(pickupSalesOrderId);
        if (!targetId) throw new Error("缺少待取訂單 ID。");

        // 先嘗試從 localStorage 取得原單資訊
        let orig = null;
        try {
          const raw = localStorage.getItem("checkoutData");
          if (raw) orig = JSON.parse(raw);
        } catch {}

        // 若還拿不到 memberId / storeId，就打 API 撈原單（保險起見）
        if (!orig?.memberId || !orig?.storeId || !orig?.createdAt) {
          try {
            const r = await fetch(`${API_BASE}/t_SalesOrder/${targetId}`);
            if (r.ok) {
              const j = await r.json();
              orig = { ...(orig || {}), ...j };
            }
          } catch {}
        }

        // 安全取值（不能是 0）
        const safeNum = (v, fb = 0) =>
          Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fb;

        const putMemberId = safeNum(
          orderPayload.memberId,
          safeNum(orig?.memberId, 0)
        );
        const putStoreId = safeNum(
          orderPayload.storeId,
          safeNum(orig?.storeId, storeIdFromUser) // 退而求其次用登入者的 storeId
        );
        const putStaffId = safeNum(staffIdFromUser, 0);

        if (!putMemberId)
          throw new Error("無法取得 memberId，請確認原訂單或會員資訊。");
        if (!putStoreId)
          throw new Error("無法取得 storeId，請確認原訂單或門市資訊。");

        // 沿用原單號與原配送碼（自取=5）
        const putOrderNumber =
          orderPayload.orderNumber || orig?.orderNumber || "";
        const putDeliveryCode = Number(
          typeof originalDeliveryCode !== "undefined"
            ? originalDeliveryCode
            : orig?.deliveryMethod ?? 5
        );

        // 付款方式 → 數字碼
        const putPaymentMethod = Number(
          orderPayload.paymentMethod ?? toPaymentCode(payment)
        );

        // 依規則：若已付清且為自取/帶走 → 狀態=5(已完成)
        let putStatus = Number(orderPayload.status ?? 2);
        const paidOff =
          Number(orderPayload.totalAmount || 0) <=
          Number(orderPayload.paymentAmount || 0);
        const isSelfPickup =
          putDeliveryCode === DELIVERY_CODE["訂單自取"] ||
          delivery === "現場帶走";
        if (paidOff && isSelfPickup) {
          putStatus = 5; // 若想維持 2=已付款，將此行改為註解
        }

        // orderDate：沿用原 createdAt 的「日期」（或用今天）
        const putOrderDate = orig?.createdAt
          ? toDateOnly(orig.createdAt)
          : toDateOnly(new Date());

        const payloadToPut = {
          id: targetId, // ★ 必帶且與路由一致
          orderNumber: putOrderNumber, // 沿用
          storeId: putStoreId, // ★ 不能為 0
          memberId: putMemberId, // ★ 不能為 0
          orderDate: putOrderDate,

          originalAmount: Math.round(orderPayload.originalAmount ?? 0),
          totalAmount: Math.round(orderPayload.totalAmount ?? 0),
          discountAmount: Math.round(orderPayload.discountAmount ?? 0),
          offsetAmount: Math.round(orderPayload.offsetAmount ?? 0),
          paymentAmount: Math.round(orderPayload.paymentAmount ?? 0),
          creditAmount: Math.round(orderPayload.creditAmount ?? 0),
          cashbackPoint: Math.round(orderPayload.cashbackPoint ?? 0),
          totalQuantity: Math.round(orderPayload.totalQuantity ?? 0),

          status: putStatus,

          unifiedBusinessNumber: orderPayload.unifiedBusinessNumber || "",
          invoiceNumber: orderPayload.invoiceNumber || "",
          note: orderPayload.note || "",

          deliveryMethod: putDeliveryCode, // ★ 數字碼（自取=5）
          dealerMemberId: orderPayload.dealerMemberId ?? 0,
          paymentMethod: putPaymentMethod, // ★ 數字碼

          carrierNumber: orderPayload.carrierNumber || "",
          staffId: putStaffId, // ★ 不能為 0（若後端要求）
          operatorName: orderPayload.operatorName || operatorNameFromUser || "",

          pickupInfo: orderPayload.pickupInfo || "",
          mobile: orderPayload.mobile || "",
          shippingAddress: orderPayload.shippingAddress || "",
          signature: orderPayload.signature || "",
          signatureMime: orderPayload.signatureMime || "",
          invoiceIssued: !!orderPayload.invoiceIssued,
          payerIdentity: Number(orderPayload.payerIdentity ?? 1),
          // ★ 新增：確認結帳時間（先送前端時間）
          checkoutTime: checkoutTimeIso,
        };

        console.log("[PUT t_SalesOrder/{id}] payload:", payloadToPut);

        const res = await fetch(`${API_BASE}/t_SalesOrder/${targetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadToPut),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`更新訂單失敗 (${res.status}) ${t}`);
        }

        // 盡量取伺服器回傳的 checkoutTime（若有）
        let serverCheckoutTime = checkoutTimeIso;
        try {
          const cloned = res.clone();
          const text = await cloned.text();
          if (text) {
            try {
              const json = JSON.parse(text);
              if (json?.checkoutTime) serverCheckoutTime = json.checkoutTime;
            } catch {}
          }
        } catch {}
        setCheckoutTime(serverCheckoutTime);
        effectiveCheckoutTime = serverCheckoutTime; // ← 記下最終值

        try {
          await refreshUserInfo?.();
        } catch {}
      } else {
        // === 新增主檔：★ 一定送「單一物件」，且帶 id:0 ===
        const payloadToPost = {
          id: 0,
          ...orderPayload,
          checkoutTime: checkoutTimeIso,
        }; // 關鍵
        const res = await fetch(`${API_BASE}/t_SalesOrder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadToPost),
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`儲存訂單失敗 (${res.status}) ${t}`);
        }

        // 先試著讀伺服器回傳的 checkoutTime（若有）
        let serverCheckoutTime = checkoutTimeIso;
        try {
          const data = await res.clone().json();
          if (data?.checkoutTime) serverCheckoutTime = data.checkoutTime;
        } catch {}
        setCheckoutTime(serverCheckoutTime);
        effectiveCheckoutTime = serverCheckoutTime; // ← 記下最終值

        // 仍然需要拿新單 id 來新增明細
        const newOrderId = await extractOrderIdFromResponse(
          res,
          orderPayload.orderNumber
        );
        if (!newOrderId) {
          throw new Error("建立訂單成功，但無法取得新單 id（無法新增明細）。");
        }

        // === 新增明細：用 newOrderId ===
        console.table(
          updatedCartItems.map((i) => ({
            productId: i.__productId,
            name: i.__name,
            qty: i.__qty,
            origUnit: i.__orig,
            discUnit: i.__discUnit,
            lineDiscount: i.__lineDiscount,
            isGift: i.isGift,
          }))
        );

        for (const item of updatedCartItems) {
          const isGiftLine = !!item.isGift;

          // 1) 取得「原價單價」的最穩健做法（多重後援，取第一個 > 0 的值）
          const pickOriginalUnitPrice = (i) => {
            const cands = [
              i.originalPrice, // 建議你在加入購物車時就帶上
              i.priceBeforeDiscount, // 若有這欄位
              i.listPrice, // 若有牌價
              i.price, // 原商品價
              i.unitPrice, // 有些商品物件會用這個欄位
              i.product?.price,
              i.product?.unitPrice,
              i.__orig, // 你前面算的原價單價
            ];
            for (const v of cands) {
              const n = Number(v);
              if (Number.isFinite(n) && n > 0) return n;
            }
            return 0; // 實在找不到才 0
          };

          // 2) 針對「贈品」：强制用「原價」當 unitPrice，subtotal = 原價 * 數量，discountedAmount = 0
          //    針對「非贈品」：維持你既有的邏輯（__orig / __lineDiscount）
          const unitPriceForAPI = isGiftLine
            ? pickOriginalUnitPrice(item)
            : Number(item.__orig || 0);
          const subtotalForAPI = Math.round(
            unitPriceForAPI * Number(item.__qty || 0)
          );
          const discountedForAPI = isGiftLine
            ? 0
            : Math.round(Number(item.__lineDiscount || 0));

          const payload = {
            salesOrderId: newOrderId,
            productId: item.__productId,
            productName: item.__name,
            shippingLocation: pickupLocation || "",
            quantity: item.__qty,
            unitPrice: unitPriceForAPI, // ← 贈品改成「原價」
            subtotal: subtotalForAPI, // ← 贈品 = 原價 * qty
            discountedAmount: discountedForAPI, // ← 贈品固定 0
            status: "正常",
            isGift: isGiftLine,
            staffId: staffIdFromUser || 0,
          };

          const r = await fetch(`${API_BASE}/t_SalesOrderItem`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!r.ok) {
            const t = await r.text().catch(() => "");
            throw new Error(`新增明細失敗 (${r.status}) ${t}`);
          }
        }

        try {
          await refreshUserInfo?.();
        } catch {}
      }

      // 成功 → 列印 & 回首頁
      setSubmitting(false);
      setPrinting(true);
      setTimeout(() => {
        setPrinting(false);
        onComplete?.({
          delivery,
          payment,
          carrier,
          customerName,
          customerPhone,
          pickupLocation,
          pickupTime,
          note,
          usedPoints,
          finalTotal,
          checkoutTime: effectiveCheckoutTime, // ← 用剛剛記下的值
        });
        navigate("/");
      }, 800);
    } catch (err) {
      setSubmitting(false);
      setPrinting(false);
      alert("訂單儲存失敗：" + err.message);
    }
  };

  // ====== 送單 ======
  const handleFinish = async () => {
    if (submitting) return;

    // 匯款/支票防呆
    if (
      (payment === "匯款" || payment === "支票") &&
      Number(paymentAmount) < 0
    ) {
      await Swal.fire({
        icon: "warning",
        title: "金額錯誤",
        text: "金額不可為負數。",
        confirmButtonText: "確定",
      });
      return;
    }

    // ====== 明細：固定存「原價」＋「折扣金額」＋「成交價」 ======
    const _discountRate = Number(currentMember?.discountRate ?? 1);

    // 算成交單價（會員折扣），0.9 之類會四捨五入
    const calcDiscountUnit = (p) =>
      Math.round(Number(p) * (_discountRate || 1));

    const updatedCartItems = cartItems.map((item) => {
      const qty = Number(item.quantity ?? 1);

      // 盡可能找出正確的 productId 與名稱
      const productId =
        Number(
          item.productId ?? item.pid ?? item.product?.id ?? item.id // 最後備援（小心此為 orderItemId）
        ) || 0;

      const name = item.productName ?? item.name ?? "";

      // 原價單價：按來源依序取值
      const origUnit = Number(
        item.unitPrice ?? item.price ?? item.originalPrice ?? 0
      );

      // 是否贈品（如果來源本來就標記 isGift，或原價就是 0）
      const isGift = !!item.isGift || origUnit === 0;

      // 成交單價：贈品=0，否則按會員折扣
      let discUnit = isGift ? 0 : calcDiscountUnit(origUnit);

      // 防呆：若沒有折扣（_discountRate=1），成交價應等於原價
      if (
        !isGift &&
        (_discountRate || 1) === 1 &&
        discUnit === 0 &&
        origUnit > 0
      ) {
        discUnit = origUnit;
      }

      // 單件折讓 = 原價 - 成交價；整列折讓 = 單件折讓 * 數量
      const perUnitDiscount = Math.max(0, origUnit - discUnit);
      const lineDiscount = Math.round(perUnitDiscount * qty);

      return {
        ...item,
        __qty: qty,
        __productId: productId,
        __name: name,
        __orig: origUnit,
        __discUnit: discUnit,
        __lineDiscount: lineDiscount,
        isGift,
      };
    });

    // 用「原價」與「折讓」回推主檔金額
    const orderOriginalAmount = updatedCartItems.reduce(
      (sum, i) => sum + i.__orig * i.__qty,
      0
    );
    const orderDiscountAmount = updatedCartItems.reduce(
      (sum, i) => sum + i.__lineDiscount,
      0
    );

    // 收款判斷（刷卡視為全額）
    const received =
      Number(
        payment === "匯款" || payment === "支票"
          ? paymentAmount
          : payment === "刷卡"
          ? finalTotal
          : cashReceived
      ) || 0;

    const total = Number(finalTotal) || 0;
    const creditAmountValue = Math.max(0, total - received);
    const paymentAmountValue = Math.min(received, total);
    let orderStatus = creditAmountValue > 0 ? 1 : 2; // 1=賒帳, 2=已付款
    if (delivery === "現場帶走" && orderStatus === 2) orderStatus = 5; // 付清帶走→已完成

    // pickupInfo
    const pickupInfoStr = [
      pickupLocation ? `地點:${pickupLocation}` : "",
      pickupTime ? `時間:${pickupTime}` : "",
    ]
      .filter(Boolean)
      .join(", ");

    // 付款/配送碼
    const paymentMethodCode = toPaymentCode(payment);
    const deliveryCode = isFromPickup
      ? Number(originalDeliveryCode ?? 5) // 待取沿用原碼
      : toDeliveryCode(delivery);

    // orderDate（新單給今天；待取沿用原 createdAt 的日期）
    const orderDate = isFromPickup
      ? toDateOnly(
          localStorage.getItem("checkoutData") &&
            JSON.parse(localStorage.getItem("checkoutData")).createdAt
        )
      : toDateOnly(new Date());

    // ★ PUT/POST payload（和後端模型對齊）
    const orderPayloadBase = {
      orderNumber:
        isFromPickup && originalOrderNumber
          ? originalOrderNumber
          : "SO" + Date.now(),

      storeId: storeIdFromUser || 1,
      memberId: Number(currentMember?.id ?? 0),

      orderDate, // 建議補上：YYYY-MM-DD
      originalAmount: Math.round(orderOriginalAmount),
      totalAmount: total,
      discountAmount: Math.round(orderDiscountAmount),
      offsetAmount: Math.max(0, Number(usedPoints) || 0), // 點數折抵
      paymentAmount: paymentAmountValue,
      creditAmount: creditAmountValue,
      cashbackPoint: 0, // 如有贈點規則可在此計算
      totalQuantity: updatedCartItems.reduce((sum, i) => sum + i.__qty, 0),
      status: orderStatus,

      unifiedBusinessNumber: invoiceTaxId || "",
      invoiceNumber: "",
      note: note,

      deliveryMethod: deliveryCode, // ★ 一律送「數字碼」，訂單自取=5
      dealerMemberId: 0,
      paymentMethod: paymentMethodCode, // ★ 一律送「數字碼」

      carrierNumber: carrier || "",
      staffId: staffIdFromUser,
      operatorName: operatorNameFromUser,
      pickupInfo: pickupInfoStr,
      mobile: customerPhone || "",
      shippingAddress: "",
      signature: "",

      invoiceIssued: !!openInvoiceNow,
      payerIdentity: isGuideSelf ? 0 : 1,
      // createdAt 由後端自動生成
    };

    // 賒帳 → 先簽名（可跳過）
    if (creditAmountValue > 0) {
      setPendingOrder(orderPayloadBase);
      setPendingItems(updatedCartItems);
      setShowSignature(true);
      return;
    }

    await submitOrder(orderPayloadBase, updatedCartItems);
  };

  // 同步會員資料
  useEffect(() => {
    setCustomerName(currentMember.fullName || currentMember.name || "");
    setCustomerPhone(
      currentMember.contactPhone ||
        currentMember.phone ||
        currentMember.mobile ||
        ""
    );
  }, [currentMember]);

  // 掛載時讀 localStorage（從待取來的前置）
  useEffect(() => {
    try {
      const raw = localStorage.getItem("checkoutData");
      if (!raw) return;
      const d = JSON.parse(raw);

      if (d.fromPickup || d.delivery === "訂單自取") {
        setLockDelivery(true);
        setDelivery("訂單自取");
        setIsFromPickup(!!d.fromPickup);

        if (d.orderNumber) setOriginalOrderNumber(String(d.orderNumber));

        const idCandidate =
          d.id ?? d.orderId ?? d.pickupSalesOrderId ?? d.salesOrderId;
        if (idCandidate != null && !Number.isNaN(Number(idCandidate))) {
          setPickupSalesOrderId(Number(idCandidate));
        }

        // 保留原 deliveryMethod 數字碼（例如 5）
        if (typeof d.deliveryMethod !== "undefined") {
          setOriginalDeliveryCode(Number(d.deliveryMethod));
        }

        // 預填欄位
        if (d.pickupLocation) setPickupLocation(d.pickupLocation);
        if (d.customerName) setCustomerName(d.customerName);
        if (d.customerPhone) setCustomerPhone(d.customerPhone);

        // 付款方式（字串或由碼轉字串）
        const initPayment =
          d.payment ||
          d.paymentMethodLabel ||
          CODE_TO_PAYMENT[d.paymentMethod] ||
          "現金";
        setPayment(initPayment);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("checkoutData");
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.prefillDelivery && !delivery) setDelivery(d.prefillDelivery);
    } catch {}
  }, []); // 只設初值

  const payerIdentity = isGuideSelf ? 0 : 1;

  return (
    <div style={styles.container}>
      {step === 1 && (
        <CheckoutSummary
          cartItems={cartItems}
          hasDiscount={discountRate < 1 || showDiscount}
          calcDiscountPrice={(p) => Math.round(Number(p) * (discountRate || 1))}
          totalOriginal={totalOriginal}
          discountAmount={discountAmount}
          usedPoints={usedPoints}
          finalTotal={finalTotal}
          onNext={() => {
            setDelivery((prev) =>
              lockDelivery ? "訂單自取" : prev || "現場帶走"
            );
            setStep(2);
          }}
          styles={styles}
        />
      )}

      {step === 2 && (
        <DeliverySelector
          delivery={delivery}
          setDelivery={setDelivery}
          lockDelivery={lockDelivery}
          deliveryOptions={deliveryOptions}
          needExtraInfo={needExtraInfo}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          pickupLocation={pickupLocation}
          setPickupLocation={setPickupLocation}
          pickupTime={pickupTime}
          setPickupTime={setPickupTime}
          note={note}
          setNote={setNote}
          onBack={() => setStep(1)}
          onNext={() => {
            setPayment(payment || "現金");
            setStep(3);
          }}
          styles={styles}
        />
      )}

      {step === 3 && (
        <PaymentInvoice
          finalTotal={finalTotal}
          payment={payment}
          setPayment={setPayment}
          paymentOptions={paymentOptions}
          handlePaymentMethodChange={handlePaymentMethodChange}
          cashReceived={cashReceived}
          setCashReceived={setCashReceived}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          creditCardInfo={creditCardInfo}
          setCreditCardInfo={setCreditCardInfo}
          carrier={carrier}
          openInvoiceNow={openInvoiceNow}
          setOpenInvoiceNow={setOpenInvoiceNow}
          setCarrier={setCarrier}
          invoiceTaxId={invoiceTaxId}
          setInvoiceTaxId={setInvoiceTaxId}
          setCustomerPhone={setCustomerPhone}
          carrierOptions={carrierOptions}
          onBack={() => setStep(2)}
          onFinish={handleFinish}
          styles={styles}
        />
      )}

      {printing && <PrintingOverlay styles={styles} />}
      {submitting && (
        <div className="checkout-loading">
          <div className="loading-card">
            <div className="loader" />
            <div className="loading-text">結帳中…請稍候</div>
            <div className="loading-sub">正在建立訂單與明細</div>
          </div>
        </div>
      )}

      <SignatureModal
        show={showSignature}
        onClose={() => setShowSignature(false)}
        onSkip={async () => {
          setShowSignature(false);
          if (pendingOrder) {
            const payload = { ...pendingOrder }; // 不加簽名
            await submitOrder(payload, pendingItems);
            setPendingOrder(null);
            setPendingItems([]);
          }
        }}
        onConfirm={async (b64) => {
          setShowSignature(false);
          if (pendingOrder) {
            const payload = { ...pendingOrder };
            if (b64) {
              payload.signature = b64; // base64 簽名
              payload.signatureMime = "image/jpeg";
            }
            await submitOrder(payload, pendingItems);
            setPendingOrder(null);
            setPendingItems([]);
          }
        }}
      />

      <style>
        {`
          @keyframes spin {
           0% { transform: rotate(0deg); }
           100% { transform: rotate(360deg); }
         }
         .checkout-loading{
            position:fixed; inset:0; z-index:9999;
            background:rgba(0,0,0,.35);
            display:flex; align-items:center; justify-content:center;
            backdrop-filter:saturate(120%) blur(1px);
          }
          .loading-card{
            background:rgba(255,255,255,.95);
            border-radius:16px;
            padding:20px 28px;
            min-width:260px;
            box-shadow:0 8px 30px rgba(0,0,0,.15);
            display:flex; flex-direction:column; align-items:center;
          }
          .loader{
            width:40px; height:40px;
            border-radius:50%;
            border:4px solid rgba(0,0,0,.15);
            border-top-color:#000;
            animation:spin .9s linear infinite;
          }
          .loading-text{ margin-top:12px; font-weight:600; }
          .loading-sub{ margin-top:4px; font-size:12px; color:#666; }
        `}
      </style>
    </div>
  );
}
