from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def inicio():
    return {"ok": True}


@app.get("/salud")
def salud():
    return {
        "ok": True,
        "mensaje": "Atlas Backend funciona en Vercel"
    }