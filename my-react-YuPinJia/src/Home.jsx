import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cart from "./components/Cart";
import Navbar from "./components/Navbar";
import CardTable from "./components/CardTable";
import Card from "./components/Card";
import NewArrivalTable from "./components/NewArrivalTable";
import GiftTable from "./components/GiftTable";

export default function Home({ products = [] }) {
  const [activeTab, setActiveTab] = useState("熱銷排行");
  const [cartItems, setCartItems] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [highlightedProductId, setHighlightedProductId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  const [cartSummary, setCartSummary] = useState({
    subtotal: 0,
    usedPoints: 0,
    finalTotal: 0,
  });

  const [isGuideSelf, setIsGuideSelf] = useState(false);

  useEffect(() => {
    fetch("/member.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setMembers(data);
          setCurrentMember(data[0]);
        }
      })
      .catch((err) => {
        console.error("載入會員資料失敗:", err);
      });
  }, []);

  const handleSearch = (serial) => {
    if (!serial.trim()) {
      setHighlightedProductId(null);
      setSuggestions([]);
      return;
    }

    const matched = products.filter((p) =>
      p.serialNumber.toLowerCase().includes(serial.trim().toLowerCase())
    );

    if (
      matched.length === 1 &&
      matched[0].serialNumber.toLowerCase() === serial.trim().toLowerCase()
    ) {
      setHighlightedProductId(matched[0].id);
      setSuggestions([]);
    } else {
      setHighlightedProductId(null);
      setSuggestions(matched);
    }
  };

  const addToCart = (product) => {
    const qty = product.quantity || 1;
    setCartItems((prev) => {
      const exist = prev.find((p) => p.id === product.id);
      if (exist) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + qty } : p
        );
      }
      return [
        ...prev,
        {
          ...product,
          quantity: qty,
          unitPrice: parseFloat(
            product.unitPrice ??
              product.price
                ?.toString()
                .replace(/[^\d.]/g, "")
                .replace(/,/g, "")
          ),
        },
      ];
    });
  };

  const updateQuantity = (id, quantity, forceAdd = false, fullItem = null) => {
    if (id === "__CLEAR__") {
      setCartItems([]); // 清空購物車
      return;
    }

    setCartItems((prev) => {
      const exist = prev.find((item) => item.id === id);
      if (quantity <= 0) {
        return prev.filter((item) => item.id !== id);
      }
      if (exist) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity } : item
        );
      }
      if (forceAdd && fullItem) {
        return [
          ...prev,
          {
            ...fullItem,
            quantity,
            unitPrice:
              fullItem.unitPrice ??
              parseFloat(
                fullItem.price
                  ?.toString()
                  .replace(/[^\d.]/g, "")
                  .replace(/,/g, "")
              ),
          },
        ];
      }
      return prev;
    });
  };

  // ⬇️ 決定要顯示哪些產品
  const displayedProducts =
    highlightedProductId != null
      ? products.filter((p) => p.id === highlightedProductId)
      : products;

  // ✅ 點擊結帳 → navigate 到新頁面
  const handleCheckout = () => {
    const checkoutPayload = {
      items: cartItems,
      member: currentMember,
      subtotal: cartSummary.subtotal,
      usedPoints: cartSummary.usedPoints,
      finalTotal: cartSummary.finalTotal,
    };

    localStorage.setItem("checkoutData", JSON.stringify(checkoutPayload));

    navigate("/checkout");
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-5">
          <Cart
            items={cartItems}
            updateQuantity={(id, qty, forceAdd, fullItem) =>
              updateQuantity(id, qty, forceAdd, fullItem)
            }
            currentMember={currentMember}
            setCurrentMember={setCurrentMember}
            members={members}
            onCheckoutClick={handleCheckout}
            onCartSummaryChange={(summary) => setCartSummary(summary)}
            stockMap={products.reduce((acc, p) => {
              acc[p.id] = p.stock ?? 9999;
              return acc;
            }, {})}
            isGuideSelf={isGuideSelf} // ✅ 新增
            setIsGuideSelf={setIsGuideSelf} // ✅ 新增
          />
        </div>

        <div className="col-7">
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onSearch={handleSearch}
            suggestions={suggestions}
          />

          {activeTab === "熱銷排行" && (
            <CardTable
              products={displayedProducts}
              addToCart={addToCart}
              cartItems={cartItems}
              usedPoints={cartSummary.usedPoints}
              currentMember={currentMember}
              onCheckout={handleCheckout}
              isGuideSelf={isGuideSelf}
            />
          )}

          {activeTab === "新品排行" && (
            <NewArrivalTable
              products={displayedProducts}
              addToCart={addToCart}
              cartItems={cartItems}
              usedPoints={cartSummary.usedPoints}
              onCheckout={handleCheckout}
              currentMember={currentMember}
              isGuideSelf={isGuideSelf}
            />
          )}

          {activeTab === "產品分類" && (
            <Card
              products={displayedProducts}
              addToCart={addToCart}
              onCheckout={handleCheckout}
              currentMember={currentMember}
              isGuideSelf={isGuideSelf}
            />
          )}

          {activeTab === "贈送" && (
            <GiftTable
              products={displayedProducts}
              addToCart={addToCart}
              cartItems={cartItems}
              currentMember={currentMember}
              isGuideSelf={isGuideSelf}
            />
          )}
        </div>
      </div>
    </div>
  );
}
