// 업체별 구매내역 분석 JavaScript

// 전역 변수
let purchaseData = [];
let supplierRankingData = [];
let allProcurementData = [];
let isLoading = false;
// [신규] 정렬 상태를 저장하기 위한 변수
let detailSortState = { column: null, direction: 'asc' };

// 안전한 요소 가져오기
function $(id) {
    const element = document.getElementById(id);
    if (!element) console.warn(`요소를 찾을 수 없습니다: ${id}`);
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
    const cleanAmount = String(amountStr).replace(/[^\d.-]/g, '');
    return parseInt(cleanAmount, 10) || 0;
}

// 메인 분석 함수
async function analyzeData() {
    try {
        console.log('=== 업체별 구매내역 분석 시작 ===');
        showLoadingState(true);
        let useRealData = false;
        
        if (window.sheetsAPI) {
            try {
                allProcurementData = await window.sheetsAPI.loadCSVData('procurement');
                if (allProcurementData && allProcurementData.length > 0) {
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
        
        const message = useRealData ? `실제 데이터 분석 완료 (${filteredData.length}건)` : '샘플 데이터로 분석 완료';
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

// 샘플 데이터 생성 (기존과 동일)
function generateSampleData() { /* ... */ }

// 업체별 순위 데이터 분석 (기존과 동일)
function analyzeSupplierRanking(data) { /* ... */ }

// 요약 통계 업데이트 (기존과 동일)
function updateSummaryStats(data) { /* ... */ }

// 업체별 순위 테이블 렌더링 (기존과 동일)
function renderSupplierTable() { /* ... */ }

// 상세 정보 분석 및 렌더링
function showSupplierDetail(supplierName) {
    const supplierPanel = $('supplierPanel');
    if (supplierPanel) supplierPanel.classList.add('hidden');
    
    let detailPanel = $('supplierDetailPanel');
    if (!detailPanel) {
        const mainContent = document.querySelector('main');
        detailPanel = document.createElement('div');
        detailPanel.id = 'supplierDetailPanel';
        detailPanel.className = 'bg-white rounded-lg shadow-md mb-8';
        mainContent.appendChild(detailPanel);
    }
    
    detailPanel.classList.remove('hidden');
    
    // [수정] innerHTML 및 컬럼명 변경, a11y, 정렬을 위한 data 속성 추가
    detailPanel.innerHTML = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg text-gray-900">
                    <strong class="font-bold">${supplierName}</strong>
                    <span class="font-normal">판매 상세 내역</span>
                </h3>
                <button id="closeDetailBtn" class="btn btn-secondary btn-sm">목록으로</button>
            </div>
            <div class="overflow-x-auto">
                <table id="supplierDetailTable" class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수요기관명</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="region">소재지</th>
                            <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="agencyType">소관기관</th>
                            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="amount">업체 판매금액</th>
                            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer" data-sort="totalAmount">수요기관 전체</th>
                            <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">점유율</th>
                        </tr>
                    </thead>
                    <tbody id="supplierDetailTableBody" class="bg-white divide-y divide-gray-200"></tbody>
                </table>
            </div>
        </div>
    `;

    $('closeDetailBtn').addEventListener('click', () => {
        if (supplierPanel) supplierPanel.classList.remove('hidden');
        detailPanel.classList.add('hidden');
    });
    
    // [수정] 선택된 연도 필터링 로직 추가
    const selectedYear = $('analysisYear')?.value || 'all';
    let yearFilteredData = [...purchaseData];
    if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        yearFilteredData = yearFilteredData.filter(item => {
            const date = parseDate(item.purchaseDate || '');
            return date && date.getFullYear() === year;
        });
    }

    const supplierSpecificData = yearFilteredData.filter(item => item.supplier === supplierName);
    
    const agencyTotalMap = new Map();
    yearFilteredData.forEach(item => {
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

    let supplierDetailData = Array.from(agencySalesMap.values());
    supplierDetailData.sort((a, b) => b.amount - a.amount);
    
    renderDetailTable(supplierDetailData);

    // [신규] 컬럼 헤더에 정렬 이벤트 리스너 추가
    detailPanel.querySelectorAll('th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (detailSortState.column === column) {
                detailSortState.direction = detailSortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                detailSortState.column = column;
                detailSortState.direction = 'asc';
            }
            
            supplierDetailData.sort((a, b) => {
                let valA = a[column];
                let valB = b[column];
                
                if (typeof valA === 'string') {
                    return detailSortState.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                } else {
                    return detailSortState.direction === 'asc' ? valA - valB : valB - valA;
                }
            });
            renderDetailTable(supplierDetailData);
        });
    });
}

// [신규] 상세 내역 테이블 렌더링 함수 분리
function renderDetailTable(data) {
    const tbody = $('supplierDetailTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">상세 내역이 없습니다.</td></tr>';
    } else {
        data.forEach((item, index) => {
            const share = item.totalAmount > 0 ? (item.amount / item.totalAmount) * 100 : 0;
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


// 로딩 상태 표시 (기존과 동일)
function showLoadingState(show) { /* ... */ }

// 알림 표시 (기존과 동일)
function showAlert(message, type = 'info') { /* ... */ }

// [신규] 인쇄 기능 및 관련 스타일 제어 함수
function printCurrentView() {
    const supplierPanel = $('supplierPanel');
    const detailPanel = $('supplierDetailPanel');
    
    let panelToPrint = null;

    if (detailPanel && !detailPanel.classList.contains('hidden')) {
        panelToPrint = detailPanel;
    } else if (supplierPanel && !supplierPanel.classList.contains('hidden')) {
        panelToPrint = supplierPanel;
    }

    if (panelToPrint) {
        panelToPrint.classList.add('printable-area');
        window.print();
    } else {
        showAlert('인쇄할 데이터가 없습니다.', 'warning');
    }
}

// 인쇄 후 'printable-area' 클래스 제거
window.onafterprint = () => {
    document.querySelectorAll('.printable-area').forEach(el => {
        el.classList.remove('printable-area');
    });
};

// 전역 함수 노출
window.SupplierAnalysis = {
    analyzeData: analyzeData,
    printCurrentView: printCurrentView // 인쇄 함수 노출
};

console.log('=== SupplierAnalysis 모듈 로드 완료 ===');
