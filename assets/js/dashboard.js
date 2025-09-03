// 대시보드 메인 JavaScript
// assets/js/dashboard.js

// 전역 변수
let dashboardData = {};
let detailData = {
    customers: { government: [], private: [] },
    newCustomers: { government: [], private: [] },
    contracts: { government: [], private: [] }
};
let isLoading = false;

// 안전한 요소 가져오기
function $(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`요소를 찾을 수 없습니다: ${id}`);
    }
    return element;
}

// 로딩 상태 표시
function setLoadingState(show) {
    isLoading = show;
    const cards = ['totalSalesCard', 'totalCustomersCard', 'newCustomersCard', 'totalContractsCard'];
    
    cards.forEach(cardId => {
        const card = $(cardId);
        if (card) {
            if (show) {
                card.classList.add('loading-card');
            } else {
                card.classList.remove('loading-card', 'error-card');
            }
        }
    });

    if (show) {
        updateDashboardStats({
            totalSales: '로딩중...',
            totalCustomers: '로딩중...',
            newCustomers: '로딩중...',
            totalContracts: '로딩중...'
        });
    }
}

// 에러 상태 표시
function setErrorState() {
    const cards = ['totalSalesCard', 'totalCustomersCard', 'newCustomersCard', 'totalContractsCard'];
    
    cards.forEach(cardId => {
        const card = $(cardId);
        if (card) {
            card.classList.add('error-card');
            card.classList.remove('loading-card');
        }
    });

    updateDashboardStats({
        totalSales: '연결실패',
        totalCustomers: '연결실패',
        newCustomers: '연결실패',
        totalContracts: '연결실패'
    });
}

// 연결 상태 표시
function updateConnectionStatus(isConnected, message = '') {
    const statusDiv = $('connectionStatus');
    const statusIcon = $('statusIcon');
    const statusText = $('statusText');
    
    if (statusDiv && statusIcon && statusText) {
        statusDiv.classList.remove('hidden');
        
        if (isConnected) {
            statusDiv.className = 'mb-4 p-3 rounded-lg border bg-green-50 border-green-200';
            statusIcon.className = 'w-3 h-3 rounded-full mr-2 bg-green-500';
            statusText.textContent = message || 'Google Sheets 연결됨';
            statusText.className = 'text-sm font-medium text-green-700';
        } else {
            statusDiv.className = 'mb-4 p-3 rounded-lg border bg-red-50 border-red-200';
            statusIcon.className = 'w-3 h-3 rounded-full mr-2 bg-red-500';
            statusText.textContent = message || '연결 실패 - 샘플 데이터 사용중';
            statusText.className = 'text-sm font-medium text-red-700';
        }
        
        // 5초 후 자동 숨김
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 5000);
    }
}

// 연도별 대시보드 데이터 로드
async function loadDashboardData() {
    if (isLoading) return;
    
    try {
        setLoadingState(true);
        const selectedYear = $('yearSelect')?.value || '2025';
        console.log(`${selectedYear}년 데이터 로드 중...`);

        // Google Sheets 데이터 로드 시도
        if (window.sheetsAPI) {
            try {
                // 먼저 연결 테스트
                const isConnected = await window.sheetsAPI.testConnection();
                if (!isConnected) {
                    throw new Error('Google Sheets 연결 테스트 실패');
                }

                const rawData = await window.sheetsAPI.loadCSVData('monthlySales'); 
                console.log('Google Sheets 데이터 로드 성공:', rawData.length, '건');
                
                if (!rawData || rawData.length === 0) {
                    throw new Error('데이터가 비어있습니다');
                }

                const result = processDashboardData(rawData, selectedYear);
                dashboardData = result.stats;
                detailData = result.details;
                updateDashboardStats(dashboardData);
                updateConnectionStatus(true, `Google Sheets에서 ${rawData.length}건 로드됨`);
            } catch (error) {
                console.warn('Google Sheets 로드 실패:', error.message);
                throw error;
            }
        } else {
            throw new Error('sheets-api.js가 로드되지 않음');
        }
    } catch (error) {
        console.error('데이터 로드 실패:', error.message);
        console.log('샘플 데이터로 전환');
        loadSampleDashboardData(selectedYear);
        updateConnectionStatus(false, `연결 실패: ${error.message}`);
    } finally {
        setLoadingState(false);
    }
}

// 샘플 데이터 로드
function loadSampleDashboardData(year) {
    try {
        console.log('샘플 데이터 로드 시작:', year);
        
        // 연도별 샘플 데이터
        const sampleStats = {
            '2025': { totalSales: '1.8억원', totalCustomers: '23개', newCustomers: '8개', totalContracts: '67건' },
            '2024': { totalSales: '3.2억원', totalCustomers: '47개', newCustomers: '15개', totalContracts: '156건' },
            '2023': { totalSales: '2.8억원', totalCustomers: '41개', newCustomers: '12개', totalContracts: '134건' },
            '2022': { totalSales: '2.1억원', totalCustomers: '35개', newCustomers: '9개', totalContracts: '98건' },
            '2021': { totalSales: '1.9억원', totalCustomers: '31개', newCustomers: '7개', totalContracts: '87건' },
            '2020': { totalSales: '1.5억원', totalCustomers: '28개', newCustomers: '5개', totalContracts: '72건' }
        };

        const stats = sampleStats[year] || sampleStats['2025'];
        dashboardData = stats;
        
        // 샘플 상세 데이터 (관급/사급 분류)
        detailData = {
            customers: {
                government: ['경기도 양주시', '의정부시', '서울시', '부천시'],
                private: ['광주 북구', '제주시', '포항시']
            },
            newCustomers: {
                government: ['경기도 양주시', '광주 북구'],
                private: ['제주시']
            },
            contracts: {
                government: [
                    { customer: '경기도 양주시', contract: '천보산 산림욕장 보완사업' },
                    { customer: '의정부시', contract: '의정부시 녹지조성사업' },
                    { customer: '서울시', contract: '서울시 한강공원 보행로' }
                ],
                private: [
                    { customer: '광주 북구', contract: '광주 북구 문화센터 주변 정비' },
                    { customer: '제주시', contract: '제주시 관광지 보행로 정비' }
                ]
            }
        };
        
        updateDashboardStats(dashboardData);
        console.log('샘플 데이터 로드 완료');
    } catch (error) {
        console.error('샘플 데이터 로드 실패:', error);
        setErrorState();
    }
}

// 실제 데이터 처리 (관급/사급 분류 포함)
function processDashboardData(rawData, selectedYear) {
    try {
        console.log('데이터 처리 시작:', rawData.length, '건');
        const currentYear = parseInt(selectedYear);
        
        // 현재 연도 데이터 필터링
        const currentYearData = rawData.filter(item => {
            const orderDate = parseDate(item['주문일자'] || item['날짜'] || '');
            const invoiceDate = parseDate(item['세금계산서'] || item['세금계산서발행일'] || '');
            
            return (orderDate && orderDate.getFullYear() === currentYear) ||
                   (invoiceDate && invoiceDate.getFullYear() === currentYear);
        });
        
        console.log('현재 연도 데이터:', currentYearData.length, '건');
        
        // 매출 데이터 수집
        let totalSales = 0;
        const governmentCustomers = new Set();
        const privateCustomers = new Set();
        const allCustomers = new Set();
        const governmentContracts = [];
        const privateContracts = [];
        const allContracts = new Set();
        
        currentYearData.forEach(item => {
            const customer = (item['거래처'] || item['customer'] || '').trim();
            const contract = (item['계약명'] || item['사업명'] || '').trim();
            const typeValue = item['구분'] || item['type'] || '';
            const amountValue = item['합계'] || item['금액'] || '0';
            const invoiceDate = parseDate(item['세금계산서'] || item['세금계산서발행일'] || '');
            
            // 매출액 계산 (세금계산서 발행된 것만)
            if (invoiceDate && invoiceDate.getFullYear() === currentYear && 
                (typeValue.includes('관급') || typeValue.includes('사급'))) {
                const amount = parseInt(amountValue.toString().replace(/[^\d]/g, '')) || 0;
                totalSales += amount;
            }
            
            if (customer && customer !== '거래처 없음') {
                allCustomers.add(customer);
                
                // 관급/사급 구분
                if (typeValue.includes('관급')) {
                    governmentCustomers.add(customer);
                } else if (typeValue.includes('사급')) {
                    privateCustomers.add(customer);
                }
            }
            
            if (contract && contract !== '계약명 없음') {
                if (!allContracts.has(contract)) {
                    allContracts.add(contract);
                    
                    // 관급/사급 계약 분류
                    if (typeValue.includes('관급')) {
                        governmentContracts.push({ customer, contract });
                    } else if (typeValue.includes('사급')) {
                        privateContracts.push({ customer, contract });
                    }
                }
            }
        });
        
        // 신규 고객 계산
        const allPreviousCustomers = new Set();
        const previousGovCustomers = new Set();
        const previousPrivCustomers = new Set();
        
        for (let year = 2020; year < currentYear; year++) {
            rawData.forEach(item => {
                const orderDate = parseDate(item['주문일자'] || item['날짜'] || '');
                const invoiceDate = parseDate(item['세금계산서'] || item['세금계산서발행일'] || '');
                const typeValue = item['구분'] || item['type'] || '';
                
                if ((orderDate && orderDate.getFullYear() === year) ||
                    (invoiceDate && invoiceDate.getFullYear() === year)) {
                    const customer = (item['거래처'] || item['customer'] || '').trim();
                    if (customer && customer !== '거래처 없음') {
                        allPreviousCustomers.add(customer);
                        
                        if (typeValue.includes('관급')) {
                            previousGovCustomers.add(customer);
                        } else if (typeValue.includes('사급')) {
                            previousPrivCustomers.add(customer);
                        }
                    }
                }
            });
        }

        const newCustomers = [...allCustomers].filter(customer => 
            !allPreviousCustomers.has(customer)
        );
        
        const newGovCustomers = [...governmentCustomers].filter(customer => 
            !previousGovCustomers.has(customer)
        );
        
        const newPrivCustomers = [...privateCustomers].filter(customer => 
            !previousPrivCustomers.has(customer)
        );

        const result = {
            stats: {
                totalSales: formatCurrency(totalSales),
                totalCustomers: allCustomers.size + '개',
                newCustomers: newCustomers.length + '개',
                totalContracts: allContracts.size + '건'
            },
            details: {
                customers: {
                    government: [...governmentCustomers].sort(),
                    private: [...privateCustomers].sort()
                },
                newCustomers: {
                    government: newGovCustomers.sort(),
                    private: newPrivCustomers.sort()
                },
                contracts: {
                    government: governmentContracts.sort((a, b) => a.customer.localeCompare(b.customer, 'ko-KR')),
                    private: privateContracts.sort((a, b) => a.customer.localeCompare(b.customer, 'ko-KR'))
                }
            }
        };

        console.log('데이터 처리 완료:', result.stats);
        return result;
    } catch (error) {
        console.error('데이터 처리 중 오류:', error);
        throw error;
    }
}

// 통화 포맷 함수
function formatCurrency(amount) {
    if (amount >= 100000000) {
        return (amount / 100000000).toFixed(1) + '억원';
    } else if (amount >= 10000000) {
        return Math.round(amount / 10000000) + '천만원';
    } else if (amount >= 10000) {
        return Math.round(amount / 10000) + '만원';
    } else {
        return new Intl.NumberFormat('ko-KR').format(amount) + '원';
    }
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

// 대시보드 통계 업데이트
function updateDashboardStats(stats) {
    const elements = {
        totalSales: $('totalSales'),
        totalCustomers: $('totalCustomers'),
        newCustomers: $('newCustomers'),
        totalContracts: $('totalContracts')
    };

    Object.keys(elements).forEach(key => {
        if (elements[key] && stats[key]) {
            elements[key].textContent = stats[key];
        }
    });
}

// 모달 관련 함수들
function showModal(title, sections) {
    const modalTitle = $('modalTitle');
    const modalContent = $('modalContent');
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalContent) {
        modalContent.innerHTML = '';
        
        sections.forEach(section => {
            if (section.items.length > 0) {
                // 섹션 제목
                const sectionTitle = document.createElement('div');
                sectionTitle.className = 'font-semibold text-gray-800 mb-2 mt-4 first:mt-0';
                sectionTitle.textContent = section.title;
                modalContent.appendChild(sectionTitle);
                
                // 섹션 항목들
                section.items.forEach((item, index) => {
                    const div = document.createElement('div');
                    div.className = 'detail-item pl-4';
                    div.innerHTML = `<span class="font-medium">${index + 1}.</span> ${item}`;
                    modalContent.appendChild(div);
                });
            }
        });
        
        if (modalContent.innerHTML === '') {
            modalContent.innerHTML = '<div class="text-center text-gray-500 py-4">데이터가 없습니다.</div>';
        }
    }
    
    const modal = $('detailModal');
    if (modal) modal.classList.add('active');
}

function closeModal() {
    const modal = $('detailModal');
    if (modal) modal.classList.remove('active');
}

function showCustomerDetail() {
    const sections = [
        {
            title: '관급 거래처',
            items: detailData.customers.government || []
        },
        {
            title: '사급 거래처',
            items: detailData.customers.private || []
        }
    ];
    showModal('총 고객 수 상세 내역', sections);
}

function showNewCustomerDetail() {
    const sections = [
        {
            title: '관급 신규 거래처',
            items: detailData.newCustomers.government || []
        },
        {
            title: '사급 신규 거래처',
            items: detailData.newCustomers.private || []
        }
    ];
    showModal('신규 고객 수 상세 내역', sections);
}

function showContractDetail() {
    const govContractStrings = (detailData.contracts.government || []).map(item => 
        `${item.customer} - ${item.contract}`
    );
    const privContractStrings = (detailData.contracts.private || []).map(item => 
        `${item.customer} - ${item.contract}`
    );
    
    const sections = [
        {
            title: '관급 계약',
            items: govContractStrings
        },
        {
            title: '사급 계약',
            items: privContractStrings
        }
    ];
    showModal('총 계약 건수 상세 내역', sections);
}

// 전역 함수 노출 (HTML onclick에서 사용)
window.showCustomerDetail = showCustomerDetail;
window.showNewCustomerDetail = showNewCustomerDetail;
window.showContractDetail = showContractDetail;
window.closeModal = closeModal;

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('대시보드 페이지 로드 시작');
    
    // 적용 버튼 클릭시 데이터 다시 로드
    const applyBtn = $('applyBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            console.log('적용 버튼 클릭됨');
            loadDashboardData();
        });
    }
    
    // 모달 외부 클릭시 닫기
    const modal = $('detailModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // 초기 데이터 로드
    console.log('초기 데이터 로드 시작');
    
    // 즉시 시도 (sheets-api.js가 이미 로드되어 있을 수 있음)
    if (window.sheetsAPI) {
        console.log('sheets-api.js 이미 로드됨, 데이터 로드 시작');
        loadDashboardData();
    } else {
        // sheets-api.js 로드 대기
        let retryCount = 0;
        const maxRetries = 30; // 3초로 단축
        
        function tryLoadData() {
            if (window.sheetsAPI) {
                console.log('sheets-api.js 로드 확인됨, 데이터 로드 시작');
                loadDashboardData();
            } else if (retryCount < maxRetries) {
                retryCount++;
                console.log(`sheets-api.js 로드 대기 중... (${retryCount}/${maxRetries})`);
                setTimeout(tryLoadData, 100);
            } else {
                console.warn('sheets-api.js 로드 실패, 샘플 데이터로 대체');
                const selectedYear = $('yearSelect')?.value || '2025';
                loadSampleDashboardData(selectedYear);
                updateConnectionStatus(false, 'sheets-api.js 로드 실패');
            }
        }
        
        tryLoadData();
    }
});
