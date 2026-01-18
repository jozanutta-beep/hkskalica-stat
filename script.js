import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  addDoc, updateDoc, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/******** FIREBASE ********/
const app = initializeApp({
  apiKey: "AIzaSyBKR2unkdTKNus5FiqCmox8KQ29HZeEgP0",
  authDomain: "hkskalica-fe24b.firebaseapp.com",
  projectId: "hkskalica-fe24b"
});
const db = getFirestore(app);

/******** GLOBALS ********/
let players = [];
let isAdmin = false;
let currentSort = null;
let sortDir = "desc";

const skatersBody = document.getElementById("skatersBody");
const goaliesBody = document.getElementById("goaliesBody");

/******** LOAD ********/
async function loadPlayers() {
  players = [];
  const snap = await getDocs(collection(db, "players"));
  snap.forEach(d => players.push({ id: d.id, ...d.data() }));
  render();
}
loadPlayers();

/******** RENDER ********/
function render() {
  skatersBody.innerHTML = "";
  goaliesBody.innerHTML = "";

  const skaters = players
    .filter(p => p.position === "skater")
    .sort((a,b) => (a.orderSkater ?? 9999) - (b.orderSkater ?? 9999));

  const goalies = players
    .filter(p => p.position === "goalie")
    .sort((a,b) => (a.orderGoalie ?? 9999) - (b.orderGoalie ?? 9999));

  skaters.forEach((p,i)=>renderSkater(p,i));
  goalies.forEach((p,i)=>renderGoalie(p,i));
}

function renderSkater(p,i){
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${i+1}</td>
    <td>${p.name}</td>
    <td contenteditable="${isAdmin}" data-field="goals">${p.goals ?? ""}</td>
    <td contenteditable="${isAdmin}" data-field="assists">${p.assists ?? ""}</td>
    <td contenteditable="${isAdmin}" data-field="points">${p.points ?? ""}</td>
    <td contenteditable="${isAdmin}" data-field="sog">${p.sog ?? ""}</td>
    <td contenteditable="${isAdmin}" data-field="mvps">${p.mvps ?? ""}</td>
    <td><button onclick="deletePlayer('${p.id}')">❌</button></td>
  `;
  skatersBody.appendChild(tr);
  if(isAdmin) attachEditors(tr,p.id);
}

function renderGoalie(p,i){
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${i+1}</td>
    <td>${p.name}</td>
    <td contenteditable="${isAdmin}" data-field="assists">${p.assists ?? ""}</td>
    <td contenteditable="${isAdmin}" data-field="points">${p.points ?? ""}</td>
    <td contenteditable="${isAdmin}" data-field="mvps">${p.mvps ?? ""}</td>
    <td contenteditable="${isAdmin}" data-field="saves">${p.saves ?? ""}</td>
    <td><button onclick="deletePlayer('${p.id}')">❌</button></td>
  `;
  goaliesBody.appendChild(tr);
  if(isAdmin) attachEditors(tr,p.id);
}

/******** SAFE EDITING ********/
function attachEditors(tr,id){
  tr.querySelectorAll("[data-field]").forEach(cell=>{
    cell.dataset.original = cell.innerText.trim();

cell.onblur = async () => {
  const field = cell.dataset.field;
  const newValue = cell.innerText.trim();
  const oldValue = cell.dataset.original;

  // ✅ NOTHING CHANGED → DO NOTHING
  if (newValue === oldValue) return;

  // ✅ EMPTY → DO NOTHING
  if (newValue === "") return;

  const num = Number(newValue);
  if (Number.isNaN(num)) return;

  await updateDoc(doc(db, "players", id), {
    [field]: num
  });

  cell.dataset.original = newValue;
};
    
/******** SORT (ORDER ONLY) ********/
async function sortSkaters(field){
  const skaters = players.filter(p=>p.position==="skater");

  skaters.sort((a,b)=>{
    const av = Number(a[field]) || 0;
    const bv = Number(b[field]) || 0;
    return sortDir==="desc" ? bv-av : av-bv;
  });

  for(let i=0;i<skaters.length;i++){
    await updateDoc(doc(db,"players",skaters[i].id),{
      orderSkater: i+1
    });
  }

  loadPlayers();
}

function handleSort(field){
  sortDir =
    currentSort === field && sortDir === "desc" ? "asc" : "desc";
  currentSort = field;
  sortSkaters(field);
}

document.getElementById("sortPointsBtn").onclick  = ()=>handleSort("points");
document.getElementById("sortGoalsBtn").onclick   = ()=>handleSort("goals");
document.getElementById("sortAssistsBtn").onclick = ()=>handleSort("assists");

/******** ADD ********/
document.getElementById("addPlayerBtn").onclick = async ()=>{
  const name = prompt("Name?");
  const pos = prompt("skater or goalie?");
  if(!name || !pos) return;

  await addDoc(collection(db,"players"),{
    name,
    position: pos,
    goals:0, assists:0, points:0,
    series:0, sog:0, mvps:0, saves:0,
    orderSkater: pos==="skater"? Date.now(): null,
    orderGoalie: pos==="goalie"? Date.now(): null
  });

  loadPlayers();
};

/******** DELETE ********/
window.deletePlayer = async id=>{
  if(!isAdmin) return;
  if(confirm("Delete?")){
    await deleteDoc(doc(db,"players",id));
    loadPlayers();
  }
};

/******** LOGIN ********/
document.getElementById("loginBtn").onclick = ()=>{
  if(prompt("Admin password")==="admin123"){
    isAdmin = true;
    document.getElementById("addPlayerBtn").hidden=false;
    document.getElementById("resetSeasonBtn").hidden=false;
    render();
  }
};

