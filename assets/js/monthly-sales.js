// 월별매출 현황 JavaScript

// 전역 변수
let salesData = [];
let currentDetailData = {};

// 샘플 데이터 (실제 데이터 대신 임시 사용)
const sampleData = [
    {
        date: '2024-01-15',
        type: '주문',
        contractName: '천보산 산림욕장 보완사업 관급자재',
        customer: '경기도 양주시',
        amount: 1500000,
        deliveryDate: '2024-01-25',
        invoiceDate: null
    },
    {
        date: '2024-01-20',
        type: '관급매출',
        contractName: '의정부시 녹지조성사업',
        customer: '의정부시',
        amount: 2800000,
        deliveryDate: null,
        invoiceDate: '2024-01-25'
    },
    {
        date: '2024-01-25',
        type: '사급매출',
        contractName: '춘천시 소양강 정비사업',
        customer: '강원도 춘천시',
        amount: 1800000,
        deliveryDate: null,
        invoiceDate: '2024-01-28'
    },
    {
        date: '2024-02-05',
        type: '주문',
        contractName: '서울시 한강공원 보행로 개선',
        customer: '서울시',
        amount: 3200000,
        deliveryDate: '2024-02-15',
        invoiceDate: null
    },
    {
        date: '2024-02-10',
        type: '관급매출',
        contractName: '부천시 중앙공원 조성사업',
        customer: '부천시',
        amount: 4500000,
        deliveryDate: null,
        invoiceDate: '2024-02-15'
    },
    {
        date: '2024-02-20',
        type: '사급매출',
        contractName: '인천 송도 신도시 보행환경 개선',
        customer: '인천광역시',
        amount: 2100000,
        deliveryDate: null,
        invoiceDate: '2024-02-22'
    },
    {
        date: '2024-03-03',
        type: '주문',
        contractName: '대전 유성구 과학단지 보행로',
        customer: '대전 유성구',
        amount: 2800000,
        deliveryDate: '2024-03-15',
        invoiceDate: null
    },
    {
        date: '2024-03-12',
        type: '관급매출',
        contractName: '광주 북구 문화센터 주변 정비',
        customer: '광주 북구',
        amount: 5200000,
        deliveryDate: null,
        invoiceDate: '2024-03-15'
    },
    {
        date: '2024-03-18',
        type: '사급매출',
        contractName: '울산 남구 공단 보행환경 개선',
        customer: '울산 남구',
        amount: 1900000,
        deliveryDate: null,
        invoiceDate: '2024-03-20'
    },
    {
        date: '2024-04-07',
        type: '주문',
        contractName: '제주시 관광지 보행로 정비',
        customer: '제주시',
        amount: 3100000,
        deliveryDate: '2024-04-18',
        invoiceDate: null
    },
    {
        date: '2024-04-15',
        type: '관급매출',
        contractName: '세종시 행정복합도시 보행환경',
        customer: '세종시',
        amount: 4800000,
        deliveryDate: null,
        invoiceDate: '2024-04-18'
    },
    {
        date: '2024-04-22',
        type: '사급매출',
        contractName: '포항시 영일대 해안 보행로',
        customer: '포항시',
        amount: 2300000,
        deliveryDate: null,
        invoiceDate: '2024-04-25'
    }
];

/**
 * 샘플 데이터 로드
 */
function loadSampleData() {
    salesData = sampleData.map(item => ({
        ...item,
        date: new Date(item.date),
        deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
        invoiceDate: item.invoiceDate ? new Date(item.invoiceDate) : null
    }));
    
    generateReport();
}

/**
 * 월별 매출 보고서 생성
 */
function generateReport() {
    try {
        const startYear = parseInt(document.getElementById('startYear').value);
        const startMonth = parseInt(document.getElementById('startMonth').value);
        const endYear = parseInt(document.getElementById('endYear').value);
        const endMonth = parseInt(document.getElementById('endMonth').value);
        
        // 날짜 유효성 검사
        const startDate = new Date(startYear, startMonth - 1, 1);
        const endDate = new Date(endYear, endMonth, 0);
        
        if (startDate > endDate) {
            CommonUtils.showAlert('시작 기간이 종료 기간보다 늦을 수 없습니다.', 'warning');
            return;
        }
        
        // 월별 데이터 초기화
        const monthlyData = initializeMonthlyData(startDate, endDate);
        
        // 데이터 집계
        aggregateData(monthlyData, startDate, endDate);
        
        // 테이블 렌더링
        renderMonthlyTable(monthlyData);
        
    } catch (error) {
        console.error('보고서 생성 오류:', error);
        CommonUtils.showAlert('보고서 생성 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 월별 데이터 구조 초기화
 */
function initializeMonthlyData(startDate, endDate) {
    const monthlyData = {};
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const yearMonth = CommonUtils.getYearMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
        monthlyData[yearMonth] = {
            order: { count: 0, amount: 0, details: [] },
            government: { count: 0, amount: 0, details: [] },
            private: { count: 0, amount: 0, details: [] }
        };
        
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return monthlyData;
}

/**
 * 데이터 집계
 */
function aggregateData(monthlyData, startDate, endDate) {
    salesData.forEach(item => {
        const itemDate = item.date;
        
        // 선택된 기간 내의 데이터만 처리
        if (itemDate >= startDate && itemDate <= endDate) {
            const yearMonth = CommonUtils.getYearMonth(itemDate.getFullYear(), itemDate.getMonth() + 1);
            
            if (monthlyData[yearMonth]) {
                switch (item.type) {
                    case '주문':
                        monthlyData[yearMonth].order.count++;
                        monthlyData[yearMonth].order.amount += item.amount;
                        monthlyData[yearMonth].order.details.push(item);
                        break;
                        
                    case '관급매출':
                        monthlyData[yearMonth].government.count++;
                        monthlyData[yearMonth].government.amount += item.amount;
                        monthlyData[yearMonth].government.details.push(item);
                        break;
                        
                    case '사급매출':
                        monthlyData[yearMonth].private.count++;
                        monthlyData[yearMonth].private.amount += item.amount;
                        monthlyData[yearMonth].private.details.push(item);
                        break;
                }
            }
        }
    });
    
    // 현재 상세 데이터 저장 (금액 클릭시 사용)
    currentDetailData = monthlyData;
}

/**
 * 월별 테이블 렌더링
 */
function renderMonthlyTable(monthlyData) {
    const tbody = document.getElementById('monthlyTableBody');
    tbody.innerHTML = '';
    
    let totals = {
        orderCount: 0, orderAmount: 0,
        govCount: 0, govAmount: 0,
        privCount: 0, privAmount: 0
    };
    
    // 월별 데이터를 시간순으로 정렬
    const sortedMonths = Object.keys(monthlyData).sort();
    
    sortedMonths.forEach(yearMonth => {
        const data = monthlyData[yearMonth];
        const [year, month] = yearMonth.split('-');
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // 년/월
        const monthCell = document.createElement('td');
        monthCell.textContent = `${year}년 ${parseInt(month)}월`;
        monthCell.className = 'font-medium border-r border-gray-200';
        row.appendChild(monthCell);
        
        // 주문 건수
        const orderCountCell = document.createElement('td');
        orderCountCell.textContent = CommonUtils.formatNumber(data.order.count);
        orderCountCell.className = 'text-center border-r border-gray-200';
        row.appendChild(orderCountCell);
        
        // 주문 금액 (클릭 가능)
        const orderAmountCell = document.createElement('td');
        orderAmountCell.textContent = CommonUtils.formatCurrency(data.order.amount);
        orderAmountCell.className = 'text-right border-r border-gray-200 amount-clickable cursor-pointer';
        if (data.order.amount > 0) {
            orderAmountCell.addEventListener('click', () => showDetail(yearMonth, 'order', '주문'));
        }
        row.appendChild(orderAmountCell);
        
        // 관급매출 건수
        const govCountCell = document.createElement('td');
        govCountCell.textContent = CommonUtils.formatNumber(data.government.count);
        govCountCell.className = 'text-center border-r border-gray-200';
        row.appendChild(govCountCell);
        
        // 관급매출 금액 (클릭 가능)
        const govAmountCell = document.createElement('td');
        govAmountCell.textContent = CommonUtils.formatCurrency(data.government.amount);
        govAmountCell.className = 'text-right border-r border-gray-200 amount-clickable cursor-pointer';
        if (data.government.amount > 0) {
            govAmountCell.addEventListener('click', () => showDetail(yearMonth, 'government', '관급매출'));
        }
        row.appendChild(govAmountCell);
        
        // 사급매출 건수
        const privCountCell = document.createElement('td');
        privCountCell.textContent = CommonUtils.formatNumber(data.private.count);
        privCountCell.className = 'text-center border-r border-gray-200';
        row.appendChild(privCountCell);
        
        // 사급매출 금액 (클릭 가능)
        const privAmountCell = document.createElement('td');
        privAmountCell.textContent = CommonUtils.formatCurrency(data.private.amount);
        privAmountCell.className = 'text-right border-r border-gray-200 amount-clickable cursor-pointer';
        if (data.private.amount > 0) {
            privAmountCell.addEventListener('click', () => showDetail(yearMonth, 'private', '사급매출'));
        }
        row.appendChild(privAmountCell);
        
        // 합계
        const totalAmount = data.order.amount + data.government.amount + data.private.amount;
        const totalCell = document.createElement('td');
        totalCell.textContent = CommonUtils.formatCurrency(totalAmount);
        totalCell.className = 'text-right font-medium';
        row.appendChild(totalCell);
        
        tbody.appendChild(row);
        
        // 총합계 누적
        totals.orderCount += data.order.count;
        totals.orderAmount += data.order.amount;
        totals.govCount += data.government.count;
        totals.govAmount += data.government.amount;
        totals.privCount += data.private.count;
        totals.privAmount += data.private.amount;
    });
    
    // 합계 행 업데이트
    updateTotalRow(totals);
}

/**
 * 합계 행 업데이트
 */
function updateTotalRow(totals) {
    document.getElementById('totalOrderCount').textContent = CommonUtils.formatNumber(totals.orderCount);
    document.getElementById('totalOrderAmount').textContent = CommonUtils.formatCurrency(totals.orderAmount);
    document.getElementById('totalGovCount').textContent = CommonUtils.formatNumber(totals.govCount);
    document.getElementById('totalGovAmount').textContent = CommonUtils.formatCurrency(totals.govAmount);
    document.getElementById('totalPrivCount').textContent = CommonUtils.formatNumber(totals.privCount);
    document.getElementById('totalPrivAmount').textContent = CommonUtils.formatCurrency(totals.privAmount);
    
    const grandTotal = totals.orderAmount + totals.govAmount + totals.privAmount;
    document.getElementById('grandTotal').textContent = CommonUtils.formatCurrency(grandTotal);
}

/**
 * 상세 내역 표시
 */
function showDetail(yearMonth, type, typeName) {
    const [year, month] = yearMonth.split('-');
    const monthName = `${year}년 ${parseInt(month)}월`;
    
    // 상세 데이터 가져오기
    const details = currentDetailData[yearMonth][type].details;
    
    if (!details || details.length === 0) {
        CommonUtils.showAlert('해당 월에 데이터가 없습니다.', 'info');
        return;
    }
    
    // 제목 업데이트
    document.getElementById('detailTitle').textContent = `${monthName} ${typeName} 상세 내역 (${details.length}건)`;
    
    // 상세 테이블 렌더링
    renderDetailTable(details, type);
    
    // 상세 섹션 표시
    document.getElementById('detailSection').classList.remove('hidden');
    
    // 상세 섹션으로 스크롤
    document.getElementById('detailSection').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

/**
 * 상세 테이블 렌더링
 */
function renderDetailTable(details, type) {
    const tbody = document.getElementById('detailTableBody');
    tbody.innerHTML = '';
    
    details.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // 계약명
        const contractCell = document.createElement('td');
        contractCell.textContent = item.contractName;
        contractCell.className = 'font-medium';
        row.appendChild(contractCell);
        
        // 거래처
        const customerCell = document.createElement('td');
        customerCell.textContent = item.customer;
        row.appendChild(customerCell);
        
        // 금액
        const amountCell = document.createElement('td');
        amountCell.textContent = CommonUtils.formatCurrency(item.amount);
        amountCell.className = 'text-right font-medium amount';
        row.appendChild(amountCell);
        
        // 날짜 (납품기한 또는 세금계산서 발행일)
        const dateCell = document.createElement('td');
        let dateText = '';
        
        if (type === 'order') {
            dateText = item.deliveryDate ? CommonUtils.formatDate(item.deliveryDate) : '-';
        } else {
            dateText = item.invoiceDate ? CommonUtils.formatDate(item.invoiceDate) : '-';
        }
        
        dateCell.textContent = dateText;
        dateCell.className = 'text-center';
        row.appendChild(dateCell);
        
        // 구분
        const typeCell = document.createElement('td');
        typeCell.innerHTML = `<span class="badge ${getTypeBadgeClass(item.type)}">${item.type}</span>`;
        typeCell.className = 'text-center';
        row.appendChild(typeCell);
        
        tbody.appendChild(row);
    });
}

/**
 * 타입별 배지 클래스 반환
 */
function getTypeBadgeClass(type) {
    switch (type) {
        case '주문':
            return 'badge-primary';
        case '관급매출':
            return 'badge-success';
        case '사급매출':
            return 'badge-warning';
        default:
            return 'badge-gray';
    }
}

/**
 * 날짜 범위 유효성 검사
 */
function validateDateRange() {
    const startYear = parseInt(document.getElementById('startYear').value);
    const startMonth = parseInt(document.getElementById('startMonth').value);
    const endYear = parseInt(document.getElementById('endYear').value);
    const endMonth = parseInt(document.getElementById('endMonth').value);
    
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0);
    
    if (startDate > endDate) {
        CommonUtils.showAlert('시작 기간이 종료 기간보다 늦을 수 없습니다.', 'warning');
        return false;
    }
    
    return true;
}

/**
 * 데이터 필터링 (검색 기능)
 */
function filterData(searchTerm) {
    if (!searchTerm.trim()) {
        generateReport();
        return;
    }
    
    const filteredData = salesData.filter(item => 
        item.contractName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // 임시로 필터된 데이터로 교체
    const originalData = [...salesData];
    salesData = filteredData;
    generateReport();
    salesData = originalData; // 원본 데이터 복원
}

/**
 * 데이터 통계 계산
 */
function calculateStatistics() {
    const stats = {
        totalAmount: 0,
        totalCount: 0,
        orderAmount: 0,
        govAmount: 0,
        privAmount: 0,
        avgAmount: 0,
        maxAmount: 0,
        minAmount: Infinity
    };
    
    salesData.forEach(item => {
        stats.totalAmount += item.amount;
        stats.totalCount++;
        
        switch (item.type) {
            case '주문':
                stats.orderAmount += item.amount;
                break;
            case '관급매출':
                stats.govAmount += item.amount;
                break;
            case '사급매출':
                stats.privAmount += item.amount;
                break;
        }
        
        stats.maxAmount = Math.max(stats.maxAmount, item.amount);
        stats.minAmount = Math.min(stats.minAmount, item.amount);
    });
    
    stats.avgAmount = stats.totalCount > 0 ? stats.totalAmount / stats.totalCount : 0;
    
    return stats;
}

/**
 * 월별 성장률 계산
 */
function calculateGrowthRate(currentAmount, previousAmount) {
    if (previousAmount === 0) {
        return currentAmount > 0 ? 100 : 0;
    }
    return ((currentAmount - previousAmount) / previousAmount) * 100;
}

/**
 * 데이터 검증
 */
function validateData(data) {
    const errors = [];
    
    data.forEach((item, index) => {
        if (!item.date || isNaN(new Date(item.date).getTime())) {
            errors.push(`${index + 1}행: 올바르지 않은 날짜 형식`);
        }
        
        if (!item.amount || isNaN(item.amount) || item.amount < 0) {
            errors.push(`${index + 1}행: 올바르지 않은 금액`);
        }
        
        if (!item.contractName || item.contractName.trim() === '') {
            errors.push(`${index + 1}행: 계약명이 누락됨`);
        }
        
        if (!item.customer || item.customer.trim() === '') {
            errors.push(`${index + 1}행: 거래처가 누락됨`);
        }
        
        if (!['주문', '관급매출', '사급매출'].includes(item.type)) {
            errors.push(`${index + 1}행: 올바르지 않은 구분 (${item.type})`);
        }
    });
    
    return errors;
}

/**
 * 엑셀/CSV 파일에서 데이터 로드
 */
async function loadDataFromFile(file) {
    try {
        const data = await CommonUtils.readFile(file);
        
        // 데이터 검증
        const errors = validateData(data);
        if (errors.length > 0) {
            CommonUtils.showAlert(`데이터 검증 오류:\n${errors.slice(0, 5).join('\n')}`, 'error');
            return false;
        }
        
        // 데이터 변환
        salesData = data.map(item => ({
            date: new Date(item.date || item['주문일자'] || item['날짜']),
            type: item.type || item['구분'],
            contractName: item.contractName || item['계약명'] || item['사업명'],
            customer: item.customer || item['거래처'] || item['수요기관'],
            amount: parseInt(item.amount || item['금액'] || item['합계']),
            deliveryDate: item.deliveryDate || item['납품기한'] ? new Date(item.deliveryDate || item['납품기한']) : null,
            invoiceDate: item.invoiceDate || item['세금계산서일자'] ? new Date(item.invoiceDate || item['세금계산서일자']) : null
        }));
        
        // 보고서 재생성
        generateReport();
        
        CommonUtils.showAlert(`${salesData.length}건의 데이터가 성공적으로 로드되었습니다.`, 'success');
        return true;
        
    } catch (error) {
        console.error('파일 로드 오류:', error);
        CommonUtils.showAlert('파일 로드 중 오류가 발생했습니다.', 'error');
        return false;
    }
}

/**
 * 현재 데이터를 localStorage에 저장
 */
function saveCurrentData() {
    const result = CommonUtils.saveToStorage('monthly-sales-data', salesData);
    if (result) {
        CommonUtils.showAlert('데이터가 저장되었습니다.', 'success');
    } else {
        CommonUtils.showAlert('데이터 저장에 실패했습니다.', 'error');
    }
}

/**
 * localStorage에서 데이터 로드
 */
function loadStoredData() {
    const storedData = CommonUtils.loadFromStorage('monthly-sales-data');
    if (storedData && storedData.length > 0) {
        salesData = storedData.map(item => ({
            ...item,
            date: new Date(item.date),
            deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
            invoiceDate: item.invoiceDate ? new Date(item.invoiceDate) : null
        }));
        generateReport();
        CommonUtils.showAlert('저장된 데이터가 로드되었습니다.', 'info');
        return true;
    }
    return false;
}

// 전역 함수로 내보내기 (HTML에서 사용)
window.MonthlySales = {
    generateReport,
    showDetail,
    loadDataFromFile,
    saveCurrentData,
    loadStoredData,
    filterData,
    calculateStatistics
};
