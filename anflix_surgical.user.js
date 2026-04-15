// ==UserScript==
// @name         ANFLIX Surgical Clean
// @namespace    http://anflix.com/
// @version      1.2
// @description  AdGuard Premium과 함께 사용하는 맞춤형 요소 제거 스크립트. 사용자가 Inspect한 특정 요소만 정밀 타겟팅하여 제거합니다.
// @author       ANFLIX
// @match        *://torrentq*.com/*
// @match        *://torrentqq*.com/*
// @match        *://tvwiki*.net/*
// @match        *://tvwiki*.org/*
// @match        *://tvw.la/*
// @match        *://send2video.com/*
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/angdulu/anflix-clean/main/anflix_surgical.user.js
// @downloadURL  https://raw.githubusercontent.com/angdulu/anflix-clean/main/anflix_surgical.user.js
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    /**
     * 제거하고 싶은 요소의 CSS 셀렉터를 아래 배열에 추가하세요.
     * 브라우저 개발자 도구(F12)로 요소를 찍은 뒤, 해당 요소의 id나 class를 적으면 됩니다.
     */
    const targets = [
        'a[href*="modooav"]',
        'a[href*="avgosu"]',
        'a[href*="hlbam"]',
        'a[href*="oplove"]',
        'a[href*="/ads/"]',
        'a[href*="ads.torrentqq.com"]',
        'a[href*="uuoobe.com"]',
        'a[href*="/dmca.html"]',
        'a[href*="adult-film"]',
        '.at-banner',          // 상단 배너 컨테이너
        '.row-banner',         // 배너 줄
        '.site_top',           // 배너 개별 항목
        '.ad-banner',          // 하단 배너
        '.h130',               // 특정 높이의 광고 박스
        '#banners',            // 배너 모음 박스
        '.banner-item',        // 개별 배너 아이템
        '#bannerList',         // TVWIKI 배너 리스트
        '.banner2',            // TVWIKI 배너 클래스
        '.pc3',                // TVWIKI PC 배너
        '.mobile3',            // TVWIKI 모바일 배너
        'li.pc-only',          // TVWIKI PC 전용 영역
        'li.mobile-only',      // TVWIKI 모바일 전용 영역
        'a[href*="t.me/"]',    // 텔레그램 링크
        'img[src*="/data/banner/"]', // 배너 이미지 경로
        'a[href*="/banner/"]', // 배너 링크 경로
        '.btn-torrent',        // 토렌트 다운로드 버튼
        'a[href*="/torrent/download/"]', // 토렌트 다운로드 경로
        '.btn-download',       // 다운로드 바로가기 버튼
        '.box-content.program', // 프로그램 추천 박스
        'span.adult', // '19' 성인 인증 뱃지
    ];

    const textTargets = [
        '추천프로그램',
        '광고하세요',
        '자료요청',
        '광고문의',
        '1:1문의',
        'DMCA',
    ];

    // --- 실행 로직 ---

    // 1. CSS 방식 제거
    if (targets.length > 0) {
        const style = targets
            .map(selector => `${selector} { display: none !important; visibility: hidden !important; pointer-events: none !important; }`)
            .join('\n');
        GM_addStyle(style);
    }

    // 2. 텍스트 방식 제거 (MutationObserver 활용)
    const removeByText = () => {
        textTargets.forEach(text => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            let node;
            const toRemove = [];
            while (node = walker.nextNode()) {
                if (node.textContent.includes(text)) {
                    // 가장 가까운 박스나 리스트 항목을 찾아 숨깁니다.
                    const container = node.parentElement.closest('.box, .widget, .panel, .sidebar-box, .box-header, li, tr') || node.parentElement;
                    if (container && container.style.display !== 'none') {
                        toRemove.push(container);
                    }
                }
            }
            toRemove.forEach(el => el.style.setProperty('display', 'none', 'important'));
        });
    };

    const observer = new MutationObserver(removeByText);
    if (document.body) {
        removeByText();
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        const bodyObserver = new MutationObserver(() => {
            if (document.body) {
                removeByText();
                observer.observe(document.body, { childList: true, subtree: true });
                bodyObserver.disconnect();
            }
        });
        bodyObserver.observe(document.documentElement, { childList: true });
    }

    console.log('🛡️ ANFLIX Surgical Clean Loaded. CSS:', targets.length, '| Text:', textTargets.length);
})();
