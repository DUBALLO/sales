// 공통 유틸리티 함수들

function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

function formatNumber(number) {
    if (!number && number !== 0) return '-';
    return new Intl.NumberFormat('ko-KR').format(number);
}

function formatDate(date, format = 'short') {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    switch (format) {
        case 'full': return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
        case 'month': return `${year}년 ${parseInt(month)}월`;
        case 'short': default: return `${year}-${month}-${day}`;
    }
}

function getYearMonth(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
}

function toggleLoading(element, show) {
    if(!element) return;
    if (show) {
        element.disabled = true;
        const originalText = element.innerHTML;
        element.dataset.originalText = originalText;
        element.innerHTML = `<div class="loading-spinner mr-2"></div> 처리 중...`;
    } else {
        element.disabled = false;
        if(element.dataset.originalText) {
            element.innerHTML = element.dataset.originalText;
        }
    }
}

function showAlert(message, type = 'info', duration = 3000) {
    const existingAlert = document.querySelector('.alert-message');
    if (existingAlert) existingAlert.remove();
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-message`;
    alert.innerHTML = `<span>${message}</span><button type="button" class="float-right text-lg leading-none" onclick="this.parentElement.remove()">×</button>`;
    document.body.appendChild(alert);
    if (duration > 0) {
        setTimeout(() => { if (alert.parentElement) alert.remove(); }, duration);
    }
}

function showModal(title, content, options = {}) {
    const modalId = 'commonModal';
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: ${options.width || '600px'}">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">${title}</h3>
                <button type="button" class="text-gray-400 hover:text-gray-600" onclick="CommonUtils.closeModal('${modalId}')"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
            </div>
            <div class="modal-body">${content}</div>
        </div>`;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            closeModal(modalId);
            document.removeEventListener('keydown', handleKeyDown);
        }
    };
    document.addEventListener('keydown', handleKeyDown);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modalId);
    });
}

function closeModal(modalId = 'commonModal') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => { modal.remove(); }, 300);
    }
}

function exportTableToCSV(table, filename = 'data.csv') {
    if (!table) {
        showAlert('내보낼 데이터 테이블이 없습니다.', 'warning');
        return;
    }
    const rows = Array.from(table.querySelectorAll('tr'));
    const csv = rows.map(row => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map(cell => {
            let text = cell.textContent.trim();
            // 쉼표나 따옴표가 포함된 경우 큰따옴표로 묶음
            if (text.includes(',') || text.includes('"')) {
                text = `"${text.replace(/"/g, '""')}"`;
            }
            return text;
        }).join(',');
    }).join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

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
