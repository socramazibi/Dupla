
import json
import re
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup


# ==================================================
# CONFIGURACIÓN
# ==================================================

START_DATE = date(2026, 5, 11)

DATA_FILE = Path("data/historico2026.json")
MARKER_FILE = Path("data/.historico_inicial_completo")

BASE_URL = "https://statyr.com/es-es/dupla/resultados/{}"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DuplaHistorico/1.0)"
}


# ==================================================
# SESIÓN CON REINTENTOS AUTOMÁTICOS
# ==================================================

session = requests.Session()
session.headers.update(HEADERS)

retry_strategy = Retry(
    total=5,
    connect=5,
    read=5,
    backoff_factor=2,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET"],
    respect_retry_after_header=True
)

adapter = HTTPAdapter(max_retries=retry_strategy)

session.mount("https://", adapter)
session.mount("http://", adapter)


# ==================================================
# FECHA ESPAÑOLA
# ==================================================

def today_spain():
    return datetime.now(
        ZoneInfo("Europe/Madrid")
    ).date()


# ==================================================
# CONSULTAR UN DÍA
# ==================================================

def read_day(day):

    url = BASE_URL.format(day.isoformat())

    try:
        response = session.get(
            url,
            timeout=(15, 60)
        )

        if response.status_code == 404:
            return {}

        response.raise_for_status()

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        text = soup.get_text(" ", strip=True)

        results = {}

        pattern = (
            r"Sorteo\s+([1-5])\s*[·•]\s*\d{1,2}:\d{2}"
            r"\s+Números\s+(\d{1,2})"
        )

        matches = re.findall(
            pattern,
            text,
            flags=re.IGNORECASE
        )

        for draw, number in matches:

            draw = str(int(draw))
            number = int(number)

            if 1 <= number <= 15:
                results[draw] = number

        return results

    except requests.RequestException as error:

        print(f"ERROR en {day}: {error}")

        return None


# ==================================================
# CARGAR HISTÓRICO
# ==================================================

def load_history():

    if not DATA_FILE.exists():
        return {}

    with DATA_FILE.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, dict):
        raise RuntimeError("Formato de histórico incorrecto.")

    return data


# ==================================================
# GUARDAR HISTÓRICO
# ==================================================

def save_history(history):

    DATA_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    ordered = dict(sorted(history.items()))

    with DATA_FILE.open("w", encoding="utf-8") as file:

        json.dump(
            ordered,
            file,
            ensure_ascii=False,
            indent=2
        )

        file.write("\n")


# ==================================================
# PROCESO PRINCIPAL
# ==================================================

def main():

    today = today_spain()

    history = load_history()

    # El marcador solo aparece cuando la primera
    # importación se ha completado correctamente.
    first_load = not MARKER_FILE.exists()

    if first_load:

        start = START_DATE

        print("PRIMERA IMPORTACIÓN COMPLETA")
        print(f"Desde: {start}")
        print(f"Hasta: {today}")

    else:

        start = max(
            START_DATE,
            today - timedelta(days=3)
        )

        print("ACTUALIZACIÓN DIARIA")
        print(f"Desde: {start}")
        print(f"Hasta: {today}")

    day = start

    added = 0
    updated = 0

    failed_days = []
    empty_days = []

    while day <= today:

        date_key = day.isoformat()

        print(f"\nConsultando {date_key}...")

        day_results = read_day(day)

        if day_results is None:

            failed_days.append(date_key)

            print("Se volverá a intentar en la siguiente ejecución.")

        elif day_results:

            previous = history.get(date_key, {})

            merged = dict(previous)
            merged.update(day_results)

            if merged != previous:

                if date_key not in history:
                    added += 1
                else:
                    updated += 1

                history[date_key] = merged

            print(
                f"Resultados encontrados: "
                f"{len(day_results)}"
            )

        else:

            # En la primera carga, los días pasados
            # sin resultados deben revisarse.
            if first_load and day < today:
                empty_days.append(date_key)

            print("Sin resultados encontrados.")

        day += timedelta(days=1)

        time.sleep(0.5)

    # Guardar los resultados encontrados aunque
    # haya fallado alguna consulta.
    save_history(history)

    # No marcar como completa una primera carga
    # que todavía tenga días pendientes.
    if first_load and (failed_days or empty_days):

        print("\nIMPORTACIÓN INCOMPLETA")
        print("El histórico parcial se ha guardado.")

        if failed_days:
            print("Días con errores:", failed_days)

        if empty_days:
            print("Días sin resultados:", empty_days)

        raise RuntimeError(
            "Hay días pendientes. Ejecuta de nuevo "
            "para reintentar la importación completa."
        )

    # Crear marcador solamente cuando se complete
    # correctamente la primera importación.
    if first_load:

        MARKER_FILE.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        MARKER_FILE.write_text(
            f"Importación completa: {today}\n",
            encoding="utf-8"
        )

        print("\nPRIMER HISTÓRICO COMPLETADO.")

    total_draws = sum(
        len(results)
        for results in history.values()
    )

    print("\n================================")
    print("RESUMEN")
    print("================================")
    print("Días registrados:", len(history))
    print("Sorteos registrados:", total_draws)
    print("Días nuevos:", added)
    print("Días actualizados:", updated)
    print("================================")


if __name__ == "__main__":
    main()
    
