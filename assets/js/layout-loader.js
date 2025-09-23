document.addEventListener('DOMContentLoaded', async () => {
    const pagePath = window.location.pathname;
    const isRoot = pagePath === '/' || pagePath.endsWith('/index.html');
    const contentPath = isRoot ? '/index.html' : pagePath;

    const layoutResponse = await fetch('/_layout.html');
    if (!layoutResponse.ok) return console.error("레이아웃 파일을 불러올 수 없습니다.");
    const layoutHtml = await layoutResponse.text();

    const pageResponse = await fetch(contentPath);
    if (!pageResponse.ok) {
        document.getElementById('main-content').innerHTML = '<h2 class="text-2xl font-bold text-red-600">페이지를 찾을 수 없습니다.</h2>';
        return;
    }
    const pageHtml = await pageResponse.text();

    const parser = new DOMParser();
    const layoutDoc = parser.parseFromString(layoutHtml, 'text/html');
    const pageDoc = parser.parseFromString(pageHtml, 'text/html');

    // 실제 페이지 내용으로 교체
    layoutDoc.getElementById('main-content').innerHTML = pageDoc.body.innerHTML;

    // 페이지별 title 적용
    const pageTitle = pageDoc.querySelector('title');
    if (pageTitle) document.title = pageTitle.textContent;

    // 페이지별 CSS 적용
    pageDoc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = link.getAttribute('href');
        document.head.appendChild(newLink);
    });

    // 페이지별 JS 적용
    pageDoc.querySelectorAll('script[src]').forEach(script => {
        const newScript = document.createElement('script');
        newScript.src = script.getAttribute('src');
        if (script.defer) newScript.defer = true;
        document.body.appendChild(newScript);
    });

    // 완성된 body를 현재 문서에 적용
    document.body.innerHTML = layoutDoc.body.innerHTML;
});
