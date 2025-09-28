// monthly-sales.js (v2 - 캐시 및 데이터 집계 오류 수정)

let salesData = [];
let currentDetailData = {}; // 월별 상세 데이터를 저장하는 객체
let currentUnfilteredDetails = []; // 현재 상세 보기에 표시된 데이터 (정렬/필터링 전)
let detailSortState = { key: 'date', direction: 'desc' };

function $(id) {
    const element = document.getElementById(id);
    if (!element) console.warn(`요소를 찾을 수 없습니다: ${id}`);
    return element;
}

/**
 * 다양한 형식의 날짜 문자열을 Date 객체로 변환하는 함수
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    
    // YYYY-MM-DD 형식 처리
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) return new Date(dateStr);
    
    // MM/DD/YYYY 형식 처리
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const [month, day, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
    }
    return null;
}

/**
 * [수정] 데이터 로드 및 단일 객체로 파싱 (중복 집계 원인 제거)
 * 시트의 각 행을 하나의 트랜잭션 객체로 변환합니다.
 */
async function loadSalesData() {
    try {
        $('monthlyTableBody').innerHTML = '<tr><td colspan="8" class="text-center py-4">데이터를 불러오는 중...</td></tr>';
        const rawData = await window.sheetsAPI.loadCSVData('monthlySales');
        if (!rawData) throw new Error('데이터를 가져오지 못했습니다.');

        salesData = rawData.map(item => {
            const orderDateValue = item['날짜'] || item['주문일자'] || item['기준일자'] || '';
            const invoiceDateValue = item['세금계산서'] || '';
            const amountValue = item['합계'] || '0';
            const parsedAmount = parseInt(String(amountValue).replace(/,/g, '')) || 0;

            // 필수 데이터가 없으면 이 행은 건너뜁니다.
            if (!orderDateValue || parsedAmount === 0) {
                return null;
            }
            
            const typeValue = item['구분'] || '';
            let salesType = null;
            if (invoiceDateValue) {
                if (typeValue.includes('관급')) salesType = '관급매출';
                else if (typeValue.includes('사급')) salesType = '사급매출';
            }

            return {
                orderDate: parseDate(orderDateValue),
                invoiceDate: parseDate(invoiceDateValue),
                salesType: salesType,
                contractName: (item['계약명'] || '계약명 없음').trim(),
                customer: (item['거래처'] || '거래처 없음').trim(),
                amount: parsedAmount,
                item: (item['품목구분'] || '').trim(),
                spec: (item['규격'] || '').trim(),
                quantity: parseInt(String(item['수량'] || '0').replace(/,/g, '')),
                unitPrice: parseInt(String(item['단가'] || '0').replace(/,/g, ''))
            };
        }).filter(item => item !== null); // null로 처리된 (유효하지 않은) 데이터 제거

        generateReport();
    } catch (error) {
        console.error('CSV 로드 또는 파싱 실패:', error);
        CommonUtils.showAlert(`데이터 로드 실패: ${error.message}.`, 'error', 0);
    }
}


/**
 * 선택된 기간에 따라 리포트를 생성합니다.
 */
function generateReport() {
    const startYear = parseInt($('startYear').value), startMonth = parseInt($('startMonth').value);
    const endYear = parseInt($('endYear').value), endMonth = parseInt($('endMonth').value);
    const startDate = new Date(startYear, startMonth - 1, 1), endDate = new Date(endYear, endMonth, 0);
    if (startDate > endDate) return CommonUtils.showAlert('시작 기간이 종료 기간보다 늦을 수 없습니다.', 'warning');
    
    const monthlyData = initializeMonthlyData(startDate, endDate);
    aggregateData(monthlyData, startDate, endDate);
    renderMonthlyTable(monthlyData);
}

/**
 * 월별 데이터 저장을 위한 객체를 초기화합니다.
 */
function initializeMonthlyData(startDate, endDate) {
    const data = {};
    let current = new Date(startDate);
    while (current <= endDate) {
        const yearMonth = CommonUtils.getYearMonth(current.getFullYear(), current.getMonth() + 1);
        data[yearMonth] = {
            order: { count: new Set(), amount: 0, details: [] },
            government: { count: new Set(), amount: 0, details: [] },
            private: { count: new Set(), amount: 0, details: [] }
        };
        current.setMonth(current.getMonth() + 1);
    }
    return data;
}

/**
 * [수정] 데이터를 월별로 집계하는 로직 변경
 * 주문과 매출을 날짜에 맞게 각각 집계하여 중복을 방지합니다.
 */
function aggregateData(monthlyData, startDate, endDate) {
    salesData.forEach(item => {
        const contractKey = `${item.contractName}-${item.customer}`;

        // 1. 주문일자 기준 집계
        if (item.orderDate && item.orderDate >= startDate && item.orderDate <= endDate) {
            const yearMonth = CommonUtils.getYearMonth(item.orderDate.getFullYear(), item.orderDate.getMonth() + 1);
            if (monthlyData[yearMonth]) {
                monthlyData[yearMonth].order.count.add(contractKey);
                monthlyData[yearMonth].order.amount += item.amount;
                monthlyData[yearMonth].order.details.push(item);
            }
        }
        
        // 2. 세금계산서 발행일(매출일) 기준 집계
        if (item.invoiceDate && item.invoiceDate >= startDate && item.invoiceDate <= endDate) {
            const yearMonth = CommonUtils.getYearMonth(item.invoiceDate.getFullYear(), item.invoiceDate.getMonth() + 1);
            if (monthlyData[yearMonth] && item.salesType) {
                let target;
                if (item.salesType === '관급매출') target = monthlyData[yearMonth].government;
                else if (item.salesType === '사급매출') target = monthlyData[yearMonth].private;
                
                if (target) {
                    target.count.add(contractKey);
                    target.amount += item.amount;
                    target.details.push(item);
                }
            }
        }
    });
    currentDetailData = monthlyData;
}


/**
 * 집계된 데이터를 바탕으로 월별 매출 테이블을 그립니다.
 */
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
            <td class="px-4 py-3 font-medium border-r border-gray-200">${year}년 ${parseInt(month)}월</td>
            <td class="px-4 py-3 text-center border-r border-gray-200">${CommonUtils.formatNumber(data.order.count.size)}</td>
            <td class="px-4 py-3 text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="order">${CommonUtils.formatCurrency(data.order.amount)}</td>
            <td class="px-4 py-3 text-center border-r border-gray-200">${CommonUtils.formatNumber(data.government.count.size)}</td>
            <td class="px-4 py-3 text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="government">${CommonUtils.formatCurrency(data.government.amount)}</td>
            <td class="px-4 py-3 text-center border-r border-gray-200">${CommonUtils.formatNumber(data.private.count.size)}</td>
            <td class="px-4 py-3 text-right border-r border-gray-200 amount-cell" data-year-month="${yearMonth}" data-type="private">${CommonUtils.formatCurrency(data.private.amount)}</td>
            <td class="px-4 py-3 text-right font-medium">${CommonUtils.formatCurrency(data.government.amount + data.private.amount)}</td>
        `;
        data.order.count.forEach(c => totals.orderCount.add(c)); 
        totals.orderAmount += data.order.amount;
        data.government.count.forEach(c => totals.govCount.add(c)); 
        totals.govAmount += data.government.amount;
        data.private.count.forEach(c => totals.privCount.add(c)); 
        totals.privAmount += data.private.amount;
    });

    tbody.querySelectorAll('.amount-cell').forEach(cell => {
        if (parseInt(String(cell.textContent).replace(/[^0-9-]/g, '')) > 0) {
            cell.classList.add('amount-clickable');
            cell.addEventListener('click', () => {
                const { yearMonth, type } = cell.dataset;
                const typeName = { order: '주문', government: '관급매출', private: '사급매출' }[type];
                showDetail(yearMonth, type, typeName);
            });
        }
    });

    updateTotalRow({
        ...totals,
        grandTotal: totals.govAmount + totals.privAmount
    });
}

function updateTotalRow(totals) {
    $('totalOrderCount').textContent = CommonUtils.formatNumber(totals.orderCount.size);
    $('totalOrderAmount').textContent = CommonUtils.formatCurrency(totals.orderAmount);
    $('totalGovCount').textContent = CommonUtils.formatNumber(totals.govCount.size);
    $('totalGovAmount').textContent = CommonUtils.formatCurrency(totals.govAmount);
    $('totalPrivCount').textContent = CommonUtils.formatNumber(totals.privCount.size);
    $('totalPrivAmount').textContent = CommonUtils.formatCurrency(totals.privAmount);
    $('grandTotal').textContent = CommonUtils.formatCurrency(totals.grandTotal);
}

function showDetail(yearMonth, type, typeName) {
    const details = currentDetailData[yearMonth]?.[type]?.details || [];
    if (details.length === 0) return CommonUtils.showAlert('해당 내역이 없습니다.', 'info');
    
    const [year, month] = yearMonth.split('-');
    const title = `${year}년 ${parseInt(month)}월 ${typeName} 상세 내역`;
    
    currentUnfilteredDetails = processDetailData(details);

    $('detailTitle').textContent = `${title} (${currentUnfilteredDetails.length}건)`;
    updateDetailTableHeaderAndEvents(type);
    detailSortState = { key: 'date', direction: 'desc' }; // 기본 정렬값
    sortAndRenderDetailTable(type);
    
    $('detailSection').classList.remove('hidden');
    $('detailSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function processDetailData(details) {
    const mergedData = new Map();
    details.forEach(item => {
        const key = `${item.contractName}-${item.customer}`;
        if (mergedData.has(key)) {
            // 이미 병합된 데이터가 있으면 금액만 더하고, 품목 정보 추가
            const existing = mergedData.get(key);
            existing.totalAmount += item.amount;
            if (item.item) {
                 existing.items.push({
                    item: item.item, spec: item.spec, quantity: item.quantity,
                    unitPrice: item.unitPrice, amount: item.amount
                });
            }
        } else {
            // 새로 추가되는 데이터
            const newItem = {
                ...item,
                totalAmount: item.amount,
                items: []
            };
            if (item.item) {
                newItem.items.push({
                    item: item.item, spec: item.spec, quantity: item.quantity,
                    unitPrice: item.unitPrice, amount: item.amount
                });
            }
            mergedData.set(key, newItem);
        }
    });
    return Array.from(mergedData.values());
}

function updateDetailTableHeaderAndEvents(type) {
    const table = $('detailTable');
    let thead = table.querySelector('thead');
    if (!thead) thead = table.createTHead();
    
    // 헤더 정의
    const headers = [
        {key: 'date', text: '날짜'},
        {key: 'contractName', text: '계약명'},
        {key: 'customer', text: '거래처'},
        {key: 'amount', text: '금액'}
    ];
    
    thead.innerHTML = '';
    const headerRow = thead.insertRow();
    headers.forEach(header => {
        const th = document.createElement('th');
        th.innerHTML = `<span>${header.text}</span>`;
        th.dataset.sortKey = header.key;
        th.className = 'cursor-pointer hover:bg-gray-100 p-2';
        headerRow.appendChild(th);
    });
    
    thead.removeEventListener('click', (e) => handleSort(e, type));
    thead.addEventListener('click', (e) => handleSort(e, type));
}

function handleSort(e, type) {
    const th = e.target.closest('th');
    if (th && th.dataset.sortKey) {
        const sortKey = th.dataset.sortKey;
        if (detailSortState.key === sortKey) {
            detailSortState.direction = detailSortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            detailSortState.key = sortKey;
            detailSortState.direction = 'desc';
        }
        sortAndRenderDetailTable(type);
    }
}

function sortAndRenderDetailTable(type) {
    const thead = $('detailTable').querySelector('thead');
    thead.querySelectorAll('th').forEach(th => {
        const span = th.querySelector('span');
        let text = span.textContent.replace(/ [▲▼]$/, '');
        if (th.dataset.sortKey === detailSortState.key) {
            text += detailSortState.direction === 'asc' ? ' ▲' : ' ▼';
        }
        span.textContent = text;
    });

    const { key, direction } = detailSortState;
    currentUnfilteredDetails.sort((a, b) => {
        let valA, valB;
        if (key === 'amount') {
            valA = a.totalAmount;
            valB = b.totalAmount;
        } else if (key === 'date') {
            // 타입에 따라 정렬 기준 날짜를 다르게 설정
            valA = type === 'order' ? a.orderDate : a.invoiceDate;
            valB = type === 'order' ? b.orderDate : b.invoiceDate;
        } else {
            valA = a[key];
            valB = b[key];
        }

        let comparison = 0;
        if (valA instanceof Date) comparison = valA.getTime() - valB.getTime();
        else if (typeof valA === 'string') comparison = valA.localeCompare(valB, 'ko-KR');
        else comparison = (valA || 0) - (valB || 0);
        
        return direction === 'asc' ? comparison : -comparison;
    });
    renderDetailTableBody(currentUnfilteredDetails, type);
}

function renderDetailTableBody(data, type) {
    const tbody = $('detailTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">데이터가 없습니다.</td></tr>';
        return;
    }
    data.forEach(item => {
        const row = tbody.insertRow();
        const displayDate = type === 'order' ? item.orderDate : item.invoiceDate;
        
        row.insertCell().textContent = CommonUtils.formatDate(displayDate);
        row.cells[0].className = 'text-center no-wrap p-2';
        
        row.insertCell().innerHTML = `<a href="#" class="text-blue-600 hover:underline">${item.contractName}</a>`;
        row.cells[1].className = 'font-medium p-2';
        
        row.insertCell().textContent = item.customer;
        row.cells[2].className = 'p-2';
        
        row.insertCell().textContent = CommonUtils.formatCurrency(item.totalAmount);
        row.cells[3].className = 'text-right font-medium amount no-wrap p-2';
        
        row.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            showContractItemDetail(item);
        });
    });
}


function showContractItemDetail(item) {
    let contentHtml = '';
    if (item.items && item.items.length > 0) {
        contentHtml += `<div class="overflow-x-auto"><table class="w-full text-sm text-left">
            <thead class="bg-gray-50"><tr>
                <th class="p-2">품목구분</th><th class="p-2">규격</th>
                <th class="p-2 text-right">수량</th><th class="p-2 text-right">단가</th>
                <th class="p-2 text-right">합계액</th>
            </tr></thead><tbody>`;
        item.items.sort((a,b) => b.amount - a.amount).forEach(subItem => {
            contentHtml += `<tr class="border-b">
                <td class="p-2 whitespace-nowrap">${subItem.item}</td>
                <td class="p-2 whitespace-nowrap">${subItem.spec || '-'}</td>
                <td class="p-2 text-right">${CommonUtils.formatNumber(subItem.quantity) || '-'}</td>
                <td class="p-2 text-right">${CommonUtils.formatCurrency(subItem.unitPrice) || '-'}</td>
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
    const refreshBtn = document.getElementById('refreshBtn');
    CommonUtils.toggleLoading(refreshBtn, true);
    try {
        await window.sheetsAPI.refreshCache('monthlySales'); // 캐시 삭제
        await loadSalesData(); // 데이터 다시 로드
        CommonUtils.showAlert('데이터를 새로고침했습니다.', 'success');
    } catch (error) {
        CommonUtils.showAlert(`데이터 새로고침에 실패했습니다: ${error.message}`, 'error', 0);
    } finally {
        CommonUtils.toggleLoading(refreshBtn, false);
    }
}

function printReport() { window.print(); }

document.addEventListener('DOMContentLoaded', function() {
    $('searchBtn').addEventListener('click', generateReport);
    $('refreshBtn').addEventListener('click', refreshData);
    $('exportBtn').addEventListener('click', () => {
        const table = $('monthlyTable');
        if (window.CommonUtils && table) {
            CommonUtils.exportTableToCSV(table, '월별매출현황.csv');
        }
    });
    
    // 페이지 최초 로드
    loadSalesData();
});
