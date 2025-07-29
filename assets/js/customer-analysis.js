// 매출처별 집계 분석 JavaScript (고급 버전)
// assets/js/customer-analysis-advanced.js

// 전역 변수
let governmentData = []; // 관급 데이터 (조달데이터)
let privateSalesData = []; // 사급 데이터 (판매실적 데이터)
let customerData = [];
let regionData = [];
let typeData = [];
let privateCustomerData = [];

// 조달데이터 시트 URL들
const PROCUREMENT_URLS = {
    '보행매트': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSplrmlhekVgQLbcCpHLX8d2HBNAErwj-UknKUZVI5KCMen-kUCWXlRONPR6oc0Wj1zd6FP-EfRaFeU/pub?output=csv',
    '식생매트': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_JIdgWP0WcM1Eb5gw29tmBymlk_KicHDmVyZAAnHrViIKGlLLZzpx950H1vI7rFpc0K_0nFmO8BT1/pub?output=csv',
    '논슬립': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQBfSqfw_9hUtZddet8YWQTRZxiQlo9jIPWZLs1wKTlpv9mb5pGfmrf75vbOy63u4eHvzlrI_S3TLmc/pub?output=csv'
};

// 판매실적 데이터 URL (기존)
const SALES_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjy2slFJrAxxPO8WBmehXH4iJtcfxr-HUkvL-YXw-BIvmA1Z3kTa8DfdWVnwVl3r4jhjmHFUYIju3j/pub?output=csv';

// 안전한 요소 가져오기
function $(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`요소를 찾을 수 없습니다: ${id}`);
    }
    return element;
}

// 포맷팅 함수들
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

function formatNumber(number) {
    if (!number && number !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(number);
}

function formatDate(date) {
    if (!date || !(date instanceof Date)) return '-';
    return date.toLocaleDateString('ko-KR');
}

// 날짜 파싱 함수
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    let date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
            date = new Date(dateStr);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('/');
            date = new Date(year, month - 1, day);
        }
    }
    
    return isNaN(date.getTime()) ? null : date;
}

// CSV 데이터 로드 함수
async function loadCSVData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.warn(`CSV 로드 실패 (${url}):`, error.message);
        return [];
    }
}

// CSV 파싱 함수
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
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

    return data;
}

// CSV 라인 파싱
function parseCSVLine(line) {
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
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// 조달데이터 로드 함수
async function loadGovernmentData() {
    const selectedProduct = $('productType')?.value || '보행매트';
    
    if (selectedProduct === 'all') {
        // 전체 품목 로드
        const allData = [];
        for (const [product, url] of Object.entries(PROCUREMENT_URLS)) {
            console.log(`${product} 조달데이터 로드 중...`);
            const data = await loadCSVData(url);
            // 품목 정보 추가
            data.forEach(item => {
                item.product = product;
            });
            allData.push(...data);
        }
        return allData;
    } else {
        // 선택된 품목만 로드
        console.log(`${selectedProduct} 조달데이터 로드 중...`);
        const url = PROCUREMENT_URLS[selectedProduct];
        if (!url) {
            console.warn(`${selectedProduct}에 대한 URL이 없습니다.`);
            return [];
        }
        const data = await loadCSVData(url);
        data.forEach(item => {
            item.product = selectedProduct;
        });
        return data;
    }
}

// 사급 판매실적 데이터 로드 함수
async function loadPrivateSalesData() {
    console.log('사급 판매실적 데이터 로드 중...');
    try {
        // sheets-api.js 사용
        if (window.sheetsAPI) {
            const rawData = await window.sheetsAPI.loadCSVData();
            // 사급매출만 필터링
            return rawData.filter(item => {
                const typeValue = item['구분'] || item['type'] || '';
                return typeValue.includes('사급');
            });
        } else {
            // 직접 로드
            return await loadCSVData(SALES_DATA_URL);
        }
    } catch (error) {
        console.warn('사급 판매실적 데이터 로드 실패:', error);
        return [];
    }
}

// 샘플 데이터 생성 (테스트용)
function generateSampleData() {
    console.log('샘플 데이터 생성 중...');
    
    // 관급 샘플 데이터
    governmentData = [
        {
            product: '보행매트',
            customer: '경기도 양주시',
            region: '경기도',
            customerType: '지방자치단체',
            amount: 15000000,
            contractDate: '2024-01-15',
            contractName: '천보산 산림욕장 보완사업'
        },
        {
            product: '보행매트',
            customer: '의정부시',
            region: '경기도',
            customerType: '지방자치단체',
            amount: 28000000,
            contractDate: '2024-02-10',
            contractName: '의정부시 녹지조성사업'
        },
        {
            product: '식생매트',
            customer: '서울시',
            region: '서울특별시',
            customerType: '지방자치단체',
            amount: 32000000,
            contractDate: '2024-02-05',
            contractName: '서울시 한강공원 보행로 개선'
        },
        {
            product: '논슬립',
            customer: '부천시',
            region: '경기도',
            customerType: '지방자치단체',
            amount: 45000000,
            contractDate: '2024-03-12',
            contractName: '부천시 중앙공원 조성사업'
        }
    ];

    // 사급 샘플 데이터
    privateSalesData = [
        {
            customer: '광주 북구',
            region: '광주광역시',
            customerType: '지방자치단체',
            amount: 52000000,
            contractDate: '2024-03-18',
            contractName: '광주 북구 문화센터 주변 정비'
        },
        {
            customer: '제주시',
            region: '제주특별자치도',
            customerType: '지방자치단체',
            amount: 31000000,
            contractDate: '2024-04-07',
            contractName: '제주시 관광지 보행로 정비'
        },
        {
            customer: '포항시',
            region: '경상북도',
            customerType: '지방자치단체',
            amount: 23000000,
            contractDate: '2024-04-22',
            contractName: '포항시 영일대 해안 보행로'
        }
    ];
}

// 메인 분석 함수
async function analyzeCustomers() {
    try {
        console.log('고객 분석 시작...');
        
        // 로딩 상태 표시
        showLoadingState(true);
        
        // 데이터 로드
        try {
            governmentData = await loadGovernmentData();
            privateSalesData = await loadPrivateSalesData();
            
            if (governmentData.length === 0 && privateSalesData.length === 0) {
                throw new Error('데이터 로드 실패');
            }
        } catch (error) {
            console.warn('실제 데이터 로드 실패, 샘플 데이터 사용:', error);
            generateSampleData();
        }
        
        // 필터링 및 분석
        const selectedYear = $('analysisYear')?.value || '2024';
        const selectedProduct = $('productType')?.value || '보행매트';
        
        // 관급 데이터 분석
        analyzeGovernmentData(selectedYear, selectedProduct);
        
        // 사급 데이터 분석
        analyzePrivateData(selectedYear);
        
        // 요약 통계 업데이트
        updateSummaryStats();
        
        // 테이블 렌더링
        renderAllTables();
        
        console.log('고객 분석 완료');
        
    } catch (error) {
        console.error('고객 분석 오류:', error);
        showAlert('분석 중 오류가 발생했습니다.', 'error');
    } finally {
        showLoadingState(false);
    }
}

// 관급 데이터 분석
function analyzeGovernmentData(selectedYear, selectedProduct) {
    console.log(`관급 데이터 분석: ${selectedYear}년, ${selectedProduct}`);
    
    // 연도 및 품목 필터링
    let filteredData = governmentData;
    
    if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        filteredData = filteredData.filter(item => {
            const date = parseDate(item.contractDate || item['계약일자'] || '');
            return date && date.getFullYear() === year;
        });
    }
    
    if (selectedProduct !== 'all') {
        filteredData = filteredData.filter(item => 
            item.product === selectedProduct || 
            (item['품목'] && item['품목'].includes(selectedProduct))
        );
    }
    
    // 고객별 집계
    analyzeCustomerData(filteredData);
    analyzeRegionData(filteredData);
    analyzeTypeData(filteredData);
}

// 사급 데이터 분석
function analyzePrivateData(selectedYear) {
    console.log(`사급 데이터 분석: ${selectedYear}년`);
    
    // 연도 필터링
    let filteredData = privateSalesData;
    
    if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        filteredData = filteredData.filter(item => {
            const date = parseDate(item.contractDate || item['세금계산서'] || item['날짜'] || '');
            return date && date.getFullYear() === year;
        });
    }
    
    // 사급 고객별 집계
    analyzePrivateCustomerData(filteredData);
}

// 고객별 데이터 분석
function analyzeCustomerData(data) {
    const customerMap = new Map();
    
    data.forEach(item => {
        const customer = item.customer || item['거래처'] || '';
        
        if (!customerMap.has(customer)) {
            customerMap.set(customer, {
                customer: customer,
                region: item.region || item['지역'] || '',
                customerType: item.customerType || item['수요기관구분'] || '지방자치단체',
                count: 0,
                amount: 0,
                contracts: [],
                lastTransactionDate: null
            });
        }
        
        const customerInfo = customerMap.get(customer);
        customerInfo.count++;
        
        const amount = parseInt((item.amount || item['합계'] || '0').toString().replace(/[^\d]/g, '')) || 0;
        customerInfo.amount += amount;
        
        customerInfo.contracts.push(item);
        
        const date = parseDate(item.contractDate || item['계약일자'] || '');
        if (!customerInfo.lastTransactionDate || (date && date > customerInfo.lastTransactionDate)) {
            customerInfo.lastTransactionDate = date;
        }
    });
    
    // 배열로 변환 및 정렬
    customerData = Array.from(customerMap.values());
    customerData.sort((a, b) => b.amount - a.amount);
    
    // 순위 및 비중 계산
    const totalAmount = customerData.reduce((sum, item) => sum + item.amount, 0);
    customerData.forEach((item, index) => {
        item.rank = index + 1;
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 지역별 데이터 분석
function analyzeRegionData(data) {
    const regionMap = new Map();
    
    data.forEach(item => {
        const region = item.region || item['지역'] || '';
        
        if (!regionMap.has(region)) {
            regionMap.set(region, {
                region: region,
                customerCount: new Set(),
                contractCount: 0,
                amount: 0
            });
        }
        
        const regionInfo = regionMap.get(region);
        regionInfo.customerCount.add(item.customer || item['거래처']);
        regionInfo.contractCount++;
        
        const amount = parseInt((item.amount || item['합계'] || '0').toString().replace(/[^\d]/g, '')) || 0;
        regionInfo.amount += amount;
    });
    
    // 배열로 변환
    regionData = Array.from(regionMap.values()).map(item => ({
        region: item.region,
        customerCount: item.customerCount.size,
        contractCount: item.contractCount,
        amount: item.amount,
        avgAmount: item.contractCount > 0 ? item.amount / item.contractCount : 0
    }));
    
    regionData.sort((a, b) => b.amount - a.amount);
    
    // 비중 계산
    const totalAmount = regionData.reduce((sum, item) => sum + item.amount, 0);
    regionData.forEach(item => {
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 수요기관별 데이터 분석
function analyzeTypeData(data) {
    const typeMap = new Map();
    
    data.forEach(item => {
        const type = item.customerType || item['수요기관구분'] || '지방자치단체';
        
        if (!typeMap.has(type)) {
            typeMap.set(type, {
                customerType: type,
                customerCount: new Set(),
                contractCount: 0,
                amount: 0
            });
        }
        
        const typeInfo = typeMap.get(type);
        typeInfo.customerCount.add(item.customer || item['거래처']);
        typeInfo.contractCount++;
        
        const amount = parseInt((item.amount || item['합계'] || '0').toString().replace(/[^\d]/g, '')) || 0;
        typeInfo.amount += amount;
    });
    
    // 배열로 변환
    typeData = Array.from(typeMap.values()).map(item => ({
        customerType: item.customerType,
        customerCount: item.customerCount.size,
        contractCount: item.contractCount,
        amount: item.amount,
        avgAmount: item.contractCount > 0 ? item.amount / item.contractCount : 0
    }));
    
    typeData.sort((a, b) => b.amount - a.amount);
    
    // 비중 계산
    const totalAmount = typeData.reduce((sum, item) => sum + item.amount, 0);
    typeData.forEach(item => {
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 사급 고객별 데이터 분석
function analyzePrivateCustomerData(data) {
    const customerMap = new Map();
    
    data.forEach(item => {
        const customer = item.customer || item['거래처'] || '';
        
        if (!customerMap.has(customer)) {
            customerMap.set(customer, {
                customer: customer,
                region: item.region || item['지역'] || '',
                customerType: item.customerType || item['수요기관구분'] || '민간',
                count: 0,
                amount: 0,
                contracts: [],
                lastTransactionDate: null
            });
        }
        
        const customerInfo = customerMap.get(customer);
        customerInfo.count++;
        
        const amount = parseInt((item.amount || item['합계'] || '0').toString().replace(/[^\d]/g, '')) || 0;
        customerInfo.amount += amount;
        
        customerInfo.contracts.push(item);
        
        const date = parseDate(item.contractDate || item['세금계산서'] || item['날짜'] || '');
        if (!customerInfo.lastTransactionDate || (date && date > customerInfo.lastTransactionDate)) {
            customerInfo.lastTransactionDate = date;
        }
    });
    
    // 배열로 변환 및 정렬
    privateCustomerData = Array.from(customerMap.values());
    privateCustomerData.sort((a, b) => b.amount - a.amount);
    
    // 순위 및 비중 계산
    const totalAmount = privateCustomerData.reduce((sum, item) => sum + item.amount, 0);
    privateCustomerData.forEach((item, index) => {
        item.rank = index + 1;
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 요약 통계 업데이트
function updateSummaryStats() {
    const totalCustomers = customerData.length;
    const totalAmount = customerData.reduce((sum, item) => sum + item.amount, 0);
    const avgAmount = totalCustomers > 0 ? totalAmount / totalCustomers : 0;
    const maxShare = customerData.length > 0 ? customerData[0].share : 0;
    
    // 신규 고객 계산 (간단한 예시)
    const newCustomers = Math.floor(totalCustomers * 0.2); // 20%를 신규로 가정
    
    // DOM 업데이트
    const elements = {
        totalCustomers: $('totalCustomers'),
        avgAmount: $('avgAmount'),
        maxShare: $('maxShare'),
        newCustomers: $('newCustomers')
    };
    
    if (elements.totalCustomers) elements.totalCustomers.textContent = formatNumber(totalCustomers);
    if (elements.avgAmount) elements.avgAmount.textContent = formatCurrency(Math.round(avgAmount));
    if (elements.maxShare) elements.maxShare.textContent = maxShare.toFixed(1) + '%';
    if (elements.newCustomers) elements.newCustomers.textContent = formatNumber(newCustomers);
}

// 모든 테이블 렌더링
function renderAllTables() {
    renderCustomerTable();
    renderRegionTable();
    renderTypeTable();
    renderPrivateTable();
}

// 고객별 테이블 렌더링
function renderCustomerTable() {
    const tbody = $('customerTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    customerData.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${customer.rank}</td>
            <td class="font-medium">${customer.customer}</td>
            <td>${customer.region}</td>
            <td class="text-center">
                <span class="badge ${getCustomerTypeBadgeClass(customer.customerType)}">${customer.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(customer.count)}</td>
            <td class="text-right font-medium amount">${formatCurrency(customer.amount)}</td>
            <td class="text-right ${customer.share >= 20 ? 'text-red-600 font-bold' : customer.share >= 10 ? 'text-orange-600 font-medium' : ''}">${customer.share.toFixed(1)}%</td>
            <td class="text-center">${customer.lastTransactionDate ? formatDate(customer.lastTransactionDate) : '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 지역별 테이블 렌더링
function renderRegionTable() {
    const tbody = $('regionTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    regionData.forEach((region, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="font-medium">${region.region}</td>
            <td class="text-center">${formatNumber(region.customerCount)}</td>
            <td class="text-center">${formatNumber(region.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(region.amount)}</td>
            <td class="text-right">${region.share.toFixed(1)}%</td>
            <td class="text-right">${formatCurrency(Math.round(region.avgAmount))}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 수요기관별 테이블 렌더링
function renderTypeTable() {
    const tbody = $('typeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    typeData.forEach((type, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="font-medium">
                <span class="badge ${getCustomerTypeBadgeClass(type.customerType)}">${type.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(type.customerCount)}</td>
            <td class="text-center">${formatNumber(type.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(type.amount)}</td>
            <td class="text-right">${type.share.toFixed(1)}%</td>
            <td class="text-right">${formatCurrency(Math.round(type.avgAmount))}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 사급판매 테이블 렌더링
function renderPrivateTable() {
    const tbody = $('privateTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    privateCustomerData.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${customer.rank}</td>
            <td class="font-medium">${customer.customer}</td>
            <td>${customer.region}</td>
            <td class="text-center">
                <span class="badge ${getCustomerTypeBadgeClass(customer.customerType)}">${customer.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(customer.count)}</td>
            <td class="text-right font-medium amount">${formatCurrency(customer.amount)}</td>
            <td class="text-right">${customer.share.toFixed(1)}%</td>
            <td class="text-center">${customer.lastTransactionDate ? formatDate(customer.lastTransactionDate) : '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 수요기관 구분별 배지 클래스 반환
function getCustomerTypeBadgeClass(type) {
    switch (type) {
        case '지방자치단체':
            return 'badge-primary';
        case '군':
            return 'badge-success';
        case '공기업':
            return 'badge-warning';
        case '관공서':
            return 'badge-secondary';
        case '민간':
            return 'badge-purple';
        default:
            return 'badge-gray';
    }
}

// 로딩 상태 표시
function showLoadingState(show) {
    const analyzeBtn = $('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = show;
        analyzeBtn.textContent = show ? '분석 중...' : '분석';
    }
}

// 알림 표시
function showAlert(message, type = 'info') {
    if (window.CommonUtils && CommonUtils.showAlert) {
        CommonUtils.showAlert(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// 샘플 데이터 로드 (기존 함수 호환성)
function loadSampleData() {
    console.log('샘플 데이터로 초기화');
    generateSampleData();
    analyzeCustomers();
}

// 전역 함수로 내보내기 (맨 아래에서 맨 앞으로 이동)
window.CustomerAnalysis = {
    analyzeCustomers: null,
    loadSampleData: null,
    generateSampleData: null
};

// 매출처별 집계 분석 JavaScript (고급 버전)
// assets/js/customer-analysis-advanced.js

// 전역 변수
let governmentData = []; // 관급 데이터 (조달데이터)
let privateSalesData = []; // 사급 데이터 (판매실적 데이터)
let customerData = [];
let regionData = [];
let typeData = [];
let privateCustomerData = [];

// 조달데이터 시트 URL들
const PROCUREMENT_URLS = {
    '보행매트': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSplrmlhekVgQLbcCpHLX8d2HBNAErwj-UknKUZVI5KCMen-kUCWXlRONPR6oc0Wj1zd6FP-EfRaFeU/pub?output=csv',
    '식생매트': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS식생매트URL/pub?output=csv', // 실제 URL로 교체 필요
    '논슬립': 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS논슬립URL/pub?output=csv' // 실제 URL로 교체 필요
};

// 판매실적 데이터 URL (기존)
const SALES_DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjy2slFJrAxxPO8WBmehXH4iJtcfxr-HUkvL-YXw-BIvmA1Z3kTa8DfdWVnwVl3r4jhjmHFUYIju3j/pub?output=csv';

// 안전한 요소 가져오기
function $(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`요소를 찾을 수 없습니다: ${id}`);
    }
    return element;
}

// 포맷팅 함수들
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

function formatNumber(number) {
    if (!number && number !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(number);
}

function formatDate(date) {
    if (!date || !(date instanceof Date)) return '-';
    return date.toLocaleDateString('ko-KR');
}

// 날짜 파싱 함수
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    let date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
        if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
            date = new Date(dateStr);
        } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const [month, day, year] = dateStr.split('/');
            date = new Date(year, month - 1, day);
        }
    }
    
    return isNaN(date.getTime()) ? null : date;
}

// CSV 데이터 로드 함수
async function loadCSVData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        return parseCSV(csvText);
    } catch (error) {
        console.warn(`CSV 로드 실패 (${url}):`, error.message);
        return [];
    }
}

// CSV 파싱 함수
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
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

    return data;
}

// CSV 라인 파싱
function parseCSVLine(line) {
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
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// 조달데이터 로드 함수
async function loadGovernmentData() {
    const selectedProduct = $('productType')?.value || '보행매트';
    
    if (selectedProduct === 'all') {
        // 전체 품목 로드
        const allData = [];
        for (const [product, url] of Object.entries(PROCUREMENT_URLS)) {
            console.log(`${product} 조달데이터 로드 중...`);
            const data = await loadCSVData(url);
            // 품목 정보 추가
            data.forEach(item => {
                item.product = product;
            });
            allData.push(...data);
        }
        return allData;
    } else {
        // 선택된 품목만 로드
        console.log(`${selectedProduct} 조달데이터 로드 중...`);
        const url = PROCUREMENT_URLS[selectedProduct];
        if (!url) {
            console.warn(`${selectedProduct}에 대한 URL이 없습니다.`);
            return [];
        }
        const data = await loadCSVData(url);
        data.forEach(item => {
            item.product = selectedProduct;
        });
        return data;
    }
}

// 사급 판매실적 데이터 로드 함수
async function loadPrivateSalesData() {
    console.log('사급 판매실적 데이터 로드 중...');
    try {
        // sheets-api.js 사용
        if (window.sheetsAPI) {
            const rawData = await window.sheetsAPI.loadCSVData();
            // 사급매출만 필터링
            return rawData.filter(item => {
                const typeValue = item['구분'] || item['type'] || '';
                return typeValue.includes('사급');
            });
        } else {
            // 직접 로드
            return await loadCSVData(SALES_DATA_URL);
        }
    } catch (error) {
        console.warn('사급 판매실적 데이터 로드 실패:', error);
        return [];
    }
}

// 샘플 데이터 생성 (테스트용)
function generateSampleData() {
    console.log('샘플 데이터 생성 중...');
    
    // 관급 샘플 데이터
    governmentData = [
        {
            product: '보행매트',
            customer: '경기도 양주시',
            region: '경기도',
            customerType: '지방자치단체',
            amount: 15000000,
            contractDate: '2024-01-15',
            contractName: '천보산 산림욕장 보완사업'
        },
        {
            product: '보행매트',
            customer: '의정부시',
            region: '경기도',
            customerType: '지방자치단체',
            amount: 28000000,
            contractDate: '2024-02-10',
            contractName: '의정부시 녹지조성사업'
        },
        {
            product: '식생매트',
            customer: '서울시',
            region: '서울특별시',
            customerType: '지방자치단체',
            amount: 32000000,
            contractDate: '2024-02-05',
            contractName: '서울시 한강공원 보행로 개선'
        },
        {
            product: '논슬립',
            customer: '부천시',
            region: '경기도',
            customerType: '지방자치단체',
            amount: 45000000,
            contractDate: '2024-03-12',
            contractName: '부천시 중앙공원 조성사업'
        }
    ];

    // 사급 샘플 데이터
    privateSalesData = [
        {
            customer: '광주 북구',
            region: '광주광역시',
            customerType: '지방자치단체',
            amount: 52000000,
            contractDate: '2024-03-18',
            contractName: '광주 북구 문화센터 주변 정비'
        },
        {
            customer: '제주시',
            region: '제주특별자치도',
            customerType: '지방자치단체',
            amount: 31000000,
            contractDate: '2024-04-07',
            contractName: '제주시 관광지 보행로 정비'
        },
        {
            customer: '포항시',
            region: '경상북도',
            customerType: '지방자치단체',
            amount: 23000000,
            contractDate: '2024-04-22',
            contractName: '포항시 영일대 해안 보행로'
        }
    ];
}

// 메인 분석 함수
async function analyzeCustomers() {
    try {
        console.log('고객 분석 시작...');
        
        // 로딩 상태 표시
        showLoadingState(true);
        
        // 데이터 로드
        try {
            governmentData = await loadGovernmentData();
            privateSalesData = await loadPrivateSalesData();
            
            if (governmentData.length === 0 && privateSalesData.length === 0) {
                throw new Error('데이터 로드 실패');
            }
        } catch (error) {
            console.warn('실제 데이터 로드 실패, 샘플 데이터 사용:', error);
            generateSampleData();
        }
        
        // 필터링 및 분석
        const selectedYear = $('analysisYear')?.value || '2024';
        const selectedProduct = $('productType')?.value || '보행매트';
        
        // 관급 데이터 분석
        analyzeGovernmentData(selectedYear, selectedProduct);
        
        // 사급 데이터 분석
        analyzePrivateData(selectedYear);
        
        // 요약 통계 업데이트
        updateSummaryStats();
        
        // 테이블 렌더링
        renderAllTables();
        
        console.log('고객 분석 완료');
        
    } catch (error) {
        console.error('고객 분석 오류:', error);
        showAlert('분석 중 오류가 발생했습니다.', 'error');
    } finally {
        showLoadingState(false);
    }
}

// 관급 데이터 분석
function analyzeGovernmentData(selectedYear, selectedProduct) {
    console.log(`관급 데이터 분석: ${selectedYear}년, ${selectedProduct}`);
    
    // 연도 및 품목 필터링
    let filteredData = governmentData;
    
    if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        filteredData = filteredData.filter(item => {
            const date = parseDate(item.contractDate || item['계약일자'] || '');
            return date && date.getFullYear() === year;
        });
    }
    
    if (selectedProduct !== 'all') {
        filteredData = filteredData.filter(item => 
            item.product === selectedProduct || 
            (item['품목'] && item['품목'].includes(selectedProduct))
        );
    }
    
    // 고객별 집계
    analyzeCustomerData(filteredData);
    analyzeRegionData(filteredData);
    analyzeTypeData(filteredData);
}

// 사급 데이터 분석
function analyzePrivateData(selectedYear) {
    console.log(`사급 데이터 분석: ${selectedYear}년`);
    
    // 연도 필터링
    let filteredData = privateSalesData;
    
    if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        filteredData = filteredData.filter(item => {
            const date = parseDate(item.contractDate || item['세금계산서'] || item['날짜'] || '');
            return date && date.getFullYear() === year;
        });
    }
    
    // 사급 고객별 집계
    analyzePrivateCustomerData(filteredData);
}

// 고객별 데이터 분석
function analyzeCustomerData(data) {
    const customerMap = new Map();
    
    data.forEach(item => {
        const customer = item.customer || item['거래처'] || '';
        
        if (!customerMap.has(customer)) {
            customerMap.set(customer, {
                customer: customer,
                region: item.region || item['지역'] || '',
                customerType: item.customerType || item['수요기관구분'] || '지방자치단체',
                count: 0,
                amount: 0,
                contracts: [],
                lastTransactionDate: null
            });
        }
        
        const customerInfo = customerMap.get(customer);
        customerInfo.count++;
        
        const amount = parseInt((item.amount || item['합계'] || '0').toString().replace(/[^\d]/g, '')) || 0;
        customerInfo.amount += amount;
        
        customerInfo.contracts.push(item);
        
        const date = parseDate(item.contractDate || item['계약일자'] || '');
        if (!customerInfo.lastTransactionDate || (date && date > customerInfo.lastTransactionDate)) {
            customerInfo.lastTransactionDate = date;
        }
    });
    
    // 배열로 변환 및 정렬
    customerData = Array.from(customerMap.values());
    customerData.sort((a, b) => b.amount - a.amount);
    
    // 순위 및 비중 계산
    const totalAmount = customerData.reduce((sum, item) => sum + item.amount, 0);
    customerData.forEach((item, index) => {
        item.rank = index + 1;
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 지역별 데이터 분석
function analyzeRegionData(data) {
    const regionMap = new Map();
    
    data.forEach(item => {
        const region = item.region || item['지역'] || '';
        
        if (!regionMap.has(region)) {
            regionMap.set(region, {
                region: region,
                customerCount: new Set(),
                contractCount: 0,
                amount: 0
            });
        }
        
        const regionInfo = regionMap.get(region);
        regionInfo.customerCount.add(item.customer || item['거래처']);
        regionInfo.contractCount++;
        
        const amount = parseInt((item.amount || item['합계'] || '0').toString().replace(/[^\d]/g, '')) || 0;
        regionInfo.amount += amount;
    });
    
    // 배열로 변환
    regionData = Array.from(regionMap.values()).map(item => ({
        region: item.region,
        customerCount: item.customerCount.size,
        contractCount: item.contractCount,
        amount: item.amount,
        avgAmount: item.contractCount > 0 ? item.amount / item.contractCount : 0
    }));
    
    regionData.sort((a, b) => b.amount - a.amount);
    
    // 비중 계산
    const totalAmount = regionData.reduce((sum, item) => sum + item.amount, 0);
    regionData.forEach(item => {
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 수요기관별 데이터 분석
function analyzeTypeData(data) {
    const typeMap = new Map();
    
    data.forEach(item => {
        const type = item.customerType || item['수요기관구분'] || '지방자치단체';
        
        if (!typeMap.has(type)) {
            typeMap.set(type, {
                customerType: type,
                customerCount: new Set(),
                contractCount: 0,
                amount: 0
            });
        }
        
        const typeInfo = typeMap.get(type);
        typeInfo.customerCount.add(item.customer || item['거래처']);
        typeInfo.contractCount++;
        
        const amount = parseInt((item.amount || item['합계'] || '0').toString().replace(/[^\d]/g, '')) || 0;
        typeInfo.amount += amount;
    });
    
    // 배열로 변환
    typeData = Array.from(typeMap.values()).map(item => ({
        customerType: item.customerType,
        customerCount: item.customerCount.size,
        contractCount: item.contractCount,
        amount: item.amount,
        avgAmount: item.contractCount > 0 ? item.amount / item.contractCount : 0
    }));
    
    typeData.sort((a, b) => b.amount - a.amount);
    
    // 비중 계산
    const totalAmount = typeData.reduce((sum, item) => sum + item.amount, 0);
    typeData.forEach(item => {
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 사급 고객별 데이터 분석
function analyzePrivateCustomerData(data) {
    const customerMap = new Map();
    
    data.forEach(item => {
        const customer = item.customer || item['거래처'] || '';
        
        if (!customerMap.has(customer)) {
            customerMap.set(customer, {
                customer: customer,
                region: item.region || item['지역'] || '',
                customerType: item.customerType || item['수요기관구분'] || '민간',
                count: 0,
                amount: 0,
                contracts: [],
                lastTransactionDate: null
            });
        }
        
        const customerInfo = customerMap.get(customer);
        customerInfo.count++;
        
        const amount = parseInt((item.amount || item['합계'] || '0').toString().replace(/[^\d]/g, '')) || 0;
        customerInfo.amount += amount;
        
        customerInfo.contracts.push(item);
        
        const date = parseDate(item.contractDate || item['세금계산서'] || item['날짜'] || '');
        if (!customerInfo.lastTransactionDate || (date && date > customerInfo.lastTransactionDate)) {
            customerInfo.lastTransactionDate = date;
        }
    });
    
    // 배열로 변환 및 정렬
    privateCustomerData = Array.from(customerMap.values());
    privateCustomerData.sort((a, b) => b.amount - a.amount);
    
    // 순위 및 비중 계산
    const totalAmount = privateCustomerData.reduce((sum, item) => sum + item.amount, 0);
    privateCustomerData.forEach((item, index) => {
        item.rank = index + 1;
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 요약 통계 업데이트
function updateSummaryStats() {
    const totalCustomers = customerData.length;
    const totalAmount = customerData.reduce((sum, item) => sum + item.amount, 0);
    const avgAmount = totalCustomers > 0 ? totalAmount / totalCustomers : 0;
    const maxShare = customerData.length > 0 ? customerData[0].share : 0;
    
    // 신규 고객 계산 (간단한 예시)
    const newCustomers = Math.floor(totalCustomers * 0.2); // 20%를 신규로 가정
    
    // DOM 업데이트
    const elements = {
        totalCustomers: $('totalCustomers'),
        avgAmount: $('avgAmount'),
        maxShare: $('maxShare'),
        newCustomers: $('newCustomers')
    };
    
    if (elements.totalCustomers) elements.totalCustomers.textContent = formatNumber(totalCustomers);
    if (elements.avgAmount) elements.avgAmount.textContent = formatCurrency(Math.round(avgAmount));
    if (elements.maxShare) elements.maxShare.textContent = maxShare.toFixed(1) + '%';
    if (elements.newCustomers) elements.newCustomers.textContent = formatNumber(newCustomers);
}

// 모든 테이블 렌더링
function renderAllTables() {
    renderCustomerTable();
    renderRegionTable();
    renderTypeTable();
    renderPrivateTable();
}

// 고객별 테이블 렌더링
function renderCustomerTable() {
    const tbody = $('customerTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    customerData.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${customer.rank}</td>
            <td class="font-medium">${customer.customer}</td>
            <td>${customer.region}</td>
            <td class="text-center">
                <span class="badge ${getCustomerTypeBadgeClass(customer.customerType)}">${customer.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(customer.count)}</td>
            <td class="text-right font-medium amount">${formatCurrency(customer.amount)}</td>
            <td class="text-right ${customer.share >= 20 ? 'text-red-600 font-bold' : customer.share >= 10 ? 'text-orange-600 font-medium' : ''}">${customer.share.toFixed(1)}%</td>
            <td class="text-center">${customer.lastTransactionDate ? formatDate(customer.lastTransactionDate) : '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 지역별 테이블 렌더링
function renderRegionTable() {
    const tbody = $('regionTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    regionData.forEach((region, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="font-medium">${region.region}</td>
            <td class="text-center">${formatNumber(region.customerCount)}</td>
            <td class="text-center">${formatNumber(region.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(region.amount)}</td>
            <td class="text-right">${region.share.toFixed(1)}%</td>
            <td class="text-right">${formatCurrency(Math.round(region.avgAmount))}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 수요기관별 테이블 렌더링
function renderTypeTable() {
    const tbody = $('typeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    typeData.forEach((type, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="font-medium">
                <span class="badge ${getCustomerTypeBadgeClass(type.customerType)}">${type.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(type.customerCount)}</td>
            <td class="text-center">${formatNumber(type.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(type.amount)}</td>
            <td class="text-right">${type.share.toFixed(1)}%</td>
            <td class="text-right">${formatCurrency(Math.round(type.avgAmount))}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 사급판매 테이블 렌더링
function renderPrivateTable() {
    const tbody = $('privateTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    privateCustomerData.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${customer.rank}</td>
            <td class="font-medium">${customer.customer}</td>
            <td>${customer.region}</td>
            <td class="text-center">
                <span class="badge ${getCustomerTypeBadgeClass(customer.customerType)}">${customer.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(customer.count)}</td>
            <td class="text-right font-medium amount">${formatCurrency(customer.amount)}</td>
            <td class="text-right">${customer.share.toFixed(1)}%</td>
            <td class="text-center">${customer.lastTransactionDate ? formatDate(customer.lastTransactionDate) : '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 수요기관 구분별 배지 클래스 반환
function getCustomerTypeBadgeClass(type) {
    switch (type) {
        case '지방자치단체':
            return 'badge-primary';
        case '군':
            return 'badge-success';
        case '공기업':
            return 'badge-warning';
        case '관공서':
            return 'badge-secondary';
        case '민간':
            return 'badge-purple';
        default:
            return 'badge-gray';
    }
}

// 로딩 상태 표시
function showLoadingState(show) {
    const analyzeBtn = $('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = show;
        analyzeBtn.textContent = show ? '분석 중...' : '분석';
    }
}

// 알림 표시
function showAlert(message, type = 'info') {
    if (window.CommonUtils && CommonUtils.showAlert) {
        CommonUtils.showAlert(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// 샘플 데이터 로드 (기존 함수 호환성)
function loadSampleData() {
    console.log('샘플 데이터로 초기화');
    generateSampleData();
    analyzeCustomers();
}

// 전역 객체에 함수들 할당
window.CustomerAnalysis.analyzeCustomers = analyzeCustomers;
window.CustomerAnalysis.loadSampleData = loadSampleData;
window.CustomerAnalysis.generateSampleData = generateSampleData;

console.log('CustomerAnalysis 모듈 로드 완료');
