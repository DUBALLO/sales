// strategic-customer-analysis.js

document.addEventListener('DOMContentLoaded', async () => {
    showLoadingState(true);
    try {
        // 조달청 데이터만 사용합니다.
        const rawData = await window.sheetsAPI.loadCSVData('procurement');
        const allData = parseData(rawData);

        // 두 가지 핵심 분석을 동시에 실행합니다.
        await Promise.all([
            analyzeAndRenderProjects(allData),
            analyzeAndRenderOpportunities(allData)
        ]);

    } catch (error) {
        console.error("페이지 초기화 실패:", error);
        CommonUtils.showAlert("데이터 분석 중 오류가 발생했습니다.", 'error');
    } finally {
        showLoadingState(false);
    }
});

/**
 * 원본 데이터를 분석에 용이한 형태로 파싱합니다.
 */
function parseData(rawData) {
    return rawData.map(item => ({
        agency: (item['수요기관명'] || '').trim(),
        supplier: (item['업체'] || '').trim(),
        product: (item['세부품명'] || '').trim(),
        contractName: (item['계약명'] || '').trim(),
        amount: parseInt(String(item['공급금액']).replace(/[^\d]/g, '') || '0', 10),
        date: item['기준일자'] ? new Date(item['기준일자']) : null,
    })).filter(d => d.agency && d.supplier && d.amount > 0 && d.date && !isNaN(d.date));
