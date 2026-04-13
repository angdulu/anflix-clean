// ==UserScript==
// @name         torrentqq Clean Mode 
// @namespace    http://anflix.com/
// @version      1.5
// @description  오물만 정확하게 골라내고 본래의 영화 탐색 기능을 최적화합니다.
// @author       ANFLIX Core
// @match        *://torrentq*.com/*
// @match        *://torrentqq*.com/*
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';
    const hostname = window.location.hostname;
    // 국내 토렌트 사이트 판단 (정밀)
    if (!hostname.includes('torrent') && !hostname.includes('qq') && !document.title.includes('토렌트')) return;
    console.log("🛡️ ANFLIX Safe Skin V2.0 Loaded.");
    // 1. 최소한의 안전한 스타일 (광고만 숨김)
    const css = `
        /* 19 뱃지 및 특정 광고 연결 링크 원천 차단 */
        [href*="/ads/"], [href*="modooav"], [href*="avgosu"], [href*="casino"], [style*="viagra"],
        [href*="adult"], [href*="sex"], [href*="pfizer"], [href*="op"], [href*="sexy"] {
            display: none !important;
            visibility: hidden !important;
        }
        
        /* 19 동그라미 아이콘 제거 (CSS로 가능한 것만) */
        .fa-19, .badge-19 { display: none !important; }
    `;
    GM_addStyle(css);
    const laserCleanup = () => {
        // 1. Precise Menu/List Cleanup
        const dangerousKeywords = ['성인', '유흥', '오피', '비아그라', '카지노', '신규가입', '바카라'];
        const sensitiveRegex = /\bav\b|\[av\]/i; // 'av'는 독립적인 단어로 존재할 때만 (Avengers 등 방지)

        document.querySelectorAll('li, tr').forEach(el => {
            const text = el.innerText.trim().toLowerCase();
            const hasBadKeyword = dangerousKeywords.some(kw => text.includes(kw));
            const hasAV = sensitiveRegex.test(text);

            if (hasBadKeyword || hasAV || text.includes('19금')) {
                el.style.display = 'none';
            }
        });

        // 2. Specialized UI Transformation (Download Buttons)
        document.querySelectorAll('a, button, span').forEach(el => {
            const text = el.innerText.trim();

            // Magnet -> Instant Play
            if (text.includes('마그넷 링크')) {
                el.innerText = '🚀 즉시 감상';
                el.style.cssText = 'background-color: #e50914 !important; color: white !important; font-weight: bold !important; border: none !important; padding: 10px 20px !important; border-radius: 5px !important; box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4) !important;';
            }

            // Torrent File -> Save File
            if (text === '토렌트 파일') {
                el.innerText = '💾 파일 저장';
                el.style.cssText = 'background-color: #333 !important; color: #aaa !important; border: 1px solid #444 !important; padding: 10px 15px !important; border-radius: 5px !important; transition: 0.2s;';
            }

            // Hide confusing "Go to Download" button
            if (text.includes('다운로드로 바로가기')) {
                el.style.display = 'none';
                const parentBox = el.closest('div[style*="background-color"]');
                if (parentBox) parentBox.style.display = 'none';
            }
        });

        // 3. Target Specific Small AD Boxes
        document.querySelectorAll('div, span, p').forEach(el => {
            if (el.children.length > 5 || el.innerText.length > 300) return;
            const text = el.innerText.trim();
            if (text.includes('광고하세요') || text.includes('놓치지 마세요')) {
                const box = el.closest('[style*="border"], .sidebar-box, .widget');
                if (box) box.style.display = 'none';
                else el.style.display = 'none';
            }
        });
    };
    // 2. DOM 변화 감시 (클릭하거나 페이지 이동 시 즉각 반응)
    const observer = new MutationObserver(laserCleanup);

    // 페이지 로딩 시점이 시작(start)이므로 body가 생길 때까지 대기하거나 즉시 실행
    const startObserver = () => {
        if (document.body) {
            laserCleanup();
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            setTimeout(startObserver, 50);
        }
    };
    startObserver();

    // 로딩 즉시 및 반복 실행
    laserCleanup();
    setInterval(laserCleanup, 300);
})();