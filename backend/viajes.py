from typing import Any


# =========================================================
# UTILIDADES
# =========================================================

def convertir_float(valor):
    if valor is None:
        return None

    try:
        return float(valor)

    except (TypeError, ValueError):
        return None


def limitar(valor, minimo, maximo):
    return max(
        minimo,
        min(valor, maximo),
    )


# =========================================================
# EXTRAER VUELOS DE TRAVELPAYOUTS
# =========================================================

def extraer_lista_vuelos(respuesta_vuelos):
    """
    obtener_vuelos() devuelve:

    {
        "origen": ...,
        "destino": ...,
        "resultados": {
            "data": [...]
        }
    }

    Esta función obtiene únicamente la lista de vuelos.
    """

    if not isinstance(
        respuesta_vuelos,
        dict,
    ):
        return []

    resultados = respuesta_vuelos.get(
        "resultados"
    )

    if not isinstance(resultados, dict):
        return []

    vuelos = resultados.get("data")

    if not isinstance(vuelos, list):
        return []

    return vuelos


# =========================================================
# NORMALIZAR VUELO
# =========================================================

def normalizar_vuelo(
    vuelo: dict[str, Any],
    moneda: str,
):
    precio = convertir_float(
        vuelo.get("price")
    )

    escalas_ida = vuelo.get(
        "transfers"
    )

    escalas_vuelta = vuelo.get(
        "return_transfers"
    )

    directo = (
        escalas_ida == 0
        and escalas_vuelta == 0
    )

    return {
        "origen": vuelo.get("origin"),
        "destino": vuelo.get(
            "destination"
        ),

        "precio_persona": precio,
        "moneda": moneda.upper(),

        "salida": vuelo.get(
            "departure_at"
        ),
        "regreso": vuelo.get(
            "return_at"
        ),

        "aerolinea": vuelo.get(
            "airline"
        ),
        "numero_vuelo": vuelo.get(
            "flight_number"
        ),

        "duracion": vuelo.get(
            "duration"
        ),
        "duracion_ida": vuelo.get(
            "duration_to"
        ),
        "duracion_vuelta": vuelo.get(
            "duration_back"
        ),

        "escalas_ida": escalas_ida,
        "escalas_vuelta":
            escalas_vuelta,

        "directo": directo,

        "proveedor": vuelo.get(
            "gate"
        ),

        "link": vuelo.get("link"),
    }


# =========================================================
# SELECCIONAR MEJOR VUELO
# =========================================================

def seleccionar_mejor_vuelo(
    respuesta_vuelos,
    moneda="EUR",
):
    """
    Selecciona el vuelo válido de menor precio.

    Travelpayouts devuelve precios encontrados
    recientemente, no disponibilidad garantizada.
    """

    vuelos_originales = (
        extraer_lista_vuelos(
            respuesta_vuelos
        )
    )

    vuelos = []

    for vuelo in vuelos_originales:

        if not isinstance(vuelo, dict):
            continue

        normalizado = normalizar_vuelo(
            vuelo,
            moneda,
        )

        if (
            normalizado[
                "precio_persona"
            ]
            is None
        ):
            continue

        vuelos.append(normalizado)

    if not vuelos:
        return None

    vuelos.sort(
        key=lambda vuelo: (
            vuelo["precio_persona"],
            0
            if vuelo["directo"]
            else 1,
        )
    )

    return vuelos[0]


# =========================================================
# SELECCIONAR HOTEL
# =========================================================

def seleccionar_mejor_hotel(
    respuesta_hoteles,
):
    """
    Selecciona el alojamiento con menor
    precio total válido.
    """

    if not isinstance(
        respuesta_hoteles,
        dict,
    ):
        return None

    hoteles = respuesta_hoteles.get(
        "hoteles"
    )

    if not isinstance(hoteles, list):
        return None

    candidatos = []

    for hotel in hoteles:

        if not isinstance(hotel, dict):
            continue

        precio_total = convertir_float(
            hotel.get("precio_total")
        )

        if precio_total is None:
            continue

        candidato = dict(hotel)

        candidato[
            "precio_total"
        ] = precio_total

        candidatos.append(candidato)

    if not candidatos:
        return None

    candidatos.sort(
        key=lambda hotel:
            hotel["precio_total"]
    )

    return candidatos[0]


# =========================================================
# COSTE DE VUELOS
# =========================================================

def calcular_coste_vuelos(
    precio_persona,
    adultos=1,
    ninos=0,
    bebes=0,
):
    """
    Primera versión del cálculo.

    Travelpayouts nos proporciona un precio de
    referencia por pasajero para la oportunidad.

    Hasta disponer de pricing por tipo de pasajero,
    Atlas usa el precio de referencia para adultos
    y niños.

    Los bebés se mantienen separados y no se
    incorporan todavía al cálculo para evitar
    inventar una tarifa inexistente.
    """

    precio_persona = convertir_float(
        precio_persona
    )

    if precio_persona is None:
        return None

    adultos = max(
        int(adultos),
        0,
    )

    ninos = max(
        int(ninos),
        0,
    )

    bebes = max(
        int(bebes),
        0,
    )

    pasajeros_tarificados = (
        adultos + ninos
    )

    total = (
        precio_persona
        * pasajeros_tarificados
    )

    return {
        "precio_referencia_persona":
            round(precio_persona, 2),

        "adultos": adultos,
        "ninos": ninos,
        "bebes": bebes,

        "pasajeros_tarificados":
            pasajeros_tarificados,

        "total_vuelos":
            round(total, 2),

        "nota_bebes": (
            "La tarifa de bebés debe "
            "confirmarse con el proveedor"
            if bebes > 0
            else None
        ),
    }


# =========================================================
# ATLAS SCORE DEL VIAJE
# =========================================================

def calcular_atlas_score_viaje(
    total_viaje,
    presupuesto=None,
    vuelo_directo=False,
    hotel_puntuacion=None,
):
    """
    Score inicial del viaje completo.

    Combina:
    - relación con presupuesto
    - vuelo directo
    - valoración del alojamiento

    Más adelante añadiremos:
    - calidad/precio histórica
    - distancia a fechas deseadas
    - equipaje
    - horarios
    - traslados
    - tendencia de precios
    """

    score = 70

    total_viaje = convertir_float(
        total_viaje
    )

    presupuesto = convertir_float(
        presupuesto
    )

    # -----------------------------------------
    # PRESUPUESTO
    # -----------------------------------------

    if (
        presupuesto is not None
        and presupuesto > 0
        and total_viaje is not None
    ):
        porcentaje = (
            total_viaje
            / presupuesto
        )

        if porcentaje <= 0.70:
            score += 20

        elif porcentaje <= 0.85:
            score += 15

        elif porcentaje <= 1:
            score += 10

        elif porcentaje <= 1.10:
            score -= 10

        else:
            score -= 20

    # -----------------------------------------
    # VUELO DIRECTO
    # -----------------------------------------

    if vuelo_directo:
        score += 5

    # -----------------------------------------
    # HOTEL
    # -----------------------------------------

    puntuacion = convertir_float(
        hotel_puntuacion
    )

    if puntuacion is not None:

        if puntuacion >= 9:
            score += 5

        elif puntuacion >= 8:
            score += 3

    score = limitar(
        int(round(score)),
        0,
        100,
    )

    if score >= 90:
        etiqueta = (
            "Excelente oportunidad"
        )

    elif score >= 80:
        etiqueta = (
            "Muy buena oportunidad"
        )

    elif score >= 70:
        etiqueta = (
            "Buena oportunidad"
        )

    elif score >= 60:
        etiqueta = (
            "Oportunidad interesante"
        )

    else:
        etiqueta = (
            "Conviene comparar"
        )

    return {
        "score": score,
        "etiqueta": etiqueta,
    }


# =========================================================
# COMBINAR VUELO + HOTEL
# =========================================================

def construir_viaje(
    respuesta_vuelos,
    respuesta_hoteles,
    adultos=1,
    ninos=0,
    bebes=0,
    presupuesto=None,
    moneda="EUR",
):
    """
    Construye una oportunidad completa de Atlas:

        vuelo
        +
        alojamiento
        =
        total del viaje
    """

    vuelo = seleccionar_mejor_vuelo(
        respuesta_vuelos,
        moneda=moneda,
    )

    if vuelo is None:
        return {
            "ok": False,
            "motivo":
                "No se encontró un vuelo válido",
        }

    hotel = seleccionar_mejor_hotel(
        respuesta_hoteles
    )

    if hotel is None:
        return {
            "ok": False,
            "motivo":
                "No se encontró un alojamiento válido",
        }

    coste_vuelos = (
        calcular_coste_vuelos(
            precio_persona=vuelo[
                "precio_persona"
            ],
            adultos=adultos,
            ninos=ninos,
            bebes=bebes,
        )
    )

    if coste_vuelos is None:
        return {
            "ok": False,
            "motivo":
                "No se pudo calcular el coste de los vuelos",
        }

    total_vuelos = coste_vuelos[
        "total_vuelos"
    ]

    total_hotel = convertir_float(
        hotel.get("precio_total")
    )

    if total_hotel is None:
        return {
            "ok": False,
            "motivo":
                "El alojamiento no tiene precio total",
        }

    total_viaje = round(
        total_vuelos
        + total_hotel,
        2,
    )

    presupuesto_numero = (
        convertir_float(
            presupuesto
        )
    )

    if presupuesto_numero is None:
        dentro_presupuesto = None
        diferencia_presupuesto = None

    else:
        dentro_presupuesto = (
            total_viaje
            <= presupuesto_numero
        )

        diferencia_presupuesto = round(
            presupuesto_numero
            - total_viaje,
            2,
        )

    atlas_score = (
        calcular_atlas_score_viaje(
            total_viaje=total_viaje,
            presupuesto=
                presupuesto_numero,
            vuelo_directo=vuelo[
                "directo"
            ],
            hotel_puntuacion=hotel.get(
                "puntuacion"
            ),
        )
    )

    return {
        "ok": True,

        "moneda": moneda.upper(),

        "pasajeros": {
            "adultos": adultos,
            "ninos": ninos,
            "bebes": bebes,
        },

        "vuelo": vuelo,

        "alojamiento": hotel,

        "costes": {
            "vuelos": total_vuelos,
            "alojamiento":
                round(
                    total_hotel,
                    2,
                ),
            "total_viaje":
                total_viaje,
        },

        "presupuesto": {
            "maximo":
                presupuesto_numero,

            "dentro_presupuesto":
                dentro_presupuesto,

            "diferencia":
                diferencia_presupuesto,
        },

        "atlas_score": atlas_score,

        "avisos": {
            "vuelo": (
                "Precio encontrado recientemente; "
                "debe confirmarse con el proveedor."
            ),

            "alojamiento": (
                "Mientras StayingAPI utilice "
                "Sandbox, el alojamiento es "
                "un dato de prueba."
            ),

            "bebes":
                coste_vuelos[
                    "nota_bebes"
                ],
        },
    }