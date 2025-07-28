// Google Sheets API 연결 모듈
// assets/js/sheets-api.js

/**
 * Google Apps Script 웹앱 URL 설정
 * 웹앱 배포 후 여기에 URL을 입력하세요
 */
const SHEETS_API_CONFIG = {
  // 판매실적 시트 웹앱 URL
  SALES_API_URL: 'https://script.google.com/macros/s/AKfycbyfSoozPOHD0olS27OvBXMqUiSS9if1Tdw5BMCVOy144wIuoVFprDjlRaJ9e0f1kdI1/exec',
  
  // 조달데이터 시트 웹앱 URL  
  PROCUREMENT_API_URL: 'https://script.google.com/macros/s/AKfycbzwmZLHlHWTBrlhObsXEW9JE-SDj3EEwFv1k28N5FGe_oMvVBj7am1FawkRWl7-lp28Rw/exec'
};

/**
 * API 호출 공통 함수
 */
async function callSheetsAPI(url, params = {}) {
  try {
    // URL 파라미터 생성
    const urlParams = new URLSearchParams(params);
    const fullUrl = `${url}?${urlParams.toString()}`;
    
    console.log('API 호출:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'API 호출 실패');
    }
    
    return data;
    
  } catch (error) {
    console.error('API 호출 오류:', error);
    throw error;
  }
}

/**
 * 판매실적 데이터 가져오기
 */
async function getSalesData(startDate = null, endDate = null) {
  const params = {
    action: 'getSalesData'
  };
  
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  
  return await callSheetsAPI(SHEETS_API_CONFIG.SALES_API_URL, params);
}

/**
 * 월별 집계 데이터 가져오기
 */
async function getMonthlySalesData() {
  const params = {
    action: 'getMonthlyData'
  };
  
  return await callSheetsAPI(SHEETS_API_CONFIG.SALES_API_URL, params);
}

/**
 * 조달데이터 가져오기
 */
async function getProcurementData(year = '2020') {
  const params = {
    action: 'getProcurementData',
    year: year
  };
  
  return await callSheetsAPI(SHEETS_API_CONFIG.PROCUREMENT_API_URL, params);
}

/**
 * 고객별 매출 분석 데이터
 */
async function getCustomerAnalysis(year = '2020') {
  const params = {
    action: 'getCustomerAnalysis',
    year: year
  };
  
  return await callSheetsAPI(SHEETS_API_CONFIG.PROCUREMENT_API_URL, params);
}

/**
 * 지역별 매출 분석 데이터
 */
async function getRegionAnalysis(year = '2020') {
  const params = {
    action: 'getRegionAnalysis', 
    year: year
  };
  
  return await callSheetsAPI(SHEETS_API_CONFIG.PROCUREMENT_API_URL, params);
}

/**
 * 수요기관별 분석 데이터
 */
async function getAgencyAnalysis(year = '2020') {
  const params = {
    action: 'getAgencyAnalysis',
    year: year
  };
  
  return await callSheetsAPI(SHEETS_API_CONFIG.PROCUREMENT_API_URL, params);
}

/**
 * 로딩 상태 관리
 */
function setLoadingState(elementId, loading) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  if (loading) {
    element.innerHTML = '<div class="loading-spinner"></div> 데이터를 불러오는 중...';
    element.style.color = '#6b7280';
  } else {
    element.style.color = '';
  }
}

/**
 * 에러 처리
 */
function handleAPIError(error, elementId = null) {
  console.error('API 에러:', error);
  
  let message = '데이터를 불러오는 중 오류가 발생했습니다.';
  
  if (error.message.includes('Failed to fetch')) {
    message = '네트워크 연결을 확인해주세요.';
  } else if (error.message.includes('YOUR_') && error.message.includes('_URL_HERE')) {
    message = 'Google Apps Script 웹앱 URL을 설정해주세요.';
  }
  
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `<span style="color: #dc2626;">❌ ${message}</span>`;
    }
  }
  
  CommonUtils.showAlert(message, 'error');
  return null;
}

/**
 * API URL 설정 확인
 */
function checkAPIConfiguration() {
  const salesConfigured = !SHEETS_API_CONFIG.SALES_API_URL.includes('YOUR_');
  const procurementConfigured = !SHEETS_API_CONFIG.PROCUREMENT_API_URL.includes('YOUR_');
  
  if (!salesConfigured || !procurementConfigured) {
    const missingAPIs = [];
    if (!salesConfigured) missingAPIs.push('판매실적 API');
    if (!procurementConfigured) missingAPIs.push('조달데이터 API');
    
    CommonUtils.showAlert(
      `다음 API URL을 설정해주세요: ${missingAPIs.join(', ')}\n` +
      'assets/js/sheets-api.js 파일의 SHEETS_API_CONFIG를 확인하세요.',
      'warning',
      0 // 자동으로 사라지지 않음
    );
    
    return false;
  }
  
  return true;
}

/**
 * 테스트 함수
 */
async function testAPIs() {
  console.log('API 연결 테스트 시작...');
  
  try {
    // 판매실적 API 테스트
    console.log('판매실적 API 테스트...');
    const salesData = await getSalesData();
    console.log('판매실적 데이터:', salesData);
    
    // 조달데이터 API 테스트
    console.log('조달데이터 API 테스트...');
    const procurementData = await getProcurementData('2020');
    console.log('조달데이터:', procurementData);
    
    console.log('✅ 모든 API 연결 성공!');
    CommonUtils.showAlert('API 연결 테스트 성공!', 'success');
    
  } catch (error) {
    console.error('❌ API 연결 테스트 실패:', error);
    handleAPIError(error);
  }
}

// 전역 객체로 내보내기
window.SheetsAPI = {
  getSalesData,
  getMonthlySalesData,
  getProcurementData,
  getCustomerAnalysis,
  getRegionAnalysis,
  getAgencyAnalysis,
  setLoadingState,
  handleAPIError,
  checkAPIConfiguration,
  testAPIs
};

// 페이지 로드시 설정 확인
document.addEventListener('DOMContentLoaded', function() {
  // 개발 모드에서만 설정 확인 메시지 표시
  if (window.location.hostname === 'localhost' || window.location.hostname.includes('github.io')) {
    setTimeout(() => {
      checkAPIConfiguration();
    }, 1000);
  }
});
