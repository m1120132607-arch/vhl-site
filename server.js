const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'vhl_database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Ошибка БД:", err.message);
    else console.log('База данных VHL успешно подключена!');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, logo TEXT DEFAULT '',
        w INTEGER DEFAULT 0, wo INTEGER DEFAULT 0, lo INTEGER DEFAULT 0, l INTEGER DEFAULT 0,
        gs INTEGER DEFAULT 0, ga INTEGER DEFAULT 0, pts INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT, tour INTEGER DEFAULT 1,
        home_team TEXT, away_team TEXT, home_score INTEGER DEFAULT NULL, away_score INTEGER DEFAULT NULL, 
        status TEXT DEFAULT 'Ожидание', date TEXT DEFAULT ''
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, team TEXT, 
        goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0, pts INTEGER DEFAULT 0
    )`);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) res.sendFile(path.join(__dirname, 'index.html'));
    });
});

app.get('/api/teams', (req, res) => {
    db.all("SELECT * FROM teams ORDER BY pts DESC, w DESC, (gs - ga) DESC", [], (err, rows) => res.json(rows || []));
});

app.post('/api/teams', (req, res) => {
    const { name, logo } = req.body;
    db.run(`INSERT INTO teams (name, logo) VALUES (?, ?)`, [name, logo || ''], function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

app.delete('/api/teams/:id', (req, res) => {
    db.run(`DELETE FROM teams WHERE id = ?`, req.params.id, () => res.json({ success: true }));
});

app.get('/api/matches', (req, res) => {
    db.all("SELECT * FROM matches ORDER BY tour ASC, id ASC", [], (err, rows) => res.json(rows || []));
});

app.post('/api/matches/score', (req, res) => {
    const { match_id, home_score, away_score, status } = req.body;
    const date = new Date().toLocaleDateString('ru-RU');
    db.get("SELECT * FROM matches WHERE id = ?", [match_id], (err, match) => {
        if (!match || match.status === 'FT' || match.status === 'OT') return res.status(400).json({ error: "Ошибка" });
        db.serialize(() => {
            db.run(`UPDATE matches SET home_score=?, away_score=?, status=?, date=? WHERE id=?`, [home_score, away_score, status, date, match_id]);
            let home_pts = 0, away_pts = 0, h_w = 0, h_wo = 0, h_lo = 0, h_l = 0, a_w = 0, a_wo = 0, a_lo = 0, a_l = 0;
            if (home_score > away_score) { if (status === 'FT') { home_pts = 2; h_w = 1; a_l = 1; } else { home_pts = 2; away_pts = 1; h_wo = 1; a_lo = 1; } } 
            else { if (status === 'FT') { away_pts = 2; a_w = 1; h_l = 1; } else { away_pts = 2; home_pts = 1; a_wo = 1; h_lo = 1; } }
            db.run(`UPDATE teams SET w=w+?, wo=wo+?, lo=lo+?, l=l+?, gs=gs+?, ga=ga+?, pts=pts+? WHERE name=?`, [h_w, h_wo, h_lo, h_l, home_score, away_score, home_pts, match.home_team]);
            db.run(`UPDATE teams SET w=w+?, wo=wo+?, lo=lo+?, l=l+?, gs=gs+?, ga=ga+?, pts=pts+? WHERE name=?`, [a_w, a_wo, a_lo, a_l, away_score, home_score, away_pts, match.away_team]);
        });
        res.json({ success: true });
    });
});

app.post('/api/matches/generate', (req, res) => {
    db.all("SELECT name FROM teams", [], (err, teams) => {
        if (!teams || teams.length < 2) return res.status(400).json({ error: "Мало команд" });
        let list = teams.map(t => t.name); if (list.length % 2 !== 0) list.push("ОТДЫХ");
        const numTeams = list.length, rounds = numTeams - 1, half = numTeams / 2;
        db.serialize(() => {
            db.run("DELETE FROM matches WHERE status='Ожидание'");
            for (let round = 0; round < rounds; round++) {
                for (let i = 0; i < half; i++) {
                    const home = list[i]; const away = list[numTeams - 1 - i];
                    if (home !== "ОТДЫХ" && away !== "ОТДЫХ") db.run(`INSERT INTO matches (tour, home_team, away_team, status) VALUES (?, ?, ?, 'Ожидание')`, [round + 1, home, away]);
                }
                list.splice(1, 0, list.pop());
            }
        });
        res.json({ success: true });
    });
});

app.get('/api/players', (req, res) => {
    db.all("SELECT * FROM players ORDER BY pts DESC, goals DESC", [], (err, rows) => res.json(rows || []));
});

app.post('/api/players', (req, res) => {
    const { name, team, goals, assists } = req.body;
    const pts = parseInt(goals) + parseInt(assists);
    db.run(`INSERT INTO players (name, team, goals, assists, pts) VALUES (?, ?, ?, ?, ?)`, [name, team, goals, assists, pts], () => res.json({ success: true }));
});

app.delete('/api/players/:id', (req, res) => {
    db.run(`DELETE FROM players WHERE id = ?`, req.params.id, () => res.json({ success: true }));
});

app.listen(PORT, () => console.log('Сервер запущен на порту ' + PORT));
