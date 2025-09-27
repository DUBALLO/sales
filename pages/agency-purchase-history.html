// agency-purchase-history.js (v3 - 연도별 추이 탭 추가)

// 전역 변수
let allData = [];
let currentFilteredData = [];
let chartInstance = null;
let sortStates = {
    rank: { key: 'amount', direction: 'desc', type: 'number' },
    purchase: { key: 'amount', direction: 'desc', type: 'number' },
    contract: { key: 'amount', direction: 'desc', type: 'number' }
};

document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState(true, '데이터 로딩 중...');
    try {
        allData = await loadAndParseData();
        populateFilters(allData);
        document.getElementById('analyzeBtn').addEventListener('click', analyzeData);
        await analyzeData();
    } catch (error) {
        console.error("초기화 실패:", error);
        CommonUtils.showAlert("페이지 초기화 중 오류가 발생했습니다.", 'error');
    } finally {
        showLoadingState(false);
    }
});

async function loadAndParseData() {
    if (!window.sheetsAPI) throw new Error('sheets-api.js가 로드되지 않았습니다.');
    const rawData = await window.sheetsAPI.loadCSVData('procurement');
    return rawData.map(item => ({
        agency: (item['수요기관명'] || '').trim(),
        supplier: (item['업체'] || '').trim(),
        region: (item['수요기관지역'] || '').trim().split(' ')[0],
        agencyType: item['소관구분'] || '기타',
        product: (item['세부품명'] || '').trim(),
        amount: parseInt(String(item['공급금액']).replace(/[^\d]/g, '') || '0', 10),
        date: item['기준일자'] || '',
        contractName: (item['계약명'] || '').trim()
    })).filter(item => item.agency && item.supplier && item.amount > 0);
}

function populateFilters(data) {
    const regions = [...new Set(data.map(item => item.region).filter(Boolean))].sort();
    const agencyTypes = [...new Set(data.map(item => item.agencyType).filter(Boolean))].sort();
    const regionFilter = document.getElementById('regionFilter');
    const agencyTypeFilter = document.getElementById('agencyTypeFilter');
    regions.forEach(region => regionFilter.add(new Option(region, region)));
    agencyTypes.forEach(type => agencyTypeFilter.add(new Option(type, type)));
    
    if (regionFilter.querySelector('option[value="경기도"]')) {
        regionFilter.value = '경기도';
    }
}

function analyzeData() {
    showLoadingState(true, '데이터 분석 중...');
    document.getElementById('agencyDetailPanel').classList.add('hidden');
    document.getElementById('agencyRankPanel').classList.remove('hidden');
    const year = document.getElementById('analysisYear').value;
    const product = document.getElementById('productFilter').value;
    const region = document.getElementById('regionFilter').value;
    const agencyType = document.getElementById('agencyTypeFilter').value;
    currentFilteredData = allData.filter(item => 
        (year === 'all' || (item.date && item.date.startsWith(year))) &&
        (product === 'all' || item.product === product) &&
        (region === 'all' || item.region === region) &&
        (agencyType === 'all' || item.agencyType === agencyType)
    );
    renderAgencyRankPanel(currentFilteredData);
    showLoadingState(false);
}

function renderAgencyRankPanel(data) {
    const panel = document.getElementById('agencyRankPanel');
    panel.innerHTML = `
        <div class="p-6 printable-area">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900">수요기관 구매 순위</h3>
                <div class="flex space-x-2 no-print">
                    <button id="printRankBtn" class="btn btn-secondary btn-sm">인쇄</button>
                    <button id="exportRankBtn" class="btn btn-secondary btn-sm">CSV 내보내기</button>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table id="agencyRankTable" class="min-w-full divide-y divide-gray-200 data-table">
                    <thead class="bg-gray-50"><tr>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="rank" data-sort-type="number"><span>순위</span></th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="agency" data-sort-type="string"><span>수요기관명</span></th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="region" data-sort-type="string"><span>지역</span></th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="agencyType" data-sort-type="string"><span>소관구분</span></th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="contractCount" data-sort-type="number"><span>거래건수</span></th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="amount" data-sort-type="number"><span>총 구매액</span></th>
                    </tr></thead>
                    <tbody id="agencyRankBody"></tbody>
                </table>
            </div>
        </div>`;

    const agencyMap = new Map();
    data.forEach(item => {
        if (!agencyMap.has(item.agency)) {
            agencyMap.set(item.agency, { amount: 0, contracts: new Set(), region: item.region, agencyType: item.agencyType });
        }
        const agencyInfo = agencyMap.get(item.agency);
        agencyInfo.amount += item.amount;
        agencyInfo.contracts.add(item.contractName);
    });
    let rankedAgencies = [...agencyMap.entries()].map(([agency, { amount, contracts, region, agencyType }]) => ({
        agency, amount, contractCount: contracts.size, region, agencyType 
    }));
    sortData(rankedAgencies, sortStates.rank);
    rankedAgencies.forEach((item, index) => item.rank = index + 1);

    const tbody = document.getElementById('agencyRankBody');
    tbody.innerHTML = '';
    if (rankedAgencies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-3 text-center py-8 text-gray-500">표시할 데이터가 없습니다.</td></tr>`;
    } else {
        rankedAgencies.forEach(item => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td class="px-4 py-3 text-center">${item.rank}</td>
                <td class="px-4 py-3"><a href="#" data-agency="${item.agency}" class="text-blue-600 hover:underline">${item.agency}</a></td>
                <td class="px-4 py-3">${item.region}</td>
                <td class="px-4 py-3">${item.agencyType}</td>
                <td class="px-4 py-3 text-center">${CommonUtils.formatNumber(item.contractCount)}</td>
                <td class="px-4 py-3 text-right font-medium whitespace-nowrap">${CommonUtils.formatCurrency(item.amount)}</td>
            `;
            row.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                showAgencyDetail(e.target.dataset.agency);
            });
        });
    }
    updateSortIndicators('agencyRankTable', sortStates.rank);
    document.getElementById('agencyRankTable').querySelector('thead').addEventListener('click', e => {
        const th = e.target.closest('th');
        if (th && th.dataset.sortKey) {
            handleTableSort('rank', th.dataset.sortKey, th.dataset.sortType);
            renderAgencyRankPanel(currentFilteredData);
        }
    });
    document.getElementById('printRankBtn').addEventListener('click', () => printPanel(panel));
    document.getElementById('exportRankBtn').addEventListener('click', () => CommonUtils.exportTableToCSV(document.getElementById('agencyRankTable'), '수요기관_구매순위.csv'));
}

function showAgencyDetail(agencyName) {
    const detailPanel = document.getElementById('agencyDetailPanel');
    detailPanel.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg"><strong class="font-bold">${agencyName}</strong> <span class="font-normal">상세 내역</span></h3>
                <div class="flex items-center space-x-2 no-print">
                    <button id="printDetailBtn" class="btn btn-secondary btn-sm">인쇄</button>
                    <button id="exportDetailBtn" class="btn btn-secondary btn-sm">CSV 내보내기</button>
                    <button id="backToListBtn" class="btn btn-secondary btn-sm">목록으로</button>
                </div>
            </div>
            <div class="border-b border-gray-200 no-print">
                <nav class="-mb-px flex space-x-8" id="detailTabs">
                    <button data-tab="purchase" class="analysis-tab active">구매 내역</button>
                    <button data-tab="contract" class="analysis-tab">계약 상세</button>
                    <button data-tab="trend" class="analysis-tab">연도별 추이</button>
                </nav>
            </div>
            <div id="purchaseDetail" class="tab-content mt-4 printable-area"></div>
            <div id="contractDetail" class="tab-content mt-4 printable-area hidden"></div>
            <div id="trendDetail" class="tab-content mt-4 printable-area hidden"></div>
        </div>`;
    
    const agencyData = currentFilteredData.filter(item => item.agency === agencyName);
    renderPurchaseDetail(agencyData);
    renderContractDetail(agencyData);
    renderTrendDetail(agencyName);

    document.getElementById('detailTabs').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const tabName = e.target.dataset.tab;
            document.getElementById('detailTabs').querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            detailPanel.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById(tabName + 'Detail').classList.remove('hidden');
        }
    });
    document.getElementById('backToListBtn').addEventListener('click', () => {
        detailPanel.classList.add('hidden');
        document.getElementById('agencyRankPanel').classList.remove('hidden');
    });
    document.getElementById('printDetailBtn').addEventListener('click', () => printPanel(detailPanel.querySelector('.tab-content:not(.hidden)')));
    document.getElementById('exportDetailBtn').addEventListener('click', () => {
        const activeTab = detailPanel.querySelector('.tab-content:not(.hidden)');
        const table = activeTab.querySelector('table');
        if (table) {
             CommonUtils.exportTableToCSV(table, `${agencyName}_상세내역.csv`);
        } else {
             CommonUtils.showAlert('내보낼 데이터 테이블이 없습니다.', 'warning');
        }
    });
    document.getElementById('agencyRankPanel').classList.add('hidden');
    detailPanel.classList.remove('hidden');
}

function renderPurchaseDetail(agencyData) {
    const container = document.getElementById('purchaseDetail');
    container.innerHTML = `
        <h4 class="text-md font-semibold mb-2">수요기관 구매 내역</h4>
        <table id="purchaseDetailTable" class="min-w-full divide-y divide-gray-200 data-table">
            <thead class="bg-gray-50"><tr>
                <th class="w-1/12 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="rank" data-sort-type="number"><span>순위</span></th>
                <th class="w-5/12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="supplier" data-sort-type="string"><span>업체명</span></th>
                <th class="w-2/12 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="contractCount" data-sort-type="number"><span>거래건수</span></th>
                <th class="w-2/12 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="share" data-sort-type="number"><span>점유율</span></th>
                <th class="w-2/12 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="amount" data-sort-type="number"><span>구매금액</span></th>
            </tr></thead>
            <tbody id="purchaseDetailBody"></tbody>
        </table>`;
    
    const supplierMap = new Map();
    agencyData.forEach(item => {
        if (!supplierMap.has(item.supplier)) supplierMap.set(item.supplier, { amount: 0, contracts: new Set() });
        const info = supplierMap.get(item.supplier);
        info.amount += item.amount;
        info.contracts.add(item.contractName);
    });

    const agencyTotalAmount = agencyData.reduce((sum, item) => sum + item.amount, 0);
    let data = [...supplierMap.entries()].map(([supplier, { amount, contracts }]) => ({ 
        supplier, 
        amount, 
        contractCount: contracts.size,
        share: agencyTotalAmount > 0 ? (amount / agencyTotalAmount) * 100 : 0
    }));

    sortData(data, sortStates.purchase);
    data.forEach((item, index) => item.rank = index + 1);
    
    const tbody = document.getElementById('purchaseDetailBody');
    tbody.innerHTML = '';
    data.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-4 py-3 text-center">${item.rank}</td>
            <td class="px-4 py-3">${item.supplier}</td>
            <td class="px-4 py-3 text-center">${CommonUtils.formatNumber(item.contractCount)}</td>
            <td class="px-4 py-3 text-right font-medium">${item.share.toFixed(1)}%</td>
            <td class="px-4 py-3 text-right font-medium whitespace-nowrap">${CommonUtils.formatCurrency(item.amount)}</td>
        `;
    });

    updateSortIndicators('purchaseDetailTable', sortStates.purchase);
    document.getElementById('purchaseDetailTable').querySelector('thead').addEventListener('click', e => {
        const th = e.target.closest('th');
        if (th && th.dataset.sortKey) {
            handleTableSort('purchase', th.dataset.sortKey, th.dataset.sortType);
            renderPurchaseDetail(agencyData);
        }
    });
}

function renderContractDetail(agencyData) {
    const container = document.getElementById('contractDetail');
    container.innerHTML = `
        <h4 class="text-md font-semibold mb-2">계약별 상세 내역</h4>
        <table id="contractDetailTable" class="min-w-full divide-y divide-gray-200 data-table">
            <thead class="bg-gray-50"><tr>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="rank" data-sort-type="number"><span>순번</span></th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="contractName" data-sort-type="string"><span>계약명</span></th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="supplier" data-sort-type="string"><span>업체명</span></th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="date" data-sort-type="string"><span>거래일자</span></th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="amount" data-sort-type="number"><span>공급금액</span></th>
            </tr></thead>
            <tbody id="contractDetailBody"></tbody>
        </table>`;
    
    let data = [...agencyData];
    sortData(data, sortStates.contract);
    data.forEach((item, index) => item.rank = index + 1);
    
    const tbody = document.getElementById('contractDetailBody');
    tbody.innerHTML = '';
    data.forEach(item => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="px-4 py-3 text-center">${item.rank}</td>
            <td class="px-4 py-3">${item.contractName}</td>
            <td class="px-4 py-3">${item.supplier}</td>
            <td class="px-4 py-3 text-center">${item.date}</td>
            <td class="px-4 py-3 text-right font-medium whitespace-nowrap">${CommonUtils.formatCurrency(item.amount)}</td>
        `;
    });

    updateSortIndicators('contractDetailTable', sortStates.contract);
    document.getElementById('contractDetailTable').querySelector('thead').addEventListener('click', e => {
        const th = e.target.closest('th');
        if (th && th.dataset.sortKey) {
            handleTableSort('contract', th.dataset.sortKey, th.dataset.sortType);
            renderContractDetail(agencyData);
        }
    });
}

function renderTrendDetail(agencyName) {
    const container = document.getElementById('trendDetail');
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 bg-white p-4 rounded-lg shadow">
                <h4 class="text-md font-semibold mb-2">최근 5년간 구매 추이</h4>
                <canvas id="trendChart"></canvas>
            </div>
            <div class="md:col-span-1 bg-white p-4 rounded-lg shadow">
                <h4 class="text-md font-semibold mb-2">주요 지표 요약</h4>
                <table id="trendSummaryTable" class="min-w-full text-sm">
                    <tbody></tbody>
                </table>
            </div>
        </div>`;

    const selectedYearValue = document.getElementById('analysisYear').value;
    const selectedYear = selectedYearValue === 'all' ? new Date().getFullYear() : parseInt(selectedYearValue);
    const lastFiveYears = Array.from({length: 5}, (_, i) => selectedYear - i).sort();
    const yearlyData = allData.filter(d => d.agency === agencyName && d.date && lastFiveYears.includes(new Date(d.date).getFullYear()));
    
    const salesByYear = {};
    lastFiveYears.forEach(year => salesByYear[year] = 0);
    yearlyData.forEach(d => {
        const year = new Date(d.date).getFullYear();
        if (salesByYear.hasOwnProperty(year)) {
            salesByYear[year] += d.amount;
        }
    });

    if(chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('trendChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: lastFiveYears.map(String),
            datasets: [{
                label: '연간 구매액',
                data: Object.values(salesByYear),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: { scales: { y: { beginAtZero: true, ticks: { callback: value => CommonUtils.formatCurrency(value) } } } }
    });

    const actualTransactionYears = Object.values(salesByYear).filter(amount => amount > 0);
    const totalAmount = actualTransactionYears.reduce((sum, amount) => sum + amount, 0);
    const avgAmount = actualTransactionYears.length > 0 ? totalAmount / actualTransactionYears.length : 0;
    
    let peakAmount = 0;
    let peakYear = '-';
    for (const year in salesByYear) {
        if (salesByYear[year] > peakAmount) {
            peakAmount = salesByYear[year];
            peakYear = year;
        }
    }

    const selectedYearAmount = salesByYear[selectedYear] || 0;
    const vsAvgRatio = avgAmount > 0 ? ((selectedYearAmount / avgAmount) - 1) * 100 : 0;
    const diffText = vsAvgRatio === 0 ? '-' : (vsAvgRatio > 0 ? `▲ ${vsAvgRatio.toFixed(1)}%` : `▼ ${Math.abs(vsAvgRatio).toFixed(1)}%`);
    const diffColor = vsAvgRatio > 0 ? 'text-red-500' : 'text-blue-500';

    const summaryBody = document.getElementById('trendSummaryTable').querySelector('tbody');
    summaryBody.innerHTML = `
        <tr class="border-b"><td class="py-2 font-semibold">연평균 구매액</td><td class="py-2 text-right">${CommonUtils.formatCurrency(avgAmount)}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">최고 구매 연도</td><td class="py-2 text-right">${peakYear}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">최고 구매액</td><td class="py-2 text-right">${CommonUtils.formatCurrency(peakAmount)}</td></tr>
        <tr class="border-b"><td class="py-2 font-semibold">${selectedYear}년 구매액</td><td class="py-2 text-right">${CommonUtils.formatCurrency(selectedYearAmount)}</td></tr>
        <tr><td class="py-2 font-semibold">평균 대비 증감</td><td class="py-2 text-right font-bold ${diffColor}">${diffText}</td></tr>
    `;
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
}

function sortData(data, sortState) {
    const { key, direction, type } = sortState;
    data.sort((a, b) => {
        const valA = a[key], valB = b[key];
        let comparison = 0;
        if (type === 'number') comparison = (Number(valA) || 0) - (Number(valB) || 0);
        else comparison = String(valA || '').localeCompare(String(valB || ''));
        return direction === 'asc' ? comparison : -comparison;
    });
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

function showLoadingState(isLoading, text = '분석 중...') {
    const button = document.getElementById('analyzeBtn');
    if (button) {
        button.disabled = isLoading;
        const svgIcon = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>';
        button.innerHTML = isLoading ? `<div class="loading-spinner mr-2"></div> ${text}...` : `${svgIcon}분석`;
    }
}

function printPanel(panel) {
    if (panel) {
        panel.classList.add('printing-now');
        window.print();
        setTimeout(() => {
            panel.classList.remove('printing-now');
        }, 500);
    } else {
        CommonUtils.showAlert('인쇄할 내용이 없습니다.', 'warning');
    }
}
