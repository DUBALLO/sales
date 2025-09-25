// agency-purchase-history.js (v2.1 - 오류 방어 로직 추가)

// 전역 변수
let allData = [];
let currentFilteredData = [];
let sortStates = {
    rank: { key: 'amount', direction: 'desc', type: 'number' },
    purchase: { key: 'amount', direction: 'desc', type: 'number' },
    contract: { key: 'amount', direction: 'desc', type: 'number' }
};

document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState(true, '데이터 로딩 중...');
    try {
        // --- 이벤트 리스너를 데이터 로드보다 먼저 설정 ---
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', analyzeData);
        } else {
            console.error("'analyzeBtn' 버튼을 찾을 수 없습니다. HTML 파일이 최신 버전인지 확인해주세요.");
            // 버튼이 없으면 분석을 시작할 수 없으므로 여기서 중단
            showLoadingState(false);
            return;
        }

        allData = await loadAndParseData();
        populateFilters(allData);
        await analyzeData();
    } catch (error) {
        console.error("초기화 실패:", error);
        CommonUtils.showAlert("페이지 초기화 중 오류가 발생했습니다: " + error.message, 'error');
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

    if (regionFilter) {
        regions.forEach(region => regionFilter.add(new Option(region, region)));
    }
    if (agencyTypeFilter) {
        agencyTypes.forEach(type => agencyTypeFilter.add(new Option(type, type)));
    }
}

function analyzeData() {
    showLoadingState(true, '데이터 분석 중...');
    const detailPanel = document.getElementById('agencyDetailPanel');
    const rankPanel = document.getElementById('agencyRankPanel');
    if(detailPanel) detailPanel.classList.add('hidden');
    if(rankPanel) rankPanel.classList.remove('hidden');
    
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
    if (!panel) return;
    
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
    if (!tbody) return;

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
            const link = row.querySelector('a');
            if (link) link.addEventListener('click', (e) => {
                e.preventDefault();
                showAgencyDetail(e.target.dataset.agency);
            });
        });
    }

    updateSortIndicators('agencyRankTable', sortStates.rank);
    
    const rankTableHead = document.querySelector('#agencyRankTable thead');
    if(rankTableHead) rankTableHead.addEventListener('click', e => {
        const th = e.target.closest('th');
        if (th && th.dataset.sortKey) {
            handleTableSort('rank', th.dataset.sortKey, th.dataset.sortType);
            renderAgencyRankPanel(currentFilteredData);
        }
    });

    const printBtn = document.getElementById('printRankBtn');
    if(printBtn) printBtn.addEventListener('click', () => printPanel(panel));
    
    const exportBtn = document.getElementById('exportRankBtn');
    if(exportBtn) exportBtn.addEventListener('click', () => CommonUtils.exportTableToCSV(document.getElementById('agencyRankTable'), '수요기관_구매순위.csv'));
}

// ... 이하 나머지 함수들은 이전과 동일하게 유지됩니다.
// showAgencyDetail, renderPurchaseDetail, renderContractDetail, handleTableSort, sortData, updateSortIndicators, showLoadingState, printPanel
