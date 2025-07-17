import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Cart from "./components/Cart";
import Navbar from "./components/Navbar";
import CardTable from "./components/CardTable";
import Card from "./components/Card";
import NewArrivalTable from "./components/NewArrivalTable";
import CheckoutModal from "./components/CheckoutModal";

export default function Home({ products = [] }) {
  const [activeTab, setActiveTab] = useState("熱銷排行");
  const [cartItems, setCartItems] = useState([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [members, setMembers] = useState([]);
  const navigate = useNavigate();
  const [cartSummary, setCartSummary] = useState({
    subtotal: 0,
    usedPoints: 0,
    finalTotal: 0,
  });

  // ✅ 初始化讀取會員資料
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

  // ✅ 加入購物車
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

  // ✅ 更新購物車數量或刪除
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

  // ✅ 點擊結帳
  const handleCheckout = (data) => {
    setCheckoutData({
      ...data,
      member: currentMember,
    });
    setShowCheckoutModal(true);
  };

  // ✅ 確認結帳
  const confirmCheckout = () => {
    setShowCheckoutModal(false);
    setCartItems([]); // 清空購物車
    navigate("/pickup", { state: checkoutData });
  };

  return (
    <>
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
            />
          </div>

          <div className="col-7">
            <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === "熱銷排行" && (
              <CardTable
                products={products}
                addToCart={addToCart}
                cartItems={cartItems}
                usedPoints={cartSummary.usedPoints}
                currentMember={currentMember}
                onCheckout={() =>
                  handleCheckout({
                    items: cartItems,
                    subtotal: cartSummary.subtotal,
                    usedPoints: cartSummary.usedPoints,
                    finalTotal: cartSummary.finalTotal,
                  })
                }
              />
            )}
            {activeTab === "新品排行" && (
              <NewArrivalTable
                products={products}
                addToCart={addToCart}
                cartItems={cartItems}
                usedPoints={cartSummary.usedPoints}
                onCheckout={() =>
                  handleCheckout({
                    items: cartItems,
                    subtotal: cartSummary.subtotal,
                    usedPoints: cartSummary.usedPoints,
                    finalTotal: cartSummary.finalTotal,
                  })
                }
              />
            )}
            {activeTab === "產品分類" && (
              <Card
                products={products}
                addToCart={addToCart}
                onCheckout={handleCheckout}
              />
            )}
          </div>
        </div>
      </div>

      <CheckoutModal
        show={showCheckoutModal}
        onHide={() => setShowCheckoutModal(false)}
        data={checkoutData}
        member={currentMember}
        onConfirm={confirmCheckout}
        onClearCart={() => setCartItems([])}
      />
    </>
  );
}
