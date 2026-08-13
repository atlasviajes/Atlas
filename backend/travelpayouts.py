import os

import requests


TRAVELPAYOUTS_API_TOKEN = os.getenv("TRAVELPAYOUTS_API_TOKEN")


# =========================================================
# CONFIGURACIÓN
# =========================================================

API_BASE = "https://api.travelpayouts.com"
AVIASALES_BASE = "https://www.aviasales.com"


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

    La conversión a enlace afiliado se puede hacer
    posteriormente desde el backend de Atlas.
    """

    if not link:
        return None

    if link.startswith("http://") or link.startswith("https://"):
        return link

    if link.startswith("/"):
        return f"{AVIASALES_BASE}{link}"

    return f"{AVIASALES_BASE}/{link}"


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
        resultados.append(
            {
                "origen": vuelo.get("origin"),
                "destino": vuelo.get("destination"),
                "precio": vuelo.get("price"),
                "moneda": moneda.upper(),
                "salida": vuelo.get("departure_at"),
                "regreso": vuelo.get("return_at"),
                "aerolinea": vuelo.get("airline"),
                "numero_vuelo": vuelo.get("flight_number"),
                "duracion": vuelo.get("duration"),
                "duracion_ida": vuelo.get("duration_to"),
                "duracion_vuelta": vuelo.get("duration_back"),
                "escalas": vuelo.get("transfers"),
                "escalas_vuelta": vuelo.get("return_transfers"),
                "proveedor": vuelo.get("gate"),
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
        destino = vuelo.get("destination")
        precio = vuelo.get("price")

        if not destino or precio is None:
            continue

        try:
            precio_numero = float(precio)
        except (TypeError, ValueError):
            continue

        if presupuesto is not None:
            if precio_numero > float(presupuesto):
                continue

        # Una sola oportunidad por destino.
        if destino in destinos_vistos:
            continue

        destinos_vistos.add(destino)

        escalas_ida = vuelo.get("transfers")
        escalas_vuelta = vuelo.get(
            "return_transfers"
        )

        es_directo = (
            escalas_ida == 0
            and escalas_vuelta == 0
        )

        oportunidades.append(
            {
                "origen": vuelo.get("origin"),
                "destino": destino,
                "precio": precio_numero,
                "moneda": moneda.upper(),
                "salida": vuelo.get("departure_at"),
                "regreso": vuelo.get("return_at"),
                "aerolinea": vuelo.get("airline"),
                "numero_vuelo": vuelo.get(
                    "flight_number"
                ),
                "duracion": vuelo.get("duration"),
                "duracion_ida": vuelo.get(
                    "duration_to"
                ),
                "duracion_vuelta": vuelo.get(
                    "duration_back"
                ),
                "escalas_ida": escalas_ida,
                "escalas_vuelta": escalas_vuelta,
                "directo": es_directo,
                "proveedor": vuelo.get("gate"),
                "link": generar_link_aviasales(
                    vuelo.get("link")
                ),
            }
        )

    oportunidades.sort(
        key=lambda oportunidad: (
            oportunidad["precio"],
            0 if oportunidad["directo"] else 1,
        )
    )

    return oportunidades