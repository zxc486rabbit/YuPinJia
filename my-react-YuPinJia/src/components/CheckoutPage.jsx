import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CheckoutFlow from "../components/CheckoutFlow";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [currentMember, setCurrentMember] = useState({});
  const [usedPoints, setUsedPoints] = useState(0);

useEffect(() => {
  const savedData = JSON.parse(localStorage.getItem("checkoutData") || "{}");

  // console.log("🚀 checkoutData:", savedData); // ✅ 觀察這邊是否有 contactPhone

  if (Array.isArray(savedData.items)) {
    setCartItems(savedData.items);
  }
  if (savedData.member) {
    setCurrentMember(savedData.member); // 👈 這裡 savedData.member 應該要包含 contactPhone
  }
  if (typeof savedData.usedPoints === "number") {
    setUsedPoints(savedData.usedPoints);
  }
}, []);

  return (
    <div>
      <div
        style={{
          backgroundColor: "#3d3938",
          color: "#fff",
          padding: "12px 20px",
          fontSize: "1.4rem",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        結帳頁面
      </div>

      <div style={{ padding: "20px" }}>
        <CheckoutFlow
          cartItems={cartItems}
          currentMember={currentMember}
          usedPoints={usedPoints}
          onComplete={(result) => {
            navigate("/summary", { state: result });
          }}
        />
      </div>
    </div>
  );
}
