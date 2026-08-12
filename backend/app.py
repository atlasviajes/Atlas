import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


# =========================
# CONFIGURACIÓN
# =========================

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

TRAVELPAYOUTS_API_TOKEN = os.getenv("TRAVELPAYOUTS_API_TOKEN")
TRAVELPAYOUTS_PROJECT_ID = os.getenv("TRAVELPAYOUTS_PROJECT_ID")
TRAVELPAYOUTS_PARTNER_ID = os.getenv("TRAVELPAYOUTS_PARTNER_ID")


# =========================
# FASTAPI
# =========================

app = FastAPI(title="Atlas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://atlas-flame-seven.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# INICIO / SALUD
# =========================

@app.get("/")
def inicio():
    return {
        "app": "Atlas API",
        "estado": "online",
    }


@app.get("/salud")
def salud():
    return {
        "ok": True,
        "travelpayouts_configurado": bool(TRAVELPAYOUTS_API_TOKEN),
        "project_id_configurado": bool(TRAVELPAYOUTS_PROJECT_ID),
        "partner_id_configurado": bool(TRAVELPAYOUTS_PARTNER_ID),
    }


# =========================
# VUELOS
# =========================

@app.get("/vuelos")
async def vuelos(
    origen: str = "OVD",
    destino: str = "TFS",
    moneda: str = "EUR",
):
    if not TRAVELPAYOUTS_API_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="Falta configurar TRAVELPAYOUTS_API_TOKEN",
        )

    url = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"

    params = {
        "origin": origen.upper(),
        "destination": destino.upper(),
        "currency": moneda.lower(),
        "limit": 10,
        "page": 1,
        "sorting": "price",
        "direct": "false",
        "one_way": "false",
        "token": TRAVELPAYOUTS_API_TOKEN,
    }

    async with httpx.AsyncClient(timeout=20) as client:
        respuesta = await client.get(url, params=params)

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
        "origen": origen.upper(),
        "destino": destino.upper(),
        "fuente": "Travelpayouts / Aviasales Data API",
        "tiempo_real": False,
        "resultados": datos,
    }


# =========================
# AUTOCOMPLETADO DE LUGARES
# =========================

@app.get("/lugares")
async def buscar_lugares(texto: str):
    if len(texto.strip()) < 2:
        return []

    url = "https://autocomplete.travelpayouts.com/places2"

    params = {
        "term": texto.strip(),
        "locale": "es",
    }

    async with httpx.AsyncClient(timeout=10) as client:
        respuesta = await client.get(url, params=params)

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


# =========================
# ENLACE AFILIADO
# =========================

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

    async with httpx.AsyncClient(timeout=20) as client:
        respuesta = await client.post(
            endpoint,
            json=payload,
            headers=headers,
        )

    if respuesta.status_code != 200:
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
        "url_original": url,
        "partner_url": partner_url,
    }