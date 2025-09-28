// Google Sheets API 연결 및 CSV 로드 기능 (최적화 버전)

/**
 * Google Sheets CSV 데이터 로드
 * CORS 문제 해결을 위한 최적화된 로직 제공
 */
class SheetsAPI {
    constructor() {
        this.csvUrls = {
            monthlySales: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjy2slFJrAxxPO8WBmehXH4iJtcfxr-HUkvL-YXw-BIvmA1Z3kTa8DfdWVnwVl3r4jhjmHFUYIju3j/pub?output=csv',
            procurement: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSplrmlhekVgQLbcCpHLX8d2HBNAErwj-UknKUZVI5KCMen-kUCWXlRONPR6oc0Wj1zd6FP-EfRaFeU/pub?output=csv'
        };
        this.currentUrl = '';

        // CORS 우회를 위한 안정적인 프록시
        this.corsProxies = [
            'https://cors.bridged.cc/',
            'https://api.allorigins.win/raw?url='
        ];
    }

    /**
     * CSV 데이터 로드 (메인 메서드)
     * 1단계: 직접 로드 시도
     * 2단계: CORS 프록시 사용 (실패 시)
     * 3단계: 캐시된 데이터 사용 (모두 실패 시)
     * @param {string} sheetType - 'monthlySales' 또는 'procurement'
     */
    async loadCSVData(sheetType) {
        if (!this.csvUrls[sheetType]) {
            throw new Error(`유효하지 않은 시트 타입입니다: ${sheetType}`);
        }
        this.currentUrl = this.csvUrls[sheetType];
        
        console.log(`'${sheetType}' 시트의 CSV 데이터 로드 시작...`);

        // 1단계: 직접 로드 시도
        try {
            const data = await this.directLoad();
            if (data && data.length > 0) {
                console.log('직접 로드 성공');
                this.setCachedData(data);
                return data;
            }
        } catch (error) {
            console.warn('직접 로드 실패:', error.message);
        }

        // 2단계: CORS 프록시 사용
        for (const proxy of this.corsProxies) {
            try {
                console.log(`CORS 프록시 시도: ${proxy}`);
                const data = await this.proxyLoad(proxy);
                if (data && data.length > 0) {
                    console.log('프록시 로드 성공');
                    this.setCachedData(data);
                    return data;
                }
            } catch (error) {
                console.warn(`프록시 로드 실패 (${proxy}):`, error.message);
                continue;
            }
        }

        // 3단계: 캐시된 데이터 사용
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
        const response = await fetch(this.currentUrl, {
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
        const url = proxyUrl + encodeURIComponent(this.currentUrl);
        
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

        const headers = this.parseCSVLine(lines[0]);
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            const item = {};
            headers.forEach((header, index) => {
                item[header.trim()] = values[index] ? values[index].trim() : '';
            });

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
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result.map(s => s.trim());
    }

    /**
     * 데이터를 캐시에 저장
     */
    setCachedData(data) {
        try {
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                url: this.currentUrl
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
            
            if (age < 3600000 && cacheData.url === this.currentUrl) {
                console.log('캐시된 데이터 발견 (나이: ' + Math.round(age / 60000) + '분)');
                return cacheData.data;
            } else {
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
        return await this.loadCSVData('monthlySales');
    }

    /**
     * 연결 상태 테스트
     */
    async testConnection() {
        try {
            const response = await fetch(this.csvUrls.monthlySales, { 
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

// 기존 코드 호환성 유지를 위한 헬퍼 함수
window.loadGoogleSheetsData = () => window.sheetsAPI.loadCSVData('monthlySales');
window.loadProcurementData = () => window.sheetsAPI.loadCSVData('procurement');
window.refreshSheetsCache = () => window.sheetsAPI.refreshCache();
window.testSheetsConnection = () => window.sheetsAPI.testConnection();
