import { useState } from "react";
import ShiftChangeCard from "../components/ShiftChangeCard";
import "../components/ShiftChangeCard.css";
import ShiftChangeTable from "../components/ShiftChangeTable";

export default function ShiftChange() {
  const [detailButton, setDetailButton] = useState("門市銷售總金額");
  const rightTable = [
    {
      id: "113A1251",
      date: "12:10:05",
      total: "8",
      totalMoney: "1,450",
      payMethod: "現金",
    },
    {
      id: "113A1252",
      date: "12:15:10",
      total: "5",
      totalMoney: "980",
      payMethod: "匯款",
    },
    {
      id: "113A1253",
      date: "12:20:00",
      total: "3",
      totalMoney: "600",
      payMethod: "現金",
    },
    {
      id: "113A1260",
      date: "13:10:50",
      total: "2",
      totalMoney: "300",
      payMethod: "現金",
    },
  ];
  const rightTable1 = [
    {
      id: "113A1251",
      date: "12:10:05",
      total: "80",
      totalMoney: "1,450",
      payMethod: "匯款",
    },
    {
      id: "113A1254",
      date: "12:30:45",
      total: "12",
      totalMoney: "2,340",
      payMethod: "信用卡",
    },
    {
      id: "113A1255",
      date: "12:32:20",
      total: "7",
      totalMoney: "1,500",
      payMethod: "現金",
    },
  ];
  const rightTable2 = [
    {
      id: "113A1256",
      date: "12:40:30",
      total: "10",
      totalMoney: "1,980",
      payMethod: "Line Pay",
    },
    {
      id: "113A1257",
      date: "12:45:10",
      total: "6",
      totalMoney: "1,250",
      payMethod: "街口支付",
    },
    {
      id: "113A1261",
      date: "13:15:00",
      total: "11",
      totalMoney: "2,150",
      payMethod: "匯款",
    },
  ];

  const rightTable3 = [
    {
      id: "113A1258",
      date: "13:00:00",
      total: "4",
      totalMoney: "720",
      payMethod: "悠遊付",
    },
    {
      id: "113A1259",
      date: "13:05:15",
      total: "9",
      totalMoney: "1,680",
      payMethod: "信用卡",
    },
  ];
  const rightTable4 = [
    {
      id: "113A1261",
      date: "13:15:00",
      total: "11",
      totalMoney: "2,150",
      payMethod: "匯款",
    },
  ];

  // 根據 detailButton 的值選擇資料
  const getCurrentTableData = () => {
    switch (detailButton) {
      case "門市銷售總金額":
        return rightTable;
      case "POS退款總金額":
        return rightTable1;
      case "POS應有金額":
        return rightTable2;
      case "銷售訂單總金額":
        return rightTable3;
      case "經銷會員收款":
        return rightTable4;
    }
  };

  // 門市銷售總金額
  const exampleData = {
    methods: [
      [
        { label: "現金", amount: 7580 },
        { label: "貨到付款", amount: 80 },
      ],
      [
        { label: "轉帳", amount: 0 },
        { label: "超商代收", amount: 0 },
      ],
      [
        { label: "刷卡", amount: 0 },
        { label: "賒帳", amount: 0 },
      ],
    ],
  };
  // POS退款總金額
  const exampleData1 = {
    methods: [
      [
        { label: "現金", amount: 260 },
        { label: "賒帳", amount: 50 },
      ],
      [{ label: "轉帳", amount: 0 }],
      [{ label: "刷卡", amount: 0 }],
    ],
  };
  // POS應有金額
  const exampleData2 = {
    methods: [
      [
        { label: "銷售訂單現金", amount: 5000 },
        { label: "傭金提現", amount: 0 },
      ],
      [
        { label: "賒帳結帳現金", amount: 0 },
        { label: "現金支出", amount: 0 },
      ],
      [{ label: "現金退款", amount: 150 }],
    ],
  };
  // 銷售訂單總金額
  const exampleData3 = {
    methods: [
      [
        { label: "現金", amount: 7580 },
        { label: "貨到付款", amount: 0 },
      ],
      [
        { label: "轉帳", amount: 1800 },
        { label: "超商代收", amount: 600 },
      ],
      [
        { label: "刷卡", amount: 5000 },
        { label: "賒帳", amount: 0 },
      ],
    ],
  };
  // 經銷會員收款
  const exampleData4 = {
    methods: [
      [
        { label: "賒帳收款現金", amount: 1280 },
        { label: "賒帳還款轉帳", amount: 0 },
      ],
      [
        { label: "賒帳收款刷卡", amount: 0 },
        { label: "賒帳還款支票", amount: 0 },
      ],
    ],
  };

  const allData = [
    exampleData,
    exampleData1,
    exampleData2,
    exampleData3,
    exampleData4,
  ];

  // 把所有 payment 方法合併平坦化
  const allMethods = allData.flatMap((data) => data.methods.flat());

  // 加總每個 label 的 amount
  const totalByLabel = allMethods.reduce((acc, item) => {
    if (!acc[item.label]) {
      acc[item.label] = 0;
    }
    acc[item.label] += item.amount;
    return acc;
  }, {});

  return (
    <>
      <div className="mx-4">
        {/* 上方機器資訊 */}
        <div className="d-flex mt-3 gap-5">
          <p
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            機器:
            <span className="ms-2" style={{ color: "black" }}>
              A01
            </span>
          </p>
          <p
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            工號:
            <span className="ms-2" style={{ color: "black" }}>
              15
            </span>
          </p>
          <p
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            操作員:
            <span className="ms-2" style={{ color: "black" }}>
              郭采潔
            </span>
          </p>
          <p
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            門市:
            <span className="ms-2" style={{ color: "black" }}>
              馬公門市
            </span>
          </p>
          <p
            style={{ color: "#535353", fontSize: "1.1rem", fontWeight: "bold" }}
          >
            時間:
            <span className="ms-2" style={{ color: "black" }}>
              2024-01-25 / 12:30:55
            </span>
          </p>
        </div>
        {/* 下方資訊欄 */}
        <div className="row">
          <div className="col-4">
            <ShiftChangeCard
              title="門市銷售總金額"
              paymentDetails={exampleData}
              onclick={() => {
                console.log(`點擊了：${detailButton}`);
                setDetailButton("門市銷售總金額");
              }}
            />
            <ShiftChangeCard
              title="POS退款總金額"
              paymentDetails={exampleData1}
              onclick={() => {
                console.log(`點擊了：${detailButton}`);
                setDetailButton("POS退款總金額");
              }}
            />
            <ShiftChangeCard
              title="POS應有金額"
              paymentDetails={exampleData2}
              onclick={() => {
                console.log(`點擊了：${detailButton}`);
                setDetailButton("POS應有金額");
              }}
            />
          </div>

          <div className="col-4">
            <ShiftChangeCard
              title="銷售訂單總金額"
              paymentDetails={exampleData3}
              onclick={() => {
                console.log(`點擊了：${detailButton}`);
                setDetailButton("銷售訂單總金額");
              }}
            />
            <ShiftChangeCard
              title="經銷會員收款"
              paymentDetails={exampleData4}
              onclick={() => {
                console.log(`點擊了：${detailButton}`);
                setDetailButton("經銷會員收款");
              }}
            />
            <div className="redContainer">
              <div className="redContent">POS作廢訂單數 : 6</div>
              <div className="redContent">未包裝訂單數 : 0</div>
              <div className="redContent">POS作廢訂單數 : 0</div>
            </div>
          </div>

          {/* 右邊表格列表 */}
          <div className="col-4">
            <ShiftChangeTable rightTable={getCurrentTableData()} />
          </div>
        </div>
        {/* 下方金額總計 */}
        <div className="ms-1 mt-2">
          {["現金", "轉帳", "支票", "刷卡", "貨到付款", "超商代收", "賒帳"].map(
            (label) => (
              <span
                key={label}
                style={{
                  color: "#535353",
                  fontSize: "1.4rem",
                  fontWeight: "bold",
                  marginRight: "2rem",
                }}
              >
                {label} :{" "}
                <span style={{ color: "black" }}>
                  {" "}
                  {totalByLabel[label] ?? 0} 元{" "}
                </span>
              </span>
            )
          )}
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
        <div style={{ width: "33%" }}></div>
        {/* 中間按鈕 */}
        <div
          style={{ width: "33%", display: "flex", justifyContent: "center" }}
        >
          <button
            style={{
              background: "#D15833",
              height: "5vh",
              color: "white",
              fontWeight: "bold",
              fontSize: "1.3rem",
              paddingInline: "5vw",
            }}
          >
            確認交班登出
          </button>
        </div>
        {/* 右側文字 */}
        <div
          style={{
            width: "33%",
            textAlign: "right",
            fontWeight: "bold",
            fontSize: "1.5rem",
            color: "black",
          }}
        >
          POS收款總金額 : 15420 元
        </div>
      </div>
    </>
  );
}
