// Google Sheets API 연결 및 CSV 로드 기능 (v3 - 다중 시트 통합)

class SheetsAPI {
    constructor() {
        this.csvUrls = {
            // [기존] 보행매트
            procurement: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSplrmlhekVgQLbcCpHLX8d2HBNAErwj-UknKUZVI5KCMen-kUCWXlRONPR6oc0Wj1zd6FP-EfRaFeU/pub?output=csv',
            // [추가] 논슬립
            nonSlip: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQBfSqfw_9hUtZddet8YWQTRZxiQlo9jIPWZLs1wKTlpv9mb5pGfmrf75vbOy63u4eHvzlrI_S3TLmc/pub?output=csv',
            // [추가] 식생매트
            vegetationMat: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_JIdgWP0WcM1Eb5gw29tmBymlk_KicHDmVyZAAnHrViIKGlLLZzpx950H1vI7rFpc0K_0nFmO8BT1/pub?output=csv',
            // 월별 매출 데이터는 그대로 유지
            monthlySales: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjy2slFJrAxxPO8WBmehXH4iJtcfxr-HUkvL-YXw-BIvmA1Z3kTa8DfdWVnwVl3r4jhjmHFUYIju3j/pub?output=csv'
        };
        this.currentUrl = '';
        this.corsProxies = [
            'https://cors.bridged.cc/',
            'https://api.allorigins.win/raw?url='
        ];
    }

    // [신규] 모든 조달 데이터를 병렬로 불러와 하나로 합치는 함수
    async loadAllProcurementData() {
        console.log('모든 조달 데이터(보행, 식생, 논슬립) 로드 시작...');
        
        const dataSources = ['procurement', 'vegetationMat', 'nonSlip'];
        
        try {
            const promises = dataSources.map(source => this.loadCSVData(source));
            const results = await Promise.all(promises);
            
            // 불러온 모든 데이터를 하나의 배열로 합칩니다.
            const combinedData = results.flat(); 
            
            console.log(`총 ${combinedData.length}개의 조달 데이터 통합 완료.`);
            return combinedData;
        } catch (error) {
            console.error('하나 이상의 조달 데이터 로드에 실패했습니다:', error);
            throw new Error('모든 조달 데이터를 불러오는 데 실패했습니다.');
        }
    }
    
    async loadCSVData(sheetType) {
        // ... (이하 기존 loadCSVData, directLoad, proxyLoad, parseCSV 등 함수는 변경 없음) ...
        if (!this.csvUrls[sheetType]) {
            throw new Error(`유효하지 않은 시트 타입입니다: ${sheetType}`);
        }
        this.currentUrl = this.csvUrls[sheetType];
        
        console.log(`'${sheetType}' 시트의 CSV 데이터 로드 시작...`);

        try {
            const data = await this.directLoad();
            if (data && data.length > 0) {
                this.setCachedData(sheetType, data);
                return data;
            }
        } catch (error) {
            console.warn(`'${sheetType}' 직접 로드 실패:`, error.message);
        }

        for (const proxy of this.corsProxies) {
            try {
                const data = await this.proxyLoad(proxy);
                if (data && data.length > 0) {
                    this.setCachedData(sheetType, data);
                    return data;
                }
            } catch (error) {
                console.warn(`'${sheetType}' 프록시 로드 실패 (${proxy}):`, error.message);
                continue;
            }
        }

        const cachedData = this.getCachedData(sheetType);
        if (cachedData) {
            return cachedData;
        }

        throw new Error(`'${sheetType}' 시트의 모든 데이터 로드 방법이 실패했습니다.`);
    }

    async directLoad() {
        const response = await fetch(this.currentUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        return this.parseCSV(csvText);
    }

    async proxyLoad(proxyUrl) {
        const url = proxyUrl + encodeURIComponent(this.currentUrl);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        return this.parseCSV(csvText);
    }
    
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                return obj;
            }, {});
        });
    }

    setCachedData(sheetType, data) {
        try {
            const cacheKey = `sheets-cache-${sheetType}`;
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
        } catch (e) {
            console.warn('캐시 저장 실패:', e);
        }
    }

    getCachedData(sheetType) {
        const cacheKey = `sheets-cache-${sheetType}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < 3600000) { // 1시간 캐시
                return data;
            }
        }
        return null;
    }
}

window.sheetsAPI = new SheetsAPI();
