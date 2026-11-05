
const drawFilter = document.getElementById("drawFilter");
const totalEl = document.getElementById("total");
const mostEl = document.getElementById("most");
const leastEl = document.getElementById("least");
const frequencyEl = document.getElementById("frequency");
const periodEl = document.getElementById("period");

let history = {};

async function loadStats() {
  try {
    const response = await fetch(
      `data/historico2026.json?v=${Date.now()}`
    );

    if (!response.ok) throw new Error("No se pudo cargar el histórico");

    history = await response.json();
    calculateStats();
  } catch (error) {
    frequencyEl.innerHTML =
      '<p class="error">No se pudieron cargar las estadísticas.</p>';
    console.error(error);
  }
}

function calculateStats() {
  const selectedDraw = drawFilter.value;
  const counts = Array(16).fill(0);
  let total = 0;
  const dates = Object.keys(history).sort();

  dates.forEach(date => {
    const day = history[date];

    Object.entries(day).forEach(([draw, value]) => {
      if (
        selectedDraw !== "all" &&
        draw !== selectedDraw
      ) return;

      const number = Number(value);

      if (Number.isInteger(number) && number >= 1 && number <= 15) {
        counts[number]++;
        total++;
      }
    });
  });

  totalEl.textContent = total;

  const highest = Math.max(...counts.slice(1));
  const lowest = Math.min(...counts.slice(1));

  if (total === 0) {
    mostEl.textContent = "—";
    leastEl.textContent = "—";
  } else {
    const mostNumbers = [];
    const leastNumbers = [];

    for (let i = 1; i <= 15; i++) {
      if (counts[i] === highest) mostNumbers.push(formatNumber(i));
      if (counts[i] === lowest) leastNumbers.push(formatNumber(i));
    }

    mostEl.textContent = mostNumbers.join(", ");
    leastEl.textContent = leastNumbers.join(", ");
  }

  frequencyEl.innerHTML = "";

  for (let i = 1; i <= 15; i++) {
    const percentage = total
      ? (counts[i] / total) * 100
      : 0;

    const row = document.createElement("div");
    row.className = "number-row";

    const ball = document.createElement("div");
    ball.className = "ball";
    ball.textContent = formatNumber(i);

    const barBackground = document.createElement("div");
    barBackground.className = "bar-bg";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.width = percentage + "%";
    bar.title = percentage.toFixed(1) + "%";

    barBackground.appendChild(bar);

    const count = document.createElement("div");
    count.className = "count";
    count.textContent = counts[i];

    row.append(ball, barBackground, count);
    frequencyEl.appendChild(row);
  }

  if (dates.length) {
    periodEl.textContent =
      `Fechas incluidas en el histórico: ${dates[0]} a ${dates[dates.length - 1]}. ` +
      `Los porcentajes se calculan sobre ${total} resultados disponibles.`;
  } else {
    periodEl.textContent = "Todavía no hay resultados en el histórico.";
  }
}

function formatNumber(number) {
  return String(number).padStart(2, "0");
}

drawFilter.addEventListener("change", calculateStats);

loadStats();
