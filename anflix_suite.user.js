// ==UserScript==
// @name         ANFLIX All-in-One Clean Mode
// @namespace    http://anflix.com/
// @version      3.9
// @description  국내 토렌트 및 미디어 사이트(TorrentQQ, TVWIKI, Send2Video 등)의 광고를 제거하고 최적화합니다.
// @author       ANFLIX Core
// @match        *://torrentq*.com/*
// @match        *://torrentqq*.com/*
// @match        *://tvwiki*.net/*
// @match        *://tvwiki*.org/*
// @match        *://tvw.la/*
// @match        *://send2video.com/*
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/angdulu/anflix-clean/main/anflix_suite.user.js
// @downloadURL  https://raw.githubusercontent.com/angdulu/anflix-clean/main/anflix_suite.user.js
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';
    const hostname = window.location.hostname;
    const isTorrent = hostname.includes('torrent') || hostname.includes('qq') || document.title.includes('토렌트');
    const isTVWiki = hostname.includes('tvwiki') || hostname.includes('tvw.la');
    const isSend2Video = hostname.includes('send2video');

    if (!isTorrent && !isTVWiki && !isSend2Video) return;

    console.log(`🛡️ ANFLIX Safe Skin V3.8 Loaded (${isTorrent ? 'TORRENT' : isTVWiki ? 'TVWIKI' : 'SEND2VIDEO'})`);

    // --- [1. 공통 보안/차단 스타일] ---
    const commonCSS = `
        [href*="/ads/"], [href*="/banner/"], [href*="modooav"], [href*="avgosu"], [href*="casino"], [style*="viagra"],
        [href*="adult"], [href*="sex"], [href*="pfizer"], [href*="op-"], [href*="sexy"],
        .fa-19, .badge-19 {
            display: none !important;
            visibility: hidden !important;
        }
    `;
    GM_addStyle(commonCSS);

    // 1. 확실한 광고성 키워드
    const strongKeywords = ['유흥', '룸살롱', '안마', '휴게텔', '비아그라', '바카라', '신규가입', '야동', '추천프로그램', '배너문의', '광고문의', '플레이어', 'kmplayer'];

    // 2. 위험한 키워드 (일반 제목과 겹칠 수 있음 -> 정규식으로 정밀 검사)
    const riskyRegex = [
        /(^|[^가-힣])토토(?![가-힣])/,
        /(^|[^가-힣])오피(?![가-힣])/,
        /(^|[^가-힣])카지노(?![가-힣])/,
        /(^|[^가-힣])슬롯(?![가-힣])/,
        /\bav\b|\[av\]/i
    ];

    const contentRatingRegex = [/성인/, /19금/];

    // --- [최적화: 디바운스 함수] ---
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const cleanup = () => {
        // --- [A. 정밀 키워드 필터링] ---
        // 쿼리 범위를 좁히거나 탐색 최적화
        const targetElements = document.querySelectorAll('li, tr, div[class*="banner"], div[class*="ad"], .notice, a[href*="/banner/"]');

        targetElements.forEach(el => {
            if (el.matches('.pagination, .page, .pg, [class*="paging"], [class*="page"]')) return;

            // innerText 대신 textContent를 사용하여 레이아웃 계산(Reflow) 방지 (속도 향상)
            const text = (el.textContent || "").trim().toLowerCase();
            if (!text || text.length > 500) return;

            const isStrongMatch = strongKeywords.some(kw => text.includes(kw));
            const isRiskyMatch = riskyRegex.some(rx => rx.test(text));
            const isRatingMatch = contentRatingRegex.some(rx => rx.test(text));

            if (isStrongMatch || isRiskyMatch || isRatingMatch) {
                if (el.matches('.pagination, .page, .pg, [class*="paging"], #paging, [id*="paging"]')) return;
                if (el.closest('.pagination, .page, .pg, [class*="paging"], #paging')) return;

                const isMainList = el.closest('li, tr');
                const isAdArea = el.closest('.banner_area, .notice, [class*="banner"], .sidebar-box, .widget, .panel');

                if (isStrongMatch) {
                    if (isMainList) isMainList.style.display = 'none';
                    else if (isAdArea) isAdArea.style.display = 'none';
                    else el.style.display = 'none';
                    return;
                }

                if (isRatingMatch) {
                    if (isAdArea) isAdArea.style.display = 'none';
                    return;
                }

                if (isRiskyMatch) {
                    const container = isMainList || isAdArea;
                    if (container) {
                        if (container.textContent.length < 2000) container.style.display = 'none';
                        else el.style.display = 'none';
                    } else {
                        el.style.display = 'none';
                    }
                }
            }
        });

        // 추가적인 파편 제거
        document.querySelectorAll('span, b, a').forEach(el => {
            if (el.children.length > 0) return;
            const text = (el.textContent || "").trim();
            if (strongKeywords.some(kw => text.includes(kw))) {
                const box = el.closest('div, li, tr');
                if (box && (box.textContent || "").length < 300) {
                    box.style.display = 'none';
                }
            }
        });

        // --- [B. 사이트별 특화 로직] ---
        if (isTorrent) {
            document.querySelectorAll('.sidebar-box, .widget, .panel, aside').forEach(box => {
                const innerText = box.textContent || "";
                if (innerText.includes('추천프로그램') || innerText.includes('광고문의') || innerText.includes('배너문의')) {
                    if (innerText.length < 1000) box.style.display = 'none';
                }
            });

            document.querySelectorAll('a, button, span').forEach(el => {
                const text = (el.textContent || "").trim();
                const href = el.href || "";

                if (text.includes('마그넷 링크') || text.includes('즉시 감상')) {
                    el.innerText = '📲 앱에서 열기';
                    el.style.cssText = 'background-color: #e50914 !important; color: white !important; font-weight: bold !important; border: none !important; padding: 10px 20px !important; border-radius: 5px !important; box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4) !important;';
                }

                if (text.includes('토렌트 파일') || text.includes('다운로드 링크')) {
                    el.style.display = 'none';
                }

                if (href.includes('qbittorrent') || href.includes('vuze') || href.includes('gomlab') || href.includes('potplayer') || href.includes('kmplayer') || href.includes('utorrent')) {
                    const box = el.closest('.sidebar-box, .widget, .panel, li, div');
                    if (box && (box.textContent || "").length < 1000) box.style.display = 'none';
                    else el.style.display = 'none';
                }

                if (text.includes('다운로드로 바로가기') || text.includes('광고하세요') || text.includes('놓치지 마세요')) {
                    const box = el.closest('div[style*="background-color"], [style*="border"], .sidebar-box, .widget, .panel');
                    if (box) box.style.display = 'none';
                    else el.style.display = 'none';
                }
            });
        }

        if (isTVWiki) {
            const tvwikiSelectors = [
                '#bannerList', '.banner2', '.banner_list', '.banner_box', '.banner_area',
                '.notice', '.ad-unit', '.view-ad', '.top-banner', '.side-banner',
                '[class*="banner-"]', '[id*="banner_"]', 'a[href*="t.me/"]',
                '.p-3.mb-2.bg-light.text-dark'
            ];
            document.querySelectorAll(tvwikiSelectors.join(',')).forEach(el => {
                if (el.querySelector('video') || el.id === 'player_box') return;
                el.style.cssText = 'display:none !important;';
            });

            document.querySelectorAll('img, a').forEach(el => {
                const source = (el.tagName === 'IMG' ? el.src : el.href) || "";
                if (source.includes('/data/banner/') || source.includes('/banner/') || source.includes('casino') || source.includes('betting') || source.includes('slot')) {
                    const adContainer = el.closest('.banner_area, .sidebar_banner, [class*="banner"], .banner-box');
                    if (adContainer) adContainer.style.display = 'none';
                    else el.style.display = 'none';
                }
            });
        }
    };

    // --- [3. 실행 및 감시 (최적화)] ---
    const debouncedCleanup = debounce(cleanup, 150);
    const observer = new MutationObserver(() => debouncedCleanup());

    const start = () => {
        if (document.body) {
            cleanup();
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            // body가 로드될 때까지 대기 (MutationObserver 사용)
            const bodyObserver = new MutationObserver(() => {
                if (document.body) {
                    cleanup();
                    observer.observe(document.body, { childList: true, subtree: true });
                    bodyObserver.disconnect();
                }
            });
            bodyObserver.observe(document.documentElement, { childList: true });
        }
    };
    start();
})();
