import { useEffect, useMemo, useState } from "react";

export default function PaymentInvoice({
  finalTotal,
  payment,
  setPayment,
  paymentOptions,
  handlePaymentMethodChange,
  cashReceived,
  setCashReceived,
  paymentAmount,
  setPaymentAmount,
  creditCardInfo,
  setCreditCardInfo,
  carrier,
  setCarrier,
  invoiceTaxId,
  setInvoiceTaxId,
  setCustomerPhone,
  carrierOptions = [],
  onBack,
  onFinish,
  styles,
  openInvoiceNow,
  setOpenInvoiceNow,

  // 匯款／支票附加欄位（雙命名支援）
  bankCode,
  setBankCode,
  paymentAccount,
  setPaymentAccount,
  paymentAccountField,
  setPaymentAccountField,
  checkDate,
  setCheckDate,
  paymentDate,
  setPaymentDate,
  payerName,
  setPayerName,
  defaultPayerName = "",
}) {
  /* ---------------------------- Style System ---------------------------- */
  const defaultStyles = {
    viewport: {
      maxHeight: "100dvh",
      overflow: "hidden",
      display: "grid",
      gridTemplateRows: "48px 1fr",
      background: "#F3F4F6",
      fontSize: 12,
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 10px",
      background: "#FFFFFF",
      borderBottom: "1px solid #E5E7EB",
    },
    title: { fontSize: 15, fontWeight: 800, color: "#111827" },
    backBtn: {
      border: "1px solid #E5E7EB",
      background: "#fff",
      padding: "4px 8px",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 12,
    },

    body: {
      display: "grid",
      gridTemplateColumns: "minmax(520px, 1fr) 430px",
      gap: 8,
      padding: 8,
      overflow: "hidden",
      boxSizing: "border-box",
    },

    leftCol: {
      display: "grid",
      gridTemplateRows: "auto auto auto",
      gap: 8,
      minWidth: 0,
      overflow: "hidden",
    },

    /* 黑卡片：左側應收 + 右側(已收/差額) */
    totalRow: {
      display: "grid",
      gridTemplateColumns: "minmax(260px, 420px) 1fr",
      gap: 8,
      alignItems: "stretch",
    },
    totalCard: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "#111827",
      color: "#F9FAFB",
      borderRadius: 10,
      padding: "12px 14px",
      boxShadow: "0 1px 4px rgba(0,0,0,.06)",
      minHeight: 54,
    },
    totalTitle: { fontSize: 12, opacity: 0.85, lineHeight: 1 },
    totalNumber: {
      fontSize: 22,
      fontWeight: 900,
      letterSpacing: 0.2,
      lineHeight: 1,
    },

    totalRight: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0,1fr))",
      gap: 8,
    },
    /* 亮底統計卡（已收用） */
    miniStatLight: {
      background: "#FFFFFF",
      color: "#111827",
      borderRadius: 10,
      padding: "12px 12px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      lineHeight: 1.05,
      minHeight: 54,
      border: "1px solid #E5E7EB",
      boxShadow: "0 1px 2px rgba(0,0,0,.02)",
      marginBottom: "12px",
    },
    /* 差額卡的基礎樣式（底色/邊框顏色由程式動態帶） */
    miniStatDeltaBase: {
      borderRadius: 10,
      padding: "12px 12px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      lineHeight: 1.05,
      minHeight: 54,
      border: "1px solid transparent",
      marginBottom: "12px",
    },
    miniLabel: { fontSize: 12, opacity: 0.85, marginBottom: 2 },
    miniValue: { fontSize: 18, fontWeight: 800 },

    panel: {
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: 10,
      padding: 8,
      boxShadow: "0 1px 3px rgba(0,0,0,.03)",
    },
    subtitle: {
      fontSize: 12,
      fontWeight: 800,
      color: "#111827",
      marginBottom: 6,
    },

    methodGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(74px, 1fr))",
      gap: 6,
    },
    methodBtn: {
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: 8,
      padding: "6px 6px",
      textAlign: "center",
      cursor: "pointer",
      userSelect: "none",
      whiteSpace: "nowrap",
      fontSize: 12,
      lineHeight: 1.2,
    },
    methodBtnActive: {
      borderColor: "#16a34a",
      outline: "2px solid rgba(22,163,74,.18)",
      background: "#F0FDF4",
    },

    grid2: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(190px, 1fr))",
      columnGap: 8,
      rowGap: 6,
    },
    label: {
      fontSize: 13.5,
      color: "#111827",
      marginBottom: 4,
      lineHeight: 1.1,
      fontWeight: 600,
    },
    input: {
      width: "100%",
      height: 34,
      padding: "6px 10px",
      border: "1px solid #E5E7EB",
      borderRadius: 8,
      background: "#F9FAFB",
      outline: "none",
      fontSize: 14,
      boxSizing: "border-box",
    },
    inputActive: { borderColor: "#111827", background: "#fff" },

    rightCol: {
      display: "grid",
      gridTemplateRows: "auto",
      gap: 8,
      minHeight: 0,
      marginBottom: 12,
    },

    keypadWrapper: {
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: 12,
      padding: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,.03)",
      display: "grid",
      gridTemplateRows: "auto auto auto auto",
      gap: 12,
    },

    /* 快捷金額：四等寬 */
    keypadChipsRow: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 10,
      alignItems: "center",
    },
    chip: {
      width: "100%",
      padding: "9px 0",
      borderRadius: 999,
      border: "1px solid #E5E7EB",
      background: "#fff",
      cursor: "pointer",
      fontSize: 12,
      lineHeight: 1.2,
      textAlign: "center",
    },

    keypadTopRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 10,
    },
    actionBtn: {
      padding: "14px 0",
      borderRadius: 10,
      border: "1px solid #E5E7EB",
      background: "#F9FAFB",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
    },

    keypadGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 12,
    },
    keypadKey: {
      padding: "20px 0",
      borderRadius: 10,
      border: "1px solid #E5E7EB",
      background: "#fff",
      fontSize: 20,
      cursor: "pointer",
      fontWeight: 600,
    },

    /* 主按鈕：卡片內、固定更矮高度 */
    primaryBtn: {
      width: "100%",
      height: 34,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      border: "none",
      color: "#fff",
      fontWeight: 800,
      fontSize: 14,
      cursor: "pointer",
      background: "#1677ff",
    },

    /* 發票勾選：加大 & 強化可見性 */
    invoiceRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 2,
      padding: "10px 12px",
      background: "#F1F5F9",
      border: "1px solid #E5E7EB",
      borderRadius: 10,
    },
    bigCheckbox: {
      transform: "scale(1.25)",
      transformOrigin: "left center",
      cursor: "pointer",
    },
    bigCheckboxLabel: {
      fontSize: 14.5,
      fontWeight: 700,
      userSelect: "none",
      color: "#0f172a",
      cursor: "pointer",
    },
  };

  const S = useMemo(() => ({ ...defaultStyles, ...(styles || {}) }), [styles]);

  /* --------------------------- Prop compatibility --------------------------- */
  const account = paymentAccountField ?? paymentAccount ?? "";
  const setAccount = setPaymentAccountField ?? setPaymentAccount ?? (() => {});
  const dateValue = paymentDate ?? checkDate ?? "";
  const setDateValue = setPaymentDate ?? setCheckDate ?? (() => {});

  /* ------------------------------ Local state ------------------------------ */
  const [activeField, setActiveField] = useState(
    payment === "匯款" || payment === "支票" ? "paymentAmount" : "cashReceived"
  );
  const [localOpenInvoice, setLocalOpenInvoice] = useState(true);
  const isOpenInvoiceNow =
    typeof openInvoiceNow === "boolean" ? openInvoiceNow : localOpenInvoice;
  const setIsOpenInvoiceNow = (v) =>
    setOpenInvoiceNow ? setOpenInvoiceNow(v) : setLocalOpenInvoice(v);

  /* ----------------------------- Effects ----------------------------- */
  useEffect(() => {
    if ((payment === "匯款" || payment === "支票") && setPayerName) {
      if (!payerName && defaultPayerName) setPayerName(defaultPayerName);
    }
    if (payment === "支票" && !dateValue && setDateValue) {
      const t = new Date();
      const y = t.getFullYear();
      const m = String(t.getMonth() + 1).padStart(2, "0");
      const d = String(t.getDate()).padStart(2, "0");
      setDateValue(`${y}-${m}-${d}`);
    }
    setActiveField(
      payment === "匯款" || payment === "支票"
        ? "paymentAmount"
        : "cashReceived"
    );
  }, [payment]); // eslint-disable-line

  /* ------------------------------ Computed ------------------------------ */
  const currentValue = useMemo(
    () =>
      activeField === "paymentAmount"
        ? String(paymentAmount ?? "")
        : String(cashReceived ?? ""),
    [activeField, paymentAmount, cashReceived]
  );
  const setCurrentValue = (next) =>
    activeField === "paymentAmount"
      ? setPaymentAmount(next)
      : setCashReceived(next);

  const received =
    payment === "匯款" || payment === "支票"
      ? Number(paymentAmount || 0)
      : Number(cashReceived || 0);

  const diff = Number(received) - Number(finalTotal);
  const diffLabel = diff > 0 ? "找零" : diff < 0 ? "賒帳" : "差額";
  const abs = Math.abs(diff);

  // 差額卡顏色主題
  const theme =
    diff > 0
      ? { bg: "#F0FFF4", border: "#86efac", text: "#16a34a" } // 找零：綠
      : diff < 0
      ? { bg: "#FEF2F2", border: "#fca5a5", text: "#dc2626" } // 賒帳：紅
      : { bg: "#F9FAFB", border: "#E5E7EB", text: "#111827" }; // 相等：灰

  /* ------------------------------- Handlers ------------------------------- */
  const handleKeypadPress = (key) => {
    let v = String(currentValue ?? "");
    if (key === "CLR") return setCurrentValue("");
    if (key === "DEL") return setCurrentValue(v.slice(0, -1));
    if (key === "TOTAL") return setCurrentValue(String(finalTotal));
    if (key === "." && v.includes(".")) return;
    setCurrentValue((v + key).replace(/^0+(?=\d)/, "0"));
  };
  const onClickPayment = (opt) => {
    setPayment(opt);
    handlePaymentMethodChange?.(opt);
    setActiveField(
      opt === "匯款" || opt === "支票" ? "paymentAmount" : "cashReceived"
    );
  };

  /* --------------------------------- UI --------------------------------- */
  return (
    <div style={S.viewport}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.title}>結帳</div>
        <button style={S.backBtn} onClick={onBack}>
          ← 返回配送
        </button>
      </div>

      {/* Body */}
      <div style={S.body}>
        {/* 左欄 */}
        <div style={S.leftCol}>
          {/* 黑卡片＋右側亮底統計 */}
          <div style={S.totalRow}>
            <div style={S.totalCard}>
              <div>
                <div style={S.totalTitle}>應收金額</div>
                <div style={S.totalNumber}>
                  NT$ {Number(finalTotal || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                  安全交易
                </div>
              </div>
            </div>

            <div style={S.totalRight}>
              <div style={S.miniStatLight}>
                <div style={S.miniLabel}>已收</div>
                <div style={S.miniValue}>
                  NT$ {Number(received || 0).toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  ...S.miniStatDeltaBase,
                  background: theme.bg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <div style={{ ...S.miniLabel, color: theme.text }}>
                  {diffLabel}
                </div>
                <div style={{ ...S.miniValue, color: theme.text }}>
                  NT$ {Number(abs || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* 付款方式 */}
          <div style={S.panel}>
            <div style={S.subtitle}>付款方式</div>
            <div style={S.methodGrid}>
              {paymentOptions.map((opt) => (
                <div
                  key={opt}
                  style={{
                    ...S.methodBtn,
                    ...(payment === opt ? S.methodBtnActive : {}),
                  }}
                  onClick={() => onClickPayment(opt)}
                >
                  {opt}
                </div>
              ))}
            </div>
          </div>

          {/* 金額與付款資訊 */}
          <div style={S.panel}>
            <div style={S.subtitle}>金額與付款資訊</div>

            <div style={S.grid2}>
              {/* 金額欄位 */}
              <div>
                <div style={S.label}>
                  {payment === "現金" || payment === "刷卡"
                    ? "收現金額"
                    : "付款金額"}
                </div>
                <input
                  style={{
                    ...S.input,
                    ...(activeField ===
                    (payment === "匯款" || payment === "支票"
                      ? "paymentAmount"
                      : "cashReceived")
                      ? S.inputActive
                      : {}),
                  }}
                  type="number"
                  min="0"
                  placeholder={
                    payment === "現金" || payment === "刷卡"
                      ? "請輸入收現金額"
                      : "請輸入付款金額"
                  }
                  value={
                    payment === "匯款" || payment === "支票"
                      ? paymentAmount
                      : cashReceived
                  }
                  onFocus={() =>
                    setActiveField(
                      payment === "匯款" || payment === "支票"
                        ? "paymentAmount"
                        : "cashReceived"
                    )
                  }
                  onChange={(e) =>
                    payment === "匯款" || payment === "支票"
                      ? setPaymentAmount(e.target.value)
                      : setCashReceived(e.target.value)
                  }
                />
              </div>

              {/* 刷卡資訊 */}
              {payment === "刷卡" && (
                <div>
                  <div style={S.label}>刷卡資訊</div>
                  <input
                    style={S.input}
                    placeholder="卡號/末四碼（若需要）"
                    value={creditCardInfo}
                    onChange={(e) => setCreditCardInfo(e.target.value)}
                  />
                </div>
              )}

              {/* 匯款欄位 */}
              {payment === "匯款" && (
                <>
                  <div>
                    <div style={S.label}>銀行代碼</div>
                    <input
                      style={S.input}
                      inputMode="numeric"
                      placeholder="例如 004"
                      value={bankCode ?? ""}
                      onChange={(e) =>
                        setBankCode?.(
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 5)
                        )
                      }
                    />
                  </div>
                  <div>
                    <div style={S.label}>付款帳號</div>
                    <input
                      style={S.input}
                      placeholder="輸入匯款帳號（非必填）"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={S.label}>付款人</div>
                    <input
                      style={S.input}
                      placeholder="預設帶會員姓名，可修改"
                      value={payerName ?? ""}
                      onChange={(e) => setPayerName?.(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* 支票欄位 */}
              {payment === "支票" && (
                <>
                  <div>
                    <div style={S.label}>支票號碼</div>
                    <input
                      style={S.input}
                      placeholder="輸入支票號碼"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={S.label}>付款日期</div>
                    <input
                      style={S.input}
                      type="date"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                    />
                  </div>
                  <div>
                    <div style={S.label}>付款人</div>
                    <input
                      style={S.input}
                      placeholder="預設帶會員姓名，可修改"
                      value={payerName ?? ""}
                      onChange={(e) => setPayerName?.(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* 發票欄位 */}
              <div>
                <div style={S.label}>載具號碼</div>
                <input
                  style={S.input}
                  placeholder="請輸入載具號碼"
                  value={carrier}
                  onChange={(e) => {
                    const raw = e.target.value?.replace(/^\s+|\s+$/g, "") || "";
                    const val = raw.startsWith("/") ? raw : "/" + raw;
                    setCarrier(val);
                  }}
                />
              </div>
              <div>
                <div style={S.label}>統一編號</div>
                <input
                  style={S.input}
                  placeholder="請輸入 8 碼統編"
                  maxLength={8}
                  value={invoiceTaxId}
                  onChange={(e) => {
                    const digits = e.target.value
                      .replace(/[^0-9]/g, "")
                      .slice(0, 8);
                    setInvoiceTaxId(digits);
                  }}
                />
              </div>

              {/* 放大、明顯的勾選列 */}
              <label htmlFor="openInvoiceNow" style={S.invoiceRow}>
                <input
                  id="openInvoiceNow"
                  type="checkbox"
                  checked={isOpenInvoiceNow}
                  onChange={(e) => setIsOpenInvoiceNow(e.target.checked)}
                  style={S.bigCheckbox}
                />
                <span style={S.bigCheckboxLabel}>立即開立發票</span>
              </label>
            </div>
          </div>
        </div>

        {/* 右欄：九宮格卡片（含確認按鈕） */}
        <div style={S.rightCol}>
          <div style={S.keypadWrapper}>
            {/* 等寬快捷金額 */}
            <div style={S.keypadChipsRow}>
              {[100, 500, 1000, 2000].map((n) => (
                <button
                  key={n}
                  style={S.chip}
                  onClick={() =>
                    setCurrentValue(String(Number(currentValue || 0) + n))
                  }
                >
                  +{n.toLocaleString()}
                </button>
              ))}
            </div>

            {/* 行為鍵 */}
            <div className="mt-5 mb-2" style={S.keypadTopRow}>
              <button
                style={S.actionBtn}
                onClick={() => handleKeypadPress("CLR")}
              >
                清除
              </button>
              <button
                style={S.actionBtn}
                onClick={() => handleKeypadPress("DEL")}
              >
                退格
              </button>
              <button
                style={S.actionBtn}
                onClick={() => handleKeypadPress("TOTAL")}
              >
                總額
              </button>
            </div>

            {/* 九宮格 */}
            <div style={S.keypadGrid}>
              {[
                "7",
                "8",
                "9",
                "4",
                "5",
                "6",
                "1",
                "2",
                "3",
                "00",
                "0",
                ".",
              ].map((k) => (
                <button
                  key={k}
                  style={S.keypadKey}
                  onClick={() => handleKeypadPress(k)}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* 確認按鈕（卡片內、固定矮高） */}
            <button style={S.primaryBtn} onClick={onFinish}>
              確認結帳
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
