import { useState } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar";
import HeroSearch from "./components/HeroSearch";
import DestinationCard from "./components/DestinationCard";
import destinos from "./data/destinos";

function App() {
  const [pantalla, setPantalla] = useState("inicio");
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);

  return (
    <div className="layout">
      <Sidebar
        pantalla={pantalla}
        setPantalla={setPantalla}
      />

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

        {pantalla === "inicio" && (
          <>
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
                    onClick={() => setViajeSeleccionado(viaje)}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {pantalla === "explorar" && (
          <section className="section-block">
            <h1>🔎 Explorar</h1>
            <p>
              Dinos cuánto quieres gastar, cuántos días tienes y qué tipo
              de viaje buscas. Atlas encontrará los mejores destinos.
            </p>
          </section>
        )}

        {pantalla === "ofertas" && (
          <section className="section-block">
            <h1>🔥 Ofertas</h1>
            <p>
              Aquí aparecerán las mejores oportunidades detectadas por Atlas.
            </p>
          </section>
        )}

        {pantalla === "alertas" && (
          <section className="section-block">
            <h1>🔔 Alertas</h1>
            <p>
              Crea alertas de destinos, fechas, presupuesto y bajadas de precio.
            </p>
          </section>
        )}

        {pantalla === "mi-atlas" && (
          <section className="section-block">
            <h1>👤 Mi Atlas</h1>
            <p>
              Aquí estarán tus preferencias, favoritos, búsquedas y viajes
              guardados.
            </p>
          </section>
        )}

        {viajeSeleccionado && (
          <div className="trip-modal">
            <div
              className="trip-modal-backdrop"
              onClick={() => setViajeSeleccionado(null)}
            />

            <div className="trip-detail">
              <button
                className="trip-close"
                onClick={() => setViajeSeleccionado(null)}
              >
                ×
              </button>

              <img
                src={viajeSeleccionado.imagen}
                alt={viajeSeleccionado.destino}
                className="trip-detail-image"
              />

              <div className="trip-detail-content">
                <div className="trip-detail-header">
                  <div>
                    <span className="trip-label">
                      {viajeSeleccionado.etiqueta}
                    </span>

                    <h2>{viajeSeleccionado.destino}</h2>

                    <p>
                      {viajeSeleccionado.noches} noches ·{" "}
                      {viajeSeleccionado.hotel}
                    </p>
                  </div>

                  <div className="trip-detail-score">
                    <strong>{viajeSeleccionado.score}</strong>
                    <span>Atlas Score</span>
                  </div>
                </div>

                <div className="trip-info-grid">
                  <div>
                    <span>✈️ Vuelo</span>
                    <strong>{viajeSeleccionado.vuelo}</strong>
                  </div>

                  <div>
                    <span>🏨 Alojamiento</span>
                    <strong>{viajeSeleccionado.hotel}</strong>
                  </div>

                  <div>
                    <span>🌡 Clima estimado</span>
                    <strong>24–27 °C</strong>
                  </div>

                  <div>
                    <span>🚕 Traslado</span>
                    <strong>Opciones desde aeropuerto</strong>
                  </div>
                </div>

                <div className="atlas-recommendation">
                  <h3>🧠 ¿Por qué Atlas recomienda este viaje?</h3>
                  <p>✓ Buena relación entre precio y duración.</p>
                  <p>✓ Horarios y conexiones convenientes.</p>
                  <p>✓ Alta puntuación Atlas.</p>
                  <p>✓ Buena opción para aprovechar varios días.</p>
                </div>

                <div className="trip-detail-bottom">
                  <div>
                    <span>Precio estimado</span>
                    <strong>{viajeSeleccionado.precio} €</strong>
                    <small>por persona</small>
                  </div>

                  <button>VER OPCIONES DE RESERVA</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;