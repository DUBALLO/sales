// 공통 유틸리티 함수들

/**
 * 숫자를 한국 화폐 형식으로 포맷
 * @param {number} amount - 금액
 * @returns {string} 포맷된 금액 문자열
 */
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

/**
 * 숫자를 쉼표가 있는 형식으로 포맷
 * @param {number} number - 숫자
 * @returns {string} 포맷된 숫자 문자열
 */
function formatNumber(number) {
    if (!number && number !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(number);
}

/**
 * 날짜를 한국 형식으로 포맷
 * @param {Date|string} date - 날짜
 * @param {string} format - 포맷 타입 ('full', 'short', 'month')
 * @returns {string} 포맷된 날짜 문자열
 */
function formatDate(date, format = 'short') {
    if (!date) return '-';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    switch (format) {
        case 'full':
            return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
        case 'month':
            return `${year}년 ${parseInt(month)}월`;
        case 'short':
        default:
            return `${year}-${month}-${day}`;
    }
}

/**
 * 년월 문자열을 생성
 * @param {number} year - 년도
 * @param {number} month - 월
 * @returns {string} YYYY-MM 형식 문자열
 */
function getYearMonth(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * 로딩 스피너 표시/숨김
 * @param {HTMLElement} element - 대상 엘리먼트
 * @param {boolean} show - 표시 여부
 */
function toggleLoading(element, show) {
    if (show) {
        element.disabled = true;
        const spinner = document.createElement('span');
        spinner.className = 'loading-spinner';
        spinner.id = 'loading-spinner';
        element.prepend(spinner);
    } else {
        element.disabled = false;
        const spinner = element.querySelector('#loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

/**
 * 알림 메시지 표시
 * @param {string} message - 메시지 내용
 * @param {string} type - 알림 타입 ('info', 'success', 'warning', 'error')
 * @param {number} duration - 표시 시간 (ms, 0이면 자동 숨김 안함)
 */
function showAlert(message, type = 'info', duration = 3000) {
    // 기존 알림 제거
    const existingAlert = document.querySelector('.alert-message');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-message fade-in`;
    alert.innerHTML = `
        <span>${message}</span>
        <button type="button" class="float-right text-lg leading-none" onclick="this.parentElement.remove()">×</button>
    `;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    
    document.body.appendChild(alert);
    
    if (duration > 0) {
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, duration);
    }
}

/**
 * 모달 창 표시
 * @param {string} title - 모달 제목
 * @param {string} content - 모달 내용 (HTML)
 * @param {Object} options - 옵션 객체
 */
function showModal(title, content, options = {}) {
    const modalId = 'commonModal';
    
    // 기존 모달 제거
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: ${options.width || '600px'}">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">${title}</h3>
                <button type="button" class="text-gray-400 hover:text-gray-600" onclick="closeModal('${modalId}')">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 모달 표시 애니메이션
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    // ESC 키로 닫기
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeModal(modalId);
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // 오버레이 클릭으로 닫기
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modalId);
        }
    });
}

/**
 * 모달 창 닫기
 * @param {string} modalId - 모달 ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

/**
 * 엑셀/CSV 파일 읽기
 * @param {File} file - 파일 객체
 * @returns {Promise} 파싱된 데이터
 */
async function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                
                if (file.name.endsWith('.csv')) {
                    // CSV 파일 처리 (나중에 Papa Parse 사용)
                    const lines = data.split('\n');
                    const headers = lines[0].split(',');
                    const rows = lines.slice(1).map(line => {
                        const values = line.split(',');
                        const row = {};
                        headers.forEach((header, index) => {
                            row[header.trim()] = values[index]?.trim() || '';
                        });
                        return row;
                    });
                    resolve(rows);
                } else {
                    // Excel 파일 처리 (나중에 SheetJS 사용)
                    showAlert('Excel 파일 처리 기능은 곧 추가될 예정입니다.', 'warning');
                    reject(new Error('Excel 파일 처리 미구현'));
                }
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file, 'utf-8');
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

/**
 * 데이터를 localStorage에 저장
 * @param {string} key - 저장 키
 * @param {any} data - 저장할 데이터
 */
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Storage save error:', error);
        return false;
    }
}

/**
 * localStorage에서 데이터 로드
 * @param {string} key - 저장 키
 * @returns {any} 로드된 데이터
 */
function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Storage load error:', error);
        return null;
    }
}

/**
 * 테이블을 CSV로 내보내기
 * @param {HTMLTableElement} table - 테이블 엘리먼트
 * @param {string} filename - 파일명
 */
function exportTableToCSV(table, filename = 'data.csv') {
    const rows = Array.from(table.querySelectorAll('tr'));
    const csv = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => {
            const text = cell.textContent.trim();
            // 쉼표가 있는 경우 따옴표로 감싸기
            return text.includes(',') ? `"${text}"` : text;
        }).join(',');
    }).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

/**
 * 검색 기능 구현
 * @param {string} searchTerm - 검색어
 * @param {HTMLTableElement} table - 검색할 테이블
 * @param {Array} columns - 검색할 컬럼 인덱스 배열
 */
function searchTable(searchTerm, table, columns = []) {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const term = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        let found = false;
        
        if (columns.length === 0) {
            // 모든 컬럼에서 검색
            found = cells.some(cell => 
                cell.textContent.toLowerCase().includes(term)
            );
        } else {
            // 지정된 컬럼에서만 검색
            found = columns.some(colIndex => 
                cells[colIndex] && 
                cells[colIndex].textContent.toLowerCase().includes(term)
            );
        }
        
        row.style.display = found ? '' : 'none';
    });
}

/**
 * 테이블 정렬 기능
 * @param {HTMLTableElement} table - 정렬할 테이블
 * @param {number} columnIndex - 정렬할 컬럼 인덱스
 * @param {string} direction - 정렬 방향 ('asc', 'desc')
 */
function sortTable(table, columnIndex, direction = 'asc') {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    const sortedRows = rows.sort((a, b) => {
        const aText = a.cells[columnIndex].textContent.trim();
        const bText = b.cells[columnIndex].textContent.trim();
        
        // 숫자인지 확인
        const aNum = parseFloat(aText.replace(/[^\d.-]/g, ''));
        const bNum = parseFloat(bText.replace(/[^\d.-]/g, ''));
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return direction === 'asc' ? aNum - bNum : bNum - aNum;
        } else {
            return direction === 'asc' 
                ? aText.localeCompare(bText, 'ko-KR')
                : bText.localeCompare(aText, 'ko-KR');
        }
    });
    
    // 정렬된 행들을 다시 추가
    sortedRows.forEach(row => tbody.appendChild(row));
}

/**
 * 페이지 로드시 실행되는 공통 초기화 함수
 */
document.addEventListener('DOMContentLoaded', function() {
    // 현재 페이지에 따른 네비게이션 활성화
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') && currentPath.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });
    
    // 파일 드래그 앤 드롭 기능 활성화
    const dropZones = document.querySelectorAll('[data-drop-zone]');
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('border-blue-400', 'bg-blue-50');
        });
        
        zone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            zone.classList.remove('border-blue-400', 'bg-blue-50');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('border-blue-400', 'bg-blue-50');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                const fileInput = zone.querySelector('input[type="file"]');
                if (fileInput) {
                    fileInput.files = e.dataTransfer.files;
                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    });
});

// 전역 에러 핸들링
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showAlert('오류가 발생했습니다. 새로고침 후 다시 시도해주세요.', 'error');
});

// 전역 객체로 내보내기
window.CommonUtils = {
    formatCurrency,
    formatNumber,
    formatDate,
    getYearMonth,
    toggleLoading,
    showAlert,
    showModal,
    closeModal,
    readFile,
    saveToStorage,
    loadFromStorage,
    exportTableToCSV,
    searchTable,
    sortTable
};
