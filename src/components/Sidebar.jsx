function Sidebar() {
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
        <button className="activo">🏠 Inicio</button>
        <button>🔎 Explorar</button>
        <button>🔥 Ofertas</button>
        <button>🔔 Alertas</button>
        <button>👤 Mi Atlas</button>
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