// Step2：配送方式 + 額外資訊
import { useEffect, useRef, useState } from "react";
import { FaStore, FaPlane, FaShip, FaHome, FaBuilding, FaClipboard } from "react-icons/fa";

/** 後端 API Base */
const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

/** 圖示維持你的配置 */
const icons = {
  現場帶走: <FaStore size={36} />,
  機場提貨: <FaPlane size={36} />,
  碼頭提貨: <FaShip size={36} />,
  宅配到府: <FaHome size={36} />,
  店到店: <FaBuilding size={36} />,
  訂單自取: <FaClipboard size={36} />,
};

export default function DeliverySelector({
  delivery,
  setDelivery,
  lockDelivery = false,
  deliveryOptions,
  needExtraInfo,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  pickupLocation,
  setPickupLocation,
  pickupTime,
  setPickupTime,
  note,
  setNote,
  onBack,
  onNext,
  styles,
}) {
  // ====== 新增：店到店選店相關（原本） ======
  const [cvsSubtype, setCvsSubtype] = useState("UNIMARTC2C"); // 7-ELEVEN
  const popupRef = useRef(null);

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;

  // ====== 新增：訂單自取 → 後端門市下拉 ======
  const [storeList, setStoreList] = useState([]); // [{label, value, key}]
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState("");

  // 只有在選到「訂單自取」時才拉門市清單；避免每次 render 重抓
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
        // 預期格式：[{ label: "馬公門市", value: 1, key: "馬公門市" }, ...]
        const rows = Array.isArray(data) ? data : [];
        setStoreList(rows);
        // 若先前尚未選擇且只有一筆，也可預設選上：
        // if (!pickupLocation && rows.length === 1) setPickupLocation(rows[0].label);
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

  // 安全：提供 fallback 的按鈕樣式
  const secondaryBtnStyle =
    styles?.secondaryBtn || {
      ...styles?.primaryBtn,
      background: "#f1f1f1",
      color: "#333",
    };
  const linkBtnStyle =
    styles?.linkBtn || {
      background: "none",
      border: "none",
      textDecoration: "underline",
      padding: "6px 8px",
      cursor: "pointer",
    };

  // 切換配送方式：離開「店到店/訂單自取」時，清空已選門市，避免殘留
  useEffect(() => {
    if ((delivery !== "店到店" && delivery !== "訂單自取") && pickupLocation) {
      setPickupLocation("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery]);

  // 接收門市回傳（店到店使用）
  useEffect(() => {
    const onMessage = (e) => {
      const data = e.data || {};
      if (data.type === "CVS_STORE_SELECTED" && data.payload) {
        const { brand, storeId, storeName, address } = data.payload;
        setPickupLocation(`${brand} ${storeName}（${storeId}）${address}`);
        if (popupRef.current && !popupRef.current.closed) popupRef.current.close();
      }
    };
    window.addEventListener("message", onMessage);

    // iOS 同頁導轉回來（店到店）
    const cached = sessionStorage.getItem("CVS_STORE_SELECTED");
    if (cached) {
      try {
        const payload = JSON.parse(cached);
        setPickupLocation(
          `${payload.brand} ${payload.storeName}（${payload.storeId}）${payload.address}`
        );
      } finally {
        sessionStorage.removeItem("CVS_STORE_SELECTED");
      }
    }

    return () => window.removeEventListener("message", onMessage);
  }, [setPickupLocation]);

  // 開啟超商門市地圖（店到店）
  const openCvsMap = () => {
    const url = `/api/logistics/ecpay/map?subType=${cvsSubtype}`;
    if (isIOS) {
      window.location.href = url;
    } else {
      popupRef.current = window.open(
        url,
        "cvsMap",
        "width=980,height=720,noopener,noreferrer"
      );
    }
  };

  // 下一步前的驗證：自取要選門市；店到店要選門市/有出貨點
  const handleNext = () => {
    if (delivery === "訂單自取" && !pickupLocation) {
      alert("請選擇取貨門市");
      return;
    }
    if (delivery === "店到店" && !pickupLocation) {
      alert("請選擇超商門市");
      return;
    }
    onNext?.();
  };

  return (
    <>
      <div style={styles.headerRow}>
        <h2 style={styles.title}>選擇配送方式</h2>
        <button style={styles.backBtn} onClick={onBack}>
          ← 返回明細
        </button>
      </div>

      <div style={styles.cardGrid3}>
        {(lockDelivery
          ? deliveryOptions.filter((o) => o.label === "訂單自取")
          : deliveryOptions
        ).map((opt) => (
          <div
            key={opt.label}
            style={{
              ...styles.card,
              ...(delivery === opt.label ? styles.cardSelected : styles.cardDefault),
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
          {/* 基本資料 */}
          <div style={styles.inputRow}>
            <input
              style={styles.halfInput}
              placeholder="姓名"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <input
              style={styles.halfInput}
              placeholder="聯絡電話"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* 訂單自取：後端門市下拉 */}
          {delivery === "訂單自取" && (
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
          )}
          {delivery === "訂單自取" && storesError && (
            <div style={{ color: "#c00", marginTop: 6 }}>{storesError}</div>
          )}

          {/* 店到店：綠界選店（維持原本） */}
          {delivery === "店到店" && (
            <>
              <div style={{ ...styles.inputRow, alignItems: "center", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    checked={cvsSubtype === "UNIMARTC2C"}
                    onChange={() => setCvsSubtype("UNIMARTC2C")}
                  />
                  7-ELEVEN
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="radio"
                    checked={cvsSubtype === "FAMIC2C"}
                    onChange={() => setCvsSubtype("FAMIC2C")}
                  />
                  全家
                </label>

                <button type="button" style={secondaryBtnStyle} onClick={openCvsMap}>
                  選擇門市
                </button>
                <button
                  type="button"
                  style={linkBtnStyle}
                  onClick={() => setPickupLocation("")}
                  title="清除已選門市"
                >
                  清除
                </button>
              </div>

              <div style={styles.inputRow}>
                <input
                  style={styles.halfInput}
                  placeholder="出貨點（選店自動帶入）"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  readOnly={true}
                />
                <input
                  style={styles.halfInput}
                  type="datetime-local"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                />
              </div>
            </>
          )}

          {/* 其他配送：維持原本（可手動輸入出貨點） */}
          {delivery !== "店到店" && delivery !== "訂單自取" && (
            <div style={styles.inputRow}>
              <input
                style={styles.halfInput}
                placeholder="出貨點"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                readOnly={false}
              />
              <input
                style={styles.halfInput}
                type="datetime-local"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
              />
            </div>
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
