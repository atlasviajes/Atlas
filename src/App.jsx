import "./App.css";

import Sidebar from "./components/Sidebar";
import HeroSearch from "./components/HeroSearch";
import DestinationCard from "./components/DestinationCard";
import destinos from "./data/destinos";

function App() {
  return (
    <div className="layout">
      <Sidebar />

      <main className="contenido">
        <div className="topbar">
          <div>
            <strong>ATLAS</strong>
            <span>Tu inteligencia para viajar mejor</span>
          </div>

          <div className="topbar-right">
            <span>☀️ 22 °C</span>
            <span>📍 Asturias (OVD)</span>
            <span>👤</span>
          </div>
        </div>

        <HeroSearch />

        <section className="section-block">
          <div className="section-title">
            <h2>🔥 Oportunidades desde Asturias hoy</h2>
            <button>Ver todas →</button>
          </div>

          <div className="destinos">
            {destinos.map((viaje) => (
              <DestinationCard
                key={viaje.destino}
                destino={viaje.destino}
                precio={viaje.precio}
                score={viaje.score}
                noches={viaje.noches}
                hotel={viaje.hotel}
                vuelo={viaje.vuelo}
                etiqueta={viaje.etiqueta}
                imagen={viaje.imagen}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;