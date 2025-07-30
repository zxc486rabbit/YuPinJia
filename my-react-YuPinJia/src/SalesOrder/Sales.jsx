import { useState, useEffect } from "react";
import axios from "axios";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組
import { Modal, Button } from "react-bootstrap"; // 使用彈出框套件
import Swal from "sweetalert2";

export default function Sales() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupMethod, setPickupMethod] = useState("all");
  const [status, setStatus] = useState("all");

  const [tableData, setTableData] = useState([]); // 僅供顯示與搜尋用
  const [originalData, setOriginalData] = useState([]); // /保留全部原始資料
  const [memberMap, setMemberMap] = useState({}); // 會員姓名
  const [selectedOrder, setSelectedOrder] = useState(null); //記錄選到哪筆
  const [showModal, setShowModal] = useState(false); //檢視按鈕彈出框
  const [showEditModal, setShowEditModal] = useState(false); //編輯按鈕彈出框
  const [month, setMonth] = useState(""); // 存儲月份查詢條件
  const [memberName, setMemberName] = useState(""); // 存儲會員名稱查詢條件

  const STATUS_FLOW = ["賒帳", "已付款", "已出貨", "配送中", "已完成"];
  const statusMap = {
    0: "未付款",
    1: "賒帳",
    2: "已付款",
    3: "已出貨",
    4: "配送中",
    5: "已完成",
  };

  const reverseStatusMap = Object.fromEntries(
    Object.entries(statusMap).map(([key, val]) => [val, Number(key)])
  );

  const renderStatusBadge = (status) => {
    switch (status) {
      case "已完成":
        return <span className="badge bg-success fs-6">已完成</span>;
      case "配送中":
        return <span className="badge bg-warning text-dark fs-6">配送中</span>;
      case "已出貨":
        return <span className="badge bg-primary fs-6">已出貨</span>;
      case "待付款":
        return <span className="badge bg-info text-dark fs-6">待付款</span>;
      case "已付款":
        return (
          <span className="badge bg-secondary text-light fs-6">已付款</span>
        );
      case "作廢":
        return <span className="badge bg-danger fs-6">已作廢</span>;
      case "賒帳":
        return <span className="badge bg-warning text-dark fs-6">賒帳</span>;
      default:
        return <span className="badge bg-secondary fs-6">未知</span>;
    }
  };

  const getNextStatus = (status) => {
    const index = STATUS_FLOW.indexOf(status);
    if (index >= 0 && index < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[index + 1];
    }
    return status; // 已經是「已完成」就不變
  };

  const getNextStepLabel = (status) => {
    switch (status) {
      case "賒帳":
        return "確認付款";
      case "已付款":
        return "確認出貨";
      case "已出貨":
        return "確認配送";
      case "配送中":
        return "完成訂單";
      case "已完成":
        return "已完成";
      case "已作廢":
        return "復原訂單";
      default:
        return "下一步";
    }
  };

  // 封裝「折扣後總價」邏輯
  const calculateDiscountedTotal = (unitPrice, quantity, discount = 0) => {
    return unitPrice * quantity - discount;
  };

 const handleSearch = () => {
  // 構造搜尋條件
  const params = {
    orderNumber: orderId || undefined, // 當 orderId 為空時，後端會忽略此條件
    createdAt: month ? { $regex: `^${month}` } : undefined, // 使用月份篩選
    memberName: memberName || undefined, // 使用會員名稱篩選
    deliveryMethod: pickupMethod !== "all" ? pickupMethod : undefined, // 當 pickupMethod 為 "all" 時，忽略此條件
    status: status !== "all" ? Number(status) : undefined, // 當 status 為 "all" 時，忽略此條件
  };

  // 打印當前的搜尋條件
  console.log("搜尋條件:", params);

  // 更新 URL 查詢參數
  const queryString = new URLSearchParams(params).toString();
  window.history.pushState({}, "", `?${queryString}`);

  // 打印更新後的 URL
  console.log("當前的 URL:", window.location.href); // 打印當前的完整 URL

  // 向後端發送請求
  axios
    .get("https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder", {
      params: params,
    })
    .then((res) => {
      const raw = res.data;
      console.log("後端返回資料:", raw);

      // 按照創建時間排序（從新到舊）
      raw.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const mapped = raw.map((order) => {
        const member = memberMap[order.memberId];
        const identity = member?.isDistributor
          ? member?.buyerType === 1
            ? "(導遊)"
            : member?.buyerType === 2
            ? "(經銷商)"
            : ""
          : "";

        return {
          id: order.id,
          orderId: order.orderNumber,
          store: order.storeName ?? "馬公門市",
          member: `${member?.fullName || "未命名會員"} ${identity}`,
          phone: order.mobile ?? "",
          totalAmount: order.totalAmount.toLocaleString(),
          pay: order.paymentMethod ?? "現金付款",
          carrier: order.carrierNumber || "無",
          invoice: order.invoiceNumber || "無",
          taxId: order.unifiedBusinessNumber || "無",
          address:
            order.pickupInfo?.match(/地點:(.*?),/)?.[1] ||
            order.pickupInfo?.match(/地點:(.*)/)?.[1] ||
            "",
          pickupTime: order.pickupInfo?.match(/時間:(.*)/)?.[1] ?? "無",
          operator: order.operatorName ?? "操作員A",
          createdDate: order.createdAt?.split("T")[0] ?? "",
          status: statusMap[order.status] ?? "未知",
        };
      });

      setOriginalData(mapped);
      setTableData(mapped);
    })
    .catch((err) => {
      console.error("搜尋失敗", err);
      Swal.fire("錯誤", "搜尋訂單失敗，請稍後再試", "error");
    });
};

  // 檢視訂單彈出框
  const handleView = async (order) => {
    try {
      setSelectedOrder({ ...order, productDetails: [] }); // 先打開空的彈出框
      setShowModal(true);

      const res = await axios.get(
        `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrderItem/${order.id}`
      );

      // 因為是單筆資料，所以包成陣列後再處理
      const productDetails = [res.data].map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountedAmount: item.discountedAmount ?? 0,
      }));

      setSelectedOrder((prev) => ({
        ...prev,
        productDetails,
      }));
    } catch (error) {
      console.error("取得商品明細失敗", error);
      Swal.fire("錯誤", "載入商品明細失敗", "error");
    }
  };

  // 編輯訂單彈出框
  const handleEdit = async (order) => {
    // Step 1: 先開彈出框（視覺上更即時）
    setSelectedOrder({
      ...order,
      productDetails: [],
      totalAmount: 0,
      paymentAmount: order.paymentAmount ?? 0,
      creditAmount: 0,
    });
    setShowEditModal(true);

    try {
      // Step 2: 同步抓商品明細與最新主表
      const [itemRes, mainOrderRes] = await Promise.all([
        axios.get(
          `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrderItem/${order.id}`
        ),
        axios.get(
          `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/${order.id}`
        ),
      ]);

      // Step 3: 商品明細處理
      const item = itemRes.data;
      const productDetails = Array.isArray(item) ? item : [item]; // 保險寫法
      const parsedDetails = productDetails.map((p) => ({
        productName: p.productName,
        shippingLocation: p.shippingLocation ?? "",
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        discountedAmount: p.discountedAmount ?? 0,
        status: p.status ?? "",
      }));

      const totalAmount = parsedDetails.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity - item.discountedAmount;
      }, 0);

      const paidAmount = Number(mainOrderRes.data.paymentAmount || 0);
      const newStatus = paidAmount < totalAmount ? "賒帳" : "已付款";

      // Step 4: 更新主表資料
      await axios.put(
        `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/${order.id}`,
        {
          ...mainOrderRes.data,
          totalAmount: totalAmount,
          status: statusMap[newStatus],
        }
      );

      // Step 5: 更新彈出框資料
      setSelectedOrder((prev) => ({
        ...prev,
        totalAmount,
        paymentAmount: paidAmount,
        creditAmount: totalAmount - paidAmount,
        status: newStatus,
        productDetails: parsedDetails,
      }));
    } catch (error) {
      console.error("載入或更新主表失敗", error);
      Swal.fire("錯誤", "無法載入訂單明細或更新主表", "error");
    }
  };
  // 關閉彈出框
  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;

    const FLOW = ["未付款", "賒帳", "已付款", "已出貨", "配送中", "已完成"];

    const currentStatus = selectedOrder.status;
    const index = FLOW.indexOf(currentStatus);
    const nextStatus =
      index >= 0 && index < FLOW.length - 1 ? FLOW[index + 1] : currentStatus;
    const nextStatusCode = reverseStatusMap[nextStatus]; // 中文轉數字

    if (nextStatusCode === undefined) {
      Swal.fire("錯誤", "狀態轉換錯誤，請聯繫管理員", "error");
      return;
    }

    const confirmText = `確定要將訂單狀態變更為「${nextStatus}」嗎？`;

    const result = await Swal.fire({
      title: confirmText,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "確認",
      cancelButtonText: "取消",
    });

    if (!result.isConfirmed) return;

    const payload = {
      id: selectedOrder.id,
      orderNumber: selectedOrder.orderId || "",
      storeId: selectedOrder.storeId || 1,
      memberId: selectedOrder.memberId || 1,
      totalAmount: Number(
        selectedOrder.totalAmount?.toString().replace(/,/g, "") || 0
      ),
      totalQuantity: selectedOrder.totalQuantity || 1,
      status: nextStatusCode, // ✅ 正確：送數字狀態碼給後端
      unifiedBusinessNumber: selectedOrder.unifiedBusinessNumber || "",
      invoiceNumber: selectedOrder.invoiceNumber || "",
      note: selectedOrder.note || "",
      deliveryMethod: selectedOrder.deliveryMethod || "",
      dealerMemberId: selectedOrder.dealerMemberId || 0,
      paymentMethod: selectedOrder.paymentMethod || "現金付款",
      carrierNumber: selectedOrder.carrierNumber || "",
      createdAt: selectedOrder.createdAt || new Date().toISOString(),
      operatorName: selectedOrder.operatorName || "系統",
      pickupInfo: selectedOrder.pickupInfo || "",
      signature: selectedOrder.signature || "",
      mobile: selectedOrder.mobile || "0912345678",
    };

    try {
      await axios.put(
        `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/${selectedOrder.id}`,
        payload
      );

      Swal.fire("更新成功", `訂單狀態已變更為「${nextStatus}」`, "success");

      // 更新彈出框中的資料狀態
      setSelectedOrder({ ...selectedOrder, status: nextStatus });

      // 更新表格資料（狀態用中文）
      setTableData((prev) =>
        prev.map((item) =>
          item.id === selectedOrder.id ? { ...item, status: nextStatus } : item
        )
      );
    } catch (error) {
      console.error("更新訂單狀態失敗：", error);
      Swal.fire("錯誤", "更新訂單狀態失敗，請稍後再試", "error");
    }
  };

  const handleCancelOrder = () => {
    Swal.fire({
      title: `確定要將訂單狀態更新為「已取消」嗎？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "是的，作廢",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        setTableData((prev) =>
          prev.map((order) => {
            if (order.orderId === selectedOrder.orderId) {
              return { ...order, prevStatus: order.status, status: "已作廢" };
            }
            return order;
          })
        );
        setShowEditModal(false);
        setSelectedOrder(null);

        Swal.fire({
          title: `訂單已更新為「已取消」`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedOrder(null);
  };

  // 先載入會員對照表
  useEffect(() => {
    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_Member")
      .then((res) => {
        const map = {};
        res.data.forEach((m) => {
          map[m.id] = {
            fullName: m.fullName,
            buyerType: m.buyerType, // 1=導遊、2=經銷商
          };
        });
        setMemberMap(map);
      })
      .catch((err) => console.error("載入會員失敗", err));
  }, []);

  // 再載入訂單資料
  useEffect(() => {
    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder")
      .then((res) => {
        const raw = res.data;

        // ✅ 加這一行：照建立時間從新到舊排
        raw.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const mapped = raw.map((order) => {
          const member = memberMap[order.memberId];
          const identity = member?.isDistributor
            ? member?.buyerType === 1
              ? "(導遊)"
              : member?.buyerType === 2
              ? "(經銷商)"
              : ""
            : "";

          const total = Number(order.totalAmount || 0);
          const paid = Number(order.paymentAmount || 0);
          const delivery = order.deliveryMethod ?? "";

          return {
            id: order.id,
            orderId: order.orderNumber,
            store: order.storeName ?? "馬公門市",
            member: `${member?.fullName || "未命名會員"} ${identity}`,
            phone: order.mobile ?? "",
            totalAmount: total.toLocaleString(),
            pay: order.paymentMethod ?? "現金付款",
            carrier: order.carrierNumber || "無",
            invoice: order.invoiceNumber || "無",
            taxId: order.unifiedBusinessNumber || "無",
            address:
              order.pickupInfo?.match(/地點:(.*?),/)?.[1] ||
              order.pickupInfo?.match(/地點:(.*)/)?.[1] ||
              "",
            pickupTime: order.pickupInfo?.match(/時間:(.*)/)?.[1] ?? "無",
            operator: order.operatorName ?? "操作員A",
            deliveryMethod: delivery,
            createdDate: order.createdAt?.split("T")[0] ?? "",
            paymentAmount: paid,
            creditAmount: total - paid,
            status: statusMap[order.status] ?? "未知", // ✅ 直接用後端數字映射中文
          };
        });
        console.log("Mapped Data:", mapped); // 檢查映射後的資料
        setOriginalData(mapped); // 🔹 保留原始
        setTableData(mapped); // 🔹 顯示用
      })
      .catch((err) => {
        console.error("載入訂單失敗", err);
      });
  }, [memberMap]); // ⬅️ 等會員對照表有了再跑訂單轉換

  useEffect(() => {
  // 從 URL 查詢參數中讀取搜尋條件
  const queryParams = new URLSearchParams(window.location.search);

  setOrderId(queryParams.get("orderNumber") || "");
  setPickupTime(queryParams.get("pickupTime") || "");
  setPickupMethod(queryParams.get("deliveryMethod") || "all");
  setStatus(queryParams.get("status") || "all");
  setMonth(queryParams.get("createdAt") || "");
  setMemberName(queryParams.get("memberName") || "");
}, []);

  return (
    <>
       <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
    {/* 訂單編號 */}
    <SearchField
      label="訂單編號"
      type="text"
      value={orderId}
      onChange={(e) => setOrderId(e.target.value)}
    />

    {/* 訂單成立月份 */}
    <SearchField
      label="訂單成立月份"
      type="month"
      value={month}
      onChange={(e) => setMonth(e.target.value)}
    />

    {/* 會員名稱查詢 */}
    <SearchField
      label="會員名稱"
      type="text"
      value={memberName}
      onChange={(e) => setMemberName(e.target.value)}
    />

    {/* 取貨方式 */}
    <SearchField
      label="取貨方式"
      type="select"
      value={pickupMethod}
      onChange={(e) => setPickupMethod(e.target.value)}
      options={[
        { value: "all", label: "全部" },
        { value: "現場帶走", label: "現場帶走" },
        { value: "機場提貨", label: "機場提貨" },
        { value: "碼頭提貨", label: "碼頭提貨" },
        { value: "宅配到府", label: "宅配到府" },
        { value: "店到店", label: "店到店" },
        { value: "訂單自取", label: "訂單自取" },
      ]}
    />

    {/* 訂單狀態 */}
    <SearchField
      label="狀態"
      type="select"
      value={status}
      onChange={(e) => setStatus(e.target.value)}
      options={[
        { value: "all", label: "全部" },
        { value: "0", label: "未付款" },
        { value: "1", label: "賒帳" },
        { value: "2", label: "已付款" },
        { value: "3", label: "已出貨" },
        { value: "4", label: "配送中" },
        { value: "5", label: "已完成" },
      ]}
    />

    {/* 搜尋按鈕 */}
    <button onClick={handleSearch} className="search-button">
      搜尋
    </button>
    <button
      className="btn btn-outline-secondary"
      onClick={() => {
        setOrderId("");
        setMonth("");
        setMemberName("");
        setPickupMethod("all");
        setStatus("all");
        setTableData(originalData); // 還原表格
      }}
    >
      清除搜尋
    </button>
  </div>
      {/* 表格 */}
      <div
        className="table-container"
        style={{
          maxHeight: "73vh", // 根據你想要的高度調整
          overflowY: "auto",
        }}
      >
        <table className="table text-center" style={{ fontSize: "1.2rem" }}>
          <thead
            className="table-light"
            style={{
              borderTop: "1px solid #c5c6c7",
              position: "sticky",
              top: 0,
              background: "#d1ecf1",
              zIndex: 1,
            }}
          >
            <tr>
              <th scope="col">
                {" "}
                <input type="checkbox" className="w-5 h-5 text-gray-600" />
              </th>
              <th scope="col">訂單編號</th>
              <th scope="col">門市</th>
              <th scope="col">會員</th>
              <th scope="col">商品明細</th>
              <th scope="col">商品總金額</th>
              {/* <th scope="col">商品總數</th> */}
              <th scope="col">狀態</th>
              <th scope="col">統一編號</th>
              <th scope="col">發票</th>
              <th scope="col">備註</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item) => (
                <tr key={item.id}>
                  <td>
                    {" "}
                    <input type="checkbox" className="w-5 h-5 text-gray-600" />
                  </td>
                  <td>{item.orderId}</td>
                  <td>{item.store}</td>
                  <td>{item.member}</td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => handleView(item)}
                    >
                      檢視
                    </button>
                  </td>
                  <td>{item.totalAmount}</td>
                  {/* <td>{item.totalCount}</td> */}
                  <td>{renderStatusBadge(item.status)}</td>
                  <td>{item.taxId}</td>
                  <td>{item.invoice}</td>
                  <td>{item.remarks}</td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(item)}
                    >
                      操作
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12">無資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="d-flex align-items-center mt-2 ps-3">
        {/* <input type="checkbox" className="w-5 h-5 text-gray-600 me-2" /> */}
        {/* <h5 className="fw-bold mb-0 me-3">全選</h5> */}
        <button className="pink-button me-3" style={{ fontSize: "1.2rem" }}>
          列印清單
        </button>
        <button className="pink-button" style={{ fontSize: "1.2rem" }}>
          列印明細
        </button>
      </div>

      <Modal
        show={showModal}
        onHide={closeModal}
        dialogClassName="w-auto-modal"
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>商品明細</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <table className="table text-center" style={{ fontSize: "1.2rem" }}>
            <thead
              className="table-light"
              style={{
                borderTop: "1px solid #c5c6c7",
                position: "sticky",
                top: 0,
                background: "#d1ecf1",
                zIndex: 1,
              }}
            >
              <tr>
                <th>商品名稱</th>
                <th>單價</th>
                <th>數量</th>
                <th>折扣後總額</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder?.productDetails?.length > 0 ? (
                selectedOrder.productDetails.map((item, i) => {
                  const unitPrice = Number(item.unitPrice);
                  const quantity = Number(item.quantity);
                  const discountedAmount = Number(item.discountedAmount ?? 0);
                  const discountedTotal = calculateDiscountedTotal(
                    unitPrice,
                    quantity,
                    discountedAmount
                  );
                  const discountedUnitPrice = discountedAmount
                    ? Math.round(discountedTotal / quantity)
                    : unitPrice;

                  return (
                    <tr key={i}>
                      <td>{item.productName}</td>
                      <td>
                        {discountedAmount > 0 ? (
                          <>
                            <div
                              style={{
                                textDecoration: "line-through",
                                color: "#888",
                              }}
                            >
                              ${unitPrice.toLocaleString()}
                            </div>
                            <div
                              style={{ color: "#dc3545", fontWeight: "bold" }}
                            >
                              ${discountedUnitPrice.toLocaleString()}
                            </div>
                          </>
                        ) : (
                          `$${unitPrice.toLocaleString()}`
                        )}
                      </td>
                      <td>{quantity}</td>
                      <td style={{ color: "#28a745", fontWeight: "bold" }}>
                        ${discountedTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
          {selectedOrder?.productDetails?.length > 0 &&
            (() => {
              let originalTotal = 0;
              let discountedTotal = 0;

              selectedOrder.productDetails.forEach((item) => {
                const unitPrice = Number(item.unitPrice);
                const quantity = Number(item.quantity);
                const discountedAmount = Number(item.discountedAmount ?? 0);

                originalTotal += unitPrice * quantity;
                discountedTotal += unitPrice * quantity - discountedAmount;
              });

              const totalDiscount = originalTotal - discountedTotal;

              return (
                <div
                  className="mt-3 p-3 d-flex justify-content-start bg-light border rounded"
                  style={{ fontSize: "1.1rem", gap: "2rem" }}
                >
                  <div>
                    共計商品：
                    <strong>
                      {selectedOrder?.productDetails?.length ?? 0} 項
                    </strong>
                  </div>
                  <div>
                    折扣前金額：
                    <strong>${originalTotal.toLocaleString()}</strong> 元
                  </div>
                  <div>
                    折扣後金額：
                    <strong style={{ color: "#28a745" }}>
                      ${discountedTotal.toLocaleString()}
                    </strong>{" "}
                    元
                  </div>
                  <div>
                    總折扣金額：
                    <strong style={{ color: "#dc3545" }}>
                      -${totalDiscount.toLocaleString()}
                    </strong>{" "}
                    元
                  </div>
                </div>
              );
            })()}
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="modalButton"
            variant="secondary"
            onClick={closeModal}
          >
            關閉
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 編輯按鈕的彈出框 */}
      <Modal
        show={showEditModal}
        onHide={closeEditModal}
        size="xl"
        dialogClassName="w-auto-modal"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>編輯訂單</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
            <table className="table text-center" style={{ fontSize: "1.2rem" }}>
              <thead
                className="table-light"
                style={{
                  borderTop: "1px solid #c5c6c7",
                  position: "sticky",
                  top: 0,
                  background: "#d1ecf1",
                  zIndex: 1,
                }}
              >
                <tr>
                  <th scope="col">商品名稱</th>
                  <th scope="col">出貨點</th>
                  <th scope="col">數量</th>
                  <th scope="col">單價</th>
                  <th scope="col">金額</th>
                  <th scope="col">折扣後</th>
                  <th scope="col">狀態</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder?.productDetails?.length > 0 ? (
                  selectedOrder.productDetails.map((item, i) => {
                    const unitPrice = Number(item.unitPrice);
                    const quantity = Number(item.quantity);
                    const discountedAmount = Number(item.discountedAmount ?? 0);
                    const discountedTotal =
                      unitPrice * quantity - discountedAmount;
                    const discountedUnitPrice = discountedAmount
                      ? Math.round(discountedTotal / quantity)
                      : unitPrice;

                    return (
                      <tr key={i}>
                        <td>{item.productName}</td>
                        <td>{item.shippingLocation}</td>
                        <td>{quantity}</td>
                        <td>
                          {discountedAmount > 0 ? (
                            <>
                              <div
                                style={{
                                  textDecoration: "line-through",
                                  color: "#888",
                                }}
                              >
                                ${unitPrice.toLocaleString()}
                              </div>
                              <div
                                style={{ color: "#dc3545", fontWeight: "bold" }}
                              >
                                ${discountedUnitPrice.toLocaleString()}
                              </div>
                            </>
                          ) : (
                            `$${unitPrice.toLocaleString()}`
                          )}
                        </td>
                        <td>${(unitPrice * quantity).toLocaleString()}</td>
                        <td style={{ color: "#28a745", fontWeight: "bold" }}>
                          ${discountedTotal.toLocaleString()}
                        </td>
                        <td>{item.status}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7">無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {selectedOrder &&
            (() => {
              const count = Number(selectedOrder.totalCount);
              const amount = Number(
                typeof selectedOrder.totalAmount === "string"
                  ? selectedOrder.totalAmount.replace(/,/g, "")
                  : selectedOrder.totalAmount
              );
              const total = count * amount;
              const discounted = Math.round(total * 0.9);

              return (
                <div
                  className="mt-3 p-3 d-flex justify-content-between bg-light border rounded"
                  style={{ fontSize: "1rem", lineHeight: "1.7" }}
                >
                  <div>
                    <div className="d-flex">
                      <div>
                        共計商品：<strong>1</strong> 項
                      </div>
                      <div className="ms-5">
                        總計：
                        <strong>
                          {selectedOrder?.productDetails
                            ? selectedOrder.productDetails
                                .reduce((sum, item) => {
                                  const unitPrice = Number(item.unitPrice);
                                  const quantity = Number(item.quantity);
                                  const discount = Number(
                                    item.discountedAmount ?? 0
                                  );
                                  return (
                                    sum + (unitPrice * quantity - discount)
                                  );
                                }, 0)
                                .toLocaleString()
                            : 0}
                          元
                        </strong>
                      </div>
                      <div className="ms-5">
                        配送方式：
                        <strong>{selectedOrder.deliveryMethod}</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        經銷會員：
                        <strong>
                          {selectedOrder?.member}
                          {selectedOrder?.distributorType === 1 && "（導遊）"}
                          {selectedOrder?.distributorType === 2 && "（經銷商）"}
                        </strong>
                      </div>
                      <div className="ms-5">
                        手機：<strong>{selectedOrder.phone}</strong>
                      </div>
                      <div className="ms-5">
                        付款方式：<strong>{selectedOrder?.pay || "無"}</strong>
                      </div>
                    </div>
                    {selectedOrder?.pay === "賒帳" && (
                      <div className="d-flex mt-1">
                        <div>
                          現場付款金額：
                          <strong style={{ color: "#28a745" }}>
                            $
                            {Number(
                              selectedOrder?.paymentAmount ?? 0
                            ).toLocaleString()}{" "}
                            元
                          </strong>
                        </div>
                        <div className="ms-5">
                          賒帳金額：
                          <strong style={{ color: "#dc3545" }}>
                            $
                            {Number(
                              selectedOrder?.creditAmount ?? 0
                            ).toLocaleString()}{" "}
                            元
                          </strong>
                        </div>
                      </div>
                    )}
                    <div className="d-flex mt-1">
                      <div>
                        發票號碼：
                        <strong>{selectedOrder?.invoice || "無"}</strong>
                      </div>
                      <div className="ms-5">
                        載具編號：
                        <strong>{selectedOrder?.carrier || "無"}</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        郵寄地址：
                        <strong>{selectedOrder?.address || "無"}</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        訂單成立：
                        <strong>
                          {selectedOrder?.createdDate || "無"}
                          <span className="ms-1">
                            ({selectedOrder?.store || "未知門市"})
                          </span>
                        </strong>
                      </div>
                      <div className="ms-5">
                        操作員：
                        <strong>{selectedOrder?.operator || "無"}</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        取貨資訊：
                        <strong>
                          {selectedOrder?.pickupTime || "無"}
                          {selectedOrder?.deliveryMethod &&
                            `（${selectedOrder.deliveryMethod}）`}
                        </strong>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button className="check-button fw-bold">退貨</button>
                      <button
                        className="delete-button mx-4 fw-bold"
                        onClick={handleCancelOrder}
                      >
                        作廢
                      </button>
                      <button
                        className="pink-button"
                        style={{ fontSize: "1rem" }}
                      >
                        列印明細
                      </button>
                      <Button
                        variant="success"
                        className="fw-bold ms-4"
                        onClick={handleCompleteOrder}
                        disabled={selectedOrder?.status === "已完成"}
                      >
                        {getNextStepLabel(selectedOrder?.status)}
                      </Button>
                    </div>
                  </div>
                  {/* 簽名紀錄 */}
                  <div className="signature-container p-3 border rounded d-flex align-items-center">
                    <span className="me-2">簽名紀錄：</span>
                    <div className="signature-box border rounded overflow-hidden">
                      <img
                        src="/sign.png"
                        alt="簽名圖片"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
        </Modal.Body>
        <Modal.Footer>
          {/* <Button variant="primary" onClick={closeEditModal}>
            儲存變更
          </Button>
          <Button variant="secondary" onClick={closeEditModal}>
            取消
          </Button> */}
        </Modal.Footer>
      </Modal>
    </>
  );
}
