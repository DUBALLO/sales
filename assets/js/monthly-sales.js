// 월별매출 현황 JavaScript (안전성 개선 + 실제 CSV 연결)

// 전역 변수
let salesData = [];
let currentDetailData = {};

// Google Sheets CSV URL (실제 URL)
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjy2slFJrAxxPO8WBmehXH4iJtcfxr-HUkvL-YXw-BIvmA1Z3kTa8DfdWVnwVl3r4jhjmHFUYIju3j/pub?output=csv';

// 샘플 데이터
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
        date: '2024-03-12',
        type: '관급매출',
        contractName: '광주 북구 문화센터 주변 정비',
        customer: '광주 북구',
        amount: 5200000,
        deliveryDate: null,
        invoiceDate: '2024-03-15'
    }
];

// 안전한 요소 가져오기
function $(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`요소를 찾을 수 없습니다: ${id}`);
    }
    return element;
}

// 포맷팅 함수들 (CommonUtils 없이도 작동)
function formatNumber(number) {
    if (window.CommonUtils && CommonUtils.formatNumber) {
        return CommonUtils.formatNumber(number);
    }
    return new Intl.NumberFormat('ko-KR').format(number || 0);
}

function formatCurrency(amount) {
    if (window.CommonUtils && CommonUtils.formatCurrency) {
        return CommonUtils.formatCurrency(amount);
    }
    return new Intl.NumberFormat('ko-KR').format(amount || 0) + '원';
}

function formatDate(date) {
    if (window.CommonUtils && CommonUtils.formatDate) {
        return CommonUtils.formatDate(date);
    }
    if (!date || !(date instanceof Date)) return '-';
    return date.toLocaleDateString('ko-KR');
}

function getYearMonth(year, month) {
    if (window.CommonUtils && CommonUtils.getYearMonth) {
        return CommonUtils.getYearMonth(year, month);
    }
    return `${year}-${String(month).padStart(2, '0')}`;
}

function showAlert(message, type = 'info') {
    if (window.CommonUtils && CommonUtils.showAlert) {
        CommonUtils.showAlert(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // 간단한 브라우저 알림
        if (type === 'error') {
            alert(`오류: ${message}`);
        }
    }
}

// CSV 파싱 함수
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        throw new Error('CSV 데이터가 비어있습니다.');
    }
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    console.log('CSV 헤더:', headers);
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.replace(/"/g, '').trim());
        const item = {};
        headers.forEach((header, index) => {
            item[header] = values[index] || '';
        });
        
        // 빈 행 건너뛰기
        if (Object.values(item).every(val => !val)) continue;
        
        data.push(item);
    }
    
    return data;
}

// 날짜 파싱
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    let date = new Date(dateStr);
    
    // 한국식 날짜 형식 처리
    if (isNaN(date.getTime()) && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [month, day, year] = dateStr.split('/');
        date = new Date(year, month - 1, day);
    }
    
    return isNaN(date.getTime()) ? null : date;
}

// 실제 CSV 데이터 로드
async function loadSalesData() {
    try {
        console.log('CSV 데이터 로드 시작...');
        
        // 로딩 메시지 표시
        const tbody = $('monthlyTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">데이터를 불러오는 중...</td></tr>';
        }
        
        const response = await fetch(SHEET_CSV_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV 로드 완료, 데이터 파싱 중...');
        console.log('CSV 미리보기:', csvText.substring(0, 200));
        
        const rawData = parseCSV(csvText);
        console.log(`${rawData.length}개의 원시 데이터 파싱 완료`);
        
        if (rawData.length === 0) {
            throw new Error('파싱된 데이터가 없습니다.');
        }
        
        // 데이터 변환
        salesData = rawData.map((item, index) => {
            try {
                const dateValue = item['주문일자'] || item['날짜'] || item['date'] || item['Date'];
                const typeValue = item['구분'] || item['type'] || item['Type'] || '사급매출';
                const contractValue = item['계약명'] || item['사업명'] || item['contractName'] || '계약명 없음';
                const customerValue = item['거래처'] || item['수요기관'] || item['customer'] || '거래처 없음';
                const amountValue = item['합계'] || item['금액'] || item['amount'] || '0';
                
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
                console.warn(`데이터 변환 오류 (행 ${index + 1}):`, error);
                return null;
            }
        }).filter(item => {
            return item && 
                   item.date instanceof Date && 
                   !isNaN(item.date.getTime()) && 
                   item.amount > 0 &&
                   item.contractName !== '계약명 없음';
        });
        
        console.log(`${salesData.length}건의 유효한 데이터 변환 완료`);
        
        if (salesData.length === 0) {
            throw new Error('유효한 데이터가 없습니다.');
        }
        
        generateReport();
        showAlert(`${salesData.length}건의 데이터를 성공적으로 로드했습니다.`, 'success');
        
    } catch (error) {
        console.error('CSV 로드 실패:', error);
        showAlert(`데이터 로드 실패: ${error.message}`, 'error');
        loadSampleDataFallback();
    }
}

// 샘플 데이터로 대체
function loadSampleDataFallback() {
    salesData = sampleData.map(item => ({
        ...item,
        date: new Date(item.date),
        deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
        invoiceDate: item.invoiceDate ? new Date(item.invoiceDate) : null
    }));
    
    generateReport();
    showAlert('샘플 데이터를 표시합니다. Google Sheets 연결을 확인해주세요.', 'warning');
}

// 보고서 생성
function generateReport() {
    try {
        const startYear = parseInt($('startYear')?.value || '2024');
        const startMonth = parseInt($('startMonth')?.value || '1');
        const endYear = parseInt($('endYear')?.value || '2024');
        const endMonth = parseInt($('endMonth')?.value || '12');
        
        const startDate = new Date(startYear, startMonth - 1, 1);
        const endDate = new Date(endYear, endMonth, 0);
        
        if (startDate > endDate) {
            showAlert('시작 기간이 종료 기간보다 늦을 수 없습니다.', 'warning');
            return;
        }
        
        const monthlyData = initializeMonthlyData(startDate, endDate);
        aggregateData(monthlyData, startDate, endDate);
        renderMonthlyTable(monthlyData);
        
    } catch (error) {
        console.error('보고서 생성 오류:', error);
        showAlert('보고서 생성 중 오류가 발생했습니다.', 'error');
    }
}

// 월별 데이터 초기화
function initializeMonthlyData(startDate, endDate) {
    const monthlyData = {};
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const yearMonth = getYearMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
        monthlyData[yearMonth] = {
            order: { count: 0, amount: 0, details: [] },
            government: { count: 0, amount: 0, details: [] },
            private: { count: 0, amount: 0, details: [] }
        };
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return monthlyData;
}

// 데이터 집계
function aggregateData(monthlyData, startDate, endDate) {
    salesData.forEach(item => {
        const itemDate = item.date;
        
        if (itemDate >= startDate && itemDate <= endDate) {
            const yearMonth = getYearMonth(itemDate.getFullYear(), itemDate.getMonth() + 1);
            
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
    
    currentDetailData = monthlyData;
}

// 테이블 렌더링
function renderMonthlyTable(monthlyData) {
    const tbody = $('monthlyTableBody');
    if (!tbody) {
        console.error('monthlyTableBody 요소를 찾을 수 없습니다.');
        return;
    }
    
    tbody.innerHTML = '';
    
    let totals = {
        orderCount: 0, orderAmount: 0,
        govCount: 0, govAmount: 0,
        privCount: 0, privAmount: 0
    };
    
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
        orderCountCell.textContent = formatNumber(data.order.count);
        orderCountCell.className = 'text-center border-r border-gray-200';
        row.appendChild(orderCountCell);
        
        // 주문 금액
        const orderAmountCell = document.createElement('td');
        orderAmountCell.textContent = formatCurrency(data.order.amount);
        orderAmountCell.className = 'text-right border-r border-gray-200';
        if (data.order.amount > 0) {
            orderAmountCell.className += ' amount-clickable cursor-pointer';
            orderAmountCell.addEventListener('click', () => showDetail(yearMonth, 'order', '주문'));
        }
        row.appendChild(orderAmountCell);
        
        // 관급매출 건수
        const govCountCell = document.createElement('td');
        govCountCell.textContent = formatNumber(data.government.count);
        govCountCell.className = 'text-center border-r border-gray-200';
        row.appendChild(govCountCell);
        
        // 관급매출 금액
        const govAmountCell = document.createElement('td');
        govAmountCell.textContent = formatCurrency(data.government.amount);
        govAmountCell.className = 'text-right border-r border-gray-200';
        if (data.government.amount > 0) {
            govAmountCell.className += ' amount-clickable cursor-pointer';
            govAmountCell.addEventListener('click', () => showDetail(yearMonth, 'government', '관급매출'));
        }
        row.appendChild(govAmountCell);
        
        // 사급매출 건수
        const privCountCell = document.createElement('td');
        privCountCell.textContent = formatNumber(data.private.count);
        privCountCell.className = 'text-center border-r border-gray-200';
        row.appendChild(privCountCell);
        
        // 사급매출 금액
        const privAmountCell = document.createElement('td');
        privAmountCell.textContent = formatCurrency(data.private.amount);
        privAmountCell.className = 'text-right border-r border-gray-200';
        if (data.private.amount > 0) {
            privAmountCell.className += ' amount-clickable cursor-pointer';
            privAmountCell.addEventListener('click', () => showDetail(yearMonth, 'private', '사급매출'));
        }
        row.appendChild(privAmountCell);
        
        // 합계
        const totalAmount = data.order.amount + data.government.amount + data.private.amount;
        const totalCell = document.createElement('td');
        totalCell.textContent = formatCurrency(totalAmount);
        totalCell.className = 'text-right font-medium';
        row.appendChild(totalCell);
        
        tbody.appendChild(row);
        
        // 총계 누적
        totals.orderCount += data.order.count;
        totals.orderAmount += data.order.amount;
        totals.govCount += data.government.count;
        totals.govAmount += data.government.amount;
        totals.privCount += data.private.count;
        totals.privAmount += data.private.amount;
    });
    
    updateTotalRow(totals);
}

// 합계 행 업데이트
function updateTotalRow(totals) {
    const elements = {
        totalOrderCount: $('totalOrderCount'),
        totalOrderAmount: $('totalOrderAmount'),
        totalGovCount: $('totalGovCount'),
        totalGovAmount: $('totalGovAmount'),
        totalPrivCount: $('totalPrivCount'),
        totalPrivAmount: $('totalPrivAmount'),
        grandTotal: $('grandTotal')
    };
    
    if (elements.totalOrderCount) elements.totalOrderCount.textContent = formatNumber(totals.orderCount);
    if (elements.totalOrderAmount) elements.totalOrderAmount.textContent = formatCurrency(totals.orderAmount);
    if (elements.totalGovCount) elements.totalGovCount.textContent = formatNumber(totals.govCount);
    if (elements.totalGovAmount) elements.totalGovAmount.textContent = formatCurrency(totals.govAmount);
    if (elements.totalPrivCount) elements.totalPrivCount.textContent = formatNumber(totals.privCount);
    if (elements.totalPrivAmount) elements.totalPrivAmount.textContent = formatCurrency(totals.privAmount);
    
    const grandTotal = totals.orderAmount + totals.govAmount + totals.privAmount;
    if (elements.grandTotal) elements.grandTotal.textContent = formatCurrency(grandTotal);
}

// 상세 내역 표시
function showDetail(yearMonth, type, typeName) {
    const [year, month] = yearMonth.split('-');
    const monthName = `${year}년 ${parseInt(month)}월`;
    
    const details = currentDetailData[yearMonth][type].details;
    
    if (!details || details.length === 0) {
        showAlert('해당 월에 데이터가 없습니다.', 'info');
        return;
    }
    
    const detailTitle = $('detailTitle');
    if (detailTitle) {
        detailTitle.textContent = `${monthName} ${typeName} 상세 내역 (${details.length}건)`;
    }
    
    renderDetailTable(details, type);
    
    const detailSection = $('detailSection');
    if (detailSection) {
        detailSection.classList.remove('hidden');
        detailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 상세 테이블 렌더링
function renderDetailTable(details, type) {
    const tbody = $('detailTableBody');
    if (!tbody) return;
    
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
        amountCell.textContent = formatCurrency(item.amount);
        amountCell.className = 'text-right font-medium amount';
        row.appendChild(amountCell);
        
        // 날짜
        const dateCell = document.createElement('td');
        let dateText = '';
        if (type === 'order') {
            dateText = item.deliveryDate ? formatDate(item.deliveryDate) : '-';
        } else {
            dateText = item.invoiceDate ? formatDate(item.invoiceDate) : '-';
        }
        dateCell.textContent = dateText;
        dateCell.className = 'text-center';
        row.appendChild(dateCell);
        
        // 구분
        const typeCell = document.createElement('td');
        let badgeClass = 'badge-gray';
        switch (item.type) {
            case '주문': badgeClass = 'badge-primary'; break;
            case '관급매출': badgeClass = 'badge-success'; break;
            case '사급매출': badgeClass = 'badge-warning'; break;
        }
        typeCell.innerHTML = `<span class="badge ${badgeClass}">${item.type}</span>`;
        typeCell.className = 'text-center';
        row.appendChild(typeCell);
        
        tbody.appendChild(row);
    });
}

// 전역 함수들
window.loadSampleData = loadSalesData;  // HTML에서 호출하는 함수
window.generateReport = generateReport;
window.showDetail = showDetail;

// 페이지 로드시 자동 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('페이지 로드 완료, 데이터 로딩 시작...');
    setTimeout(loadSalesData, 100); // 약간의 지연 후 실행
});
