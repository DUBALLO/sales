// 페이지 로드 시 공통 레이아웃을 적용하고, 현재 페이지의 콘텐츠를 주입합니다.
document.addEventListener('DOMContentLoaded', async () => {
    // 현재 페이지 경로를 확인합니다. (e.g., '/index.html', '/pages/monthly-sales.html')
    const pagePath = window.location.pathname;

    // 뼈대가 되는 _layout.html 파일을 불러옵니다.
    // fetch 경로는 항상 프로젝트 최상위 폴더 기준입니다.
    const layoutResponse = await fetch('/_layout.html');
    if (!layoutResponse.ok) {
        console.error("레이아웃 파일을 불러올 수 없습니다.");
        return;
    }
    const layoutHtml = await layoutResponse.text();

    // 현재 페이지의 실제 내용 (e.g., index.html 또는 monthly-sales.html)을 불러옵니다.
    const pageResponse = await fetch(pagePath);
    if (!pageResponse.ok) {
        console.error("페이지 콘텐츠를 불러올 수 없습니다.");
        document.getElementById('main-content').innerHTML = '<h2 class="text-2xl font-bold text-red-600">페이지를 찾을 수 없습니다.</h2><p>경로를 확인해주세요.</p>';
        return;
    }
    const pageHtml = await pageResponse.text();

    // 불러온 HTML 텍스트를 실제 HTML 요소로 변환합니다.
    const parser = new DOMParser();
    const layoutDoc = parser.parseFromString(layoutHtml, 'text/html');
    const pageDoc = parser.parseFromString(pageHtml, 'text/html');

    // _layout.html의 #main-content 영역을 실제 페이지의 내용으로 교체합니다.
    const mainContent = layoutDoc.getElementById('main-content');
    const newContent = pageDoc.querySelector('body').innerHTML;
    mainContent.innerHTML = newContent;

    // 페이지별 <title>과 <script>를 <head>에 추가합니다.
    const pageTitle = pageDoc.querySelector('title');
    if (pageTitle) {
        document.head.querySelector('title').textContent = pageTitle.textContent;
    }
    
    const pageScripts = pageDoc.querySelectorAll('script[src]');
    pageScripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.src = script.src;
        if (script.defer) newScript.defer = true;
        document.body.appendChild(newScript);
    });

    // 완성된 페이지를 현재 문서에 적용합니다.
    document.body.innerHTML = layoutDoc.body.innerHTML;
});
