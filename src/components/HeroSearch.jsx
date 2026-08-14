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

  // Para el vuelo no contamos bebés como tarifa completa
  // porque Travelpayouts no nos devuelve una tarifa
  // diferenciada y no queremos inventarla.
  const pasajerosTarificados = adultos + ninos;

  const totalPersonas = adultos + ninos + bebes;

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

    const a = new Date(
      `${fechaA.slice(0, 10)}T00:00:00`
    );

    const b = new Date(
      `${fechaB.slice(0, 10)}T00:00:00`
    );

    const diferencia = Math.abs(a - b);

    return Math.round(
      diferencia / (1000 * 60 * 60 * 24)
    );
  };

  const clasificarCoincidencia = (vuelo) => {
    if (!fechaIda || !fechaVuelta) {
      return {
        nivel: 4,
        tipo: "oportunidad",
        etiqueta: "💡 OPORTUNIDAD ATLAS",
        diferenciaMaxima: null,
      };
    }

    const diasIda = diferenciaDias(
      vuelo.departure_at,
      fechaIda
    );

    const diasVuelta = diferenciaDias(
      vuelo.return_at,
      fechaVuelta
    );

    const diferenciaMaxima = Math.max(
      diasIda,
      diasVuelta
    );

    if (diferenciaMaxima === 0) {
      return {
        nivel: 0,
        tipo: "exacta",
        etiqueta: "🎯 COINCIDE CON TU BÚSQUEDA",
        diferenciaMaxima,
      };
    }

    if (diferenciaMaxima <= 2) {
      return {
        nivel: 1,
        tipo: "muy_cercana",
        etiqueta: `📅 FECHAS CERCANAS · ±${diferenciaMaxima} ${diferenciaMaxima === 1 ? "DÍA" : "DÍAS"}`,
        diferenciaMaxima,
      };
    }

    return {
      nivel: 2,
      tipo: "alternativa",
      etiqueta: `💡 OTRAS FECHAS · ${diferenciaMaxima} ${diferenciaMaxima === 1 ? "DÍA" : "DÍAS"} DE DIFERENCIA`,
      diferenciaMaxima,
    };
  };

  const ordenarBusquedaPorCoincidencia = (lista) => {
    return [...lista].sort((a, b) => {
      const coincidenciaA = clasificarCoincidencia(a);
      const coincidenciaB = clasificarCoincidencia(b);

      if (coincidenciaA.nivel !== coincidenciaB.nivel) {
        return coincidenciaA.nivel - coincidenciaB.nivel;
      }

      const scoreA = calcularAtlasScore(a);
      const scoreB = calcularAtlasScore(b);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return Number(a.price) - Number(b.price);
    });
  };

const formatearFechaCorta = (fechaISO) => {
  if (!fechaISO) return "";

  const fechaLimpia = String(fechaISO).slice(0, 10);
  const [anio, mes, dia] = fechaLimpia.split("-");

  if (!anio || !mes || !dia) {
    return fechaISO;
  }

  return `${dia}/${mes}/${anio}`;
};

const formatearFecha = (fechaISO) => {
  if (!fechaISO) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
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

  const calcularTotalVuelo = (vuelo) => {
    const precio =
      Number(vuelo.price) || 0;

    return (
      precio * pasajerosTarificados
    );
  };

  const calcularAtlasScore = (vuelo) => {
    let score = 0;

    const totalEstimado =
      calcularTotalVuelo(vuelo);

    // PRECIO: máximo 40 puntos
    if (
      presupuesto &&
      Number(presupuesto) > 0
    ) {
      const porcentaje =
        totalEstimado /
        Number(presupuesto);

      if (porcentaje <= 0.35) {
        score += 40;
      } else if (porcentaje <= 0.5) {
        score += 35;
      } else if (porcentaje <= 0.7) {
        score += 30;
      } else if (porcentaje <= 0.85) {
        score += 22;
      } else if (porcentaje <= 1) {
        score += 15;
      }
    } else {
      score += 25;
    }

    // ESCALAS: máximo 25 puntos
    const escalasIda =
      Number(vuelo.transfers) || 0;

    const escalasVuelta =
      Number(vuelo.return_transfers) || 0;

    const escalasTotales =
      escalasIda + escalasVuelta;

    if (escalasTotales === 0) {
      score += 25;
    } else if (escalasTotales === 1) {
      score += 18;
    } else if (escalasTotales === 2) {
      score += 10;
    } else {
      score += 3;
    }

    // DURACIÓN: máximo 20 puntos
    const duracion =
      Number(vuelo.duration) || 0;

    if (
      duracion > 0 &&
      duracion <= 240
    ) {
      score += 20;
    } else if (duracion <= 480) {
      score += 16;
    } else if (duracion <= 720) {
      score += 10;
    } else if (duracion <= 1200) {
      score += 5;
    }

    // CERCANÍA A FECHAS: máximo 15 puntos
    if (
      modoResultados === "fechas" &&
      fechaIda &&
      fechaVuelta
    ) {
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

      const diferenciaMedia =
        (
          diferenciaIda +
          diferenciaVuelta
        ) / 2;

      if (diferenciaMedia <= 2) {
        score += 15;
      } else if (
        diferenciaMedia <= 7
      ) {
        score += 12;
      } else if (
        diferenciaMedia <= 15
      ) {
        score += 8;
      } else if (
        diferenciaMedia <= 30
      ) {
        score += 4;
      }
    } else {
      score += 10;
    }

    return Math.min(
      100,
      Math.round(score)
    );
  };

  const textoAtlasScore = (score) => {
    if (score >= 90) {
      return "Excelente oportunidad";
    }

    if (score >= 80) {
      return "Muy buena oportunidad";
    }

    if (score >= 70) {
      return "Buena oportunidad";
    }

    if (score >= 60) {
      return "Interesante";
    }

    return "Opción disponible";
  };

  const ordenarPorAtlasScore = (lista) => {
    return [...lista].sort(
      (a, b) => {
        const scoreA =
          calcularAtlasScore(a);

        const scoreB =
          calcularAtlasScore(b);

        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }

        return (
          Number(a.price) -
          Number(b.price)
        );
      }
    );
  };

  const aplicarPresupuesto = (lista) => {
    if (!presupuesto) {
      return lista;
    }

    return lista.filter((vuelo) => {
      const totalOrientativo =
        calcularTotalVuelo(vuelo);

      return (
        totalOrientativo <=
        Number(presupuesto)
      );
    });
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

      const respuesta =
        await fetch(url);

      if (!respuesta.ok) {
        throw new Error(
          "No se pudieron obtener oportunidades"
        );
      }

      const datos =
        await respuesta.json();

      let lista =
        datos?.resultados?.data || [];

      lista = lista.filter(
        (vuelo) => {
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
        }
      );

      lista =
        aplicarPresupuesto(lista);

      lista =
        ordenarBusquedaPorCoincidencia(
          lista
        );

      setVuelos(lista);

      if (lista.length === 0) {
        setMensaje(
          `No hemos encontrado vuelos para ${destinoTexto} exactamente del ${formatearFechaCorta(fechaIda)} al ${formatearFechaCorta(fechaVuelta)} dentro de tu presupuesto. Prueba OFERTAS AHORA para descubrir otras opciones.`
        );
        return;
      }

      const exactas =
        lista.filter(
          (vuelo) =>
            clasificarCoincidencia(
              vuelo
            ).tipo === "exacta"
        ).length;

      const cercanas =
        lista.filter(
          (vuelo) =>
            clasificarCoincidencia(
              vuelo
            ).tipo === "muy_cercana"
        ).length;

      const alternativas =
        lista.filter(
          (vuelo) =>
            clasificarCoincidencia(
              vuelo
            ).tipo === "alternativa"
        ).length;

      let texto = "";

      if (exactas > 0) {
        texto +=
          `🎯 Hemos encontrado ${exactas} ${
            exactas === 1
              ? "opción que coincide"
              : "opciones que coinciden"
          } con tu destino, fechas y presupuesto. `;
      } else {
        texto +=
          `No hemos encontrado vuelos para ${destinoTexto} exactamente del ${formatearFechaCorta(fechaIda)} al ${formatearFechaCorta(fechaVuelta)} dentro de tu presupuesto. `;
      }

      if (cercanas > 0) {
        texto +=
          `📅 Atlas ha encontrado ${cercanas} ${
            cercanas === 1
              ? "alternativa cercana"
              : "alternativas cercanas"
          } a un máximo de ±2 días. `;
      }

      if (alternativas > 0) {
        texto +=
          `💡 Además, ${
            alternativas === 1
              ? "hay 1 oportunidad para el mismo destino en otras fechas."
              : `hay ${alternativas} oportunidades para el mismo destino en otras fechas.`
          }`;
      }

      setMensaje(
        texto.trim()
      );
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
    const codigoOrigen =
      obtenerCodigo(
        origenCodigo,
        origenTexto
      );

    if (!codigoOrigen) {
      setMensaje(
        "Selecciona primero un origen."
      );
      return;
    }

    setBuscandoOfertas(true);
    setMensaje("");
    setVuelos([]);
    setModoResultados(
      "oportunidades"
    );

    try {
      const url = new URL(
        `${API_URL}/oportunidades`
      );

      url.searchParams.set(
        "origen",
        codigoOrigen
      );

      url.searchParams.set(
        "moneda",
        "EUR"
      );

      url.searchParams.set(
        "limite",
        "30"
      );

      if (
        presupuesto &&
        pasajerosTarificados > 0
      ) {
        const presupuestoPorPersona =
          Number(presupuesto) /
          pasajerosTarificados;

        url.searchParams.set(
          "presupuesto",
          presupuestoPorPersona.toFixed(
            2
          )
        );
      }

      const respuesta =
        await fetch(url);

      if (!respuesta.ok) {
        throw new Error(
          "No se pudieron obtener oportunidades"
        );
      }

      const datos =
        await respuesta.json();

      const oportunidades =
        datos?.oportunidades || [];

      let listaAdaptada =
        oportunidades.map(
          (oportunidad) => ({
            modo: "oportunidad",

            origin_airport:
              oportunidad.origen,

            destination_airport:
              oportunidad.destino,

            destination_name:
              oportunidad.destino_nombre ||
              oportunidad.destino,

            destination_country:
              oportunidad.destino_pais_codigo ||
              "",

            price:
              oportunidad.precio,

            departure_at:
              oportunidad.salida,

            return_at:
              oportunidad.regreso,

            airline:
              oportunidad.aerolinea,

            flight_number:
              oportunidad.numero_vuelo,

            duration:
              oportunidad.duracion,

            transfers:
              oportunidad.escalas_ida,

            return_transfers:
              oportunidad.escalas_vuelta,

            direct:
              oportunidad.directo,

            gate:
              oportunidad.proveedor,

            link:
              oportunidad.link,
          })
        );

      listaAdaptada =
        ordenarPorAtlasScore(
          listaAdaptada
        );

      setVuelos(listaAdaptada);

      if (
        listaAdaptada.length > 0
      ) {
        setMensaje(
          `Atlas ha encontrado ${listaAdaptada.length} destinos y los ha ordenado por calidad de oportunidad.`
        );
      } else {
        setMensaje(
          "No hemos encontrado destinos dentro de ese presupuesto. Prueba aumentando el presupuesto."
        );
      }
    } catch (error) {
      console.error(error);

      setMensaje(
        "No se pudieron consultar las oportunidades de Atlas."
      );
    } finally {
      setBuscandoOfertas(false);
    }
  };

  const prepararAlojamiento = (
    vuelo
  ) => {
    const destino =
      vuelo.destination_name ||
      destinoTexto ||
      vuelo.destination_airport;

    const entrada =
      vuelo.departure_at
        ? vuelo.departure_at.slice(
            0,
            10
          )
        : fechaIda;

    const salida =
      vuelo.return_at
        ? vuelo.return_at.slice(
            0,
            10
          )
        : fechaVuelta;

    setMensaje(
      `🏨 Atlas tiene preparada la búsqueda de alojamiento en ${destino} del ${entrada} al ${salida}. La fuente hotelera sigue en modo de pruebas, por lo que todavía no mostramos esos precios como reales.`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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

              {sugerenciasOrigen.length >
                0 && (
                <div className="autocomplete-list">
                  {sugerenciasOrigen.map(
                    (
                      lugar,
                      index
                    ) => (
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
                          {
                            lugar.nombre
                          }
                        </strong>

                        <span translate="no">
                          {
                            lugar.codigo
                          }
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

              {sugerenciasDestino.length >
                0 && (
                <div className="autocomplete-list">
                  {sugerenciasDestino.map(
                    (
                      lugar,
                      index
                    ) => (
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
                          {
                            lugar.nombre
                          }
                        </strong>

                        <span translate="no">
                          {
                            lugar.codigo
                          }
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
                min={
                  fechaIda || hoy
                }
                onChange={(e) =>
                  setFechaVuelta(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="hero-field">
              <span>Adultos</span>

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
                {[
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  7,
                  8,
                  9,
                ].map(
                  (numero) => (
                    <option
                      key={numero}
                      value={numero}
                    >
                      {numero}{" "}
                      {numero === 1
                        ? "adulto"
                        : "adultos"}
                    </option>
                  )
                )}
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
                {[
                  0,
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                ].map(
                  (numero) => (
                    <option
                      key={numero}
                      value={numero}
                    >
                      {numero}{" "}
                      {numero === 1
                        ? "niño"
                        : "niños"}
                    </option>
                  )
                )}
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
                {[
                  0,
                  1,
                  2,
                  3,
                  4,
                ].map(
                  (numero) => (
                    <option
                      key={numero}
                      value={numero}
                    >
                      {numero}{" "}
                      {numero === 1
                        ? "bebé"
                        : "bebés"}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="hero-field">
              <span>
                Presupuesto total máx.
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
              onClick={
                buscarOfertasAhora
              }
              disabled={
                buscando ||
                buscandoOfertas
              }
            >
              {buscandoOfertas
                ? "BUSCANDO DESTINOS..."
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
                  ? "🔎 Resultados para tu búsqueda"
                  : "⚡ Mejores oportunidades Atlas"}
              </h2>

              {modoResultados ===
              "fechas" ? (
                <>
                  <p>
                    {origenTexto} →{" "}
                    {destinoTexto}
                  </p>

                  <p>
                    Tú pediste:{" "}
                    {fechaIda} →{" "}
                    {fechaVuelta}
                  </p>
                </>
              ) : (
                <p>
                  Desde{" "}
                  {origenTexto} ·{" "}
                  {textoViajeros()} ·
                  máximo{" "}
                  {presupuesto ||
                    "sin límite"}{" "}
                  €
                </p>
              )}

              <small>
                Atlas Score combina precio,
                escalas, duración y cercanía
                a tus fechas. Los vuelos son
                precios encontrados
                recientemente y deben
                confirmarse con el proveedor.
              </small>

              {bebes > 0 && (
                <small>
                  👶 La tarifa de los bebés
                  no está incluida en el total
                  orientativo del vuelo y debe
                  confirmarse con el proveedor.
                </small>
              )}

            </div>
          </div>

          <div className="flight-grid">

            {vuelos.map(
              (
                vuelo,
                index
              ) => {
                const atlasScore =
                  calcularAtlasScore(
                    vuelo
                  );

                const totalVuelo =
                  calcularTotalVuelo(
                    vuelo
                  );

                const coincidencia =
                  modoResultados === "fechas"
                    ? clasificarCoincidencia(vuelo)
                    : null;

                return (
                  <article
                    className="flight-card"
                    key={`${vuelo.destination_airport}-${vuelo.departure_at}-${index}`}
                  >
                    {coincidencia && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          marginBottom: "14px",
                          padding: "7px 11px",
                          borderRadius: "9px",
                          background:
                            coincidencia.tipo === "exacta"
                              ? "#eaf8ef"
                              : coincidencia.tipo === "muy_cercana"
                              ? "#eef6ff"
                              : coincidencia.tipo === "flexible"
                              ? "#fff8e6"
                              : "#f8fafc",
                          color:
                            coincidencia.tipo === "exacta"
                              ? "#166534"
                              : coincidencia.tipo === "muy_cercana"
                              ? "#0f54c7"
                              : coincidencia.tipo === "flexible"
                              ? "#8a5600"
                              : "#475569",
                          fontSize: "11px",
                          fontWeight: "800",
                        }}
                      >
                        {coincidencia.etiqueta}
                      </div>
                    )}

                    <div className="flight-card-top">

                      <div>

                        {modoResultados ===
                          "oportunidades" && (
                          <>
                            <h2>
                              {
                                vuelo.destination_name
                              }
                            </h2>

                            {vuelo.destination_country && (
                              <small>
                                {
                                  vuelo.destination_country
                                }
                              </small>
                            )}
                          </>
                        )}

                        <span
                          className="flight-route"
                          translate="no"
                        >
                          {
                            vuelo.origin_airport
                          }{" "}
                          →{" "}
                          {
                            vuelo.destination_airport
                          }
                        </span>

                        <h3>
                          {vuelo.airline
                            ? `${vuelo.airline} · Vuelo ${
                                vuelo.flight_number ||
                                ""
                              }`
                            : "Oportunidad encontrada por Atlas"}
                        </h3>

                      </div>

                      <div className="flight-price">

                        <strong>
                          {
                            vuelo.price
                          }{" "}
                          €
                        </strong>

                        <span>
                          por persona
                        </span>

                      </div>

                    </div>

                    <div className="atlas-score">

                      <strong>
                        ⭐ Atlas Score{" "}
                        {atlasScore}/100
                      </strong>

                      <span>
                        {
                          textoAtlasScore(
                            atlasScore
                          )
                        }
                      </span>

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
                        <span>
                          Ida
                        </span>

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
                          {vuelo.gate ||
                            "-"}
                        </strong>
                      </div>

                    </div>

                    <div className="flight-info">

                      <div>
                        <span>
                          ✈️ Vuelo
                        </span>

                        <strong>
                          {totalVuelo.toFixed(
                            0
                          )}{" "}
                          €
                        </strong>
                      </div>

                      <div>
                        <span>
                          🏨 Alojamiento
                        </span>

                        <strong>
                          Conexión preparada
                        </strong>
                      </div>

                      <div>
                        <span>
                          👥 Viajeros
                        </span>

                        <strong>
                          {totalPersonas}
                        </strong>
                      </div>

                    </div>

                    <div className="flight-card-bottom">

                      <div>

                        <span>
                          Total orientativo
                          de vuelos
                        </span>

                        <strong>
                          {totalVuelo.toFixed(
                            0
                          )}{" "}
                          €
                        </strong>

                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >

                        <button
                          type="button"
                          onClick={() =>
                            prepararAlojamiento(
                              vuelo
                            )
                          }
                          style={{
                            border: "1px solid #1463df",
                            background: "white",
                            color: "#1463df",
                            borderRadius: "10px",
                            padding: "11px 16px",
                            fontWeight: "800",
                            fontSize: "12px",
                          }}
                        >
                          BUSCAR ALOJAMIENTO
                        </button>

                        <a
                          href={obtenerEnlaceVuelo(
                            vuelo
                          )}
                          target="_blank"
                          rel="noreferrer"
                        >
                          VER VUELO
                        </a>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>

        </section>
      )}
    </>
  );
}

export default HeroSearch;