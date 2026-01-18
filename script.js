import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  addDoc, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**************** FIREBASE ******************/
const firebaseConfig = {
  apiKey: "AIzaSyBKR2unkdTKNus5FiqCmox8KQ29HZeEgP0",
  authDomain: "hkskalica-fe24b.firebaseapp.com",
  projectId: "hkskalica-fe24b",
  storageBucket: "hkskalica-fe24b.firebasestorage.app",
  messagingSenderId: "1017079759774",
  appId: "1:1017079759774:web:7cab3626c176aaf8144c8f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**************** GLOBALS ******************/
let players = [];
let isAdmin = false;
let currentSort = null;
let sortDirection = "desc";

const body = document.getElementById("playersBody");

/**************** LOAD ******************/
async function loadPlayers() {
  players = [];
  const snap = await getDocs(collection(db, "players"));
  snap.forEach(d => players.push({ id: d.id, ...d.data() }));

  // ALWAYS respect stored order
  players.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  render();
}

loadPlayers();

/**************** RENDER ******************/
function render() {
  body.innerHTML = "";

  const max = field =>
    Math.max(...players.map(p => Number(p[field]) || 0), 0);

  const maxGoals = max("goals");
  const maxAssists = max("assists");
  const maxPoints = max("points");
  const maxMvps = max("mvps");
  const maxSaves = max("saves");

  players.forEach((p, i) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${p.name}</td>
      <td>${p.position}</td>
      <td contenteditable="${isAdmin}">${p.goals ?? 0}</td>
      <td contenteditable="${isAdmin}">${p.assists ?? 0}</td>
      <td contenteditable="${isAdmin}">${p.points ?? 0}</td>
      <td contenteditable="${isAdmin}">${p.series ?? 0}</td>
      <td contenteditable="${isAdmin}">${p.sog ?? 0}</td>
      <td contenteditable="${isAdmin}">${p.mvps ?? 0}</td>
      <td contenteditable="${isAdmin}">${p.saves ?? 0}</td>
      <td><button onclick="deletePlayer('${p.id}')">❌</button></td>
    `;

    const c = tr.children;

    if (i === 0) tr.classList.add("top1");
    if (i === 1) tr.classList.add("top2");
    if (i === 2) tr.classList.add("top3");

    if (+p.goals === maxGoals) c[3].classList.add("stat-leader");
    if (+p.assists === maxAssists) c[4].classList.add("stat-leader");
    if (+p.points === maxPoints) c[5].classList.add("stat-leader");
    if (+p.mvps === maxMvps) c[8].classList.add("stat-leader");
    if (+p.saves === maxSaves) c[9].classList.add("stat-leader");

    body.appendChild(tr);

    if (isAdmin) attachEditHandlers(tr, p);
  });
}

/**************** EDIT ******************/
function attachEditHandlers(tr, p) {
  const fields = [
    "goals", "assists", "points",
    "series", "sog", "mvps", "saves"
  ];

  [...tr.querySelectorAll("td[contenteditable]")].forEach((cell, i) => {
    cell.onblur = async () => {
      const field = fields[i];
      if (!field) return;

      await updateDoc(doc(db, "players", p.id), {
        [field]: Number(cell.innerText) || 0
      });

      loadPlayers();
    };
  });
}

/**************** DELETE ******************/
window.deletePlayer = async id => {
  if (!isAdmin) return;
  if (confirm("Delete player?")) {
    await deleteDoc(doc(db, "players", id));
    loadPlayers();
  }
};

/**************** LOGIN ******************/
document.getElementById("loginBtn").onclick = () => {
  if (prompt("Admin password:") === "admin123") {
    isAdmin = true;
    alert("Admin enabled");
    document.getElementById("addPlayerBtn").hidden = false;
    document.getElementById("resetSeasonBtn").hidden = false;
    render();
  }
};

/**************** ADD ******************/
document.getElementById("addPlayerBtn").onclick = async () => {
  const name = prompt("Player name:");
  const position = prompt("skater or goalie?");
  if (!name || !position) return;

  await addDoc(collection(db, "players"), {
    name,
    position: position.toLowerCase(),
    order: players.length + 1,
    goals: 0,
    assists: 0,
    points: 0,
    series: 0,
    sog: 0,
    mvps: 0,
    saves: 0
  });

  loadPlayers();
};

/**************** RESET ******************/
document.getElementById("resetSeasonBtn").onclick = async () => {
  if (!confirm("Reset all stats?")) return;

  for (const p of players) {
    await updateDoc(doc(db, "players", p.id), {
      goals: 0,
      assists: 0,
      points: 0,
      series: 0,
      sog: 0,
      mvps: 0,
      saves: 0
    });
  }

  loadPlayers();
};

/**************** SORT ******************/
function handleSort(field, btnId) {
  sortDirection =
    currentSort === field && sortDirection === "desc" ? "asc" : "desc";
  currentSort = field;

  document.querySelectorAll(".sortBar button")
    .forEach(b => b.classList.remove("active"));
  document.getElementById(btnId).classList.add("active");

  sortAndPersist(field);
}

async function sortAndPersist(field) {
  players.forEach(p => p[field] = Number(p[field]) || 0);

  players.sort((a, b) =>
    sortDirection === "desc"
      ? b[field] - a[field]
      : a[field] - b[field]
  );

  // assign new order
  for (let i = 0; i < players.length; i++) {
    players[i].order = i + 1;
  }

  render();

  // persist order to Firestore
  for (const p of players) {
    await updateDoc(doc(db, "players", p.id), {
      order: p.order
    });
  }
}

document.getElementById("sortPointsBtn").onclick =
  () => handleSort("points", "sortPointsBtn");
document.getElementById("sortGoalsBtn").onclick =
  () => handleSort("goals", "sortGoalsBtn");
document.getElementById("sortAssistsBtn").onclick =
  () => handleSort("assists", "sortAssistsBtn");
