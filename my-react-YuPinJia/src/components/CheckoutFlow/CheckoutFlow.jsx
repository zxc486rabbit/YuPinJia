import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import CheckoutSummary from "./components/CheckoutSummary";
import DeliverySelector from "./components/DeliverySelector";
import PaymentInvoice from "./components/PaymentInvoice";
import PrintingOverlay from "./components/PrintingOverlay";
import SignatureModal from "./components/SignatureModal";
import { useEmployee } from "../../utils/EmployeeContext";
import { customerBus } from "../../utils/customerBus";

import styles from "./styles";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

// 配送方式（含司機配送）
const DELIVERY_CODE = {
  現場帶走: 0,
  機場提貨: 1,
  碼頭提貨: 2,
  宅配到府: 3,
  店到店: 4,
  訂單自取: 5,
  司機配送: 6,
};
const toDeliveryCode = (label) => DELIVERY_CODE[label] ?? 0;

const PAYMENT_CODE = { 現金: 0, 匯款: 1, 支票: 2, 刷卡: 3 };
const toPaymentCode = (label) => PAYMENT_CODE[label] ?? 0;

const toDateOnly = (d) => {
  const dt = d ? new Date(d) : new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const toIsoLocal = (d) => {
  const dt = d ? new Date(d) : new Date();
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString();
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const pickPriceGeneral = (p) => {
  const candidates = [
    { value: num(p.distributorPrice) },
    { value: num(p.levelPrice) },
    { value: num(p.storePrice) },
    { value: num(p.price) },
  ];
  const first =
    candidates.find((c) => c.value > 0) || candidates[candidates.length - 1];
  return first.value;
};
const pickPriceStoreOnly = (p) => {
  const candidates = [{ value: num(p.storePrice) }, { value: num(p.price) }];
  const first =
    candidates.find((c) => c.value > 0) || candidates[candidates.length - 1];
  return first.value;
};

const getCreditAllowed = (member, isGuideSelf) => {
  // 先讀布林旗標（兼容大小寫）
  const selfCredit = !!(member?.isSelfCredit ?? member?.IsSelfCredit);
  const guestCredit = !!(member?.isGuestCredit ?? member?.IsGuestCredit);

  // 推導身份：優先 subType，其次 buyerType (1=導遊 2=廠商)，最後 memberType 字串
  const bt = Number(member?.buyerType);
  const mt = member?.memberType; // 可能是 "導遊" / "經銷商" / "一般會員"
  const sub =
    member?.subType ??
    (bt === 1 ? "導遊" : bt === 2 ? "廠商" : "") ??
    (mt === "導遊" ? "導遊" : mt === "經銷商" ? "廠商" : "");

  if (sub === "導遊") return isGuideSelf ? selfCredit : guestCredit;
  if (sub === "廠商") return selfCredit;
  return false;
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
  const storeNameFromUser = employeeUser.storeName || "本店";

  const [step, setStep] = useState(1);
  const [showSignature, setShowSignature] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [pendingItems, setPendingItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

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
  const [pickupTime, setPickupTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [note, setNote] = useState("");

  const [cashReceived, setCashReceived] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [creditCardInfo, setCreditCardInfo] = useState("");
  const [openInvoiceNow, setOpenInvoiceNow] = useState(true);
  const [checkoutTime, setCheckoutTime] = useState(null);

  const [isGuideSelf, setIsGuideSelf] = useState(false);

  const [bankCode, setBankCode] = useState("");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [payerName, setPayerName] = useState(
    currentMember.fullName || currentMember.name || ""
  );
  const [checkDate, setCheckDate] = useState(toDateOnly(new Date()));

  const [senderName, setSenderName] = useState(storeNameFromUser);
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [receiverName, setReceiverName] = useState(
    currentMember.fullName || currentMember.name || ""
  );
  const [receiverPhone, setReceiverPhone] = useState(
    currentMember.contactPhone || ""
  );
  const [receiverAddress, setReceiverAddress] = useState(
    currentMember.contactAddress || ""
  );

  const deliveryOptions = [
    { label: "現場帶走", icon: null },
    { label: "機場提貨", icon: null },
    { label: "碼頭提貨", icon: null },
    { label: "宅配到府", icon: null },
    { label: "店到店", icon: null },
    { label: "訂單自取", icon: null },
    { label: "司機配送", icon: null },
  ];

  const paymentOptions = ["現金", "匯款", "支票", "刷卡"];
  const carrierOptions = ["紙本發票", "手機載具", "自然人憑證", "統一編號"];

  const needExtraInfo = [
    "店到店",
    "機場提貨",
    "碼頭提貨",
    "宅配到府",
    "訂單自取",
    "司機配送",
  ].includes(delivery);

  const extFinal = Number(initialFinalTotal);
  const useExternalTotals = Number.isFinite(extFinal);

  const discountRate = Number(currentMember?.discountRate ?? 1);
  const totalOriginal = cartItems.reduce(
    (sum, i) => sum + Number(i.unitPrice ?? 0) * Number(i.quantity ?? 1),
    0
  );
  const couponDiscount = Number(usedPoints ?? 0);

  const calcDiscountPrice = (p) => Math.round(Number(p) * (discountRate || 1));
  const showDiscount = discountRate < 1;
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

  const creditAllowed = getCreditAllowed(currentMember, isGuideSelf);
  const handlePaymentMethodChange = (method) => setPayment(method);

  const isGuideAccount =
    currentMember?.subType === "導遊" || currentMember?.buyerType === 1;
  const shouldComputeCashback = isGuideAccount && !isGuideSelf;

  const calcCashbackTotal = () => {
    if (!shouldComputeCashback) return 0;
    let sum = 0;
    for (const item of cartItems) {
      if (item.isGift) continue;
      const qty = Number(item.quantity ?? 1);
      const storePrice = num(item.__storePrice ?? pickPriceStoreOnly(item));
      const dealerPrice = num(item.__dealerPrice ?? pickPriceGeneral(item));
      const diff = Math.max(storePrice - dealerPrice, 0);
      sum += diff * qty;
    }
    return Math.round(sum);
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function extractOrderIdFromResponse(res, orderNumber) {
    let newOrderId = 0;
    try {
      const data = await res.clone().json();
      if (typeof data === "number") newOrderId = Number(data);
      else if (Array.isArray(data) && data[0]?.id)
        newOrderId = Number(data[0].id);
      else if (data && typeof data === "object")
        newOrderId = Number(
          data.id ?? data.Id ?? data.orderId ?? data.OrderId ?? 0
        );
    } catch {}
    if (!newOrderId) {
      try {
        const txt = await res.clone().text();
        const m = txt && txt.match(/"id"\s*:\s*(\d+)/i);
        if (m) newOrderId = Number(m[1]);
        else if (/^\d+$/.test(txt.trim())) newOrderId = Number(txt.trim());
      } catch {}
    }
    if (!newOrderId) {
      const loc = res.headers.get("Location") || res.headers.get("location");
      const m = loc && loc.match(/\/t_SalesOrder\/(\d+)\b/i);
      if (m) newOrderId = Number(m[1]);
    }
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

  const submitOrder = async (orderPayload, updatedCartItems) => {
    try {
      setSubmitting(true);

      const now = new Date();
      const checkoutTimeIso = toIsoLocal(now);
      let effectiveCheckoutTime = checkoutTimeIso;

      const payloadToPost = {
        id: 0,
        ...orderPayload,
        checkoutTime: checkoutTimeIso,
      };
      const res = await fetch(`${API_BASE}/t_SalesOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToPost),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`儲存訂單失敗 (${res.status}) ${t}`);
      }

      let serverCheckoutTime = checkoutTimeIso;
      try {
        const data = await res.clone().json();
        if (data?.checkoutTime) serverCheckoutTime = data.checkoutTime;
      } catch {}
      setCheckoutTime(serverCheckoutTime);
      effectiveCheckoutTime = serverCheckoutTime;

      const newOrderId = await extractOrderIdFromResponse(
        res,
        orderPayload.orderNumber
      );
      if (!newOrderId)
        throw new Error("建立訂單成功，但無法取得新單 id（無法新增明細）。");

      for (const item of updatedCartItems) {
        const isGiftLine = !!item.isGift;
        // PATCH: 明細欄位對應
        const unitPriceForAPI = Math.round(Number(item.__orig || 0)); // 商品原價（單價）
        const subtotalForAPI = Math.round(
          Number(item.__chosenUnit || 0) * Number(item.__qty || 0) // 售價*數量
        );
        const discountedForAPI = Math.round(
          isGiftLine
            ? Number(item.__orig || 0) * Number(item.__qty || 0) // 贈送=原價*數量
            : Number(item.__lineDiscount || 0) // 一般= (原-售)*數量
        );

        const payload = {
          salesOrderId: newOrderId,
          productId: item.__productId,
          productName: item.__name,
          shippingLocation: "",
          quantity: item.__qty,
          unitPrice: unitPriceForAPI,
          subtotal: subtotalForAPI,
          discountedAmount: discountedForAPI,
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

      setSubmitting(false);
      setPrinting(true);
      setTimeout(() => {
        setPrinting(false);
        customerBus.checkoutDone();

        try {
          const memberIdForRefresh = Number(currentMember?.id ?? 0);
          if (memberIdForRefresh) {
            localStorage.setItem(
              "member_points_refresh_id",
              String(memberIdForRefresh)
            );
          }
          localStorage.setItem("checkout_done", String(Date.now()));
          // ★ 結帳完成，清除購物車草稿旗標，避免回首頁時被誤還原
          localStorage.removeItem("restoreCartFlag");
          localStorage.removeItem("cartDraft");

          if ("BroadcastChannel" in window) {
            const ch = new BroadcastChannel("pos-events");
            ch.postMessage({
              type: "checkout_done",
              when: Date.now(),
              memberId: memberIdForRefresh || null,
            });
          }
        } catch {}

        // ★ 重要：回首頁前把目前選擇「再寫一次」到 localStorage
        try {
          localStorage.setItem(
            "checkout_payer",
            isGuideSelf ? "guide" : "customer"
          );
        } catch {}

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
          checkoutTime: effectiveCheckoutTime,
        });
        navigate("/");
      }, 800);
    } catch (err) {
      setSubmitting(false);
      setPrinting(false);
      alert("訂單儲存失敗：" + err.message);
    }
  };

  const handleFinish = async () => {
    if (submitting) return;

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

    const updatedCartItems = cartItems.map((item) => {
      const qty = Number(item.quantity ?? 1);
      const productId =
        Number(item.productId ?? item.pid ?? item.product?.id ?? item.id) || 0;
      const name = item.productName ?? item.name ?? "";
      // PATCH: 原價（unitPrice 欄位要存這個）
      const origUnit = Number(
        item.originalPrice ?? item.price ?? item.msrp ?? 0
      );
      const isGift = !!item.isGift;
      // PATCH: 售價（依層級決定；贈送=0），優先使用 item.unitPrice / calculatedPrice
      const chosenUnit = isGift
        ? 0
        : Number(
            item.unitPrice ??
              item.calculatedPrice ??
              item.storePrice ??
              item.price ??
              0
          );
      // 該品項「本身折多少」 = (原價 - 售價) * 數量；贈送=原價*數量
      const perUnitDiscount = Math.max(0, origUnit - chosenUnit);
      const lineDiscount = Math.round(
        (isGift ? origUnit : perUnitDiscount) * qty
      );
      return {
        ...item,
        __qty: qty,
        __productId: productId,
        __name: name,
        __orig: origUnit,
        __chosenUnit: chosenUnit,
        __lineDiscount: lineDiscount,
        isGift,
      };
    });

    // PATCH: originalAmount = 各明細 subtotal(= 售價*數量) 的總和
    const orderOriginalAmount = updatedCartItems.reduce(
      (s, i) =>
        s + Math.round(Number(i.__chosenUnit || 0) * Number(i.__qty || 0)),
      0
    );
    // PATCH: 目前組合優惠未上線，主表 DiscountAmount 固定 0（單品折讓放到明細 discountedAmount）
    const orderDiscountAmount = 0;

    const total = Number(finalTotal) || 0;
    const received =
      Number(
        payment === "匯款" || payment === "支票"
          ? paymentAmount
          : payment === "刷卡"
          ? total // ← 選刷卡會把實收直接設成 total（= 全額）
          : cashReceived
      ) || 0;

    const creditAmountValue = Math.max(0, total - received);
    const paymentAmountValue = Math.min(received, total);

    if (
      !getCreditAllowed(currentMember, isGuideSelf) &&
      creditAmountValue > 0
    ) {
      await Swal.fire({
        icon: "warning",
        title: "此身份不可賒帳",
        text: "請確認實收金額已全額付清。",
        confirmButtonText: "了解",
      });
      return;
    }

    let orderStatus = creditAmountValue > 0 ? 1 : 2;
    if (delivery === "現場帶走" && orderStatus === 2) orderStatus = 5;

    const deliveryCode = toDeliveryCode(delivery);
    const orderDate = toDateOnly(new Date());
    const paymentMethodCode = toPaymentCode(payment);

    let paymentDateIso = undefined;
    if (payment === "匯款") {
      if (creditAmountValue === 0) paymentDateIso = toIsoLocal(new Date());
    } else if (payment === "支票") {
      paymentDateIso = toIsoLocal(`${checkDate}T00:00:00`);
    }

    const cashbackTotal = calcCashbackTotal();

    const shippingAddressValue =
      delivery === "宅配到府" || delivery === "司機配送"
        ? receiverAddress || ""
        : "";

    const pickupInfoParts = [];
    if (delivery === "訂單自取") {
      pickupInfoParts.push(
        pickupLocation ? `自取門市:${pickupLocation}` : "自取"
      );
      if (pickupTime) pickupInfoParts.push(`時間:${pickupTime}`);
    }
    if (delivery === "店到店") {
      if (pickupTime) pickupInfoParts.push(`時間:${pickupTime}`);
      if (pickupLocation) pickupInfoParts.push(`店到店備註:${pickupLocation}`);
      pickupInfoParts.push("店家自行寄貨");
    }
    if (delivery === "司機配送") {
      if (pickupTime) pickupInfoParts.push(`時間:${pickupTime}`);
      if (pickupLocation) pickupInfoParts.push(`司機/物流:${pickupLocation}`);
      pickupInfoParts.push(
        `聯絡人:${customerName || ""} ${customerPhone || ""}`.trim()
      );
      if (receiverAddress) pickupInfoParts.push(`地址:${receiverAddress}`);
    }
    if (delivery === "宅配到府") {
      pickupInfoParts.push(
        `寄件人:${senderName || "本店"} ${senderPhone || ""} ${
          senderAddress || ""
        }`.trim()
      );
      pickupInfoParts.push(
        `收件人:${receiverName || ""} ${receiverPhone || ""} ${
          receiverAddress || ""
        }`.trim()
      );
    }
    const pickupInfoStr = pickupInfoParts.filter(Boolean).join(" | ");

    const orderPayloadBase = {
      orderNumber: "SO" + Date.now(),
      storeId: storeIdFromUser || 1,
      memberId: Number(currentMember?.id ?? 0),

      orderDate,
      originalAmount: Math.round(orderOriginalAmount),
      totalAmount: total,
      discountAmount: Math.round(orderDiscountAmount), // 目前=0
      offsetAmount: Math.max(0, Number(usedPoints) || 0), // 建議改成 safeUsedPoints（若你已套 clamp）
      paymentAmount: paymentAmountValue,
      creditAmount: creditAmountValue,
      cashbackPoint: cashbackTotal,
      totalQuantity: updatedCartItems.reduce((sum, i) => sum + i.__qty, 0),
      status: orderStatus,

      unifiedBusinessNumber: invoiceTaxId || "",
      invoiceNumber: "",
      note: note,

      deliveryMethod: deliveryCode,
      dealerMemberId: 0,
      paymentMethod: paymentMethodCode,

      bankCode: payment === "匯款" ? Number(bankCode || 0) : 0,
      paymentAccount:
        payment === "匯款" || payment === "支票" ? paymentAccount || "" : "",
      payerName: payerName || customerName || "",
      paymentDate: paymentDateIso,

      carrierNumber: carrier || "",
      staffId: Number(currentUser?.user?.staffId ?? 0),
      operatorName: operatorNameFromUser,

      pickupInfo: pickupInfoStr,
      mobile:
        delivery === "宅配到府" ? receiverPhone || "" : customerPhone || "",
      shippingAddress: shippingAddressValue,

      signature: "",
      invoiceIssued: !!openInvoiceNow,
      payerIdentity: isGuideSelf ? 0 : 1,
    };

    if (creditAmountValue > 0) {
      setPendingOrder(orderPayloadBase);
      setPendingItems(updatedCartItems);
      setShowSignature(true);
      return;
    }

    await submitOrder(orderPayloadBase, updatedCartItems);
  };

  useEffect(() => {
    const name = currentMember.fullName || currentMember.name || "";
    setCustomerName(name);
    setCustomerPhone(
      currentMember.contactPhone ||
        currentMember.phone ||
        currentMember.mobile ||
        ""
    );
    if (!payerName) setPayerName(name || "");
  }, [currentMember]); // eslint-disable-line

  useEffect(() => {
    try {
      const raw = localStorage.getItem("checkoutData");
      const payer = raw ? JSON.parse(raw)?.checkoutPayer : null;
      const fallback = localStorage.getItem("checkout_payer");
      const resolved =
        payer === "GUIDE_SELF"
          ? true
          : payer === "CUSTOMER"
          ? false
          : fallback === "guide"
          ? true
          : false;

      setIsGuideSelf(resolved);
    } catch {
      const fallback = localStorage.getItem("checkout_payer");
      setIsGuideSelf(fallback === "guide");
    }
  }, []);

  // 🔎 Debug：觀察導遊本人/客人旗標 & 會員物件
  useEffect(() => {
    console.log("isGuideSelf =", isGuideSelf, "member =", currentMember);
  }, [isGuideSelf, currentMember]);

  return (
    <div style={styles.container}>
      {step === 1 && (
        <CheckoutSummary
          cartItems={cartItems}
          hasDiscount={discountRate < 1}
          calcDiscountPrice={(p) => Math.round(Number(p) * (discountRate || 1))}
          totalOriginal={totalOriginal}
          discountAmount={discountAmount}
          usedPoints={usedPoints}
          finalTotal={finalTotal}
          onBackToCart={() => navigate("/")} // ★ 新增：返回首頁購物車
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
          memberAddress={currentMember?.contactAddress || ""}
          senderName={senderName}
          setSenderName={setSenderName}
          senderPhone={senderPhone}
          setSenderPhone={setSenderPhone}
          senderAddress={senderAddress}
          setSenderAddress={setSenderAddress}
          receiverName={receiverName}
          setReceiverName={setReceiverName}
          receiverPhone={receiverPhone}
          setReceiverPhone={setReceiverPhone}
          receiverAddress={receiverAddress}
          setReceiverAddress={setReceiverAddress}
          defaultSenderName={storeNameFromUser}
          defaultSenderPhone={""}
          onBack={() => setStep(1)}
          onNext={() => {
            setPayment(payment || "現金");
            setStep(3);
          }}
          styles={styles}
        />
      )}

      {step === 3 && (
        <>
          {/* {!getCreditAllowed(currentMember, isGuideSelf) && (
            <div
              style={{
                background: "#fff3cd",
                border: "1px solid #ffeeba",
                color: "#856404",
                padding: "8px 12px",
                borderRadius: 8,
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              此身份 <b>不可賒帳</b>，請確認實收金額已全額付清。
            </div>
          )} */}

          <PaymentInvoice
            finalTotal={finalTotal}
            payment={payment}
            setPayment={setPayment}
            paymentOptions={["現金", "匯款", "支票", "刷卡"]}
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
            carrierOptions={["紙本發票", "手機載具", "自然人憑證", "統一編號"]}
            bankCode={bankCode}
            setBankCode={setBankCode}
            paymentAccount={paymentAccount}
            setPaymentAccount={setPaymentAccount}
            payerName={payerName}
            setPayerName={setPayerName}
            checkDate={checkDate}
            setCheckDate={setCheckDate}
            creditAllowed={getCreditAllowed(currentMember, isGuideSelf)}
            onBack={() => setStep(2)}
            onFinish={handleFinish}
            styles={styles}
          />
        </>
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
            const payload = { ...pendingOrder };
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
              payload.signature = b64;
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
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .checkout-loading{
            position:fixed; inset:0; z-index:9999;
            background:rgba(0,0,0,.35);
            display:flex; align-items:center; justify-content:center;
            backdrop-filter:saturate(120%) blur(1px);
          }
          .loading-card{
            background:rgba(255,255,255,.95);
            border-radius:16px; padding:20px 28px; min-width:260px;
            box-shadow:0 8px 30px rgba(0,0,0,.15);
            display:flex; flex-direction:column; align-items:center;
          }
          .loader{
            width:40px; height:40px; border-radius:50%;
            border:4px solid rgba(0,0,0,.15); border-top-color:#000;
            animation:spin .9s linear infinite;
          }
          .loading-text{ margin-top:12px; font-weight:600; }
          .loading-sub{ margin-top:4px; font-size:12px; color:#666; }
        `}
      </style>
    </div>
  );
}
