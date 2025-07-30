import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Cart from "./components/Cart";
import Navbar from "./components/Navbar";
import CardTable from "./components/CardTable";
import NewArrivalTable from "./components/NewArrivalTable";
import GiftTable from "./components/GiftTable";
import CategoryProductTable from "./components/CategoryProductTable";

// API：產品資料（根據 searchType 或 categoryId）
const fetchProductsBySearchType = async (searchType, categoryId) => {
  const url =
    searchType === 5
      ? `https://yupinjia.hyjr.com.tw/api/api/t_Product?categoryId=${categoryId}`
      : `https://yupinjia.hyjr.com.tw/api/api/t_Product?searchType=${searchType}`;
  const res = await axios.get(url);
  return res.data;
};

// API：分類清單
const fetchCategories = async () => {
  const res = await axios.get(
    "https://yupinjia.hyjr.com.tw/api/api/t_Category"
  );
  return res.data;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("熱銷排行");
  const [cartItems, setCartItems] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchType, setSearchType] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isGuideSelf, setIsGuideSelf] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [cartSummary, setCartSummary] = useState({
    subtotal: 0,
    usedPoints: 0,
    finalTotal: 0,
  });

  const navigate = useNavigate();

  // ➤ 載入 localStorage 的會員資料
  const memberInitRef = useRef(false);
  useEffect(() => {
    if (memberInitRef.current) return;
    const stored = localStorage.getItem("currentMember");
    if (stored) {
      try {
        setCurrentMember(JSON.parse(stored));
      } catch (e) {
        console.error("載入會員失敗", e);
      }
    }
    memberInitRef.current = true;
  }, []);

  // ➤ 載入所有會員
  useEffect(() => {
    // 載入會員與導遊／經銷商，並整合
    Promise.all([
      axios.get("https://yupinjia.hyjr.com.tw/api/api/t_Member"),
      axios.get("https://yupinjia.hyjr.com.tw/api/api/t_Distributor"),
    ])
      .then(([memberRes, distributorRes]) => {
        const memberList = memberRes.data;
        const distributorMap = {};
        distributorRes.data.forEach((d) => {
          distributorMap[d.memberId] = {
            isDistributor: true,
            buyerType: d.buyerType,
          };
        });

        // 將 distributor 資訊合併進每位會員
        const merged = memberList.map((m) => ({
          ...m,
          isDistributor: distributorMap[m.id]?.isDistributor || false,
          buyerType: distributorMap[m.id]?.buyerType || null,
        }));

        setMembers(merged);  // 更新會員資料
      })
      .catch((err) => console.error("載入會員與經銷資料失敗", err));
}, []);

  // ➤ 根據 tab 切換設定查詢類型
  useEffect(() => {
    switch (activeTab) {
      case "熱銷排行":
        setSearchType(1);
        break;
      case "新品排行":
        setSearchType(2);
        break;
      case "贈送":
        setSearchType(3);
        break;
      case "產品分類":
        setSearchType(5);
        break;
      default:
        setSearchType(1);
    }
  }, [activeTab]);

  // ➤ 查詢分類資料
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // ➤ 查詢產品資料
  const {
    data: allProducts = [],
    isError,
    error,
  } = useQuery({
    queryKey: ["products", searchType, selectedCategoryId],
    queryFn: () => fetchProductsBySearchType(searchType, selectedCategoryId),
    enabled:
      searchType !== null && (searchType !== 5 || selectedCategoryId !== null),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5, // 5分鐘內不重抓
  });

  // ➤ 搜尋建議 (用 useMemo 取代 useEffect)
  const filteredSuggestions = useMemo(() => {
    if (!searchKeyword || !allProducts.length) return [];
    const keyword = searchKeyword.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.productNumber?.toLowerCase().includes(keyword)
    );
  }, [searchKeyword, allProducts]);

  // ➤ 畫面上實際顯示的產品
  const displayedProducts = useMemo(() => {
    let filtered = [...allProducts];
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          p.productNumber?.toLowerCase().includes(keyword)
      );
    }
    if (activeTab === "新品排行") {
      return [...filtered].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
    return filtered;
  }, [searchKeyword, allProducts, activeTab]);

  const handleSearch = (keyword) => {
    setSearchKeyword(keyword);
  };

  const addToCart = (product) => {
    if (!currentMember) {
      alert("請先登入會員再加入購物車");
      return;
    }
    const qty = product.quantity || 1;
    setCartItems((prev) => {
      const exist = prev.find((p) => p.productId === product.productId);
      if (exist) {
        return prev.map((p) =>
          p.productId === product.productId
            ? { ...p, quantity: p.quantity + qty }
            : p
        );
      }
      return [
        ...prev,
        {
          ...product,
          quantity: qty,
          unitPrice: parseFloat(product.price ?? 0),
        },
      ];
    });
  };

  const updateQuantity = (id, quantity, forceAdd = false, fullItem = null) => {
    if (id === "__CLEAR__") {
      setCartItems([]);
      return;
    }
    setCartItems((prev) => {
      const exist = prev.find((item) => item.productId === id);
      if (quantity <= 0) {
        return prev.filter((item) => item.productId !== id);
      }
      if (exist) {
        return prev.map((item) =>
          item.productId === id ? { ...item, quantity } : item
        );
      }
      if (forceAdd && fullItem) {
        return [
          ...prev,
          {
            ...fullItem,
            quantity,
            unitPrice: parseFloat(fullItem.price ?? 0),
          },
        ];
      }
      return prev;
    });
  };

  const handleCheckout = () => {
    const normalizedMember = {
      ...currentMember,
      phone: currentMember?.contactPhone ?? currentMember?.phone ?? "",
    };
    const checkoutPayload = {
      items: cartItems,
      member: normalizedMember,
      subtotal: cartSummary.subtotal,
      usedPoints: cartSummary.usedPoints,
      finalTotal: cartSummary.finalTotal,
    };
    localStorage.setItem("checkoutData", JSON.stringify(checkoutPayload));
    navigate("/checkout");
  };

  if (isError) return <p>錯誤：{error.message}</p>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-5">
          <Cart
            items={cartItems}
            updateQuantity={updateQuantity}
            currentMember={currentMember}
            setCurrentMember={setCurrentMember}
            members={members}
            onCheckoutClick={handleCheckout}
            onCartSummaryChange={setCartSummary}
            stockMap={allProducts.reduce((acc, p) => {
              acc[p.productId] = p.nowStock ?? 9999;
              return acc;
            }, {})}
            isGuideSelf={isGuideSelf}
            setIsGuideSelf={setIsGuideSelf}
          />
        </div>

        <div className="col-7">
          <Navbar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setSelectedCategoryId(null);
              setSearchKeyword("");
            }}
            onSearch={handleSearch}
            suggestions={filteredSuggestions}
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
            <CategoryProductTable
              products={displayedProducts}
              addToCart={addToCart}
              cartItems={cartItems}
              usedPoints={cartSummary.usedPoints}
              onCheckout={handleCheckout}
              currentMember={currentMember}
              isGuideSelf={isGuideSelf}
              categories={categories}
              setSelectedCategoryId={setSelectedCategoryId}
              selectedCategoryId={selectedCategoryId}
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
