// Google Sheets API 연결 및 CSV 로드 기능 (v2 - CSV 파싱 로직 수정)
class SheetsAPI {
    constructor() {
        this.csvUrls = {
            monthlySales: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjy2slFJrAxxPO8WBmehXH4iJtcfxr-HUkvL-YXw-BIvmA1Z3kTa8DfdWVnwVl3r4jhjmHFUYIju3j/pub?output=csv',
            procurement: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSplrmlhekVgQLbcCpHLX8d2HBNAErwj-UknKUZVI5KCMen-kUCWXlRONPR6oc0Wj1zd6FP-EfRaFeU/pub?output=csv'
        };
        this.corsProxies = [
            'https://cors.bridged.cc/',
            'https://api.allorigins.win/raw?url='
        ];
    }

    getCacheKey(sheetType) {
        return `sheets-cache-${sheetType}`;
    }

    async loadCSVData(sheetType) {
        if (!this.csvUrls[sheetType]) {
            throw new Error(`유효하지 않은 시트 타입입니다: ${sheetType}`);
        }
        const cachedData = this.getCachedData(sheetType);
        if (cachedData) {
            console.log(`'${sheetType}' 시트의 캐시된 데이터 사용`);
            return cachedData;
        }
        console.log(`'${sheetType}' 시트의 신규 데이터 로드 시작...`);
        const url = this.csvUrls[sheetType];
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`직접 로드 실패: ${response.status}`);
            const csvText = await response.text();
            const data = this.parseCSV(csvText); // 수정된 함수 호출
            this.setCachedData(sheetType, data);
            console.log('직접 로드 성공');
            return data;
        } catch (error) {
            console.warn('직접 로드 실패, 프록시 시도:', error.message);
            for (const proxy of this.corsProxies) {
                try {
                    const proxyUrl = proxy + encodeURIComponent(url);
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error(`프록시 로드 실패: ${response.status}`);
                    const csvText = await response.text();
                    const data = this.parseCSV(csvText); // 수정된 함수 호출
                    this.setCachedData(sheetType, data);
                    console.log('프록시 로드 성공');
                    return data;
                } catch (proxyError) {
                    console.warn(`프록시 로드 실패 (${proxy}):`, proxyError.message);
                }
            }
        }
        throw new Error('모든 데이터 로드 방법이 실패했습니다.');
    }

    /**
     * [수정] CSV 파싱 로직을 강화하여 큰따옴표 안의 쉼표를 처리합니다.
     * @param {string} csvText - 구글 시트에서 받은 CSV 텍스트
     * @returns {object[]} - 파싱된 데이터 객체 배열
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        // 헤더(첫 줄)는 쉼표로만 분리해도 안전합니다.
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];
        
        // 정규식: 큰따옴표로 묶이지 않은 쉼표만 인식하여 분리
        const regex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;

            const values = lines[i].split(regex).map(v => {
                // 각 값의 앞뒤 공백과 큰따옴표를 제거하고, ""는 "로 변환
                return v.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
            });

            const item = {};
            headers.forEach((header, index) => {
                item[header] = values[index] || '';
            });
            data.push(item);
        }
        return data;
    }

    setCachedData(sheetType, data) {
        try {
            const cacheKey = this.getCacheKey(sheetType);
            localStorage.setItem(cacheKey, JSON.stringify(data));
            console.log(`'${sheetType}' 데이터 캐시 저장 완료`);
        } catch (error) {
            console.warn('캐시 저장 실패:', error.message);
        }
    }

    getCachedData(sheetType) {
        try {
            const cacheKey = this.getCacheKey(sheetType);
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.warn('캐시 로드 실패:', error);
            return null;
        }
    }

    async refreshCache(sheetType) {
        const cacheKey = this.getCacheKey(sheetType);
        localStorage.removeItem(cacheKey);
        console.log(`'${sheetType}' 캐시가 삭제되었습니다.`);
    }
}
window.sheetsAPI = new SheetsAPI();
