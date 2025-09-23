// 월별매출 현황 JavaScript (기능 개선 버전)

// 전역 변수
let salesData = [];
let currentDetailData = {}; // 월별 상세 데이터를 저장하는 객체
let currentUnfilteredDetails = []; // 현재 표시 중인 상세 데이터 (필터링 전 원본)

// 안전한 요소 가져오기
function $(id) {
    const element = document.getElementById(id);
    if (!element) console.warn(`요소를 찾을 수 없습니다: ${id}`);
    return element;
}

// 공통 함수 래퍼
const formatNumber = (num) => window.CommonUtils?.formatNumber(num) || new Intl.NumberFormat('ko-KR').format(num || 0);
const formatCurrency = (amount) => window.CommonUtils?.formatCurrency(amount) || new Intl.NumberFormat('ko-KR').format(amount || 0) + '원';
const formatDate = (date) => window.CommonUtils?.formatDate(date) || (date ? new Date(date).toLocaleDateString('ko-KR') : '-');
const getYearMonth = (year, month) => window.CommonUtils?.getYearMonth(year, month) || `${year}-${String(month).padStart(2, '0')}`;
const showAlert = (message, type = 'info') => window.CommonUtils?.showAlert(message, type) || alert(`[${type}] ${message}`);


// 데이터 로드 및 파싱
async function loadSalesData() {
    try {
        console.log('CSV 데이터 로드 시작...');
        $('monthlyTableBody').innerHTML = '<tr><td colspan="8" class="text-center py-4">데이터를 불러오는 중...</td></tr>';
        
        const rawData = await window.sheetsAPI.loadCSVData('monthlySales');
        console.log(`${rawData.length}개의 원시 데이터 로드 완료`);
        
        if (rawData.length === 0) throw new Error('파싱된 데이터가 없습니다.');
        
        salesData = rawData.map((item, index) => {
            const dateValue = item['주문일자'] || item['날짜'] || '';
            const typeValue = item['구분'] || '';
            const contractValue = item['계약명'] || item['사업명'] || '계약명 없음';
            const customerValue = item['거래처'] || '거래처 없음';
            const amountValue = item['합계'] || '0';
            const invoiceDateValue = item['세금계산서'] || '';
            const itemValue = item['품목'] || item['제품'] || '';

            const parsedAmount = parseInt(String(amountValue).replace(/[^\d]/g, '')) || 0;
            const orderDate = parseDate(dateValue);
            const invoiceDate = parseDate(invoiceDateValue);
            
            let finalType = '';
            if (typeValue.includes('관급')) finalType = '관급매출';
            else if (typeValue.includes('사급')) finalType = '사급매출';

            const baseItem = {
                contractName: contractValue.trim(),
                customer: customerValue.trim(),
                amount: parsedAmount,
                orderDate: orderDate,
                invoiceDate: invoiceDate,
                item: itemValue ? itemValue.trim() : ''
            };
            
            const results = [];
            if (orderDate) {
                results.push({ ...baseItem, date: orderDate, type: invoiceDate ? '납품완료' : '주문' });
            }
            if (finalType && invoiceDate) {
                results.push({ ...baseItem, date: invoiceDate, type: finalType });
            }
            return results;

        }).flat().filter(item => item.date && !isNaN(item.date.getTime()) && item.amount > 0 && item.contractName !== '계약명 없음' && item.customer !== '거래처 없음');
        
        console.log(`${salesData.length}건의 유효한 데이터 변환 완료`);
        generateReport();
        showAlert(`${salesData.length}건의 데이터를 성공적으로 로드했습니다.`, 'success');
        
    } catch (error) {
        console.error('CSV 로드 실패:', error);
        showAlert(`데이터 로드 실패: ${error.message}. 샘플 데이터로 대체합니다.`, 'error');
        // loadSampleDataFallback(); // 필요시 샘플 데이터 로드 함수 호출
    }
}

// 날짜 파싱 (보조 함수)
function parseDate(dateStr) {
    if (!dateStr) return null;
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) return new Date(dateStr);
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const [month, day, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
    }
    return null;
}

// 보고서 생성
function generateReport() {
    const startYear = parseInt($('startYear').value);
    const startMonth = parseInt($('startMonth').value);
    const endYear = parseInt($('endYear').value);
    const endMonth = parseInt($('endMonth').value);
    
    const startDate = new Date(startYear, startMonth - 1, 1);
    const endDate = new Date(endYear, endMonth, 0);

    if (startDate > endDate) return showAlert('시작 기간이 종료 기간보다 늦을 수 없습니다.', 'warning');
    
    const monthlyData = initializeMonthlyData(startDate, endDate);
    aggregateData(monthlyData, startDate, endDate);
    renderMonthlyTable(monthlyData);
}

// 데이터 초기화
function initializeMonthlyData(startDate, endDate) {
    const data = {};
    let current = new Date(startDate);
    while (current <= endDate) {
        const yearMonth = getYearMonth(current.getFullYear(), current.getMonth() + 1);
        data[yearMonth] = {
            order: { count: 0, amount: 0, details: [] },
            government: { count: 0, amount: 0, details: [] },
            private: { count: 0, amount: 0, details: [] }
        };
        current.setMonth(current.getMonth() + 1);
    }
    return data;
}

// 데이터 집계
function aggregateData(monthlyData, startDate, endDate) {
    const contractTracker = new Set();
    salesData.forEach(item => {
        const date = item.type === '주문' || item.type === '납품완료' ? item.orderDate : item.invoiceDate;
        if (date >= startDate && date <= endDate) {
            const yearMonth = getYearMonth(date.getFullYear(), date.getMonth() + 1);
            if (!monthlyData[yearMonth]) return;

            const contractKey = `${yearMonth}-${item.type}-${item.contractName}`;
            
            let target;
            if (item.type === '주문' || item.type === '납품완료') target = monthlyData[yearMonth].order;
            else if (item.type === '관급매출') target = monthlyData[yearMonth].government;
            else if (item.type === '사급매출') target = monthlyData[yearMonth].private;
            
            if (target) {
                if (!contractTracker.has(contractKey)) {
                    target.count++;
                    contractTracker.add(contractKey);
                }
                target.amount += item.amount;
                target.details.push({ ...item, displayDate: date });
            }
        }
    });
    currentDetailData = monthlyData;
}

// 월별 테이블 렌더링
function renderMonthlyTable(monthlyData) {
    const tbody = $('monthlyTableBody');
    tbody.innerHTML = '';
    const totals = { orderCount: 0, orderAmount: 0, govCount: 0, govAmount: 0, privCount: 0, privAmount: 0 };

    const sortedMonths = Object.keys(monthlyData).sort();
    if (sortedMonths.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-8">해당 기간에 데이터가 없습니다.</td></tr>';
        updateTotalRow(totals);
        return;
    }
    
    sortedMonths.forEach(yearMonth => {
        const data = monthlyData[yearMonth];
        const [year, month] = yearMonth.split('-');
        const row = tbody.insertRow();
        row.className = 'hover:bg-gray-50';
        
        row.innerHTML = `
            <td class="font-medium border-r border-gray-200">${year}년 ${parseInt(month)}월</td>
            <td class="text-center border-r border-gray-200">${formatNumber(data.order.count)}</td>
            <td class="text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="order">${formatCurrency(data.order.amount)}</td>
            <td class="text-center border-r border-gray-200">${formatNumber(data.government.count)}</td>
            <td class="text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="government">${formatCurrency(data.government.amount)}</td>
            <td class="text-center border-r border-gray-200">${formatNumber(data.private.count)}</td>
            <td class="text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="private">${formatCurrency(data.private.amount)}</td>
            <td class="text-right font-medium">${formatCurrency(data.government.amount + data.private.amount)}</td>
        `;

        Object.keys(totals).forEach(key => {
            const [type, metric] = key.split(/(?=[A-Z])/);
            const lcMetric = metric.toLowerCase();
            if (data[type] && typeof data[type][lcMetric] === 'number') {
                totals[key] += data[type][lcMetric];
            }
        });
    });

    tbody.querySelectorAll('.amount-cell').forEach(cell => {
        if (parseInt(cell.textContent.replace(/[^\d]/g, '')) > 0) {
            cell.classList.add('amount-clickable', 'cursor-pointer', 'text-blue-600', 'hover:text-blue-800');
            cell.title = '클릭하여 상세내역 보기';
            cell.addEventListener('click', () => {
                const { yearMonth, type } = cell.dataset;
                const typeName = { order: '주문', government: '관급매출', private: '사급매출' }[type];
                showDetail(yearMonth, type, typeName);
            });
        }
    });
    
    updateTotalRow(totals);
}

// 합계 행 업데이트 및 링크 추가
function updateTotalRow(totals) {
    const totalCells = {
        totalOrderCount: formatNumber(totals.orderCount),
        totalOrderAmount: formatCurrency(totals.orderAmount),
        totalGovCount: formatNumber(totals.govCount),
        totalGovAmount: formatCurrency(totals.govAmount),
        totalPrivCount: formatNumber(totals.privCount),
        totalPrivAmount: formatCurrency(totals.privAmount),
        grandTotal: formatCurrency(totals.govAmount + totals.privAmount)
    };

    for (const id in totalCells) {
        const el = $(id);
        if (el) el.textContent = totalCells[id];
    }
    
    // 합계 금액에 클릭 이벤트 추가
    ['totalOrderAmount', 'totalGovAmount', 'totalPrivAmount'].forEach(id => {
        const el = $(id);
        const type = id.replace('total', '').replace('Amount', '').toLowerCase();
        const typeName = { order: '주문', government: '관급매출', private: '사급매출' }[type];
        
        el.classList.remove('amount-clickable', 'cursor-pointer', 'text-blue-600', 'hover:text-blue-800');
        el.style.cursor = 'default';
        // 기존 이벤트 리스너 제거 (cloneNode 트릭 사용)
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);
        
        if (totals[type + 'Amount'] > 0) {
            newEl.classList.add('amount-clickable', 'cursor-pointer', 'text-blue-600', 'hover:text-blue-800');
            newEl.addEventListener('click', () => showDetail('total', type, typeName));
        }
    });
}


// 상세 내역 표시
function showDetail(yearMonth, type, typeName) {
    let details;
    let title;

    if (yearMonth === 'total') {
        details = Object.values(currentDetailData).flatMap(monthData => monthData[type].details);
        title = `전체 기간 ${typeName} 상세 내역`;
    } else {
        const [year, month] = yearMonth.split('-');
        details = currentDetailData[yearMonth]?.[type]?.details || [];
        title = `${year}년 ${parseInt(month)}월 ${typeName} 상세 내역`;
    }

    if (details.length === 0) return showAlert('해당 내역이 없습니다.', 'info');
    
    // 데이터 가공 (중복 합치기)
    const processedDetails = processDetailData(details);
    currentUnfilteredDetails = processedDetails; // 필터링을 위해 원본 저장

    const detailTitle = $('detailTitle');
    if (detailTitle) detailTitle.textContent = `${title} (${processedDetails.length}건)`;
    
    updateDetailTableHeader(type);
    renderDetailTableBody(processedDetails); // 가공된 데이터로 테이블 렌더링
    
    $('detailSection').classList.remove('hidden');
    $('detailSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 상세 데이터 가공 (중복 계약 합치기)
function processDetailData(details) {
    const mergedData = new Map();
    details.forEach(item => {
        const key = `${item.contractName}-${item.customer}`;
        if (mergedData.has(key)) {
            const existing = mergedData.get(key);
            existing.amount += item.amount;
            if (item.item && !existing.allItems.has(item.item)) {
                existing.allItems.add(item.item);
            }
        } else {
            mergedData.set(key, {
                ...item,
                allItems: new Set(item.item ? [item.item] : [])
            });
        }
    });
    return Array.from(mergedData.values()).sort((a, b) => b.amount - a.amount);
}


// 상세 테이블 헤더 및 필터 생성
function updateDetailTableHeader(type) {
    const table = $('detailTable');
    let thead = table.querySelector('thead');
    if (!thead) thead = table.createTHead();
    thead.innerHTML = ''; // 초기화

    const headers = type === 'order' 
        ? ['상태', '계약명', '거래처', '금액', '날짜', '품목']
        : ['계약명', '거래처', '금액', '날짜', '품목'];
    
    const headerRow = thead.insertRow();
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });

    const filterRow = thead.insertRow();
    headers.forEach((headerText, index) => {
        const th = document.createElement('th');
        if (['금액', '날짜', '상태'].includes(headerText)) {
             th.innerHTML = ``; // 금액/날짜/상태는 필터 제외
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `${headerText} 필터...`;
            input.className = 'w-full p-1 border rounded text-xs column-filter';
            input.dataset.columnIndex = index;
            input.addEventListener('keyup', filterDetailTable);
            th.appendChild(input);
        }
        filterRow.appendChild(th);
    });
}

// 상세 테이블 필터링 함수
function filterDetailTable() {
    const filters = Array.from(document.querySelectorAll('#detailTable .column-filter')).map(input => ({
        value: input.value.toLowerCase(),
        index: parseInt(input.dataset.columnIndex)
    }));
    
    const filteredData = currentUnfilteredDetails.filter(item => {
        return filters.every(filter => {
            if (!filter.value) return true;
            
            let cellValue = '';
            // 필터 인덱스에 따라 올바른 데이터 필드를 매핑
            const isOrder = document.querySelectorAll('#detailTable thead tr:first-child th').length === 6;
            
            const columns = isOrder 
                ? ['type', 'contractName', 'customer', 'amount', 'displayDate', 'item']
                : ['contractName', 'customer', 'amount', 'displayDate', 'item'];
            
            const field = columns[filter.index];
            if (item[field]) {
                 cellValue = String(item[field]).toLowerCase();
            }

            return cellValue.includes(filter.value);
        });
    });
    
    renderDetailTableBody(filteredData);
}


// 상세 테이블 본문 렌더링
function renderDetailTableBody(data) {
    const tbody = $('detailTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">필터 결과가 없습니다.</td></tr>';
        return;
    }

    const isOrder = document.querySelectorAll('#detailTable thead tr:first-child th').length === 6;

    data.forEach(item => {
        const row = tbody.insertRow();
        const allItemsText = Array.from(item.allItems).join(', ');
        
        let cells = [];
        if(isOrder) {
            const badgeClass = item.type === '주문' ? 'badge-primary' : 'badge-success';
            cells.push(`<td class="text-center"><span class="badge ${badgeClass}">${item.type}</span></td>`);
        }
        cells.push(
            `<td class="font-medium">${item.contractName}</td>`,
            `<td>${item.customer}</td>`,
            `<td class="text-right font-medium amount">${formatCurrency(item.amount)}</td>`,
            `<td class="text-center">${formatDate(item.displayDate)}</td>`,
            `<td class="text-center" title="${allItemsText}">${Array.from(item.allItems)[0] || '-'}${item.allItems.size > 1 ? ` 등 ${item.allItems.size}개` : ''}</td>`
        );
        row.innerHTML = cells.join('');
    });
}

function hideDetailSection() {
    $('detailSection').classList.add('hidden');
}

async function refreshData() {
    const btn = $('refreshBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner" style="border-color: #fff; border-bottom-color: transparent;"></div> 새로고침 중...';
    try {
        await window.sheetsAPI.refreshCache();
        await loadSalesData();
        showAlert('데이터가 새로고침되었습니다.', 'success');
    } catch (error) {
        showAlert('데이터 새로고침에 실패했습니다.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> 새로고침`;
    }
}

function printReport() {
    window.print();
}

// 전역 함수 노출
window.refreshData = refreshData;
window.printReport = printReport;
window.hideDetailSection = hideDetailSection;

// 페이지 로드 시 자동 실행
document.addEventListener('DOMContentLoaded', function() {
    $('searchBtn').addEventListener('click', generateReport);
    
    let attempts = 0;
    const interval = setInterval(() => {
        if (window.sheetsAPI) {
            clearInterval(interval);
            loadSalesData();
        } else if (attempts++ > 20) { // 2초 후 타임아웃
            clearInterval(interval);
            showAlert('Google Sheets API 로드 실패. 샘플 데이터로 대체합니다.', 'error');
            // loadSampleDataFallback();
        }
    }, 100);
});
