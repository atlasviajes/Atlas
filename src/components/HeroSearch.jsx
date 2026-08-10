import { useState } from "react";

function HeroSearch() {
  const [buscando, setBuscando] = useState(false);

  const buscarViaje = () => {
    setBuscando(true);

    setTimeout(() => {
      setBuscando(false);
    }, 2500);
  };

  return (
    <section className="hero">
      <div className="hero-overlay">
        <div className="hero-copy">
          <h2>¿A dónde quieres ir?</h2>
          <p>Atlas encuentra las mejores oportunidades para ti.</p>
        </div>

        <div className="hero-search">
          <div className="hero-field">
            <span>Origen</span>
            <strong>Asturias (OVD)</strong>
          </div>

          <div className="hero-field">
            <span>¿Cuándo?</span>
            <strong>29 ago - 5 sep</strong>
          </div>

          <div className="hero-field">
            <span>Viajeros</span>
            <strong>1 adulto, 1 niño</strong>
          </div>

          <div className="hero-field">
            <span>Presupuesto máx.</span>
            <strong>1.000 € total</strong>
          </div>

          <div className="hero-field">
            <span>¿Qué te apetece?</span>
            <strong>Playa + diversión</strong>
          </div>
        </div>

        <button
          className="hero-search-button"
          onClick={buscarViaje}
          disabled={buscando}
        >
          {buscando ? "BUSCANDO..." : "🔎 BUSCAR VIAJE"}
        </button>

        {buscando && (
          <div className="atlas-thinking">
            <h3>🧠 Atlas está buscando...</h3>

            <div className="thinking-steps">
              <span>✈ Analizando vuelos</span>
              <span>🏨 Comparando hoteles</span>
              <span>📊 Calculando Atlas Score</span>
              <span>🎯 Preparando recomendaciones</span>
            </div>
          </div>
        )}

        {!buscando && (
          <div className="hero-actions">
            <button>⚡ OFERTAS AHORA</button>
            <button>🔔 ATLAS, AVÍSAME</button>
          </div>
        )}
      </div>
    </section>
  );
}

export default HeroSearch;