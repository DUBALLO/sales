// 월별매출 현황 JavaScript (컬럼명 최종 수정본)

// 전역 변수
let salesData = [];
let governmentSalesData = [];
let privateSalesData = [];
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
        alert(message);
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

// 데이터 로드 및 전처리
async function loadSalesData() {
    console.log('데이터 로드 중...');
    setLoadingState(true);

    try {
        if (!window.sheetsAPI) {
            throw new Error("sheets-api.js가 로드되지 않았습니다.");
        }
        
        const data = await window.sheetsAPI.loadCSVData('monthlySales');
        
        // 필수 컬럼 존재 여부 확인
        const requiredColumns = ['주문일자', '구분', '합계', '계약명', '거래처'];
        const firstRow = data[0];
        const hasRequiredColumns = requiredColumns.every(col => firstRow && firstRow.hasOwnProperty(col));

        if (!hasRequiredColumns) {
            console.error('데이터에 필수 컬럼이 누락되었습니다.');
            throw new Error('Google Sheets 데이터 형식이 올바르지 않습니다.');
        }

        // 데이터 파싱
        salesData = data.map(row => ({
            월: new Date(row.주문일자).getMonth() + 1,
            구분: row.구분,
            날짜: parseDate(row.주문일자),
            판매금액: parseInt(String(row.합계).replace(/,/g, ''), 10) || 0,
            계약명: row.계약명,
            고객사명: row.거래처
        }));

        console.log(`총 ${salesData.length}개의 데이터 행을 불러왔습니다.`);

        // 관급 및 사급 데이터 분리
        governmentSalesData = salesData.filter(d => d.구분 === '관급');
        privateSalesData = salesData.filter(d => d.구분 === '사급');

        console.log(`관급 데이터 ${governmentSalesData.length}개, 사급 데이터 ${privateSalesData.length}개로 분리 완료.`);

        generateReport();

    } catch (error) {
        console.error('데이터 로드 실패:', error);
        showAlert('데이터를 불러오는 중 오류가 발생했습니다. 샘플 데이터로 대체합니다.', 'warning');
        loadSampleDataFallback();
    } finally {
        setLoadingState(false);
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

// 리포트 생성
function generateReport() {
    console.log('리포트 생성 시작...');
    setLoadingState(true);
    
    const startYear = parseInt($('startYear').value);
    const endYear = parseInt($('endYear').value);
    const customerType = $('customerType').value;

    const filteredData = {
        government: [],
        private: []
    };

    if (customerType === 'all' || customerType === 'government') {
        filteredData.government = governmentSalesData.filter(d => {
            const date = new Date(d.날짜);
            return date.getFullYear() >= startYear && date.getFullYear() <= endYear;
        });
    }

    if (customerType === 'all' || customerType === 'private') {
        filteredData.private = privateSalesData.filter(d => {
            const date = new Date(d.날짜);
            return date.getFullYear() >= startYear && date.getFullYear() <= endYear;
        });
    }

    const monthlySummary = {};
    function aggregateData(data, type) {
        data.forEach(item => {
            const date = new Date(item.날짜);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlySummary[yearMonth]) {
                monthlySummary[yearMonth] = {
                    total: 0,
                    government: 0,
                    private: 0,
                    contracts: []
                };
            }
            monthlySummary[yearMonth].total += item.판매금액;
            monthlySummary[yearMonth][type] += item.판매금액;
            monthlySummary[yearMonth].contracts.push(item);
        });
    }

    aggregateData(filteredData.government, 'government');
    aggregateData(filteredData.private, 'private');
    
    renderMonthlyTable(monthlySummary, customerType);

    setLoadingState(false);
    console.log('리포트 생성 완료.');
}

// 테이블 렌더링
function renderMonthlyTable(data, customerType) {
    const tableBody = $('monthlyTable').querySelector('tbody');
    const totalSalesCard = $('totalSalesCard');
    const totalContractsCard = $('totalContractsCard');
    
    if (!tableBody) return;

    tableBody.innerHTML = '';

    const sortedMonths = Object.keys(data).sort();
    let totalSales = 0;
    let totalGovSales = 0;
    let totalPrivateSales = 0;
    let totalContracts = 0;
    
    sortedMonths.forEach(month => {
        const rowData = data[month];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-3 whitespace-nowrap text-center text-sm font-medium text-gray-900">${month}</td>
            <td class="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-700">${formatCurrency(rowData.total)}</td>
            <td class="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-700">${formatCurrency(rowData.government)}</td>
            <td class="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-700">${formatCurrency(rowData.private)}</td>
            <td class="px-6 py-3 whitespace-nowrap text-center text-sm text-gray-700">${formatNumber(rowData.contracts.length)}건</td>
        `;
        tableBody.appendChild(row);

        totalSales += rowData.total;
        totalGovSales += rowData.government;
        totalPrivateSales += rowData.private;
        totalContracts += rowData.contracts.length;
    });

    const totalRow = document.createElement('tr');
    totalRow.className = 'bg-gray-100 font-bold';
    totalRow.innerHTML = `
        <td class="px-6 py-3 whitespace-nowrap text-center text-sm text-gray-900">총 합계</td>
        <td class="px-6 py-3 whitespace-nowrap text-right text-sm text-green-600">${formatCurrency(totalSales)}</td>
        <td class="px-6 py-3 whitespace-nowrap text-right text-sm text-green-600">${formatCurrency(totalGovSales)}</td>
        <td class="px-6 py-3 whitespace-nowrap text-right text-sm text-green-600">${formatCurrency(totalPrivateSales)}</td>
        <td class="px-6 py-3 whitespace-nowrap text-center text-sm text-green-600">${formatNumber(totalContracts)}건</td>
    `;
    tableBody.appendChild(totalRow);
    
    if (totalSalesCard) totalSalesCard.querySelector('p').textContent = formatCurrency(totalSales);
    if (totalContractsCard) totalContractsCard.querySelector('p').textContent = formatNumber(totalContracts);
    
    hideDetailSection();
}

// 상세 내역 표시
function showDetail(yearMonth) {
    // 상세 내역 데이터를 찾아서 표시하는 로직 구현
    // ...
}

// 상세 내역 섹션 숨기기
function hideDetailSection() {
    const detailSection = $('detailSection');
    if (detailSection) {
        detailSection.classList.add('hidden');
    }
}

// 로딩 상태 표시
function setLoadingState(show) {
    const tableContainer = $('monthlyTableContainer');
    if (tableContainer) {
        if (show) {
            tableContainer.classList.add('loading-overlay');
        } else {
            tableContainer.classList.remove('loading-overlay');
        }
    }
}

// 에러 상태 표시
function setErrorState() {
    const tableBody = $('monthlyTable').querySelector('tbody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">데이터 로드 실패</td></tr>`;
    }
}

// 새로고침 기능
async function refreshData() {
    console.log('데이터 새로고침 시작');
    await loadSalesData();
}

// 연결 상태 테스트
async function checkConnection() {
    console.log('연결 상태 확인...');
    if (window.sheetsAPI) {
        const isConnected = await window.sheetsAPI.testConnection();
        if (isConnected) {
            showAlert('Google Sheets와 연결이 정상입니다.', 'success');
        } else {
            showAlert('Google Sheets 연결에 실패했습니다. CORS 문제일 수 있습니다.', 'error');
        }
    } else {
        showAlert('sheets-api.js가 로드되지 않았습니다.', 'error');
    }
}

// 인쇄 기능
function printReport() {
    window.print();
}

// 전역 함수 노출
window.loadSalesData = loadSalesData;
window.generateReport = generateReport;
window.showDetail = showDetail;
window.refreshData = refreshData;
window.checkConnection = checkConnection;
window.printReport = printReport;
window.hideDetailSection = hideDetailSection;

// 페이지 로드시 자동 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('페이지 로드 완료, 데이터 로딩 시작...');
    
    const searchBtn = $('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', generateReport);
    }
    
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
                    console.error('sheets-api.js 로드 실패');
                    setErrorState();
                }
            }
        }, 100);
    }
});
