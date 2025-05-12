import { FaMinus, FaPlus } from "react-icons/fa";
import { useState, useEffect } from "react";

export default function QuantityControl({ defaultValue, onChange }) {
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
    const newQty = quantity > 1 ? quantity - 1 : 1;
    setQuantity(newQty);
    onChange?.(newQty);
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
        style={{ width: "80px" ,height: "50px" }}
      />
      <button className="add quantity-btn" onClick={handleIncrease}>
        <FaPlus style={{ color: "#6f6f6f" }} />
      </button>
    </div>
  );
}
