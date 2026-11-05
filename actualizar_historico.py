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
    "User-Agent": "Mozilla/5.0 (compatible; DuplaHistorico/2.0)"
}

EXPECTED_DRAWS = 5


# ==================================================
# SESIÓN CON REINTENTOS
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

def read_day(day, allow_partial=False):

    url = BASE_URL.format(day.isoformat())

    try:
        response = session.get(
            url,
            timeout=(15, 60)
        )

        response.raise_for_status()

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        text = soup.get_text(" ", strip=True)

        results = {}

        # IMPORTANTE:
        # Admite tanto "Números 08" como "Números:08".
        pattern = (
            r"Sorteo\s+([1-5])\s*[·•]\s*"
            r"\d{1,2}:\d{2}\s+"
            r"Números\s*:?\s*(\d{1,2})"
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

        # Un día histórico debe tener los cinco sorteos.
        if not allow_partial:

            if len(results) != EXPECTED_DRAWS:

                print(
                    f"ERROR: {day} tiene "
                    f"{len(results)} de 5 sorteos reconocidos."
                )

                print("Texto encontrado:", text[:500])

                return None

        # El día actual puede estar incompleto.
        return results

    except requests.RequestException as error:

        print(f"ERROR consultando {day}: {error}")

        return None


# ==================================================
# CARGAR HISTÓRICO
# ==================================================

def load_history():

    if not DATA_FILE.exists():
        return {}

    with DATA_FILE.open(
        "r",
        encoding="utf-8"
    ) as file:

        data = json.load(file)

    if not isinstance(data, dict):
        raise RuntimeError(
            "Formato de histórico incorrecto."
        )

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

    with DATA_FILE.open(
        "w",
        encoding="utf-8"
    ) as file:

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

    first_load = not MARKER_FILE.exists()

    failed_days = []

    added = 0
    updated = 0

    if first_load:

        # La primera importación llega hasta AYER.
        # El día actual se completará en las actualizaciones.
        start = START_DATE
        end = today - timedelta(days=1)

        print("PRIMERA IMPORTACIÓN DEL HISTÓRICO")
        print("Desde:", start)
        print("Hasta:", end)

    else:

        # Revisar los últimos cuatro días.
        start = max(
            START_DATE,
            today - timedelta(days=3)
        )

        end = today

        print("ACTUALIZACIÓN DIARIA")
        print("Desde:", start)
        print("Hasta:", end)

    day = start

    while day <= end:

        date_key = day.isoformat()

        print(f"\nConsultando {date_key}...")

        previous = history.get(date_key, {})

        # En la primera importación no repetir días
        # que ya tengan los cinco sorteos guardados.
        if (
            first_load
            and isinstance(previous, dict)
            and len(previous) == EXPECTED_DRAWS
        ):

            print("Día completo, ya estaba registrado.")

            day += timedelta(days=1)
            continue

        # Solo se permiten resultados parciales
        # para el día actual.
        allow_partial = day == today

        day_results = read_day(
            day,
            allow_partial=allow_partial
        )

        if day_results is None:

            failed_days.append(date_key)

            print("Día pendiente. Se reintentará.")

        elif day_results:

            merged = dict(previous)
            merged.update(day_results)

            if merged != previous:

                if date_key not in history:
                    added += 1
                else:
                    updated += 1

                history[date_key] = merged

            print(
                "Resultados reconocidos:",
                len(day_results),
                "de 5"
            )

        else:

            print("Todavía no hay resultados publicados.")

        day += timedelta(days=1)

        time.sleep(0.5)

    # Guardar siempre los resultados recuperados.
    save_history(history)

    # Si hay días pendientes, no crear el marcador.
    if failed_days:

        print("\nIMPORTACIÓN INCOMPLETA")

        print("El histórico parcial se ha guardado.")

        print("Días pendientes:", failed_days)

        raise RuntimeError(
            "Hay días pendientes. Ejecuta de nuevo "
            "para reintentar la importación."
        )

    # Marcar la primera importación como completada.
    if first_load:

        MARKER_FILE.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        MARKER_FILE.write_text(
            f"Importación inicial completada: {today}\n",
            encoding="utf-8"
        )

        print("\nHISTÓRICO INICIAL COMPLETADO.")

    total_draws = sum(
        len(results)
        for results in history.values()
        if isinstance(results, dict)
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
        
