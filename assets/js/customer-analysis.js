// customer-analysis.js

// 전역 변수
let allGovernmentData = []; 
let currentFilteredData = [];
let sortStates = {
    customer: { key: 'amount', direction: 'desc', type: 'number' },
    region: { key: 'amount', direction: 'desc', type: 'number' },
    type: { key: 'amount', direction: 'desc', type: 'number' }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        allGovernmentData = await loadAndParseProcurementData();
        populateFilters(allGovernmentData);
        setupEventListeners();
        await analyzeCustomers();
    } catch (error) {
        console.error("초기화 실패:", error);
        alert("페이지 초기화 중 오류가 발생했습니다: " + error.message);
    }
});

async function loadAndParseProcurementData() {
    if (!window.sheetsAPI) throw new Error('sheets-api.js가 로드되지 않았습니다.');
    const rawData = await window.sheetsAPI.loadCSVData('procurement');
    return rawData
        .map(item => ({
            customer: (item['수요기관명'] || '').trim(),
            regionFull: (item['수요기관지역'] || '').trim(),
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

function populateFilters(data) {
    const regions = [...new Set(data.map(item => item.region).filter(Boolean))].sort();
    const agencyTypes = [...new Set(data.map(item => item.agencyType).filter(Boolean))].sort();
    const regionFilter = document.getElementById('regionFilter');
    const agencyTypeFilter = document.getElementById('agencyTypeFilter');
    regions.forEach(region => regionFilter.add(new Option(region, region)));
    agencyTypes.forEach(type => agencyTypeFilter.add(new Option(type, type)));
}

function setupEventListeners() {
    document.getElementById('analyzeBtn').addEventListener('click', analyzeCustomers);
    const tabs = ['customer', 'region', 'type'];
    tabs.forEach(tab => {
        document.getElementById(`${tab}Tab`)?.addEventListener('click', () => showTab(tab));
        
        const exportBtn = document.getElementById(`export${capitalize(tab)}Btn`);
        const table = document.getElementById(`${tab}Table`);
        if(exportBtn && table) {
            exportBtn.addEventListener('click', () => CommonUtils.exportTableToCSV(table, `관급매출_${tab}.csv`));
        }

        const printBtn = document.getElementById(`print${capitalize(tab)}Btn`);
        if(printBtn) printBtn.addEventListener('click', printCurrentView);
    });

    ['customer', 'region', 'type'].forEach(tableName => {
        const table = document.getElementById(`${tableName}Table`);
        table?.querySelector('thead').addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (th && th.dataset.sortKey) {
                handleTableSort(tableName, th.dataset.sortKey, th.dataset.sortType);
            }
        });
    });
}

function showTab(tabName) {
    document.querySelectorAll('.analysis-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(`${tabName}Tab`)?.classList.add('active');
    document.getElementById(`${tabName}Panel`)?.classList.remove('hidden');
}

function handleTableSort(tableName, sortKey, sortType = 'string') {
    const sortState = sortStates[tableName];
    if (sortState.key === sortKey) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.key = sortKey;
        sortState.direction = 'desc';
    }
    sortState.type = sortType;
    
    // 정렬 후 해당 탭의 테이블 다시 렌더링
    if (tableName === 'customer') renderCustomerTable(currentFilteredData);
    else if (tableName === 'region') renderRegionTable(currentFilteredData);
    else if (tableName === 'type') renderTypeTable(currentFilteredData);
}

async function analyzeCustomers() {
    document.getElementById('customerDetailPanel').classList.add('hidden');
    document.getElementById('analysisPanel').classList.remove('hidden');

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
}

function updateSummaryStats(data) {
    const totalCustomers = new Set(data.map(item => item.customer)).size;
    const totalContracts = data.length;
    const totalSales = data.reduce((sum, item) => sum + item.amount, 0);

    document.getElementById('totalCustomers').textContent = CommonUtils.formatNumber(totalCustomers) + '곳';
    document.getElementById('totalContracts').textContent = CommonUtils.formatNumber(totalContracts) + '건';
    document.getElementById('totalSales').textContent = CommonUtils.formatCurrency(totalSales);
}

function sortData(data, sortState) {
    const { key, direction, type } = sortState;
    data.sort((a, b) => {
        const valA = a[key];
        const valB = b[key];
        let comparison = 0;
        if (type === 'number') {
            comparison = (Number(valA) || 0) - (Number(valB) || 0);
        } else {
            comparison = String(valA || '').localeCompare(String(valB || ''), 'ko');
        }
        return direction === 'asc' ? comparison : -comparison;
    });
}

function renderCustomerTable(data) {
    const customerMap = new Map();
    data.forEach(item => {
        if (!customerMap.has(item.customer)) {
            customerMap.set(item.customer, { contracts: [], amount: 0, region: item.regionFull, agencyType: item.agencyType });
        }
        const info = customerMap.get(item.customer);
        info.contracts.push(item);
        info.amount += item.amount;
    });

    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    let customerData = Array.from(customerMap.entries())
        .map(([customer, { contracts, amount, region, agencyType }]) => ({
            customer, region, agencyType,
            count: contracts.length,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }));
        
    sortData(customerData, sortStates.customer);
    customerData.forEach((item, index) => item.rank = index + 1);

    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
    if (customerData.length === 0) return;

    tbody.innerHTML = '';
    customerData.forEach((item) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-4 py-3 text-center">${item.rank}</td>
            <td class="px-4 py-3"><a href="#" class="text-blue-600 hover:underline" data-customer="${item.customer}">${item.customer}</a></td>
            <td class="px-4 py-3 text-center">${item.region}</td>
            <td class="px-4 py-3 text-center">${item.agencyType}</td>
            <td class="px-4 py-3 text-center">${CommonUtils.formatNumber(item.count)}</td>
            <td class="px-4 py-3 text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
            <td class="px-4 py-3 text-right">${item.share.toFixed(1)}%</td>
        `;
        row.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            showCustomerDetail(e.target.dataset.customer);
        });
    });
    updateSortIndicators('customerTable', sortStates.customer);
}

function renderRegionTable(data) {
    // ... (This function remains correct)
    const regionMap = new Map();
    data.forEach(item => {
        if (!regionMap.has(item.region)) {
            regionMap.set(item.region, { customers: new Set(), contracts: [], amount: 0 });
        }
        const info = regionMap.get(item.region);
        info.customers.add(item.customer);
        info.contracts.push(item);
        info.amount += item.amount;
    });
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    let regionData = Array.from(regionMap.entries())
        .map(([region, { customers, contracts, amount }]) => ({
            region,
            customerCount: customers.size,
            contractCount: contracts.length,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }));

    sortData(regionData, sortStates.region);
    regionData.forEach((item, index) => item.rank = index + 1);

    const tbody = document.getElementById('regionTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
    if (regionData.length === 0) return;
    
    tbody.innerHTML = '';
    regionData.forEach((item) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-4 py-3 text-center">${item.rank}</td>
            <td class="px-4 py-3">${item.region}</td>
            <td class="px-4 py-3 text-center">${CommonUtils.formatNumber(item.customerCount)}</td>
            <td class="px-4 py-3 text-center">${CommonUtils.formatNumber(item.contractCount)}</td>
            <td class="px-4 py-3 text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
            <td class="px-4 py-3 text-right">${item.share.toFixed(1)}%</td>
        `;
    });
    updateSortIndicators('regionTable', sortStates.region);
}

function renderTypeTable(data) {
    // ... (This function remains correct)
    const typeMap = new Map();
    data.forEach(item => {
        if (!typeMap.has(item.agencyType)) {
            typeMap.set(item.agencyType, { customers: new Set(), contracts: [], amount: 0 });
        }
        const info = typeMap.get(item.agencyType);
        info.customers.add(item.customer);
        info.contracts.push(item);
        info.amount += item.amount;
    });
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    let typeData = Array.from(typeMap.entries())
        .map(([agencyType, { customers, contracts, amount }]) => ({
            agencyType,
            customerCount: customers.size,
            contractCount: contracts.length,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }));
        
    sortData(typeData, sortStates.type);
    typeData.forEach((item, index) => item.rank = index + 1);

    const tbody = document.getElementById('typeTableBody');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
    if(typeData.length === 0) return;

    tbody.innerHTML = '';
    typeData.forEach((item) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-4 py-3 text-center">${item.rank}</td>
            <td class="px-4 py-3">${item.agencyType}</td>
            <td class="px-4 py-3 text-center">${CommonUtils.formatNumber(item.customerCount)}</td>
            <td class="px-4 py-3 text-center">${CommonUtils.formatNumber(item.contractCount)}</td>
            <td class="px-4 py-3 text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
            <td class="px-4 py-3 text-right">${item.share.toFixed(1)}%</td>
        `;
    });
    updateSortIndicators('typeTable', sortStates.type);
}

// ▼▼▼ [추가] 누락되었던 showCustomerDetail 함수 ▼▼▼
function showCustomerDetail(customerName) {
    const detailPanel = document.getElementById('customerDetailPanel');
    const customerData = currentFilteredData.filter(item => item.customer === customerName);

    // 상세 내역 UI 생성
    let detailHtml = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900">${customerName} - 상세 거래 내역</h3>
                <button id="backToListBtn" class="btn btn-secondary btn-sm">목록으로</button>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 data-table">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약일</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약명</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">품목</th>
                            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">공급금액</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customerData.sort((a,b) => new Date(b.contractDate) - new Date(a.contractDate)).map(item => `
                            <tr>
                                <td class="px-4 py-3">${item.contractDate}</td>
                                <td class="px-4 py-3">${item.contractName}</td>
                                <td class="px-4 py-3">${item.product}</td>
                                <td class="px-4 py-3 text-right">${CommonUtils.formatCurrency(item.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    detailPanel.innerHTML = detailHtml;
    detailPanel.classList.remove('hidden');
    document.getElementById('analysisPanel').classList.add('hidden');

    // '목록으로' 버튼 이벤트
    document.getElementById('backToListBtn').addEventListener('click', () => {
        detailPanel.classList.add('hidden');
        document.getElementById('analysisPanel').classList.remove('hidden');
    });
}

// ▼▼▼ [추가] 누락되었던 printCurrentView 함수 ▼▼▼
function printCurrentView() {
    // 현재 활성화된 탭 패널을 찾음
    const activePanel = document.querySelector('.tab-panel:not(.hidden)');
    if (activePanel) {
        // 인쇄용 클래스 추가 및 인쇄 실행
        activePanel.classList.add('printable-area');
        window.print();
        // 인쇄 후 클래스 제거
        activePanel.classList.remove('printable-area');
    } else {
        CommonUtils.showAlert('인쇄할 탭이 활성화되어 있지 않습니다.', 'warning');
    }
}

function capitalize(s) {
    if (typeof s !== 'string') return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

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
