import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CheckoutFlow from "./CheckoutFlow/CheckoutFlow";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [currentMember, setCurrentMember] = useState({});
  const [usedPoints, setUsedPoints] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);

  useEffect(() => {
    const savedData = JSON.parse(localStorage.getItem("checkoutData") || "{}");

    if (Array.isArray(savedData.items)) setCartItems(savedData.items);
    if (savedData.member) setCurrentMember(savedData.member);
    if (typeof savedData.usedPoints === "number") setUsedPoints(savedData.usedPoints);
    if (typeof savedData.subtotal === "number") setSubtotal(savedData.subtotal);          // ← 新增
    if (typeof savedData.finalTotal === "number") setFinalTotal(savedData.finalTotal);    // ← 新增
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
          initialSubtotal={subtotal}        // ← 傳進去
          initialFinalTotal={finalTotal}    // ← 傳進去
          onComplete={(result) => {
            navigate("/summary", { state: result });
          }}
        />
      </div>
    </div>
  );
}