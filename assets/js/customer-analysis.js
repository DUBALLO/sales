// 거래처 집계 분석 JavaScript (v2.4 - 최종 수정)

// 전역 변수
let allGovernmentData = []; 
let currentFilteredData = [];
let sortStates = {
    customer: { key: 'amount', direction: 'desc', type: 'number' },
    region: { key: 'amount', direction: 'desc', type: 'number' },
    type: { key: 'amount', direction: 'desc', type: 'number' }
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
        alert("페이지 초기화 중 오류가 발생했습니다. 개발자 콘솔을 확인해주세요: " + error.message);
    } finally {
        showLoadingState(false, '분석');
    }
});

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
    ['customer', 'region', 'type'].forEach(tableName => {
        const table = document.getElementById(`${tableName}Table`);
        if (!table) return;
        table.querySelector('thead').addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (th && th.dataset.sortKey) {
                handleTableSort(tableName, th.dataset.sortKey, th.dataset.sortType);
            }
        });
    });
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
    if (tableName === 'customer') renderCustomerTable(currentFilteredData);
    else if (tableName === 'region') renderRegionTable(currentFilteredData);
    else if (tableName === 'type') renderTypeTable(currentFilteredData);
}

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

function updateSummaryStats(data) {
    const totalCustomers = new Set(data.map(item => item.customer)).size;
    const totalContracts = new Set(data.map(item => item.contractName)).size;
    const totalSales = data.reduce((sum, item) => sum + item.amount, 0);

    document.getElementById('totalCustomers').textContent = CommonUtils.formatNumber(totalCustomers) + '개';
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
            comparison = String(valA || '').localeCompare(String(valB || ''));
        }
        return direction === 'asc' ? comparison : -comparison;
    });
}

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
        .map(([customer, { contracts, amount, region, agencyType }]) => ({
            customer, region, agencyType,
            count: contracts.size,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }));
    sortData(customerData, sortStates.customer);
    customerData.forEach((item, index) => item.rank = index + 1);
    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';
    if (customerData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-3 text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
        updateSortIndicators('customerTable', sortStates.customer);
        return;
    }
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
        .map(([region, { customers, contracts, amount }]) => ({
            region,
            customerCount: customers.size,
            contractCount: contracts.size,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }));
    sortData(regionData, sortStates.region);
    regionData.forEach((item, index) => item.rank = index + 1);
    const tbody = document.getElementById('regionTableBody');
    tbody.innerHTML = '';
    if (regionData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-3 text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
        updateSortIndicators('regionTable', sortStates.region);
        return;
    }
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
        .map(([agencyType, { customers, contracts, amount }]) => ({
            agencyType,
            customerCount: customers.size,
            contractCount: contracts.size,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }));
    sortData(typeData, sortStates.type);
    typeData.forEach((item, index) => item.rank = index + 1);
    const tbody = document.getElementById('typeTableBody');
    tbody.innerHTML = '';
    if (typeData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-3 text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
        updateSortIndicators('typeTable', sortStates.type);
        return;
    }
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

function showCustomerDetail(customerName) {
    const detailPanel = document.getElementById('customerDetailPanel');
    const mainPanel = document.getElementById('analysisPanel');
    const customerData = currentFilteredData.filter(item => item.customer === customerName).sort((a, b) => new Date(b.contractDate) - new Date(a.contractDate));
    detailPanel.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg"><strong class="font-bold">${customerName}</strong> <span class="font-normal">상세 계약 내역</span></h3>
                <div class="flex items-center space-x-2 no-print">
                    <button id="printDetailBtn" class="btn btn-secondary btn-sm">인쇄</button>
                    <button id="backToListBtn" class="btn btn-secondary btn-sm">목록으로</button>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 data-table">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약명</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">품목</th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">계약일</th>
                            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">매출액</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customerData.length > 0 ? customerData.map(item => `
                            <tr>
                                <td class="px-4 py-3">${item.contractName}</td>
                                <td class="px-4 py-3">${item.product}</td>
                                <td class="px-4 py-3 text-center">${CommonUtils.formatDate(item.contractDate, 'short')}</td>
                                <td class="px-4 py-3 text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" class="px-4 py-3 text-center py-8 text-gray-500">상세 계약 내역이 없습니다.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    mainPanel.classList.add('hidden');
    detailPanel.classList.remove('hidden');
    document.getElementById('backToListBtn').addEventListener('click', () => {
        detailPanel.classList.add('hidden');
        mainPanel.classList.remove('hidden');
    });
    document.getElementById('printDetailBtn').addEventListener('click', () => {
        const detailContent = detailPanel.querySelector('.p-6');
        detailContent.classList.add('printable-area');
        window.print();
        detailContent.classList.remove('printable-area');
    });
}

function showLoadingState(isLoading, text) {
    const btn = document.getElementById('analyzeBtn');
    if (btn) {
        btn.disabled = isLoading;
        const svgIcon = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>';
        btn.innerHTML = isLoading 
            ? `<div class="loading-spinner mr-2"></div> ${text}...`
            : `${svgIcon}${text}`;
    }
}

function showTab(tabName) {
    document.querySelectorAll('.analysis-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(`${tabName}Panel`).classList.remove('hidden');
}

function printCurrentView() {
    const printableContent = document.getElementById('analysisPanel');
    if (printableContent) {
        printableContent.classList.add('printable-area');
        window.print();
        setTimeout(() => {
            printableContent.classList.remove('printable-area');
        }, 500);
    }
}

function capitalize(s) {
    if (typeof s !== 'string' || s.length === 0) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
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
