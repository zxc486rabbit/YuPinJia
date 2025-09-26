import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

import ShiftChangeCard from "../components/ShiftChangeCard";
import "../components/ShiftChangeCard.css";
import ShiftChangeTable from "../components/ShiftChangeTable";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

/* ========= 共用：附上 Bearer Token ========= */
function authJsonHeaders() {
  const h = { "Content-Type": "application/json", Accept: "application/json" };
  const token = localStorage.getItem("accessToken");
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

const fmt = (n) => Number(n || 0).toLocaleString();

/* ========= 【搬到組件外】穩定的 Mapper 函式 ========= */
// rightTable 需求: { id, date, total, totalMoney, payMethod }
function mapSalesDetail(items = []) {
  return items.map((it) => ({
    id: it.orderNumber || it.id || "-",
    // 取 ISO 的 hh:mm
    date: (it.createdAt || "").toString().slice(11, 16) || "--:--",
    // 你回傳的是 totalQuantity（不是 itemCount / items.length）
    total: it.totalQuantity ?? 0,
    totalMoney: Number(it.totalAmount ?? 0).toLocaleString(),
    // 你回傳的是 paymentMethod（不是 payMethodName）
    payMethod: it.paymentMethod || "-",
  }));
}

function mapPosShouldHave(items = []) {
  return items.map((it, idx) => ({
    id: it.code || it.id || `POS-${idx + 1}`,
    date:
      (it.time || it.updatedAt || new Date().toISOString())
        .toString()
        .slice(11, 16) || "--:--",
    total: "-",
    totalMoney: Number(it.amount ?? 0).toLocaleString(),
    payMethod: it.label || it.itemName || it.categoryName || "項目",
  }));
}

function mapRebate(items = []) {
  return items.map((it) => ({
    id: it.orderNumber || it.id || "-",
    date:
      (it.createdAt || it.date || "")
        .toString()
        .slice(11, 16) || "--:--",
    total: it.itemCount ?? 1,
    totalMoney: Number(it.rebateAmount ?? it.totalAmount ?? 0).toLocaleString(),
    payMethod: "回扣",
  }));
}

function mapRepayments(items = []) {
  return items.map((it) => ({
    id: it.repaymentNo || it.id || "-",
    date:
      (it.createdAt || it.repaymentDate || "")
        .toString()
        .slice(11, 16) || "--:--",
    total: "-",
    totalMoney: Number(it.amount ?? 0).toLocaleString(),
    payMethod: it.methodName || it.payMethod || "還款",
  }));
}

export default function ShiftChange() {
  const navigate = useNavigate();

  /* ========= UI 狀態 ========= */
  const [detailButton, setDetailButton] = useState("門市銷售總金額");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  // 右側明細表
  const [rightRows, setRightRows] = useState([]);
  const [rightLoading, setRightLoading] = useState(false);
  const [rightError, setRightError] = useState("");

  // 使用者資訊 + 即時時間
  const [userInfo, setUserInfo] = useState(null);
  const [nowText, setNowText] = useState(new Date().toLocaleString());

  /* ========= 時鐘（不觸發抓取） ========= */
  useEffect(() => {
    const t = setInterval(() => setNowText(new Date().toLocaleString()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ========= 取得登入者資訊 ========= */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/t_Staff/UserInfo`, {
          headers: authJsonHeaders(),
        });
        setUserInfo(res.data);
        localStorage.setItem("userInfo", JSON.stringify(res.data));
      } catch {
        const cached = localStorage.getItem("userInfo");
        if (cached) setUserInfo(JSON.parse(cached));
        else {
          setUserInfo({
            id: 1,
            staffId: 1,
            chineseName: "一二三",
            jobTitleId: 0,
            jobTitleName: "",
            deptId: 0,
            deptName: "",
            storeId: 1,
            storeName: "馬公門市",
            account: "AAA",
            giftAmount: 5000,
            monthRemainGift: 3650,
            isLock: false,
            roleId: 1,
            roleName: "店長",
            level: 3,
            isMain: false,
          });
        }
      }
    })();
  }, []);

  /* ========= 讀交班彙總 ========= */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${API_BASE}/t_ShiftHandoverRecord/ShiftHandoverSummary`,
          { headers: authJsonHeaders() }
        );
        setSummary(res.data || {});
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: "error",
          title: "讀取失敗",
          text: "無法取得交班彙總資料。",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 快取映射
  const rec = summary?.shiftHandoverRecord || {};

  const {
    // 門市銷售總金額
    salesCash = 0,
    salesBankTransfer = 0,
    salesCreditCard = 0,
    salesOnDelivery = 0,
    salesConvenienceStoreCollection = 0,
    salesCredit = 0,

    // POS 應有金額
    cashOrderPayment = 0,
    cashCreditSettlement = 0,
    cashRefund = 0,
    cashRedeemWithdraw = 0,
    cashOutflow = 0,

    // 回扣
    rebateOrderAmount = 0,
    rebateCount = 0,
    totalRebatePoints = 0,
    rebatePoints = 0,

    // 經銷會員收款
    dealerRepaymentCash = 0,
    dealerRepaymentCard = 0,
    dealerRepaymentTransfer = 0,
    dealerRepaymentOther = 0,

    // 底部總計
    cash = 0,
    bankTransfer = 0,
    check = 0,
    creditCard = 0,
    cashOnDelivery = 0,
    convenienceStoreCollection = 0,
    credit = 0,

    // 統計數
    posCancelOrderCount = 0,
    complaintReturnOrderCount = 0,
  } = rec;

  /* ========= 左側四張卡片資料 ========= */
  const cardData_storeSales = useMemo(
    () => ({
      methods: [
        [
          { label: "現金", amount: salesCash },
          { label: "貨到付款", amount: salesOnDelivery },
        ],
        [
          { label: "轉帳", amount: salesBankTransfer },
          { label: "賒帳", amount: salesCredit },
        ],
        [{ label: "刷卡", amount: salesCreditCard }],
      ],
    }),
    [
      salesCash,
      salesOnDelivery,
      salesBankTransfer,
      salesCreditCard,
      salesCredit,
    ]
  );

  const cardData_posShouldHave = useMemo(
    () => ({
      methods: [
        [
          { label: "銷售訂單現金", amount: cashOrderPayment },
          { label: "傭金提現", amount: cashRedeemWithdraw },
        ],
        [
          { label: "賒帳結帳現金", amount: cashCreditSettlement },
          { label: "現金支出", amount: cashOutflow },
        ],
        [{ label: "現金退款", amount: cashRefund }],
      ],
    }),
    [
      cashOrderPayment,
      cashRedeemWithdraw,
      cashCreditSettlement,
      cashOutflow,
      cashRefund,
    ]
  );

  const cardData_rebate = useMemo(
    () => ({
      methods: [
        [{ label: "回扣訂單金額", amount: rebateOrderAmount, unit: "元" }],
        [{ label: "回扣筆數", amount: rebateCount, unit: "筆" }],
        [{ label: "回扣點數", amount: totalRebatePoints, unit: "點" }],
      ],
    }),
    [rebateOrderAmount, rebateCount, totalRebatePoints]
  );

  const cardData_dealer = useMemo(
    () => ({
      methods: [
        [
          { label: "賒帳收款現金", amount: dealerRepaymentCash },
          { label: "賒帳還款轉帳", amount: dealerRepaymentTransfer },
        ],
        [
          { label: "賒帳收款刷卡", amount: dealerRepaymentCard },
          { label: "賒帳還款其他", amount: dealerRepaymentOther },
        ],
      ],
    }),
    [
      dealerRepaymentCash,
      dealerRepaymentTransfer,
      dealerRepaymentCard,
      dealerRepaymentOther,
    ]
  );

  /* ========= 當天（yyyy-MM-dd） ========= */
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /* ========= 右側明細：請求取消 / 防重入 ========= */
  const inFlight = useRef(null); // 保存當前的 AbortController

  const fetchRightRows = useCallback(
    async (which) => {
      if (!userInfo?.storeId) return;

      // 取消上一個尚未完成的請求
      if (inFlight.current) {
        inFlight.current.abort();
      }
      const controller = new AbortController();
      inFlight.current = controller;

      const storeId = userInfo.storeId;
      const date = todayStr;

      setRightLoading(true);
      setRightError("");
      try {
        let url = "";
        let mapper = (x) => x;
        let params = { storeId, date };

        switch (which) {
          case "門市銷售總金額":
            url = `${API_BASE}/t_ShiftHandoverRecord/GetStoreSalesDetial`;
            mapper = mapSalesDetail;
            break;
          case "POS應有金額":
            url = `${API_BASE}/t_ShiftHandoverRecord/GetStoreSalesRebate`;
            params = { ...params, type: "pos" }; // 若實際不需 type，移除
            mapper = mapPosShouldHave;
            break;
          case "回扣金額":
            url = `${API_BASE}/t_ShiftHandoverRecord/GetStoreSalesRebate`;
            params = { ...params, type: "rebate" }; // 若實際不需 type，移除
            mapper = mapRebate;
            break;
          case "經銷會員收款":
            url = `${API_BASE}/t_ShiftHandoverRecord/GetStoreRepaymentRecords`;
            mapper = mapRepayments;
            break;
          default:
            setRightRows([]);
            setRightLoading(false);
            return;
        }

        const { data } = await axios.get(url, {
          headers: authJsonHeaders(),
          params,
          signal: controller.signal,
        });

        const items = Array.isArray(data) ? data : data?.items || [];
        setRightRows(mapper(items));
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
          // 被主動取消，不顯示錯誤
          return;
        }
        console.error(err);
        const msg = err?.response?.data?.message || "載入明細失敗";
        setRightRows([]);
        setRightError(msg);
      } finally {
        if (!controller.signal.aborted) {
          setRightLoading(false);
          inFlight.current = null;
        }
      }
    },
    [userInfo?.storeId, todayStr]
  );

  /* ========= 初次載入 & detailButton 改變時：抓一次 ========= */
  useEffect(() => {
    fetchRightRows(detailButton);
    // 僅依賴 detailButton / fetchRightRows（已穩定）
  }, [detailButton, fetchRightRows]);

  /* ========= 卡片點擊：同一張卡才強制重抓 ========= */
  const handleCardClick = (which) => {
    if (which === detailButton) {
      fetchRightRows(which); // 同一張卡 → 強制重抓
    } else {
      setDetailButton(which); // 交給 useEffect 去抓一次
    }
  };

  /* ========= 底部總計 ========= */
  const footerTotals = [
    { label: "現金", value: cash },
    { label: "轉帳", value: bankTransfer },
    { label: "支票", value: check },
    { label: "刷卡", value: creditCard },
    { label: "貨到付款", value: cashOnDelivery },
    { label: "超商代收", value: convenienceStoreCollection },
    { label: "賒帳", value: credit },
  ];
  const totalFooterSum = footerTotals.reduce(
    (sum, it) => sum + Number(it.value || 0),
    0
  );

  /* ========= 交班送出 ========= */
  const handleHandoverSubmit = async () => {
    const confirm = await Swal.fire({
      icon: "question",
      title: "確認交班並登出？",
      text: "系統會送出本次交班彙總並登出帳號。",
      showCancelButton: true,
      confirmButtonText: "確認交班",
      cancelButtonText: "再想想",
    });
    if (!confirm.isConfirmed) return;

    try {
      const payload = {
        ...rec,
        id: 0,
        shiftDateTime: new Date().toISOString(),
      };
      await axios.post(`${API_BASE}/t_ShiftHandoverRecord`, payload, {
        headers: authJsonHeaders(),
      });
      await Swal.fire({
        icon: "success",
        title: "交班完成",
        text: "已送出交班紀錄，將登出並回登入頁。",
      });
      localStorage.removeItem("accessToken");
      navigate("/login");
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "交班失敗",
        text: err?.response?.data?.message || "請稍後再試。",
      });
    }
  };

  /* ========= 門市支出（待 API） ========= */
  const storeExpenseCount = 0;

  return (
    <>
      <div className="mx-4">
        {/* 上方機器/人員/門市/時間 */}
        <div className="d-flex mt-3 mb-2 gap-4 flex-wrap">
          <span style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}>
            機器:
            <span className="ms-2" style={{ color: "black" }}>A01</span>
          </span>
          <span style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}>
            工號:
            <span className="ms-2" style={{ color: "black" }}>
              {userInfo?.staffId ?? "—"}
            </span>
          </span>
          <span style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}>
            操作員:
            <span className="ms-2" style={{ color: "black" }}>
              {userInfo?.chineseName ?? "—"}
            </span>
          </span>
          <span style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}>
            門市:
            <span className="ms-2" style={{ color: "black" }}>
              {userInfo?.storeId ?? "—"}
              {userInfo?.storeName ? `（${userInfo.storeName}）` : ""}
            </span>
          </span>
          <span style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}>
            時間:
            <span className="ms-2" style={{ color: "black" }}>{nowText}</span>
          </span>
        </div>

        {/* 主區塊：左 8 欄 四張卡片；右 4 欄 明細表 */}
        <div className="row cards-and-table">
          {/* 左 8 欄 */}
          <div className="col-8 cards-panel">
            <div className="row gy-3">
              <div className="col-6">
                <ShiftChangeCard
                  title="門市銷售總金額"
                  paymentDetails={cardData_storeSales}
                  onclick={() => handleCardClick("門市銷售總金額")}
                />
              </div>
              <div className="col-6">
                <ShiftChangeCard
                  title="POS應有金額"
                  paymentDetails={cardData_posShouldHave}
                  onclick={() => handleCardClick("POS應有金額")}
                />
              </div>
              <div className="col-6">
                <ShiftChangeCard
                  title="回扣金額"
                  paymentDetails={cardData_rebate}
                  onclick={() => handleCardClick("回扣金額")}
                />
              </div>
              <div className="col-6">
                <ShiftChangeCard
                  title="經銷會員收款"
                  paymentDetails={cardData_dealer}
                  onclick={() => handleCardClick("經銷會員收款")}
                />
              </div>
            </div>

            {/* 卡片底部統計 */}
            <div className="stats-bar mt-2">
              <div className="stat-pill">POS作廢訂單數 : {fmt(posCancelOrderCount || 0)}</div>
              <div className="stat-pill">客訴退款訂單數 : {fmt(complaintReturnOrderCount || 0)}</div>
              <div className="stat-pill">門市支出 : {fmt(storeExpenseCount)}</div>
            </div>
          </div>

          {/* 右 4 欄：明細表 */}
          <div className="col-4 table-panel">
            <div className="table-panel-inner">
              <ShiftChangeTable
                rightTable={rightRows}
                loading={rightLoading}
                error={rightError}
                titleHint={detailButton}
              />
            </div>
          </div>
        </div>

        {/* 下方金額總計 */}
        <div className="ms-1 mt-2">
          {[
            { label: "現金", value: cash },
            { label: "轉帳", value: bankTransfer },
            { label: "支票", value: check },
            { label: "刷卡", value: creditCard },
            { label: "貨到付款", value: cashOnDelivery },
            { label: "超商代收", value: convenienceStoreCollection },
            { label: "賒帳", value: credit },
          ].map(({ label, value }) => (
            <span
              key={label}
              style={{ color: "#535353", fontSize: "1.2rem", fontWeight: "bold", marginRight: "2rem" }}
            >
              {label} : <span style={{ color: "black" }}>{fmt(value)} 元</span>
            </span>
          ))}
          <span
            style={{ color: "#535353", fontSize: "1.2rem", fontWeight: "bold", marginRight: "2rem" }}
          >
            回扣點數 : <span style={{ color: "black" }}>{fmt(rebatePoints)} 點</span>
          </span>
        </div>
      </div>

      {/* 固定底欄：交班總結與按鈕 */}
      <div
        className="py-3 px-4 w-100 d-flex align-items-center justify-content-center"
        style={{ background: "#E1E1E1", position: "absolute", bottom: "0", boxShadow: "0 -1px 4px rgba(0,0,0,0.25)" }}
      >
        <div style={{ width: "33%" }}>{loading ? "彙總載入中…" : ""}</div>

        <div style={{ width: "33%", display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleHandoverSubmit}
            disabled={loading}
            style={{
              background: "#D15833",
              height: "5vh",
              color: "white",
              fontWeight: "bold",
              fontSize: "1.3rem",
              paddingInline: "5vw",
              opacity: loading ? 0.6 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            確認交班登出
          </button>
        </div>

        <div style={{ width: "33%", textAlign: "right", fontWeight: "bold", fontSize: "1.4rem", color: "black" }}>
          POS收款總金額 : {fmt(totalFooterSum)} 元
        </div>
      </div>
    </>
  );
}

