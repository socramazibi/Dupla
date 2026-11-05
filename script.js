
const NOMBRES_SORTEOS = [
  "Primer sorteo",
  "Segundo sorteo",
  "Tercer sorteo",
  "Cuarto sorteo",
  "Quinto sorteo"
];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

let historico = {};
let todosLosResultados = [];

const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");

function escapar(valor) {
  return String(valor).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function numeroValido(valor) {
  if (valor === null || valor === undefined || valor === "") return null;

  const n = Number(valor);

  if (!Number.isInteger(n) || n < 1 || n > 15) return null;
  return n;
}

function fechaLegible(fecha) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES");
}

function fechaMes(fecha) {
  const [y, m] = fecha.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}

function obtenerResultados() {
  const filas = [];

  Object.keys(historico)
    .sort()
    .forEach(fecha => {
      const registro = historico[fecha];

      // El formato del histórico es {fecha: {values: [...]}}
      const valores = Array.isArray(registro)
        ? registro
        : registro?.values;

      if (!Array.isArray(valores)) return;

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

  return filas.sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || a.sorteo - b.sorteo
  );
}

function resultadosFiltrados() {
  const desde = $("desde").value;
  const hasta = $("hasta").value;
  const sorteo = $("sorteo").value;

  return todosLosResultados.filter(r => {
    if (desde && r.fecha < desde) return false;
    if (hasta && r.fecha > hasta) return false;
    if (sorteo !== "todos" && r.sorteo !== Number(sorteo)) return false;
    return true;
  });
}

function contarNumeros(resultados) {
  const conteos = Array(16).fill(0);

  resultados.forEach(r => conteos[r.numero]++);
  return conteos;
}

function porcentaje(cantidad, total) {
  return total ? (cantidad / total * 100) : 0;
}

function calcularAtrasos(resultados) {
  const ultima = Array(16).fill(null);
  const mayor = Array(16).fill(0);
  const atrasoActual = Array(16).fill(resultados.length);

  resultados.forEach((r, indice) => {
    const anterior = ultima[r.numero];

    if (anterior !== null) {
      mayor[r.numero] = Math.max(
        mayor[r.numero],
        indice - anterior - 1
      );
    } else {
      mayor[r.numero] = Math.max(mayor[r.numero], indice);
    }

    ultima[r.numero] = indice;
    atrasoActual[r.numero] = resultados.length - indice - 1;
  });

  return { ultima, mayor, atrasoActual };
}

function calcularRachas(resultados) {
  const apariciones = Array(16).fill(0);
  const maxRacha = Array(16).fill(0);
  const rachaActual = Array(16).fill(0);

  let repetidosConsecutivos = 0;
  let rachaGlobal = 0;
  let mayorRachaGlobal = 0;
  let anterior = null;

  resultados.forEach(r => {
    const n = r.numero;
    apariciones[n]++;

    rachaActual[n]++;
    maxRacha[n] = Math.max(maxRacha[n], rachaActual[n]);

    for (let i = 1; i <= 15; i++) {
      if (i !== n) rachaActual[i] = 0;
    }

    if (anterior === n) {
      repetidosConsecutivos++;
      rachaGlobal++;
    } else {
      rachaGlobal = 1;
    }

    mayorRachaGlobal = Math.max(mayorRachaGlobal, rachaGlobal);
    anterior = n;
  });

  return {
    maxRacha,
    repetidosConsecutivos,
    mayorRachaGlobal
  };
}

function calcularVecinos(resultados) {
  const conteos = Array(16).fill(0);

  resultados.forEach(r => {
    if (r.numero > 1) conteos[r.numero - 1]++;
    if (r.numero < 15) conteos[r.numero + 1]++;
  });

  return conteos;
}

function dibujarFrecuencias(conteos, total) {
  const ordenados = [];

  for (let n = 1; n <= 15; n++) {
    ordenados.push({
      numero: n,
      cantidad: conteos[n],
      porcentaje: porcentaje(conteos[n], total)
    });
  }

  const ranking = [...ordenados].sort((a, b) =>
    b.cantidad - a.cantidad || a.numero - b.numero
  );

  const maximo = Math.max(1, ...ordenados.map(x => x.cantidad));

  $("grafico-frecuencia").innerHTML = ordenados.map(x => `
    <div class="chart-row">
      <span class="number-pill">${pad(x.numero)}</span>
      <div class="chart-track">
        <div class="chart-fill" style="width:${x.cantidad / maximo * 100}%"></div>
      </div>
      <strong>${x.cantidad}</strong>
    </div>
  `).join("");

  $("tabla-frecuencia").innerHTML = ranking.map((x, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><span class="number-pill">${pad(x.numero)}</span></td>
      <td class="num">${x.cantidad}</td>
      <td class="num">${x.porcentaje.toFixed(2)}%</td>
      <td class="bar-cell">
        <div class="bar">
          <i style="width:${x.cantidad / maximo * 100}%"></i>
        </div>
      </td>
    </tr>
  `).join("");

  const max = ranking[0]?.cantidad ?? 0;
  const min = ranking[14]?.cantidad ?? 0;

  const mas = ranking
    .filter(x => x.cantidad === max)
    .map(x => pad(x.numero))
    .join(", ");

  const menos = ranking
    .filter(x => x.cantidad === min)
    .map(x => pad(x.numero))
    .join(", ");

  $("ranking").innerHTML = `
    <h3>Más frecuentes</h3>
    <p><strong>${mas || "—"}</strong></p>
    <p class="muted">${max} apariciones</p>
    <hr>
    <h3>Menos frecuentes</h3>
    <p><strong>${menos || "—"}</strong></p>
    <p class="muted">${min} apariciones</p>
  `;
}

function dibujarResumen(resultados, conteos) {
  const total = resultados.length;

  if (!total) {
    $("resumen").innerHTML = `
      <div class="kpi"><small>Sorteos analizados</small><strong>0</strong></div>
      <div class="kpi"><small>Número más frecuente</small><strong>—</strong></div>
      <div class="kpi"><small>Número menos frecuente</small><strong>—</strong></div>
      <div class="kpi"><small>Media por número</small><strong>—</strong></div>
    `;
    return;
  }

  const max = Math.max(...conteos.slice(1));
  const min = Math.min(...conteos.slice(1));

  const mas = conteos
    .map((v, i) => v === max && i > 0 ? pad(i) : null)
    .filter(Boolean).join(", ");

  const menos = conteos
    .map((v, i) => v === min && i > 0 ? pad(i) : null)
    .filter(Boolean).join(", ");

  $("resumen").innerHTML = `
    <div class="kpi">
      <small>Sorteos analizados</small>
      <strong>${total}</strong>
      <span>Resultados válidos</span>
    </div>
    <div class="kpi">
      <small>Número más frecuente</small>
      <strong>${mas}</strong>
      <span>${max} apariciones</span>
    </div>
    <div class="kpi">
      <small>Número menos frecuente</small>
      <strong>${menos}</strong>
      <span>${min} apariciones</span>
    </div>
    <div class="kpi">
      <small>Media por número</small>
      <strong>${(total / 15).toFixed(2)}</strong>
      <span>Promedio de apariciones</span>
    </div>
  `;
}

function dibujarSorteos() {
  const filas = [];

  for (let i = 0; i < 5; i++) {
    const datos = todosLosResultados.filter(r =>
      r.sorteo === i &&
      (! $("desde").value || r.fecha >= $("desde").value) &&
      (! $("hasta").value || r.fecha <= $("hasta").value)
    );

    const media = datos.length / 15;

    filas.push(`
      <tr>
        <td>${NOMBRES_SORTEOS[i]}</td>
        <td class="num">${datos.length}</td>
        <td class="num">${media.toFixed(2)}</td>
      </tr>
    `);
  }

  $("tabla-sorteos").innerHTML = filas.join("");
}

function dibujarAtrasos(resultados) {
  const { ultima, mayor, atrasoActual } = calcularAtrasos(resultados);

  const filas = [];

  for (let n = 1; n <= 15; n++) {
    const fechaUltima = ultima[n] === null
      ? "Sin apariciones"
      : fechaLegible(resultados[ultima[n]].fecha);

    filas.push({
      numero: n,
      atraso: atrasoActual[n],
      fecha: fechaUltima,
      mayor: mayor[n]
    });
  }

  filas.sort((a, b) =>
    b.atraso - a.atraso || a.numero - b.numero
  );

  $("tabla-atrasos").innerHTML = filas.map(x => `
    <tr>
      <td><span class="number-pill">${pad(x.numero)}</span></td>
      <td class="num"><strong>${x.atraso}</strong></td>
      <td>${x.fecha}</td>
      <td class="num">${x.mayor}</td>
    </tr>
  `).join("");
}

function dibujarRachas(resultados) {
  const r = calcularRachas(resultados);
  const maximos = [];

  for (let n = 1; n <= 15; n++) {
    if (r.maxRacha[n] > 0) {
      maximos.push({ numero: n, racha: r.maxRacha[n] });
    }
  }

  maximos.sort((a, b) =>
    b.racha - a.racha || a.numero - b.numero
  );

  $("rachas").innerHTML = `
    <p>Repeticiones en dos resultados consecutivos: <strong>${r.repetidosConsecutivos}</strong></p>
    <p>Mayor secuencia del mismo número: <strong>${r.mayorRachaGlobal}</strong> resultados</p>
    <h3>Mayor racha por número</h3>
    ${maximos.slice(0, 8).map(x => `
      <p>
        <span class="number-pill">${pad(x.numero)}</span>
        <strong>${x.racha}</strong> apariciones consecutivas
      </p>
    `).join("") || "<p class='muted'>Sin datos suficientes.</p>"}
  `;
}

function dibujarVecinos(resultados) {
  const vecinos = calcularVecinos(resultados);
  const total = resultados.length;
  const max = Math.max(1, ...vecinos.slice(1));

  $("vecinos").innerHTML = `
    <p class="muted">Conteo de resultados que fueron vecinos inmediatos de otro número.</p>
    ${Array.from({ length: 15 }, (_, i) => i + 1).map(n => `
      <div class="chart-row">
        <span class="number-pill">${pad(n)}</span>
        <div class="chart-track">
          <div class="chart-fill" style="width:${vecinos[n] / max * 100}%"></div>
        </div>
        <strong>${vecinos[n]}</strong>
      </div>
    `).join("")}
    <p class="muted">Se excluyen vecinos fuera del rango 01–15. Un mismo resultado puede contar como vecino de dos números distintos.</p>
  `;
}

function dibujarComparativa() {
  const conteos = Array.from({ length: 5 }, () => Array(16).fill(0));

  todosLosResultados.forEach(r => {
    if ($("desde").value && r.fecha < $("desde").value) return;
    if ($("hasta").value && r.fecha > $("hasta").value) return;
    conteos[r.sorteo][r.numero]++;
  });

  let html = "";

  for (let n = 1; n <= 15; n++) {
    html += `
      <tr>
        <td><span class="number-pill">${pad(n)}</span></td>
        ${conteos.map(c => `<td class="num">${c[n]}</td>`).join("")}
      </tr>
    `;
  }

  $("comparativa").innerHTML = html;
}

function dibujarMeses(resultados) {
  const meses = {};

  resultados.forEach(r => {
    const clave = r.fecha.slice(0, 7);

    if (!meses[clave]) {
      meses[clave] = { resultados: 0, dias: new Set() };
    }

    meses[clave].resultados++;
    meses[clave].dias.add(r.fecha);
  });

  const claves = Object.keys(meses).sort();
  const max = Math.max(1, ...claves.map(k => meses[k].resultados));

  $("grafico-meses").innerHTML = claves.map(k => {
    const [y, m] = k.split("-").map(Number);
    const cantidad = meses[k].resultados;

    return `
      <div class="month-item">
        <b>${cantidad}</b>
        <div class="month-column" style="height:${cantidad / max * 125}px"></div>
        <small>${MESES[m - 1].slice(0, 3)}</small>
        <small>${y}</small>
      </div>
    `;
  }).join("");

  $("tabla-meses").innerHTML = claves.map(k => `
    <tr>
      <td>${fechaMes(k + "-01")}</td>
      <td class="num">${meses[k].resultados}</td>
      <td class="num">${meses[k].dias.size}</td>
    </tr>
  `).join("");

  if (!claves.length) {
    $("grafico-meses").innerHTML = "<p class='empty'>No hay datos en este periodo.</p>";
  }
}

function dibujarUltimos(resultados) {
  const fechas = [...new Set(resultados.map(r => r.fecha))]
    .sort()
    .reverse()
    .slice(0, 12);

  $("ultimos").innerHTML = fechas.map(fecha => {
    const valores = Array(5).fill("—");

    resultados
      .filter(r => r.fecha === fecha)
      .forEach(r => valores[r.sorteo] = pad(r.numero));

    return `
      <tr>
        <td>${fechaLegible(fecha)}</td>
        ${valores.map(v => `<td class="num">${v}</td>`).join("")}
      </tr>
    `;
  }).join("");

  if (!fechas.length) {
    $("ultimos").innerHTML =
      `<tr><td colspan="6" class="empty">No hay resultados.</td></tr>`;
  }
}

function actualizar() {
  const resultados = resultadosFiltrados();
  const conteos = contarNumeros(resultados);

  if ($("desde").value && $("hasta").value &&
      $("desde").value > $("hasta").value) {
    $("aviso").textContent = "La fecha inicial no puede ser posterior a la fecha final.";
    return;
  }

  $("aviso").textContent =
    `Se están analizando ${resultados.length} resultados válidos. ` +
    "Los sorteos sin número publicado quedan excluidos de los cálculos.";

  const fechas = resultados.map(r => r.fecha).sort();

  $("periodo").textContent = fechas.length
    ? `Periodo con resultados: ${fechaLegible(fechas[0])} – ${fechaLegible(fechas[fechas.length - 1])}`
    : "No hay resultados disponibles con estos filtros.";

  dibujarResumen(resultados, conteos);
  dibujarFrecuencias(conteos, resultados.length);
  dibujarSorteos();
  dibujarAtrasos(resultados);
  dibujarRachas(resultados);
  dibujarVecinos(resultados);
  dibujarComparativa();
  dibujarMeses(resultados);
  dibujarUltimos(resultados);
}

async function iniciar() {
  try {
    const respuesta = await fetch("data/historico2026.json");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar data/historico2026.json");
    }

    historico = await respuesta.json();
    todosLosResultados = obtenerResultados();

    if (!todosLosResultados.length) {
      $("aviso").textContent =
        "El histórico se ha cargado, pero no contiene resultados válidos del 01 al 15.";
    }

    const fechas = todosLosResultados.map(r => r.fecha).sort();

    if (fechas.length) {
      $("desde").value = fechas[0];
      $("hasta").value = fechas[fechas.length - 1];
    }

    $("aplicar").addEventListener("click", actualizar);
    $("sorteo").addEventListener("change", actualizar);

    actualizar();

  } catch (error) {
    console.error(error);
    $("aviso").textContent =
      "Error al cargar el histórico: " + error.message;
    $("periodo").textContent = "No se han podido calcular las estadísticas.";
  }
}

iniciar();
      
