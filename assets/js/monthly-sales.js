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
        totals.govCount += data.government
