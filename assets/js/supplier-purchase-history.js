// 업체별 구매내역 분석 JavaScript

// 전역 변수
let purchaseData = [];
let supplierRankingData = [];
let allProcurementData = [];
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
    if (typeof amount !== 'number' || isNaN(amount)) return '-';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) return '-';
    return new Intl.NumberFormat('ko-KR').format(number);
}

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

function parseAmount(amountStr) {
    if (!amountStr) return 0;
    const cleanAmount = amountStr.toString().replace(/[^\d]/g, '');
    return parseInt(cleanAmount) || 0;
}

// 메인 분석 함수
async function analyzeData() {
    try {
        console.log('=== 업체별 구매내역 분석 시작 ===');
        showLoadingState(true);
        let useRealData = false;
        
        if (window.sheetsAPI) {
            try {
                console.log('sheets-api를 통한 실제 데이터 로드 시도...');
                allProcurementData = await window.sheetsAPI.loadCSVData('procurement');
                if (allProcurementData && allProcurementData.length > 0) {
                    console.log('sheets-api에서 로드된 원시 데이터:', allProcurementData.length, '건');
                    parseRealData(allProcurementData);
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
        let filteredData = [...purchaseData];
        
        if (selectedYear !== 'all') {
            const year = parseInt(selectedYear);
            filteredData = filteredData.filter(item => {
                const date = parseDate(item.purchaseDate || '');
                return date && date.getFullYear() === year;
            });
        }
        
        analyzeSupplierRanking(filteredData);
        updateSummaryStats(filteredData);
        renderSupplierTable();
        
        console.log('=== 업체별 구매내역 분석 완료 ===');
        
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

// 실제 데이터 파싱 함수
function parseRealData(rawData) {
    purchaseData = rawData.map(item => ({
        agency: (item['수요기관명'] || '').trim(),
        supplier: (item['업체'] || '').trim(),
        region: (item['수요기관지역'] || '').trim(),
        agencyType: item['소관구분'] || '기타',
        product: (item['세부품명'] || '').trim(),
        amount: parseAmount(item['공급금액'] || '0'),
        purchaseDate: item['기준일자'] || '',
        contractName: (item['계약명'] || '').trim()
    })).filter(item => item.agency && item.supplier && item.amount > 0);
}

// 샘플 데이터 생성
function generateSampleData() {
    purchaseData = [
        { agency: '경기도 양주시', supplier: '두발로 주식회사', region: '경기도', agencyType: '지방자치단체', product: '보행매트', amount: 15000000, purchaseDate: '2024-01-15', contractName: '천보산 산림욕장 보완사업' },
        { agency: '의정부시', supplier: '두발로 주식회사', region: '경기도', agencyType: '지방자치단체', product: '보행매트', amount: 28000000, purchaseDate: '2024-02-10', contractName: '의정부시 녹지조성사업' },
        { agency: '서울시 한강사업본부', supplier: '한솔기술', region: '서울특별시', agencyType: '지방자치단체', product: '식생매트', amount: 32000000, purchaseDate: '2024-02-05', contractName: '서울시 한강공원 보행로 개선' },
        { agency: '부천시청', supplier: '두발로 주식회사', region: '경기도', agencyType: '지방자치단체', product: '논슬립', amount: 45000000, purchaseDate: '2024-03-12', contractName: '부천시 중앙공원 조성사업' },
        { agency: '춘천시 공원과', supplier: '산하건설', region: '강원도', agencyType: '지방자치단체', product: '보행매트', amount: 22000000, purchaseDate: '2024-03-20', contractName: '춘천시 공원 조성사업' }
    ];
}

// 업체별 순위 데이터 분석
function analyzeSupplierRanking(data) {
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
    
    supplierRankingData = Array.from(supplierMap.values()).map(item => ({
        ...item,
        contractCount: item.contracts.size
    }));
    
    supplierRankingData.sort((a, b) => b.amount - a.amount);
    supplierRankingData.forEach((item, index) => { item.rank = index + 1; });
    
    console.log(`업체별 순위 분석 완료: ${supplierRankingData.length}개 업체`);
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

// 업체별 순위 테이블 렌더링
function renderSupplierTable() {
    const tbody = $('supplierTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (supplierRankingData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-500">업체 데이터가 없습니다.</td></tr>';
        return;
    }
    
    supplierRankingData.forEach((supplier, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        const supplierNameCell = `
            <td class="font-medium">
                <a href="#" class="text-blue-600 hover:underline" data-supplier="${supplier.supplier}">
                    ${supplier.supplier}
                </a>
            </td>
        `;

        row.innerHTML = `
            <td class="text-center font-medium">${supplier.rank}</td>
            ${supplierNameCell}
            <td class="text-center">${formatNumber(supplier.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(supplier.amount)}</td>
        `;
        tbody.appendChild(row);

        row.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            const supplierName = e.target.dataset.supplier;
            showSupplierDetail(supplierName);
        });
    });
}

// 상세 정보 분석 및 렌더링
function showSupplierDetail(supplierName) {
    // 기존 패널 숨기기
    const supplierPanel = $('supplierPanel');
    if (supplierPanel) supplierPanel.classList.add('hidden');
    
    // 상세 정보 패널 생성
    let detailPanel = $('supplierDetailPanel');
    if (!detailPanel) {
        const mainContent = document.querySelector('main');
        detailPanel = document.createElement('div');
        detailPanel.id = 'supplierDetailPanel';
        detailPanel.className = 'bg-white rounded-lg shadow-md mb-8 p-6';
        mainContent.appendChild(detailPanel);
    }
    
    detailPanel.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-gray-900">${supplierName} 판매 상세 내역</h3>
            <button id="closeDetailBtn" class="btn btn-secondary btn-sm">목록으로</button>
        </div>
        <div class="overflow-x-auto">
            <table id="supplierDetailTable" class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수요기관명</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">소재지</th>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">소관기관</th>
                        <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">업체 판매금액</th>
                        <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">수요기관 전체 구매금액</th>
                        <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">점유율</th>
                    </tr>
                </thead>
                <tbody id="supplierDetailTableBody" class="bg-white divide-y divide-gray-200">
                    </tbody>
            </table>
        </div>
    `;

    $('closeDetailBtn').addEventListener('click', () => {
        const supplierPanel = $('supplierPanel');
        if (supplierPanel) supplierPanel.classList.remove('hidden');
        detailPanel.remove();
    });

    const supplierSpecificData = allProcurementData.filter(item => item.supplier === supplierName);
    
    const agencyTotalMap = new Map();
    allProcurementData.forEach(item => {
        const agencyName = item.agency;
        agencyTotalMap.set(agencyName, (agencyTotalMap.get(agencyName) || 0) + item.amount);
    });

    const agencySalesMap = new Map();
    supplierSpecificData.forEach(item => {
        const agencyName = item.agency;
        if (!agencySalesMap.has(agencyName)) {
            agencySalesMap.set(agencyName, {
                agency: item.agency,
                region: item.region,
                agencyType: item.agencyType,
                amount: 0,
                totalAmount: agencyTotalMap.get(agencyName) || 0
            });
        }
        agencySalesMap.get(agencyName).amount += item.amount;
    });

    const supplierDetailData = Array.from(agencySalesMap.values());
    supplierDetailData.sort((a, b) => b.amount - a.amount);
    
    const tbody = $('supplierDetailTableBody');
    if (tbody) {
        if (supplierDetailData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">상세 내역이 없습니다.</td></tr>';
        } else {
            supplierDetailData.forEach((item, index) => {
                const share = (item.amount / item.totalAmount) * 100;
                const row = document.createElement('tr');
                row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.agency}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.region}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.agencyType}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">${formatCurrency(item.amount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">${formatCurrency(item.totalAmount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">${share.toFixed(1)}%</td>
                `;
                tbody.appendChild(row);
            });
        }
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

// 전역 함수 노출
window.SupplierAnalysis = {
    analyzeData: analyzeData
};

console.log('=== SupplierAnalysis 모듈 로드 완료 ===');
