

export default function NavbarItem({ text, active }) {
    return (
        <div className={`navbar-item d-flex flex-column justify-content-center text-center mx-1  ${active ? "active" : ""}`} >
          <div style={{color: "#fff", fontSize: "1.5rem", fontWeight: "bold"}}>{text}</div>
        </div>
      );
}
