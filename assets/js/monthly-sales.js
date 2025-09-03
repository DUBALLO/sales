// 월별 매출 현황 JavaScript

// 전역 변수
let monthlySalesData = [];
let detailData = [];
let isLoading = false;
let allData = [];

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
    if (typeof amount !== 'number' || isNaN(amount)) return '0원';
    return new Intl.NumberFormat('ko-KR').format(Math.round(amount)) + '원';
}

function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) return '0';
    return new Intl.NumberFormat('ko-KR').format(Math.round(number));
}

// 메인 함수: 데이터 로드 및 분석
async function loadSalesData() {
    console.log('=== 월별 매출 데이터 로드 및 분석 시작 ===');
    showLoadingState(true);
    
    try {
        if (window.sheetsAPI) {
            allData = await window.sheetsAPI.loadCSVData('monthlySales');
            console.log(`총 ${allData.length}건의 판매 데이터 로드 완료`);
            processData();
        } else {
            console.error('sheets-api.js가 로드되지 않았습니다.');
            showAlert('데이터 로드에 실패했습니다. sheets-api.js 파일을 확인하세요.', 'error');
        }
    } catch (error) {
        console.error('데이터 로드 중 오류 발생:', error);
        showAlert('데이터 로드에 실패했습니다: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

// 데이터 처리 및 집계
function processData() {
    const startYear = parseInt($('startYear').value);
    const startMonth = parseInt($('startMonth').value);
    const endYear = parseInt($('endYear').value);
    const endMonth = parseInt($('endMonth').value);

    // 유효한 날짜 범위 설정
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0);

    const filteredData = allData.filter(item => {
        const date = new Date(item['날짜']);
        return date >= startDate && date <= endDate;
    });

    const monthlyMap = new Map();
    detailData = filteredData;

    filteredData.forEach(item => {
        const date = new Date(item['날짜']);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;

        if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
                year: year,
                month: month,
                orderCount: 0,
                orderAmount: 0,
                govCount: 0,
                govAmount: 0,
                privCount: 0,
                privAmount: 0,
                totalAmount: 0,
                details: []
            });
        }

        const monthlyItem = monthlyMap.get(key);
        const amount = parseFloat(item['판매금액']) || 0;
        const category = item['구분'] || '';

        monthlyItem.orderCount += 1;
        monthlyItem.orderAmount += amount;
        monthlyItem.totalAmount += amount;

        if (category.includes('관급')) {
            monthlyItem.govCount++;
            monthlyItem.govAmount += amount;
        } else if (category.includes('사급')) {
            monthlyItem.privCount++;
            monthlyItem.privAmount += amount;
        }

        monthlyItem.details.push({
            contractName: item['계약명'] || '',
            customer: item['고객사명'] || '',
            amount: amount,
            date: item['날짜'] || ''
        });
    });

    monthlySalesData = Array.from(monthlyMap.values());
    monthlySalesData.sort((a, b) => a.year - b.year || a.month - b.month);

    renderMonthlyTable();
}

// 월별 테이블 렌더링
function renderMonthlyTable() {
    const tbody = $('monthlyTableBody');
    const tfoot = $('monthlyTable').querySelector('tfoot');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';
    
    let grandTotalOrderCount = 0;
    let grandTotalOrderAmount = 0;
    let grandTotalGovCount = 0;
    let grandTotalGovAmount = 0;
    let grandTotalPrivCount = 0;
    let grandTotalPrivAmount = 0;

    monthlySalesData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        row.innerHTML = `
            <td class="text-center font-medium border-r-2 border-gray-300">${item.year}년 ${item.month}월</td>
            <td class="text-center">${formatNumber(item.orderCount)}</td>
            <td class="text-right amount cursor-pointer" onclick="showDetailSection('${item.year}-${item.month}', '주문')">${formatCurrency(item.orderAmount)}</td>
            <td class="text-center">${formatNumber(item.govCount)}</td>
            <td class="text-right amount cursor-pointer" onclick="showDetailSection('${item.year}-${item.month}', '관급')">${formatCurrency(item.govAmount)}</td>
            <td class="text-center">${formatNumber(item.privCount)}</td>
            <td class="text-right amount cursor-pointer" onclick="showDetailSection('${item.year}-${item.month}', '사급')">${formatCurrency(item.privAmount)}</td>
            <td class="text-right font-bold amount">${formatCurrency(item.orderAmount)}</td>
        `;
        tbody.appendChild(row);

        grandTotalOrderCount += item.orderCount;
        grandTotalOrderAmount += item.orderAmount;
        grandTotalGovCount += item.govCount;
        grandTotalGovAmount += item.govAmount;
        grandTotalPrivCount += item.privCount;
        grandTotalPrivAmount += item.privAmount;
    });
    
    // 합계 업데이트
    $('totalOrderCount').textContent = formatNumber(grandTotalOrderCount);
    $('totalOrderAmount').textContent = formatCurrency(grandTotalOrderAmount);
    $('totalGovCount').textContent = formatNumber(grandTotalGovCount);
    $('totalGovAmount').textContent = formatCurrency(grandTotalGovAmount);
    $('totalPrivCount').textContent = formatNumber(grandTotalPrivCount);
    $('totalPrivAmount').textContent = formatCurrency(grandTotalPrivAmount);
    $('grandTotal').textContent = formatCurrency(grandTotalOrderAmount);

    if (monthlySalesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">조회된 데이터가 없습니다.</td></tr>';
    }
}

// 상세 내역 표시
function showDetailSection(monthKey, type) {
    const detailSection = $('detailSection');
    const detailTitle = $('detailTitle');
    const detailTableBody = $('detailTableBody');
    const detailTableHead = $('detailTable').querySelector('thead');

    detailSection.classList.remove('hidden');
    detailTitle.textContent = `${monthKey} ${type} 상세 내역`;
    detailTableBody.innerHTML = '';
    
    const monthlyItem = monthlySalesData.find(item => `${item.year}-${item.month}` === monthKey);
    if (!monthlyItem) {
        detailTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">상세 내역을 찾을 수 없습니다.</td></tr>';
        return;
    }

    const filteredDetails = detailData.filter(item => {
        const date = new Date(item['날짜']);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (type === '주문') {
            return key === monthKey;
        }
        return key === monthKey && item['구분'].includes(type);
    });
    
    detailTableHead.innerHTML = `
        <tr>
            <th class="text-left">계약명</th>
            <th class="text-left">고객사명</th>
            <th class="text-right">금액</th>
            <th class="text-center">날짜</th>
        </tr>
    `;

    if (filteredDetails.length === 0) {
        detailTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">해당 유형의 상세 내역이 없습니다.</td></tr>';
        return;
    }

    filteredDetails.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        row.innerHTML = `
            <td class="font-medium">${item.contractName}</td>
            <td>${item.customer}</td>
            <td class="text-right">${formatCurrency(item.amount)}</td>
            <td class="text-center">${item.date}</td>
        `;
        detailTableBody.appendChild(row);
    });
    
    detailSection.scrollIntoView({ behavior: 'smooth' });
}

// 상세 내역 섹션 숨기기
function hideDetailSection() {
    const detailSection = $('detailSection');
    detailSection.classList.add('hidden');
}

// 로딩 상태 표시
function showLoadingState(show) {
    isLoading = show;
    const searchBtn = $('searchBtn');
    if (searchBtn) {
        searchBtn.disabled = show;
        searchBtn.innerHTML = show 
            ? '<div class="loading-spinner"></div>조회 중...' 
            : `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
               </svg>조회`;
    }
}

// 알림 표시
function showAlert(message, type = 'info') {
    if (window.CommonUtils && CommonUtils.showAlert) {
        CommonUtils.showAlert(message, type);
    } else {
        alert(message);
    }
}

// 초기 로드 시 데이터 분석
document.addEventListener('DOMContentLoaded', function() {
    console.log('monthly-sales.html DOMContentLoaded');
    // 조회 버튼 클릭 이벤트
    $('searchBtn')?.addEventListener('click', processData);
    // 초기 데이터 로드
    loadSalesData();
});

// 전역 함수 노출
window.loadSalesData = loadSalesData;
window.refreshData = loadSalesData;
window.showDetailSection = showDetailSection;
window.hideDetailSection = hideDetailSection;
