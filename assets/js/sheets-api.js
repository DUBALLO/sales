// Google Sheets API 연결 및 CSV 로드 기능

/**
 * Google Sheets CSV 데이터 로드
 * CORS 문제 해결을 위한 다양한 방법 제공
 */
class SheetsAPI {
    constructor() {
        // 실제 구글시트 CSV URL
        this.csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjy2slFJrAxxPO8WBmehXH4iJtcfxr-HUkvL-YXw-BIvmA1Z3kTa8DfdWVnwVl3r4jhjmHFUYIju3j/pub?output=csv';
        
        // 백업 방법들
        this.corsProxies = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://corsproxy.io/?'
        ];
    }

    /**
     * CSV 데이터 로드 (메인 메서드)
     */
    async loadCSVData() {
        console.log('CSV 데이터 로드 시작...');
        
        // 방법 1: 직접 로드 시도
        try {
            const data = await this.directLoad();
            if (data && data.length > 0) {
                console.log('직접 로드 성공');
                return data;
            }
        } catch (error) {
            console.warn('직접 로드 실패:', error.message);
        }

        // 방법 2: CORS 프록시 사용
        for (const proxy of this.corsProxies) {
            try {
                console.log(`CORS 프록시 시도: ${proxy}`);
                const data = await this.proxyLoad(proxy);
                if (data && data.length > 0) {
                    console.log('프록시 로드 성공');
                    return data;
                }
            } catch (error) {
                console.warn(`프록시 로드 실패 (${proxy}):`, error.message);
                continue;
            }
        }

        // 방법 3: 캐시된 데이터 사용
        try {
            const cachedData = this.getCachedData();
            if (cachedData && cachedData.length > 0) {
                console.log('캐시된 데이터 사용');
                return cachedData;
            }
        } catch (error) {
            console.warn('캐시 데이터 로드 실패:', error.message);
        }

        throw new Error('모든 데이터 로드 방법이 실패했습니다.');
    }

    /**
     * 직접 로드 시도
     */
    async directLoad() {
        const response = await fetch(this.csvUrl, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'text/csv,application/csv',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        return this.parseCSV(csvText);
    }

    /**
     * CORS 프록시를 통한 로드
     */
    async proxyLoad(proxyUrl) {
        const url = proxyUrl + encodeURIComponent(this.csvUrl);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/csv,application/csv',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvText = await response.text();
        const data = this.parseCSV(csvText);
        
        // 성공시 캐시에 저장
        this.setCachedData(data);
        
        return data;
    }

    /**
     * CSV 텍스트 파싱
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error('CSV 데이터가 비어있습니다.');
        }

        // 헤더 처리
        const headers = this.parseCSVLine(lines[0]);
        console.log('CSV 헤더:', headers);

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseCSVLine(line);
            const item = {};
            
            headers.forEach((header, index) => {
                item[header] = values[index] || '';
            });

            // 빈 행 건너뛰기
            if (Object.values(item).every(val => !val || val.trim() === '')) {
                continue;
            }

            data.push(item);
        }

        console.log(`${data.length}개의 데이터 파싱 완료`);
        return data;
    }

    /**
     * CSV 라인 파싱 (따옴표 처리 포함)
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // 이스케이프된 따옴표
                    current += '"';
                    i++;
                } else {
                    // 따옴표 시작/끝
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // 컬럼 구분자
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    /**
     * 데이터를 캐시에 저장
     */
    setCachedData(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                url: this.csvUrl
            };
            localStorage.setItem('sheets-cache', JSON.stringify(cacheData));
            console.log('데이터 캐시 저장 완료');
        } catch (error) {
            console.warn('캐시 저장 실패:', error);
        }
    }

    /**
     * 캐시된 데이터 가져오기
     */
    getCachedData() {
        try {
            const cached = localStorage.getItem('sheets-cache');
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;
            
            // 1시간 이내의 캐시만 사용
            if (age < 3600000 && cacheData.url === this.csvUrl) {
                console.log('캐시된 데이터 발견 (나이: ' + Math.round(age / 60000) + '분)');
                return cacheData.data;
            } else {
                // 오래된 캐시 삭제
                localStorage.removeItem('sheets-cache');
                return null;
            }
        } catch (error) {
            console.warn('캐시 로드 실패:', error);
            return null;
        }
    }

    /**
     * 캐시 강제 새로고침
     */
    async refreshCache() {
        localStorage.removeItem('sheets-cache');
        return await this.loadCSVData();
    }

    /**
     * 연결 상태 테스트
     */
    async testConnection() {
        try {
            const response = await fetch(this.csvUrl, { 
                method: 'HEAD',
                mode: 'no-cors'
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}

// 전역 인스턴스 생성
window.sheetsAPI = new SheetsAPI();

// 전역 함수로 내보내기 (기존 코드 호환성)
window.loadGoogleSheetsData = () => window.sheetsAPI.loadCSVData();
window.refreshSheetsCache = () => window.sheetsAPI.refreshCache();
window.testSheetsConnection = () => window.sheetsAPI.testConnection();
