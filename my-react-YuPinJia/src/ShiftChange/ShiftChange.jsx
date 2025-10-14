// ShiftChange.jsx
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

// 將金額轉為負數，但 0 不顯示負號
const toNegative = (v) => {
  const n = Number(v) || 0;
  return n === 0 ? 0 : -Math.abs(n);
};

/* ========= Mapper ========= */
function mapSalesDetail(items = []) {
  return items.map((it) => ({
    id: it.orderNumber || it.id || "-",
    date: (it.createdAt || "").toString().slice(11, 16) || "--:--",
    total: it.totalQuantity ?? 0,
    totalMoney: Number(it.totalAmount ?? 0).toLocaleString(),
    payMethod: it.paymentMethod || "-",
  }));
}

/**
 * POS應有金額（右側表格明細）
 * 你提供的 API：GET /t_ShiftHandoverRecord/GetStorePOSDetial
 * 格式：
 *   { orderNumber, createdAt, totalQuantity, totalAmount, paymentMethod }，其中 paymentMethod 可能是「銷售」或「退款」
 * 規則：
 *   - 遇到「退款/支出」→ 金額顯示負數，但 0 仍顯示 0
 *   - 其餘（銷售等）保持正數
 */
function mapPosShouldHave(items = []) {
  return items
    .map((it) => {
      const label = it.paymentMethod || it.label || it.itemName || it.categoryName || "項目";
      let amount = Number(it.totalAmount ?? it.amount ?? 0) || 0;

      // 退款/支出 → 顯示負數（但 0 顯示 0）
      if (/(退款|refund|支出|expense|outflow|現金支出)/i.test(label)) {
        amount = amount === 0 ? 0 : -Math.abs(amount);
      }

      return {
        id: it.orderNumber || it.id || "-",
        date: (it.createdAt || it.time || it.updatedAt || "").toString().slice(11, 16) || "--:--",
        total: it.totalQuantity ?? "-", // 沒有數量就顯示 "—"
        totalMoney: amount.toLocaleString(),
        payMethod: label,
        _ts: new Date(it.createdAt || it.updatedAt || Date.now()).getTime() || 0, // 排序用
      };
    })
    // 新到舊
    .sort((a, b) => b._ts - a._ts)
    .map(({ _ts, ...rest }) => rest);
}

function mapRebate(items = []) {
  return items.map((it) => ({
    id: it.orderNumber || it.id || "-",
    date: (it.createdAt || it.date || "").toString().slice(11, 16) || "--:--",
    total: it.itemCount ?? 1,
    totalMoney: Number(it.rebateAmount ?? it.totalAmount ?? 0).toLocaleString(),
    payMethod: "回扣",
  }));
}

function mapRepayments(items = []) {
  return items.map((it) => ({
    id: it.repaymentNo || it.id || "-",
    date: (it.createdAt || it.repaymentDate || "").toString().slice(11, 16) || "--:--",
    total: "-",
    totalMoney: Number(it.amount ?? 0).toLocaleString(),
    payMethod: it.methodName || it.payMethod || "還款",
  }));
}

export default function ShiftChange() {
  const navigate = useNavigate();
  const [detailButton, setDetailButton] = useState("門市銷售總金額");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const [rightRows, setRightRows] = useState([]);
  const [rightLoading, setRightLoading] = useState(false);
  const [rightError, setRightError] = useState("");

  const [userInfo, setUserInfo] = useState(null);
  const [nowText, setNowText] = useState(new Date().toLocaleString());

  useEffect(() => {
    const t = setInterval(() => setNowText(new Date().toLocaleString()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/Account/userInfo`, {
          headers: authJsonHeaders(),
        });
        const u = res?.data?.user || null;
        setUserInfo(u);
        localStorage.setItem("userInfo", JSON.stringify(u));
      } catch {
        const cached = localStorage.getItem("userInfo");
        if (cached) setUserInfo(JSON.parse(cached));
        else {
          setUserInfo({
            id: 1,
            staffId: 1,
            chineseName: "一二三",
            storeId: 1,
            storeName: "馬公門市",
          });
        }
      }
    })();
  }, []);

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
        Swal.fire({ icon: "error", title: "讀取失敗", text: "無法取得交班彙總資料。" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rec = summary?.shiftHandoverRecord || {};
  const {
    salesCash = 0, salesBankTransfer = 0, salesCreditCard = 0, salesOnDelivery = 0, salesConvenienceStoreCollection = 0, salesCredit = 0,
    cashOrderPayment = 0, cashCreditSettlement = 0, cashRefund = 0, cashRedeemWithdraw = 0, cashOutflow = 0,
    rebateOrderAmount = 0, rebateCount = 0, totalRebatePoints = 0, rebatePoints = 0,
    dealerRepaymentCash = 0, dealerRepaymentCard = 0, dealerRepaymentTransfer = 0, dealerRepaymentOther = 0,
    cash = 0, bankTransfer = 0, check = 0, creditCard = 0, cashOnDelivery = 0, convenienceStoreCollection = 0, credit = 0,
    posCancelOrderCount = 0, complaintReturnOrderCount = 0,
  } = rec;

  const cardData_storeSales = useMemo(() => ({
    methods: [
      [{ label: "現金", amount: salesCash }, { label: "貨到付款", amount: salesOnDelivery }],
      [{ label: "轉帳", amount: salesBankTransfer }, { label: "賒帳", amount: salesCredit }],
      [{ label: "刷卡", amount: salesCreditCard }],
    ],
  }), [salesCash, salesOnDelivery, salesBankTransfer, salesCreditCard, salesCredit]);

  // POS 應有金額卡片：現金支出 & 現金退款 顯示負數，0 不負
  const cardData_posShouldHave = useMemo(() => {
    return {
      methods: [
        [{ label: "銷售訂單現金", amount: cashOrderPayment }, { label: "傭金提現", amount: cashRedeemWithdraw }],
        [{ label: "賒帳結帳現金", amount: cashCreditSettlement }, { label: "現金支出", amount: toNegative(cashOutflow) }],
        [{ label: "現金退款", amount: toNegative(cashRefund) }],
      ],
    };
  }, [cashOrderPayment, cashRedeemWithdraw, cashCreditSettlement, cashOutflow, cashRefund]);

  const cardData_rebate = useMemo(() => ({
    methods: [
      [{ label: "回扣訂單金額", amount: rebateOrderAmount, unit: "元" }],
      [{ label: "回扣筆數", amount: rebateCount, unit: "筆" }],
      [{ label: "回扣點數", amount: totalRebatePoints, unit: "點" }],
    ],
  }), [rebateOrderAmount, rebateCount, totalRebatePoints]);

  const cardData_dealer = useMemo(() => ({
    methods: [
      [{ label: "賒帳收款現金", amount: dealerRepaymentCash }, { label: "賒帳還款轉帳", amount: dealerRepaymentTransfer }],
      [{ label: "賒帳收款刷卡", amount: dealerRepaymentCard }, { label: "賒帳還款其他", amount: dealerRepaymentOther }],
    ],
  }), [dealerRepaymentCash, dealerRepaymentTransfer, dealerRepaymentCard, dealerRepaymentOther]);

  const inFlight = useRef(null);

  // 明細查詢：四條 API、完全不帶查詢參數
  const fetchRightRows = useCallback(async (which) => {
    if (inFlight.current) inFlight.current.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setRightLoading(true);
    setRightError("");
    try {
      let url = "";
      let mapper = (x) => x;

      switch (which) {
        case "門市銷售總金額":
          url = `${API_BASE}/t_ShiftHandoverRecord/GetStoreSalesDetial`;
          mapper = mapSalesDetail;
          break;
        case "POS應有金額":
          url = `${API_BASE}/t_ShiftHandoverRecord/GetStorePOSDetial`;
          mapper = mapPosShouldHave; // ← 依照你提供的格式做 mapping
          break;
        case "回扣金額":
          url = `${API_BASE}/t_ShiftHandoverRecord/GetStoreSalesRebate`;
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
        signal: controller.signal,
      });

      const items = Array.isArray(data) ? data : data?.items || [];
      setRightRows(mapper(items));
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
      console.error(err);
      setRightRows([]);
      setRightError(err?.response?.data?.message || "載入明細失敗");
    } finally {
      if (!controller.signal.aborted) {
        setRightLoading(false);
        inFlight.current = null;
      }
    }
  }, []);

  useEffect(() => { fetchRightRows(detailButton); }, [detailButton, fetchRightRows]);

  const handleCardClick = (which) => {
    if (which === detailButton) fetchRightRows(which);
    else setDetailButton(which);
  };

  const machineCode = useMemo(() => localStorage.getItem("machineCode") || "A01", []);

  const footerTotals = [
    { label: "現金", value: cash },
    { label: "轉帳", value: bankTransfer },
    { label: "支票", value: check },
    { label: "刷卡", value: creditCard },
    { label: "貨到付款", value: cashOnDelivery },
    { label: "超商代收", value: convenienceStoreCollection },
    { label: "賒帳", value: credit },
  ];
  const totalFooterSum = footerTotals.reduce((sum, it) => sum + Number(it.value || 0), 0);

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
      const payload = { ...rec, id: 0, shiftDateTime: new Date().toISOString() };
      await axios.post(`${API_BASE}/t_ShiftHandoverRecord`, payload, { headers: authJsonHeaders() });
      await Swal.fire({ icon: "success", title: "交班完成", text: "已送出交班紀錄，將登出並回登入頁。" });
      localStorage.removeItem("accessToken");
      navigate("/login");
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "交班失敗", text: err?.response?.data?.message || "請稍後再試。" });
    }
  };

  return (
    <>
      <div className="mx-4">
        {/* 頂部資訊列 */}
        <div className="top-meta-bar d-flex mt-3 mb-2 gap-3 flex-wrap">
          <span className="meta-item">機器：<strong>{machineCode}</strong></span>
          <span className="meta-item">工號：<strong>{userInfo?.staffId ?? "—"}</strong></span>
          <span className="meta-item">操作員：<strong>{userInfo?.chineseName ?? "—"}</strong></span>
          <span className="meta-item">門市：<strong>{userInfo?.storeName || ""}</strong></span>
          <span className="meta-item">時間：<strong>{nowText}</strong></span>
        </div>

        {/* 主區塊 */}
        <div className="row cards-and-table">
          {/* 左 8 欄 */}
          <div className="col-8 cards-panel">
            <div className="row gy-3">
              <div className="col-6">
                <ShiftChangeCard title="門市銷售總金額" paymentDetails={cardData_storeSales} onclick={() => handleCardClick("門市銷售總金額")} />
              </div>
              <div className="col-6">
                <ShiftChangeCard title="POS應有金額" paymentDetails={cardData_posShouldHave} onclick={() => handleCardClick("POS應有金額")} />
              </div>
              <div className="col-6">
                <ShiftChangeCard title="回扣金額" paymentDetails={cardData_rebate} onclick={() => handleCardClick("回扣金額")} />
              </div>
              <div className="col-6">
                <ShiftChangeCard title="經銷會員收款" paymentDetails={cardData_dealer} onclick={() => handleCardClick("經銷會員收款")} />
              </div>
            </div>

            {/* 底部統計膠囊 */}
            <div className="stats-bar mt-2">
              <div className="stat-pill stat-soft">POS作廢訂單數：{fmt(posCancelOrderCount || 0)}</div>
              <div className="stat-pill stat-soft">客訴退款訂單數：{fmt(complaintReturnOrderCount || 0)}</div>
              <div className="stat-pill stat-soft">門市支出：{fmt(Number(cashOutflow || 0))} 元</div>
            </div>
          </div>

          {/* 右 4 欄 */}
          <div className="col-4 table-panel">
            <div className="table-panel-inner surface-card">
              <div className="sc-table">
                <ShiftChangeTable
                  rightTable={rightRows}
                  loading={rightLoading}
                  error={rightError}
                  titleHint={detailButton}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 下方金額總計 */}
        <div className="totals-row ms-1 mt-2">
          {footerTotals.map(({ label, value }) => (
            <span key={label} className="total-chip">
              {label}：<strong>{fmt(value)} 元</strong>
            </span>
          ))}
          <span className="total-chip">回扣點數：<strong>{fmt(rebatePoints)} 點</strong></span>
        </div>
      </div>

      {/* 固定底欄 */}
      <div className="handover-footer handover-footer--with-sidebar">
        <div className="footer-left">{loading ? "彙總載入中…" : ""}</div>
        <div className="footer-center">
          <button onClick={handleHandoverSubmit} disabled={loading} className="btn-primary-compact">
            確認交班登出
          </button>
        </div>
        <div className="footer-right">
          POS收款總金額：<strong>{fmt(totalFooterSum)} 元</strong>
        </div>
      </div>
      <div className="handover-footer-spacer" />
    </>
  );
}
