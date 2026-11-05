
const DRAWS = [
  { number: 1, time: "10:00" },
  { number: 2, time: "12:00" },
  { number: 3, time: "14:00" },
  { number: 4, time: "17:00" },
  { number: 5, time: "21:15" }
];

const resultsEl = document.getElementById("results");
const statusEl = document.getElementById("status");
const dateInput = document.getElementById("dateInput");

let historicalData = {};

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, amount) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return localDateString(date);
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

async function loadHistory() {
  try {
    const response = await fetch(
      `data/historico2026.json?v=${Date.now()}`
    );

    if (!response.ok) throw new Error("No se pudo cargar el histórico");

    historicalData = await response.json();
    showResults(dateInput.value);
  } catch (error) {
    resultsEl.innerHTML = "";
    statusEl.textContent = "No se pudo cargar el histórico.";
    console.error(error);
  }
}

function showResults(dateString) {
  const dayData = historicalData[dateString] || {};
  const today = localDateString();
  const isFuture = dateString > today;

  resultsEl.innerHTML = "";

  DRAWS.forEach(draw => {
    const value = dayData[draw.number];

    const card = document.createElement("div");
    card.className = "draw-card";

    const info = document.createElement("div");
    info.className = "draw-info";

    const title = document.createElement("strong");
    title.textContent = `Sorteo ${draw.number}`;

    const time = document.createElement("span");
    time.textContent = `Horario: ${draw.time}`;

    info.append(title, time);

    const result = document.createElement("div");

    if (Number.isInteger(value) && value >= 1 && value <= 15) {
      result.className = "number";
      result.textContent = String(value).padStart(2, "0");
    } else {
      result.className = "pending";
      result.textContent = isFuture ? "No celebrado" : "Pendiente";
    }

    card.append(info, result);
    resultsEl.appendChild(card);
  });

  statusEl.textContent = formatDate(dateString);
}

dateInput.value = localDateString();

document.getElementById("prevBtn").addEventListener("click", () => {
  dateInput.value = addDays(dateInput.value, -1);
  showResults(dateInput.value);
});

document.getElementById("nextBtn").addEventListener("click", () => {
  dateInput.value = addDays(dateInput.value, 1);
  showResults(dateInput.value);
});

document.getElementById("todayBtn").addEventListener("click", () => {
  dateInput.value = localDateString();
  showResults(dateInput.value);
});

dateInput.addEventListener("change", () => {
  if (dateInput.value) showResults(dateInput.value);
});

loadHistory();
