const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = './mydatabase.db';
const DATA_DIR = './';

let db = null;

async function initDatabase() {
    // 确保 data 目录存在
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const SQL = await initSqlJs();
    
    // 尝试加载现有数据库
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    createTables();
    saveDatabase();
    console.log('数据库初始化成功');
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

function createTables() {
    // 用户表
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'editor',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // 内容表
    db.run(`
        CREATE TABLE IF NOT EXISTS contents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            key TEXT UNIQUE NOT NULL,
            content TEXT,
            description TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 访问统计表
    db.run(`
        CREATE TABLE IF NOT EXISTS analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            page_views INTEGER DEFAULT 0,
            visitors INTEGER DEFAULT 0,
            UNIQUE(date)
        )
    `);

    // 系统设置表
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    // 联系表单表
    db.run(`
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'pending'
        )
    `);

    // 报名申请表
    db.run(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 作品表
    db.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            type TEXT,
            description TEXT,
            coverUrl TEXT,
            videoUrl TEXT,
            sortOrder INTEGER DEFAULT 0,
            visible INTEGER DEFAULT 1,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 初始化默认管理员账户
    const hashedPassword = hashPassword('admin123');
    const existingAdmin = db.exec("SELECT id FROM users WHERE username = 'admin'");
    if (existingAdmin.length === 0 || existingAdmin[0].values.length === 0) {
        db.run(`
            INSERT INTO users (username, password, email, role)
            VALUES ('admin', ?, 'admin@406lab.com', 'admin')
        `, [hashedPassword]);
    }

    // 初始化默认内容
    const defaultContents = [
        { title: '首页内容', key: 'homepage', description: '406实训室首页展示内容' },
        { title: '实训项目', key: 'projects', description: '展示实训室提供的项目课程' },
        { title: '师资团队', key: 'team', description: '实训室教师团队介绍' }
    ];

    defaultContents.forEach(item => {
        const existing = db.exec(`SELECT id FROM contents WHERE key = '${item.key}'`);
        if (existing.length === 0 || existing[0].values.length === 0) {
            db.run('INSERT INTO contents (title, key, description) VALUES (?, ?, ?)', 
                [item.title, item.key, item.description]);
        }
    });

    // 初始化默认设置
    const defaultSettings = [
        { key: 'site_name', value: '406实训室' },
        { key: 'site_description', value: '创新与实践平台' },
        { key: 'contact_email', value: 'lab406@example.com' },
        { key: 'maintenance_mode', value: 'false' }
    ];

    defaultSettings.forEach(item => {
        const existing = db.exec(`SELECT key FROM settings WHERE key = '${item.key}'`);
        if (existing.length === 0 || existing[0].values.length === 0) {
            db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [item.key, item.value]);
        }
    });

    saveDatabase();
}

// 简单密码哈希函数
function hashPassword(password) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

function getDatabase() {
    return db;
}

function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            db.run(sql, params);
            saveDatabase();
            resolve({ changes: db.getRowsModified() });
        } catch (err) {
            reject(err);
        }
    });
}

function getOne(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            if (stmt.step()) {
                const row = stmt.getAsObject();
                stmt.free();
                resolve(row);
            } else {
                stmt.free();
                resolve(null);
            }
        } catch (err) {
            reject(err);
        }
    });
}

function getAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        try {
            const stmt = db.prepare(sql);
            stmt.bind(params);
            const results = [];
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            stmt.free();
            resolve(results);
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    initDatabase,
    getDatabase,
    verifyPassword,
    hashPassword,
    runQuery,
    getOne,
    getAll,
    saveDatabase
};
