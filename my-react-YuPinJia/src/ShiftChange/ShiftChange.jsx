import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

import ShiftChangeCard from "../components/ShiftChangeCard";
import "../components/ShiftChangeCard.css";
import ShiftChangeTable from "../components/ShiftChangeTable";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

// 附上 Bearer Token
function authJsonHeaders() {
  const h = { "Content-Type": "application/json", Accept: "application/json" };
  const token = localStorage.getItem("accessToken");
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

const fmt = (n) => Number(n || 0).toLocaleString();

export default function ShiftChange() {
  const navigate = useNavigate();

  const [detailButton, setDetailButton] = useState("門市銷售總金額");
  const [summary, setSummary] = useState(null); // ← 這裡會是整個回傳：{ shiftHandoverRecord, ...Ids }
  const [loading, setLoading] = useState(false);

  // 方便取用：實際數值都在 rec（shiftHandoverRecord）裡
  const rec = summary?.shiftHandoverRecord || {};

  // ===== Demo：右側列表資料（若後端未提供細單 API，暫留靜態） =====
  const rightTable = [
    {
      id: "113A1251",
      date: "12:10",
      total: "8",
      totalMoney: "1,450",
      payMethod: "現金",
    },
    {
      id: "113A1252",
      date: "12:15",
      total: "5",
      totalMoney: "980",
      payMethod: "匯款",
    },
    {
      id: "113A1253",
      date: "12:20",
      total: "3",
      totalMoney: "600",
      payMethod: "現金",
    },
    {
      id: "113A1260",
      date: "13:10",
      total: "2",
      totalMoney: "300",
      payMethod: "現金",
    },
  ];
  const rightTable2 = [
    {
      id: "113A1256",
      date: "12:40",
      total: "10",
      totalMoney: "1,980",
      payMethod: "現金",
    },
    {
      id: "113A1257",
      date: "12:45",
      total: "6",
      totalMoney: "1,250",
      payMethod: "轉帳",
    },
    {
      id: "113A1261",
      date: "13:15",
      total: "11",
      totalMoney: "2,150",
      payMethod: "現金",
    },
  ];
  const rightTable3 = [
    {
      id: "113A2001",
      date: "13:00",
      total: "4",
      totalMoney: "720",
      payMethod: "現金回扣",
    },
    {
      id: "113A2002",
      date: "13:05",
      total: "9",
      totalMoney: "1,680",
      payMethod: "轉帳回扣",
    },
  ];
  const rightTable4 = [
    {
      id: "113A3001",
      date: "13:15",
      total: "11",
      totalMoney: "2,150",
      payMethod: "匯款",
    },
  ];

  const getCurrentTableData = () => {
    switch (detailButton) {
      case "門市銷售總金額":
        return rightTable;
      case "POS應有金額":
        return rightTable2;
      case "回扣金額":
        return rightTable3;
      case "經銷會員收款":
        return rightTable4;
      default:
        return [];
    }
  };

  // 讀交班彙總（新版：外層包 shiftHandoverRecord + 五個 Id list）
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

  // 將 rec（shiftHandoverRecord）映射到四張卡片
  const {
    // 門市銷售總金額（各支付別）
    salesCash = 0,
    salesBankTransfer = 0,
    salesCreditCard = 0,
    salesOnDelivery = 0,
    salesConvenienceStoreCollection = 0,
    salesCredit = 0,

    // POS 應有金額（現金流）
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

    // 底部總計（整體收款）
    cash = 0,
    bankTransfer = 0,
    check = 0,
    creditCard = 0,
    cashOnDelivery = 0,
    convenienceStoreCollection = 0,
    credit = 0,

    // 其他顯示資訊
    storeId,
    giverStaffId,
    receiverStaffId,
    shiftDateTime,
    posCancelOrderCount = 0,
    complaintReturnOrderCount = 0,
  } = rec;

  const cardData_storeSales = useMemo(
    () => ({
      methods: [
        [
          { label: "現金", amount: salesCash },
          { label: "貨到付款", amount: salesOnDelivery },
        ],
        [
          { label: "轉帳", amount: salesBankTransfer },
          // { label: "超商代收", amount: salesConvenienceStoreCollection },
          { label: "賒帳", amount: salesCredit },
        ],
        [{ label: "刷卡", amount: salesCreditCard }],
      ],
    }),
    [
      salesCash,
      salesOnDelivery,
      salesBankTransfer,
      salesConvenienceStoreCollection,
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

  // ★ 依你的需求，讓回扣筆數/點數看起來不要像金額（可在卡片內顯示單位）
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

  // 底部總計使用後端彙總欄位（避免自行加總誤差）
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

  // 交班送出（新版：以扁平 rec 為 payload；若後端仍需五個清單，可一併送出）
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
      // 扁平的交接班資料（以後端扁平 schema 為準）
      const handoverPayload = {
        ...rec,
        id: 0,
        // 你要用後端回來的時間就用 rec.shiftDateTime；要用當下，就覆蓋：
        shiftDateTime: new Date().toISOString(),
      };

      // 若後端「新增時要把 List<int> 帶回來」，就把以下也附上；
      // 如果呼叫後回 400，請移除這些 Ids 再試。
      const maybeIdLists = {
        shiftSaleOrderIds: summary?.shiftSaleOrderIds ?? [],
        repaymentRecordIds: summary?.repaymentRecordIds ?? [],
        returnOrderIds: summary?.returnOrderIds ?? [],
        complaintIds: summary?.complaintIds ?? [],
        accountRecordIds: summary?.accountRecordIds ?? [],
      };

      const payload = { ...handoverPayload, ...maybeIdLists };

      await axios.post(`${API_BASE}/t_ShiftHandoverRecord`, payload, {
        headers: authJsonHeaders(),
      });

      await Swal.fire({
        icon: "success",
        title: "交班完成",
        text: "已成功送出交班紀錄，將登出並回到登入頁。",
      });

      // 登出
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

  return (
    <>
      <div className="mx-4">
        {/* 上方機器資訊（新版欄位） */}
        <div className="d-flex mt-3 mb-2 gap-4">
          <span
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            機器:
            <span className="ms-2" style={{ color: "black" }}>
              A01
            </span>
          </span>
          <span
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            工號:
            <span className="ms-2" style={{ color: "black" }}>
              {giverStaffId ?? "—"}
            </span>
          </span>
          <span
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            操作員:
            <span className="ms-2" style={{ color: "black" }}>
              —
            </span>
          </span>
          <span
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            門市:
            <span className="ms-2" style={{ color: "black" }}>
              {storeId ?? "—"}
            </span>
          </span>
          <span
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            時間:
            <span className="ms-2" style={{ color: "black" }}>
              {shiftDateTime ? new Date(shiftDateTime).toLocaleString() : "—"}
            </span>
          </span>
        </div>

        {/* 下方資訊欄 */}
        <div className="row">
          {/* 左側兩張 */}
          <div className="col-4">
            <ShiftChangeCard
              title="門市銷售總金額"
              paymentDetails={cardData_storeSales}
              onclick={() => setDetailButton("門市銷售總金額")}
            />
            <ShiftChangeCard
              title="POS應有金額"
              paymentDetails={cardData_posShouldHave}
              onclick={() => setDetailButton("POS應有金額")}
            />
          </div>

          {/* 中間兩張 */}
          <div className="col-4">
            <ShiftChangeCard
              title="回扣金額"
              paymentDetails={cardData_rebate}
              onclick={() => setDetailButton("回扣金額")}
            />
            <ShiftChangeCard
              title="經銷會員收款"
              paymentDetails={cardData_dealer}
              onclick={() => setDetailButton("經銷會員收款")}
            />
            <div className="redContainer">
              <div className="redContent">
                POS作廢訂單數 : {fmt(posCancelOrderCount)}
              </div>
              <div className="redContent my-2">
                客訴退款訂單數 : {fmt(complaintReturnOrderCount)}
              </div>
              <div className="redContent">尚無 : 0</div>
            </div>
          </div>

          {/* 右邊表格列表（若你之後有細項 API，可在此改為動態） */}
          <div className="col-4">
            <ShiftChangeTable rightTable={getCurrentTableData()} />
          </div>
        </div>

        {/* 下方金額總計：直接使用後端彙總欄位 */}
        <div className="ms-1">
          {footerTotals.map(({ label, value }) => (
            <span
              key={label}
              style={{
                color: "#535353",
                fontSize: "1.2rem",
                fontWeight: "bold",
                marginRight: "2rem",
              }}
            >
              {label} : <span style={{ color: "black" }}>{fmt(value)} 元</span>
            </span>
          ))}

          {/* 新增：回扣點數（非金額，不加「元」） */}
          <span
            style={{
              color: "#535353",
              fontSize: "1.2rem",
              fontWeight: "bold",
              marginRight: "2rem",
            }}
          >
            回扣點數 :{" "}
            <span style={{ color: "black" }}>{fmt(rebatePoints)} 點</span>
          </span>
        </div>
      </div>

      {/* 最下方按鈕及總金額區塊 */}
      <div
        className="py-3 px-4 w-100 d-flex align-items-center justify-content-center"
        style={{
          background: "#E1E1E1",
          position: "absolute",
          bottom: "0",
          boxShadow: "0 -1px 4px rgba(0,0,0,0.25)",
        }}
      >
        {/* 左側空區塊（佔空間用） */}
        <div style={{ width: "33%" }}>{loading ? "彙總載入中…" : ""}</div>

        {/* 中間按鈕 */}
        <div
          style={{ width: "33%", display: "flex", justifyContent: "center" }}
        >
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

        {/* 右側文字（以底部總計合計） */}
        <div
          style={{
            width: "33%",
            textAlign: "right",
            fontWeight: "bold",
            fontSize: "1.4rem",
            color: "black",
          }}
        >
          POS收款總金額 : {fmt(totalFooterSum)} 元
        </div>
      </div>
    </>
  );
}
