"use strict";

const TOTAL_NUMEROS = 15;
const TOTAL_SORTEOS = 5;
const NOMBRES_SORTEOS = [
  "Sorteo 1",
  "Sorteo 2",
  "Sorteo 3",
  "Sorteo 4",
  "Sorteo 5"
];

let historico = [];
let historicoCompleto = [];

const $ = (id) => document.getElementById(id);

function fechaLocal(fecha) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fechaTexto(fecha) {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function numeroTexto(numero) {
  return String(numero).padStart(2, "0");
}

function mostrarVacio(mensaje) {
  return `<div class="empty">${escapar(mensaje)}</div>`;
}

function leerHistorico(datos) {
  const fechas = Object.keys(datos)
    .filter(fecha => /^\d{4}-\d{2}-\d{2}$/.test(fecha))
    .sort();

  const registros = [];

  for (const fecha of fechas) {
    const dia = datos[fecha];

    if (!dia || typeof dia !== "object" || Array.isArray(dia)) {
      continue;
    }

    const sorteos = [];

    for (let s = 1; s <= TOTAL_SORTEOS; s++) {
      const valor = dia[String(s)];

      if (
        Number.isInteger(valor) &&
        valor >= 1 &&
        valor <= TOTAL_NUMEROS
      ) {
        sorteos.push({
          sorteo: s,
          numero: valor
        });
      }
    }

    if (sorteos.length) {
      registros.push({ fecha, sorteos });
    }
  }

  return registros;
}

function obtenerTodosLosResultados(registros) {
  const lista = [];

  for (const dia of registros) {
    for (const resultado of dia.sorteos) {
      lista.push({
        fecha: dia.fecha,
        sorteo: resultado.sorteo,
        numero: resultado.numero
      });
    }
  }

  return lista;
}

function aplicarFiltros() {
  const desde = $("desde").value;
  const hasta = $("hasta").value;
  const sorteo = $("sorteo").value;

  if (desde && hasta && desde > hasta) {
    $("estado").textContent =
      "La fecha inicial no puede ser posterior a la fecha final.";
    $("estado").className = "status error";
    return;
  }

  historico = historicoCompleto.filter(dia => {
    if (desde && dia.fecha < desde) return false;
    if (hasta && dia.fecha > hasta) return false;
    return true;
  });

  const numeroSorteo = sorteo === "todos" ? null : Number(sorteo);

  if (numeroSorteo) {
    historico = historico.map(dia => ({
      ...dia,
      sorteos: dia.sorteos.filter(r => r.sorteo === numeroSorteo)
    })).filter(dia => dia.sorteos.length);
  }

  $("estado").textContent =
    `Periodo: ${fechaTexto(desde)} – ${fechaTexto(hasta)}. ` +
    `Sorteo: ${numeroSorteo ? NOMBRES_SORTEOS[numeroSorteo - 1] : "Todos"}.`;

  $("estado").className = "status";

  dibujarTodo();
}

function reiniciarFiltros() {
  if (!historicoCompleto.length) return;

  $("desde").value = historicoCompleto[0].fecha;
  $("hasta").value = historicoCompleto[historicoCompleto.length - 1].fecha;
  $("sorteo").value = "todos";

  aplicarFiltros();
}

function dibujarTodo() {
  const resultados = obtenerTodosLosResultados(historico);

  dibujarResumen(resultados);
  dibujarFrecuencias(resultados);
  dibujarRanking(resultados);
  dibujarAtrasos();
  dibujarRachas();
  dibujarConsecutivos();
  dibujarMensual();
  dibujarComparativa();
  dibujarUltimos();
}

function dibujarResumen(resultados) {
  const fechas = historicoCompleto.map(d => d.fecha);
  const primera = fechas[0];
  const ultima = fechas[fechas.length - 1];

  $("primeraFecha").textContent = fechaTexto(primera);
  $("ultimaFecha").textContent = fechaTexto(ultima);

  $("totalHistorico").textContent = resultadosHistoricos.length;
  $("diasHistorico").textContent = fechas.length;

  $("totalFiltrado").textContent = resultados.length;
  $("diasFiltrados").textContent = historico.length;
}

const resultadosHistoricos = [];

function contarNumeros(resultados) {
  const conteo = Array(TOTAL_NUMEROS + 1).fill(0);

  for (const r of resultados) {
    conteo[r.numero]++;
  }

  return conteo;
}

function dibujarFrecuencias(resultados) {
  const conteo = contarNumeros(resultados);
  const maximo = Math.max(1, ...conteo.slice(1));

  $("frecuencias").innerHTML = conteo.slice(1).map((cantidad, i) => {
    const porcentaje = resultados.length
      ? (cantidad / resultados.length * 100)
      : 0;

    const ancho = cantidad ? cantidad / maximo * 100 : 0;

    return `
      <div class="bar-row">
        <span class="ball">${numeroTexto(i + 1)}</span>
        <div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${ancho}%"></div>
          </div>
          <div class="stat-note">${porcentaje.toFixed(1)} %</div>
        </div>
        <span class="bar-value">${cantidad}</span>
      </div>
    `;
  }).join("");

  $("frecuenciaTotal").textContent =
    `${resultados.length} resultados analizados`;
}

function dibujarRanking(resultados) {
  const conteo = contarNumeros(resultados);
  const numeros = Array.from({ length: TOTAL_NUMEROS }, (_, i) => i + 1);

  const ordenados = [...numeros].sort((a, b) =>
    conteo[b] - conteo[a] || a - b
  );

  const maximo = Math.max(0, ...conteo.slice(1));
  const minimo = Math.min(...conteo.slice(1));

  const frecuentes = ordenados.filter(n => conteo[n] === maximo);
  const menos = ordenados.filter(n => conteo[n] === minimo);

  $("masFrecuentes").innerHTML = frecuentes.length
    ? `<strong>${frecuentes.map(numeroTexto).join(", ")}</strong>
       <span class="pill good">${maximo} apariciones</span>`
    : mostrarVacio("Sin resultados");

  $("menosFrecuentes").innerHTML = menos.length
    ? `<strong>${menos.map(numeroTexto).join(", ")}</strong>
       <span class="pill warn">${minimo} apariciones</span>`
    : mostrarVacio("Sin resultados");

  $("tablaRanking").innerHTML = ordenados.map((n, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${numeroTexto(n)}</strong></td>
      <td>${conteo[n]}</td>
      <td>${resultados.length
        ? (conteo[n] / resultados.length * 100).toFixed(2) + "%"
        : "0%"}</td>
    </tr>
  `).join("");
}

function dibujarAtrasos() {
  const filas = [];

  for (let s = 1; s <= TOTAL_SORTEOS; s++) {
    const registros = historico
      .flatMap(d => d.sorteos
        .filter(r => r.sorteo === s)
        .map(r => ({ fecha: d.fecha, numero: r.numero })))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (!registros.length) continue;

    for (let n = 1; n <= TOTAL_NUMEROS; n++) {
      let indice = -1;

      for (let i = registros.length - 1; i >= 0; i--) {
        if (registros[i].numero === n) {
          indice = i;
          break;
        }
      }

      const atraso = indice === -1
        ? null
        : registros.length - 1 - indice;

      filas.push(`
        <tr>
          <td>${NOMBRES_SORTEOS[s - 1]}</td>
          <td><strong>${numeroTexto(n)}</strong></td>
          <td>${atraso === null
            ? '<span class="pill warn">Sin aparición</span>'
            : atraso === 0
              ? '<span class="pill good">Último resultado</span>'
              : `${atraso} sorteos`}</td>
        </tr>
      `);
    }
  }

  $("tablaAtrasos").innerHTML = filas.length
    ? filas.join("")
    : `<tr><td colspan="3">No hay resultados en el periodo.</td></tr>`;
}

function dibujarRachas() {
  const rachas = [];

  for (let s = 1; s <= TOTAL_SORTEOS; s++) {
    const registros = historico
      .flatMap(d => d.sorteos
        .filter(r => r.sorteo === s)
        .map(r => ({ fecha: d.fecha, numero: r.numero })))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (!registros.length) continue;

    let numero = registros[0].numero;
    let inicio = registros[0].fecha;
    let longitud = 1;

    for (let i = 1; i <= registros.length; i++) {
      if (i < registros.length && registros[i].numero === numero) {
        longitud++;
      } else {
        if (longitud >= 2) {
          rachas.push({
            sorteo: s,
            numero,
            longitud,
            inicio,
            fin: registros[i - 1].fecha
          });
        }

        if (i < registros.length) {
          numero = registros[i].numero;
          inicio = registros[i].fecha;
          longitud = 1;
        }
      }
    }
  }

  rachas.sort((a, b) =>
    b.longitud - a.longitud ||
    a.sorteo - b.sorteo
  );

  $("tablaRachas").innerHTML = rachas.length
    ? rachas.slice(0, 30).map(r => `
      <tr>
        <td>${NOMBRES_SORTEOS[r.sorteo - 1]}</td>
        <td><strong>${numeroTexto(r.numero)}</strong></td>
        <td>${r.longitud} sorteos seguidos</td>
        <td>${fechaTexto(r.inicio)}</td>
        <td>${fechaTexto(r.fin)}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="5">No se han encontrado repeticiones consecutivas.</td></tr>`;
}

function dibujarConsecutivos() {
  let total = 0;
  const filas = [];

  for (let s = 1; s <= TOTAL_SORTEOS; s++) {
    const registros = historico
      .flatMap(d => d.sorteos
        .filter(r => r.sorteo === s)
        .map(r => ({ fecha: d.fecha, numero: r.numero })))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    let cantidad = 0;

    for (let i = 1; i < registros.length; i++) {
      if (Math.abs(registros[i].numero - registros[i - 1].numero) === 1) {
        cantidad++;
      }
    }

    total += cantidad;

    filas.push(`
      <tr>
        <td>${NOMBRES_SORTEOS[s - 1]}</td>
        <td>${cantidad}</td>
      </tr>
    `);
  }

  $("tablaConsecutivos").innerHTML = filas.join("");
  $("totalConsecutivos").textContent = total;
}

function dibujarMensual() {
  const meses = new Map();

  for (const dia of historico) {
    const mes = dia.fecha.slice(0, 7);

    if (!meses.has(mes)) {
      meses.set(mes, {
        resultados: 0,
        conteo: Array(TOTAL_NUMEROS + 1).fill(0)
      });
    }

    const datos = meses.get(mes);

    for (const r of dia.sorteos) {
      datos.resultados++;
      datos.conteo[r.numero]++;
    }
  }

  const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril",
    "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const entradas = [...meses.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const maximo = Math.max(1, ...entradas.map(e => e[1].resultados));

  $("graficoMensual").innerHTML = entradas.length
    ? entradas.map(([mes, datos]) => {
        const [anio, numeroMes] = mes.split("-").map(Number);
        const nombre = `${nombresMeses[numeroMes - 1]} ${anio}`;
        const ancho = datos.resultados / maximo * 100;

        const maxFrecuencia = Math.max(...datos.conteo.slice(1));
        const numerosMasFrecuentes = datos.conteo
          .slice(1)
          .map((cantidad, i) => ({ numero: i + 1, cantidad }))
          .filter(x => x.cantidad === maxFrecuencia)
          .map(x => numeroTexto(x.numero))
          .join(", ");

        return `
          <tr>
            <td>${nombre}</td>
            <td>${datos.resultados}</td>
            <td>${numerosMasFrecuentes || "—"}</td>
            <td>
              <div class="bar-track">
                <div class="bar-fill" style="width:${ancho}%"></div>
              </div>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="4">Sin datos para este periodo.</td></tr>`;
}

function dibujarComparativa() {
  const filas = [];

  for (let s = 1; s <= TOTAL_SORTEOS; s++) {
    const resultados = obtenerTodosLosResultados(historicoCompleto)
      .filter(r => r.sorteo === s && dentroDelPeriodo(r.fecha));

    const conteo = contarNumeros(resultados);
    const maximo = Math.max(0, ...conteo.slice(1));
    const minimo = resultados.length
      ? Math.min(...conteo.slice(1))
      : 0;

    const mas = resultados.length
      ? conteo.slice(1)
          .map((v, i) => ({ n: i + 1, v }))
          .filter(x => x.v === maximo)
          .map(x => numeroTexto(x.n)).join(", ")
      : "—";

    const menos = resultados.length
      ? conteo.slice(1)
          .map((v, i) => ({ n: i + 1, v }))
          .filter(x => x.v === minimo)
          .map(x => numeroTexto(x.n)).join(", ")
      : "—";

    filas.push(`
      <tr>
        <td><strong>${NOMBRES_SORTEOS[s - 1]}</strong></td>
        <td>${resultados.length}</td>
        <td>${mas}</td>
        <td>${maximo}</td>
        <td>${menos}</td>
        <td>${minimo}</td>
      </tr>
    `);
  }

  $("tablaComparativa").innerHTML = filas.join("");
}

function dentroDelPeriodo(fecha) {
  const desde = $("desde").value;
  const hasta = $("hasta").value;

  return (!desde || fecha >= desde) &&
         (!hasta || fecha <= hasta);
}

function dibujarUltimos() {
  const ultimos = historicoCompleto.slice(-10).reverse();

  $("ultimosResultados").innerHTML = ultimos.length
    ? ultimos.map(dia => `
      <div class="result-card">
        <div class="result-date">${fechaTexto(dia.fecha)}</div>
        <div class="result-draws">
          ${dia.sorteos
            .slice()
            .sort((a, b) => a.sorteo - b.sorteo)
            .map(r => `
              <div class="result-draw-line">
                <span>${NOMBRES_SORTEOS[r.sorteo - 1]}</span>
                <div class="result-numbers">
                  <span class="ball">${numeroTexto(r.numero)}</span>
                </div>
              </div>
            `).join("")}
        </div>
      </div>
    `).join("")
    : mostrarVacio("No hay resultados disponibles.");
}

async function iniciar() {
  try {
    $("estado").textContent = "Cargando histórico de Dupla…";

    const respuesta = await fetch("data/historico2026.json", {
      cache: "no-store"
    });

    if (!respuesta.ok) {
      throw new Error(`No se pudo cargar el histórico (${respuesta.status}).`);
    }

    const datos = await respuesta.json();

    historicoCompleto = leerHistorico(datos);
    historicoCompleto.sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (!historicoCompleto.length) {
      throw new Error("El histórico no contiene resultados válidos.");
    }

    resultadosHistoricos.push(
      ...obtenerTodosLosResultados(historicoCompleto)
    );

    $("desde").min = historicoCompleto[0].fecha;
    $("desde").max = historicoCompleto[historicoCompleto.length - 1].fecha;
    $("hasta").min = historicoCompleto[0].fecha;
    $("hasta").max = historicoCompleto[historicoCompleto.length - 1].fecha;

    $("desde").value = historicoCompleto[0].fecha;
    $("hasta").value = historicoCompleto[historicoCompleto.length - 1].fecha;

    $("aplicar").addEventListener("click", aplicarFiltros);
    $("reiniciar").addEventListener("click", reiniciarFiltros);

    $("estado").textContent = "Histórico cargado correctamente.";
    aplicarFiltros();

  } catch (error) {
    console.error(error);
    $("estado").textContent =
      `Error: ${error.message}. Comprueba que existe data/historico2026.json.`;
    $("estado").className = "status error";
  }
}

document.addEventListener("DOMContentLoaded", iniciar);
