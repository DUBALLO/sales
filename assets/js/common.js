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
    const existingAlert = document.querySelector('.alert-message');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-message`; // fade-in은 CSS에서 처리
    alert.innerHTML = `
        <span>${message}</span>
        <button type="button" class="float-right text-lg leading-none" onclick="this.parentElement.remove()">×</button>
    `;
    
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
                <button type="button" class="text-gray-400 hover:text-gray-600" onclick="CommonUtils.closeModal('${modalId}')">
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
    
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeModal(modalId);
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    
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
function closeModal(modalId = 'commonModal') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
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
    exportTableToCSV
};
