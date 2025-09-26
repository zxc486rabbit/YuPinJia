// 簡單的 POS 雙屏同步匯流排
const CHANNEL_NAME = "pos-events";
const STORAGE_KEY_PAYLOAD = "customer_display_payload";
const STORAGE_KEY_VISIBLE = "customer_display_visible";

export const customerBus = {
  channel: "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null,

  // 發佈：顯示/更新明細
  publishSummary(payload) {
    try {
      localStorage.setItem(STORAGE_KEY_PAYLOAD, JSON.stringify(payload));
      localStorage.setItem(STORAGE_KEY_VISIBLE, "1");
      this.channel?.postMessage({ type: "summary_show", payload, when: Date.now() });
    } catch {}
  },

  // 發佈：隱藏/清空
  hideSummary() {
    try {
      localStorage.removeItem(STORAGE_KEY_PAYLOAD);
      localStorage.setItem(STORAGE_KEY_VISIBLE, "0");
      this.channel?.postMessage({ type: "summary_hide", when: Date.now() });
    } catch {}
  },

  // 在結帳完成時呼叫（你已在 submitOrder 裡廣播 checkout_done；此處保留手動呼叫）
  checkoutDone() {
    try {
      localStorage.removeItem(STORAGE_KEY_PAYLOAD);
      localStorage.setItem(STORAGE_KEY_VISIBLE, "0");
      this.channel?.postMessage({ type: "checkout_done", when: Date.now() });
    } catch {}
  },

  // 客顯端讀取初始狀態
  readInitial() {
    const visible = localStorage.getItem(STORAGE_KEY_VISIBLE) === "1";
    const payloadJSON = localStorage.getItem(STORAGE_KEY_PAYLOAD);
    let payload = null;
    try { payload = payloadJSON ? JSON.parse(payloadJSON) : null; } catch {}
    return { visible, payload };
  },
};

// 建議提供一個工具方法，開第二螢幕視窗（也可做成按鈕）
export function openCustomerWindow() {
  const url = `${window.location.origin}/customer-display`;
  // 可依你的雙螢幕配置調整 features（left/top/width/height）
  window.open(url, "customer-display", "popup=yes,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=no");
}