import { useState } from "react";

const API_URL = "https://atlas-backend-gules.vercel.app";

function HeroSearch() {
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [vuelos, setVuelos] = useState([]);

  const [origenTexto, setOrigenTexto] = useState("Asturias");
  const [origenCodigo, setOrigenCodigo] = useState("OVD");

  const [destinoTexto, setDestinoTexto] = useState("Tenerife");
  const [destinoCodigo, setDestinoCodigo] = useState("TFS");

  const [presupuesto, setPresupuesto] = useState("1000");

  const [sugerenciasOrigen, setSugerenciasOrigen] = useState([]);
  const [sugerenciasDestino, setSugerenciasDestino] = useState([]);

  const buscarLugares = async (texto, tipo) => {
    if (texto.trim().length < 2) {
      if (tipo === "origen") {
        setSugerenciasOrigen([]);
      } else {
        setSugerenciasDestino([]);
      }

      return;
    }

    try {
      const respuesta = await fetch(
        `${API_URL}/lugares?texto=${encodeURIComponent(texto)}`
      );

      if (!respuesta.ok) {
        throw new Error("No se pudieron buscar lugares");
      }

      const datos = await respuesta.json();

      if (tipo === "origen") {
        setSugerenciasOrigen(datos);
      } else {
        setSugerenciasDestino(datos);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const cambiarOrigen = (valor) => {
    setOrigenTexto(valor);
    setOrigenCodigo("");
    buscarLugares(valor, "origen");
  };

  const cambiarDestino = (valor) => {
    setDestinoTexto(valor);
    setDestinoCodigo("");
    buscarLugares(valor, "destino");
  };

  const seleccionarOrigen = (lugar) => {
    setOrigenTexto(lugar.nombre);
    setOrigenCodigo(lugar.codigo);
    setSugerenciasOrigen([]);
  };

  const seleccionarDestino = (lugar) => {
    setDestinoTexto(lugar.nombre);
    setDestinoCodigo(lugar.codigo);
    setSugerenciasDestino([]);
  };

  const obtenerCodigo = (codigo, texto) => {
    if (codigo) {
      return codigo;
    }

    const posibleCodigo = texto.trim().toUpperCase();

    if (/^[A-Z]{3}$/.test(posibleCodigo)) {
      return posibleCodigo;
    }

    return "";
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return "-";

    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fechaISO));
  };

  const formatearDuracion = (minutos) => {
    if (!minutos) return "-";

    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;

    return `${horas} h ${mins} min`;
  };

  const obtenerEnlaceVuelo = (vuelo) => {
    if (vuelo.affiliate_link) {
      return vuelo.affiliate_link;
    }

    if (vuelo.link) {
      if (vuelo.link.startsWith("http")) {
        return vuelo.link;
      }

      return `https://www.aviasales.com${vuelo.link}`;
    }

    return "#";
  };

  const buscarViaje = async () => {
    const codigoOrigen = obtenerCodigo(origenCodigo, origenTexto);
    const codigoDestino = obtenerCodigo(destinoCodigo, destinoTexto);

    if (!codigoOrigen || !codigoDestino) {
      setMensaje(
        "Selecciona un origen y un destino de la lista de sugerencias."
      );
      return;
    }

    setBuscando(true);
    setMensaje("");
    setVuelos([]);

    try {
      const url = new URL(`${API_URL}/vuelos`);

      url.searchParams.set("origen", codigoOrigen);
      url.searchParams.set("destino", codigoDestino);
      url.searchParams.set("moneda", "EUR");

      const respuesta = await fetch(url);

      if (!respuesta.ok) {
        throw new Error("No se pudieron obtener vuelos");
      }

      const datos = await respuesta.json();

      let listaVuelos = datos?.resultados?.data || [];

      if (presupuesto) {
        listaVuelos = listaVuelos.filter(
          (vuelo) => Number(vuelo.price) <= Number(presupuesto)
        );
      }

      setVuelos(listaVuelos);

      if (listaVuelos.length > 0) {
        setMensaje(
          `Atlas ha encontrado ${listaVuelos.length} oportunidades.`
        );
      } else {
        setMensaje(
          "No se encontraron vuelos dentro del presupuesto indicado."
        );
      }
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo conectar con el backend de Atlas.");
    } finally {
      setBuscando(false);
    }
  };

  return (
    <>
      <section className="hero">
        <div className="hero-overlay">
          <div className="hero-copy">
            <h2>¿A dónde quieres ir?</h2>
            <p>Atlas encuentra las mejores oportunidades para ti.</p>
          </div>

          <div className="hero-search">
            <div className="hero-field autocomplete-field">
              <span>Origen</span>

              <input
                type="text"
                value={origenTexto}
                onChange={(e) => cambiarOrigen(e.target.value)}
                placeholder="Asturias"
                autoComplete="off"
              />

              {sugerenciasOrigen.length > 0 && (
                <div className="autocomplete-list">
                  {sugerenciasOrigen.map((lugar, index) => (
                    <button
                      type="button"
                      key={`${lugar.codigo}-${index}`}
                      onMouseDown={() => seleccionarOrigen(lugar)}
                    >
                      <strong>{lugar.nombre}</strong>
                      <span translate="no">{lugar.codigo}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hero-field autocomplete-field">
              <span>Destino</span>

              <input
                type="text"
                value={destinoTexto}
                onChange={(e) => cambiarDestino(e.target.value)}
                placeholder="Tenerife"
                autoComplete="off"
              />

              {sugerenciasDestino.length > 0 && (
                <div className="autocomplete-list">
                  {sugerenciasDestino.map((lugar, index) => (
                    <button
                      type="button"
                      key={`${lugar.codigo}-${index}`}
                      onMouseDown={() => seleccionarDestino(lugar)}
                    >
                      <strong>{lugar.nombre}</strong>
                      <span translate="no">{lugar.codigo}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="hero-field">
              <span>Viajeros</span>
              <strong>1 adulto</strong>
            </div>

            <div className="hero-field">
              <span>Presupuesto máx.</span>

              <input
                type="number"
                value={presupuesto}
                onChange={(e) => setPresupuesto(e.target.value)}
                placeholder="1000"
              />
            </div>

            <div className="hero-field">
              <span>Preferencia</span>
              <strong>Mejor precio</strong>
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
                <span>✈ Consultando vuelos</span>
                <span>💶 Comparando precios</span>
                <span>🧭 Analizando escalas</span>
                <span>🎯 Preparando resultados</span>
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

      {mensaje && (
        <div className="flight-message">
          <strong>{mensaje}</strong>
        </div>
      )}

      {vuelos.length > 0 && (
        <section className="flight-results">
          <div className="section-title">
            <h2>
              ✈️ {origenTexto} → {destinoTexto}
            </h2>
          </div>

          <div className="flight-grid">
            {vuelos.map((vuelo, index) => (
              <article
                className="flight-card"
                key={`${vuelo.flight_number}-${vuelo.departure_at}-${index}`}
              >
                <div className="flight-card-top">
                  <div>
                    <span className="flight-route" translate="no">
                      {vuelo.origin_airport} → {vuelo.destination_airport}
                    </span>

                    <h3>
                      {vuelo.airline} · Vuelo {vuelo.flight_number}
                    </h3>
                  </div>

                  <div className="flight-price">
                    <strong>{vuelo.price} €</strong>
                    <span>ida y vuelta</span>
                  </div>
                </div>

                <div className="flight-info">
                  <div>
                    <span>Salida</span>
                    <strong>{formatearFecha(vuelo.departure_at)}</strong>
                  </div>

                  <div>
                    <span>Regreso</span>
                    <strong>{formatearFecha(vuelo.return_at)}</strong>
                  </div>

                  <div>
                    <span>Ida</span>
                    <strong>
                      {vuelo.transfers === 0
                        ? "Directo"
                        : `${vuelo.transfers} escala${
                            vuelo.transfers > 1 ? "s" : ""
                          }`}
                    </strong>
                  </div>

                  <div>
                    <span>Vuelta</span>
                    <strong>
                      {vuelo.return_transfers === 0
                        ? "Directo"
                        : `${vuelo.return_transfers} escala${
                            vuelo.return_transfers > 1 ? "s" : ""
                          }`}
                    </strong>
                  </div>

                  <div>
                    <span>Duración total</span>
                    <strong>{formatearDuracion(vuelo.duration)}</strong>
                  </div>

                  <div>
                    <span>Proveedor</span>
                    <strong>{vuelo.gate}</strong>
                  </div>
                </div>

                <div className="flight-card-bottom">
                  <span>Precio orientativo</span>

                  <a
                    href={obtenerEnlaceVuelo(vuelo)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    VER VUELO
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default HeroSearch;