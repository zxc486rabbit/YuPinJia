import { FaMinus, FaPlus } from "react-icons/fa";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";  // 確保已導入 SweetAlert

export default function QuantityControl({ defaultValue, onChange, onRemove }) {
  const [quantity, setQuantity] = useState(defaultValue);

  // 當外部 defaultValue 改變時，內部也同步
  useEffect(() => {
    setQuantity(defaultValue);
  }, [defaultValue]);

  const handleIncrease = () => {
    const newQty = quantity + 1;
    setQuantity(newQty);
    onChange?.(newQty);
  };

  const handleDecrease = () => {
    // 如果數量是 1，顯示 SweetAlert 提示是否移除該商品
    if (quantity === 1) {
      Swal.fire({
        title: "確認移除商品?",
        text: "商品數量已為 1，是否要將該商品從購物車中移除?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "移除",
        cancelButtonText: "取消",
      }).then((result) => {
        if (result.isConfirmed) {
          // 使用者確認移除商品
          onRemove?.(); // 執行移除商品的操作
        }
      });
    } else {
      const newQty = quantity - 1;
      const finalQty = newQty < 1 ? 1 : newQty;
      setQuantity(finalQty);
      onChange?.(finalQty);
    }
  };

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value, 10);
    const newQty = isNaN(value) || value < 1 ? 1 : value;
    setQuantity(newQty);
    onChange?.(newQty);
  };

  return (
    <div className="d-flex align-items-center border rounded">
      <button className="reduce quantity-btn" onClick={handleDecrease}>
        <FaMinus style={{ color: "#6f6f6f" }} />
      </button>
      <input
        type="number"
        value={quantity}
        onChange={handleInputChange}
        className="text-center border-0"
        style={{ width: "80px" }}
      />
      <button className="add quantity-btn" onClick={handleIncrease}>
        <FaPlus style={{ color: "#6f6f6f" }} />
      </button>
    </div>
  );
}