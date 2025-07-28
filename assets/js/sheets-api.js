/**
 * 실제 데이터 로드 (CSV 직접 연결)
 */
async function loadSalesData() {
    try {
        console.log('CSV 데이터 로드 시작...');
        
        // 구글시트 CSV 직접 연결
        const csvUrl = 'https://docs.google.com/spreadsheets/d/13jSz0U8NYDojGnIyE5iaZhwNoirooVnKlkl_IoXSjdc/export?format=csv&gid=0';
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        
        console.log('CSV 로드 완료, 파싱 중...');
        
        // CSV 파싱
        const lines = csvText.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        const rawData = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.replace(/"/g, '').trim());
            const item = {};
            headers.forEach((header, index) => {
                item[header] = values[index] || '';
            });
            return item;
        }).filter(item => item[headers[0]] && item[headers[0]] !== '');
        
        // 데이터 변환
        salesData = rawData.map(item => ({
            date: new Date(item['주문일자'] || item.date),
            type: item['구분'] || item.type || '사급매출',
            contractName: item['계약명'] || item.contractName || '',
            customer: item['거래처'] || item.customer || '',
            amount: parseInt(item['합계'] || item.amount || 0),
            deliveryDate: item['납품기한'] ? new Date(item['납품기한']) : null,
            invoiceDate: item['세금계산서'] ? new Date(item['세금계산서']) : null
        })).filter(item => !isNaN(item.date.getTime()) && item.amount > 0);
        
        console.log(`${salesData.length}건의 데이터 로드 완료`);
        
        generateReport();
        CommonUtils.showAlert(`${salesData.length}건의 데이터를 로드했습니다.`, 'success');
        
    } catch (error) {
        co
