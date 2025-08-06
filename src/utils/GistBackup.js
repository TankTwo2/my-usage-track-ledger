"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GistBackup = void 0;
class GistBackup {
    constructor(githubToken, gistId = null) {
        this.apiBase = 'https://api.github.com';
        this.githubToken = githubToken;
        this.gistId = gistId;
    }
    // 새로운 Gist 생성
    async createGist(data) {
        try {
            const response = await fetch(`${this.apiBase}/gists`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    description: 'Usage Tracker Data Backup',
                    public: false,
                    files: {
                        'usage-data.json': {
                            content: JSON.stringify(data, null, 2)
                        }
                    }
                })
            });
            if (!response.ok) {
                throw new Error(`GitHub API Error: ${response.status}`);
            }
            const gist = await response.json();
            this.gistId = gist.id;
            console.log('✅ 새로운 Gist 생성 완료:', this.gistId);
            return gist;
        }
        catch (error) {
            console.error('❌ Gist 생성 실패:', error);
            throw error;
        }
    }
    // 기존 Gist 업데이트
    async updateGist(data) {
        if (!this.gistId) {
            throw new Error('Gist ID가 설정되지 않음');
        }
        try {
            const response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    files: {
                        'usage-data.json': {
                            content: JSON.stringify(data, null, 2)
                        }
                    }
                })
            });
            if (!response.ok) {
                throw new Error(`GitHub API Error: ${response.status}`);
            }
            const gist = await response.json();
            console.log('✅ Gist 업데이트 완료:', this.gistId);
            return gist;
        }
        catch (error) {
            console.error('❌ Gist 업데이트 실패:', error);
            throw error;
        }
    }
    // Gist에서 데이터 로드
    async loadFromGist() {
        if (!this.gistId) {
            throw new Error('Gist ID가 설정되지 않음');
        }
        try {
            const response = await fetch(`${this.apiBase}/gists/${this.gistId}`, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                }
            });
            if (!response.ok) {
                throw new Error(`GitHub API Error: ${response.status}`);
            }
            const gist = await response.json();
            const fileContent = gist.files['usage-data.json'].content;
            const data = JSON.parse(fileContent);
            console.log('✅ Gist에서 데이터 로드 완료');
            return data;
        }
        catch (error) {
            console.error('❌ Gist 데이터 로드 실패:', error);
            throw error;
        }
    }
    // 백업 실행 (생성 또는 업데이트)
    async backup(data) {
        try {
            if (this.gistId) {
                return await this.updateGist(data);
            }
            else {
                return await this.createGist(data);
            }
        }
        catch (error) {
            console.error('❌ 백업 실패:', error);
            throw error;
        }
    }
}
exports.GistBackup = GistBackup;
