
"use strict";

// =====================================================
// CONFIGURACIÓN
// =====================================================

const URL_HISTORICO = "data/historico2026.json";

let historico = {};
let todosLosResultados = [];
let resultadosFiltrados = [];

const NUMEROS = Array.from({ length: 15 }, (_, i) => i + 1);

// =====================================================
// ELEMENTOS HTML
// =====================================================

const elementoDesde = document.getElementById("desde");
const elementoHasta = document.getElementById("hasta");
const elementoSorteo = document.getElementById("sorteo");
const elementoPeriodo = document.getElementById("periodo");
const elementoAviso = document.getElementById("aviso");
const botonAplicar = document.getElementById("aplicar");

// =====================================================
// UTILIDADES
// =====================================================

function numeroValido(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero < 1 || numero > 15) {
        return null;
    }

    return numero;
}

function formatoNumero(numero) {
    return String(numero).padStart(2, "0");
}

function escaparHTML(valor) {
    return String(valor).replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caracter]);
}

function obtenerElemento(id) {
    return document.getElementById(id);
}

function ponerTexto(id, texto) {
    const elemento = obtenerElemento(id);
    if (elemento) elemento.textContent = texto;
}

function ponerHTML(id, html) {
    const elemento = obtenerElemento(id);
    if (elemento) elemento.innerHTML = html;
}

function fechaValida(fecha) {
    return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

function ordenarPorFecha(a, b) {
    return a.fecha.localeCompare(b.fecha) || a.sorteo - b.sorteo;
}

// =====================================================
// LEER HISTÓRICO
// =====================================================

function obtenerResultados() {
    const filas = [];

    Object.keys(historico)
        .sort()
        .forEach(fecha => {
            if (!fechaValida(fecha)) return;

            const registro = historico[fecha];

            let valores = [];

            // Formato 1: [9, 7, 3, 8, 13]
            if (Array.isArray(registro)) {
                valores = registro;

            // Formato 2: { values: [9, 7, 3, 8, 13] }
            } else if (Array.isArray(registro?.values)) {
                valores = registro.values;

            // Formato 3: { "1": 9, "2": 7, ... }
            } else if (registro && typeof registro === "object") {
                valores = [1, 2, 3, 4, 5].map(
                    numero => registro[String(numero)] ?? null
                );
            }

            valores.forEach((valor, indice) => {
                if (indice > 4) return;

                const numero = numeroValido(valor);

                if (numero === null) return;

                filas.push({
                    fecha,
                    sorteo: indice,
                    numero
                });
            });
        });

    return filas.sort(ordenarPorFecha);
}

// =====================================================
// FILTRAR RESULTADOS
// =====================================================

function aplicarFiltros() {
    const desde = elementoDesde?.value || "";
    const hasta = elementoHasta?.value || "";
    const sorteoSeleccionado = elementoSorteo?.value || "todos";

    resultadosFiltrados = todosLosResultados.filter(resultado => {
        if (desde && resultado.fecha < desde) return false;
        if (hasta && resultado.fecha > hasta) return false;

        if (
            sorteoSeleccionado !== "todos" &&
            resultado.sorteo !== Number(sorteoSeleccionado) - 1
        ) {
            return false;
        }

        return true;
    });

    actualizarEstadisticas();
}

// =====================================================
// ACTUALIZAR PÁGINA
// =====================================================

function actualizarEstadisticas() {
    const total = resultadosFiltrados.length;

    if (total === 0) {
        ponerTexto("periodo", "No hay resultados disponibles con estos filtros.");
        ponerTexto("aviso", "Prueba con otro periodo o sorteo.");

        limpiarEstadisticas();
        return;
    }

    const fechas = [...new Set(resultadosFiltrados.map(r => r.fecha))];

    ponerTexto(
        "periodo",
        `Periodo: ${fechas[0]} a ${fechas[fechas.length - 1]} · ${total} resultados`
    );

    ponerTexto("aviso", "");

    dibujarResumen();
    dibujarFrecuencias();
    dibujarTablaFrecuencias();
    dibujarSorteos();
    dibujarRanking();
    dibujarAtrasos();
    dibujarRachas();
    dibujarVecinos();
    dibujarComparativa();
    dibujarMeses();
    dibujarUltimosResultados();
}

// =====================================================
// LIMPIAR ESTADÍSTICAS
// =====================================================

function limpiarEstadisticas() {
    const ids = [
        "totalResultados",
        "numeroMasFrecuente",
        "numeroMenosFrecuente",
        "media",
        "graficoFrecuencia",
        "tablaFrecuencias",
        "estadisticasSorteos",
        "ranking",
        "atrasos",
        "rachas",
        "vecinos",
        "comparativa",
        "resultadosMes",
        "ultimosResultados"
    ];

    ids.forEach(id => ponerHTML(id, ""));
}

// =====================================================
// RESUMEN GENERAL
// =====================================================

function dibujarResumen() {
    const total = resultadosFiltrados.length;
    const frecuencias = calcularFrecuencias();

    const ordenados = [...NUMEROS].sort(
        (a, b) => frecuencias[b] - frecuencias[a] || a - b
    );

    const maximo = ordenados[0];
    const minimo = ordenados[ordenados.length - 1];

    ponerTexto("totalResultados", total);
    ponerTexto("numeroMasFrecuente", formatoNumero(maximo));
    ponerTexto("numeroMenosFrecuente", formatoNumero(minimo));
    ponerTexto("media", (total / 15).toFixed(2));
}

// =====================================================
// FRECUENCIAS
// =====================================================

function calcularFrecuencias(datos = resultadosFiltrados) {
    const frecuencias = {};

    NUMEROS.forEach(numero => {
        frecuencias[numero] = 0;
    });

    datos.forEach(resultado => {
        frecuencias[resultado.numero]++;
    });

    return frecuencias;
}

function dibujarFrecuencias() {
    const frecuencias = calcularFrecuencias();
    const maximo = Math.max(1, ...Object.values(frecuencias));

    const html = NUMEROS.map(numero => {
        const cantidad = frecuencias[numero];
        const ancho = cantidad / maximo * 100;

        return `
            <div class="frecuencia-item">
                <span>${formatoNumero(numero)}</span>
                <div class="barra-fondo">
                    <div class="barra" style="width:${ancho}%"></div>
                </div>
                <strong>${cantidad}</strong>
            </div>
        `;
    }).join("");

    ponerHTML("graficoFrecuencia", html);
}

function dibujarTablaFrecuencias() {
    const frecuencias = calcularFrecuencias();
    const total = resultadosFiltrados.length;

    const html = `
        <table>
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Veces</th>
                    <th>Porcentaje</th>
                </tr>
            </thead>
            <tbody>
                ${NUMEROS.map(numero => {
                    const cantidad = frecuencias[numero];
                    const porcentaje = total
                        ? (cantidad / total * 100).toFixed(2)
                        : "0.00";

                    return `
                        <tr>
                            <td>${formatoNumero(numero)}</td>
                            <td>${cantidad}</td>
                            <td>${porcentaje}%</td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;

    ponerHTML("tablaFrecuencias", html);
}

// =====================================================
// ESTADÍSTICAS POR SORTEO
// =====================================================

function dibujarSorteos() {
    const html = [0, 1, 2, 3, 4].map(sorteo => {
        const datos = todosLosResultados.filter(resultado => {
            if (elementoDesde?.value && resultado.fecha < elementoDesde.value) return false;
            if (elementoHasta?.value && resultado.fecha > elementoHasta.value) return false;
            return resultado.sorteo === sorteo;
        });

        const frecuencias = calcularFrecuencias(datos);

        const ordenados = [...NUMEROS].sort(
            (a, b) => frecuencias[b] - frecuencias[a] || a - b
        );

        return `
            <tr>
                <td>Sorteo ${sorteo + 1}</td>
                <td>${datos.length}</td>
                <td>${formatoNumero(ordenados[0])}</td>
                <td>${frecuencias[ordenados[0]]}</td>
            </tr>
        `;
    }).join("");

    ponerHTML("estadisticasSorteos", `
        <table>
            <thead>
                <tr>
                    <th>Sorteo</th>
                    <th>Total</th>
                    <th>Más frecuente</th>
                    <th>Veces</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
    `);
}

// =====================================================
// RANKING
// =====================================================

function dibujarRanking() {
    const frecuencias = calcularFrecuencias();

    const ordenados = [...NUMEROS].sort(
        (a, b) => frecuencias[b] - frecuencias[a] || a - b
    );

    const html = ordenados.map((numero, indice) => `
        <tr>
            <td>${indice + 1}</td>
            <td>${formatoNumero(numero)}</td>
            <td>${frecuencias[numero]}</td>
        </tr>
    `).join("");

    ponerHTML("ranking", `
        <table>
            <thead>
                <tr>
                    <th>Posición</th>
                    <th>Número</th>
                    <th>Veces</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
    `);
}

// =====================================================
// ATRASOS
// =====================================================

function dibujarAtrasos() {
    const datos = [...resultadosFiltrados].sort(ordenarPorFecha);
    const ultimaAparicion = {};

    NUMEROS.forEach(numero => {
        ultimaAparicion[numero] = -1;
    });

    datos.forEach((resultado, indice) => {
        ultimaAparicion[resultado.numero] = indice;
    });

    const html = NUMEROS.map(numero => {
        const ultima = ultimaAparicion[numero];
        const atraso = ultima === -1 ? datos.length : datos.length - 1 - ultima;

        return { numero, atraso };
    }).sort((a, b) => b.atraso - a.atraso || a.numero - b.numero)
      .map(item => `
        <tr>
            <td>${formatoNumero(item.numero)}</td>
            <td>${item.atraso}</td>
        </tr>
      `).join("");

    ponerHTML("atrasos", `
        <table>
            <thead>
                <tr>
                    <th>Número</th>
                    <th>Sorteos desde última aparición</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
    `);
}

// =====================================================
// RACHAS Y REPETICIONES
// =====================================================

function dibujarRachas() {
    const datos = [...resultadosFiltrados].sort(ordenarPorFecha);

    let rachaActual = 0;
    let numeroAnterior = null;
    let maximaRacha = 0;
    let numeroRacha = null;

    datos.forEach(resultado => {
        if (resultado.numero === numeroAnterior) {
            rachaActual++;
        } else {
            rachaActual = 1;
            numeroAnterior = resultado.numero;
        }

        if (rachaActual > maximaRacha) {
            maximaRacha = rachaActual;
            numeroRacha = resultado.numero;
        }
    });

    const repeticiones = datos.filter((resultado, indice) =>
        indice > 0 &&
        resultado.numero === datos[indice - 1].numero
    ).length;

    ponerHTML("rachas", `
        <p><strong>Mayor racha consecutiva:</strong> ${maximaRacha}</p>
        <p><strong>Número de la racha:</strong> ${
            numeroRacha === null ? "-" : formatoNumero(numeroRacha)
        }</p>
        <p><strong>Repeticiones consecutivas:</strong> ${repeticiones}</p>
    `);
}

// =====================================================
// NÚMEROS VECINOS
// =====================================================

function dibujarVecinos() {
    const frecuencias = {};

    NUMEROS.forEach(numero => {
        frecuencias[numero] = 0;
    });

    resultadosFiltrados.forEach(resultado => {
        if (resultado.numero > 1) {
            frecuencias[resultado.numero - 1]++;
        }

        if (resultado.numero < 15) {
            frecuencias[resultado.numero + 1]++;
        }
    });

    const html = NUMEROS.map(numero => `
        <tr>
            <td>${formatoNumero(numero)}</td>
            <td>${frecuencias[numero]}</td>
        </tr>
    `).join("");

    ponerHTML("vecinos", `
        <table>
            <thead>
                <tr>
                    <th>Número vecino</th>
                    <th>Apariciones como vecino</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
    `);
}

// =====================================================
// COMPARATIVA DE LOS CINCO SORTEOS
// =====================================================

function dibujarComparativa() {
    const desde = elementoDesde?.value || "";
    const hasta = elementoHasta?.value || "";

    const html = [0, 1, 2, 3, 4].map(sorteo => {
        const datos = todosLosResultados.filter(resultado =>
            resultado.sorteo === sorteo &&
            (!desde || resultado.fecha >= desde) &&
            (!hasta || resultado.fecha <= hasta)
        );

        const frecuencias = calcularFrecuencias(datos);

        const ordenados = [...NUMEROS].sort(
            (a, b) => frecuencias[b] - frecuencias[a] || a - b
        );

        return `
            <tr>
                <td>Sorteo ${sorteo + 1}</td>
                <td>${datos.length}</td>
                <td>${formatoNumero(ordenados[0])}</td>
                <td>${frecuencias[ordenados[0]]}</td>
            </tr>
        `;
    }).join("");

    ponerHTML("comparativa", `
        <table>
            <thead>
                <tr>
                    <th>Sorteo</th>
                    <th>Resultados</th>
                    <th>Número más frecuente</th>
                    <th>Veces</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
    `);
}

// =====================================================
// ESTADÍSTICAS MENSUALES
// =====================================================

function dibujarMeses() {
    const meses = {};

    resultadosFiltrados.forEach(resultado => {
        const mes = resultado.fecha.slice(0, 7);

        if (!meses[mes]) {
            meses[mes] = {
                total: 0,
                frecuencias: {}
            };
        }

        meses[mes].total++;
        meses[mes].frecuencias[resultado.numero] =
            (meses[mes].frecuencias[resultado.numero] || 0) + 1;
    });

    const nombresMeses = [
        "Enero", "Febrero", "Marzo", "Abril",
        "Mayo", "Junio", "Julio", "Agosto",
        "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const html = Object.keys(meses).sort().map(mes => {
        const [anio, numeroMes] = mes.split("-");

        const masFrecuente = Object.entries(meses[mes].frecuencias)
            .sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0];

        return `
            <tr>
                <td>${nombresMeses[Number(numeroMes) - 1]} ${anio}</td>
                <td>${meses[mes].total}</td>
                <td>${masFrecuente ? formatoNumero(Number(masFrecuente[0])) : "-"}</td>
            </tr>
        `;
    }).join("");

    ponerHTML("resultadosMes", `
        <table>
            <thead>
                <tr>
                    <th>Mes</th>
                    <th>Total resultados</th>
                    <th>Número más frecuente</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
    `);
}

// =====================================================
// ÚLTIMOS RESULTADOS
// =====================================================

function dibujarUltimosResultados() {
    const datos = [...resultadosFiltrados]
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.sorteo - a.sorteo)
        .slice(0, 25);

    const html = datos.map(resultado => `
        <tr>
            <td>${escaparHTML(resultado.fecha)}</td>
            <td>Sorteo ${resultado.sorteo + 1}</td>
            <td><strong>${formatoNumero(resultado.numero)}</strong></td>
        </tr>
    `).join("");

    ponerHTML("ultimosResultados", `
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Sorteo</th>
                    <th>Número</th>
                </tr>
            </thead>
            <tbody>${html}</tbody>
        </table>
    `);
}

// =====================================================
// CARGAR HISTÓRICO
// =====================================================

async function iniciar() {
    ponerTexto("periodo", "Cargando datos históricos...");
    ponerTexto("aviso", "");

    try {
        const respuesta = await fetch(URL_HISTORICO + "?v=" + Date.now(), {
            cache: "no-store"
        });

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo cargar el histórico. Código HTTP: ${respuesta.status}`
            );
        }

        historico = await respuesta.json();

        if (!historico || typeof historico !== "object" || Array.isArray(historico)) {
            throw new Error("El archivo histórico no tiene el formato esperado.");
        }

        todosLosResultados = obtenerResultados();

        if (todosLosResultados.length === 0) {
            ponerTexto("periodo", "No se encontraron resultados válidos.");
            ponerTexto(
                "aviso",
                "El histórico se ha cargado, pero no se han reconocido resultados. Comprueba la estructura de historico2026.json."
            );
            limpiarEstadisticas();
            return;
        }

        const fechas = todosLosResultados.map(resultado => resultado.fecha);

        if (elementoDesde && !elementoDesde.value) {
            elementoDesde.value = fechas[0];
        }

        if (elementoHasta && !elementoHasta.value) {
            elementoHasta.value = fechas[fechas.length - 1];
        }

        aplicarFiltros();

    } catch (error) {
        console.error("Error al cargar las estadísticas:", error);

        ponerTexto("periodo", "Error al cargar los datos históricos.");
        ponerTexto("aviso", error.message || "No se pudo cargar el histórico.");

        limpiarEstadisticas();
    }
}

// =====================================================
// EVENTOS
// =====================================================

if (botonAplicar) {
    botonAplicar.addEventListener("click", aplicarFiltros);
}

iniciar();
      
