// customer-relationship.js

// 전역 변수
let allData = [];

// 유틸리티
const $ = (id) => document.getElementById(id);

/**
 * 페이지 초기화
 */
document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState(true, '전체 데이터를 로딩 중입니다...');
    try {
        allData = await loadAndParseAllData();
        $('analyzeBtn').addEventListener('click', analyzeRelationships);
        setupTabs();
        analyzeRelationships(); // 초기 분석 실행
    } catch (error) {
        console.error("초기화 실패:", error);
        showAlert("페이지 초기화 중 오류가 발생했습니다.", 'error');
    } finally {
        showLoadingState(false);
    }
});

/**
 * 모든 시트 데이터 로드 및 파싱
 */
async function loadAndParseAllData() {
    if (!window.sheetsAPI) throw new Error('sheets-api.js가 로드되지 않았습니다.');
    
    const dataSources = ['procurement', 'vegetationMat', 'nonSlip'];
    const promises = dataSources.map(source => 
        window.sheetsAPI.loadCSVData(source).catch(e => {
            console.warn(`${source} 시트 로드 실패`, e);
            return [];
        })
    );
    const results = await Promise.all(promises);
    const allRawData = results.flat();

    return allRawData.map(item => ({
        agency: (item['수요기관명'] || '').trim(),
        amount: parseInt(String(item['공급금액']).replace(/[^\d]/g, '') || '0', 10),
        date: item['기준일자'] || '',
    })).filter(item => item.agency && item.amount > 0 && item.date);
}

/**
 * 탭 기능 설정
 */
function setupTabs() {
    const tabs = $('customerTabs');
    tabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const tabName = e.target.dataset.tab;
            tabs.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
            $(tabName + 'Tab').classList.remove('hidden');
        }
    });
}

/**
 * 관계 분석 실행
 */
function analyzeRelationships() {
    showLoadingState(true, '고객 관계를 분석 중입니다...');

    const baseYear = $('baseYear').value;
    const comparisonYear = $('comparisonYear').value;

    if (baseYear >= comparisonYear) {
        showAlert('비교 연도는 기준 연도보다 이후여야 합니다.', 'error');
        showLoadingState(false);
        return;
    }

    const getYearDataMap = (year) => {
        const yearData = allData.filter(d => new Date(d.date).getFullYear().toString() === year);
        const dataMap = new Map();
        yearData.forEach(d => {
            dataMap.set(d.agency, (dataMap.get(d.agency) || 0) + d.amount);
        });
        return dataMap;
    };

    const baseMap = getYearDataMap(baseYear);
    const comparisonMap = getYearDataMap(comparisonYear);
    const allAgencies = new Set([...baseMap.keys(), ...comparisonMap.keys()]);

    const newCustomers = [], lostCustomers = [], increasedCustomers = [], decreasedCustomers = [];

    allAgencies.forEach(agency => {
        const baseAmount = baseMap.get(agency);
        const comparisonAmount = comparisonMap.get(agency);

        if (comparisonAmount && !baseAmount) {
            newCustomers.push({ agency, amount: comparisonAmount });
        } else if (baseAmount && !comparisonAmount) {
            lostCustomers.push({ agency, amount: baseAmount });
        } else if (baseAmount && comparisonAmount) {
            if (comparisonAmount > baseAmount) {
                increasedCustomers.push({ agency, baseAmount, comparisonAmount });
            } else if (comparisonAmount < baseAmount) {
                decreasedCustomers.push({ agency, baseAmount, comparisonAmount });
            }
        }
    });
    
    renderNewLostTable('newTab', `신규 수요기관 (${baseYear}년 → ${comparisonYear}년)`, newCustomers, '거래액');
    renderNewLostTable('lostTab', `이탈 수요기관 (${baseYear}년 → ${comparisonYear}년)`, lostCustomers, '과거 거래액');
    renderMaintainedTables(baseYear, comparisonYear, increasedCustomers, decreasedCustomers);

    showLoadingState(false);
}

/**
 * 신규/이탈 고객 테이블 렌더링
 */
function renderNewLostTable(tabId, title, data, amountLabel) {
    const container = $(tabId);
    data.sort((a, b) => b.amount - a.amount);
    
    let rowsHtml = data.map((item, index) => `
        <tr>
            <td class="px-6 py-4 text-center">${index + 1}</td>
            <td class="px-6 py-4">${item.agency}</td>
            <td class="px-6 py-4 text-right font-medium whitespace-nowrap">${formatCurrency(item.amount)}</td>
        </tr>
    `).join('');

    if (data.length === 0) {
        rowsHtml = `<tr><td colspan="3" class="text-center py-8 text-gray-500">해당 수요기관이 없습니다.</td></tr>`;
    }

    container.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-900 mb-4">${title}</h3>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">순위</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수요기관명</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">${amountLabel}</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>`;
}

/**
 * 구매액 변동 테이블 렌더링
 */
function renderMaintainedTables(baseYear, comparisonYear, increased, decreased) {
    const container = $('maintainedTab');
    
    const createTable = (title, data, isIncrease) => {
        data.sort((a,b) => Math.abs(b.comparisonAmount - b.baseAmount) - Math.abs(a.comparisonAmount - a.baseAmount));
        let rowsHtml = data.map((item, index) => {
            const diff = item.comparisonAmount - item.baseAmount;
            const percentage = (diff / item.baseAmount) * 100;
            const diffColor = isIncrease ? 'text-blue-600' : 'text-red-600';
            const diffIcon = isIncrease ? '▲' : '▼';
            
            return `
                <tr>
                    <td class="px-6 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.agency}</td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">${formatCurrency(item.baseAmount)}</td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">${formatCurrency(item.comparisonAmount)}</td>
                    <td class="px-6 py-4 text-right font-medium whitespace-nowrap ${diffColor}">${diffIcon} ${formatCurrency(Math.abs(diff))}</td>
                    <td class="px-6 py-4 text-right font-medium whitespace-nowrap ${diffColor}">${percentage.toFixed(1)}%</td>
                </tr>`;
        }).join('');
        
        if(data.length === 0) {
             rowsHtml = `<tr><td colspan="6" class="text-center py-8 text-gray-500">해당 수요기관이 없습니다.</td></tr>`;
        }

        return `
            <h3 class="text-lg font-semibold text-gray-900 mb-4 mt-8">${title}</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">순위</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수요기관명</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">${baseYear}년</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">${comparisonYear}년</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">증감액</th>
                            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">증감률</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>`;
    };

    container.innerHTML = 
        createTable(`👍 구매액 증가 (${baseYear} → ${comparisonYear})`, increased, true) +
        createTable(`🚨 구매액 감소 (${baseYear} → ${comparisonYear})`, decreased, false);
}


// 헬퍼 함수
function showLoadingState(isLoading, text = '분석 중...') {
    const button = $('analyzeBtn');
    if (button) {
        button.disabled = isLoading;
        button.innerHTML = isLoading ? `<div class="loading-spinner"></div> ${text}` : `분석`;
    }
}

// common.js에 showAlert가 있다고 가정합니다.
function showAlert(message, type = 'info') {
    if (window.CommonUtils && CommonUtils.showAlert) {
        window.CommonUtils.showAlert(message, type);
    } else { alert(message); }
}
