function Sidebar({ pantalla, setPantalla }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>✈️</span>

        <div>
          <strong>ATLAS</strong>
          <small>Viaja mejor</small>
        </div>
      </div>

      <nav className="sidebar-menu">
        <button
          className={pantalla === "inicio" ? "activo" : ""}
          onClick={() => setPantalla("inicio")}
        >
          🏠 Inicio
        </button>

        <button
          className={pantalla === "explorar" ? "activo" : ""}
          onClick={() => setPantalla("explorar")}
        >
          🔎 Explorar
        </button>

        <button
          className={pantalla === "ofertas" ? "activo" : ""}
          onClick={() => setPantalla("ofertas")}
        >
          🔥 Ofertas
        </button>

        <button
          className={pantalla === "alertas" ? "activo" : ""}
          onClick={() => setPantalla("alertas")}
        >
          🔔 Alertas
        </button>

        <button
          className={pantalla === "mi-atlas" ? "activo" : ""}
          onClick={() => setPantalla("mi-atlas")}
        >
          👤 Mi Atlas
        </button>
      </nav>

      <div className="sidebar-plus">
        <strong>👑 Atlas+</strong>
        <p>Más alertas y seguimiento de precios.</p>
        <button>Probar gratis</button>
      </div>
    </aside>
  );
}

export default Sidebar;