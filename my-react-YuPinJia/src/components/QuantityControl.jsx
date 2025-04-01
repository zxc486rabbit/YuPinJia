import { FaMinus, FaPlus } from "react-icons/fa";
import { useState } from "react";

export default function QuantityControl({ defaultValue }) {
    const [quantity, setQuantity] = useState(defaultValue);
  
    const handleIncrease = () => setQuantity(quantity + 1);
    const handleDecrease = () => setQuantity(quantity > 1 ? quantity - 1 : 1);
  
    return (
      <div className="d-flex align-items-center border rounded">
        <button className="reduce quantity-btn" onClick={handleDecrease}>
          <FaMinus style={{ color: "#6f6f6f" }} />
        </button>
        <input
          type="number"
          value={quantity}
          readOnly
          className="text-center border-0"
          style={{ width: "50px" }}
        />
        <button className="add quantity-btn" onClick={handleIncrease}>
          <FaPlus style={{ color: "#6f6f6f" }} />
        </button>
      </div>
    );
  }
