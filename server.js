const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000; // Render автоматически выдает свой порт

app.use(express.json());

// Защищенный поиск папки public (проверяет все возможные варианты в облаке)
const publicPath = fs.existsSync(path.join(__dirname, 'public')) 
    ? path.join(__dirname, 'public') 
    : __dirname;

app.use(express.static(publicPath));

// База данных в файле для постоянного сохранения на Render
const dbPath = path.join(__dirname, 'vhl_database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(err.message);
    else console.log('БД подключена:', dbPath);
});

// Создание таблиц
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, conference TEXT,
        w INTEGER DEFAULT 0, wo INTEGER DEFAULT 0, lo INTEGER DEFAULT 0, l INTEGER DEFAULT 0,
        gs INTEGER DEFAULT 0, ga INTEGER DEFAULT 0, pts INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT, home_team TEXT, away_team TEXT,
        home_score INTEGER, away_score INTEGER, status TEXT, date TEXT
    )`);
});

// Принудительный и самый надежный поиск главного файла index.html
app.get('/', (req, res) => {
    const targetFile = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
        ? path.join(__dirname, 'public', 'index.html')
        : path.join(__dirname, 'index.html');
    res.sendFile(targetFile);
});

// API Лиги VHL
app.get('/api/teams', (req, res) => {
    db.all("SELECT * FROM teams ORDER BY pts DESC, w DESC, (gs - ga) DESC", [], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/teams', (req, res) => {
    const { name, conference } = req.body;
    db.run(`INSERT INTO teams (name, conference) VALUES (?, ?)`, [name, conference], function(err) {
        res.json({ id: this ? this.lastID : null });
    });
});

app.delete('/api/teams/:id', (req, res) => {
    db.run(`DELETE FROM teams WHERE id = ?`, req.params.id, () => res.json({ success: true }));
});

app.get('/api/matches', (req, res) => {
    db.all("SELECT * FROM matches ORDER BY id DESC", [], (err, rows) => res.json(rows || []));
});

app.post('/api/matches', (req, res) => {
    const { home_team, away_team, home_score, away_score, status } = req.body;
    const date = new Date().toLocaleDateString('ru-RU');
    db.serialize(() => {
        db.run(`INSERT INTO matches (home_team, away_team, home_score, away_score, status, date) VALUES (?, ?, ?, ?, ?, ?)`,
            [home_team, away_team, home_score, away_score, status, date]);
        if (status === 'FT' || status === 'OT') {
            let home_pts = 0, away_pts = 0;
            if (home_score > away_score) { home_pts = 2; if (status === 'OT') away_pts = 1; }
            else { away_pts = 2; if (status === 'OT') home_pts = 1; }
            db.run(`UPDATE teams SET gs=gs+?, ga=ga+?, pts=pts+? WHERE name=?`, [home_score, away_score, home_pts, home_team]);
            db.run(`UPDATE teams SET gs=gs+?, ga=ga+?, pts=pts+? WHERE name=?`, [away_score, home_score, away_pts, away_team]);
        }
    });
    res.json({ success: true });
});

// Подключаем модуль проверки файлов в самый верх кода скрытно
var fs = require('fs');

app.listen(PORT, () => console.log('Сервер запущен на порту ' + PORT));
