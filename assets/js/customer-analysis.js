// 거래처 집계 분석 JavaScript (v2 - 2025-09-25 요청사항 반영)

// 전역 변수
let allGovernmentData = []; // 최초 로드된 전체 데이터
let currentFilteredData = []; // 현재 필터가 적용된 데이터

// DOMContentLoaded 이벤트 핸들러
document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState(true, '데이터 로딩 중...');
    try {
        allGovernmentData = await loadAndParseProcurementData();
        populateFilters(allGovernmentData);
        setupEventListeners();
        await analyzeCustomers();
    } catch (error) {
        console.error("초기화 실패:", error);
        CommonUtils.showAlert("페이지 초기화 중 오류 발생: " + error.message, 'error');
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
            region: (item['수요기관지역'] || '').trim().split(' ')[0], // 광역단체 기준
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
    const regions = [...new Set(data.map(item => item.region))].sort();
    const agencyTypes = [...new Set(data.map(item => item.agencyType))].sort();
    
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
        document.getElementById(`${tab}Tab`).addEventListener('click', () => showTab(tab));
        document.getElementById(`export${capitalize(tab)}Btn`).addEventListener('click', () => CommonUtils.exportTableToCSV(document.getElementById(`${tab}Table`), `${tab}_data.csv`));
        document.getElementById(`print${capitalize(tab)}Btn`).addEventListener('click', printCurrentView);
    });
}

// 메인 분석 함수
async function analyzeCustomers() {
    showLoadingState(true, '분석 중...');
    document.getElementById('customerDetailPanel').classList.add('hidden'); // 상세 패널 숨기기
    document.getElementById('analysisPanel').classList.remove('hidden');   // 메인 패널 보이기

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
    const customerData = Array.from(customerMap.entries())
        .map(([customer, { contracts, amount, region, agencyType }]) => ({
            customer, region, agencyType,
            count: contracts.size,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);

    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';
    if (customerData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
        return;
    }
    customerData.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td><a href="#" class="text-blue-600 hover:underline" data-customer="${item.customer}">${item.customer}</a></td>
            <td class="text-center">${item.region}</td>
            <td class="text-center">${item.agencyType}</td>
            <td class="text-center">${CommonUtils.formatNumber(item.count)}</td>
            <td class="text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
            <td class="text-right">${item.share.toFixed(1)}%</td>
        `;
        row.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            showCustomerDetail(e.target.dataset.customer);
        });
    });
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
    const regionData = Array.from(regionMap.entries())
        .map(([region, { customers, contracts, amount }]) => ({
            region,
            customerCount: customers.size,
            contractCount: contracts.size,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);
        
    const tbody = document.getElementById('regionTableBody');
    tbody.innerHTML = '';
    if (regionData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
        return;
    }
    regionData.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${item.region}</td>
            <td class="text-center">${CommonUtils.formatNumber(item.customerCount)}</td>
            <td class="text-center">${CommonUtils.formatNumber(item.contractCount)}</td>
            <td class="text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
            <td class="text-right">${item.share.toFixed(1)}%</td>
        `;
    });
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
    const typeData = Array.from(typeMap.entries())
        .map(([agencyType, { customers, contracts, amount }]) => ({
            agencyType,
            customerCount: customers.size,
            contractCount: contracts.size,
            amount,
            share: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);

    const tbody = document.getElementById('typeTableBody');
    tbody.innerHTML = '';
    if (typeData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>';
        return;
    }
    typeData.forEach((item, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${item.agencyType}</td>
            <td class="text-center">${CommonUtils.formatNumber(item.customerCount)}</td>
            <td class="text-center">${CommonUtils.formatNumber(item.contractCount)}</td>
            <td class="text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
            <td class="text-right">${item.share.toFixed(1)}%</td>
        `;
    });
}

// 고객 상세 내역 표시
function showCustomerDetail(customerName) {
    const detailPanel = document.getElementById('customerDetailPanel');
    const mainPanel = document.getElementById('analysisPanel');
    
    const customerData = currentFilteredData.filter(item => item.customer === customerName);
    
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
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">계약명</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">품목</th>
                            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">계약일</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">매출액</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customerData.map(item => `
                            <tr>
                                <td>${item.contractName}</td>
                                <td>${item.product}</td>
                                <td class="text-center">${CommonUtils.formatDate(item.contractDate)}</td>
                                <td class="text-right font-medium">${CommonUtils.formatCurrency(item.amount)}</td>
                            </tr>
                        `).join('')}
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
        detailPanel.classList.add('printable-area');
        window.print();
        detailPanel.classList.remove('printable-area');
    });
}


// --- 유틸리티 함수 ---
function showLoadingState(isLoading, text) {
    const btn = document.getElementById('analyzeBtn');
    if (btn) {
        btn.disabled = isLoading;
        btn.innerHTML = isLoading 
            ? `<div class="loading-spinner"></div> ${text}...`
            : `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>${text}`;
    }
}

function showTab(tabName) {
    document.querySelectorAll('.analysis-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`${tabName}Tab`).classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
    document.getElementById(`${tabName}Panel`).classList.remove('hidden');
}

function printCurrentView() {
    const activePanel = document.querySelector('.tab-panel:not(.hidden)');
    if (activePanel) {
        document.getElementById('analysisPanel').classList.add('printable-area');
        window.print();
        document.getElementById('analysisPanel').classList.remove('printable-area');
    }
}

function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
