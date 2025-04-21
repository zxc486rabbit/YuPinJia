export default function SearchField({ label, type, value, onChange, options, placeholder }) {
    return (
      <div className="search-field">
        <label>{label}</label>
        {type === "select" ? (
          <select value={value} onChange={onChange}  className="form-select">
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
            placeholder={label? `輸入${label}` : placeholder}
            className="form-control"
          />
        )}
      </div>
    );
  }