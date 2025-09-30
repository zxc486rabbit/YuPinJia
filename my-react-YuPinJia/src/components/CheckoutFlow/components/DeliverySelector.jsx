// Step2：配送方式 + 額外資訊
import { useEffect, useState } from "react";
import { FaStore, FaPlane, FaShip, FaHome, FaBuilding, FaClipboard, FaTruck } from "react-icons/fa";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

const icons = {
  現場帶走: <FaStore size={36} />,
  機場提貨: <FaPlane size={36} />,
  碼頭提貨: <FaShip size={36} />,
  宅配到府: <FaHome size={36} />,
  店到店: <FaBuilding size={36} />,
  訂單自取: <FaClipboard size={36} />,
  司機配送: <FaTruck size={36} />,
};

export default function DeliverySelector({
  delivery,
  setDelivery,
  lockDelivery = false,
  deliveryOptions,
  needExtraInfo,
  // 基本聯絡人（宅配隱藏、其他顯示）
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,

  // 額外欄位
  pickupLocation,
  setPickupLocation,
  pickupTime,
  setPickupTime,
  note,
  setNote,

  // 外觀＆導航
  onBack,
  onNext,
  styles,

  // 會員地址（預設收件地址）
  memberAddress,

  // 宅配/司機：寄件與收件欄位（司機此次只用到收件地址）
  senderName,
  setSenderName,
  senderPhone,
  setSenderPhone,
  senderAddress,
  setSenderAddress,
  receiverName,
  setReceiverName,
  receiverPhone,
  setReceiverPhone,
  receiverAddress,
  setReceiverAddress,

  // 預設寄件人（本店）
  defaultSenderName,
  defaultSenderPhone,
}) {
  // ===== 訂單自取：門市清單 =====
  const [storeList, setStoreList] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState("");

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setStoresError("");
        setStoresLoading(true);
        const res = await fetch(`${API_BASE}/Dropdown/GetStoreList`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`GetStoreList 失敗 (${res.status}) ${t}`);
        }
        const data = await res.json();
        setStoreList(Array.isArray(data) ? data : []);
      } catch (e) {
        setStoresError(e?.message || "無法取得門市清單");
      } finally {
        setStoresLoading(false);
      }
    };
    if (delivery === "訂單自取" && storeList.length === 0 && !storesLoading) {
      fetchStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery]);

  // ===== 宅配/司機：初始預填 =====
  useEffect(() => {
    if (delivery === "宅配到府" || delivery === "司機配送") {
      if (!senderName && defaultSenderName) setSenderName?.(defaultSenderName);
      if (!senderPhone && defaultSenderPhone) setSenderPhone?.(defaultSenderPhone);

      if (!receiverName && customerName) setReceiverName?.(customerName);
      if (!receiverPhone && customerPhone) setReceiverPhone?.(customerPhone);
      if (!receiverAddress && memberAddress) setReceiverAddress?.(memberAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery]);

  // 切換配送：離開自取就清空自取門市顯示
  useEffect(() => {
    if (delivery !== "訂單自取" && pickupLocation) {
      setPickupLocation("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery]);

  // ===== 驗證（下一步） =====
  const handleNext = () => {
    if (delivery === "訂單自取" && !pickupLocation) {
      alert("請選擇取貨門市");
      return;
    }
    if (delivery === "宅配到府") {
      // 宅配：收件人三欄需完整
      if (!receiverName || !receiverPhone || !receiverAddress) {
        alert("請完整填寫【收件人】姓名、電話與地址");
        return;
      }
    }
    if (delivery === "司機配送") {
      // 司機配送：至少需要收件地址
      if (!receiverAddress) {
        alert("請填寫【收件地址】");
        return;
      }
    }
    onNext?.();
  };

  // 4 欄卡片
  const fourColGrid = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 12,
  };

  return (
    <>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>選擇配送方式</h2>
        <button style={styles.backBtn} onClick={onBack}>← 返回明細</button>
      </div>

      <div style={fourColGrid}>
        {(lockDelivery ? deliveryOptions.filter((o) => o.label === "訂單自取") : deliveryOptions)
          .map((opt) => (
            <div
              key={opt.label}
              style={{
                ...styles.card,
                ...(delivery === opt.label ? styles.cardSelected : styles.cardDefault),
                cursor: lockDelivery && opt.label !== "訂單自取" ? "not-allowed" : "pointer",
              }}
              onClick={() => {
                if (lockDelivery && opt.label !== "訂單自取") return;
                setDelivery(opt.label);
              }}
            >
              <div>{icons[opt.label]}</div>
              <div style={{ fontSize: "1.1rem", marginTop: 8 }}>{opt.label}</div>
            </div>
          ))}
      </div>

      {needExtraInfo && (
        <div style={styles.extraInfo}>
          {/* === 基本聯絡窗口 ===
              宅配到府：收件人區塊已顯示會員姓名/電話 → 隱藏這一行 */}
          {delivery !== "宅配到府" && (
            <div style={styles.inputRow}>
              <input
                style={styles.halfInput}
                placeholder="聯絡人姓名"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                style={styles.halfInput}
                placeholder="聯絡人電話"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          )}

          {/* 訂單自取：門市下拉 + 時間 */}
          {delivery === "訂單自取" && (
            <>
              <div style={styles.inputRow}>
                <select
                  style={{ ...styles.halfInput, height: 44 }}
                  value={pickupLocation || ""}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  disabled={storesLoading}
                >
                  <option value="" disabled>
                    {storesLoading ? "載入門市中…" : "請選擇取貨門市"}
                  </option>
                  {storeList.map((s) => (
                    <option key={s.value} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <input
                  style={styles.halfInput}
                  type="datetime-local"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
              </div>
              {storesError && (
                <div style={{ color: "#c00", marginTop: 6 }}>{storesError}</div>
              )}
            </>
          )}

          {/* 店到店：與司機配送同版型（左：日期、右：備註/編號） */}
          {delivery === "店到店" && (
            <div style={styles.inputRow}>
              <input
                style={styles.halfInput}
                type="datetime-local"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              />
              <input
                style={styles.halfInput}
                placeholder="(選填) 便利商店名稱或寄件編號"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
              />
            </div>
          )}

          {/* 司機配送：與店到店同版型 + 收件地址（全寬、必填） */}
          {delivery === "司機配送" && (
            <>
              <div style={styles.inputRow}>
                <input
                  style={styles.halfInput}
                  type="datetime-local"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
                <input
                  style={styles.halfInput}
                  placeholder="（選填）司機車號 / 物流單號"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                />
              </div>
              <div style={styles.inputRow}>
                <input
                  style={styles.fullInput}
                  placeholder="收件地址（必填）"
                  value={receiverAddress || ""}
                  onChange={(e) => setReceiverAddress?.(e.target.value)}
                />
              </div>
            </>
          )}

          {/* 宅配到府：寄件/收件；移除日期與單號；地址改全寬 */}
          {delivery === "宅配到府" && (
            <>
              <div style={{ fontWeight: 700, marginTop: 8 }}>寄件人（本店）</div>
              <div style={styles.inputRow}>
                <input
                  style={styles.halfInput}
                  placeholder="寄件人姓名（本店）"
                  value={senderName || ""}
                  onChange={(e) => setSenderName?.(e.target.value)}
                />
                <input
                  style={styles.halfInput}
                  placeholder="寄件人電話"
                  value={senderPhone || ""}
                  onChange={(e) => setSenderPhone?.(e.target.value)}
                />
              </div>
              <div style={styles.inputRow}>
                <input
                  style={styles.fullInput}
                  placeholder="寄件人地址（可留空）"
                  value={senderAddress || ""}
                  onChange={(e) => setSenderAddress?.(e.target.value)}
                />
              </div>

              <div style={{ fontWeight: 700, marginTop: 8 }}>收件人（會員）</div>
              <div style={styles.inputRow}>
                <input
                  style={styles.halfInput}
                  placeholder="收件人姓名"
                  value={receiverName || ""}
                  onChange={(e) => setReceiverName?.(e.target.value)}
                />
                <input
                  style={styles.halfInput}
                  placeholder="收件人電話"
                  value={receiverPhone || ""}
                  onChange={(e) => setReceiverPhone?.(e.target.value)}
                />
              </div>
              <div style={styles.inputRow}>
                <input
                  style={styles.fullInput}
                  placeholder="收件人地址（必填）"
                  value={receiverAddress || ""}
                  onChange={(e) => setReceiverAddress?.(e.target.value)}
                />
              </div>
              {/* 宅配：不需要日期/單號欄位 */}
            </>
          )}

          <textarea
            style={styles.textarea}
            placeholder="備註"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      <button style={styles.primaryBtn} disabled={!delivery} onClick={handleNext}>
        下一步
      </button>
    </>
  );
}
