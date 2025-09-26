const LS_KEY = "customer_display_window_rect";

/** 儲存目前視窗的位置與大小（請在客顯視窗開著時執行） */
export function saveCustomerDisplayRect(win = window) {
  try {
    const rect = {
      x: win.screenX,
      y: win.screenY,
      w: win.outerWidth,
      h: win.outerHeight,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(rect));
  } catch {}
}

/** 開啟 /customer-display 視窗；若有記錄，會套用上次位置與大小 */
export function openCustomerWindow(url = "/customer-display") {
  let rect = null;
  try { rect = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch {}

  const features = rect
    ? `left=${rect.x},top=${rect.y},width=${rect.w},height=${rect.h},resizable=yes,scrollbars=no`
    : `width=900,height=1200,resizable=yes,scrollbars=no`;

  const win = window.open(url, "customer-display", features);

  // 某些瀏覽器可能忽略 features；再嘗試 move/resize（需同源與未全屏）
  if (rect && win) {
    try {
      win.moveTo(rect.x, rect.y);
      win.resizeTo(rect.w, rect.h);
    } catch {}
  }
  return win;
}
