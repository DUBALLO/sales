// 월별매출 현황 JavaScript (기능 개선 최종 버전)

// 전역 변수
let salesData = [];
let currentDetailData = {}; 
let currentUnfilteredDetails = [];
let detailSortState = { key: 'amount', direction: 'desc' }; // 상세 테이블 정렬 상태

// 안전한 요소 가져오기
function $(id) {
    const element = document.getElementById(id);
    if (!element) console.warn(`요소를 찾을 수 없습니다: ${id}`);
    return element;
}

// 데이터 로드 및 파싱
async function loadSalesData() {
    try {
        console.log('CSV 데이터 로드 시작...');
        $('monthlyTableBody').innerHTML = '<tr><td colspan="8" class="text-center py-4">데이터를 불러오는 중...</td></tr>';
        
        const rawData = await window.sheetsAPI.loadCSVData('monthlySales');
        console.log(`${rawData.length}개의 원시 데이터 로드 완료`);
        
        if (rawData.length === 0) throw new Error('파싱된 데이터가 없습니다.');
        
        salesData = rawData.map(item => {
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
                contractName: contractValue.trim(), customer: customerValue.trim(),
                amount: parsedAmount, orderDate: orderDate, invoiceDate: invoiceDate,
                item: itemValue ? itemValue.trim() : ''
            };
            
            const results = [];
            if (orderDate) results.push({ ...baseItem, date: orderDate, type: invoiceDate ? '납품완료' : '주문' });
            if (finalType && invoiceDate) results.push({ ...baseItem, date: invoiceDate, type: finalType });
            return results;

        }).flat().filter(item => item.date && !isNaN(item.date.getTime()) && item.amount > 0 && item.contractName !== '계약명 없음' && item.customer !== '거래처 없음');
        
        console.log(`${salesData.length}건의 유효한 데이터 변환 완료`);
        generateReport();
        CommonUtils.showAlert(`${salesData.length}건의 데이터를 성공적으로 로드했습니다.`, 'success');
        
    } catch (error) {
        console.error('CSV 로드 실패:', error);
        CommonUtils.showAlert(`데이터 로드 실패: ${error.message}.`, 'error');
    }
}

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

function generateReport() {
    const startYear = parseInt($('startYear').value), startMonth = parseInt($('startMonth').value);
    const endYear = parseInt($('endYear').value), endMonth = parseInt($('endMonth').value);
    const startDate = new Date(startYear, startMonth - 1, 1), endDate = new Date(endYear, endMonth, 0);

    if (startDate > endDate) return CommonUtils.showAlert('시작 기간이 종료 기간보다 늦을 수 없습니다.', 'warning');
    
    const monthlyData = initializeMonthlyData(startDate, endDate);
    aggregateData(monthlyData, startDate, endDate);
    renderMonthlyTable(monthlyData);
}

function initializeMonthlyData(startDate, endDate) {
    const data = {};
    let current = new Date(startDate);
    while (current <= endDate) {
        const yearMonth = CommonUtils.getYearMonth(current.getFullYear(), current.getMonth() + 1);
        data[yearMonth] = {
            order: { count: 0, amount: 0, details: [] },
            government: { count: 0, amount: 0, details: [] },
            private: { count: 0, amount: 0, details: [] }
        };
        current.setMonth(current.getMonth() + 1);
    }
    return data;
}

function aggregateData(monthlyData, startDate, endDate) {
    const contractTracker = new Set();
    salesData.forEach(item => {
        const date = item.type === '주문' || item.type === '납품완료' ? item.orderDate : item.invoiceDate;
        if (date >= startDate && date <= endDate) {
            const yearMonth = CommonUtils.getYearMonth(date.getFullYear(), date.getMonth() + 1);
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
            <td class="text-center border-r border-gray-200">${CommonUtils.formatNumber(data.order.count)}</td>
            <td class="text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="order">${CommonUtils.formatCurrency(data.order.amount)}</td>
            <td class="text-center border-r border-gray-200">${CommonUtils.formatNumber(data.government.count)}</td>
            <td class="text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="government">${CommonUtils.formatCurrency(data.government.amount)}</td>
            <td class="text-center border-r border-gray-200">${CommonUtils.formatNumber(data.private.count)}</td>
            <td class="text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="private">${CommonUtils.formatCurrency(data.private.amount)}</td>
            <td class="text-right font-medium">${CommonUtils.formatCurrency(data.government.amount + data.private.amount)}</td>
        `;
        totals.orderCount += data.order.count; totals.orderAmount += data.order.amount;
        totals.govCount += data.government.count; totals.govAmount += data.government.amount;
        totals.privCount += data.private.count; totals.privAmount += data.private.amount;
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

function updateTotalRow(totals) {
    const totalCellsData = {
        totalOrderCount: CommonUtils.formatNumber(totals.orderCount), totalOrderAmount: CommonUtils.formatCurrency(totals.orderAmount),
        totalGovCount: CommonUtils.formatNumber(totals.govCount), totalGovAmount: CommonUtils.formatCurrency(totals.govAmount),
        totalPrivCount: CommonUtils.formatNumber(totals.privCount), totalPrivAmount: CommonUtils.formatCurrency(totals.privAmount),
        grandTotal: CommonUtils.formatCurrency(totals.govAmount + totals.privAmount)
    };
    for (const id in totalCellsData) {
        const el = $(id);
        if (el) el.textContent = totalCellsData[id];
    }
    ['totalOrderAmount', 'totalGovAmount', 'totalPrivAmount'].forEach(id => {
        const el = $(id);
        if (!el) return;
        const type = id.replace('total', '').replace('Amount', '').toLowerCase();
        const typeName = { order: '주문', government: '관급매출', private: '사급매출' }[type];
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);
        if (totals[type + 'Amount'] > 0) {
            newEl.classList.add('amount-clickable', 'cursor-pointer', 'text-blue-600', 'hover:text-blue-800');
            newEl.addEventListener('click', () => showDetail('total', type, typeName));
        }
    });
}

function showDetail(yearMonth, type, typeName) {
    let details, title;
    if (yearMonth === 'total') {
        details = Object.values(currentDetailData).flatMap(monthData => monthData[type].details);
        title = `전체 기간 ${typeName} 상세 내역`;
    } else {
        const [year, month] = yearMonth.split('-');
        details = currentDetailData[yearMonth]?.[type]?.details || [];
        title = `${year}년 ${parseInt(month)}월 ${typeName} 상세 내역`;
    }
    if (details.length === 0) return CommonUtils.showAlert('해당 내역이 없습니다.', 'info');
    
    const processedDetails = processDetailData(details);
    currentUnfilteredDetails = processedDetails; 

    const detailTitle = $('detailTitle');
    if (detailTitle) detailTitle.textContent = `${title} (${processedDetails.length}건)`;
    
    updateDetailTableHeader(type);
    sortAndRenderDetailTable();
    
    $('detailSection').classList.remove('hidden');
    $('detailSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function processDetailData(details) {
    const mergedData = new Map();
    details.forEach(item => {
        const key = `${item.contractName}-${item.customer}`;
        if (mergedData.has(key)) {
            const existing = mergedData.get(key);
            existing.amount += item.amount;
            if (item.item) {
                existing.itemMap.set(item.item, (existing.itemMap.get(item.item) || 0) + item.amount);
            }
        } else {
            const newItem = { ...item, itemMap: new Map() };
            if (item.item) {
                newItem.itemMap.set(item.item, item.amount);
            }
            mergedData.set(key, newItem);
        }
    });
    return Array.from(mergedData.values());
}

function updateDetailTableHeader(type) {
    const table = $('detailTable');
    let thead = table.querySelector('thead');
    if (!thead) thead = table.createTHead();
    thead.innerHTML = '';

    const headers = type === 'order' 
        ? [{key: 'type', text: '상태'}, {key: 'contractName', text: '계약명'}, {key: 'customer', text: '거래처'}, {key: 'amount', text: '금액'}, {key: 'displayDate', text: '날짜'}, {key: 'item', text: '품목'}]
        : [{key: 'contractName', text: '계약명'}, {key: 'customer', text: '거래처'}, {key: 'amount', text: '금액'}, {key: 'displayDate', text: '날짜'}, {key: 'item', text: '품목'}];
    
    const headerRow = thead.insertRow();
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.text;
        th.dataset.sortKey = header.key;
        th.className = 'cursor-pointer hover:bg-gray-100';
        headerRow.appendChild(th);
    });

    thead.addEventListener('click', (e) => {
        const sortKey = e.target.dataset.sortKey;
        if (sortKey) {
            if (detailSortState.key === sortKey) {
                detailSortState.direction = detailSortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                detailSortState.key = sortKey;
                detailSortState.direction = 'desc';
            }
            sortAndRenderDetailTable();
        }
    });
}

function sortAndRenderDetailTable() {
    const { key, direction } = detailSortState;
    currentUnfilteredDetails.sort((a, b) => {
        const valA = a[key], valB = b[key];
        let comparison = 0;
        if (typeof valA === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (valA instanceof Date) {
            comparison = valA.getTime() - valB.getTime();
        } else {
            comparison = valA - valB;
        }
        return direction === 'asc' ? comparison : -comparison;
    });
    renderDetailTableBody(currentUnfilteredDetails);
}

function renderDetailTableBody(data) {
    const tbody = $('detailTableBody');
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4">데이터가 없습니다.</td></tr>';
        return;
    }
    const isOrder = data[0].hasOwnProperty('orderDate');

    data.forEach(item => {
        const row = tbody.insertRow();
        const mostSoldItem = [...item.itemMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
        const itemText = item.itemMap.size > 1 ? `${mostSoldItem} 외` : mostSoldItem;

        let cells = [];
        if (isOrder) {
            const badgeClass = item.type === '주문' ? 'badge-primary' : 'badge-success';
            cells.push(`<td class="text-center"><span class="badge ${badgeClass}">${item.type}</span></td>`);
        }
        cells.push(
            `<td class="font-medium">${item.contractName}</td>`,
            `<td>${item.customer}</td>`,
            `<td class="text-right font-medium amount">${CommonUtils.formatCurrency(item.amount)}</td>`,
            `<td class="text-center">${CommonUtils.formatDate(item.displayDate)}</td>`,
            `<td class="text-center" title="${[...item.itemMap.keys()].join(', ')}">${itemText}</td>`
        );
        row.innerHTML = cells.join('');
    });
}

function hideDetailSection() { $('detailSection').classList.add('hidden'); }

async function refreshData() {
    const btn = $('refreshBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner" style="border-color: #fff; border-bottom-color: transparent;"></div> 새로고침 중...';
    try {
        await window.sheetsAPI.refreshCache();
        await loadSalesData();
        CommonUtils.showAlert('데이터가 새로고침되었습니다.', 'success');
    } catch (error) {
        CommonUtils.showAlert('데이터 새로고침에 실패했습니다.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 G-01-15.357-2m15.357 2H15"></path></svg> 새로고침`;
    }
}

function printReport() { window.print(); }

window.refreshData = refreshData;
window.printReport = printReport;
window.hideDetailSection = hideDetailSection;

document.addEventListener('DOMContentLoaded', function() {
    $('searchBtn').addEventListener('click', generateReport);
    let attempts = 0;
    const interval = setInterval(() => {
        if (window.sheetsAPI && window.CommonUtils) {
            clearInterval(interval);
            loadSalesData();
        } else if (attempts++ > 30) { 
            clearInterval(interval);
            CommonUtils.showAlert('API 또는 공통 스크립트 로드 실패.', 'error');
        }
    }, 100);
});
