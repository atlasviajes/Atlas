import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


# =========================================================
# CONFIGURACIÓN
# =========================================================

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

TRAVELPAYOUTS_API_TOKEN = os.getenv("TRAVELPAYOUTS_API_TOKEN")
TRAVELPAYOUTS_PROJECT_ID = os.getenv("TRAVELPAYOUTS_PROJECT_ID")
TRAVELPAYOUTS_PARTNER_ID = os.getenv("TRAVELPAYOUTS_PARTNER_ID")

STAYING_API_KEY = os.getenv("STAYING_API_KEY")


# =========================================================
# IMPORTACIONES INTERNAS
# =========================================================

# Compatibilidad:
# - ejecución desde raíz: backend.travelpayouts
# - ejecución desde backend: travelpayouts

try:
    from backend.travelpayouts import buscar_oportunidades_desde
    from backend.hoteles import buscar_hoteles
    from backend.viajes import construir_viaje
except ModuleNotFoundError:
    from travelpayouts import buscar_oportunidades_desde
    from hoteles import buscar_hoteles
    from viajes import construir_viaje

# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="Atlas API",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://atlas-flame-seven.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# INICIO
# =========================================================

@app.get("/")
def inicio():
    return {
        "app": "Atlas API",
        "estado": "online",
        "version": "0.4.0",
    }


# =========================================================
# SALUD
# =========================================================

@app.get("/salud")
def salud():
    return {
        "ok": True,
        "travelpayouts_configurado": bool(
            TRAVELPAYOUTS_API_TOKEN
        ),
        "project_id_configurado": bool(
            TRAVELPAYOUTS_PROJECT_ID
        ),
        "partner_id_configurado": bool(
            TRAVELPAYOUTS_PARTNER_ID
        ),
        "stayingapi_configurado": bool(
            STAYING_API_KEY
        ),
    }


# =========================================================
# FUNCIÓN INTERNA: BUSCAR VUELOS DE UNA RUTA
# =========================================================

async def obtener_vuelos(
    origen: str,
    destino: str,
    moneda: str = "EUR",
    fecha_ida: str | None = None,
    fecha_vuelta: str | None = None,
):
    if not TRAVELPAYOUTS_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Falta configurar TRAVELPAYOUTS_API_TOKEN",
        )

    url = (
        "https://api.travelpayouts.com/"
        "aviasales/v3/prices_for_dates"
    )

    params = {
        "origin": origen.strip().upper(),
        "destination": destino.strip().upper(),
        "currency": moneda.strip().lower(),
        "limit": 30,
        "page": 1,
        "sorting": "price",
        "direct": "false",
        "one_way": "false",
        "token": TRAVELPAYOUTS_API_TOKEN,
    }

    if fecha_ida:
        params["departure_at"] = fecha_ida

    if fecha_vuelta:
        params["return_at"] = fecha_vuelta

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            respuesta = await client.get(
                url,
                params=params,
            )

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "No se pudo conectar con "
                f"Travelpayouts: {error}"
            ),
        )

    if respuesta.status_code != 200:
        raise HTTPException(
            status_code=respuesta.status_code,
            detail={
                "mensaje":
                    "Travelpayouts devolvió un error",
                "respuesta": respuesta.text,
            },
        )

    datos = respuesta.json()

    return {
        "origen": origen.strip().upper(),
        "destino": destino.strip().upper(),
        "fecha_ida": fecha_ida,
        "fecha_vuelta": fecha_vuelta,
        "fuente":
            "Travelpayouts / Aviasales Data API",
        "tiempo_real": False,
        "resultados": datos,
    }


# =========================================================
# VUELOS
# =========================================================

@app.get("/vuelos")
async def vuelos(
    origen: str = "OVD",
    destino: str = "TFS",
    moneda: str = "EUR",
    fecha_ida: str | None = None,
    fecha_vuelta: str | None = None,
):
    return await obtener_vuelos(
        origen=origen,
        destino=destino,
        moneda=moneda,
        fecha_ida=fecha_ida,
        fecha_vuelta=fecha_vuelta,
    )


@app.get("/vuelos/buscar")
async def vuelos_buscar(
    origen: str,
    destino: str,
    moneda: str = "EUR",
    fecha_ida: str | None = None,
    fecha_vuelta: str | None = None,
):
    return await obtener_vuelos(
        origen=origen,
        destino=destino,
        moneda=moneda,
        fecha_ida=fecha_ida,
        fecha_vuelta=fecha_vuelta,
    )


# =========================================================
# OPORTUNIDADES ATLAS
# =========================================================

@app.get("/oportunidades")
def oportunidades(
    origen: str = "OVD",
    presupuesto: float | None = None,
    moneda: str = "EUR",
    limite: int = 30,
    solo_directos: bool = False,
):
    """
    Busca destinos baratos desde un origen.

    Los resultados son oportunidades de precio
    encontradas recientemente, no disponibilidad
    en tiempo real.
    """

    if limite < 1:
        limite = 1

    if limite > 30:
        limite = 30

    if presupuesto is not None and presupuesto < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "El presupuesto no puede ser negativo"
            ),
        )

    try:
        resultados = buscar_oportunidades_desde(
            origen=origen,
            moneda=moneda,
            presupuesto=presupuesto,
            limite=limite,
            solo_directos=solo_directos,
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "No se pudieron obtener "
                f"oportunidades: {error}"
            ),
        )

    return {
        "ok": True,
        "origen": origen.strip().upper(),
        "presupuesto": presupuesto,
        "moneda": moneda.strip().upper(),
        "solo_directos": solo_directos,
        "tiempo_real": False,
        "fuente":
            "Travelpayouts / Aviasales Data API",
        "total": len(resultados),
        "oportunidades": resultados,
    }


# =========================================================
# HOTELES / ALOJAMIENTOS
# =========================================================

@app.get("/hoteles")
def hoteles(
    destino: str,
    fecha_entrada: str,
    fecha_salida: str,
    adultos: int = 1,
    ninos: int = 0,
    moneda: str = "EUR",
    limite: int = 10,
):
    """
    Busca alojamientos mediante StayingAPI.

    Mientras Atlas utilice una API Key Sandbox,
    los alojamientos devueltos serán datos de prueba.

    Cuando configuremos una clave Live,
    este mismo endpoint podrá utilizar datos reales.
    """

    if adultos < 1:
        raise HTTPException(
            status_code=400,
            detail="Debe viajar al menos 1 adulto",
        )

    if ninos < 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "El número de niños "
                "no puede ser negativo"
            ),
        )

    if limite < 1:
        limite = 1

    if limite > 30:
        limite = 30

    try:
        resultado = buscar_hoteles(
            destino=destino,
            fecha_entrada=fecha_entrada,
            fecha_salida=fecha_salida,
            adultos=adultos,
            ninos=ninos,
            moneda=moneda,
            limite=limite,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "No se pudieron obtener "
                f"alojamientos: {error}"
            ),
        )

    return {
        "ok": True,
        **resultado,
    }

# =========================================================
# VIAJE COMPLETO ATLAS
# =========================================================

@app.get("/viaje")
async def viaje(
    origen: str,
    destino_codigo: str,
    destino_nombre: str,
    fecha_ida: str,
    fecha_vuelta: str,
    adultos: int = 1,
    ninos: int = 0,
    bebes: int = 0,
    presupuesto: float | None = None,
    moneda: str = "EUR",
):
    """
    Construye una oportunidad completa:

    vuelo
    +
    alojamiento
    =
    total estimado del viaje
    """

    if adultos < 1:
        raise HTTPException(
            status_code=400,
            detail="Debe viajar al menos 1 adulto",
        )

    if ninos < 0:
        raise HTTPException(
            status_code=400,
            detail="El número de niños no puede ser negativo",
        )

    if bebes < 0:
        raise HTTPException(
            status_code=400,
            detail="El número de bebés no puede ser negativo",
        )

    if fecha_vuelta <= fecha_ida:
        raise HTTPException(
            status_code=400,
            detail="La fecha de vuelta debe ser posterior a la ida",
        )

    try:
        respuesta_vuelos = await obtener_vuelos(
            origen=origen,
            destino=destino_codigo,
            moneda=moneda,
            fecha_ida=fecha_ida,
            fecha_vuelta=fecha_vuelta,
        )

        respuesta_hoteles = buscar_hoteles(
            destino=destino_nombre,
            fecha_entrada=fecha_ida,
            fecha_salida=fecha_vuelta,
            adultos=adultos,
            ninos=ninos,
            moneda=moneda,
            limite=10,
        )

        resultado = construir_viaje(
            respuesta_vuelos=respuesta_vuelos,
            respuesta_hoteles=respuesta_hoteles,
            adultos=adultos,
            ninos=ninos,
            bebes=bebes,
            presupuesto=presupuesto,
            moneda=moneda,
        )

    except HTTPException:
        raise

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    except RuntimeError as error:
        raise HTTPException(
            status_code=502,
            detail=str(error),
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo construir el viaje: {error}",
        )

    return resultado

# =========================================================
# AUTOCOMPLETADO DE CIUDADES Y AEROPUERTOS
# =========================================================

@app.get("/lugares")
async def buscar_lugares(texto: str):
    texto = texto.strip()

    if len(texto) < 2:
        return []

    url = (
        "https://autocomplete.travelpayouts.com/"
        "places2"
    )

    params = [
        ("term", texto),
        ("locale", "es"),
        ("types[]", "city"),
        ("types[]", "airport"),
    ]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            respuesta = await client.get(
                url,
                params=params,
            )

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "No se pudo consultar "
                f"el autocompletado: {error}"
            ),
        )

    if respuesta.status_code != 200:
        raise HTTPException(
            status_code=respuesta.status_code,
            detail=(
                "No se pudieron buscar "
                "ciudades o aeropuertos"
            ),
        )

    datos = respuesta.json()

    texto_busqueda = texto.casefold()
    resultados = []

    for lugar in datos:
        codigo = lugar.get("code")
        nombre = lugar.get("name")
        tipo = lugar.get("type")
        pais = lugar.get("country_name")
        pais_codigo = lugar.get("country_code")
        ciudad_codigo = lugar.get("city_code")
        ciudad_nombre = lugar.get("city_name")
        peso = lugar.get("weight", 0)

        if not codigo or not nombre:
            continue

        if tipo not in ("city", "airport"):
            continue

        if (
            len(codigo) != 3
            or not codigo.isalpha()
        ):
            continue

        nombre_busqueda = nombre.casefold()

        if nombre_busqueda == texto_busqueda:
            prioridad = 0

        elif nombre_busqueda.startswith(
            texto_busqueda
        ):
            prioridad = 1

        elif texto_busqueda in nombre_busqueda:
            prioridad = 2

        else:
            prioridad = 3

        resultados.append(
            {
                "codigo": codigo.upper(),
                "nombre": nombre,
                "tipo": tipo,
                "pais": pais,
                "pais_codigo": pais_codigo,
                "ciudad_codigo":
                    ciudad_codigo,
                "ciudad_nombre":
                    ciudad_nombre,
                "_prioridad": prioridad,
                "_peso": peso,
            }
        )

    resultados.sort(
        key=lambda lugar: (
            lugar["_prioridad"],
            -lugar["_peso"],
        )
    )

    resultados = resultados[:8]

    for lugar in resultados:
        lugar.pop(
            "_prioridad",
            None,
        )

        lugar.pop(
            "_peso",
            None,
        )

    return resultados


# =========================================================
# ENLACES AFILIADOS
# =========================================================

@app.post("/enlace-afiliado")
async def crear_enlace_afiliado(url: str):
    if not TRAVELPAYOUTS_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail=(
                "Falta "
                "TRAVELPAYOUTS_API_TOKEN"
            ),
        )

    if not TRAVELPAYOUTS_PROJECT_ID:
        raise HTTPException(
            status_code=500,
            detail=(
                "Falta "
                "TRAVELPAYOUTS_PROJECT_ID"
            ),
        )

    if not TRAVELPAYOUTS_PARTNER_ID:
        raise HTTPException(
            status_code=500,
            detail=(
                "Falta "
                "TRAVELPAYOUTS_PARTNER_ID"
            ),
        )

    endpoint = (
        "https://api.travelpayouts.com/"
        "links/v1/create"
    )

    payload = {
        "trs": int(
            TRAVELPAYOUTS_PROJECT_ID
        ),
        "marker": int(
            TRAVELPAYOUTS_PARTNER_ID
        ),
        "shorten": True,
        "links": [
            {
                "url": url,
                "sub_id": "atlas_vuelos",
            }
        ],
    }

    headers = {
        "X-Access-Token":
            TRAVELPAYOUTS_API_TOKEN,
        "Content-Type":
            "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            respuesta = await client.post(
                endpoint,
                json=payload,
                headers=headers,
            )

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "No se pudo conectar con "
                "Travelpayouts Links API: "
                f"{error}"
            ),
        )

    if respuesta.status_code not in (
        200,
        201,
    ):
        raise HTTPException(
            status_code=respuesta.status_code,
            detail={
                "mensaje":
                    "No se pudo generar "
                    "el enlace afiliado",
                "respuesta":
                    respuesta.text,
            },
        )

    datos = respuesta.json()

    try:
        partner_url = (
            datos["links"][0][
                "partner_url"
            ]
        )

    except (
        KeyError,
        IndexError,
        TypeError,
    ):
        raise HTTPException(
            status_code=500,
            detail={
                "mensaje":
                    "Travelpayouts no devolvió "
                    "partner_url",
                "respuesta": datos,
            },
        )

    return {
        "ok": True,
        "url_original": url,
        "partner_url": partner_url,
    }