import os

AFFILIATE_BASE = "https://aviasales.tpm.lv"

def generar_link_afiliado(link):
    """
    Convierte el link devuelto por Travelpayouts
    en un enlace afiliado.
    """

    if not link:
        return None

    return f"{AFFILIATE_BASE}{link}"