import { useMemo, useState } from "react";

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
  setCustomerPhone, // 保留，不動
  carrierOptions = [],
  onBack,
  onFinish,
  styles,
  openInvoiceNow,
  setOpenInvoiceNow,
}) {
  const [activeField, setActiveField] = useState(
    payment === "匯款" || payment === "支票" ? "paymentAmount" : "cashReceived"
  );

  const [localOpenInvoice, setLocalOpenInvoice] = useState(true);
  const isOpenInvoiceNow =
    typeof openInvoiceNow === "boolean" ? openInvoiceNow : localOpenInvoice;
  const setIsOpenInvoiceNow = (v) =>
    setOpenInvoiceNow ? setOpenInvoiceNow(v) : setLocalOpenInvoice(v);

  // 目前鍵盤綁定值
  const currentValue = useMemo(() => {
    return activeField === "paymentAmount"
      ? String(paymentAmount ?? "")
      : String(cashReceived ?? "");
  }, [activeField, paymentAmount, cashReceived]);

  const setCurrentValue = (next) => {
    if (activeField === "paymentAmount") setPaymentAmount(next);
    else setCashReceived(next);
  };

  // 根據付款方式決定「已收金額」
const received =
  payment === "匯款" || payment === "支票"
    ? Number(paymentAmount || 0)
    : Number(cashReceived || 0);

// 顯示：找零 / 賒帳 / —（剛好相等）
const diff = Number(received) - Number(finalTotal);
const statusLabel = diff > 0 ? "找零" : diff < 0 ? "賒帳" : "—";
const showAmount = Math.abs(diff);
const amountColor = diff > 0 ? "#16a34a" : diff < 0 ? "#dc2626" : "#111827";

  // 鍵盤
  const handleKeypadPress = (key) => {
    let v = String(currentValue ?? "");
    if (key === "CLR") return setCurrentValue("");
    if (key === "DEL") return setCurrentValue(v.slice(0, -1));
    if (key === "TOTAL") return setCurrentValue(String(finalTotal));
    if (key === "." && v.includes(".")) return;
    setCurrentValue((v + key).replace(/^0+(?=\d)/, "0"));
  };

  // 付款方式
  const onClickPayment = (opt) => {
    setPayment(opt);
    handlePaymentMethodChange(opt);
    setActiveField(opt === "匯款" || opt === "支票" ? "paymentAmount" : "cashReceived");
  };

  const QuickChips = () => (
    <div style={styles.chipRow}>
      <button style={styles.chip} onClick={() => setCurrentValue(String(finalTotal))}>
        Exact
      </button>
      {[100, 500, 1000, 2000].map((n) => (
        <button
          key={n}
          style={styles.chip}
          onClick={() => setCurrentValue(String((Number(currentValue || 0) + n)))}
        >
          +{n.toLocaleString()}
        </button>
      ))}
      <button style={styles.chip} onClick={() => setCurrentValue("")}>清空</button>
    </div>
  );

  // 右側小鍵盤（極簡版：移除標題／目標欄位／顯示框）
const Keypad = () => (
  <div style={styles.keypadWrapper}>
    <div style={styles.keypadGrid}>
      {["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "."].map((k) => (
        <button key={k} style={styles.keypadKey} onClick={() => handleKeypadPress(k)}>
          {k}
        </button>
      ))}
    </div>

    <div style={styles.keypadActionRow}>
      <button style={{ ...styles.keypadKey, flex: 1 }} onClick={() => handleKeypadPress("CLR")}>
        清除
      </button>
      <button style={{ ...styles.keypadKey, flex: 1 }} onClick={() => handleKeypadPress("DEL")}>
        刪除
      </button>
    </div>

    <div style={styles.keypadActionRow}>
      <button style={{ ...styles.keypadGhost, flex: 1 }} onClick={() => handleKeypadPress("TOTAL")}>
        填入總額（{finalTotal.toLocaleString()}）
      </button>
    </div>
  </div>
);

  return (
    <>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>結帳</h2>
        <button style={styles.backBtn} onClick={onBack}>← 返回配送</button>
      </div>

      {/* 總額卡片 */}
      <div style={styles.totalCard}>
        <div>
          <div style={styles.totalTitle}>應收金額</div>
          <div style={styles.totalNumber}>NT$ {finalTotal.toLocaleString()}</div>
        </div>
        <div style={styles.totalHint}>
          安全交易 • 列印明細
        </div>
      </div>

      {/* 付款方式 */}
      <div style={styles.methodGrid}>
        {paymentOptions.map((opt) => (
          <div
            key={opt}
            style={{ ...styles.methodBtn, ...(payment === opt ? styles.methodBtnActive : {}) }}
            onClick={() => onClickPayment(opt)}
          >
            {opt}
          </div>
        ))}
      </div>

      {/* 主體佈局 */}
      <div style={styles.posShell}>
        {/* 左側：表單 */}
        <div style={styles.posLeft}>
          {/* 金額面板 */}
          <div style={styles.panel}>
            <div style={styles.fieldStack}>
              {(payment === "現金" || payment === "刷卡") && (
                <div>
                  <label style={styles.label}>收現金額</label>
                  <input
                    style={{ ...styles.input, ...(activeField === "cashReceived" ? styles.inputActive : {}) }}
                    type="number"
                    min="0"
                    placeholder="請輸入收現金額"
                    value={cashReceived}
                    onFocus={() => setActiveField("cashReceived")}
                    onChange={(e) => setCashReceived(e.target.value)}
                  />
                </div>
              )}

              {(payment === "匯款" || payment === "支票") && (
                <div>
                  <label style={styles.label}>付款金額</label>
                  <input
                    style={{ ...styles.input, ...(activeField === "paymentAmount" ? styles.inputActive : {}) }}
                    type="number"
                    min="0"
                    placeholder="請輸入付款金額"
                    value={paymentAmount}
                    onFocus={() => setActiveField("paymentAmount")}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
              )}

              {payment === "刷卡" && (
                <div>
                  <label style={styles.label}>刷卡資訊</label>
                  <input
                    style={styles.input}
                    placeholder="卡號/末四碼等（若需要）"
                    value={creditCardInfo}
                    onChange={(e) => setCreditCardInfo(e.target.value)}
                  />
                </div>
              )}

              <QuickChips />

              {/* 應收/已收/找零(或賒帳) */}
              <div style={styles.dueRow}>
                <div style={styles.dueCard}>
                  <div style={styles.dueLabel}>應收</div>
                  <div style={styles.dueValue}>NT$ {finalTotal.toLocaleString()}</div>
                </div>
                <div style={styles.dueCard}>
                  <div style={styles.dueLabel}>已收</div>
                  <div style={styles.dueValue}>NT$ {received.toLocaleString()}</div>
                </div>
                <div style={styles.dueCard}>
  <div style={styles.dueLabel}>{statusLabel}</div>
  <div style={{ ...styles.dueValue, color: amountColor }}>
    NT$ {showAmount.toLocaleString()}
  </div>
</div>
              </div>
            </div>
          </div>

          {/* 發票面板 */}
          <div style={styles.panel}>
            <h4 style={{ ...styles.subtitle, marginTop: 0 }}>發票資訊</h4>
            <div style={styles.fieldStack}>
              <div style={styles.fieldRow2}>
                <div>
                  <label style={styles.label}>載具號碼</label>
                  <input
                    style={styles.input}
                    placeholder="請輸入載具號碼"
                    value={carrier}
                    onChange={(e) =>
                      setCarrier(e.target.value.startsWith("/") ? e.target.value : "/" + e.target.value)
                    }
                  />
                </div>
                <div>
                  <label style={styles.label}>統一編號</label>
                  <input
                    style={styles.input}
                    placeholder="請輸入8碼統編"
                    maxLength={8}
                    value={invoiceTaxId}
                    onChange={(e) => setInvoiceTaxId(e.target.value)}
                  />
                </div>
              </div>

              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={isOpenInvoiceNow}
                  onChange={(e) => setIsOpenInvoiceNow(e.target.checked)}
                />
                <span className="ms-1">立即開立發票</span>
              </label>
            </div>
          </div>

   
        </div>

        {/* 右側：數字鍵盤 */}
        <div style={styles.posRight}>
          <Keypad />
          {/* 金額足夠提示 */}
  {received >= finalTotal && (
    <div style={{ ...styles.totalHint, marginTop: 8 }}>
      金額已足夠，可直接結帳
    </div>
  )}

  {/* 右側主按鈕：確認結帳 */}
  <div style={{ marginTop: 12 }}>
    <button
      style={{
        ...styles.primaryBtn,
        background: "#16a34a",
        width: "100%",
        maxWidth: "unset",
        margin: 0,
      }}
      onClick={onFinish}
    >
      確認結帳
    </button>
  </div>
        </div>
      </div>
    </>
  );
}