// 매출처별 집계 분석 JavaScript (디버깅 강화 버전)

// 전역 변수
let governmentData = []; // 관급 데이터
let privateSalesData = []; // 사급 데이터
let customerData = [];
let regionData = [];
let typeData = [];
let privateCustomerData = [];

// 안전한 요소 가져오기
function $(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`요소를 찾을 수 없습니다: ${id}`);
    }
    return element;
}

// 포맷팅 함수들
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

function formatNumber(number) {
    if (!number && number !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(number);
}

function formatDate(date) {
    if (!date || !(date instanceof Date)) return '-';
    return date.toLocaleDateString('ko-KR');
}

// 날짜 파싱 함수
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

// 금액 파싱 함수
function parseAmount(amountStr) {
    if (!amountStr) return 0;
    const cleanAmount = amountStr.toString().replace(/[^\d]/g, '');
    return parseInt(cleanAmount) || 0;
}

// 지역 추출 함수
function extractRegion(customerName) {
    if (!customerName) return '기타';
    
    const regionMap = {
        '서울': '서울특별시',
        '경기': '경기도',
        '강원': '강원도',
        '충북': '충청북도',
        '충남': '충청남도',
        '전북': '전라북도',
        '전남': '전라남도',
        '경북': '경상북도',
        '경남': '경상남도',
        '제주': '제주특별자치도',
        '부산': '부산광역시',
        '대구': '대구광역시',
        '인천': '인천광역시',
        '광주': '광주광역시',
        '대전': '대전광역시',
        '울산': '울산광역시'
    };
    
    for (const [key, value] of Object.entries(regionMap)) {
        if (customerName.includes(key)) {
            return value;
        }
    }
    
    return '기타';
}

// 샘플 데이터 생성
function generateSampleData() {
    console.log('=== 샘플 데이터 생성 시작 ===');
    
    // 관급 샘플 데이터
    governmentData = [
        {
            customer: '경기도 양주시',
            region: '경기도',
            customerType: '지방자치단체',
            amount: 15000000,
            contractDate: '2024-01-15',
            contractName: '천보산 산림욕장 보완사업',
            product: '보행매트'
        },
        {
            customer: '의정부시',
            region: '경기도',
            customerType: '지방자치단체',
            amount: 28000000,
            contractDate: '2024-02-10',
            contractName: '의정부시 녹지조성사업',
            product: '보행매트'
        },
        {
            customer: '서울시',
            region: '서울특별시',
            customerType: '지방자치단체',
            amount: 32000000,
            contractDate: '2024-02-05',
            contractName: '서울시 한강공원 보행로 개선',
            product: '식생매트'
        },
        {
            customer: '부천시',
            region: '경기도',
            customerType: '지방자치단체',
            amount: 45000000,
            contractDate: '2024-03-12',
            contractName: '부천시 중앙공원 조성사업',
            product: '논슬립'
        },
        {
            customer: '춘천시',
            region: '강원도',
            customerType: '지방자치단체',
            amount: 22000000,
            contractDate: '2024-03-20',
            contractName: '춘천시 공원 조성사업',
            product: '보행매트'
        }
    ];

    // 사급 샘플 데이터
    privateSalesData = [
        {
            customer: '광주 북구',
            region: '광주광역시',
            customerType: '지방자치단체',
            amount: 52000000,
            contractDate: '2024-03-18',
            contractName: '광주 북구 문화센터 주변 정비'
        },
        {
            customer: '제주시',
            region: '제주특별자치도',
            customerType: '지방자치단체',
            amount: 31000000,
            contractDate: '2024-04-07',
            contractName: '제주시 관광지 보행로 정비'
        },
        {
            customer: '포항시',
            region: '경상북도',
            customerType: '지방자치단체',
            amount: 23000000,
            contractDate: '2024-04-22',
            contractName: '포항시 영일대 해안 보행로'
        }
    ];
    
    console.log('샘플 데이터 생성 완료');
    console.log('관급 데이터:', governmentData.length, '건');
    console.log('사급 데이터:', privateSalesData.length, '건');
}

// 메인 분석 함수
async function analyzeCustomers() {
    try {
        console.log('=== 고객 분석 시작 ===');
        
        // 로딩 상태 표시
        showLoadingState(true);
        
        // 실제 데이터 로드 시도
        let useRealData = false;
        
        if (window.sheetsAPI) {
            try {
                console.log('sheets-api를 통한 실제 데이터 로드 시도...');
                const rawData = await window.sheetsAPI.loadCSVData();
                console.log('sheets-api에서 로드된 원시 데이터:', rawData.length, '건');
                
                if (rawData && rawData.length > 0) {
                    console.log('첫 번째 행 샘플:', rawData[0]);
                    console.log('컬럼명들:', Object.keys(rawData[0]));
                    
                    // 실제 데이터 파싱
                    parseRealData(rawData);
                    useRealData = true;
                    
                    console.log('실제 데이터 파싱 완료');
                    console.log('관급 데이터:', governmentData.length, '건');
                    console.log('사급 데이터:', privateSalesData.length, '건');
                    
                    if (governmentData.length === 0 && privateSalesData.length === 0) {
                        throw new Error('파싱된 데이터가 없습니다.');
                    }
                } else {
                    throw new Error('로드된 데이터가 비어있습니다.');
                }
                
            } catch (error) {
                console.warn('실제 데이터 로드 실패:', error.message);
                useRealData = false;
            }
        } else {
            console.warn('sheets-api.js가 로드되지 않음');
            useRealData = false;
        }
        
        // 실제 데이터 로드 실패시 샘플 데이터 사용
        if (!useRealData) {
            console.log('샘플 데이터 사용');
            generateSampleData();
        }
        
        // 필터링 및 분석
        const selectedYear = $('analysisYear')?.value || '2024';
        const selectedProduct = $('productType')?.value || '보행매트';
        
        console.log('분석 조건 - 연도:', selectedYear, '품목:', selectedProduct);
        
        // 관급 데이터 분석
        analyzeGovernmentData(selectedYear, selectedProduct);
        
        // 사급 데이터 분석
        analyzePrivateData(selectedYear);
        
        // 요약 통계 업데이트
        updateSummaryStats();
        
        // 테이블 렌더링
        renderAllTables();
        
        console.log('=== 고객 분석 완료 ===');
        
        const message = useRealData ? 
            `실제 데이터 분석 완료 (관급: ${governmentData.length}건, 사급: ${privateSalesData.length}건)` :
            '샘플 데이터로 분석 완료';
        showAlert(message, useRealData ? 'success' : 'warning');
        
    } catch (error) {
        console.error('고객 분석 오류:', error);
        showAlert('분석 중 오류가 발생했습니다: ' + error.message, 'error');
    } finally {
        showLoadingState(false);
    }
}

// 실제 데이터 파싱 함수
function parseRealData(rawData) {
    console.log('=== 실제 데이터 파싱 시작 ===');
    
    governmentData = [];
    privateSalesData = [];
    
    rawData.forEach((item, index) => {
        try {
            // 두발로 주식회사 데이터만 필터링
            const company = (item['업체'] || '').trim();
            if (company !== '두발로 주식회사') return; // 두발로가 아니면 건너뛰

            // 나라장터 조달 데이터 매핑
            const customer = (item['수요기관명'] || '').trim();
            const contractName = (item['계약명'] || '').trim();
            const amountValue = item['공급금액'] || '0';
            const dateValue = item['기준일자'] || '';
            const product = (item['세부품명'] || '').trim();
            const region = (item['수요기관지역'] || '').trim();
            
            // 디버깅 로그 (처음 3개 행만)
            if (index < 3) {
                console.log(`행 ${index + 1}:`, {
                    구분: typeValue,
                    거래처: customer,
                    계약명: contractName,
                    금액: amountValue,
                    날짜: dateValue,
                    품목: product
                });
            }
            
            // 빈 데이터 제외
            if (!customer || customer === '거래처 없음') return;
            
            const amount = parseAmount(amountValue);
            if (amount <= 0) return;
            
            const baseData = {
                customer: customer,
                region: extractRegion(customer),
                customerType: '지방자치단체', // 기본값
                amount: amount,
                contractDate: dateValue,
                contractName: contractName || '계약명 없음',
                product: product || '기타'
            };
            
            // 관급/사급 분류
            if (typeValue.includes('관급')) {
                governmentData.push(baseData);
            } else if (typeValue.includes('사급')) {
                privateSalesData.push({
                    ...baseData,
                    customerType: '민간'
                });
            }
            
        } catch (error) {
            console.warn(`행 ${index + 1} 파싱 오류:`, error.message);
        }
    });
    
    console.log('데이터 파싱 완료');
    console.log(`관급: ${governmentData.length}건, 사급: ${privateSalesData.length}건`);
}

// 관급 데이터 분석
function analyzeGovernmentData(selectedYear, selectedProduct) {
    console.log(`=== 관급 데이터 분석: ${selectedYear}년, ${selectedProduct} ===`);
    
    let filteredData = [...governmentData];
    
    // 연도 필터링
    if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        filteredData = filteredData.filter(item => {
            const date = parseDate(item.contractDate || '');
            return date && date.getFullYear() === year;
        });
        console.log(`연도 필터링 후: ${filteredData.length}건`);
    }
    
    // 품목 필터링
    if (selectedProduct !== 'all') {
        filteredData = filteredData.filter(item => 
            item.product === selectedProduct
        );
        console.log(`품목 필터링 후: ${filteredData.length}건`);
    }
    
    // 고객별 집계
    analyzeCustomerData(filteredData);
    analyzeRegionData(filteredData);
    analyzeTypeData(filteredData);
}

// 사급 데이터 분석
function analyzePrivateData(selectedYear) {
    console.log(`=== 사급 데이터 분석: ${selectedYear}년 ===`);
    
    let filteredData = [...privateSalesData];
    
    if (selectedYear !== 'all') {
        const year = parseInt(selectedYear);
        filteredData = filteredData.filter(item => {
            const date = parseDate(item.contractDate || '');
            return date && date.getFullYear() === year;
        });
        console.log(`사급 연도 필터링 후: ${filteredData.length}건`);
    }
    
    analyzePrivateCustomerData(filteredData);
}

// 고객별 데이터 분석
function analyzeCustomerData(data) {
    console.log('=== 고객별 데이터 분석 ===');
    
    const customerMap = new Map();
    
    data.forEach(item => {
        const customer = item.customer || '';
        
        if (!customerMap.has(customer)) {
            customerMap.set(customer, {
                customer: customer,
                region: item.region || '',
                customerType: item.customerType || '지방자치단체',
                count: 0,
                amount: 0,
                contracts: [],
                lastTransactionDate: null
            });
        }
        
        const customerInfo = customerMap.get(customer);
        customerInfo.count++;
        customerInfo.amount += item.amount || 0;
        customerInfo.contracts.push(item);
        
        const date = parseDate(item.contractDate || '');
        if (!customerInfo.lastTransactionDate || (date && date > customerInfo.lastTransactionDate)) {
            customerInfo.lastTransactionDate = date;
        }
    });
    
    // 배열로 변환 및 정렬
    customerData = Array.from(customerMap.values());
    customerData.sort((a, b) => b.amount - a.amount);
    
    // 순위 및 비중 계산
    const totalAmount = customerData.reduce((sum, item) => sum + item.amount, 0);
    customerData.forEach((item, index) => {
        item.rank = index + 1;
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
    
    console.log(`고객별 분석 완료: ${customerData.length}개 고객`);
}

// 지역별 데이터 분석
function analyzeRegionData(data) {
    const regionMap = new Map();
    
    data.forEach(item => {
        const region = item.region || '';
        
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
        regionInfo.amount += item.amount || 0;
    });
    
    // 배열로 변환
    regionData = Array.from(regionMap.values()).map(item => ({
        region: item.region,
        customerCount: item.customerCount.size,
        contractCount: item.contractCount,
        amount: item.amount,
        avgAmount: item.contractCount > 0 ? item.amount / item.contractCount : 0
    }));
    
    regionData.sort((a, b) => b.amount - a.amount);
    
    // 비중 계산
    const totalAmount = regionData.reduce((sum, item) => sum + item.amount, 0);
    regionData.forEach(item => {
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 수요기관별 데이터 분석
function analyzeTypeData(data) {
    const typeMap = new Map();
    
    data.forEach(item => {
        const type = item.customerType || '지방자치단체';
        
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
        typeInfo.amount += item.amount || 0;
    });
    
    // 배열로 변환
    typeData = Array.from(typeMap.values()).map(item => ({
        customerType: item.customerType,
        customerCount: item.customerCount.size,
        contractCount: item.contractCount,
        amount: item.amount,
        avgAmount: item.contractCount > 0 ? item.amount / item.contractCount : 0
    }));
    
    typeData.sort((a, b) => b.amount - a.amount);
    
    // 비중 계산
    const totalAmount = typeData.reduce((sum, item) => sum + item.amount, 0);
    typeData.forEach(item => {
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 사급 고객별 데이터 분석
function analyzePrivateCustomerData(data) {
    const customerMap = new Map();
    
    data.forEach(item => {
        const customer = item.customer || '';
        
        if (!customerMap.has(customer)) {
            customerMap.set(customer, {
                customer: customer,
                region: item.region || '',
                customerType: item.customerType || '민간',
                count: 0,
                amount: 0,
                contracts: [],
                lastTransactionDate: null
            });
        }
        
        const customerInfo = customerMap.get(customer);
        customerInfo.count++;
        customerInfo.amount += item.amount || 0;
        customerInfo.contracts.push(item);
        
        const date = parseDate(item.contractDate || '');
        if (!customerInfo.lastTransactionDate || (date && date > customerInfo.lastTransactionDate)) {
            customerInfo.lastTransactionDate = date;
        }
    });
    
    // 배열로 변환 및 정렬
    privateCustomerData = Array.from(customerMap.values());
    privateCustomerData.sort((a, b) => b.amount - a.amount);
    
    // 순위 및 비중 계산
    const totalAmount = privateCustomerData.reduce((sum, item) => sum + item.amount, 0);
    privateCustomerData.forEach((item, index) => {
        item.rank = index + 1;
        item.share = totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
    });
}

// 요약 통계 업데이트
function updateSummaryStats() {
    const totalCustomers = customerData.length;
    const totalAmount = customerData.reduce((sum, item) => sum + item.amount, 0);
    const avgAmount = totalCustomers > 0 ? totalAmount / totalCustomers : 0;
    const maxShare = customerData.length > 0 ? customerData[0].share : 0;
    const newCustomers = Math.floor(totalCustomers * 0.2); // 20%를 신규로 가정
    
    console.log('요약 통계 업데이트:', {
        totalCustomers,
        avgAmount,
        maxShare,
        newCustomers
    });
    
    // DOM 업데이트
    const elements = {
        totalCustomers: $('totalCustomers'),
        avgAmount: $('avgAmount'),
        maxShare: $('maxShare'),
        newCustomers: $('newCustomers')
    };
    
    if (elements.totalCustomers) elements.totalCustomers.textContent = formatNumber(totalCustomers);
    if (elements.avgAmount) elements.avgAmount.textContent = formatCurrency(Math.round(avgAmount));
    if (elements.maxShare) elements.maxShare.textContent = maxShare.toFixed(1) + '%';
    if (elements.newCustomers) elements.newCustomers.textContent = formatNumber(newCustomers);
}

// 모든 테이블 렌더링
function renderAllTables() {
    console.log('=== 모든 테이블 렌더링 ===');
    renderCustomerTable();
    renderRegionTable();
    renderTypeTable();
    renderPrivateTable();
}

// 고객별 테이블 렌더링
function renderCustomerTable() {
    const tbody = $('customerTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (customerData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-8">고객 데이터가 없습니다.</td></tr>';
        return;
    }
    
    customerData.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${customer.rank}</td>
            <td class="font-medium">${customer.customer}</td>
            <td>${customer.region}</td>
            <td class="text-center">
                <span class="badge ${getCustomerTypeBadgeClass(customer.customerType)}">${customer.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(customer.count)}</td>
            <td class="text-right font-medium amount">${formatCurrency(customer.amount)}</td>
            <td class="text-right ${customer.share >= 20 ? 'text-red-600 font-bold' : customer.share >= 10 ? 'text-orange-600 font-medium' : ''}">${customer.share.toFixed(1)}%</td>
            <td class="text-center">${customer.lastTransactionDate ? formatDate(customer.lastTransactionDate) : '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`고객별 테이블 렌더링 완료: ${customerData.length}행`);
}

// 지역별 테이블 렌더링
function renderRegionTable() {
    const tbody = $('regionTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (regionData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-8">지역 데이터가 없습니다.</td></tr>';
        return;
    }
    
    regionData.forEach((region, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="font-medium">${region.region}</td>
            <td class="text-center">${formatNumber(region.customerCount)}</td>
            <td class="text-center">${formatNumber(region.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(region.amount)}</td>
            <td class="text-right">${region.share.toFixed(1)}%</td>
            <td class="text-right">${formatCurrency(Math.round(region.avgAmount))}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`지역별 테이블 렌더링 완료: ${regionData.length}행`);
}

// 수요기관별 테이블 렌더링
function renderTypeTable() {
    const tbody = $('typeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (typeData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-500 py-8">수요기관 데이터가 없습니다.</td></tr>';
        return;
    }
    
    typeData.forEach((type, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="font-medium">
                <span class="badge ${getCustomerTypeBadgeClass(type.customerType)}">${type.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(type.customerCount)}</td>
            <td class="text-center">${formatNumber(type.contractCount)}</td>
            <td class="text-right font-medium amount">${formatCurrency(type.amount)}</td>
            <td class="text-right">${type.share.toFixed(1)}%</td>
            <td class="text-right">${formatCurrency(Math.round(type.avgAmount))}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`수요기관별 테이블 렌더링 완료: ${typeData.length}행`);
}

// 사급판매 테이블 렌더링
function renderPrivateTable() {
    const tbody = $('privateTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (privateCustomerData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-gray-500 py-8">사급판매 데이터가 없습니다.</td></tr>';
        return;
    }
    
    privateCustomerData.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        row.innerHTML = `
            <td class="text-center font-medium">${customer.rank}</td>
            <td class="font-medium">${customer.customer}</td>
            <td>${customer.region}</td>
            <td class="text-center">
                <span class="badge ${getCustomerTypeBadgeClass(customer.customerType)}">${customer.customerType}</span>
            </td>
            <td class="text-center">${formatNumber(customer.count)}</td>
            <td class="text-right font-medium amount">${formatCurrency(customer.amount)}</td>
            <td class="text-right">${customer.share.toFixed(1)}%</td>
            <td class="text-center">${customer.lastTransactionDate ? formatDate(customer.lastTransactionDate) : '-'}</td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`사급판매 테이블 렌더링 완료: ${privateCustomerData.length}행`);
}

// 수요기관 구분별 배지 클래스 반환
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
        case '민간':
            return 'badge-purple';
        default:
            return 'badge-gray';
    }
}

// 로딩 상태 표시
function showLoadingState(show) {
    const analyzeBtn = $('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.disabled = show;
        analyzeBtn.innerHTML = show 
            ? '<div class="loading-spinner"></div>분석 중...' 
            : `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
               </svg>분석`;
    }
    
    // 통계 카드 로딩 상태
    const statElements = ['totalCustomers', 'avgAmount', 'maxShare', 'newCustomers'];
    statElements.forEach(id => {
        const element = $(id);
        if (element) {
            element.textContent = show ? '로딩중...' : element.textContent;
        }
    });
}

// 알림 표시
function showAlert(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    if (window.CommonUtils && CommonUtils.showAlert) {
        CommonUtils.showAlert(message, type);
    } else {
        // 간단한 대체 알림
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-message`;
        alertDiv.innerHTML = `
            <span>${message}</span>
            <button type="button" class="float-right text-lg leading-none" onclick="this.parentElement.remove()">×</button>
        `;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            padding: 1rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            ${type === 'error' ? 'background-color: #fecaca; color: #991b1b; border: 1px solid #f87171;' :
              type === 'success' ? 'background-color: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;' :
              type === 'warning' ? 'background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d;' :
              'background-color: #dbeafe; color: #1e40af; border: 1px solid #93c5fd;'}
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// 샘플 데이터 로드 (기존 함수 호환성)
function loadSampleData() {
    console.log('=== 샘플 데이터로 초기화 ===');
    generateSampleData();
    
    // 분석 실행
    setTimeout(() => {
        analyzeCustomers();
    }, 100);
}

// 전역 객체에 함수들 할당
window.CustomerAnalysis = {
    analyzeCustomers: analyzeCustomers,
    loadSampleData: loadSampleData,
    generateSampleData: generateSampleData
};

console.log('=== CustomerAnalysis 모듈 로드 완료 ===');
