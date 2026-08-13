from fastapi import FastAPI, HTTPException

from travelpayouts import buscar_vuelos


app = FastAPI()


@app.get("/")
def inicio():
    return {
        "app": "Atlas API",
        "estado": "online"
    }


@app.get("/salud")
def salud():
    return {
        "ok": True,
        "mensaje": "Atlas Backend funciona en Vercel"
    }


@app.get("/vuelos/buscar")
def vuelos_buscar(
    origen: str,
    destino: str,
    fecha_salida: str | None = None,
    fecha_regreso: str | None = None,
):
    try:
        vuelos = buscar_vuelos(
            origen=origen,
            destino=destino,
            fecha_salida=fecha_salida,
            fecha_regreso=fecha_regreso,
            moneda="eur",
        )

        return {
            "ok": True,
            "origen": origen.upper(),
            "destino": destino.upper(),
            "resultados": len(vuelos),
            "vuelos": vuelos,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )