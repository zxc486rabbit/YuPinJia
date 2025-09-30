// src/utils/EmployeeContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api, {
  getTokens,
  setAuthHeader,
  refreshAccessToken,
} from "./apiClient";

const USERINFO_URL = "https://yupinjia.hyjr.com.tw/api/api/Account/userInfo";

const EmployeeContext = createContext();
export const useEmployee = () => useContext(EmployeeContext);

// ───── 小工具 ─────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isTimestampValid = (ts) => {
  if (ts === undefined || ts === null || ts === "") return true;
  const n = Number(ts);
  if (Number.isNaN(n)) return true;
  return Date.now() < n;
};

// ───── 多分頁「領導鎖」：只有 leader 排程自動刷新 ─────
const LEADER_KEY = "auth:refreshLeader";
const TOKEN_VERSION_KEY = "auth:tokenVersion";

function iAmLeader() {
  const now = Date.now();
  const stamp = Number(localStorage.getItem(LEADER_KEY) || 0);
  return now - stamp < 6000; // 6 秒內有心跳就視為已有 leader
}
function beatLeader() {
  localStorage.setItem(LEADER_KEY, String(Date.now()));
}

export const EmployeeProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // { user, privileges? }
  const [orders, setOrders] = useState([]);
  const [hydrating, setHydrating] = useState(true);

  // 排程刷新使用 setTimeout（可依到期時間彈性安排）
  const refreshTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const didInitRef = useRef(false);

  /** 登出：清空所有快取與計時器（不主動 redirect） */
  const logout = () => {
    setCurrentUser(null);
    setOrders([]);
    stopRefreshTimer();

    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessTokenExpiredAt");
    localStorage.removeItem("refreshTokenExpiredAt");
    setAuthHeader("");
  };

  /** 撈使用者資料（帶目前 accessToken） */
  const refreshUserInfo = async () => {
    try {
      const { accessToken } = getTokens();
      if (!accessToken) return null;

      setAuthHeader(accessToken);

      const res = await api.get(USERINFO_URL, {
        params: { ts: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const latestUser = res?.data?.user ?? res?.data ?? null;

      setCurrentUser((prev) => {
        const merged = {
          ...(prev || {}),
          user: latestUser || prev?.user || null,
          privileges: res?.data?.privileges ?? prev?.privileges ?? null,
        };
        localStorage.setItem("currentUser", JSON.stringify(merged));
        return merged;
      });

      return latestUser;
    } catch (e) {
      console.error("[refreshUserInfo] failed", e);
      return null;
    }
  };

  /** 下單後同步贈送額度（保留你的原流程） */
  const optimisticGiftDeduct = (amount) => {
    const delta = Math.max(0, Number(amount) || 0);
    let after = 0;

    setCurrentUser((prev) => {
      if (!prev?.user) return prev;
      const before = Number(prev.user.monthRemainGift ?? prev.user.giftAmount ?? 0);
      after = Math.max(0, before - delta);
      const merged = { ...prev, user: { ...prev.user, monthRemainGift: after } };
      localStorage.setItem("currentUser", JSON.stringify(merged));
      return merged;
    });

    return { after };
  };

  const syncGiftAfterOrder = async (usedGiftAmount) => {
    const { after: optimisticRemain } = optimisticGiftDeduct(usedGiftAmount);
    try {
      await refreshAccessToken().catch(() => {});
      for (let i = 0; i < 6; i++) {
        const latestUser = await refreshUserInfo();
        if (latestUser) {
          const serverRemain = Number(latestUser.monthRemainGift ?? 0);
          if (serverRemain <= optimisticRemain) break;
        }
        await sleep(400);
      }
    } catch (e) {
      console.warn("syncGiftAfterOrder failed", e);
    }
  };

  // ───── 自動刷新：依到期時間排程 + 只有 leader 執行 ─────
  const stopRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  const scheduleRefresh = () => {
    stopRefreshTimer();
    if (!iAmLeader()) return; // 非 leader 不排程

    const { accessTokenExpiredAt } = getTokens();
    const now = Date.now();
    const fallback = 10 * 60 * 1000; // 沒到期資訊時，10 分鐘後嘗試
    const buffer = 90 * 1000; // 提前 90 秒刷新
    let waitMs = fallback;

    if (accessTokenExpiredAt && Number(accessTokenExpiredAt) > now) {
      waitMs = Math.max(30_000, Number(accessTokenExpiredAt) - now - buffer);
    }

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const r = await refreshAccessToken();
        if (!r?.accessToken) throw new Error("no AT after refresh");
        // apiClient.saveTokens 會廣播 tokenVersion
      } catch (err) {
        console.error("[auto refresh] failed", err);
        // 不立刻踢出，留給攔截器或用戶操作時再決定
      } finally {
        scheduleRefresh(); // 排下一輪
      }
    }, waitMs);
  };

  // ───── 領導鎖：維持心跳、偵測 token 更新（跨分頁同步） ─────
  useEffect(() => {
    heartbeatTimerRef.current = setInterval(() => {
      if (!iAmLeader()) {
        beatLeader(); // 取得領導權
      } else {
        beatLeader(); // 維持領導權
      }
    }, 3000);
    return () => clearInterval(heartbeatTimerRef.current);
  }, []);

  useEffect(() => {
    function onStorage(e) {
      if (e.key === TOKEN_VERSION_KEY) {
        const { accessToken } = getTokens();
        if (accessToken) setAuthHeader(accessToken);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** 初始化流程 */
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    (async () => {
      try {
        // 還原快取的 user（僅作 UI 初值）
        const saved = localStorage.getItem("currentUser");
        if (saved) {
          try {
            setCurrentUser(JSON.parse(saved));
          } catch {}
        }

        const { accessToken, accessTokenExpiredAt } = getTokens();
        const tokenLooksValid =
          !!accessToken && isTimestampValid(accessTokenExpiredAt);

        if (tokenLooksValid || !!accessToken) {
          setAuthHeader(accessToken);
          // 先撈 userInfo
          let ok = await refreshUserInfo();
          if (!ok) {
            // 補打一輪 refresh 再試一次
            try {
              await refreshAccessToken();
              ok = await refreshUserInfo();
            } catch {
              ok = null;
            }
          }

          if (!ok) {
            // 確認真的不行再清
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("accessTokenExpiredAt");
            localStorage.removeItem("refreshTokenExpiredAt");
            setCurrentUser(null);
          } else {
            // 成功才排程自動刷新（由 leader 執行）
            scheduleRefresh();
          }
        } else {
          // 無 token：清乾淨
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("accessTokenExpiredAt");
          localStorage.removeItem("refreshTokenExpiredAt");
          setCurrentUser(null);
        }
      } finally {
        setHydrating(false);
      }
    })();

    return () => stopRefreshTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 手動登入：寫入 user 與 token（token 由 LoginPage 寫），並排程刷新 */
  const login = (employee) => {
    const normalized = employee?.user
      ? employee
      : {
          user: employee || null,
          privileges: employee?.privileges ?? null,
        };

    setCurrentUser(normalized);
    localStorage.setItem("currentUser", JSON.stringify(normalized));

    const { accessToken } = getTokens();
    if (accessToken) {
      setAuthHeader(accessToken);
      scheduleRefresh(); // 由 leader 進行
    }
  };

  const recordOrder = (order) =>
    setOrders((prev) => [...prev, order]);

  // 登入條件：token 看起來可用 + 有 user
  const { accessToken, accessTokenExpiredAt } = getTokens();
  const tokenLooksValid =
    !!accessToken && isTimestampValid(accessTokenExpiredAt);
  const isAuthed = tokenLooksValid && !!(currentUser?.user);

  const ctxValue = useMemo(
    () => ({
      currentUser, // { user, privileges? }
      user: currentUser?.user,
      privileges: currentUser?.privileges,
      hydrating,
      isAuthed,
      login,
      logout,
      recordOrder,
      refreshUserInfo,
      optimisticGiftDeduct,
      syncGiftAfterOrder,
    }),
    [currentUser, hydrating, isAuthed]
  );

  return (
    <EmployeeContext.Provider value={ctxValue}>
      {children}
    </EmployeeContext.Provider>
  );
};
