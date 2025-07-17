import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CheckoutFlow from "../components/CheckoutFlow";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const savedData = JSON.parse(localStorage.getItem("checkoutData") || "{}");
    if (Array.isArray(savedData.items)) {
      setCartItems(savedData.items);
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
          onComplete={(result) => {
            navigate("/summary", { state: result });
          }}
        />
      </div>
    </div>
  );
}