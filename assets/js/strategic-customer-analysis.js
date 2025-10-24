// strategic-customer-analysis.js

// 전역 변수로 모든 원본 데이터를 저장하여 재분석 시 다시 로드하지 않도록 합니다.
let allRawData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 분석 버튼을 로딩 상태로 초기화
    CommonUtils.toggleLoading(document.getElementById('analyzeBtn'), true);
    try {
        allRawData = await window.sheetsAPI.loadCSVData('procurement');
        const allData = parseData(allRawData);
        
        // 데이터 로딩 후 필터 옵션을 동적으로 채웁니다.
        populateFilters(allData);
        
        // 시/도 필터 변경 시 시/군/구 필터가 동적으로 업데이트되도록 이벤트를 연결합니다.
        document.getElementById('regionFilter').addEventListener('change', () => populateCityFilter(allData));
        
        // '분석' 버튼 클릭 시 runAnalysis 함수가 실행되도록 이벤트를 연결합니다.
        document.getElementById('analyzeBtn').addEventListener('click', runAnalysis);

    } catch (error) {
        console.error("페이지 초기화 실패:", error);
        CommonUtils.showAlert("데이터 로딩 중 오류가 발생했습니다.", 'error');
    } finally {
        CommonUtils.toggleLoading(document.getElementById('analyzeBtn'), false);
    }
});

/**
 * 원본 데이터를 분석에 용이한 형태로 파싱하고, 필터링을 위한 항목(지역, 소관)을 추가합니다.
 */
function parseData(rawData) {
    return rawData.map(item => {
        const fullRegion = (item['수요기관지역'] || '').trim();
        const regionParts = fullRegion.split(' ');
        return {
            agency: (item['수요기관명'] || '').trim(),
            supplier: (item['업체'] || '').trim(),
            product: (item['세부품명'] || '').trim(),
            contractName: (item['계약명'] || '').trim(),
            amount: parseInt(String(item['공급금액']).replace(/[^\d]/g, '') || '0', 10),
            date: item['기준일자'] ? new Date(item['기준일자']) : null,
            region: regionParts[0] || '', // 시/도
            city: regionParts[1] || '',   // 시/군/구
            agencyType: item['소관구분'] || '기타'
        };
    }).filter(d => d.agency && d.supplier && d.amount > 0 && d.date && !isNaN(d.date));
}

/**
 * '분석' 버튼 클릭 시 실행되는 메인 함수
 */
function runAnalysis() {
    CommonUtils.toggleLoading(document.getElementById('analyzeBtn'), true);

    const region = document.getElementById('regionFilter').value;
    const city = document.getElementById('cityFilter').value;
    const agencyType = document.getElementById('agencyTypeFilter').value;

    // 선택된 필터 값으로 원본 데이터에서 필요한 데이터만 필터링합니다.
    const filteredData = parseData(allRawData).filter(item => 
        (region === 'all' || item.region === region) &&
        (city === 'all' || item.city === city) &&
        (agencyType === 'all' || item.agencyType === agencyType)
    );

    if (filteredData.length === 0) {
        CommonUtils.showAlert('선택된 조건에 해당하는 데이터가 없습니다.', 'warning');
        CommonUtils.toggleLoading(document.getElementById('analyzeBtn'), false);
        return;
    }

    // 두 가지 분석을 동시에(비동기적으로) 실행하여 사용자 대기 시간을 줄입니다.
    Promise.all([
        analyzeAndRenderProjects(filteredData),
        analyzeAndRenderOpportunities(filteredData)
    ]).finally(() => {
        CommonUtils.toggleLoading(document.getElementById('analyzeBtn'), false);
    });
}

// ==================================================================
// 1. 주요 프로젝트 교체 주기 알림 기능
// ==================================================================
async function analyzeAndRenderProjects(data) {
    const tbody = document.getElementById('projectAlertTableBody');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">분석 중...</td></tr>`;

    const projectKeywords = ['조성', '설치', '공사', '신설', '개선', '정비'];
    const REPLACEMENT_CYCLE_YEARS = 3;
    const ALERT_WINDOW_YEARS = 2; 
    const today = new Date();
    const alertStartDate = new Date(today.getFullYear() - (REPLACEMENT_CYCLE_YEARS + ALERT_WINDOW_YEARS), today.getMonth(), today.getDate());
    const alertEndDate = new Date(today.getFullYear() - REPLACEMENT_CYCLE_YEARS, today.getMonth(), today.getDate());

    const agencyStats = new Map();
    data.forEach(d => {
        if (!agencyStats.has(d.agency)) agencyStats.set(d.agency, { total: 0, count: 0 });
        const stats = agencyStats.get(d.agency);
        stats.total += d.amount;
        stats.count++;
    });

    const majorProjects = data.filter(d => {
        const avgAmount = agencyStats.has(d.agency) ? agencyStats.get(d.agency).total / agencyStats.get(d.agency).count : 0;
        const isProject = projectKeywords.some(keyword => d.contractName.includes(keyword));
        const isLargeScale = d.amount > avgAmount * 2.5 && d.amount > 30000000;
        
        return isProject && isLargeScale && d.date >= alertStartDate && d.date < alertEndDate;
    });
    
    tbody.innerHTML = '';
    if (majorProjects.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-500">교체 주기가 임박한 주요 프로젝트가 없습니다.</td></tr>`;
        return;
    }

    // ▼▼▼ [수정됨] 카드 대신 테이블 행(row)을 생성하는 로직 ▼▼▼
    majorProjects
        .sort((a, b) => b.date - a.date) // 최신 계약일 순으로 정렬
        .forEach(p => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap">${CommonUtils.formatDate(p.date)}</td>
                <td class="px-4 py-3">${p.agency}</td>
                <td class="px-4 py-3">${p.contractName}</td>
                <td class="px-4 py-3">${p.supplier}</td>
                <td class="px-4 py-3 text-right font-medium text-pink-600">${CommonUtils.formatCurrency(p.amount)}</td>
            `;
        });
}

// ==================================================================
// 2. 기회 고객 포착 기능
// ==================================================================
async function analyzeAndRenderOpportunities(data) {
    const tbody = document.getElementById('opportunityTableBody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-500">분석 중...</td></tr>`;

    const currentYear = new Date().getFullYear();
    const analysisYears = [currentYear - 3, currentYear - 2, currentYear - 1];
    
    const agenciesData = new Map();
    data.forEach(d => {
        const year = d.date.getFullYear();
        if (analysisYears.includes(year)) {
            if (!agenciesData.has(d.agency)) agenciesData.set(d.agency, []);
            agenciesData.get(d.agency).push(d);
        }
    });

    const opportunityList = [];
    agenciesData.forEach((contracts, agency) => {
        let total3YAmount = 0;
        const yearlyAnalysis = {};

        analysisYears.forEach(year => {
            const yearContracts = contracts.filter(c => c.date.getFullYear() === year);
            const totalYearAmount = yearContracts.reduce((sum, c) => sum + c.amount, 0);
            total3YAmount += totalYearAmount;

            const supplierSales = new Map();
            yearContracts.forEach(c => {
                supplierSales.set(c.supplier, (supplierSales.get(c.supplier) || 0) + c.amount);
            });
            
            const topSupplier = [...supplierSales.entries()].sort((a, b) => b[1] - a[1])[0];
            yearlyAnalysis[year] = {
                topSupplierName: topSupplier ? topSupplier[0] : null,
                topSupplierShare: totalYearAmount > 0 && topSupplier ? (topSupplier[1] / totalYearAmount) * 100 : 0
            };
        });

        const topSuppliers = analysisYears.map(y => yearlyAnalysis[y].topSupplierName).filter(Boolean);
        const uniqueTopSuppliers = new Set(topSuppliers);
        const avgTopShare = analysisYears.reduce((sum, y) => sum + yearlyAnalysis[y].topSupplierShare, 0) / 3;

        if (total3YAmount > 30000000 && (uniqueTopSuppliers.size > 1 || avgTopShare < 70)) {
            const evenYearSales = contracts.filter(c => c.date.getFullYear() % 2 === 0).reduce((s, c) => s + c.amount, 0);
            const oddYearSales = contracts.filter(c => c.date.getFullYear() % 2 !== 0).reduce((s, c) => s + c.amount, 0);
            let purchaseCycle = '균형형';
            if (total3YAmount > 0) {
                 if (evenYearSales / total3YAmount > 0.7) purchaseCycle = '짝수해 집중';
                 else if (oddYearSales / total3YAmount > 0.7) purchaseCycle = '홀수해 집중';
            }
           
            opportunityList.push({
                agency,
                total3YAmount,
                purchaseCycle,
                topSupplierChanges: `${uniqueTopSuppliers.size}개 업체`
            });
        }
    });

    tbody.innerHTML = '';
    if (opportunityList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-gray-500">분석된 기회 고객이 없습니다.</td></tr>`;
        return;
    }

    opportunityList
        .sort((a, b) => b.total3YAmount - a.total3YAmount)
        .forEach((item, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td class="px-4 py-3 text-center font-medium">${index + 1}</td>
                <td class="px-4 py-3 font-bold text-gray-800">${item.agency}</td>
                <td class="px-4 py-3 text-center">${item.purchaseCycle}</td>
                <td class="px-4 py-3 text-right font-semibold text-blue-600">${CommonUtils.formatCurrency(item.total3YAmount)}</td>
                <td class="px-4 py-3 text-center">${item.topSupplierChanges}</td>
                <td class="px-4 py-3 text-center">
                    <button data-agency="${item.agency}" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.75rem;">상세 분석</button>
                </td>
            `;
        });
    
    tbody.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.agency) {
            showOpportunityDetail(e.target.dataset.agency, parseData(allRawData));
        }
    });
}

// ==================================================================
// 3. 필터 및 상세 분석 팝업 기능
// ==================================================================

/**
 * 데이터 기반으로 필터 옵션 동적 생성
 */
function populateFilters(data) {
    const regions = [...new Set(data.map(item => item.region).filter(Boolean))].sort();
    const agencyTypes = [...new Set(data.map(item => item.agencyType).filter(Boolean))].sort();
    
    const regionFilter = document.getElementById('regionFilter');
    const agencyTypeFilter = document.getElementById('agencyTypeFilter');

    regions.forEach(region => regionFilter.add(new Option(region, region)));
    agencyTypes.forEach(type => agencyTypeFilter.add(new Option(type, type)));
    
    populateCityFilter(data);
}

/**
 * 시/도 선택에 따라 시/군/구 필터 업데이트
 */
function populateCityFilter(data) {
    const selectedRegion = document.getElementById('regionFilter').value;
    const cityFilter = document.getElementById('cityFilter');
    cityFilter.innerHTML = '<option value="all">전체</option>';

    if (selectedRegion !== 'all') {
        const cities = [...new Set(data
            .filter(item => item.region === selectedRegion && item.city)
            .map(item => item.city))]
            .sort();
        cities.forEach(city => cityFilter.add(new Option(city, city)));
    }
}

/**
 * '상세 분석' 버튼 클릭 시 상세 리포트 팝업 표시
 */
function showOpportunityDetail(agencyName, allData) {
    const agencyData = allData.filter(d => d.agency === agencyName && d.product === '보행매트');
    
    let reportHtml = `<p class="mb-4 text-gray-600">'${agencyName}'의 최근 보행매트 구매 내역을 분석한 결과입니다.</p>`;
    
    if (agencyData.length === 0) {
        reportHtml += `<p class="text-center py-8 text-gray-500">최근 보행매트 구매 내역이 없습니다.</p>`;
    } else {
        const prices = agencyData.map(d => d.amount);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        reportHtml += `
            <h4 class="font-bold text-md mb-2">경쟁사 낙찰가 분석 (보행매트)</h4>
            <div class="grid grid-cols-3 gap-4 text-center mb-6">
                <div class="bg-blue-50 p-3 rounded-lg">
                    <p class="text-sm text-blue-800">최저가</p>
                    <p class="font-bold text-lg text-blue-900">${CommonUtils.formatCurrency(minPrice)}</p>
                </div>
                <div class="bg-green-50 p-3 rounded-lg">
                    <p class="text-sm text-green-800">평균가</p>
                    <p class="font-bold text-lg text-green-900">${CommonUtils.formatCurrency(avgPrice)}</p>
                </div>
                <div class="bg-red-50 p-3 rounded-lg">
                    <p class="text-sm text-red-800">최고가</p>
                    <p class="font-bold text-lg text-red-900">${CommonUtils.formatCurrency(maxPrice)}</p>
                </div>
            </div>
            <h4 class="font-bold text-md mb-2">최근 계약 상세</h4>
            <div class="overflow-auto" style="max-height: 250px;">
                <table class="w-full text-sm">
                    <thead class="bg-gray-100"><tr>
                        <th class="p-2 text-left">계약일</th>
                        <th class="p-2 text-left">공급업체</th>
                        <th class="p-2 text-right">계약금액</th>
                    </tr></thead>
                    <tbody>
                        ${agencyData.sort((a,b) => b.date - a.date).slice(0, 10).map(d => `
                            <tr class="border-b">
                                <td class="p-2">${CommonUtils.formatDate(d.date)}</td>
                                <td class="p-2">${d.supplier}</td>
                                <td class="p-2 text-right font-medium">${CommonUtils.formatCurrency(d.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    CommonUtils.showModal(`[${agencyName}] 공략 리포트`, reportHtml, { width: '700px' });
}
