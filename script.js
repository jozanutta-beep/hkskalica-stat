import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  addDoc, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/******** FIREBASE ********/
const app = initializeApp({
  apiKey: "AIzaSyBKR2unkdTKNus5FiqCmox8KQ29HZeEgP0",
  authDomain: "hkskalica-fe24b.firebaseapp.com",
  projectId: "hkskalica-fe24b",
});
const db = getFirestore(app);

/******** GLOBALS ********/
let players = [];
let isAdmin = false;
let sortDir = "desc";
let currentSort = null;

const skatersBody = document.getElementById("skatersBody");
const goaliesBody = document.getElementById("goaliesBody");

/******** LOAD ********/
async function loadPlayers() {
  players = [];
  const snap = await getDocs(collection(db, "players"));
  snap.forEach(d => {
  const data = d.data();
  players.push({
    id: d.id,
    ..data,
    position: (data.position || "").toLowerCase()
  });
});
  render();
}
loadPlayers();

/******** RENDER ********/
function render() {
  skatersBody.innerHTML = "";
  goaliesBody.innerHTML = "";

  const skaters = players
    .filter(p => p.position === "skater")
    .sort((a, b) => (a.orderSkater ?? 9999) - (b.orderSkater ?? 9999));

  const goalies = players
    .filter(p => p.position === "goalie")
    .sort((a, b) => (a.orderGoalie ?? 9999) - (b.orderGoalie ?? 9999));

  skaters.forEach((p, i) => renderSkater(p, i));
  goalies.forEach((p, i) => renderGoalie(p, i));
}

function renderSkater(p, i) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${i + 1}</td>
    <td>${p.name}</td>
    <td><input type="number" value="${p.goals ?? 0}" data-field="goals" ${!isAdmin ? "disabled" : ""}></td>
    <td><input type="number" value="${p.assists ?? 0}" data-field="assists" ${!isAdmin ? "disabled" : ""}></td>
    <td><input type="number" value="${p.points ?? 0}" data-field="points" ${!isAdmin ? "disabled" : ""}></td>
    <td><input type="number" value="${p.sog ?? 0}" data-field="sog" ${!isAdmin ? "disabled" : ""}></td>
    <td><input type="number" value="${p.mvps ?? 0}" data-field="mvps" ${!isAdmin ? "disabled" : ""}></td>
    <td><button onclick="deletePlayer('${p.id}')">❌</button></td>
  `;
  skatersBody.appendChild(tr);
  if (isAdmin) attachEditors(tr, p.id);
}

function renderGoalie(p, i) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${i + 1}</td>
    <td>${p.name}</td>
    <td><input type="number" value="${p.assists ?? 0}" data-field="assists" ${!isAdmin ? "disabled" : ""}></td>
    <td><input type="number" value="${p.points ?? 0}" data-field="points" ${!isAdmin ? "disabled" : ""}></td>
    <td><input type="number" value="${p.mvps ?? 0}" data-field="mvps" ${!isAdmin ? "disabled" : ""}></td>
    <td><input type="number" value="${p.saves ?? 0}" data-field="saves" ${!isAdmin ? "disabled" : ""}></td>
    <td><button onclick="deletePlayer('${p.id}')">❌</button></td>
  `;
  goaliesBody.appendChild(tr);
  if (isAdmin) attachEditors(tr, p.id);
}

/******** SAFE EDITING ********/
function attachEditors(tr, id) {
  tr.querySelectorAll("input[data-field]").forEach(input => {
    const original = input.value;
    const field = input.dataset.field;

    input.addEventListener("change", async () => {
      if (input.value === original) return;

      const num = Number(input.value);
      if (Number.isNaN(num)) {
        input.value = original;
        return;
      }

      await updateDoc(doc(db, "players", id), {
        [field]: num
      });
    });
  });
}

/******** SORT SKATERS ONLY ********/
async function sortSkaters(field) {
  const skaters = players.filter(p => p.position === "skater");

  skaters.sort((a, b) => {
    const av = Number(a[field]) || 0;
    const bv = Number(b[field]) || 0;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  for (let i = 0; i < skaters.length; i++) {
    await updateDoc(doc(db, "players", skaters[i].id), {
      orderSkater: i + 1
    });
  }

  loadPlayers();
}

function handleSort(field) {
  sortDir =
    currentSort === field && sortDir === "desc" ? "asc" : "desc";
  currentSort = field;
  sortSkaters(field);
}

document.getElementById("sortPointsBtn").onclick  = () => handleSort("points");
document.getElementById("sortGoalsBtn").onclick   = () => handleSort("goals");
document.getElementById("sortAssistsBtn").onclick = () => handleSort("assists");

/******** ADD ********/
document.getElementById("addPlayerBtn").onclick = async () => {
  const name = prompt("Player name?");
  const pos = prompt("skater or goalie?");
  if (!name || !pos) return;

  await addDoc(collection(db, "players"), {
    name,
    position: pos,
    goals: 0,
    assists: 0,
    points: 0,
    sog: 0,
    mvps: 0,
    saves: 0,
    orderSkater: pos === "skater" ? Date.now() : null,
    orderGoalie: pos === "goalie" ? Date.now() : null
  });

  loadPlayers();
};

/******** DELETE ********/
window.deletePlayer = async id => {
  if (!isAdmin) return;
  if (confirm("Delete player?")) {
    await deleteDoc(doc(db, "players", id));
    loadPlayers();
  }
};

/******** LOGIN ********/
document.getElementById("loginBtn").onclick = () => {
  if (prompt("Admin password") === "skalica123") {
    isAdmin = true;
    document.getElementById("addPlayerBtn").hidden = false;
    render();
  }
};



