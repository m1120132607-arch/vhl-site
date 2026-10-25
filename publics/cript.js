var ADMIN_PASS = "vhladmin2026";
document.addEventListener("DOMContentLoaded", function() { loadAllData(); setInterval(loadAllData, 15000); });

async function loadAllData() {
    try {
        var tRes = await fetch("/api/teams"); var teams = await tRes.json();
        var mRes = await fetch("/api/matches"); var matches = await mRes.json();
        var pRes = await fetch("/api/players"); var players = await pRes.json();
        renderTables(teams); renderPublicMatches(matches); renderPlayers(players); renderAdminControls(teams, matches, players);
    } catch(e) { console.error(e); }
}

function renderTables(teams) {
    var westBody = document.getElementById("table-west"); var eastBody = document.getElementById("table-east");
    if(!westBody || !eastBody) return;
    westBody.innerHTML = ""; eastBody.innerHTML = ""; var westIdx = 1; var eastIdx = 1;
    teams.forEach(function(team) {
        var img = team.logo ? '<img src="' + team.logo + '" class="w-5 h-5 rounded object-cover">' : '<i class="fa-solid fa-shield-halved text-zinc-600 text-sm"></i>';
        var totalGames = team.w + team.wo + team.lo + team.l; var colorClass = team.conference === "Запад" ? "text-blue-400" : "text-red-400";
        var rowHtml = '<tr class="hover:bg-zinc-800/10 transition-colors"><td class="p-3 text-center font-mono text-zinc-500">' + (team.conference === "Запад" ? westIdx++ : eastIdx++) + '</td><td class="p-3 font-bold flex items-center gap-2">' + img + ' <span>' + team.name + '</span></td><td class="p-3 text-center font-mono">' + totalGames + '</td><td class="p-3 text-center text-zinc-400 font-mono">' + team.w + '</td><td class="p-3 text-center text-zinc-500 font-mono">' + team.wo + '</td><td class="p-3 text-center text-zinc-500 font-mono">' + team.lo + '</td><td class="p-3 text-center text-zinc-400 font-mono">' + team.l + '</td><td class="p-3 text-center text-zinc-400 font-mono">' + team.gs + ":" + team.ga + '</td><td class="p-3 text-center font-black font-mono text-base ' + colorClass + '">' + team.pts + '</td></tr>';
        if (team.conference === "Запад") westBody.innerHTML += rowHtml; else eastBody.innerHTML += rowHtml;
    });
}

function renderPublicMatches(matches) {
    var container = document.getElementById("public-matches-container"); if(!container) return;
    container.innerHTML = matches.length === 0 ? '<p class="text-zinc-500 text-xs">Расписание еще не сгенерировано.</p>' : "";
    var currentTour = 0; var currentTourDiv = null;
    matches.forEach(function(match) {
        if (match.tour !== currentTour) {
            currentTour = match.tour; currentTourDiv = document.createElement("div"); currentTourDiv.className = "space-y-3";
            currentTourDiv.innerHTML = '<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 pb-1 font-mono">Тур ' + currentTour + '</h3><div class="grid gap-4 md:grid-cols-2"></div>';
            container.appendChild(currentTourDiv);
        }
        var grid = currentTourDiv.querySelector(".grid"); var isPlayed = match.home_score !== null;
        var scoreText = isPlayed ? '<span class="text-blue-500">' + match.home_score + '</span><span class="text-zinc-500">' + match.away_score + '</span>' : '<span class="text-xs font-normal text-zinc-600 tracking-wider">VS</span>';
        var p1Color = (isPlayed && match.home_score > match.away_score) ? "text-zinc-100" : "text-zinc-400"; var p2Color = (isPlayed && match.away_score > match.home_score) ? "text-zinc-100" : "text-zinc-400";
        grid.innerHTML += '<div class="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center"><div class="space-y-1 text-sm font-bold"><p class="' + p1Color + '">' + match.home_team + '</p><p class="' + p2Color + '">' + match.away_team + '</p></div><div class="flex flex-col bg-zinc-950 px-3 py-1.5 rounded border border-zinc-800 font-mono text-center font-black min-w-[50px]">' + scoreText + '</div></div>';
    });
}

function renderPlayers(players) {
    var tbody = document.getElementById("public-players-list"); if(!tbody) return;
    tbody.innerHTML = players.length === 0 ? '<tr><td colspan="6" class="p-4 text-center text-zinc-500 text-xs">Статистика пуста.</td></tr>' : "";
    players.forEach(function(player, index) {
        tbody.innerHTML += '<tr class="hover:bg-zinc-800/10"><td class="p-4 text-center font-mono font-bold text-zinc-500">' + (index + 1) + '</td><td class="p-4 font-bold text-zinc-200">' + player.name + '</td><td class="p-4 text-zinc-400">' + player.team + '</td><td class="p-4 text-center font-mono">' + player.goals + '</td><td class="p-4 text-center font-mono">' + player.assists + '</td><td class="p-4 text-center font-black text-blue-400 font-mono text-base">' + player.pts + '</td></tr>';
    });
}

function renderAdminControls(teams, matches, players) {
    var pTeam = document.getElementById("player-team"); var mSelect = document.getElementById("admin-match-select");
    var tList = document.getElementById("admin-teams-list"); var pList = document.getElementById("admin-players-list");
    if (!pTeam || !mSelect || !tList || !pList) return;
    pTeam.innerHTML = ""; mSelect.innerHTML = "<option value=''>Выберите матч из списка</option>"; tList.innerHTML = ""; pList.innerHTML = "";
    teams.forEach(function(t) {
        pTeam.innerHTML += '<option value="' + t.name + '">' + t.name + '</option>';
        tList.innerHTML += '<li class="flex justify-between items-center bg-zinc-950 p-1.5 rounded border border-zinc-800"><span>' + t.name + '</span><button onclick="deleteTeam(' + t.id + ')" class="text-red-500"><i class="fa-solid fa-trash"></i></button></li>';
    });
    matches.forEach(function(m) { if (m.home_score === null) mSelect.innerHTML += '<option value="' + m.id + '">Тур ' + m.tour + ": " + m.home_team + " vs " + m.away_team + "</option>"; });
    players.forEach(function(p) { pList.innerHTML += '<li class="flex justify-between items-center bg-zinc-950 p-1.5 rounded border border-zinc-800"><span>' + p.name + " (" + p.goals + "+" + p.assists + ')</span><button onclick="deletePlayer(' + p.id + ')" class="text-red-500"><i class="fa-solid fa-trash"></i></button></li>'; });
}

async function addTeam() {
    var name = document.getElementById("team-name").value.trim(); var logo = document.getElementById("team-logo").value.trim(); var conference = document.getElementById("team-conf").value; if(!name) return alert("Введите имя!");
    await fetch("/api/teams", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: name, logo: logo, conference: conference}) });
    document.getElementById("team-name").value = ""; document.getElementById("team-logo").value = ""; loadAllData();
}

async function generateSchedule() { if(!confirm("Уверены? Расписание заменится на новое!")) return; await fetch("/api/matches/generate", { method: "POST" }); loadAllData(); alert("Календарь построен!"); }

async function saveMatchScore() {
    var match_id = document.getElementById("admin-match-select").value; var home_score = parseInt(document.getElementById("admin-score-home").value); var away_score = parseInt(document.getElementById("admin-score-away").value); var status = document.getElementById("admin-match-status").value; if(!match_id || isNaN(home_score) || isNaN(away_score)) return alert("Заполните поля!");
    await fetch("/api/matches/score", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({match_id: match_id, home_score: home_score, away_score: away_score, status: status}) });
    document.getElementById("admin-score-home").value = ""; document.getElementById("admin-score-away").value = ""; loadAllData();
}

async function addPlayer() {
    var name = document.getElementById("player-name").value.trim(); var team = document.getElementById("player-team").value; var goals = parseInt(document.getElementById("player-goals").value) || 0; var assists = parseInt(document.getElementById("player-assists").value) || 0; if(!name) return alert("Укажите игрока!");
    await fetch("/api/players", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({name: name, team: team, goals: goals, assists: assists}) });
    document.getElementById("player-name").value = ""; document.getElementById("player-goals").value = ""; document.getElementById("player-assists").value = ""; loadAllData();
}

async function deleteTeam(id) { if(confirm("Удалить клуб?")) { await fetch("/api/teams/" + id, {method: "DELETE"}); loadAllData(); } }
async function deletePlayer(id) { if(confirm("Удалить игрока?")) { await fetch("/api/players/" + id, {method: "DELETE"}); loadAllData(); } }
function promptAdmin() { if(prompt("Пароль доступа:") === ADMIN_PASS) { document.getElementById("view-public").classList.remove("active"); document.getElementById("view-admin").classList.add("active"); } }
function exitAdmin() { document.getElementById("view-admin").classList.remove("active"); document.getElementById("view-public").classList.add("active"); }
function switchTab(t) { document.querySelectorAll(".tab-content").forEach(function(c) { c.classList.remove("active"); }); document.querySelectorAll(".tab-btn").forEach(function(b) { b.classList.remove("bg-blue-600","text-white","font-semibold"); b.classList.add("text-zinc-400"); }); document.getElementById("tab-"+t).classList.add("active"); var a = document.getElementById("btn-"+t); a.classList.remove("text-zinc-400"); a.classList.add("bg-blue-600","text-white","font-semibold"); }

