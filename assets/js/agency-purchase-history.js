// agency-purchase-history.js (v3.1 - 평균 대비 컬럼 및 차트/툴팁 개선)

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
    // ▼▼▼ '평균 대비' 컬럼 헤더 추가 ▼▼▼
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
                        <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="contractCount" data-sort-type="number"><span>거래건수</span></th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="amount" data-sort-type="number"><span>총 구매액</span></th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort-key="vsAvg" data-sort-type="number"><span>평균 대비</span></th>
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
    
    // ▼▼▼ 평균 대비 증감률 계산 로직 추가 ▼▼▼
    const totalPurchaseAmount = rankedAgencies.reduce((sum, agency) => sum + agency.amount, 0);
    const averageAmount = rankedAgencies.length > 0 ? totalPurchaseAmount / rankedAgencies.length : 0;
    rankedAgencies.forEach(agency => {
        agency.vsAvg = averageAmount > 0 ? ((agency.amount / averageAmount) - 1) * 100 : 0;
    });

    sortData(rankedAgencies, sortStates.rank);
    rankedAgencies.forEach((item, index) => item.rank = index + 1);

    const tbody = document.getElementById('agencyRankBody');
    tbody.innerHTML = '';
    if (rankedAgencies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-3 text-center py-8 text-gray-500">표시할 데이터가 없습니다.</td></tr>`;
    } else {
        rankedAgencies.forEach(item => {
            const row = tbody.insertRow();
            const diffText = item.vsAvg === 0 ? '-' : (item.vsAvg > 0 ? `▲ ${item.vsAvg.toFixed(1)}%` : `▼ ${Math.abs(item.vsAvg).toFixed(1)}%`);
            const diffColor = item.vsAvg > 0 ? 'text-red-500' : 'text-blue-500';
            // ▼▼▼ 평균 대비 td 추가 ▼▼▼
            row.innerHTML = `
                <td class="px-4 py-3 text-center">${item.rank}</td>
                <td class="px-4 py-3"><a href="#" data-agency="${item.agency}" class="text-blue-600 hover:underline">${item.agency}</a></td>
                <td class="px-4 py-3">${item.region}</td>
                <td class="px-4 py-3 text-center">${CommonUtils.formatNumber(item.contractCount)}</td>
                <td class="px-4 py-3 text-right font-medium whitespace-nowrap">${CommonUtils.formatCurrency(item.amount)}</td>
                <td class="px-4 py-3 text-right font-medium ${diffColor}">${diffText}</td>
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
    // ... (이전과 동일)
}
function renderPurchaseDetail(agencyData) {
    // ... (이전과 동일)
}
function renderContractDetail(agencyData) {
    // ... (이전과 동일)
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
                <table id="trendSummaryTable" class="min-w-full text-sm"><tbody></tbody></table>
            </div>
        </div>`;

    const selectedYearValue = document.getElementById('analysisYear').value;
    const selectedYear = selectedYearValue === 'all' ? new Date().getFullYear() : parseInt(selectedYearValue);
    const lastFiveYears = Array.from({length: 5}, (_, i) => selectedYear - i).sort();
    const yearlyData = allData.filter(d => d.agency === agencyName && d.date && lastFiveYears.includes(new Date(d.date).getFullYear()));
    
    // ▼▼▼ 구매 건수(계약 기준)도 함께 집계하도록 수정 ▼▼▼
    const salesByYear = {};
    lastFiveYears.forEach(year => {
        salesByYear[year] = { amount: 0, contracts: new Set() };
    });
    yearlyData.forEach(d => {
        const year = new Date(d.date).getFullYear();
        if (salesByYear[year]) {
            salesByYear[year].amount += d.amount;
            salesByYear[year].contracts.add(d.contractName);
        }
    });

    if(chartInstance) chartInstance.destroy();
    const ctx = document.getElementById('trendChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        // ▼▼▼ 차트 타입을 'line'으로 변경 ▼▼▼
        type: 'line',
        data: {
            labels: lastFiveYears.map(String),
            datasets: [{
                label: '연간 구매액',
                data: lastFiveYears.map(year => salesByYear[year].amount),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                fill: true,
                tension: 0.1
            }]
        },
        // ▼▼▼ 툴팁에 구매 건수도 표시되도록 수정 ▼▼▼
        options: {
            scales: { y: { beginAtZero: true, ticks: { callback: value => CommonUtils.formatCurrency(value) } } },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const year = context.label;
                            const amount = context.parsed.y;
                            const count = salesByYear[year].contracts.size;
                            return [
                                `구매액: ${CommonUtils.formatCurrency(amount)}`,
                                `구매건수: ${count}건`
                            ];
                        }
                    }
                }
            }
        }
    });

    const yearAmounts = lastFiveYears.map(year => salesByYear[year].amount);
    const actualTransactionYears = yearAmounts.filter(amount => amount > 0);
    const totalAmount = actualTransactionYears.reduce((sum, amount) => sum + amount, 0);
    const avgAmount = actualTransactionYears.length > 0 ? totalAmount / actualTransactionYears.length : 0;
    
    let peakAmount = Math.max(...yearAmounts);
    let peakYear = peakAmount > 0 ? lastFiveYears[yearAmounts.indexOf(peakAmount)] : '-';
    
    const selectedYearAmount = salesByYear[selectedYear] ? salesByYear[selectedYear].amount : 0;
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
    // ... (이전과 동일)
}
function sortData(data, sortState) {
    // ... (이전과 동일)
}
function updateSortIndicators(tableId, sortState) {
    // ... (이전과 동일)
}
function showLoadingState(isLoading, text = '분석 중...') {
    // ... (이전과 동일)
}
function printPanel(panel) {
    // ... (이전과 동일)
}
