import os

import requests


TRAVELPAYOUTS_API_TOKEN = os.getenv("TRAVELPAYOUTS_API_TOKEN")


# =========================================================
# CONFIGURACIÓN
# =========================================================

API_BASE = "https://api.travelpayouts.com"
AVIASALES_BASE = "https://www.aviasales.com"

CIUDADES_URL = f"{API_BASE}/data/es/cities.json"

_cache_ciudades = None


# =========================================================
# UTILIDADES
# =========================================================

def comprobar_token():
    if not TRAVELPAYOUTS_API_TOKEN:
        raise RuntimeError(
            "Falta TRAVELPAYOUTS_API_TOKEN en las variables de entorno"
        )


def generar_link_aviasales(link):
    """
    Convierte el link devuelto por Travelpayouts
    en una URL completa de Aviasales.
    """

    if not link:
        return None

    if link.startswith("http://") or link.startswith("https://"):
        return link

    if link.startswith("/"):
        return f"{AVIASALES_BASE}{link}"

    return f"{AVIASALES_BASE}/{link}"


def cargar_ciudades():
    """
    Descarga la base oficial de ciudades de Travelpayouts
    en español y la guarda en memoria.

    Devuelve un diccionario:
    {
        "LON": {...},
        "PMI": {...},
        ...
    }
    """

    global _cache_ciudades

    if _cache_ciudades is not None:
        return _cache_ciudades

    try:
        respuesta = requests.get(
            CIUDADES_URL,
            timeout=20,
            headers={
                "Accept-Encoding": "gzip, deflate",
            },
        )

        respuesta.raise_for_status()

        datos = respuesta.json()

        ciudades = {}

        for ciudad in datos:
            codigo = ciudad.get("code")

            if not codigo:
                continue

            ciudades[codigo.upper()] = ciudad

        _cache_ciudades = ciudades

    except requests.RequestException:
        _cache_ciudades = {}

    except ValueError:
        _cache_ciudades = {}

    return _cache_ciudades


def obtener_datos_ciudad(codigo):
    """
    Busca los datos de una ciudad por código IATA.
    """

    if not codigo:
        return {
            "nombre": None,
            "pais_codigo": None,
        }

    ciudades = cargar_ciudades()

    ciudad = ciudades.get(
        codigo.upper(),
        {}
    )

    nombre = ciudad.get("name")

    if not nombre:
        traducciones = ciudad.get(
            "name_translations",
            {}
        )

        nombre = (
            traducciones.get("es")
            or traducciones.get("en")
        )

    return {
        "nombre": nombre or codigo.upper(),
        "pais_codigo": ciudad.get(
            "country_code"
        ),
    }


# =========================================================
# VUELOS PARA UNA RUTA CONCRETA
# =========================================================

def buscar_vuelos(
    origen,
    destino,
    fecha_salida=None,
    fecha_regreso=None,
    moneda="eur",
    limite=30,
):
    """
    Consulta precios encontrados recientemente
    para una ruta concreta.

    Importante:
    esta API trabaja con datos almacenados en caché.
    No representa disponibilidad en tiempo real.
    """

    comprobar_token()

    url = f"{API_BASE}/aviasales/v3/prices_for_dates"

    params = {
        "origin": origen.strip().upper(),
        "destination": destino.strip().upper(),
        "currency": moneda.lower(),
        "token": TRAVELPAYOUTS_API_TOKEN,
        "limit": limite,
        "page": 1,
        "sorting": "price",
        "direct": "false",
        "one_way": "false",
    }

    if fecha_salida:
        params["departure_at"] = fecha_salida

    if fecha_regreso:
        params["return_at"] = fecha_regreso

    respuesta = requests.get(
        url,
        params=params,
        timeout=20,
        headers={
            "Accept-Encoding": "gzip, deflate",
        },
    )

    respuesta.raise_for_status()

    datos = respuesta.json()

    vuelos = datos.get("data", [])

    resultados = []

    for vuelo in vuelos:
        destino_codigo = vuelo.get(
            "destination"
        )

        datos_destino = obtener_datos_ciudad(
            destino_codigo
        )

        resultados.append(
            {
                "origen": vuelo.get(
                    "origin"
                ),
                "destino": destino_codigo,
                "destino_nombre":
                    datos_destino["nombre"],
                "destino_pais_codigo":
                    datos_destino[
                        "pais_codigo"
                    ],
                "precio": vuelo.get(
                    "price"
                ),
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
                "escalas": vuelo.get(
                    "transfers"
                ),
                "escalas_vuelta": vuelo.get(
                    "return_transfers"
                ),
                "proveedor": vuelo.get(
                    "gate"
                ),
                "link": generar_link_aviasales(
                    vuelo.get("link")
                ),
            }
        )

    return resultados


# =========================================================
# MOTOR DE OPORTUNIDADES DE ATLAS
# =========================================================

def buscar_oportunidades_desde(
    origen="OVD",
    moneda="eur",
    presupuesto=None,
    limite=30,
    solo_directos=False,
):
    """
    Busca destinos diferentes desde un origen.

    Ejemplo:
        Asturias -> cualquier destino

    Devuelve oportunidades ordenadas por precio.

    Estos resultados son precios encontrados
    recientemente por Aviasales y no disponibilidad
    en tiempo real.
    """

    comprobar_token()

    url = f"{API_BASE}/aviasales/v3/prices_for_dates"

    params = {
        "origin": origen.strip().upper(),
        "currency": moneda.lower(),
        "token": TRAVELPAYOUTS_API_TOKEN,
        "limit": limite,
        "page": 1,
        "sorting": "price",
        "unique": "true",
        "direct": (
            "true"
            if solo_directos
            else "false"
        ),
        "one_way": "false",
    }

    respuesta = requests.get(
        url,
        params=params,
        timeout=20,
        headers={
            "Accept-Encoding": "gzip, deflate",
        },
    )

    respuesta.raise_for_status()

    datos = respuesta.json()

    vuelos = datos.get("data", [])

    oportunidades = []

    destinos_vistos = set()

    for vuelo in vuelos:
        destino = vuelo.get(
            "destination"
        )

        precio = vuelo.get(
            "price"
        )

        if not destino or precio is None:
            continue

        try:
            precio_numero = float(
                precio
            )
        except (TypeError, ValueError):
            continue

        if presupuesto is not None:
            if precio_numero > float(
                presupuesto
            ):
                continue

        if destino in destinos_vistos:
            continue

        destinos_vistos.add(
            destino
        )

        escalas_ida = vuelo.get(
            "transfers"
        )

        escalas_vuelta = vuelo.get(
            "return_transfers"
        )

        es_directo = (
            escalas_ida == 0
            and escalas_vuelta == 0
        )

        datos_destino = obtener_datos_ciudad(
            destino
        )

        oportunidades.append(
            {
                "origen": vuelo.get(
                    "origin"
                ),
                "destino": destino,
                "destino_nombre":
                    datos_destino[
                        "nombre"
                    ],
                "destino_pais_codigo":
                    datos_destino[
                        "pais_codigo"
                    ],
                "precio": precio_numero,
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
                "escalas_ida":
                    escalas_ida,
                "escalas_vuelta":
                    escalas_vuelta,
                "directo":
                    es_directo,
                "proveedor": vuelo.get(
                    "gate"
                ),
                "link": generar_link_aviasales(
                    vuelo.get("link")
                ),
            }
        )

    oportunidades.sort(
        key=lambda oportunidad: (
            oportunidad["precio"],
            0
            if oportunidad["directo"]
            else 1,
        )
    )

    return oportunidades