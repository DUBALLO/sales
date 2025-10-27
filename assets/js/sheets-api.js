// Google Sheets API 연결 및 CSV 로드 기능 (v4 - 컬럼 매핑 강화)

class SheetsAPI {
    constructor() {
        this.csvUrls = {
            procurement: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSplrmlhekVgQLbcCpHLX8d2HBNAErwj-UknKUZVI5KCMen-kUCWXlRONPR6oc0Wj1zd6FP-EfRaFeU/pub?output=csv',
            nonSlip: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQBfSqfw_9hUtZddet8YWQTRZxiQlo9jIPWZLs1wKTlpv9mb5pGfmrf75vbOy63u4eHvzlrI_S3TLmc/pub?output=csv',
            vegetationMat: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_JIdgWP0WcM1Eb5gw29tmBymlk_KicHDmVyZAAnHrViIKGlLLZzpx950H1vI7rFpc0K_0nFmO8BT1/pub?output=csv',
            monthlySales: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjy2slFJrAxxPO8WBmehXH4iJtcfxr-HUkvL-YXw-BIvmA1Z3kTa8DfdWVnwVl3r4jhjmHFUYIju3j/pub?output=csv'
        };
        this.currentUrl = '';
        this.corsProxies = [
            'https://cors.bridged.cc/',
            'https://api.allorigins.win/raw?url='
        ];
    }

    async loadAllProcurementData() {
        console.log('모든 조달 데이터(보행, 식생, 논슬립) 로드 시작...');
        const dataSources = ['procurement', 'vegetationMat', 'nonSlip'];
        
        try {
            const promises = dataSources.map(source => this.loadCSVData(source));
            const results = await Promise.all(promises);
            const combinedData = results.flat(); 
            console.log(`총 ${combinedData.length}개의 조달 데이터 통합 완료.`);
            return combinedData;
        } catch (error) {
            console.error('하나 이상의 조달 데이터 로드에 실패했습니다:', error);
            throw new Error('모든 조달 데이터를 불러오는 데 실패했습니다.');
        }
    }
    
    async loadCSVData(sheetType) {
        if (!this.csvUrls[sheetType]) {
            throw new Error(`유효하지 않은 시트 타입입니다: ${sheetType}`);
        }
        this.currentUrl = this.csvUrls[sheetType];
        console.log(`'${sheetType}' 시트의 CSV 데이터 로드 시작...`);

        try {
            const data = await this.directLoad();
            if (data && data.length > 0) return data;
        } catch (error) {
            console.warn(`'${sheetType}' 직접 로드 실패:`, error.message);
        }

        for (const proxy of this.corsProxies) {
            try {
                const data = await this.proxyLoad(proxy);
                if (data && data.length > 0) return data;
            } catch (error) {
                console.warn(`'${sheetType}' 프록시 로드 실패 (${proxy}):`, error.message);
            }
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
    
    // ▼▼▼ [수정됨] 컬럼 순서가 달라도 정확히 매핑하는 로직으로 변경 ▼▼▼
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        // 1. 각 시트의 헤더(컬럼명)를 읽고, 공백을 제거합니다.
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        // 2. 데이터 라인을 순회하며, 헤더를 기준으로 객체를 생성합니다.
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const obj = {};
            // 3. headers 배열의 각 컬럼명을 키(key)로 사용하여 값을 할당합니다.
            // 이렇게 하면 컬럼 순서가 바뀌어도 `obj['업체']`는 항상 '업체' 컬럼의 값을 갖게 됩니다.
            headers.forEach((header, index) => {
                obj[header] = values[index];
            });
            return obj;
        });
    }
}

window.sheetsAPI = new SheetsAPI();
