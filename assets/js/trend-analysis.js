// trend-analysis.js

// 전역 변수
let allData = [];
let chartInstances = {}; // 생성된 차트 객체를 저장

// 유틸리티 함수
const $ = (id) => document.getElementById(id);

/**
 * 페이지 초기화
 */
document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState(true, '모든 품목의 데이터를 로딩 중입니다...');
    try {
        allData = await loadAndParseAllData();
        
        $('analyzeBtn').addEventListener('click', analyzeTrends);
        setupTabs();
        
        analyzeTrends(); // 페이지 로드 시 기본 필터로 첫 분석 실행
    } catch (error) {
        console.error("초기화 실패:", error);
        showAlert("데이터 로딩 중 오류가 발생했습니다.", 'error');
    } finally {
        showLoadingState(false);
    }
});

/**
 * 모든 시트 데이터 로드 및 통합 파싱
 */
async function loadAndParseAllData() {
    if (!window.sheetsAPI) {
        throw new Error('sheets-api.js가 로드되지 않았습니다.');
    }

    const [procurementData, vegetationData, nonSlipData] = await Promise.all([
        window.sheetsAPI.loadCSVData('procurement').catch(e => { console.warn('보행매트 시트 로드 실패', e); return []; }),
        window.sheetsAPI.loadCSVData('vegetationMat').catch(e => { console.warn('식생매트 시트 로드 실패', e); return []; }),
        window.sheetsAPI.loadCSVData('nonSlip').catch(e => { console.warn('논슬립 시트 로드 실패', e); return []; })
    ]);

    const allRawData = [...procurementData, ...vegetationData, ...nonSlipData];

    return allRawData.map(item => ({
        amount: parseInt(String(item['공급금액']).replace(/[^\d]/g, '') || '0', 10),
        date: item['기준일자'] || '',
        product: (item['세부품명'] || '').trim(),
        region: (item['수요기관지역'] || '').trim().split(' ')[0],
        agencyType: item['소관구분'] || '기타',
        contractName: (item['계약명'] || '').trim()
    })).filter(item => item.amount > 0 && item.date && item.contractName);
}

/**
 * 탭 기능 설정
 */
function setupTabs() {
    const tabs = $('trendTabs');
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
 * 분석 실행 함수
 */
function analyzeTrends() {
    showLoadingState(true, '데이터 분석 및 그래프 생성 중...');

    const year = $('analysisYear').value;
    const product = $('productFilter').value;

    const filteredData = allData.filter(item => {
        const itemYear = new Date(item.date).getFullYear().toString();
        const yearMatch = (year === 'all') || (itemYear === year);
        const productMatch = (product === 'all') || (item.product === product);
        return yearMatch && productMatch;
    });
    
    const totalSales = filteredData.reduce((sum, item) => sum + item.amount, 0);
    const totalContracts = new Set(filteredData.map(item => item.contractName)).size;
    const summary = { totalSales, totalContracts };

    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 여기가 수정된 부분입니다 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    let titleSuffix = '';
    if (year === 'all') {
        if (allData.length > 0) {
            const years = allData.map(d => new Date(d.date).getFullYear());
            const minYear = Math.min(...years);
            const maxYear = Math.max(...years);
            titleSuffix = `(${minYear} ~ ${maxYear})`;
        } else {
            titleSuffix = '(전체)';
        }
    } else {
        titleSuffix = `(${year}년)`;
    }

    renderMonthlyTrend(filteredData, year, summary, titleSuffix);
    renderRegionalTrend(filteredData, summary, titleSuffix);
    renderAgencyTypeTrend(filteredData, summary, titleSuffix);
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 여기가 수정된 부분입니다 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    
    showLoadingState(false);
}

/**
 * 차트 렌더링 헬퍼 함수
 */
function renderChart(canvasId, type, labels, data, label) {
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }
    const ctx = $(canvasId).getContext('2d');
    chartInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                fill: type === 'line' ? true : false,
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: (value) => new Intl.NumberFormat('ko-KR').format(value) + '원' }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(context.parsed.y)
                    }
                }
            }
        }
    });
}

/**
 * 월별 판매 추이
 */
function renderMonthlyTrend(data, year, summary, titleSuffix) {
    // [수정] 제목 업데이트
    $('monthlyTab').querySelector('h3').innerHTML = `월별 판매 추이 <span class="text-base font-normal text-gray-500">${titleSuffix}</span>`;

    const monthlySales = Array(12).fill(0);
    data.forEach(item => {
        const month = new Date(item.date).getMonth();
        monthlySales[month] += item.amount;
    });
    
    const labels = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    const chartLabel = year === 'all' ? '월별 총 판매액' : `${year}년 월별 판매액`;
    renderChart('monthlyChart', 'line', labels, monthlySales, chartLabel);

    updateSummaryCards('monthly', summary);
    $('printMonthlyBtn').onclick = () => printPanel('monthlyTab');
}

/**
 * 지역별 판매 현황
 */
function renderRegionalTrend(data, summary, titleSuffix) {
    // [수정] 제목 업데이트
    $('regionalTab').querySelector('h3').innerHTML = `지역별 판매 현황 <span class="text-base font-normal text-gray-500">${titleSuffix}</span>`;

    const regionalSales = {};
    data.forEach(item => {
        if (item.region) {
            regionalSales[item.region] = (regionalSales[item.region] || 0) + item.amount;
        }
    });

    const sortedRegions = Object.entries(regionalSales).sort(([, a], [, b]) => b - a);
    const labels = sortedRegions.map(item => item[0]);
    const salesData = sortedRegions.map(item => item[1]);

    renderChart('regionalChart', 'bar', labels, salesData, '지역별 총 판매액');
    
    updateSummaryCards('regional', summary);
    $('printRegionalBtn').onclick = () => printPanel('regionalTab');
}

/**
 * 소관구분별 판매 현황
 */
function renderAgencyTypeTrend(data, summary, titleSuffix) {
    // [수정] 제목 업데이트
    $('agencyTypeTab').querySelector('h3').innerHTML = `소관구분별 판매 현황 <span class="text-base font-normal text-gray-500">${titleSuffix}</span>`;

    const agencyTypeSales = {};
    data.forEach(item => {
        agencyTypeSales[item.agencyType] = (agencyTypeSales[item.agencyType] || 0) + item.amount;
    });

    const sortedTypes = Object.entries(agencyTypeSales).sort(([, a], [, b]) => b - a);
    const labels = sortedTypes.map(item => item[0]);
    const salesData = sortedTypes.map(item => item[1]);
    
    renderChart('agencyTypeChart', 'bar', labels, salesData, '소관구분별 총 판매액');

    updateSummaryCards('agencyType', summary);
    $('printAgencyTypeBtn').onclick = () => printPanel('agencyTypeTab');
}

/**
 * 요약 카드 업데이트 함수
 */
function updateSummaryCards(prefix, summary) {
    const { totalSales, totalContracts } = summary;
    $(prefix + 'TotalSales').textContent = new Intl.NumberFormat('ko-KR').format(totalSales) + '원';
    $(prefix + 'TotalContracts').textContent = new Intl.NumberFormat('ko-KR').format(totalContracts) + '건';
}

/**
 * 인쇄 함수
 */
function printPanel(elementId) {
    const panel = $(elementId);
    if (panel) {
        panel.classList.add('printable-area');
        Chart.defaults.animation = false;
        window.print();
        Chart.defaults.animation = true;
        panel.classList.remove('printable-area');
    }
}

// 로딩 상태 및 알림 함수
function showLoadingState(isLoading, text = '분석 중...') {
    const button = $('analyzeBtn');
    if (button) {
        button.disabled = isLoading;
        const originalText = `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>분석`;
        button.innerHTML = isLoading ? `<div class="loading-spinner"></div> ${text}` : originalText;
    }
}

function showAlert(message, type = 'info') {
    if (window.CommonUtils && CommonUtils.showAlert) {
        window.CommonUtils.showAlert(message, type);
    } else { alert(message); }
}
