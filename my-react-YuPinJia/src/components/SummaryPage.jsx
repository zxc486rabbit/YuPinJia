import { useLocation, useNavigate } from "react-router-dom";

export default function SummaryPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <p>沒有找到結帳資料</p>
        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          回首頁
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fa",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "8px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <h3 style={{ textAlign: "center", marginBottom: "20px" }}>結帳明細</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li style={{ marginBottom: "10px" }}>
            <strong>配送方式：</strong> {state.delivery}
          </li>
          <li style={{ marginBottom: "10px" }}>
            <strong>付款方式：</strong> {state.payment}
          </li>
          <li>
            <strong>發票載具：</strong> {state.carrier}
          </li>
        </ul>

        <button
          onClick={() => navigate("/")}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "10px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
          }}
        >
          回首頁
        </button>
      </div>
    </div>
  );
}