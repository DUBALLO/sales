// 월별매출 현황 JavaScript (정렬 기능 및 오류 최종 수정 3)

// 전역 변수
let salesData = [];
let currentDetailData = {};
let currentUnfilteredDetails = [];
let detailSortState = { key: 'date', direction: 'desc' }; // 기본 정렬 상태

function $(id) {
    const element = document.getElementById(id);
    if (!element) console.warn(`요소를 찾을 수 없습니다: ${id}`);
    return element;
}

// 데이터 로드
async function loadSalesData() {
    try {
        $('monthlyTableBody').innerHTML = '<tr><td colspan="8" class="text-center py-4">데이터를 불러오는 중...</td></tr>';
        const rawData = await window.sheetsAPI.loadCSVData('monthlySales');
        if (rawData.length === 0) throw new Error('파싱된 데이터가 없습니다.');

        salesData = rawData.flatMap(item => {
            const results = [];
            const dateValue = item['날짜'] || item['주문일자'] || item['기준일자'] || '';
            const recordDate = parseDate(dateValue);
            if (!recordDate) return [];

            const invoiceDateValue = item['세금계산서'] || '';
            const invoiceDate = parseDate(invoiceDateValue);
            const typeValue = item['구분'] || '';
            const contractValue = item['계약명'] || '계약명 없음';
            const customerValue = item['거래처'] || '거래처 없음';
            const amountValue = item['합계'] || '0';
            const itemValue = item['품목'] || '';
            const specValue = item['규격'] || '';
            const quantityValue = parseInt(String(item['수량'] || '0').replace(/[^\d]/g, ''));
            const unitPriceValue = parseInt(String(item['단가'] || '0').replace(/[^\d]/g, ''));
            const parsedAmount = parseInt(String(amountValue).replace(/[^\d]/g, '')) || 0;

            if(parsedAmount === 0 || contractValue === '계약명 없음' || customerValue === '거래처 없음') return [];

            const baseItem = {
                contractName: contractValue.trim(), customer: customerValue.trim(),
                amount: parsedAmount, item: itemValue.trim(), spec: specValue.trim(),
                quantity: quantityValue, unitPrice: unitPriceValue
            };

            results.push({
                ...baseItem, date: recordDate, displayDate: recordDate,
                type: invoiceDate ? '납품완료' : '주문', invoiceDate: invoiceDate
            });
            
            const saleDate = invoiceDate || recordDate;
            if (typeValue.includes('관급')) {
                results.push({ ...baseItem, date: saleDate, displayDate: saleDate, type: '관급매출' });
            } else if (typeValue.includes('사급')) {
                results.push({ ...baseItem, date: saleDate, displayDate: saleDate, type: '사급매출' });
            }
            return results;
        });
        
        generateReport();
        CommonUtils.showAlert(`${rawData.length}건의 원본 데이터를 처리했습니다.`, 'success');
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
        data[yearMonth] = { order: { count: new Set(), amount: 0, details: [] }, government: { count: new Set(), amount: 0, details: [] }, private: { count: new Set(), amount: 0, details: [] } };
        current.setMonth(current.getMonth() + 1);
    }
    return data;
}

function aggregateData(monthlyData, startDate, endDate) {
    salesData.forEach(item => {
        if (item.date >= startDate && item.date <= endDate) {
            const yearMonth = CommonUtils.getYearMonth(item.date.getFullYear(), item.date.getMonth() + 1);
            if (!monthlyData[yearMonth]) return;
            const contractKey = `${item.contractName}-${item.customer}`;
            let target;
            if (item.type === '주문' || item.type === '납품완료') target = monthlyData[yearMonth].order;
            else if (item.type === '관급매출') target = monthlyData[yearMonth].government;
            else if (item.type === '사급매출') target = monthlyData[yearMonth].private;
            if (target) {
                target.count.add(contractKey);
                target.amount += item.amount;
                target.details.push(item);
            }
        }
    });
    currentDetailData = monthlyData;
}

function renderMonthlyTable(monthlyData) {
    const tbody = $('monthlyTableBody');
    tbody.innerHTML = '';
    const totals = { orderCount: new Set(), orderAmount: 0, govCount: new Set(), govAmount: 0, privCount: new Set(), privAmount: 0 };
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
            <td class="text-center border-r border-gray-200">${CommonUtils.formatNumber(data.order.count.size)}</td>
            <td class="text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="order">${CommonUtils.formatCurrency(data.order.amount)}</td>
            <td class="text-center border-r border-gray-200">${CommonUtils.formatNumber(data.government.count.size)}</td>
            <td class="text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="government">${CommonUtils.formatCurrency(data.government.amount)}</td>
            <td class="text-center border-r border-gray-200">${CommonUtils.formatNumber(data.private.count.size)}</td>
            <td class="text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="private">${CommonUtils.formatCurrency(data.private.amount)}</td>
            <td class="text-right font-medium">${CommonUtils.formatCurrency(data.government.amount + data.private.amount)}</td>
        `;
        data.order.count.forEach(c => totals.orderCount.add(c)); totals.orderAmount += data.order.amount;
        data.government.count.forEach(c => totals.govCount.add(c)); totals.govAmount += data.government.amount;
        data.private.count.forEach(c => totals.privCount.add(c)); totals.privAmount += data.private.amount;
    });

    tbody.querySelectorAll('.amount-cell').forEach(cell => {
        if (parseInt(cell.textContent.replace(/[^\d]/g, '')) > 0) {
            cell.classList.add('amount-clickable');
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
        totalOrderCount: CommonUtils.formatNumber(totals.orderCount.size), totalOrderAmount: CommonUtils.formatCurrency(totals.orderAmount),
        totalGovCount: CommonUtils.formatNumber(totals.govCount.size), totalGovAmount: CommonUtils.formatCurrency(totals.govAmount),
        totalPrivCount: CommonUtils.formatNumber(totals.privCount.size), totalPrivAmount: CommonUtils.formatCurrency(totals.privAmount),
        grandTotal: CommonUtils.formatCurrency(totals.govAmount + totals.privAmount)
    };
    for (const id in totalCellsData) { $(id).textContent = totalCellsData[id]; }
    
    ['totalOrderAmount', 'totalGovAmount', 'totalPrivAmount'].forEach(id => {
        const el = $(id);
        const type = id.replace('total', '').replace('Amount', '').toLowerCase();
        const typeName = { order: '주문', government: '관급매출', private: '사급매출' }[type];
        el.onclick = null; el.classList.remove('amount-clickable');
        if (totals[type + 'Amount'] > 0) {
            el.classList.add('amount-clickable');
            el.onclick = () => showDetail('total', type, typeName);
        }
    });
}

function showDetail(yearMonth, type, typeName) {
    let details, title;
    if (yearMonth === 'total') {
        details = Object.values(currentDetailData).flatMap(monthData => monthData[type] ? monthData[type].details : []);
        title = `전체 기간 ${typeName} 상세 내역`;
    } else {
        const [year, month] = yearMonth.split('-');
        details = currentDetailData[yearMonth]?.[type]?.details || [];
        title = `${year}년 ${parseInt(month)}월 ${typeName} 상세 내역`;
    }
    if (details.length === 0) return CommonUtils.showAlert('해당 내역이 없습니다.', 'info');
    
    const processedDetails = processDetailData(details, type);
    currentUnfilteredDetails = processedDetails; 

    const detailTitle = $('detailTitle');
    if (detailTitle) detailTitle.textContent = `${title} (${processedDetails.length}건)`;
    
    updateDetailTableHeaderAndEvents(type); // 이벤트 핸들러까지 여기서 설정
    detailSortState = { key: 'date', direction: 'desc' }; // 상세내역 열 때 기본 정렬
    sortAndRenderDetailTable();
    
    $('detailSection').classList.remove('hidden');
    $('detailSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function processDetailData(details, type) {
    const mergedData = new Map();
    const relevantDetails = details.filter(d => {
        if (type === 'order') return d.type === '주문' || d.type === '납품완료';
        if (type === 'government') return d.type === '관급매출';
        if (type === 'private') return d.type === '사급매출';
        return false;
    });

    relevantDetails.forEach(item => {
        const key = `${item.contractName}-${item.customer}`;
        if (mergedData.has(key)) {
            const existing = mergedData.get(key);
            existing.totalAmount += item.amount;
            if (item.item) existing.items.push(item);
        } else {
            mergedData.set(key, { ...item, totalAmount: item.amount, items: item.item ? [item] : [] });
        }
    });
    return Array.from(mergedData.values());
}

// 상세 테이블 헤더 생성 및 이벤트 핸들러 설정 (타이밍 문제 해결)
function updateDetailTableHeaderAndEvents(type) {
    const table = $('detailTable');
    let thead = table.querySelector('thead');
    if (!thead) thead = table.createTHead();
    thead.innerHTML = '';

    const headers = type === 'order' 
        ? [{key: 'type', text: '상태'}, {key: 'contractName', text: '계약명'}, {key: 'customer', text: '거래처'}, {key: 'amount', text: '금액'}, {key: 'date', text: '날짜'}]
        : [{key: 'contractName', text: '계약명'}, {key: 'customer', text: '거래처'}, {key: 'amount', text: '금액'}, {key: 'date', text: '날짜'}];
    
    const headerRow = thead.insertRow();
    headers.forEach(header => {
        const th = document.createElement('th');
        th.innerHTML = `<span>${header.text}</span>`;
        th.dataset.sortKey = header.key;
        th.className = 'cursor-pointer hover:bg-gray-100';
        headerRow.appendChild(th);
    });

    const existingListener = thead.listener;
    if (existingListener) thead.removeEventListener('click', existingListener);

    const newListener = (e) => {
        const th = e.target.closest('th');
        if (th && th.dataset.sortKey) {
            const sortKey = th.dataset.sortKey;
            if (detailSortState.key === sortKey) {
                detailSortState.direction = detailSortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                detailSortState.key = sortKey;
                detailSortState.direction = 'desc';
            }
            sortAndRenderDetailTable();
        }
    };
    thead.addEventListener('click', newListener);
    thead.listener = newListener; // 나중에 제거하기 위해 리스너 참조 저장
}

function sortAndRenderDetailTable() {
    const thead = $('detailTable').querySelector('thead');
    if (thead) {
        thead.querySelectorAll('th').forEach(th => {
            const span = th.querySelector('span');
            if (span) {
                let text = span.textContent.replace(/ [▲▼]$/, '');
                if (th.dataset.sortKey === detailSortState.key) {
                    text += detailSortState.direction === 'asc' ? ' ▲' : ' ▼';
                }
                span.textContent = text;
            }
        });
    }

    const { key, direction } = detailSortState;
    currentUnfilteredDetails.sort((a, b) => {
        let valA = key === 'amount' ? a.totalAmount : a[key];
        let valB = key === 'amount' ? b.totalAmount : b[key];
        let comparison = 0;
        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';
        if (typeof valA === 'string') comparison = valA.localeCompare(valB);
        else if (valA instanceof Date) comparison = valA.getTime() - valB.getTime();
        else comparison = valA - valB;
        return direction === 'asc' ? comparison : -comparison;
    });
    renderDetailTableBody(currentUnfilteredDetails);
}

function renderDetailTableBody(data) {
    const tbody = $('detailTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">데이터가 없습니다.</td></tr>';
        return;
    }
    const isOrder = data[0].type === '주문' || data[0].type === '납품완료';
    data.forEach(item => {
        const row = tbody.insertRow();
        if (isOrder) {
            const badgeClass = item.type === '주문' ? 'badge-primary' : 'badge-success';
            row.insertCell().innerHTML = `<span class="badge ${badgeClass}">${item.type}</span>`;
            row.cells[0].className = 'text-center no-wrap';
        }
        row.insertCell().innerHTML = `<a href="#" class="text-blue-600 hover:underline">${item.contractName}</a>`;
        row.cells[isOrder ? 1 : 0].className = 'font-medium';
        row.insertCell().textContent = item.customer;
        row.insertCell().textContent = CommonUtils.formatCurrency(item.totalAmount);
        row.cells[isOrder ? 3 : 2].className = 'text-right font-medium amount no-wrap';
        row.insertCell().textContent = CommonUtils.formatDate(item.date);
        row.cells[isOrder ? 4 : 3].className = 'text-center no-wrap';
        row.querySelector('a').addEventListener('click', (e) => { e.preventDefault(); showContractItemDetail(item); });
    });
}

function showContractItemDetail(item) {
    let contentHtml = '';
    if (item.items && item.items.length > 0) {
        contentHtml += `<div class="overflow-x-auto"><table class="w-full text-sm text-left">
            <thead class="bg-gray-50"><tr>
                <th class="p-2">품목</th><th class="p-2">규격</th>
                <th class="p-2 text-right">수량</th><th class="p-2 text-right">단가</th>
                <th class="p-2 text-right">합계액</th>
            </tr></thead><tbody>`;
        item.items.sort((a,b) => b.amount - a.amount).forEach(subItem => {
            contentHtml += `<tr class="border-b">
                <td class="p-2 whitespace-nowrap">${subItem.item || '-'}</td>
                <td class="p-2 whitespace-nowrap">${subItem.spec || '-'}</td>
                <td class="p-2 text-right">${subItem.quantity ? CommonUtils.formatNumber(subItem.quantity) : '-'}</td>
                <td class="p-2 text-right">${subItem.unitPrice ? CommonUtils.formatCurrency(subItem.unitPrice) : '-'}</td>
                <td class="p-2 text-right font-medium">${CommonUtils.formatCurrency(subItem.amount)}</td>
            </tr>`;
        });
        contentHtml += '</tbody></table></div>';
    } else {
        contentHtml += '<p class="text-center text-gray-500 py-4">이 계약에는 등록된 품목 정보가 없습니다.</p>';
    }
    CommonUtils.showModal(`'${item.contractName}' 품목 상세 내역`, contentHtml, { width: '800px' });
}

function hideDetailSection() { $('detailSection').classList.add('hidden'); }
async function refreshData() {
    const btn = $('refreshBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="loading-spinner"></div> 새로고침 중...';
    try {
        await window.sheetsAPI.refreshCache();
        await loadSalesData();
        CommonUtils.showAlert('데이터가 새로고침되었습니다.', 'success');
    } catch (error) {
        CommonUtils.showAlert('데이터 새로고침에 실패했습니다.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin-round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> 새로고침`;
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
