var ADMIN_PASS = "vhladmin2026";
document.addEventListener("DOMContentLoaded", function() { loadAllData(); setInterval(loadAllData, 15000); });

function loadAllData() {
    Promise.all([
        fetch("/api/teams").then(function(r) { return r.json(); }),
        fetch("/api/matches").then(function(r) { return r.json(); }),
        fetch("/api/players").then(function(r) { return r.json(); })
    ]).then(function(data) {
        var teams = data[0];
        var matches = data[1];
        var players = data[2];
        renderTables(teams); renderPublicMatches(matches); renderPlayers(players); renderAdminControls(teams, matches, players);
    }).catch(function(e) { console.error(e); });
}

function renderTables(teams) {
    var b = document.getElementById("table-main-body"); if(!b) return; b.innerHTML = ""; var idx = 1;
    teams.forEach(function(t) {
        var img = t.logo ? '<img src="' + t.logo + '" class="w-5 h-5 rounded object-cover">' : '<i class="fa-solid fa-shield-halved text-zinc-600 text-sm"></i>';
        var g = t.w + t.wo + t.lo + t.l;
        b.innerHTML += '<tr class="hover:bg-zinc-800/10"><td class="p-3 text-center font-mono text-zinc-500">' + (idx++) + '</td><td class="p-3 font-bold flex items-center gap-2">' + img + ' <span>' + t.name + '</span></td><td class="p-3 text-center font-mono">' + g + '</td><td class="p-3 text-center text-zinc-400 font-mono">' + t.w + '</td><td class="p-3 text-center text-zinc-500 font-mono">' + t.wo + '</td><td class="p-3 text-center text-zinc-500 font-mono">' + t.lo + '</td><td class="p-3 text-center text-zinc-400 font-mono">' + t.l + '</td><td class="p-3 text-center text-zinc-400 font-mono">' + t.gs + ":" + t.ga + '</td><td class="p-3 text-center font-black text-blue-400 font-mono">' + t.pts + '</td></tr>';
    });
}

function renderPublicMatches(matches) {
    var c = document.getElementById("public-matches-container"); if(!c) return; c.innerHTML = matches.length === 0 ? '<p class="text-zinc-500 text-xs">Расписание пусто.</p>' : "";
    matches.forEach(function(m) {
        var score = '<span class="text-xs text-zinc-600">VS</span>';
        if (m.home_score !== null) { score = '<span class="text-blue-500">' + m.home_score + '</span><span class="text-zinc-500">' + m.away_score + '</span>'; }
        c.innerHTML += '<div class="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex justify-between items-center text-xs font-bold"><div><p class="text-zinc-400">Тур ' + m.tour + '</p><p>' + m.home_team + ' - ' + m.away_team + '</p></div><div class="flex flex-col bg-zinc-950 px-2 py-1 rounded border border-zinc-800 font-mono text-center font-black min-w-[40px]">' + score + '</div></div>';
    });
}

function renderPlayers(players) {
    var b = document.getElementById("public-players-list"); if(!b) return; b.innerHTML = players.length === 0 ? '<tr><td colspan="6" class="p-3 text-center text-zinc-500 text-xs">Пусто.</td></tr>' : "";
    players.forEach(function(p, i) { b.innerHTML += '<tr class="hover:bg-zinc-800/10"><td class="p-3 text-center font-mono text-zinc-500">' + (i + 1) + '</td><td class="p-3 font-bold">' + p.name + '</td><td class="p-3 text-zinc-400">' + p.team + '</td><td class="p-3 text-center font-mono">' + p.goals + '</td><td class="p-3 text-center font-mono">' + p.assists + '</td><td class="p-3 text-center font-black text-blue-400 font-mono">' + p.pts + '</td></tr>'; });
}

function renderAdminControls(teams, matches, players) {
    var pt = document.getElementById("player-team"); var ms = document.getElementById("admin-match-select"); var tl = document.getElementById("admin-teams-list"); var pl = document.getElementById("admin-players-list");
    if (!pt || !ms || !tl || !pl) return; pt.innerHTML = ""; ms.innerHTML = "<option value=''>Выберите матч</option>"; tl.innerHTML = ""; pl.innerHTML = "";
    teams.forEach(function(t) { pt.innerHTML += '<option value="' + t.name + '">' + t.name + '</option>'; tl.innerHTML += '<li class="flex justify-between items-center bg-zinc-950 p-1 rounded border border-zinc-800"><span>' + t.name + '</span><button onclick="deleteTeam(' + t.id + ')" class="text-red-500"><i class="fa-solid fa-trash"></i></button></li>'; });
    matches.forEach(function(m) { if (m.home_score === null) ms.innerHTML += '<option value="' + m.id + '">Тур ' + m.tour + ": " + m.home_team + " - " + m.away_team + '</option>'; });
    players.forEach(function(p) { pl.innerHTML += '<li class="flex justify-between items-center bg-zinc-950 p-1 rounded border border-zinc-800"><span>' + p.name + '</span><button onclick="deletePlayer(' + p.id + ')" class="text-red-500"><i class="fa-solid fa-trash"></i></button></li>'; });
}

async function addTeam() {
    var n = document.getElementById("team-name").value.trim(); var l = document.getElementById("team-logo").value.trim(); if(!n) return alert("Имя!");
    await fetch("/api/teams", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: n, logo: l}) });
    document.getElementById("team-name").value = ""; document.getElementById("team-logo").value = ""; loadAllData();
}

async function generateSchedule() { if(!confirm("Создать?")) return; await fetch("/api/matches/generate", { method: "POST" }); loadAllData(); alert("Готово!"); }

async function saveMatchScore() {
    var id = document.getElementById("admin-match-select").value; var h = parseInt(document.getElementById("admin-score-home").value); var a = parseInt(document.getElementById("admin-score-away").value); var s = document.getElementById("admin-match-status").value; if(!id) return alert("Поля!");
    await fetch("/api/matches/score", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({match_id: id, home_score: h, away_score: a, status: s}) });
    document.getElementById("admin-score-home").value = ""; document.getElementById("admin-score-away").value = ""; loadAllData();
}

async function addPlayer() {
    var n = document.getElementById("player-name").value.trim(); var t = document.getElementById("player-team").value; var g = parseInt(document.getElementById("player-goals").value) || 0; var a = parseInt(document.getElementById("player-assists").value) || 0; if(!n) return alert("Игрок!");
    await fetch("/api/players", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: n, team: t, goals: g, assists: a}) });
    document.getElementById("player-name").value = ""; document.getElementById("player-goals").value = ""; document.getElementById("player-assists").value = ""; loadAllData();
}

async function deleteTeam(id) { if(confirm("Удалить?")) { await fetch("/api/teams/" + id, {method: "DELETE"}); loadAllData(); } }
async function deletePlayer(id) { if(confirm("Удалить?")) { await fetch("/api/players/" + id, {method: "DELETE"}); loadAllData(); } }
function promptAdmin() { if(prompt("Пароль:") === ADMIN_PASS) { document.getElementById("view-public").classList.remove("active"); document.getElementById("view-admin").classList.add("active"); } }
function exitAdmin() { document.getElementById("view-admin").classList.remove("active"); document.getElementById("view-public").classList.add("active"); }
function switchTab(t) { document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); }); document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("bg-blue-600","text-white","font-semibold"); b.classList.add("text-zinc-400"); }); document.getElementById("tab-"+t).classList.add("active"); var a = document.getElementById("btn-"+t); a.classList.remove("text-zinc-400"); a.classList.add("bg-blue-600","text-white","font-semibold"); }
