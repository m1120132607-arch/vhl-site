const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbPath = path.join(__dirname, 'vhl_database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(err.message);
    else console.log('БД успешно подключена по пути:', dbPath);
});

// Создание таблиц
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        conference TEXT,
        w INTEGER DEFAULT 0,
        wo INTEGER DEFAULT 0,
        lo INTEGER DEFAULT 0,
        l INTEGER DEFAULT 0,
        gs INTEGER DEFAULT 0,
        ga INTEGER DEFAULT 0,
        pts INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        home_team TEXT,
        away_team TEXT,
        home_score INTEGER,
        away_score INTEGER,
        status TEXT,
        date TEXT
    )`);
});

// Получить команды
app.get('/api/teams', (req, res) => {
    db.all("SELECT * FROM teams ORDER BY pts DESC, w DESC, (gs - ga) DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Добавить команду
app.post('/api/teams', (req, res) => {
    const { name, conference } = req.body;
    if (!name || !conference) return res.status(400).json({ error: 'Заполните все поля' });
    db.run(`INSERT INTO teams (name, conference) VALUES (?, ?)`, [name, conference], function(err) {
        if (err) return res.status(400).json({ error: 'Команда уже существует' });
        res.json({ id: this.lastID });
    });
});

// Удалить команду
app.delete('/api/teams/:id', (req, res) => {
    db.run(`DELETE FROM teams WHERE id = ?`, req.params.id, (err) => {
        res.json({ success: true });
    });
});

// Получить матчи
app.get('/api/matches', (req, res) => {
    db.all("SELECT * FROM matches ORDER BY id DESC", [], (err, rows) => {
        res.json(rows);
    });
});

// Добавить матч
app.post('/api/matches', (req, res) => {
    const { home_team, away_team, home_score, away_score, status } = req.body;
    const date = new Date().toLocaleDateString('ru-RU');

    db.serialize(() => {
        db.run(`INSERT INTO matches (home_team, away_team, home_score, away_score, status, date) VALUES (?, ?, ?, ?, ?, ?)`,
            [home_team, away_team, home_score, away_score, status, date]);

        if (status === 'FT' || status === 'OT') {
            let home_pts = 0, away_pts = 0;
            let h_w = 0, h_wo = 0, h_lo = 0, h_l = 0;
            let a_w = 0, a_wo = 0, a_lo = 0, a_l = 0;

            if (home_score > away_score) {
                if (status === 'FT') { home_pts = 2; h_w = 1; a_l = 1; }
                else { home_pts = 2; away_pts = 1; h_wo = 1; a_lo = 1; }
            } else {
                if (status === 'FT') { away_pts = 2; a_w = 1; h_l = 1; }
                else { away_pts = 2; home_pts = 1; a_wo = 1; h_lo = 1; }
            }

            db.run(`UPDATE teams SET w=w+?, wo=wo+?, lo=lo+?, l=l+?, gs=gs+?, ga=ga+?, pts=pts+? WHERE name=?`, 
                [h_w, h_wo, h_lo, h_l, home_score, away_score, home_pts, home_team]);
            db.run(`UPDATE teams SET w=w+?, wo=wo+?, lo=lo+?, l=l+?, gs=gs+?, ga=ga+?, pts=pts+? WHERE name=?`, 
                [a_w, a_wo, a_lo, a_l, away_score, home_score, away_pts, away_team]);
        }
    });
    res.json({ success: true });
});

app.listen(PORT, () => console.log('Сервер VHL готов!'));
