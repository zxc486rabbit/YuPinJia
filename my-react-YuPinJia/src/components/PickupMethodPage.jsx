import { useLocation } from "react-router-dom";

export default function PickupMethodPage() {
  // 從路由 state 帶入結帳資料
  const { state } = useLocation();
  const checkoutData = state || {};

  return (
    <div className="container py-4">
      <h3 className="mb-3">選擇取貨方式</h3>
      <pre>{JSON.stringify(checkoutData, null, 2)}</pre>
      {/* 之後你再告訴我要怎麼做畫面，我們再細修 */}
    </div>
  );
}