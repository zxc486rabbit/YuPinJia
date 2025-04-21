
export default function NavbarItem({ text, active, onClick }) {

  return (
    <div
      className={`navbar-item d-flex flex-column justify-content-center text-center mx-1  ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <div style={{ color: "#fff", fontSize: "1.5rem", fontWeight: "bold" }}>
        {text}
      </div>
    </div>
  );
}
