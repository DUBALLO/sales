// 매출처별 집계 분석 JavaScript (최종 수정 버전)

// 전역 변수
let governmentData = [];
let customerData = [];
let regionData = [];
let typeData = [];
let isLoading = false;
let currentYear = 'all';

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

// 금액 파싱 함수
function parseAmount(amountStr) {
    if (!amountStr) return 0;
    const cleanAmount = amountStr.toString().replace(/[^\d]/g, '');
    return parseInt(cleanAmount) || 0;
}

// 지역 추출 함수
function extractRegion(customerName) {
    if (!customerName) return '기타';
    
    const regionMap = {
        '서울': '서울특별시',
        '경기': '경기도',
        '강원': '강원도',
        '충북': '충청북도',
        '충남': '충청남도',
        '전북': '전라북도',
        '전남': '전라남도',
        '경북': '경상북도',
        '경남': '경상남도',
        '제주': '제주특별자치도',
        '부산': '부산광역시',
        '대구': '대구광역시',
        '인천': '인천광역시',
        '광주': '광주광역시',
        '대전': '대전광역시',
        '울산': '울산광역시'
    };
    
    for (const [key, value] of Object.entries(regionMap)) {
        if (customerName.includes(key)) {
            return value;
        }
    }
    
    return '기타';
}

// 샘플 데이터 생성
function generateSampleData() {
    console.log('=== 샘플 데이터 생성 시작 ===');
    
    governmentData = [
        {
            customer: '경기도 양주시', region: '경기도', customerType: '지방자치단체',
            amount: 15000000, contractDate: '2024-01-15', contractName: '천보산 산림욕장 보완사업', product: '보행매트'
        },
        {
            customer: '의정부시', region: '경기도', customerType: '지방자치단체',
            amount: 28000000, contractDate: '2024-02-10', contractName: '의정부시 녹지조성사업', product: '보행매트'
        },
        {
            customer: '서울시', region: '서울특별시', customerType: '지방자치단체',
            amount: 32000000, contractDate: '2024-02-05', contractName: '서울시 한강공원 보행로 개선', product: '식생매트'
        },
        {
            customer: '부천시', region: '경기도', customerType: '지방자치단체',
            amount: 45000000, contractDate: '2024-03-12', contractName: '부천시 중앙공원 조성사업', product: '논슬립'
        },
        {
            customer: '춘천시', region: '강원도', customerType: '지방자치단체',
            amount: 22000000, contractDate: '2024-03-20', contractName: '춘천시 공원 조성사업', product: '보행매트'
        }
    ];
    
    console.log('샘플 데이터 생성 완료');
}

// 메인 분석 함수
async function analyzeCustomers() {
    try {
        console.log('=== 고객 분석 시작 ===');
        
        showLoadingState(true);
        
        let useRealData = false;
        
        if (window.sheetsAPI) {
            try {
                console.log('sheets-api를 통한 실제 데이터 로드 시도...');
                const rawData = await window.sheetsAPI.loadCSVData('procurement');
                
                if (rawData && rawData.length > 0) {
                    console.log('sheets-api에서 로드된 원시 데이터:', rawData.length, '건');
                    parseRealData(rawData);
                    useRealData = true;
                } else {
                    throw new Error('로드된 데이터가 비어있습니다.');
                }
                
            } catch (error) {
                console.warn('실제 데이터 로드 실패:', error.message);
                useRealData = false;
            }
        } else {
            console.warn('sheets-api.js가 로드되지 않음');
            useRealData = false;
        }
        
        if (!useRealData) {
            console.log('샘플 데이터 사용');
            generateSampleData();
        }
        
        const selectedYear = $('analysisYear')?.value || 'all';
        const selectedProduct = $('productType')?.value || 'all';
        
        console.log('분석 조건 - 연도:', selectedYear, '품목:', selectedProduct);
        
        let filteredData = [...governmentData];
        
        if (selectedYear !== 'all') {
            const year = parseInt(selectedYear);
            filteredData = filteredData.filter(item => {
                const date = parseDate(item.contractDate || '');
                return date && date.getFullYear() === year;
            });
        }
        
        if (selectedProduct !== 'all') {
            filteredData = filteredData.filter(item => 
                item.product === selectedProduct
            );
        }
        
        analyzeCustomerData(filteredData);
        analyzeRegionData(filteredData);
        analyzeTypeData(filteredData);

        updateSummaryStats(filteredData);
        renderAllTables();
        
        console.log('=== 고객 분석 완료 ===');
        
        const message = useRealData ? 
            `실제 데이터 분석 완료 (${governmentData.length}건)` :
            '샘플 데이터로 분석 완료';
        showAlert(message, useRealData ? 'success' : 'warning');
        
    } catch (error) {
        console.error('고객 분석 오류:', error);
        showAlert('분석 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

// 실제 데이터 파싱 함수 (컬럼명 교정)
function parseRealData(rawData) {
    console.log('=== 실제 데이터 파싱 시작 ===');
    
    governmentData = [];
    
    let dubaloCount = 0;
    
    rawData.forEach(item => {
        try {
            const company = (item['업체'] || '').trim();
            if (company !== '두발로 주식회사') return;
            dubaloCount++;
            
            const baseData = {
                customer: (item['수요기관명'] || '').trim(),
                region: (item['수요기관지역'] || '').trim(),
                customerType: item['소관구분'] || '지방자치단체',
                amount: parseAmount(item['공급금액'] || '0'),
                contractDate: item['기준일자'] || '',
                contractName: (item['계약명'] || '').trim(),
                product: (item['세부품명'] || '').trim()
            };
            
            if (!baseData.customer || baseData.customer === '거래처 없음' || baseData.amount <= 0) return;
            
            governmentData.push(baseData);
            
        } catch (error) {
            console.warn(`데이터 파싱 오류 (행):`, error.message);
        }
    });
    
    console.log('데이터 파싱 완료');
    console.log(`전체 ${rawData.length}건 중 두발로 주식회사: ${dubaloCount}건`);
    console.log(`유효한 관급 데이터: ${governmentData.length}건`);
}

// 고객별 데이터 분석
function analyzeCustomerData(data) {
    console.log('=== 고객별 데이터 분석 ===');
    const customerMap = new Map();
    data.forEach(item => {
        const customer = item.customer || '';
        const customerType = item.customerType || '지방자치단체';
        
        if (!customerMap.has(customer)) {
            customerMap.set(customer, {
                customer: customer,
                region: item.region || '',
                customerType: customerType,
                contracts: new Set(),
                amount: 0,
                lastTransactionDate: null
            });
        }
        
        const customerInfo = customerMap.get(customer);
        customerInfo.contracts.add(item.contractName);
        customerInfo.amount += item.amount || 0;
        const date = parseDate(item.contractDate || '');
        if (!customerInfo.lastTransactionDate || (date && date > customerInfo.lastTransactionDate)) {
            customerInfo.lastTransactionDate = date;
        }
    });
    
    const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    customerData = Array.from(customerMap.values()).map(item => ({
        ...item,
        count: item.contracts.size,
        share: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0
    }));
    
    customerData.sort((a, b) => b.amount - a.amount);
    
    customerData.forEach((item, index) => { item.rank = index + 1; });
    
    console.log(`고객별 분석 완료: ${customerData.length}개 고객`);
}

// 지역별 데이터 분석
function analyzeRegionData(data) {
    console.log('=== 지역별 데이터 분석 ===');
    const regionMap = new Map();
    data.forEach(item => {
        const region = item.region || '';
        if (!regionMap.has(region)) {
            regionMap.set(region, {
                region: region,
                customerCount: new Set(),
                contracts: new Set(),
                amount: 0
            });
        }
        const regionInfo = regionMap.get(region);
        regionInfo.customerCount.add(item.customer);
        regionInfo.contracts.add(item.contractName);
        regionInfo.amount += item.amount || 0;
    });
    
    const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    regionData = Array.from(regionMap.values()).map(item => ({
        ...item,
        customerCount: item.customerCount.size,
        contractCount: item.contracts.size,
        share: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
        avgAmount: item.contracts.size > 0 ? item.amount / item.contracts.size : 0
    }));
    
    regionData.sort((a, b) => b.amount - a.amount);

    regionData.forEach((item, index) => { item.rank = index + 1; });

    console.log(`지역별 분석 완료: ${regionData.length}개 지역`);
}

// 수요기관별 데이터 분석
function analyzeTypeData(data) {
    console.log('=== 수요기관별 데이터 분석 ===');
    const typeMap = new Map();
    data.forEach(item => {
        const type = item.customerType || '지방자치단체';
        if (!typeMap.has(type)) {
            typeMap.set(type, {
                customerType: type,
                customerCount: new Set(),
                contracts: new Set(),
                amount: 0
            });
        }
        const typeInfo = typeMap.get(type);
        typeInfo.customerCount.add(item.customer);
        typeInfo.contracts.add(item.contractName);
        typeInfo.amount += item.amount || 0;
    });
    
    const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    typeData = Array.from(typeMap.values()).map(item => ({
        ...item,
        customerCount: item.customerCount.size,
        contractCount: item.contracts.size,
        share: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
        avgAmount: item.contracts.size > 0 ? item.amount / item.contracts.size : 0
    }));
    
    typeData.sort((a, b) => b.amount - a.amount);
    
    typeData.forEach((item, index) => { item.rank = index + 1; });

    console.log(`수요기관별 분석 완료: ${typeData.length}개 유형`);
}

// 요약 통계 업데이트
function updateSummaryStats(data) {
    const totalCustomers = new Set(data.map(item => item.customer)).size;
    const totalContracts = new Set(data.map(item => item.contractName)).size;
    const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const elements = {
        totalCustomers: $('totalCustomers'),
        totalContracts: $('totalContracts'),
        totalSales: $('totalSales')
    };
    
    if (elements.totalCustomers) elements.totalCustomers.textContent = formatNumber(totalCustomers) + '개';
    if (elements.totalContracts) elements.totalContracts.textContent = formatNumber(totalContracts) + '건';
    if (elements.totalSales) elements.totalSales.textContent = formatCurrency(totalAmount);
}

// 모든 테이블 렌더링
function renderAllTables() {
    renderCustomerTable();
    renderRegionTable();
    renderTypeTable();
}

// 고객별 테이블 렌더링
function renderCustomerTable() {
    const tbody = $('customerTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // ✨ 수정된 부분: customerData가 undefined일 경우 빈 배열로 처리
    const dataToRender = customerData ? [...customerData] : [];

    if (dataToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">고객 데이터가 없습니다.</td></tr>';
        return;
    }
    
    dataToRender.forEach((customer, index) => {
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
            <td class="text-center mobile-hidden">${customer.lastTransactionDate ? formatDate(customer.lastTransactionDate) : '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 지역별 테이블 렌더링
function renderRegionTable() {
    const tbody = $('regionTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (regionData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">지역 데이터가 없습니다.</td></tr>';
        return;
    }
    
    regionData.forEach((region, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${region.rank}</td>
            <td class="font-medium">${region.region}</td>
            <td class="text-center">${formatNumber(region.customerCount)}</td>
            <td class="text-center">${formatNumber(region.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(region.amount)}</td>
            <td class="text-right">${region.share.toFixed(1)}%</td>
            <td class="text-right tablet-hidden">${formatCurrency(Math.round(region.avgAmount))}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 수요기관별 테이블 렌더링
function renderTypeTable() {
    const tbody = $('typeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (typeData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">수요기관 데이터가 없습니다.</td></tr>';
        return;
    }
    
    typeData.forEach((type, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${type.rank}</td>
            <td class="font-medium">
                <span class="badge ${getCustomerTypeBadgeClass(type.customerType)}">${type.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(type.customerCount)}</td>
            <td class="text-center">${formatNumber(type.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(type.amount)}</td>
            <td class="text-right">${type.share.toFixed(1)}%</td>
            <td class="text-right tablet-hidden">${formatCurrency(Math.round(type.avgAmount))}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 수요기관 구분별 배지 클래스 반환
function getCustomerTypeBadgeClass(type) {
    switch (type) {
        case '지방자치단체': return 'badge-primary';
        case '군': return 'badge-success';
        case '공기업': return 'badge-warning';
        case '관공서': return 'badge-secondary';
        default: return 'badge-gray';
    }
}

// 로딩 상태 표시
function showLoadingState(show) {
    isLoading = show;
    const analyzeBtn = $('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = show;
        analyzeBtn.innerHTML = show 
            ? '<div class="loading-spinner"></div>분석 중...' 
            : `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
               </svg>분석`;
    }
    
    const statElements = ['totalCustomers', 'totalContracts', 'totalSales'];
    statElements.forEach(id => {
        const element = $(id);
        if (element) {
            element.textContent = show ? '로딩중...' : element.textContent;
        }
    });
}

// 알림 표시
function showAlert(message, type = 'info') {
    if (window.CommonUtils && CommonUtils.showAlert) {
        CommonUtils.showAlert(message, type);
    } else {
        alert(message);
    }
}

// ✨ 테이블 정렬 함수
function sortTable(tbodyId, columnIndex, type = 'string') {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const isAsc = tbody.dataset.sortColumn !== columnIndex.toString() || tbody.dataset.sortDirection === 'desc';
    
    const sortedRows = rows.sort((a, b) => {
        const aText = a.cells[columnIndex].textContent.trim();
        const bText = b.cells[columnIndex].textContent.trim();
        let comparison = 0;

        if (type === 'number') {
            const aNum = parseFloat(aText.replace(/[^\d.-]/g, ''));
            const bNum = parseFloat(bText.replace(/[^\d.-]/g, ''));
            if (!isNaN(aNum) && !isNaN(bNum)) {
                comparison = aNum - bNum;
            }
        } else {
            comparison = aText.localeCompare(bText, 'ko-KR');
        }
        
        return isAsc ? comparison : -comparison;
    });
    
    tbody.innerHTML = '';
    sortedRows.forEach(row => tbody.appendChild(row));
    
    tbody.dataset.sortColumn = columnIndex;
    tbody.dataset.sortDirection = isAsc ? 'asc' : 'desc';
}

// 전역 함수 노출
window.CustomerAnalysis = {
    analyzeCustomers: analyzeCustomers,
    generateSampleData: generateSampleData,
    sortTable: sortTable
};

console.log('=== CustomerAnalysis 모듈 로드 완료 ===');
