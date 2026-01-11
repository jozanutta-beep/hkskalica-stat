// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🔥 REPLACE WITH YOUR OWN CONFIG
const firebaseConfig = 
{apiKey: "AIzaSyBKR2unkdTKNus5FiqCmox8KQ29HZeEgP0",
 authDomain: "hkskalica-fe24b.firebaseapp.com",
 projectId: "hkskalica-fe24b",
 storageBucket: "hkskalica-fe24b.firebasestorage.app",
 messagingSenderId: "1017079759774",
 appId: "1:1017079759774:web:7cab3626c176aaf8144c8f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ================= DOM =================
const skatersBody = document.querySelector("#skatersTable tbody");
const goaliesBody = document.querySelector("#goaliesTable tbody");
const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");

let isAdmin = false;
let players = [];

// ================= AUTH =================
document.getElementById("loginBtn").onclick = () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .catch(err => alert(err.message));
};

onAuthStateChanged(auth, user => {
  if (user) {
    isAdmin = true;
    loginBox.style.display = "none";
    adminPanel.style.display = "block";
    renderTables();
  }
});

// ================= LOAD DATA =================
async function loadPlayers() {
  players = [];
  const snap = await getDocs(collection(db, "players"));
  snap.forEach(d => players.push({ id: d.id, ...d.data() }));
  renderTables();
}
loadPlayers();

// ================= RENDER =================
function addRow(player, tbody) {
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${player.order}</td>
    <td>${player.name}</td>
    <td>${player.goals}</td>
    <td>${player.assists}</td>
    <td>${player.points}</td>
    <td>${player.series}</td>
    <td>${player.sog}</td>
    <td>${player.mvps}</td>
    <td>${player.saves}</td>
  `;

  if (isAdmin) enableMobileEdit(row, player);

  tbody.appendChild(row);
}

function renderTables() {
  skatersBody.innerHTML = "";
  goaliesBody.innerHTML = "";

  players
    .sort((a, b) => a.order - b.order)
    .forEach(p => {
      if (p.position === "goalie") addRow(p, goaliesBody);
      else addRow(p, skatersBody);
    });
}

// ================= MOBILE FRIENDLY EDIT =================
function enableMobileEdit(row, player) {
  const keys = ["order","name","goals","assists","points","series","sog","mvps","saves"];

  row.querySelectorAll("td").forEach((cell, i) => {

    cell.style.background = "#fff7cc";

    cell.onclick = async () => {
      if (keys[i] === "name") return;

      const val = prompt(`Edit ${keys[i]}`, player[keys[i]]);
      if (val === null) return;

      let v = val;
      if (!isNaN(v)) v = Number(v);

      player[keys[i]] = v;
      await updateDoc(doc(db, "players", player.id), player);
      loadPlayers();
    };
  });

  // right click / long press = delete
  row.oncontextmenu = async (e) => {
    e.preventDefault();
    if (confirm("Delete this player?")) {
      await deleteDoc(doc(db, "players", player.id));
      loadPlayers();
    }
  };
}

// ================= SORTING =================
async function sortSkatersBy(field) {

  players.forEach(p => p[field] = Number(p[field]) || 0);

  const skaters = players
    .filter(p => p.position === "skater")
    .sort((a, b) => b[field] - a[field]);

  const goalies = players.filter(p => p.position === "goalie");

  skaters.forEach((p, i) => p.order = i + 1);
  goalies.forEach((p, i) => p.order = i + 1);

  for (const p of [...skaters, ...goalies]) {
    await updateDoc(doc(db, "players", p.id), { order: p.order });
  }

  players = [...skaters, ...goalies];
  renderTables();
}

document.getElementById("sortPointsBtn").onclick = () => sortSkatersBy("points");
document.getElementById("sortGoalsBtn").onclick = () => sortSkatersBy("goals");
document.getElementById("sortAssistsBtn").onclick = () => sortSkatersBy("assists");

// ================= ADD PLAYER =================
document.getElementById("addPlayerBtn").onclick = async () => {
  const name = prompt("Player name:");
  const pos = prompt("Position: skater or goalie");

  if (!name || !pos) return;

  const newPlayer = {
    order: players.length + 1,
    name,
    position: pos.toLowerCase(),
    goals: 0,
    assists: 0,
    points: 0,
    series: 0,
    sog: 0,
    mvps: 0,
    saves: pos.toLowerCase() === "goalie" ? 0 : "—"
  };

  await addDoc(collection(db, "players"), newPlayer);
  loadPlayers();
};

// ================= NEW SEASON RESET =================
document.getElementById("resetSeasonBtn").onclick = async () => {
  if (!confirm("Reset ALL stats for new season?")) return;

  for (const p of players) {
    const reset = {
      ...p,
      goals: 0,
      assists: 0,
      points: 0,
      series: 0,
      sog: 0,
      mvps: 0,
      saves: p.position === "goalie" ? 0 : "—"
    };
    await updateDoc(doc(db, "players", p.id), reset);
  }

  loadPlayers();
};
