export default function SearchField({ label, type, value, onChange, options }) {
    return (
      <div className="search-field">
        <label>{label}</label>
        {type === "select" ? (
          <select value={value} onChange={onChange} className="form-select">
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={`輸入${label}`}
            className="form-control"
          />
        )}
      </div>
    );
  }