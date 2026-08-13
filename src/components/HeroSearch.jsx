import { useState } from "react";

const API_URL = "https://atlas-backend-gules.vercel.app";

function HeroSearch() {
  const [buscando, setBuscando] = useState(false);
  const [buscandoOfertas, setBuscandoOfertas] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [vuelos, setVuelos] = useState([]);
  const [modoResultados, setModoResultados] = useState("");

  const [origenTexto, setOrigenTexto] = useState("Asturias");
  const [origenCodigo, setOrigenCodigo] = useState("OVD");

  const [destinoTexto, setDestinoTexto] = useState("Tenerife");
  const [destinoCodigo, setDestinoCodigo] = useState("TFS");

  const [fechaIda, setFechaIda] = useState("");
  const [fechaVuelta, setFechaVuelta] = useState("");

  const [adultos, setAdultos] = useState(1);
  const [ninos, setNinos] = useState(0);
  const [bebes, setBebes] = useState(0);

  const [presupuesto, setPresupuesto] = useState("1000");

  const [sugerenciasOrigen, setSugerenciasOrigen] = useState([]);
  const [sugerenciasDestino, setSugerenciasDestino] = useState([]);

  const hoy = new Date().toISOString().split("T")[0];

  const totalViajeros = adultos + ninos + bebes;

  const textoViajeros = () => {
    const partes = [];

    partes.push(
      `${adultos} ${adultos === 1 ? "adulto" : "adultos"}`
    );

    if (ninos > 0) {
      partes.push(
        `${ninos} ${ninos === 1 ? "niño" : "niños"}`
      );
    }

    if (bebes > 0) {
      partes.push(
        `${bebes} ${bebes === 1 ? "bebé" : "bebés"}`
      );
    }

    return partes.join(" · ");
  };

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

  const validarRuta = () => {
    const codigoOrigen = obtenerCodigo(
      origenCodigo,
      origenTexto
    );

    const codigoDestino = obtenerCodigo(
      destinoCodigo,
      destinoTexto
    );

    if (!codigoOrigen || !codigoDestino) {
      setMensaje(
        "Selecciona un origen y un destino de la lista."
      );
      return null;
    }

    return {
      codigoOrigen,
      codigoDestino,
    };
  };

  const validarBusquedaCompleta = () => {
    const ruta = validarRuta();

    if (!ruta) {
      return null;
    }

    if (!fechaIda || !fechaVuelta) {
      setMensaje(
        "Selecciona las fechas de ida y vuelta."
      );
      return null;
    }

    if (fechaVuelta < fechaIda) {
      setMensaje(
        "La fecha de vuelta no puede ser anterior a la ida."
      );
      return null;
    }

    if (adultos < 1) {
      setMensaje(
        "Debe viajar al menos 1 adulto."
      );
      return null;
    }

    if (bebes > adultos) {
      setMensaje(
        "El número de bebés no puede ser superior al número de adultos."
      );
      return null;
    }

    return ruta;
  };

  const diferenciaDias = (fechaA, fechaB) => {
    if (!fechaA || !fechaB) {
      return Infinity;
    }

    const a = new Date(`${fechaA.slice(0, 10)}T00:00:00`);
    const b = new Date(`${fechaB.slice(0, 10)}T00:00:00`);

    const diferencia = Math.abs(a - b);

    return Math.round(
      diferencia / (1000 * 60 * 60 * 24)
    );
  };

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) {
      return "-";
    }

    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fechaISO));
  };

  const formatearDuracion = (minutos) => {
    if (!minutos) {
      return "-";
    }

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

  const aplicarPresupuesto = (lista) => {
    if (!presupuesto) {
      return lista;
    }

    return lista.filter((vuelo) => {
      const precioPorPersona =
        Number(vuelo.price) || 0;

      const totalOrientativo =
        precioPorPersona * totalViajeros;

      return (
        totalOrientativo <= Number(presupuesto)
      );
    });
  };

  const ordenarPorPrecio = (lista) => {
    return [...lista].sort(
      (a, b) =>
        Number(a.price) - Number(b.price)
    );
  };

  const buscarViaje = async () => {
    const validacion =
      validarBusquedaCompleta();

    if (!validacion) {
      return;
    }

    const {
      codigoOrigen,
      codigoDestino,
    } = validacion;

    setBuscando(true);
    setMensaje("");
    setVuelos([]);
    setModoResultados("fechas");

    try {
      const url = new URL(
        `${API_URL}/vuelos`
      );

      url.searchParams.set(
        "origen",
        codigoOrigen
      );

      url.searchParams.set(
        "destino",
        codigoDestino
      );

      url.searchParams.set(
        "moneda",
        "EUR"
      );

      const respuesta = await fetch(url);

      if (!respuesta.ok) {
        throw new Error(
          "No se pudieron obtener oportunidades"
        );
      }

      const datos =
        await respuesta.json();

      let lista =
        datos?.resultados?.data || [];

      /*
       * La Data API no ofrece disponibilidad
       * exacta en tiempo real.
       *
       * Solo aceptamos ofertas cuya ida y vuelta
       * estén como máximo a 30 días de las
       * fechas solicitadas.
       */
      lista = lista.filter((vuelo) => {
        const diferenciaIda =
          diferenciaDias(
            vuelo.departure_at,
            fechaIda
          );

        const diferenciaVuelta =
          diferenciaDias(
            vuelo.return_at,
            fechaVuelta
          );

        return (
          diferenciaIda <= 30 &&
          diferenciaVuelta <= 30
        );
      });

      lista =
        aplicarPresupuesto(lista);

      lista =
        ordenarPorPrecio(lista);

      setVuelos(lista);

      if (lista.length > 0) {
        setMensaje(
          `Atlas ha encontrado ${lista.length} ${
            lista.length === 1
              ? "oportunidad"
              : "oportunidades"
          } cercanas a tus fechas.`
        );
      } else {
        setMensaje(
          "No hemos encontrado oportunidades recientes suficientemente cercanas a esas fechas. Prueba OFERTAS AHORA para ver las mejores opciones disponibles para esta ruta."
        );
      }
    } catch (error) {
      console.error(error);

      setMensaje(
        "No se pudieron consultar las oportunidades de Atlas."
      );
    } finally {
      setBuscando(false);
    }
  };

  const buscarOfertasAhora = async () => {
    const validacion = validarRuta();

    if (!validacion) {
      return;
    }

    const {
      codigoOrigen,
      codigoDestino,
    } = validacion;

    setBuscandoOfertas(true);
    setMensaje("");
    setVuelos([]);
    setModoResultados("ofertas");

    try {
      const url = new URL(
        `${API_URL}/vuelos`
      );

      url.searchParams.set(
        "origen",
        codigoOrigen
      );

      url.searchParams.set(
        "destino",
        codigoDestino
      );

      url.searchParams.set(
        "moneda",
        "EUR"
      );

      const respuesta =
        await fetch(url);

      if (!respuesta.ok) {
        throw new Error(
          "No se pudieron obtener ofertas"
        );
      }

      const datos =
        await respuesta.json();

      let lista =
        datos?.resultados?.data || [];

      lista =
        aplicarPresupuesto(lista);

      lista =
        ordenarPorPrecio(lista);

      setVuelos(lista);

      if (lista.length > 0) {
        setMensaje(
          `Atlas ha encontrado ${lista.length} oportunidades de precio para esta ruta.`
        );
      } else {
        setMensaje(
          "No hay oportunidades dentro del presupuesto indicado."
        );
      }
    } catch (error) {
      console.error(error);

      setMensaje(
        "No se pudieron consultar las ofertas de Atlas."
      );
    } finally {
      setBuscandoOfertas(false);
    }
  };

  return (
    <>
      <section className="hero">
        <div className="hero-overlay">
          <div className="hero-copy">
            <h2>
              ¿A dónde quieres ir?
            </h2>

            <p>
              Atlas encuentra las mejores
              oportunidades para ti.
            </p>
          </div>

          <div className="hero-search">
            <div className="hero-field autocomplete-field">
              <span>Origen</span>

              <input
                type="text"
                value={origenTexto}
                onChange={(e) =>
                  cambiarOrigen(
                    e.target.value
                  )
                }
                placeholder="Asturias"
                autoComplete="off"
              />

              {sugerenciasOrigen.length > 0 && (
                <div className="autocomplete-list">
                  {sugerenciasOrigen.map(
                    (lugar, index) => (
                      <button
                        type="button"
                        key={`${lugar.codigo}-${index}`}
                        onMouseDown={() =>
                          seleccionarOrigen(
                            lugar
                          )
                        }
                      >
                        <strong>
                          {lugar.nombre}
                        </strong>

                        <span translate="no">
                          {lugar.codigo}
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="hero-field autocomplete-field">
              <span>Destino</span>

              <input
                type="text"
                value={destinoTexto}
                onChange={(e) =>
                  cambiarDestino(
                    e.target.value
                  )
                }
                placeholder="Tenerife"
                autoComplete="off"
              />

              {sugerenciasDestino.length > 0 && (
                <div className="autocomplete-list">
                  {sugerenciasDestino.map(
                    (lugar, index) => (
                      <button
                        type="button"
                        key={`${lugar.codigo}-${index}`}
                        onMouseDown={() =>
                          seleccionarDestino(
                            lugar
                          )
                        }
                      >
                        <strong>
                          {lugar.nombre}
                        </strong>

                        <span translate="no">
                          {lugar.codigo}
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="hero-field">
              <span>Ida</span>

              <input
                type="date"
                value={fechaIda}
                min={hoy}
                onChange={(e) => {
                  setFechaIda(
                    e.target.value
                  );

                  if (
                    fechaVuelta &&
                    e.target.value >
                      fechaVuelta
                  ) {
                    setFechaVuelta("");
                  }
                }}
              />
            </div>

            <div className="hero-field">
              <span>Vuelta</span>

              <input
                type="date"
                value={fechaVuelta}
                min={fechaIda || hoy}
                onChange={(e) =>
                  setFechaVuelta(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="hero-field">
              <span>
                Adultos
              </span>

              <select
                value={adultos}
                onChange={(e) =>
                  setAdultos(
                    Number(
                      e.target.value
                    )
                  )
                }
              >
                <option value={1}>
                  1 adulto
                </option>
                <option value={2}>
                  2 adultos
                </option>
                <option value={3}>
                  3 adultos
                </option>
                <option value={4}>
                  4 adultos
                </option>
                <option value={5}>
                  5 adultos
                </option>
                <option value={6}>
                  6 adultos
                </option>
                <option value={7}>
                  7 adultos
                </option>
                <option value={8}>
                  8 adultos
                </option>
                <option value={9}>
                  9 adultos
                </option>
              </select>
            </div>

            <div className="hero-field">
              <span>
                Niños (2–12 años)
              </span>

              <select
                value={ninos}
                onChange={(e) =>
                  setNinos(
                    Number(
                      e.target.value
                    )
                  )
                }
              >
                <option value={0}>
                  0 niños
                </option>
                <option value={1}>
                  1 niño
                </option>
                <option value={2}>
                  2 niños
                </option>
                <option value={3}>
                  3 niños
                </option>
                <option value={4}>
                  4 niños
                </option>
                <option value={5}>
                  5 niños
                </option>
                <option value={6}>
                  6 niños
                </option>
              </select>
            </div>

            <div className="hero-field">
              <span>
                Bebés (menos de 2)
              </span>

              <select
                value={bebes}
                onChange={(e) =>
                  setBebes(
                    Number(
                      e.target.value
                    )
                  )
                }
              >
                <option value={0}>
                  0 bebés
                </option>
                <option value={1}>
                  1 bebé
                </option>
                <option value={2}>
                  2 bebés
                </option>
                <option value={3}>
                  3 bebés
                </option>
                <option value={4}>
                  4 bebés
                </option>
              </select>
            </div>

            <div className="hero-field">
              <span>
                Presupuesto máx.
              </span>

              <input
                type="number"
                value={presupuesto}
                onChange={(e) =>
                  setPresupuesto(
                    e.target.value
                  )
                }
                placeholder="1000"
                min="0"
              />
            </div>
          </div>

          <div className="traveler-summary">
            👥 {textoViajeros()}
          </div>

          <button
            className="hero-search-button"
            onClick={buscarViaje}
            disabled={
              buscando ||
              buscandoOfertas
            }
          >
            {buscando
              ? "ATLAS ESTÁ ANALIZANDO..."
              : "🔎 BUSCAR VIAJE"}
          </button>

          <div className="hero-actions">
            <button
              onClick={buscarOfertasAhora}
              disabled={
                buscando ||
                buscandoOfertas
              }
            >
              {buscandoOfertas
                ? "BUSCANDO OFERTAS..."
                : "⚡ OFERTAS AHORA"}
            </button>

            <button>
              🔔 ATLAS, AVÍSAME
            </button>
          </div>
        </div>
      </section>

      {mensaje && (
        <div className="flight-message">
          <strong>
            {mensaje}
          </strong>
        </div>
      )}

      {vuelos.length > 0 && (
        <section className="flight-results">
          <div className="section-title">
            <div>
              <h2>
                {modoResultados ===
                "fechas"
                  ? "🔎 Oportunidades cercanas a tus fechas"
                  : "⚡ Mejores oportunidades encontradas"}
              </h2>

              <p>
                {origenTexto} →{" "}
                {destinoTexto}
              </p>

              {modoResultados ===
                "fechas" && (
                <p>
                  Tú pediste:{" "}
                  {fechaIda} →{" "}
                  {fechaVuelta}
                </p>
              )}

              <small>
                Los precios son
                orientativos y proceden
                de búsquedas recientes.
                La disponibilidad y el
                precio final se confirman
                con el proveedor.
              </small>
            </div>
          </div>

          <div className="flight-grid">
            {vuelos.map(
              (vuelo, index) => (
                <article
                  className="flight-card"
                  key={`${vuelo.flight_number}-${vuelo.departure_at}-${index}`}
                >
                  <div className="flight-card-top">
                    <div>
                      <span
                        className="flight-route"
                        translate="no"
                      >
                        {vuelo.origin_airport}{" "}
                        →{" "}
                        {
                          vuelo.destination_airport
                        }
                      </span>

                      <h3>
                        {vuelo.airline} ·
                        Vuelo{" "}
                        {
                          vuelo.flight_number
                        }
                      </h3>
                    </div>

                    <div className="flight-price">
                      <strong>
                        {vuelo.price} €
                      </strong>

                      <span>
                        precio orientativo
                        por persona
                      </span>
                    </div>
                  </div>

                  <div className="flight-info">
                    <div>
                      <span>
                        Ida encontrada
                      </span>

                      <strong>
                        {formatearFecha(
                          vuelo.departure_at
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Vuelta encontrada
                      </span>

                      <strong>
                        {formatearFecha(
                          vuelo.return_at
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Ida</span>

                      <strong>
                        {vuelo.transfers ===
                        0
                          ? "Directo"
                          : `${vuelo.transfers} escala${
                              vuelo.transfers >
                              1
                                ? "s"
                                : ""
                            }`}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Vuelta
                      </span>

                      <strong>
                        {vuelo.return_transfers ===
                        0
                          ? "Directo"
                          : `${vuelo.return_transfers} escala${
                              vuelo.return_transfers >
                              1
                                ? "s"
                                : ""
                            }`}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Duración total
                      </span>

                      <strong>
                        {formatearDuracion(
                          vuelo.duration
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Proveedor
                      </span>

                      <strong>
                        {vuelo.gate}
                      </strong>
                    </div>
                  </div>

                  <div className="flight-card-bottom">
                    <div>
                      <span>
                        Total orientativo
                      </span>

                      <strong>
                        {(
                          Number(
                            vuelo.price
                          ) *
                          totalViajeros
                        ).toFixed(0)}{" "}
                        €
                      </strong>
                    </div>

                    <a
                      href={obtenerEnlaceVuelo(
                        vuelo
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      COMPROBAR PRECIO FINAL
                    </a>
                  </div>
                </article>
              )
            )}
          </div>
        </section>
      )}
    </>
  );
}

export default HeroSearch;