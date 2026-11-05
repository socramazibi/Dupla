
import json
import re
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup


# ==================================================
# CONFIGURACIÓN
# ==================================================

START_DATE = date(2026, 5, 11)

DATA_FILE = Path("data/historico2026.json")

BASE_URL = "https://statyr.com/es-es/dupla/resultados/{}"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DuplaHistorico/1.0)"
}

session = requests.Session()
session.headers.update(HEADERS)


# ==================================================
# FECHA ACTUAL DE ESPAÑA
# ==================================================

def today_spain():
    return datetime.now(
        ZoneInfo("Europe/Madrid")
    ).date()


# ==================================================
# CONSULTAR RESULTADOS DE UN DÍA
# ==================================================

def read_day(day):

    url = BASE_URL.format(day.isoformat())

    try:
        response = session.get(url, timeout=25)

        if response.status_code == 404:
            return {}

        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        page_text = soup.get_text(" ", strip=True)

        results = {}

        pattern = (
            r"Sorteo\s+([1-5])\s*[·•]\s*\d{1,2}:\d{2}"
            r"\s+Números\s+(\d{1,2})"
        )

        matches = re.findall(
            pattern,
            page_text,
            flags=re.IGNORECASE
        )

        for draw, number in matches:

            draw = str(int(draw))
            number = int(number)

            if 1 <= number <= 15:
                results[draw] = number

        return results

    except requests.RequestException as error:

        print(f"Error consultando {day}: {error}")

        return None


# ==================================================
# CARGAR HISTÓRICO EXISTENTE
# ==================================================

def load_history():

    if not DATA_FILE.exists():
        return {}

    try:

        with DATA_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)

        if not isinstance(data, dict):
            raise ValueError("El histórico no tiene formato válido.")

        return data

    except (json.JSONDecodeError, OSError, ValueError) as error:

        raise RuntimeError(
            f"No se pudo leer el histórico: {error}"
        )


# ==================================================
# ACTUALIZAR HISTÓRICO
# ==================================================

def main():

    today = today_spain()

    history = load_history()

    # Si el histórico está vacío, se hace la carga inicial.
    first_load = not history

    if first_load:

        start = START_DATE

        print("================================")
        print("PRIMERA CARGA DEL HISTÓRICO")
        print("Desde:", START_DATE)
        print("Hasta:", today)
        print("================================")

    else:

        # Revisar los últimos cuatro días.
        start = max(
            START_DATE,
            today - timedelta(days=3)
        )

        print("================================")
        print("ACTUALIZACIÓN DIARIA")
        print("Desde:", start)
        print("Hasta:", today)
        print("================================")

    day = start

    added = 0
    updated = 0
    missing_days = []

    # ==================================================
    # RECORRER LOS DÍAS
    # ==================================================

    while day <= today:

        date_key = day.isoformat()

        print(f"Consultando {date_key}...")

        day_results = read_day(day)

        # Si falla la conexión, detener el proceso.
        if day_results is None:

            raise RuntimeError(
                f"No se pudo consultar {date_key}. "
                "Se cancela la actualización."
            )

        if day_results:

            previous = history.get(date_key, {})

            merged = dict(previous)

            # Añadir o completar los sorteos encontrados.
            merged.update(day_results)

            if merged != previous:

                if date_key not in history:
                    added += 1
                else:
                    updated += 1

                history[date_key] = merged

            print(
                f"{date_key}: "
                f"{len(day_results)} sorteos encontrados."
            )

        else:

            if first_load and day < today:

                missing_days.append(date_key)

                print(
                    f"AVISO: no se encontraron resultados "
                    f"para {date_key}."
                )

            else:

                print(
                    f"{date_key}: sin resultados disponibles."
                )

        day += timedelta(days=1)

        # Pausa para no realizar demasiadas peticiones seguidas.
        time.sleep(0.2)

    # ==================================================
    # COMPROBAR PRIMERA IMPORTACIÓN
    # ==================================================

    if first_load and missing_days:

        raise RuntimeError(
            "La primera importación no está completa. "
            "No se guardará el histórico. "
            "Días sin resultados: "
            + ", ".join(missing_days)
        )

    # ==================================================
    # ORDENAR Y GUARDAR
    # ==================================================

    history = dict(sorted(history.items()))

    DATA_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with DATA_FILE.open("w", encoding="utf-8") as file:

        json.dump(
            history,
            file,
            ensure_ascii=False,
            indent=2
        )

        file.write("\n")

    # ==================================================
    # RESUMEN
    # ==================================================

    total_days = len(history)

    total_draws = sum(
        len(day_results)
        for day_results in history.values()
    )

    print()
    print("================================")
    print("ACTUALIZACIÓN FINALIZADA")
    print("================================")
    print(f"Días registrados: {total_days}")
    print(f"Sorteos registrados: {total_draws}")
    print(f"Días nuevos: {added}")
    print(f"Días actualizados: {updated}")
    print(f"Archivo: {DATA_FILE}")
    print("================================")


# ==================================================
# INICIO
# ==================================================

if __name__ == "__main__":

    main()
