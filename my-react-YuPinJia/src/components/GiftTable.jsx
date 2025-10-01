// GiftTable.jsx
import React from "react";
import Swal from "sweetalert2";

export default function GiftTable({
  products = [],
  addToCart = () => {},
  cartItems = [],
  onCheckout = () => {},
  giftQuota = 0,
  isLoadingQuota = false,
}) {
  // 輕量提示
  const toast = Swal.mixin({
    toast: true,
    position: "top",
    showConfirmButton: false,
    timer: 1500,
  });

  // 計算購物車中「贈品原價合計」（安全寫法）
  const calcGiftValue = (items) =>
    (items ?? [])
      .filter((i) => i?.isGift)
      .reduce((sum, i) => {
        const price = Number(i?.originalPrice ?? i?.price ?? i?.unitPrice ?? 0);
        const qty = Number(i?.quantity ?? 1);
        return sum + price * qty;
      }, 0);

  const quota = Number.isFinite(Number(giftQuota)) ? Number(giftQuota) : 0;
  const money = (n) => Number(n || 0).toLocaleString();
  const usedByCart = calcGiftValue(cartItems);
  const remainForThisSession = Math.max(0, quota - usedByCart);

  const handleAddToCart = (item) => {
    if (isLoadingQuota) {
      toast.fire({ icon: "info", title: "額度載入中，請稍候…" });
      return;
    }
    // 丟進購物車時標記為贈品；顯示價 0，但額度用原價扣
    const payload = {
      ...item,
      productId: item.productId ?? item.id,
      quantity: 1,
      unitPrice: 0,
      originalPrice: Number(item.price ?? 0),
      isGift: true,
    };
    addToCart(payload);
  };

  const giftProducts = products ?? [];

  return (
    <div className="content-container w-100">
      {/* 額度條 */}
      <div
        className="d-flex align-items-center justify-content-between px-3 py-2"
        style={{
          position: "sticky",
          top: 0,
          background: "#fff",
          zIndex: 5,
          borderBottom: "1px solid #e9ecef",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        }}
      >
        <div style={{ fontWeight: 700, color: "#2b2f33" }}>贈送商品</div>
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          <span
            title="後端提供之本期可用額度（尚未扣掉此購物車）"
            style={{
              fontSize: "0.85rem",
              background: "#f1f3f5",
              color: "#495057",
              padding: "2px 8px",
              borderRadius: 16,
              border: "1px solid #dee2e6",
            }}
          >
            {isLoadingQuota
              ? "額度載入中…"
              : `目前額度剩餘：NT$ ${money(quota)}`}
          </span>
          <span
            title="已放入購物車之贈品原價合計"
            style={{
              fontSize: "0.85rem",
              background: "#fff3cd",
              color: "#856404",
              padding: "2px 8px",
              borderRadius: 16,
              border: "1px solid #ffeeba",
            }}
          >
            購物車已佔用：NT$ {usedByCart.toLocaleString()}
          </span>
          <span
            title="（顯示用途）本次可用 = 後端剩餘 - 此購物車佔用"
            style={{
              fontSize: "0.85rem",
              background: "#e2f0fb",
              color: "#0c5460",
              padding: "2px 10px",
              borderRadius: 16,
              border: "1px solid #bee5eb",
              fontWeight: 800,
            }}
          >
            本次可用：NT$ {remainForThisSession.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 卡片清單 */}
      <div className="mt-3 px-3" style={{ height: "72vh", overflowY: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "20px",
          }}
        >
          {giftProducts.length > 0 ? (
            giftProducts.map((item) => (
              <div
                key={item.id ?? item.productId}
                style={{
                  height: "160px",
                  border: "1px solid #dee2e6",
                  borderRadius: "10px",
                  background: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                  cursor: "pointer",
                  padding: "10px",
                  transition: "all 0.2s",
                }}
                onClick={() => handleAddToCart(item)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 8px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 4px rgba(0,0,0,0.08)";
                }}
              >
                {/* 商品名稱 */}
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "#2b2f33",
                    minHeight: "48px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    textAlign: "center",
                  }}
                  title={item?.name}
                >
                  {item?.name}
                </div>

                {/* 庫存 + 價格區塊 */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 2px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      backgroundColor:
                        Number(item?.nowStock ?? 0) > 0 ? "#d4edda" : "#f8d7da",
                      color:
                        Number(item?.nowStock ?? 0) > 0 ? "#155724" : "#721c24",
                      padding: "2px 4px",
                      borderRadius: "4px",
                    }}
                  >
                    {Number(item?.nowStock ?? 0) > 0
                      ? `庫存 ${item?.nowStock}`
                      : "缺貨"}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#6c757d",
                        textDecoration: "line-through",
                      }}
                    >
                      NT$ {Number(item?.price ?? 0).toLocaleString()}
                    </span>
                    <span
                      style={{
                        color: "#17a2b8",
                        fontWeight: 800,
                        fontSize: "1rem",
                      }}
                    >
                      免費
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center mt-4">目前沒有贈送商品</div>
          )}
        </div>
      </div>

      {/* 底部操作列：統一風格按鈕（保留舊 class 以相容） */}
      <div
        className="d-flex mt-3 mb-2 px-4 w-100"
        style={{ gap: "10px", justifyContent: "flex-start" }}
      >
        {/* 次要動作：灰階 */}
        <button
          type="button"
          className="btn-action btn-secondary open-button"
          title="開錢櫃"
        >
          開錢櫃
        </button>

        {/* 主要動作：橘色 */}
        <button
          type="button"
          className="btn-action btn-primary checkout-button"
          onClick={onCheckout}
          title="前往結帳"
        >
          結帳
        </button>
      </div>
    </div>
  );
}
