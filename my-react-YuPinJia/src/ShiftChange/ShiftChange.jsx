import ShiftChangeCard from "../components/ShiftChangeCard";
import "../components/ShiftChangeCard.css";

export default function ShiftChange() {
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
            />
            <ShiftChangeCard
              title="POS退款總金額"
              paymentDetails={exampleData1}
            />
            <ShiftChangeCard
              title="POS應有金額"
              paymentDetails={exampleData2}
            />
          </div>

          <div className="col-4">
            <ShiftChangeCard
              title="銷售訂單總金額"
              paymentDetails={exampleData3}
            />
            <ShiftChangeCard
              title="經銷會員收款"
              paymentDetails={exampleData4}
            />
            <div className="redContainer">
              <div className="redContent">POS作廢訂單數 : 6</div>
              <div className="redContent">未包裝訂單數 : 0</div>
              <div className="redContent">POS作廢訂單數 : 0</div>
            </div>
          </div>

          {/* 右邊表格列表 */}
          <div className="col-4">
            <div
              className="ms-2 me-2"
              style={{
                height: "69vh", // ✅ 根據你的 layout 高度調整
                border: "1px solid #c5c6c7",
                display: "flex",
                flexDirection: "column",
                background: "white",
              }}
            >
              <div style={{ overflowY: "auto", flex: 1 }}>
                <table
                  className="table mb-0"
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    tableLayout: "fixed",
                    width: "100%",
                  }}
                >
                  <thead
                    className="table-light"
                    style={{ position: "sticky", top: 0, zIndex: 1 }}
                  >
                    <tr>
                      <th className="text-center">訂單編號</th>
                      <th className="text-center">交易時間</th>
                      <th className="text-center">總數</th>
                      <th className="text-center">總金額</th>
                      <th className="text-center">付款方式</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="text-center">113A1251</td>
                      <td className="text-center">
                        113-01-25
                        <br />
                        12:10:05
                      </td>
                      <td className="text-center">8</td>
                      <td className="text-center">1,450</td>
                      <td className="text-center">現金</td>
                    </tr>
                    <tr>
                      <td className="text-center">113A1255</td>
                      <td className="text-center">
                        113-01-25
                        <br />
                        13:10:05
                      </td>
                      <td className="text-center">7</td>
                      <td className="text-center">1,100</td>
                      <td className="text-center">現金</td>
                    </tr>
                    <tr>
                      <td className="text-center">113A1255</td>
                      <td className="text-center">
                        113-01-25
                        <br />
                        13:10:05
                      </td>
                      <td className="text-center">7</td>
                      <td className="text-center">1,100</td>
                      <td className="text-center">貨到付款</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        {/* 下方金額總計 */}
        <div className="ms-1">
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
        className="py-2 px-4 w-100 d-flex align-items-center justify-content-center"
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
            fontSize: "1.3rem",
            color: "black",
          }}
        >
          POS收款總金額 : 15420 元
        </div>
      </div>
    </>
  );
}
