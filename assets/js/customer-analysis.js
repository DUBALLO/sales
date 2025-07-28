// 매출처별 집계 분석 JavaScript

// 전역 변수
let salesData = [];
let customerData = [];
let regionData = [];
let typeData = [];

// 샘플 데이터 (월별매출과 동일한 데이터 + 지역/수요기관 정보 추가)
const sampleData = [
    {
        date: '2024-01-15',
        type: '주문',
        contractName: '천보산 산림욕장 보완사업 관급자재',
        customer: '경기도 양주시',
        region: '경기도',
        customerType: '지방자치단체',
        amount: 1500000,
        deliveryDate: '2024-01-25'
    },
    {
        date: '2024-01-20',
        type: '관급매출',
        contractName: '의정부시 녹지조성사업',
        customer: '의정부시',
        region: '경기도',
        customerType: '지방자치단체',
        amount: 2800000,
        invoiceDate: '2024-01-25'
    },
    {
        date: '2024-01-25',
        type: '사급매출',
        contractName: '춘천시 소양강 정비사업',
        customer: '강원도 춘천시',
        region: '강원도',
        customerType: '지방자치단체',
        amount: 1800000,
        invoiceDate: '2024-01-28'
    },
    {
        date: '2024-02-05',
        type: '주문',
        contractName: '서울시 한강공원 보행로 개선',
        customer: '서울시',
        region: '서울특별시',
        customerType: '지방자치단체',
        amount: 3200000,
        deliveryDate: '2024-02-15'
    },
    {
        date: '2024-02-10',
        type: '관급매출',
        contractName: '부천시 중앙공원 조성사업',
        customer: '부천시',
        region: '경기도',
        customerType: '지방자치단체',
        amount: 4500000,
        invoiceDate: '2024-02-15'
    },
    {
        date: '2024-02-20',
        type: '사급매출',
        contractName: '인천 송도 신도시 보행환경 개선',
        customer: '인천광역시',
        region: '인천광역시',
        customerType: '지방자치단체',
        amount: 2100000,
        invoiceDate: '2024-02-22'
    },
    {
        date: '2024-03-03',
        type: '주문',
        contractName: '대전 유성구 과학단지 보행로',
        customer: '대전 유성구',
        region: '대전광역시',
        customerType: '지방자치단체',
        amount: 2800000,
        deliveryDate: '2024-03-15'
    },
    {
        date: '2024-03-12',
        type: '관급매출',
        contractName: '광주 북구 문화센터 주변 정비',
        customer: '광주 북구',
        region: '광주광역시',
        customerType: '지방자치단체',
        amount: 5200000,
        invoiceDate: '2024-03-15'
    },
    {
        date: '2024-03-18',
        type: '사급매출',
        contractName: '울산 남구 공단 보행환경 개선',
        customer: '울산 남구',
        region: '울산광역시',
        customerType: '지방자치단체',
        amount: 1900000,
        invoiceDate: '2024-03-20'
    },
    {
        date: '2024-04-07',
        type: '주문',
        contractName: '제주시 관광지 보행로 정비',
        customer: '제주시',
        region: '제주특별자치도',
        customerType: '지방자치단체',
        amount: 3100000,
        deliveryDate: '2024-04-18'
    },
    {
        date: '2024-04-15',
        type: '관급매출',
        contractName: '세종시 행정복합도시 보행환경',
        customer: '세종시',
        region: '세종특별자치시',
        customerType: '지방자치단체',
        amount: 4800000,
        invoiceDate: '2024-04-18'
    },
    {
        date: '2024-04-22',
        type: '사급매출',
        contractName: '포항시 영일대 해안 보행로',
        customer: '포항시',
        region: '경상북도',
        customerType: '지방자치단체',
        amount: 2300000,
        invoiceDate: '2024-04-25'
    },
    // 추가 군 데이터
    {
        date: '2024-01-30',
        type: '관급매출',
        contractName: '특수전사령부 훈련장 보행환경 개선',
        customer: '특수전사령부',
        region: '경기도',
        customerType: '군',
        amount: 8500000,
        invoiceDate: '2024-02-05'
    },
    {
        date: '2024-02-28',
        type: '사급매출',
        contractName: '육군 제1사단 부대시설 정비',
        customer: '육군 제1사단',
        region: '강원도',
        customerType: '군',
        amount: 6200000,
        invoiceDate: '2024-03-05'
    },
    // 공기업 데이터
    {
        date: '2024-03-25',
        type: '주문',
        contractName: 'LH공사 신도시 보행환경 조성',
        customer: '한국토지주택공사',
        region: '경기도',
        customerType: '공기업',
        amount: 12500000,
        deliveryDate: '2024-04-10'
    },
    {
        date: '2024-04-05',
        type: '관급매출',
        contractName: '수자원공사 댐 주변 정비사업',
        customer: '한국수자원공사',
        region: '충청남도',
        customerType: '공기업',
        amount: 9800000,
        invoiceDate: '2024-04-12'
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
    
    analyzeCustomers();
}

/**
 * 고객 분석 실행
 */
function analyzeCustomers() {
    try {
        const selectedYear = document.getElementById('analysisYear').value;
        
        // 연도별 필터링
        let filteredData = salesData;
        if (selectedYear !== 'all') {
            const year = parseInt(selectedYear);
            filteredData = salesData.filter(item => item.date.getFullYear() === year);
        }
        
        // 각종 분석 수행
        analyzeCustomerData(filteredData);
        analyzeRegionData(filteredData);
        analyzeTypeData(filteredData);
        
        // 요약 통계 업데이트
        updateSummaryStats(filteredData);
        
        // 테이블 렌더링
        renderCustomerTable();
        renderRegionTable();
        renderTypeTable();
        
    } catch (error) {
        console.error('고객 분석 오류:', error);
        CommonUtils.showAlert('분석 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 고객별 데이터 분석
 */
function analyzeCustomerData(data) {
    const customerMap = new Map();
    
    data.forEach(item => {
        const customer = item.customer;
        
        if (!customerMap.has(customer)) {
            customerMap.set(customer, {
                customer: customer,
                region: item.region,
                customerType: item.customerType,
                count: 0,
                amount: 0,
                contracts: [],
                lastTransactionDate: null
            });
        }
        
        const customerInfo = customerMap.get(customer);
        customerInfo.count++;
        customerInfo.amount += item.amount;
        customerInfo.contracts.push(item);
        
        // 최근 거래일 업데이트
        if (!customerInfo.lastTransactionDate || item.date > customerInfo.lastTransactionDate) {
            customerInfo.lastTransactionDate = item.date;
        }
    });
    
    // 배열로 변환 및 정렬
    customerData = Array.from(customerMap.values());
    
    // 매출액 기준으로 정렬
    customerData.sort((a, b) => b.amount - a.amount);
    
    // 순위 및 비중 계산
    const totalAmount = customerData.reduce((sum, item) => sum + item.amount, 0);
    customerData.forEach((item, index) => {
        item.rank = index + 1;
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

/**
 * 지역별 데이터 분석
 */
function analyzeRegionData(data) {
    const regionMap = new Map();
    
    data.forEach(item => {
        const region = item.region;
        
        if (!regionMap.has(region)) {
            regionMap.set(region, {
                region: region,
                customerCount: new Set(),
                contractCount: 0,
                amount: 0
            });
        }
        
        const regionInfo = regionMap.get(region);
        regionInfo.customerCount.add(item.customer);
        regionInfo.contractCount++;
        regionInfo.amount += item.amount;
    });
    
    // 배열로 변환
    regionData = Array.from(regionMap.values()).map(item => ({
        region: item.region,
        customerCount: item.customerCount.size,
        contractCount: item.contractCount,
        amount: item.amount,
        avgAmount: item.contractCount > 0 ? item.amount / item.contractCount : 0
    }));
    
    // 매출액 기준으로 정렬
    regionData.sort((a, b) => b.amount - a.amount);
    
    // 비중 계산
    const totalAmount = regionData.reduce((sum, item) => sum + item.amount, 0);
    regionData.forEach(item => {
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

/**
 * 수요기관별 데이터 분석
 */
function analyzeTypeData(data) {
    const typeMap = new Map();
    
    data.forEach(item => {
        const type = item.customerType;
        
        if (!typeMap.has(type)) {
            typeMap.set(type, {
                customerType: type,
                customerCount: new Set(),
                contractCount: 0,
                amount: 0
            });
        }
        
        const typeInfo = typeMap.get(type);
        typeInfo.customerCount.add(item.customer);
        typeInfo.contractCount++;
        typeInfo.amount += item.amount;
    });
    
    // 배열로 변환
    typeData = Array.from(typeMap.values()).map(item => ({
        customerType: item.customerType,
        customerCount: item.customerCount.size,
        contractCount: item.contractCount,
        amount: item.amount,
        avgAmount: item.contractCount > 0 ? item.amount / item.contractCount : 0
    }));
    
    // 매출액 기준으로 정렬
    typeData.sort((a, b) => b.amount - a.amount);
    
    // 비중 계산
    const totalAmount = typeData.reduce((sum, item) => sum + item.amount, 0);
    typeData.forEach(item => {
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

/**
 * 요약 통계 업데이트
 */
function updateSummaryStats(data) {
    const totalCustomers = new Set(data.map(item => item.customer)).size;
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    const avgAmount = data.length > 0 ? totalAmount / data.length : 0;
    
    // 최대 고객 비중
    const maxShare = customerData.length > 0 ? customerData[0].share : 0;
    
    // 신규 고객 수 (올해 첫 거래)
    const selectedYear = document.getElementById('analysisYear').value;
    let newCustomers = 0;
    
    if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        const allCustomersThisYear = new Set(
            data.filter(item => item.date.getFullYear() === year)
                .map(item => item.customer)
        );
        
        const allCustomersPrevYear = new Set(
            salesData.filter(item => item.date.getFullYear() === year - 1)
                .map(item => item.customer)
        );
        
        newCustomers = [...allCustomersThisYear].filter(customer => 
            !allCustomersPrevYear.has(customer)
        ).length;
    }
    
    // DOM 업데이트
    document.getElementById('totalCustomers').textContent = CommonUtils.formatNumber(totalCustomers);
    document.getElementById('avgAmount').textContent = CommonUtils.formatCurrency(Math.round(avgAmount));
    document.getElementById('maxShare').textContent = maxShare.toFixed(1) + '%';
    document.getElementById('newCustomers').textContent = CommonUtils.formatNumber(newCustomers);
}

/**
 * 고객별 테이블 렌더링
 */
function renderCustomerTable() {
    const tbody = document.getElementById('customerTableBody');
    tbody.innerHTML = '';
    
    customerData.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // 순위
        const rankCell = document.createElement('td');
        rankCell.textContent = customer.rank;
        rankCell.className = 'text-center font-medium';
        row.appendChild(rankCell);
        
        // 고객명
        const nameCell = document.createElement('td');
        nameCell.textContent = customer.customer;
        nameCell.className = 'font-medium';
        row.appendChild(nameCell);
        
        // 지역
        const regionCell = document.createElement('td');
        regionCell.textContent = customer.region;
        row.appendChild(regionCell);
        
        // 수요기관구분
        const typeCell = document.createElement('td');
        typeCell.innerHTML = `<span class="badge ${getCustomerTypeBadgeClass(customer.customerType)}">${customer.customerType}</span>`;
        typeCell.className = 'text-center';
        row.appendChild(typeCell);
        
        // 계약건수
        const countCell = document.createElement('td');
        countCell.textContent = CommonUtils.formatNumber(customer.count);
        countCell.className = 'text-center';
        row.appendChild(countCell);
        
        // 매출액
        const amountCell = document.createElement('td');
        amountCell.textContent = CommonUtils.formatCurrency(customer.amount);
        amountCell.className = 'text-right font-medium amount';
        row.appendChild(amountCell);
        
        // 비중
        const shareCell = document.createElement('td');
        shareCell.textContent = customer.share.toFixed(1) + '%';
        shareCell.className = 'text-right';
        
        // 비중에 따른 색상 적용
        if (customer.share >= 20) {
            shareCell.classList.add('text-red-600', 'font-bold');
        } else if (customer.share >= 10) {
            shareCell.classList.add('text-orange-600', 'font-medium');
        }
        
        row.appendChild(shareCell);
        
        // 최근거래일
        const dateCell = document.createElement('td');
        dateCell.textContent = customer.lastTransactionDate ? 
            CommonUtils.formatDate(customer.lastTransactionDate) : '-';
        dateCell.className = 'text-center';
        row.appendChild(dateCell);
        
        tbody.appendChild(row);
    });
}

/**
 * 지역별 테이블 렌더링
 */
function renderRegionTable() {
    const tbody = document.getElementById('regionTableBody');
    tbody.innerHTML = '';
    
    regionData.forEach((region, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // 지역
        const regionCell = document.createElement('td');
        regionCell.textContent = region.region;
        regionCell.className = 'font-medium';
        row.appendChild(regionCell);
        
        // 고객수
        const customerCountCell = document.createElement('td');
        customerCountCell.textContent = CommonUtils.formatNumber(region.customerCount);
        customerCountCell.className = 'text-center';
        row.appendChild(customerCountCell);
        
        // 계약건수
        const contractCountCell = document.createElement('td');
        contractCountCell.textContent = CommonUtils.formatNumber(region.contractCount);
        contractCountCell.className = 'text-center';
        row.appendChild(contractCountCell);
        
        // 매출액
        const amountCell = document.createElement('td');
        amountCell.textContent = CommonUtils.formatCurrency(region.amount);
        amountCell.className = 'text-right font-medium amount';
        row.appendChild(amountCell);
        
        // 비중
        const shareCell = document.createElement('td');
        shareCell.textContent = region.share.toFixed(1) + '%';
        shareCell.className = 'text-right';
        row.appendChild(shareCell);
        
        // 평균거래액
        const avgAmountCell = document.createElement('td');
        avgAmountCell.textContent = CommonUtils.formatCurrency(Math.round(region.avgAmount));
        avgAmountCell.className = 'text-right';
        row.appendChild(avgAmountCell);
        
        tbody.appendChild(row);
    });
}

/**
 * 수요기관별 테이블 렌더링
 */
function renderTypeTable() {
    const tbody = document.getElementById('typeTableBody');
    tbody.innerHTML = '';
    
    typeData.forEach((type, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        // 수요기관구분
        const typeCell = document.createElement('td');
        typeCell.innerHTML = `<span class="badge ${getCustomerTypeBadgeClass(type.customerType)}">${type.customerType}</span>`;
        typeCell.className = 'font-medium';
        row.appendChild(typeCell);
        
        // 고객수
        const customerCountCell = document.createElement('td');
        customerCountCell.textContent = CommonUtils.formatNumber(type.customerCount);
        customerCountCell.className = 'text-center';
        row.appendChild(customerCountCell);
        
        // 계약건수
        const contractCountCell = document.createElement('td');
        contractCountCell.textContent = CommonUtils.formatNumber(type.contractCount);
        contractCountCell.className = 'text-center';
        row.appendChild(contractCountCell);
        
        // 매출액
        const amountCell = document.createElement('td');
        amountCell.textContent = CommonUtils.formatCurrency(type.amount);
        amountCell.className = 'text-right font-medium amount';
        row.appendChild(amountCell);
        
        // 비중
        const shareCell = document.createElement('td');
        shareCell.textContent = type.share.toFixed(1) + '%';
        shareCell.className = 'text-right';
        row.appendChild(shareCell);
        
        // 평균거래액
        const avgAmountCell = document.createElement('td');
        avgAmountCell.textContent = CommonUtils.formatCurrency(Math.round(type.avgAmount));
        avgAmountCell.className = 'text-right';
        row.appendChild(avgAmountCell);
        
        tbody.appendChild(row);
    });
}

/**
 * 수요기관 구분별 배지 클래스 반환
 */
function getCustomerTypeBadgeClass(type) {
    switch (type) {
        case '지방자치단체':
            return 'badge-primary';
        case '군':
            return 'badge-success';
        case '공기업':
            return 'badge-warning';
        case '관공서':
            return 'badge-secondary';
        default:
            return 'badge-gray';
    }
}

/**
 * 데이터 검색 및 필터링
 */
function searchCustomers(searchTerm) {
    if (!searchTerm.trim()) {
        renderCustomerTable();
        return;
    }
    
    const filteredCustomers = customerData.filter(customer =>
        customer.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerType.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // 임시로 필터된 데이터로 테이블 렌더링
    const originalData = [...customerData];
    customerData = filteredCustomers;
    renderCustomerTable();
    customerData = originalData; // 원본 데이터 복원
}

/**
 * 테이블 정렬
 */
function sortCustomerTable(sortBy, direction = 'desc') {
    customerData.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
            case 'rank':
                aValue = a.rank;
                bValue = b.rank;
                break;
            case 'customer':
                aValue = a.customer;
                bValue = b.customer;
                break;
            case 'region':
                aValue = a.region;
                bValue = b.region;
                break;
            case 'type':
                aValue = a.customerType;
                bValue = b.customerType;
                break;
            case 'count':
                aValue = a.count;
                bValue = b.count;
                break;
            case 'amount':
                aValue = a.amount;
                bValue = b.amount;
                break;
            case 'share':
                aValue = a.share;
                bValue = b.share;
                break;
            default:
                return 0;
        }
        
        if (typeof aValue === 'string') {
            return direction === 'asc' ? 
                aValue.localeCompare(bValue, 'ko-KR') : 
                bValue.localeCompare(aValue, 'ko-KR');
        } else {
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
    });
    
    renderCustomerTable();
}

/**
 * 고객 집중도 위험 분석
 */
function analyzeConcentrationRisk() {
    if (customerData.length === 0) return;
    
    const top5Share = customerData.slice(0, 5).reduce((sum, customer) => sum + customer.share, 0);
    const top1Share = customerData[0].share;
    
    let riskLevel = '';
    let riskMessage = '';
    
    if (top1Share >= 30) {
        riskLevel = 'high';
        riskMessage = `최대 고객 비중이 ${top1Share.toFixed(1)}%로 매우 높습니다. 고객 다변화가 필요합니다.`;
    } else if (top5Share >= 70) {
        riskLevel = 'medium';
        riskMessage = `상위 5개 고객 비중이 ${top5Share.toFixed(1)}%입니다. 신규 고객 발굴을 권장합니다.`;
    } else {
        riskLevel = 'low';
        riskMessage = '고객 집중도가 양호한 수준입니다.';
    }
    
    return { riskLevel, riskMessage, top1Share, top5Share };
}

/**
 * 지역별 성장 분석
 */
function analyzeRegionalGrowth() {
    // 전년 대비 지역별 성장률 계산 (샘플 구현)
    const currentYear = parseInt(document.getElementById('analysisYear').value);
    if (currentYear === 'all') return;
    
    // TODO: 전년 데이터와 비교하여 성장률 계산
    const growthAnalysis = regionData.map(region => ({
        ...region,
        growthRate: Math.random() * 20 - 10 // 임시 데이터 (-10% ~ +10%)
    }));
    
    return growthAnalysis;
}

/**
 * 데이터 유효성 검사
 */
function validateAnalysisData(data) {
    const errors = [];
    
    data.forEach((item, index) => {
        if (!item.customer || item.customer.trim() === '') {
            errors.push(`${index + 1}행: 고객명이 누락됨`);
        }
        
        if (!item.region || item.region.trim() === '') {
            errors.push(`${index + 1}행: 지역 정보가 누락됨`);
        }
        
        if (!item.customerType || item.customerType.trim() === '') {
            errors.push(`${index + 1}행: 수요기관 구분이 누락됨`);
        }
        
        if (!item.amount || isNaN(item.amount) || item.amount < 0) {
            errors.push(`${index + 1}행: 올바르지 않은 금액`);
        }
    });
    
    return errors;
}

// 전역 함수로 내보내기 (HTML에서 사용)
window.CustomerAnalysis = {
    analyzeCustomers,
    searchCustomers,
    sortCustomerTable,
    analyzeConcentrationRisk,
    analyzeRegionalGrowth,
    validateAnalysisData
};
