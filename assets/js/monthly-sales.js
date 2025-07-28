// 월별매출 현황 JavaScript (CSV 직접 연결 개선 버전)

// 전역 변수
let salesData = [];
let currentDetailData = {};

// Google Sheets CSV URL (웹에 게시된 실제 URL)
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjy2slFJrAxxPO8WBmehXH4iJtcfxr-HUkvL-YXw-BIvmA1Z3kTa8DfdWVnwVl3r4jhjmHFUYIju3j/pub?output=csv';

// 샘플 데이터 (CSV 로드 실패시 fallback)
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
 * CSV 데이터 파싱 함수
 */
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        throw new Error('CSV 데이터가 비어있습니다.');
    }
    
    // 헤더 파싱 (첫 번째 줄)
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    console.log('CSV 헤더:', headers);
    
    // 데이터 파싱 (두 번째 줄부터)
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVLine(line);
        if (values.length !== headers.length) {
            console.warn(`행 ${i + 1}: 컬럼 수가 맞지 않음 (헤더: ${headers.length}, 데이터: ${values.length})`);
            continue;
        }
        
        const item = {};
        headers.forEach((header, index) => {
            item[header] = values[index] || '';
        });
        data.push(item);
    }
    
    return data;
}

/**
 * CSV 라인 파싱 (쉼표 구분, 따옴표 처리)
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // 따옴표 이스케이프 ("")
                current += '"';
                i++; // 다음 따옴표 건너뛰기
            } else {
                // 따옴표 시작/끝
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // 구분자
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // 마지막 컬럼 추가
    result.push(current.trim());
    
    return result;
}

/**
 * 날짜 문자열을 Date 객체로 변환
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // 다양한 날짜 형식 지원
    const formats = [
        /^\d{4}-\d{2}-\d{2}$/,  // YYYY-MM-DD
        /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
        /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
        /^\d{4}\.\d{2}\.\d{2}$/, // YYYY.MM.DD
    ];
    
    let date = new Date(dateStr);
    
    // 한국식 날짜 형식 처리 (MM/DD/YYYY)
    if (isNaN(date.getTime()) && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [month, day, year] = dateStr.split('/');
        date = new Date(year, month - 1, day);
    }
    
    return isNaN(date.getTime()) ? null : date;
}

/**
 * 실제 데이터 로드 (CSV 직접 연결)
 */
async function loadSalesData() {
    try {
        console.log('CSV 데이터 로드 시작...');
        
        // 로딩 상태 표시
        const loadingMsg = document.createElement('div');
        loadingMsg.id = 'loading-message';
        loadingMsg.className = 'text-center text-gray-500 py-4';
        loadingMsg.innerHTML = '<div class="loading-spinner inline-block mr-2"></div>데이터를 불러오는 중...';
        document.getElementById('monthlyTableBody').appendChild(loadingMsg);
        
        // CSV 데이터 가져오기
        const response = await fetch(SHEET_CSV_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV 로드 완료, 파싱 중...');
        
        // CSV 파싱
        const rawData = parseCSV(csvText);
        console.log(`${rawData.length}개의 원시 데이터 파싱 완료`);
        
        if (rawData.length === 0) {
            throw new Error('파싱된 데이터가 없습니다.');
        }
        
        // 데이터 변환 및 검증
        salesData = rawData.map((item, index) => {
            try {
                // 다양한 컬럼명 지원
                const dateValue = item['주문일자'] || item['날짜'] || item['date'] || item['Date'];
                const typeValue = item['구분'] || item['type'] || item['Type'] || '사급매출';
                const contractValue = item['계약명'] || item['사업명'] || item['contractName'] || item['Contract Name'] || '계약명 없음';
                const customerValue = item['거래처'] || item['수요기관'] || item['customer'] || item['Customer'] || '거래처 없음';
                const amountValue = item['합계'] || item['금액'] || item['amount'] || item['Amount'] || '0';
                
                return {
                    date: parseDate(dateValue) || new Date(),
                    type: typeValue,
                    contractName: contractValue,
                    customer: customerValue,
                    amount: parseInt(amountValue.toString().replace(/[^\d]/g, '')) || 0,
                    deliveryDate: parseDate(item['납품기한'] || item['deliveryDate']),
                    invoiceDate: parseDate(item['세금계산서'] || item['invoiceDate'])
                };
            } catch (error) {
                console.warn(`데이터 변환 오류 (행 ${index + 1}):`, error, item);
                return null;
            }
        }).filter(item => {
            // 유효한 데이터만 필터링
            return item && 
                   item.date instanceof Date && 
                   !isNaN(item.date.getTime()) && 
                   item.amount > 0 &&
                   item.contractName !== '계약명 없음';
        });
        
        console.log(`${salesData.length}건의 유효한 데이터 변환 완료`);
        
        // 로딩 메시지 제거
        const loadingElement = document.getElementById('loading-message');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        if (salesData.length === 0) {
            throw new Error('유효한 데이터가 없습니다. 시트의 데이터 형식을 확인해주세요.');
        }
        
        // 보고서 생성
        generateReport();
        
        CommonUtils.showAlert(`${salesData.length}건의 데이터를 성공적으로 로드했습니다.`, 'success');
        
    } catch (error) {
        console.error('CSV 로드 실패:', error);
        
        // 로딩 메시지 제거
        const loadingElement = document.getElementById('loading-message');
        if (loadingElement) {
            loadingElement.remove();
        }
        
        // 에러 메시지 표시
        CommonUtils.showAlert(`데이터 로드 실패: ${error.message}`, 'error');
        
        console.log('샘플 데이터로 대체합니다.');
        loadSampleDataFallback();
    }
}

/**
 * 샘플 데이터 로드 (CSV 실패시 fallback)
 */
function loadSampleDataFallback() {
    salesData = sampleData.map(item => ({
        ...item,
        date: new Date(item.date),
        deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
        invoiceDate: item.invoiceDate ? new Date(item.invoiceDate) : null
    }));
    
    generateReport();
    CommonUtils.showAlert('샘플 데이터를 표시합니다. Google Sheets 연결을 확인해주세요.', 'warning');
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
    
    if (sortedMonths.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-8">데이터가 없습니다.</td></tr>';
        updateTotalRow(totals);
        return;
    }
    
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
        orderAmountCell.className = 'text-right border-r border-gray-200';
        if (data.order.amount > 0) {
            orderAmountCell.className += ' amount-clickable cursor-pointer';
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
        govAmountCell.className = 'text-right border-r border-gray-200';
        if (data.government.amount > 0) {
            govAmountCell.className += ' amount-clickable cursor-pointer';
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
        privAmountCell.className = 'text-right border-r border-gray-200';
        if (data.private.amount > 0) {
            privAmountCell.className += ' amount-clickable cursor-pointer';
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

// 전역 함수로 내보내기 (HTML에서 사용)
window.MonthlySales = {
    generateReport,
    showDetail,
    loadSalesData,
    loadSampleDataFallback
};

// 페이지 로드시 샘플 데이터로 시작 (loadSampleData 함수명 변경)
function loadSampleData() {
    // 실제 CSV 데이터를 먼저 시도하고, 실패하면 샘플 데이터
    loadSalesData();
}
