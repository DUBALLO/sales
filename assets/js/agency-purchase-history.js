// agency-purchase-history.js

// 전역 변수
let allData = []; // 전체 원본 데이터
let currentFilteredData = []; // 현재 필터가 적용된 데이터
let rankSortState = { column: 'amount', direction: 'desc' };
let purchaseDetailSortState = { column: 'amount', direction: 'desc' };
let contractDetailSortState = { column: 'amount', direction: 'desc' };

// 유틸리티 함수
const $ = (id) => document.getElementById(id);
// common.js 에 formatCurrency, formatNumber가 있다고 가정합니다.

/**
 * 페이지 초기화 함수
 */
document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState(true, '데이터 로딩 및 지역 목록 생성 중...');
    try {
        allData = await loadAndParseData();
        populateRegionFilter(allData);
        setInitialFilters();
        
        $('analyzeBtn').addEventListener('click', analyzeData);
        $('refreshBtn').addEventListener('click', refreshData);

        await analyzeData(); // 초기 데이터 분석 실행
    } catch (error) {
        console.error("초기화 실패:", error);
        showAlert("페이지 초기화 중 오류가 발생했습니다.", 'error');
    } finally {
        showLoadingState(false);
    }
});

/**
 * 데이터 로드 및 파싱
 */
async function loadAndParseData() {
    if (!window.sheetsAPI) {
        throw new Error('sheets-api.js가 로드되지 않았습니다.');
    }
    const rawData = await window.sheetsAPI.loadCSVData('procurement');
    return rawData.map(item => ({
        agency: (item['수요기관명'] || '').trim(),
        supplier: (item['업체'] || '').trim(),
        region: (item['수요기관지역'] || '').trim(),
        agencyType: item['소관구분'] || '기타',
        product: (item['세부품명'] || '').trim(),
        amount: parseInt(String(item['공급금액']).replace(/[^\d]/g, '') || '0', 10),
        date: item['기준일자'] || '',
        contractName: (item['계약명'] || '').trim()
    })).filter(item => item.agency && item.supplier && item.amount > 0);
}

/**
 * 지역 필터 옵션 채우기
 */
function populateRegionFilter(data) {
    const regionSet = new Set();
    data.forEach(item => {
        let mainRegion = item.region.split(' ')[0];
        if (mainRegion === '전라북도') mainRegion = '전북특별자치도';
        if (mainRegion === '강원도') mainRegion = '강원특별자치도';
        if(mainRegion) regionSet.add(mainRegion);
    });
    const regions = [...regionSet].sort((a, b) => a.localeCompare(b));
    const regionFilter = $('regionFilter');
    regionFilter.innerHTML = '<option value="all">전체</option>';
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionFilter.appendChild(option);
    });
}

/**
 * 초기 필터 값 설정
 */
function setInitialFilters() {
    $('analysisYear').value = '2025';
    $('productFilter').value = '보행매트';
    if ($('regionFilter').querySelector('option[value="경기도"]')) {
        $('regionFilter').value = '경기도';
    }
}

/**
 * 분석 시작
 */
function analyzeData() {
    showLoadingState(true, '데이터 분석 중...');
    $('agencyDetailPanel').classList.add('hidden');
    $('agencyRankPanel').classList.remove('hidden');
    
    const year = $('analysisYear').value;
    const product = $('productFilter').value;
    const region = $('regionFilter').value;

    currentFilteredData = allData.filter(item => {
        const itemYear = item.date ? new Date(item.date).getFullYear().toString() : '';
        const itemRegion = item.region.split(' ')[0].replace('전라북도', '전북특별자치도').replace('강원도', '강원특별자치도');

        const yearMatch = (year === 'all') || (itemYear === year);
        const productMatch = (product === 'all') || (item.product === product);
        const regionMatch = (region === 'all') || (itemRegion === region);

        return yearMatch && productMatch && regionMatch;
    });

    renderAgencyRankPanel(currentFilteredData);
    showLoadingState(false);
}

/**
 * 데이터 새로고침
 */
async function refreshData() {
    showLoadingState(true, '최신 데이터로 새로고침 중...');
    try {
        await window.sheetsAPI.refreshCache();
        allData = await loadAndParseData();
        populateRegionFilter(allData);
        await analyzeData();
        showAlert('데이터를 성공적으로 새로고침했습니다.', 'success');
    } catch (error) {
        console.error("새로고침 실패:", error);
        showAlert("데이터 새로고침 중 오류가 발생했습니다.", 'error');
    } finally {
        showLoadingState(false);
    }
}

/**
 * 수요기관 순위 패널 렌더링
 */
function renderAgencyRankPanel(data) {
    const panel = $('agencyRankPanel');
    panel.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900">수요기관 구매 순위</h3>
                <button id="printRankBtn" class="btn btn-secondary btn-sm"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v4h14z"></path></svg>인쇄</button>
            </div>
            <div class="overflow-x-auto">
                <table id="agencyRankTable" class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">순위</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="agency">수요기관명</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="region">지역</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="agencyType">소관구분</th>
                            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="contractCount">거래건수</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="amount">총 구매액</th>
                        </tr>
                    </thead>
                    <tbody id="agencyRankBody"></tbody>
                </table>
            </div>
        </div>`;

    const agencyMap = new Map();
    data.forEach(item => {
        if (!agencyMap.has(item.agency)) {
            agencyMap.set(item.agency, { 
                amount: 0, 
                contracts: new Set(),
                region: item.region,
                agencyType: item.agencyType
            });
        }
        const agencyInfo = agencyMap.get(item.agency);
        agencyInfo.amount += item.amount;
        agencyInfo.contracts.add(item.contractName);
    });

    let rankedAgencies = [...agencyMap.entries()]
        .map(([agency, { amount, contracts, region, agencyType }]) => ({ 
            agency, amount, contractCount: contracts.size, region, agencyType 
        }));

    const sortAndRenderRank = () => {
        sortData(rankedAgencies, rankSortState.column, rankSortState.direction);
        const tbody = $('agencyRankBody');
        tbody.innerHTML = '';
        if (rankedAgencies.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">표시할 데이터가 없습니다.</td></tr>`;
        } else {
            rankedAgencies.forEach((item, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4"><a href="#" data-agency="${item.agency}" class="text-blue-600 hover:underline">${item.agency}</a></td>
                    <td class="px-6 py-4">${item.region}</td>
                    <td class="px-6 py-4">${item.agencyType}</td>
                    <td class="px-6 py-4 text-center">${formatNumber(item.contractCount)}</td>
                    <td class="px-6 py-4 text-right font-medium whitespace-nowrap">${formatCurrency(item.amount)}</td>
                `;
                row.querySelector('a').addEventListener('click', (e) => {
                    e.preventDefault();
                    showAgencyDetail(e.target.dataset.agency);
                });
                tbody.appendChild(row);
            });
        }
    };

    panel.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (rankSortState.column === column) {
                rankSortState.direction = rankSortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                rankSortState.column = column;
                rankSortState.direction = 'desc';
            }
            sortAndRenderRank();
        });
    });

    sortAndRenderRank();
    $('printRankBtn').addEventListener('click', () => printPanel(panel));
}

/**
 * 수요기관 상세 패널 렌더링
 */
function showAgencyDetail(agencyName) {
    const detailPanel = $('agencyDetailPanel');
    detailPanel.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg"><strong class="font-bold">${agencyName}</strong> <span class="font-normal">상세 내역</span></h3>
                <div class="flex items-center space-x-2">
                    <button id="printDetailBtn" class="btn btn-secondary btn-sm"><svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v4h14z"></path></svg>인쇄</button>
                    <button id="backToListBtn" class="btn btn-secondary btn-sm">목록으로</button>
                </div>
            </div>
            <div class="border-b border-gray-200">
                <nav class="-mb-px flex space-x-8" id="detailTabs">
                    <button data-tab="purchase" class="analysis-tab active">상세 구매 내역</button>
                    <button data-tab="contract" class="analysis-tab">계약 상세</button>
                </nav>
            </div>
            <div id="purchaseDetail" class="tab-content mt-4"></div>
            <div id="contractDetail" class="tab-content mt-4 hidden"></div>
        </div>`;
    
    const agencyData = currentFilteredData.filter(item => item.agency === agencyName);

    renderPurchaseDetail(agencyData);
    renderContractDetail(agencyData);

    $('detailTabs').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const tabName = e.target.dataset.tab;
            $('detailTabs').querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            detailPanel.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            $(tabName + 'Detail').classList.remove('hidden');
        }
    });

    $('backToListBtn').addEventListener('click', () => {
        detailPanel.classList.add('hidden');
        $('agencyRankPanel').classList.remove('hidden');
    });
    
    $('printDetailBtn').addEventListener('click', () => printPanel(detailPanel));

    $('agencyRankPanel').classList.add('hidden');
    detailPanel.classList.remove('hidden');
}

function renderPurchaseDetail(agencyData) {
    const container = $('purchaseDetail');
    container.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">순위</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="supplier">업체명</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="contractCount">거래건수</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="amount">구매금액</th>
                </tr>
            </thead>
            <tbody id="purchaseDetailBody"></tbody>
        </table>`;
    
    const supplierMap = new Map();
    agencyData.forEach(item => {
        if (!supplierMap.has(item.supplier)) {
            supplierMap.set(item.supplier, { amount: 0, contracts: new Set() });
        }
        const info = supplierMap.get(item.supplier);
        info.amount += item.amount;
        info.contracts.add(item.contractName);
    });

    let data = [...supplierMap.entries()].map(([supplier, { amount, contracts }]) => ({
        supplier, amount, contractCount: contracts.size
    }));
    
    const sortAndRender = () => {
        sortData(data, purchaseDetailSortState.column, purchaseDetailSortState.direction);
        const tbody = $('purchaseDetailBody');
        tbody.innerHTML = '';
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 text-center">${index + 1}</td>
                <td class="px-6 py-4">${item.supplier}</td>
                <td class="px-6 py-4 text-center">${formatNumber(item.contractCount)}</td>
                <td class="px-6 py-4 text-right font-medium whitespace-nowrap">${formatCurrency(item.amount)}</td>
            `;
            tbody.appendChild(row);
        });
    };
    
    container.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (purchaseDetailSortState.column === column) {
                purchaseDetailSortState.direction = purchaseDetailSortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                purchaseDetailSortState.column = column;
                purchaseDetailSortState.direction = 'desc';
            }
            sortAndRender();
        });
    });
    
    sortAndRender();
}

function renderContractDetail(agencyData) {
    const container = $('contractDetail');
    container.innerHTML = `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">순번</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="contractName">계약명</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="supplier">업체명</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="date">거래일자</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="amount">공급금액</th>
                </tr>
            </thead>
            <tbody id="contractDetailBody"></tbody>
        </table>`;
    
    let data = [...agencyData];
    
    const sortAndRender = () => {
        sortData(data, contractDetailSortState.column, contractDetailSortState.direction);
        const tbody = $('contractDetailBody');
        tbody.innerHTML = '';
        data.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 text-center">${index + 1}</td>
                <td class="px-6 py-4">${item.contractName}</td>
                <td class="px-6 py-4">${item.supplier}</td>
                <td class="px-6 py-4 text-center">${item.date}</td>
                <td class="px-6 py-4 text-right font-medium whitespace-nowrap">${formatCurrency(item.amount)}</td>
            `;
            tbody.appendChild(row);
        });
    };

    container.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            if (contractDetailSortState.column === column) {
                contractDetailSortState.direction = contractDetailSortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                contractDetailSortState.column = column;
                contractDetailSortState.direction = 'desc';
            }
            sortAndRender();
        });
    });

    sortAndRender();
}

// 헬퍼 함수들
function sortData(data, column, direction) {
    data.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        if (column === 'date') {
            const dateA = new Date(valA).getTime() || 0;
            const dateB = new Date(valB).getTime() || 0;
            return direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

        if (typeof valA === 'string') {
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return direction === 'asc' ? valA - valB : valB - valA;
        }
    });
}

function showLoadingState(isLoading, text = '분석 중...') {
    const button = $('analyzeBtn');
    if (button) {
        button.disabled = isLoading;
        button.innerHTML = isLoading ? `<div class="loading-spinner"></div>${text}` : `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>분석`;
    }
}

function showAlert(message, type = 'info') {
    if (window.CommonUtils && CommonUtils.showAlert) {
        window.CommonUtils.showAlert(message, type);
    } else { alert(message); }
}

function printPanel(panel) {
    if (panel) {
        panel.classList.add('printable-area');
        window.print();
        setTimeout(() => {
            panel.classList.remove('printable-area');
        }, 500);
    } else {
        showAlert('인쇄할 내용이 없습니다.', 'warning');
    }
}

