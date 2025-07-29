// 월별매출 현황 JavaScript (오류 수정 버전)

// 전역 변수
let salesData = [];
let currentDetailData = {};

// 안전한 요소 가져오기
function $(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`요소를 찾을 수 없습니다: ${id}`);
    }
    return element;
}

// 포맷팅 함수들
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
        if (type === 'error') {
            alert(`오류: ${message}`);
        }
    }
}

// 샘플 데이터
const sampleData = [
    {
        date: '2024-01-15',
        type: '주문',
        contractName: '천보산 산림욕장 보완사업 관급자재',
        customer: '경기도 양주시',
        amount: 1500000,
        deliveryDate: '2024-01-25',
        invoiceDate: null,
        item: '식생매트'
    },
    {
        date: '2024-01-20',
        type: '관급매출',
        contractName: '의정부시 녹지조성사업',
        customer: '의정부시',
        amount: 2800000,
        deliveryDate: null,
        invoiceDate: '2024-01-25',
        item: '고정핀'
    },
    {
        date: '2024-02-05',
        type: '주문',
        contractName: '서울시 한강공원 보행로 개선',
        customer: '서울시',
        amount: 3200000,
        deliveryDate: '2024-02-15',
        invoiceDate: null,
        item: '식생매트'
    },
    {
        date: '2024-02-10',
        type: '관급매출',
        contractName: '부천시 중앙공원 조성사업',
        customer: '부천시',
        amount: 4500000,
        deliveryDate: null,
        invoiceDate: '2024-02-15',
        item: '보행매트'
    },
    {
        date: '2024-03-12',
        type: '관급매출',
        contractName: '광주 북구 문화센터 주변 정비',
        customer: '광주 북구',
        amount: 5200000,
        deliveryDate: null,
        invoiceDate: '2024-03-15',
        item: '식생매트'
    },
    {
        date: '2024-04-07',
        type: '사급매출',
        contractName: '제주시 관광지 보행로 정비',
        customer: '제주시',
        amount: 3100000,
        deliveryDate: null,
        invoiceDate: '2024-04-10',
        item: '고정핀'
    }
];

// 날짜 파싱
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

// CSV 데이터 로드
async function loadSalesData() {
    try {
        console.log('CSV 데이터 로드 시작...');
        
        const tbody = $('monthlyTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">데이터를 불러오는 중...</td></tr>';
        }
        
        let rawData;
        if (window.sheetsAPI) {
            rawData = await window.sheetsAPI.loadCSVData();
        } else {
            throw new Error('sheets-api.js가 로드되지 않았습니다.');
        }
        
        console.log(`${rawData.length}개의 원시 데이터 로드 완료`);
        console.log('첫 번째 데이터 샘플:', rawData[0]); // 디버깅용
        
        if (rawData.length === 0) {
            throw new Error('파싱된 데이터가 없습니다.');
        }
        
        // 데이터 변환
        salesData = rawData.map((item, index) => {
            try {
                const dateValue = item['주문일자'] || item['날짜'] || item['date'] || '';
                const typeValue = item['구분'] || item['type'] || '';
                const contractValue = item['계약명'] || item['사업명'] || '계약명 없음';
                const customerValue = item['거래처'] || item['수요기관'] || '거래처 없음';
                const amountValue = item['합계'] || item['금액'] || '0';
                const invoiceDateValue = item['세금계산서'] || item['발행일'] || '';
                
                // 품목 필드 - 가능한 모든 컬럼명 확인
                const itemValue = item['품목'] || item['제품'] || item['item'] || item['상품명'] || 
                                item['품목명'] || item['제품명'] || item['Item'] || item['Product'] || 
                                item['G'] || item['G열'] || item['품목(G)'] || 
                                Object.values(item)[6] || ''; // G열은 보통 7번째 컬럼 (0부터 시작하므로 6)
                
                // 디버깅: 품목 데이터 로깅
                if (index < 3) {
                    console.log(`행 ${index + 1} 품목 데이터:`, {
                        '품목': item['품목'],
                        '제품': item['제품'],
                        'item': item['item'],
                        '상품명': item['상품명'],
                        'G열값': Object.values(item)[6],
                        '최종품목값': itemValue,
                        '전체항목키': Object.keys(item)
                    });
                }
                
                const cleanAmount = amountValue.toString().replace(/[^\d]/g, '');
                const parsedAmount = parseInt(cleanAmount) || 0;
                
                const orderDate = parseDate(dateValue);
                const invoiceDate = parseDate(invoiceDateValue);
                
                let finalType = '';
                if (typeValue.includes('관급')) {
                    finalType = '관급매출';
                } else if (typeValue.includes('사급')) {
                    finalType = '사급매출';
                }
                
                const baseItem = {
                    contractName: contractValue.trim(),
                    customer: customerValue.trim(),
                    amount: parsedAmount,
                    orderDate: orderDate,
                    invoiceDate: invoiceDate,
                    item: itemValue ? itemValue.trim() : '' // 품목이 빈 값인 경우 빈 문자열
                };
                
                const results = [];
                
                if (orderDate) {
                    let orderStatus = invoiceDate ? '납품완료' : '주문';
                    results.push({
                        ...baseItem,
                        date: orderDate,
                        type: orderStatus,
                        invoiceDate: invoiceDate
                    });
                }
                
                if (finalType && invoiceDate) {
                    results.push({
                        ...baseItem,
                        date: invoiceDate,
                        type: finalType,
                        invoiceDate: invoiceDate
                    });
                }
                
                return results;
            } catch (error) {
                console.warn(`데이터 변환 오류 (행 ${index + 1}):`, error);
                return [];
            }
        }).flat().filter(item => {
            return item && 
                   item.date instanceof Date && 
                   !isNaN(item.date.getTime()) && 
                   item.amount > 0 &&
                   item.contractName !== '계약명 없음' &&
                   item.customer !== '거래처 없음';
        });
        
        console.log(`${salesData.length}건의 유효한 데이터 변환 완료`);
        console.log('변환된 데이터 샘플:', salesData.slice(0, 3)); // 변환된 데이터 샘플 확인
        
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
    console.log('샘플 데이터로 전환합니다.');
    
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
    const contractCounts = {};
    
    salesData.forEach(item => {
        let targetDate = null;
        
        switch (item.type) {
            case '주문':
            case '납품완료':
                targetDate = item.orderDate || item.date;
                break;
            case '관급매출':
            case '사급매출':
                targetDate = item.invoiceDate || item.date;
                break;
            default:
                targetDate = item.date;
        }
        
        if (targetDate && targetDate >= startDate && targetDate <= endDate) {
            const yearMonth = getYearMonth(targetDate.getFullYear(), targetDate.getMonth() + 1);
            
            if (monthlyData[yearMonth]) {
                const contractKey = `${yearMonth}-${item.type}-${item.contractName}`;
                
                switch (item.type) {
                    case '주문':
                    case '납품완료':
                        if (!contractCounts[contractKey]) {
                            monthlyData[yearMonth].order.count++;
                            contractCounts[contractKey] = true;
                        }
                        monthlyData[yearMonth].order.amount += item.amount;
                        monthlyData[yearMonth].order.details.push({
                            ...item,
                            displayDate: targetDate
                        });
                        break;
                        
                    case '관급매출':
                        if (!contractCounts[contractKey]) {
                            monthlyData[yearMonth].government.count++;
                            contractCounts[contractKey] = true;
                        }
                        monthlyData[yearMonth].government.amount += item.amount;
                        monthlyData[yearMonth].government.details.push({
                            ...item,
                            displayDate: targetDate
                        });
                        break;
                        
                    case '사급매출':
                        if (!contractCounts[contractKey]) {
                            monthlyData[yearMonth].private.count++;
                            contractCounts[contractKey] = true;
                        }
                        monthlyData[yearMonth].private.amount += item.amount;
                        monthlyData[yearMonth].private.details.push({
                            ...item,
                            displayDate: targetDate
                        });
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
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-8">해당 기간에 데이터가 없습니다.</td></tr>';
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
            orderAmountCell.className += ' amount-clickable cursor-pointer text-blue-600 hover:text-blue-800';
            orderAmountCell.title = '클릭하여 상세내역 보기';
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
            govAmountCell.className += ' amount-clickable cursor-pointer text-blue-600 hover:text-blue-800';
            govAmountCell.title = '클릭하여 상세내역 보기';
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
            privAmountCell.className += ' amount-clickable cursor-pointer text-blue-600 hover:text-blue-800';
            privAmountCell.title = '클릭하여 상세내역 보기';
            privAmountCell.addEventListener('click', () => showDetail(yearMonth, 'private', '사급매출'));
        }
        row.appendChild(privAmountCell);
        
        // 합계
        const totalAmount = data.government.amount + data.private.amount;
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
    
    const grandTotal = totals.govAmount + totals.privAmount;
    if (elements.grandTotal) elements.grandTotal.textContent = formatCurrency(grandTotal);
}

// 상세 테이블 헤더 업데이트
function updateDetailTableHeader(type) {
    // 기존 테이블 헤더 찾기
    const table = $('detailTable');
    if (!table) return;
    
    let headerRow = table.querySelector('thead tr');
    if (!headerRow) {
        const thead = table.querySelector('thead') || table.createTHead();
        headerRow = thead.insertRow();
    }
    
    headerRow.innerHTML = '';
    
    if (type === 'order') {
        // 주문 상세내역: 상태, 계약명, 거래처, 금액, 날짜, 품목
        headerRow.innerHTML = `
            <th>상태</th>
            <th>계약명</th>
            <th>거래처</th>
            <th>금액</th>
            <th>날짜</th>
            <th>품목</th>
        `;
    } else {
        // 관급/사급 매출 상세내역: 계약명, 거래처, 금액, 날짜, 품목
        headerRow.innerHTML = `
            <th>계약명</th>
            <th>거래처</th>
            <th>금액</th>
            <th>날짜</th>
            <th>품목</th>
        `;
    }
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
    
    // 테이블 헤더 업데이트
    updateDetailTableHeader(type);
    
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
    
    console.log('상세 테이블 렌더링 시작, 데이터:', details); // 디버깅용
    
    // 계약명별로 데이터 합치기
    const mergedData = {};
    details.forEach(item => {
        const key = `${item.contractName}-${item.customer}`;
        
        // 디버깅: 각 아이템의 품목 정보 확인
        console.log('아이템 품목 정보:', {
            contractName: item.contractName,
            item: item.item,
            amount: item.amount
        });
        
        if (mergedData[key]) {
            mergedData[key].amount += item.amount;
            // 더 큰 금액을 가진 품목으로 업데이트
            if (item.amount > mergedData[key].maxAmount) {
                mergedData[key].mainItem = item.item || '';
                mergedData[key].maxAmount = item.amount;
                console.log(`${key}의 메인 품목 업데이트:`, item.item, '금액:', item.amount);
            }
            mergedData[key].hasMultipleItems = true;
            // 모든 품목 수집 (중복 제거용)
            if (item.item && !mergedData[key].allItems.includes(item.item)) {
                mergedData[key].allItems.push(item.item);
            }
        } else {
            mergedData[key] = {
                contractName: item.contractName,
                customer: item.customer,
                amount: item.amount,
                type: item.type,
                displayDate: item.displayDate || item.invoiceDate || item.date,
                mainItem: item.item || '',
                maxAmount: item.amount,
                hasMultipleItems: false,
                allItems: item.item ? [item.item] : [] // 모든 품목 리스트
            };
            console.log(`${key} 새로 생성, 품목:`, item.item);
        }
    });
    
    // 배열로 변환하고 금액순 정렬
    const sortedData = Object.values(mergedData).sort((a, b) => b.amount - a.amount);
    
    console.log('합쳐진 데이터:', sortedData); // 디버깅용
    
    sortedData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // 주문 상세내역인 경우 '상태' 컬럼을 맨 앞에 추가
        if (type === 'order') {
            const statusCell = document.createElement('td');
            let badgeClass = item.type === '주문' ? 'badge-primary' : 'badge-success';
            statusCell.innerHTML = `<span class="badge ${badgeClass}">${item.type}</span>`;
            statusCell.className = 'text-center';
            row.appendChild(statusCell);
        }
        
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
        const dateText = item.displayDate ? formatDate(item.displayDate) : '-';
        dateCell.textContent = dateText;
        dateCell.className = 'text-center';
        row.appendChild(dateCell);
        
        // 품목 (개선된 로직)
        const itemCell = document.createElement('td');
        let itemText = '';
        
        if (item.allItems.length === 0) {
            itemText = '-';
        } else if (item.allItems.length === 1) {
            itemText = item.allItems[0] || '-';
        } else {
            // 여러 품목이 있는 경우
            if (item.mainItem) {
                itemText = item.mainItem + ' 등';
            } else {
                // 메인 품목이 없으면 첫 번째 품목 사용
                itemText = (item.allItems[0] || '') + ' 등';
            }
        }
        
        itemCell.textContent = itemText;
        itemCell.className = 'text-center';
        itemCell.title = item.allItems.length > 1 ? `포함된 품목: ${item.allItems.join(', ')}` : ''; // 툴팁으로 전체 품목 표시
        row.appendChild(itemCell);
        
        console.log(`행 ${index + 1} 품목 표시:`, itemText, '전체품목:', item.allItems); // 디버깅용
        
        tbody.appendChild(row);
    });
}

// 상세내역 섹션 숨기기
function hideDetailSection() {
    const detailSection = $('detailSection');
    if (detailSection) {
        detailSection.classList.add('hidden');
    }
}

// 데이터 새로고침
async function refreshData() {
    try {
        const refreshBtn = $('refreshBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = '새로고침 중...';
        }
        
        if (window.sheetsAPI) {
            await window.sheetsAPI.refreshCache();
        }
        
        await loadSalesData();
        showAlert('데이터가 새로고침되었습니다.', 'success');
        
    } catch (error) {
        console.error('데이터 새로고침 실패:', error);
        showAlert('데이터 새로고침에 실패했습니다.', 'error');
        
    } finally {
        const refreshBtn = $('refreshBtn');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.textContent = '새로고침';
        }
    }
}

// 연결 상태 확인
async function checkConnection() {
    try {
        if (window.sheetsAPI) {
            const isConnected = await window.sheetsAPI.testConnection();
            const message = isConnected ? 
                'Google Sheets 연결이 정상입니다.' : 
                'Google Sheets 연결에 문제가 있습니다.';
            const type = isConnected ? 'success' : 'warning';
            showAlert(message, type);
        } else {
            showAlert('sheets-api.js가 로드되지 않았습니다.', 'error');
        }
    } catch (error) {
        console.error('연결 확인 실패:', error);
        showAlert('연결 확인 중 오류가 발생했습니다.', 'error');
    }
}

// 인쇄 기능
function printReport() {
    window.print();
}

// 전역 함수 노출
window.loadSampleData = loadSalesData;
window.generateReport = generateReport;
window.showDetail = showDetail;
window.refreshData = refreshData;
window.checkConnection = checkConnection;
window.printReport = printReport;
window.hideDetailSection = hideDetailSection;

// 페이지 로드시 자동 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('페이지 로드 완료, 데이터 로딩 시작...');
    
    // 이벤트 리스너 설정
    const searchBtn = $('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', generateReport);
    }
    
    // sheets-api.js 로드 확인 및 데이터 로드
    if (window.sheetsAPI) {
        console.log('sheets-api.js 로드 확인됨');
        setTimeout(loadSalesData, 100);
    } else {
        console.warn('sheets-api.js가 로드되지 않음, 재시도...');
        let retryCount = 0;
        const retryInterval = setInterval(() => {
            if (window.sheetsAPI || retryCount >= 30) {
                clearInterval(retryInterval);
                if (window.sheetsAPI) {
                    console.log('sheets-api.js 지연 로드 확인됨');
                    loadSalesData();
                } else {
                    console.error('sheets-api.js 로드 실패, 샘플 데이터 사용');
                    loadSampleDataFallback();
                }
            }
            retryCount++;
        }, 100);
    }
});
