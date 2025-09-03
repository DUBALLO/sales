// 월별매출 현황 JavaScript (최종 수정 버전)

// 전역 변수
let salesData = [];
let currentDetailData = {};
let currentYear = new Date().getFullYear();

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
        rawData = await window.sheetsAPI.loadCSVData('monthlySales');
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
                        monthlyData[yearMonth].order.amount += item
