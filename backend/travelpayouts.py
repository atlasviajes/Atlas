import os
import requests


TRAVELPAYOUTS_API_TOKEN = os.getenv("TRAVELPAYOUTS_API_TOKEN")
TRAVELPAYOUTS_PROJECT_ID = os.getenv("TRAVELPAYOUTS_PROJECT_ID")
TRAVELPAYOUTS_PARTNER_ID = os.getenv("TRAVELPAYOUTS_PARTNER_ID")

AFFILIATE_BASE = "https://aviasales.tpm.lv"


def generar_link_afiliado(link):
    """
    Convierte el link devuelto por Travelpayouts
    en un enlace afiliado.
    """
    if not link:
        return None

    if link.startswith("http://") or link.startswith("https://"):
        return link

    return f"{AFFILIATE_BASE}{link}"


def buscar_vuelos(
    origen,
    destino,
    fecha_salida=None,
    fecha_regreso=None,
    moneda="eur",
):
    """
    Consulta precios de vuelos en Travelpayouts.
    """

    if not TRAVELPAYOUTS_API_TOKEN:
        raise RuntimeError(
            "Falta TRAVELPAYOUTS_API_TOKEN en las variables de entorno"
        )

    url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"

    params = {
        "origin": origen.upper(),
        "destination": destino.upper(),
        "currency": moneda.lower(),
        "token": TRAVELPAYOUTS_API_TOKEN,
        "limit": 30,
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
                "escalas": vuelo.get("transfers"),
                "link": generar_link_afiliado(vuelo.get("link")),
            }
        )

    return resultados