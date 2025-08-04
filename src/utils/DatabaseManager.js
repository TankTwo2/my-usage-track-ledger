const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../../data/usage_tracker.db');

        // 데이터 디렉토리 생성
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('데이터베이스 연결 오류:', err);
                    reject(err);
                } else {
                    console.log('데이터베이스 연결 성공');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async createTables() {
        const tables = [
            // 앱 사용량 테이블
            `CREATE TABLE IF NOT EXISTS app_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                app_name TEXT NOT NULL,
                usage_count INTEGER DEFAULT 0,
                usage_date DATE DEFAULT CURRENT_DATE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // 일일 통계 테이블
            `CREATE TABLE IF NOT EXISTS daily_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE UNIQUE NOT NULL,
                total_apps INTEGER DEFAULT 0,
                total_usage_time INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // 설정 테이블
            `CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        console.log('데이터베이스 테이블 생성 완료');
    }

    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async saveAppUsage(appName, usageCount) {
        // 오늘 날짜의 앱 사용량 확인
        const today = new Date().toISOString().split('T')[0];

        const existing = await this.get('SELECT * FROM app_usage WHERE app_name = ? AND usage_date = ?', [
            appName,
            today,
        ]);

        if (existing) {
            // 기존 데이터 업데이트
            await this.run(
                'UPDATE app_usage SET usage_count = usage_count + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [usageCount, existing.id]
            );
        } else {
            // 새 데이터 삽입
            await this.run('INSERT INTO app_usage (app_name, usage_count, usage_date) VALUES (?, ?, ?)', [
                appName,
                usageCount,
                today,
            ]);
        }
    }

    async getAppUsage(period = 'today') {
        let dateFilter = '';
        const params = [];

        switch (period) {
            case 'today':
                dateFilter = 'WHERE usage_date = DATE("now")';
                break;
            case 'week':
                dateFilter = 'WHERE usage_date >= DATE("now", "-7 days")';
                break;
            case 'month':
                dateFilter = 'WHERE usage_date >= DATE("now", "-30 days")';
                break;
            default:
                dateFilter = 'WHERE usage_date = DATE("now")';
        }

        const sql = `
            SELECT 
                app_name,
                SUM(usage_count) as total_usage,
                COUNT(*) as days_used
            FROM app_usage 
            ${dateFilter}
            GROUP BY app_name 
            ORDER BY total_usage DESC 
            LIMIT 20
        `;

        return await this.all(sql, params);
    }

    async getDailyStats(period = 'today') {
        let dateFilter = '';
        const params = [];

        switch (period) {
            case 'today':
                dateFilter = 'WHERE usage_date = DATE("now")';
                break;
            case 'week':
                dateFilter = 'WHERE usage_date >= DATE("now", "-7 days")';
                break;
            case 'month':
                dateFilter = 'WHERE usage_date >= DATE("now", "-30 days")';
                break;
            default:
                dateFilter = 'WHERE usage_date = DATE("now")';
        }

        const sql = `
            SELECT 
                COUNT(DISTINCT app_name) as total_apps,
                SUM(usage_count) as total_usage_time
            FROM app_usage 
            ${dateFilter}
        `;

        return await this.get(sql, params);
    }

    async getSetting(key) {
        const result = await this.get('SELECT value FROM settings WHERE key = ?', [key]);
        return result ? result.value : null;
    }

    async setSetting(key, value) {
        const existing = await this.get('SELECT id FROM settings WHERE key = ?', [key]);

        if (existing) {
            await this.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [value, key]);
        } else {
            await this.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
        }
    }

    async close() {
        return new Promise((resolve) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('데이터베이스 닫기 오류:', err);
                    } else {
                        console.log('데이터베이스 연결 종료');
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

export default DatabaseManager;
