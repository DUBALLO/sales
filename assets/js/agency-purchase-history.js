// 수요기관 구매내역 분석 JavaScript

// 전역 변수
let purchaseData = [];
let supplierData = [];
let productData = [];
let regionData = [];
let isLoading = false;

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

// 메인 분석 함수
async function analyzeData() {
    try {
        console.log('=== 수요기관 구매내역 분석 시작 ===');
        
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
        const searchTerm = $('searchInput')?.value?.toLowerCase() || '';
        
        console.log('분석 조건 - 연도:', selectedYear, '검색어:', searchTerm);
        
        let filteredData = [...purchaseData];
        
        if (selectedYear !== 'all') {
            const year = parseInt(selectedYear);
            filteredData = filteredData.filter(item => {
                const date = parseDate(item.purchaseDate || '');
                return date && date.getFullYear() === year;
            });
        }
        
        if (searchTerm) {
            filteredData = filteredData.filter(item => 
                (item.agency || '').toLowerCase().includes(searchTerm)
            );
        }
        
        analyzeSupplierData(filteredData);
        analyzeProductData(filteredData);
        analyzeRegionData(filteredData);

        updateSummaryStats(filteredData);
        renderAllTables();
        
        console.log('=== 수요기관 구매내역 분석 완료 ===');
        
        const message = useRealData ? 
            `실제 데이터 분석 완료 (${purchaseData.length}건)` :
            '샘플 데이터로 분석 완료';
        showAlert(message, useRealData ? 'success' : 'warning');
        
    } catch (error) {
        console.error('분석 오류:', error);
        showAlert('분석 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

// 실제 데이터 파싱 함수 (컬럼명 교정)
function parseRealData(rawData) {
    console.log('=== 실제 데이터 파싱 시작 ===');
    
    purchaseData = [];
    
    rawData.forEach(item => {
        try {
            const baseData = {
                agency: (item['수요기관명'] || '').trim(),
                supplier: (item['업체'] || '').trim(),
                region: (item['수요기관지역'] || '').trim(),
                product: (item['세부품명'] || '').trim(),
                amount: parseAmount(item['공급금액'] || '0'),
                purchaseDate: item['기준일자'] || '',
                contractName: (item['계약명'] || '').trim()
            };
            
            if (!baseData.agency || baseData.agency === '수요기관명 없음' || baseData.amount <= 0) return;
            
            purchaseData.push(baseData);
            
        } catch (error) {
            console.warn(`데이터 파싱 오류 (행):`, error.message);
        }
    });
    
    console.log('데이터 파싱 완료');
    console.log(`유효한 데이터: ${purchaseData.length}건`);
}

// 샘플 데이터 생성
function generateSampleData() {
    console.log('=== 샘플 데이터 생성 시작 ===');
    
    purchaseData = [
        {
            agency: '경기도 양주시', supplier: '두발로 주식회사', region: '경기도', product: '보행매트',
            amount: 15000000, purchaseDate: '2024-01-15', contractName: '천보산 산림욕장 보완사업'
        },
        {
            agency: '의정부시', supplier: '두발로 주식회사', region: '경기도', product: '보행매트',
            amount: 28000000, purchaseDate: '2024-02-10', contractName: '의정부시 녹지조성사업'
        },
        {
            agency: '서울시 한강사업본부', supplier: '한솔기술', region: '서울특별시', product: '식생매트',
            amount: 32000000, purchaseDate: '2024-02-05', contractName: '서울시 한강공원 보행로 개선'
        },
        {
            agency: '부천시청', supplier: '두발로 주식회사', region: '경기도', product: '논슬립',
            amount: 45000000, purchaseDate: '2024-03-12', contractName: '부천시 중앙공원 조성사업'
        },
        {
            agency: '춘천시 공원과', supplier: '산하건설', region: '강원도', product: '보행매트',
            amount: 22000000, purchaseDate: '2024-03-20', contractName: '춘천시 공원 조성사업'
        }
    ];
    
    console.log('샘플 데이터 생성 완료');
}

// 업체별 데이터 분석
function analyzeSupplierData(data) {
    console.log('=== 업체별 데이터 분석 ===');
    const supplierMap = new Map();
    data.forEach(item => {
        const supplier = item.supplier || '';
        if (!supplierMap.has(supplier)) {
            supplierMap.set(supplier, {
                supplier: supplier,
                contracts: new Set(),
                amount: 0
            });
        }
        
        const supplierInfo = supplierMap.get(supplier);
        supplierInfo.contracts.add(item.contractName);
        supplierInfo.amount += item.amount || 0;
    });
    
    supplierData = Array.from(supplierMap.values()).map(item => ({
        ...item,
        contractCount: item.contracts.size
    }));
    
    supplierData.sort((a, b) => b.amount - a.amount);
    
    supplierData.forEach((item, index) => { item.rank = index + 1; });
    
    console.log(`업체별 분석 완료: ${supplierData.length}개 업체`);
}

// 품목별 데이터 분석
function analyzeProductData(data) {
    const productMap = new Map();
    data.forEach(item => {
        const product = item.product || '';
        if (!productMap.has(product)) {
            productMap.set(product, {
                product: product,
                contracts: new Set(),
                amount: 0
            });
        }
        const productInfo = productMap.get(product);
        productInfo.contracts.add(item.contractName);
        productInfo.amount += item.amount || 0;
    });
    
    productData = Array.from(productMap.values()).map(item => ({
        ...item,
        contractCount: item.contracts.size
    }));
    productData.sort((a, b) => b.amount - a.amount);
    
    productData.forEach((item, index) => { item.rank = index + 1; });
}

// 지역별 데이터 분석
function analyzeRegionData(data) {
    const regionMap = new Map();
    data.forEach(item => {
        const region = item.region || '';
        if (!regionMap.has(region)) {
            regionMap.set(region, {
                region: region,
                supplierCount: new Set(),
                contractCount: 0,
                amount: 0
            });
        }
        const regionInfo = regionMap.get(region);
        regionInfo.supplierCount.add(item.supplier);
        regionInfo.contractCount++;
        regionInfo.amount += item.amount || 0;
    });
    
    regionData = Array.from(regionMap.values()).map(item => ({
        ...item,
        supplierCount: item.supplierCount.size
    }));
    regionData.sort((a, b) => b.amount - a.amount);
    
    regionData.forEach((item, index) => { item.rank = index + 1; });
}

// 요약 통계 업데이트
function updateSummaryStats(data) {
    const totalSuppliers = new Set(data.map(item => item.supplier)).size;
    const totalContracts = new Set(data.map(item => item.contractName)).size;
    const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const elements = {
        totalSuppliers: $('totalSuppliers'),
        totalContracts: $('totalContracts'),
        totalSales: $('totalSales')
    };
    
    if (elements.totalSuppliers) elements.totalSuppliers.textContent = formatNumber(totalSuppliers) + '개';
    if (elements.totalContracts) elements.totalContracts.textContent = formatNumber(totalContracts) + '건';
    if (elements.totalSales) elements.totalSales.textContent = formatCurrency(totalAmount);
}

// 모든 테이블 렌더링
function renderAllTables() {
    renderSupplierTable();
    renderProductTable();
    renderRegionTable();
}

// 업체별 테이블 렌더링
function renderSupplierTable() {
    const tbody = $('supplierTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const dataToRender = [...supplierData];
    
    if (dataToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">업체 데이터가 없습니다.</td></tr>';
        return;
    }
    
    dataToRender.forEach((supplier, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${supplier.rank}</td>
            <td class="font-medium">${supplier.supplier}</td>
            <td class="text-center">${formatNumber(supplier.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(supplier.amount)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// 품목별 테이블 렌더링
function renderProductTable() {
    const tbody = $('productTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (productData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">품목 데이터가 없습니다.</td></tr>';
        return;
    }
    
    productData.forEach((product, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${product.rank}</td>
            <td class="font-medium">${product.product}</td>
            <td class="text-center">${formatNumber(product.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(product.amount)}</td>
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
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-500">지역 데이터가 없습니다.</td></tr>';
        return;
    }
    
    regionData.forEach((region, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${region.rank}</td>
            <td class="font-medium">${region.region}</td>
            <td class="text-center">${formatNumber(region.supplierCount)}</td>
            <td class="text-center">${formatNumber(region.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(region.amount)}</td>
        `;
        
        tbody.appendChild(row);
    });
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
    
    const statElements = ['totalSuppliers', 'totalContracts', 'totalSales'];
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

// 테이블 정렬 함수
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
window.AgencyAnalysis = {
    analyzeData: analyzeData,
    sortTable: sortTable
};

console.log('=== AgencyAnalysis 모듈 로드 완료 ===');
