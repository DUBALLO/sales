// 거래처 집계 분석 JavaScript (v2.2 - 정렬 기능 추가)

// 전역 변수
let allGovernmentData = []; 
let currentFilteredData = [];
// 각 테이블별 정렬 상태 저장
let sortStates = {
    customer: { key: 'amount', direction: 'desc' },
    region: { key: 'amount', direction: 'desc' },
    type: { key: 'amount', direction: 'desc' }
};

document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState(true, '데이터 로딩 중');
    try {
        allGovernmentData = await loadAndParseProcurementData();
        populateFilters(allGovernmentData);
        setupEventListeners();
        await analyzeCustomers();
    } catch (error) {
        console.error("초기화 실패:", error);
        alert("페이지 초기화 중 오류가 발생했습니다. 개발자 콘솔을 확인해주세요.");
    } finally {
        showLoadingState(false, '분석');
    }
});

// 데이터 로드 및 파싱
async function loadAndParseProcurementData() {
    if (!window.sheetsAPI) throw new Error('sheets-api.js가 로드되지 않았습니다.');
    const rawData = await window.sheetsAPI.loadCSVData('procurement');
    return rawData
        .map(item => ({
            customer: (item['수요기관명'] || '').trim(),
            region: (item['수요기관지역'] || '').trim().split(' ')[0],
            agencyType: item['소관구분'] || '기타',
            amount: parseInt(String(item['공급금액']).replace(/[^\d]/g, '') || '0', 10),
            contractDate: item['기준일자'] || '',
            contractName: (item['계약명'] || '').trim(),
            product: (item['세부품명'] || '').trim(),
            supplier: (item['업체'] || '').trim()
        }))
        .filter(item => item.supplier === '두발로 주식회사' && item.customer && item.amount > 0);
}

// 필터 옵션 채우기
function populateFilters(data) {
    const regions = [...new Set(data.map(item => item.region).filter(Boolean))].sort();
    const agencyTypes = [...new Set(data.map(item => item.agencyType).filter(Boolean))].sort();
    
    const regionFilter = document.getElementById('regionFilter');
    const agencyTypeFilter = document.getElementById('agencyTypeFilter');

    regions.forEach(region => regionFilter.add(new Option(region, region)));
    agencyTypes.forEach(type => agencyTypeFilter.add(new Option(type, type)));
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.getElementById('analyzeBtn').addEventListener('click', analyzeCustomers);

    const tabs = ['customer', 'region', 'type'];
    tabs.forEach(tab => {
        const tabBtn = document.getElementById(`${tab}Tab`);
        if(tabBtn) tabBtn.addEventListener('click', () => showTab(tab));

        const exportBtn = document.getElementById(`export${capitalize(tab)}Btn`);
        const table = document.getElementById(`${tab}Table`);
        if(exportBtn && table) {
            exportBtn.addEventListener('click', () => CommonUtils.exportTableToCSV(table, `${tab}_data.csv`));
        }

        const printBtn = document.getElementById(`print${capitalize(tab)}Btn`);
        if(printBtn) printBtn.addEventListener('click', printCurrentView);
    });

    // 정렬 이벤트 리스너 추가
    ['customer', 'region', 'type'].forEach(tableName => {
        const table = document.getElementById(`${tableName}Table`);
        if (!table) return;
        table.querySelector('thead').addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (th && th.dataset.sortKey) {
                handleTableSort(tableName);
            }
        });
    });
}

// 테이블 정렬 핸들러
function handleTableSort(tableName, sortKey, sortType = 'string') {
    const sortState = sortStates[tableName];
    
    if (sortState.key === sortKey) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.key = sortKey;
        sortState.direction = 'desc';
    }
    
    // 테이블 다시 그리기
    if (tableName === 'customer') renderCustomerTable(currentFilteredData);
    else if (tableName === 'region') renderRegionTable(currentFilteredData);
    else if (tableName === 'type') renderTypeTable(currentFilteredData);
}


// 메인 분석 함수
async function analyzeCustomers() {
    showLoadingState(true, '분석 중');
    document.getElementById('customerDetailPanel').classList.add('hidden');
    document.getElementById('analysisPanel').classList.remove('hidden');

    try {
        const year = document.getElementById('analysisYear').value;
        const product = document.getElementById('productType').value;
        const region = document.getElementById('regionFilter').value;
        const agencyType = document.getElementById('agencyTypeFilter').value;

        currentFilteredData = allGovernmentData.filter(item => 
            (year === 'all' || (item.contractDate && item.contractDate.startsWith(year))) &&
            (product === 'all' || item.product === product) &&
            (region === 'all' || item.region === region) &&
            (agencyType === 'all' || item.agencyType === agencyType)
        );

        if (currentFilteredData.length === 0) {
            CommonUtils.showAlert('선택된 조건에 해당하는 데이터가 없습니다.', 'warning');
        }

        updateSummaryStats(currentFilteredData);
        renderCustomerTable(currentFilteredData);
        renderRegionTable(currentFilteredData);
        renderTypeTable(currentFilteredData);
        
    } catch (error) {
        console.error("분석 오류:", error);
        CommonUtils.showAlert("데이터 분석 중 오류가 발생했습니다.", 'error');
    } finally {
        showLoadingState(false, '분석');
    }
}

// 요약 통계 업데이트
function updateSummaryStats(data) {
    const totalCustomers = new Set(data.map(item => item.customer)).size;
    const totalContracts = new Set(data.map(item => item.contractName)).size;
    const totalSales = data.reduce((sum, item) => sum + item.amount, 0);

    document.getElementById('totalCustomers').textContent = CommonUtils.formatNumber(totalCustomers) + '개';
    document.getElementById('totalContracts').textContent = CommonUtils.formatNumber(totalContracts) + '건';
    document.getElementById('totalSales').textContent = CommonUtils.formatCurrency(totalSales);
}

// 데이터 정렬 공통 함수
function sortData(data, sortState, sortType = 'string') {
    const { key, direction } = sortState;
    data.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        let comparison = 0;

        if (sortType === 'number') {
            comparison = (valA || 0) - (valB || 0);
        } else {
            comparison = String(valA || '').localeCompare(String(valB || ''));
        }
        return direction === 'asc' ? comparison : -comparison;
    });
}


// 고객별 순위 테이블 렌더링
function renderCustomerTable(data) {
    const customerMap = new Map();
    data.forEach(item => {
        if (!customerMap.has(item.customer)) {
            customerMap.set(item.customer, { contracts: new Set(), amount: 0, region: item.region, agencyType: item.agencyType });
        }
        const info = customerMap.get(item.customer);
        info.contracts.add(item.contractName);
        info.amount += item.amount;
    });

    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    let customerData = Array.from(customerMap.entries())
        .map(([customer, { contracts, amount, region, agencyType }], index) => ({
            rank: index + 1, customer, region, agencyType,
            count: contracts.size,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }));

    sortData(customerData, sortStates.customer);

    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';
    if (customerData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
        return;
    }
    customerData.forEach((item) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-6 py-4 text-center">${item.rank}</td>
            <td class="px-6 py-4"><a href="#" class="text-blue-600 hover:underline" data-customer="${item.customer}">${item.customer}</a></td>
            <td class="px-6 py-4 text-center">${item.region}</td>
            <td class="px-6 py-4 text-center">${item.agencyType}</td>
            <td class="px-6 py-4 text-center">${CommonUtils.formatNumber(item.count)}</td>
            <td class="px-6 py-4 text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
            <td class="px-6 py-4 text-right">${item.share.toFixed(1)}%</td>
        `;
        row.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            showCustomerDetail(e.target.dataset.customer);
        });
    });
    updateSortIndicators('customerTable', sortStates.customer);
}

// 지역별 분석 테이블 렌더링
function renderRegionTable(data) {
    const regionMap = new Map();
    data.forEach(item => {
        if (!regionMap.has(item.region)) {
            regionMap.set(item.region, { customers: new Set(), contracts: new Set(), amount: 0 });
        }
        const info = regionMap.get(item.region);
        info.customers.add(item.customer);
        info.contracts.add(item.contractName);
        info.amount += item.amount;
    });
    
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    let regionData = Array.from(regionMap.entries())
        .map(([region, { customers, contracts, amount }], index) => ({
            rank: index + 1, region,
            customerCount: customers.size,
            contractCount: contracts.size,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }));
        
    sortData(regionData, sortStates.region);

    const tbody = document.getElementById('regionTableBody');
    tbody.innerHTML = '';
    if (regionData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
        return;
    }
    regionData.forEach((item) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-6 py-4 text-center">${item.rank}</td>
            <td class="px-6 py-4">${item.region}</td>
            <td class="px-6 py-4 text-center">${CommonUtils.formatNumber(item.customerCount)}</td>
            <td class="px-6 py-4 text-center">${CommonUtils.formatNumber(item.contractCount)}</td>
            <td class="px-6 py-4 text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
            <td class="px-6 py-4 text-right">${item.share.toFixed(1)}%</td>
        `;
    });
    updateSortIndicators('regionTable', sortStates.region);
}

// 소관기관별 분석 테이블 렌더링
function renderTypeTable(data) {
    const typeMap = new Map();
    data.forEach(item => {
        if (!typeMap.has(item.agencyType)) {
            typeMap.set(item.agencyType, { customers: new Set(), contracts: new Set(), amount: 0 });
        }
        const info = typeMap.get(item.agencyType);
        info.customers.add(item.customer);
        info.contracts.add(item.contractName);
        info.amount += item.amount;
    });

    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    let typeData = Array.from(typeMap.entries())
        .map(([agencyType, { customers, contracts, amount }], index) => ({
            rank: index + 1, agencyType,
            customerCount: customers.size,
            contractCount: contracts.size,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }));

    sortData(typeData, sortStates.type);

    const tbody = document.getElementById('typeTableBody');
    tbody.innerHTML = '';
    if (typeData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
        return;
    }
    typeData.forEach((item) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-6 py-4 text-center">${item.rank}</td>
            <td class="px-6 py-4">${item.agencyType}</td>
            <td class="px-6 py-4 text-center">${CommonUtils.formatNumber(item.customerCount)}</td>
            <td class="px-6 py-4 text-center">${CommonUtils.formatNumber(item.contractCount)}</td>
            <td class="px-6 py-4 text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
            <td class="px-6 py-4 text-right">${item.share.toFixed(1)}%</td>
        `;
    });
    updateSortIndicators('typeTable', sortStates.type);
}

// 고객 상세 내역 표시
function showCustomerDetail(customerName) {
    const detailPanel = document.getElementById('customerDetailPanel');
    const mainPanel = document.getElementById('analysisPanel');
    const customerData = currentFilteredData.filter(item => item.customer === customerName).sort((a, b) => new Date(b.contractDate) - new Date(a.contractDate));
    detailPanel.innerHTML = `...`; // 내용은 이전과 동일하므로 생략
    mainPanel.classList.add('hidden');
    detailPanel.classList.remove('hidden');
    // ... 버튼 이벤트 리스너 생략
}

// --- 유틸리티 함수 ---
function showLoadingState(isLoading, text) { /* 이전과 동일 */ }
function showTab(tabName) { /* 이전과 동일 */ }
function printCurrentView() { /* 이전과 동일 */ }
function capitalize(s) { /* 이전과 동일 */ }

// 정렬 화살표 업데이트 함수
function updateSortIndicators(tableId, sortState) {
    const table = document.getElementById(tableId);
    if (!table) return;
    table.querySelectorAll('thead th[data-sort-key]').forEach(th => {
        const span = th.querySelector('span');
        if (span) {
            span.textContent = span.textContent.replace(/ [▲▼]$/, '');
            if (th.dataset.sortKey === sortState.key) {
                span.textContent += sortState.direction === 'asc' ? ' ▲' : ' ▼';
            }
        }
    });
}
