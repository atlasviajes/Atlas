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


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="Atlas API",
    version="0.1.0",
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
        "version": "0.1.0",
    }


# =========================================================
# SALUD
# =========================================================

@app.get("/salud")
def salud():
    return {
        "ok": True,
        "travelpayouts_configurado": bool(TRAVELPAYOUTS_API_TOKEN),
        "project_id_configurado": bool(TRAVELPAYOUTS_PROJECT_ID),
        "partner_id_configurado": bool(TRAVELPAYOUTS_PARTNER_ID),
    }


# =========================================================
# FUNCIÓN INTERNA: BUSCAR VUELOS
# =========================================================

async def obtener_vuelos(
    origen: str,
    destino: str,
    moneda: str = "EUR",
):
    if not TRAVELPAYOUTS_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Falta configurar TRAVELPAYOUTS_API_TOKEN",
        )

    url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"

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

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            respuesta = await client.get(
                url,
                params=params,
            )

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo conectar con Travelpayouts: {error}",
        )

    if respuesta.status_code != 200:
        raise HTTPException(
            status_code=respuesta.status_code,
            detail={
                "mensaje": "Travelpayouts devolvió un error",
                "respuesta": respuesta.text,
            },
        )

    datos = respuesta.json()

    return {
        "origen": origen.strip().upper(),
        "destino": destino.strip().upper(),
        "fuente": "Travelpayouts / Aviasales Data API",
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
):
    return await obtener_vuelos(
        origen=origen,
        destino=destino,
        moneda=moneda,
    )


@app.get("/vuelos/buscar")
async def vuelos_buscar(
    origen: str,
    destino: str,
    moneda: str = "EUR",
):
    return await obtener_vuelos(
        origen=origen,
        destino=destino,
        moneda=moneda,
    )


# =========================================================
# AUTOCOMPLETADO DE CIUDADES Y AEROPUERTOS
# =========================================================

@app.get("/lugares")
async def buscar_lugares(texto: str):
    texto = texto.strip()

    if len(texto) < 2:
        return []

    url = "https://autocomplete.travelpayouts.com/places2"

    params = {
        "term": texto,
        "locale": "es",
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            respuesta = await client.get(
                url,
                params=params,
            )

    except httpx.RequestError as error:
        raise HTTPException(
            status_code=502,
            detail=f"No se pudo consultar el autocompletado: {error}",
        )

    if respuesta.status_code != 200:
        raise HTTPException(
            status_code=respuesta.status_code,
            detail="No se pudieron buscar ciudades o aeropuertos",
        )

    datos = respuesta.json()

    resultados = []

    for lugar in datos[:8]:
        codigo = lugar.get("code")
        nombre = lugar.get("name")
        tipo = lugar.get("type_name") or lugar.get("type")

        if codigo and nombre:
            resultados.append(
                {
                    "codigo": codigo,
                    "nombre": nombre,
                    "tipo": tipo,
                }
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
            detail="Falta TRAVELPAYOUTS_API_TOKEN",
        )

    if not TRAVELPAYOUTS_PROJECT_ID:
        raise HTTPException(
            status_code=500,
            detail="Falta TRAVELPAYOUTS_PROJECT_ID",
        )

    if not TRAVELPAYOUTS_PARTNER_ID:
        raise HTTPException(
            status_code=500,
            detail="Falta TRAVELPAYOUTS_PARTNER_ID",
        )

    endpoint = "https://api.travelpayouts.com/links/v1/create"

    payload = {
        "trs": int(TRAVELPAYOUTS_PROJECT_ID),
        "marker": int(TRAVELPAYOUTS_PARTNER_ID),
        "shorten": True,
        "links": [
            {
                "url": url,
                "sub_id": "atlas_vuelos",
            }
        ],
    }

    headers = {
        "X-Access-Token": TRAVELPAYOUTS_API_TOKEN,
        "Content-Type": "application/json",
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
            detail=f"No se pudo conectar con Travelpayouts Links API: {error}",
        )

    if respuesta.status_code not in (200, 201):
        raise HTTPException(
            status_code=respuesta.status_code,
            detail={
                "mensaje": "No se pudo generar el enlace afiliado",
                "respuesta": respuesta.text,
            },
        )

    datos = respuesta.json()

    try:
        partner_url = datos["links"][0]["partner_url"]

    except (KeyError, IndexError, TypeError):
        raise HTTPException(
            status_code=500,
            detail={
                "mensaje": "Travelpayouts no devolvió partner_url",
                "respuesta": datos,
            },
        )

    return {
        "ok": True,
        "url_original": url,
        "partner_url": partner_url,
    }