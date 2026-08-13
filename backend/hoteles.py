import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


# =========================================================
# CONFIGURACIÓN
# =========================================================

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

STAYING_API_KEY = os.getenv("STAYING_API_KEY")

STAYING_API_BASE = "https://api.stayingapi.com"


# =========================================================
# COMPROBACIÓN DE CONFIGURACIÓN
# =========================================================

def comprobar_api_key():
    """
    Comprueba que Atlas tenga configurada la clave
    de StayingAPI.
    """

    if not STAYING_API_KEY:
        raise RuntimeError(
            "Falta STAYING_API_KEY en backend/.env"
        )


def obtener_headers():
    """
    Cabeceras necesarias para StayingAPI.
    """

    comprobar_api_key()

    return {
        "Authorization": f"Bearer {STAYING_API_KEY}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


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


def convertir_int(valor):
    if valor is None:
        return None

    try:
        return int(valor)

    except (TypeError, ValueError):
        return None


def obtener_primera_imagen(hotel):
    imagenes = hotel.get("images")

    if isinstance(imagenes, list) and imagenes:
        return imagenes[0]

    if isinstance(imagenes, str):
        return imagenes

    return None


def obtener_ubicacion(hotel):
    ubicacion = hotel.get("location")

    if not isinstance(ubicacion, dict):
        return {
            "ciudad": None,
            "region": None,
            "pais": None,
            "direccion": None,
            "latitud": None,
            "longitud": None,
        }

    return {
        "ciudad": ubicacion.get("city"),
        "region": ubicacion.get("region"),
        "pais": ubicacion.get("country"),
        "direccion": ubicacion.get("address"),
        "latitud": ubicacion.get("lat"),
        "longitud": ubicacion.get("lng"),
    }


# =========================================================
# PRECIO
# =========================================================

def obtener_precio(hotel, moneda_solicitada):
    """
    StayingAPI devuelve la información económica
    dentro del objeto 'price'.
    """

    precio = hotel.get("price")

    if not isinstance(precio, dict):
        return {
            "precio_noche": None,
            "precio_total": None,
            "noches": None,
            "moneda": moneda_solicitada.upper(),
            "tasas_limpieza": None,
            "tasas_servicio": None,
            "impuestos": None,
        }

    fees = precio.get("fees")

    if not isinstance(fees, dict):
        fees = {}

    return {
        "precio_noche": convertir_float(
            precio.get("nightlyPrice")
        ),
        "precio_total": convertir_float(
            precio.get("totalPrice")
        ),
        "noches": convertir_int(
            precio.get("nights")
        ),
        "moneda": (
            precio.get("currency")
            or moneda_solicitada
        ).upper(),
        "tasas_limpieza": convertir_float(
            fees.get("cleaning")
        ),
        "tasas_servicio": convertir_float(
            fees.get("service")
        ),
        "impuestos": convertir_float(
            fees.get("taxes")
        ),
    }


# =========================================================
# OCUPACIÓN
# =========================================================

def obtener_ocupacion(hotel):
    precio = hotel.get("price")

    if not isinstance(precio, dict):
        return {
            "adultos": None,
            "ninos": None,
            "edades_ninos": [],
        }

    ocupacion = precio.get("occupancy")

    if not isinstance(ocupacion, dict):
        return {
            "adultos": None,
            "ninos": None,
            "edades_ninos": [],
        }

    edades = ocupacion.get("childAges")

    if not isinstance(edades, list):
        edades = []

    return {
        "adultos": convertir_int(
            ocupacion.get("adults")
        ),
        "ninos": convertir_int(
            ocupacion.get("children")
        ),
        "edades_ninos": edades,
    }


# =========================================================
# ENLACE
# =========================================================

def obtener_enlace(hotel):
    """
    Preferimos el enlace asociado al precio porque
    puede contener fechas y ocupación.
    """

    precio = hotel.get("price")

    if isinstance(precio, dict):
        enlace_precio = precio.get("url")

        if enlace_precio:
            return enlace_precio

    return hotel.get("url")


# =========================================================
# NORMALIZACIÓN DE HOTEL
# =========================================================

def normalizar_hotel(
    hotel: dict[str, Any],
    moneda_solicitada: str,
):
    """
    Convierte StayingAPI al formato interno de Atlas.

    De esta forma el frontend de Atlas no dependerá
    directamente de StayingAPI.
    """

    ubicacion = obtener_ubicacion(hotel)

    precio = obtener_precio(
        hotel,
        moneda_solicitada,
    )

    ocupacion = obtener_ocupacion(hotel)

    plataforma = (
        hotel.get("platform")
        or (
            hotel.get("price", {}).get("source")
            if isinstance(hotel.get("price"), dict)
            else None
        )
    )

    servicios = hotel.get("amenities")

    if not isinstance(servicios, list):
        servicios = []

    return {
        "id": hotel.get("id"),

        "nombre": hotel.get("name"),

        "tipo_alojamiento": hotel.get(
            "propertyType"
        ),

        "plataforma": plataforma,

        "ciudad": ubicacion["ciudad"],

        "region": ubicacion["region"],

        "pais": ubicacion["pais"],

        "direccion": ubicacion["direccion"],

        "latitud": ubicacion["latitud"],

        "longitud": ubicacion["longitud"],

        "estrellas": convertir_float(
            hotel.get("starRating")
        ),

        "puntuacion": convertir_float(
            hotel.get("guestRating")
        ),

        "escala_puntuacion": convertir_float(
            hotel.get("ratingScale")
        ),

        "numero_opiniones": convertir_int(
            hotel.get("reviewCount")
        ),

        "capacidad_maxima": convertir_int(
            hotel.get("maxOccupancy")
        ),

        "habitaciones": convertir_int(
            hotel.get("bedrooms")
        ),

        "banos": convertir_int(
            hotel.get("bathrooms")
        ),

        "servicios": servicios,

        "imagen": obtener_primera_imagen(
            hotel
        ),

        "precio_noche": precio[
            "precio_noche"
        ],

        "precio_total": precio[
            "precio_total"
        ],

        "noches": precio["noches"],

        "moneda": precio["moneda"],

        "tasas_limpieza": precio[
            "tasas_limpieza"
        ],

        "tasas_servicio": precio[
            "tasas_servicio"
        ],

        "impuestos": precio["impuestos"],

        "adultos": ocupacion["adultos"],

        "ninos": ocupacion["ninos"],

        "edades_ninos": ocupacion[
            "edades_ninos"
        ],

        "link": obtener_enlace(hotel),
    }


# =========================================================
# EXTRAER RESULTADOS
# =========================================================

def extraer_hoteles(datos):
    """
    Obtiene la lista de alojamientos independientemente
    del nivel en el que venga dentro del JSON.
    """

    if isinstance(datos, list):
        return datos

    if not isinstance(datos, dict):
        return []

    posibles_claves = (
        "data",
        "results",
        "hotels",
        "properties",
        "accommodations",
        "stays",
    )

    for clave in posibles_claves:
        contenido = datos.get(clave)

        if isinstance(contenido, list):
            return contenido

        if isinstance(contenido, dict):

            for subclave in posibles_claves:
                lista = contenido.get(subclave)

                if isinstance(lista, list):
                    return lista

    return []


# =========================================================
# BÚSQUEDA DE HOTELES
# =========================================================

def buscar_hoteles(
    destino: str,
    fecha_entrada: str,
    fecha_salida: str,
    adultos: int = 1,
    ninos: int = 0,
    moneda: str = "EUR",
    limite: int = 10,
):
    """
    Busca alojamientos para Atlas.

    IMPORTANTE:
    con una API Key Sandbox, StayingAPI devuelve
    datos de prueba deterministas.

    Cuando usemos una clave Live, esta misma función
    podrá trabajar con resultados reales.
    """

    comprobar_api_key()

    destino = destino.strip()

    if not destino:
        raise ValueError(
            "El destino es obligatorio"
        )

    if not fecha_entrada:
        raise ValueError(
            "La fecha de entrada es obligatoria"
        )

    if not fecha_salida:
        raise ValueError(
            "La fecha de salida es obligatoria"
        )

    if fecha_salida <= fecha_entrada:
        raise ValueError(
            "La fecha de salida debe ser posterior "
            "a la fecha de entrada"
        )

    if adultos < 1:
        raise ValueError(
            "Debe viajar al menos 1 adulto"
        )

    if ninos < 0:
        raise ValueError(
            "El número de niños no puede ser negativo"
        )

    limite = max(
        1,
        min(int(limite), 30),
    )

    url = (
        f"{STAYING_API_BASE}/v1/search"
    )

    payload = {
        "location": destino,
        "checkin": fecha_entrada,
        "checkout": fecha_salida,
        "adults": adultos,
        "children": ninos,
        "currency": moneda.upper(),
    }

    try:
        respuesta = requests.post(
            url,
            json=payload,
            headers=obtener_headers(),
            timeout=30,
        )

    except requests.RequestException as error:
        raise RuntimeError(
            "No se pudo conectar con StayingAPI: "
            f"{error}"
        ) from error

    if respuesta.status_code not in (
        200,
        201,
    ):
        raise RuntimeError(
            "StayingAPI devolvió un error "
            f"{respuesta.status_code}: "
            f"{respuesta.text}"
        )

    try:
        datos = respuesta.json()

    except ValueError as error:
        raise RuntimeError(
            "StayingAPI devolvió una respuesta "
            "que no es JSON"
        ) from error

    hoteles_originales = extraer_hoteles(
        datos
    )

    hoteles = []

    for hotel in hoteles_originales:

        if not isinstance(hotel, dict):
            continue

        normalizado = normalizar_hotel(
            hotel,
            moneda,
        )

        hoteles.append(normalizado)

        if len(hoteles) >= limite:
            break

    # Ordenamos primero por precio total.
    hoteles.sort(
        key=lambda hotel: (
            hotel["precio_total"]
            if hotel["precio_total"]
            is not None
            else float("inf")
        )
    )

    return {
        "destino_solicitado": destino,

        "fecha_entrada_solicitada":
            fecha_entrada,

        "fecha_salida_solicitada":
            fecha_salida,

        "adultos_solicitados": adultos,

        "ninos_solicitados": ninos,

        "moneda_solicitada":
            moneda.upper(),

        "fuente": "StayingAPI",

        "numero_resultados":
            len(hoteles),

        "hoteles": hoteles,
    }


# =========================================================
# PRUEBA DIRECTA
# =========================================================

if __name__ == "__main__":

    resultado = buscar_hoteles(
        destino="Palma de Mallorca",
        fecha_entrada="2026-10-15",
        fecha_salida="2026-10-17",
        adultos=1,
        ninos=0,
        moneda="EUR",
        limite=5,
    )

    print(
        "\n"
        "====================================="
    )

    print(
        "ATLAS - PRUEBA DE ALOJAMIENTOS"
    )

    print(
        "====================================="
    )

    print(
        f"Destino solicitado: "
        f"{resultado['destino_solicitado']}"
    )

    print(
        f"Resultados: "
        f"{resultado['numero_resultados']}"
    )

    print()

    for numero, hotel in enumerate(
        resultado["hoteles"],
        start=1,
    ):

        print(
            f"{numero}. "
            f"{hotel['nombre']}"
        )

        print(
            f"   Plataforma: "
            f"{hotel['plataforma']}"
        )

        print(
            f"   Ubicación devuelta: "
            f"{hotel['ciudad']} / "
            f"{hotel['pais']}"
        )

        print(
            f"   Precio/noche: "
            f"{hotel['precio_noche']} "
            f"{hotel['moneda']}"
        )

        print(
            f"   Precio total: "
            f"{hotel['precio_total']} "
            f"{hotel['moneda']}"
        )

        print(
            f"   Noches: "
            f"{hotel['noches']}"
        )

        print(
            f"   Puntuación: "
            f"{hotel['puntuacion']} / "
            f"{hotel['escala_puntuacion']}"
        )

        print(
            f"   Opiniones: "
            f"{hotel['numero_opiniones']}"
        )

        print(
            f"   Enlace: "
            f"{hotel['link']}"
        )

        print()