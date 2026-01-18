import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**************** FIREBASE CONFIG ******************/
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

const skatersBody = document.getElementById("skatersBody");
const goaliesBody = document.getElementById("goaliesBody");

/**************** LOAD PLAYERS ******************/
async function loadPlayers() {
  players = [];
  const snap = await getDocs(collection(db, "players"));
  snap.forEach(d => players.push({ id: d.id, ...d.data() }));
  players.sort((a,b) => (a.order || 0) - (b.order || 0));
  renderTables();
}

loadPlayers();

/**************** RENDER TABLES ******************/
function renderTables() {
  skatersBody.innerHTML = "";
  goaliesBody.innerHTML = "";

  const skaters = players.filter(p => p.position === "skater");
  const goalies = players.filter(p => p.position === "goalie");

  const maxGoals   = Math.max(...skaters.map(p => Number(p.goals)||0),0);
  const maxAssists = Math.max(...skaters.map(p => Number(p.assists)||0),0);
  const maxPoints  = Math.max(...skaters.map(p => Number(p.points)||0),0);
  const maxSog     = Math.max(...skaters.map(p => Number(p.sog)||0),0);
  const maxMvps    = Math.max(...skaters.map(p => Number(p.mvps)||0),0);
  const maxSaves   = Math.max(...goalies.map(p => Number(p.saves)||0),0);

  skaters.forEach((p,i) => {
    addRow(p, skatersBody);
    const row = skatersBody.lastElementChild;
    const c = row.children;

    if(i===0) row.classList.add("top1");
    if(i===1) row.classList.add("top2");
    if(i===2) row.classList.add("top3");

    if(Number(p.goals)   === maxGoals)   c[3].classList.add("stat-leader");
    if(Number(p.assists)=== maxAssists) c[4].classList.add("stat-leader");
    if(Number(p.points) === maxPoints)  c[5].classList.add("stat-leader");
    if(Number(p.sog)    === maxSog)     c[7].classList.add("stat-leader");
    if(Number(p.mvps)   === maxMvps)    c[8].classList.add("stat-leader");
  });

  goalies.forEach(p => {
    addRow(p, goaliesBody);
    const row = goaliesBody.lastElementChild;
    if(Number(p.saves) === maxSaves) row.children[3].classList.add("stat-leader");
  });
}

/**************** ADD ROW ******************/
function addRow(p, tbody) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${p.order}</td>
    <td>${p.name}</td>
    <td>${p.position}</td>
    <td contenteditable="${isAdmin}">${p.goals ?? ""}</td>
    <td contenteditable="${isAdmin}">${p.assists ?? ""}</td>
    <td contenteditable="${isAdmin}">${p.points ?? ""}</td>
    <td contenteditable="${isAdmin}">${p.series ?? ""}</td>
    <td contenteditable="${isAdmin}">${p.sog ?? ""}</td>
    <td contenteditable="${isAdmin}">${p.mvps ?? ""}</td>
    <td><button onclick="deletePlayer('${p.id}')">❌</button></td>
  `;
  tbody.appendChild(tr);

  if(isAdmin){
    [...tr.querySelectorAll("td[contenteditable]")].forEach((cell,idx)=>{
      cell.onblur = async () => {
        const fields = ["goals","assists","points","series","sog","mvps"];
        const field = fields[idx-3];
        await updateDoc(doc(db,"players",p.id),{
          [field]: Number(cell.innerText)||0
        });
        loadPlayers();
      };
    });
  }
}

/**************** DELETE ******************/
window.deletePlayer = async (id) => {
  if(!isAdmin) return;
  if(confirm("Delete player?")){
    await deleteDoc(doc(db,"players",id));
    loadPlayers();
  }
};

/**************** LOGIN ******************/
document.getElementById("loginBtn").onclick = () => {
  const pw = prompt("Admin password:");
  if(pw === "admin123"){
    isAdmin = true;
    alert("Admin enabled");
    document.getElementById("addPlayerBtn").hidden = false;
    document.getElementById("resetSeasonBtn").hidden = false;
    renderTables();
  } else alert("Wrong password");
};

/**************** ADD PLAYER ******************/
document.getElementById("addPlayerBtn").onclick = async () => {
  const name = prompt("Player name:");
  const pos = prompt("skater or goalie?");
  if(!name || !pos) return;

  await addDoc(collection(db,"players"),{
    order: players.length + 1,
    name,
    position: pos.toLowerCase(),
    goals:0,assists:0,points:0,series:0,sog:0,mvps:0,
    saves: pos==="goalie"?0:"—"
  });
  loadPlayers();
};

/**************** RESET ******************/
document.getElementById("resetSeasonBtn").onclick = async () => {
  if(!confirm("Reset all stats?")) return;
  for(const p of players){
    await updateDoc(doc(db,"players",p.id),{
      goals:0,assists:0,points:0,series:0,sog:0,mvps:0,
      saves: p.position==="goalie"?0:"—"
    });
  }
  loadPlayers();
};

/**************** SORT ******************/
function handleSort(field, btnId){
  if(currentSort === field){
    sortDirection = sortDirection === "desc" ? "asc" : "desc";
  } else {
    currentSort = field;
    sortDirection = "desc";
  }

  document.querySelectorAll("button").forEach(b=>b.classList.remove("active"));
  document.getElementById(btnId).classList.add("active");

  sortSkatersBy(field, sortDirection);
}

document.getElementById("sortPointsBtn").onclick = () => handleSort("points","sortPointsBtn");
document.getElementById("sortGoalsBtn").onclick  = () => handleSort("goals","sortGoalsBtn");
document.getElementById("sortAssistsBtn").onclick= () => handleSort("assists","sortAssistsBtn");

async function sortSkatersBy(field, direction){

  players.forEach(p=>p[field]=Number(p[field])||0);

  const skaters = players.filter(p=>p.position==="skater");
  const goalies = players.filter(p=>p.position==="goalie");

  skaters.sort((a,b)=>
    direction==="desc" ? b[field]-a[field] : a[field]-b[field]
  );

  skaters.forEach((p,i)=>p.order=i+1);
  goalies.forEach((p,i)=>p.order=i+1);

  players=[...skaters,...goalies];
  renderTables();

  for(const p of players){
    await updateDoc(doc(db,"players",p.id),{order:p.order});
  }
}
