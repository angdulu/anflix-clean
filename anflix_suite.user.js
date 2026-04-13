// ==UserScript==
// @name         ANFLIX All-in-One Clean Mode
// @namespace    http://anflix.com/
// @version      3.6
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

    console.log(`🛡️ ANFLIX Safe Skin V3.6 Loaded (${isTorrent ? 'TORRENT' : isTVWiki ? 'TVWIKI' : 'SEND2VIDEO'})`);

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
    const strongKeywords = ['유흥', '룸살롱', '안마', '휴게텔', '비아그라', '바카라', '신규가입', '섹스', '야동', '추천프로그램', '배너문의', '광고문의', '플레이어', 'kmplayer'];
    
    // 2. 위험한 키워드 (일반 제목과 겹칠 수 있음 -> 정규식으로 정밀 검사)
    const riskyRegex = [
        /(^|[^가-힣])토토(?![가-힣])/,
        /(^|[^가-힣])오피(?![가-힣])/,
        /(^|[^가-힣])카지노(?![가-힣])/,
        /(^|[^가-힣])슬롯(?![가-힣])/,
        /\bav\b|\[av\]/i
    ];

    const contentRatingRegex = [/성인/, /19금/];

    const cleanup = () => {
        // --- [A. 정밀 키워드 필터링] ---
        const targetElements = document.querySelectorAll('li, tr, div[class*="banner"], div[class*="ad"], .notice, a[href*="/banner/"]');
        
        targetElements.forEach(el => {
            // 보호해야 할 핵심 구역 (페이지 네비게이션 등) 체크
            if (el.matches('.pagination, .page, .pg, [class*="paging"], [class*="page"]')) return;

            const text = el.innerText.trim().toLowerCase();
            if (!text || text.length > 500) return; // 너무 긴 텍스트는 리스트가 아닐 확률이 높으므로 제외

            const isStrongMatch = strongKeywords.some(kw => text.includes(kw));
            const isRiskyMatch = riskyRegex.some(rx => rx.test(text));
            const isRatingMatch = contentRatingRegex.some(rx => rx.test(text));

            if (isStrongMatch || isRiskyMatch || isRatingMatch) {
                // 부모 컨테이너를 찾아 숨김
                if (el.matches('.pagination, .page, .pg, [class*="paging"], #paging, [id*="paging"]')) return;
                if (el.closest('.pagination, .page, .pg, [class*="paging"], #paging')) return;

                const isMainList = el.closest('li, tr');
                const isAdArea = el.closest('.banner_area, .notice, [class*="banner"], .sidebar-box, .widget, .panel');

                // 1. 확실한 광고 단어면 어디든 차단
                if (isStrongMatch) {
                    if (isMainList) isMainList.style.display = 'none';
                    else if (isAdArea) isAdArea.style.display = 'none';
                    else el.style.display = 'none';
                    return;
                }

                // 2. 등급 관련 단어(성인, 19금)는 광고 영역에서만 차단
                if (isRatingMatch) {
                    if (isAdArea) isAdArea.style.display = 'none';
                    return; // 리스트에서는 살려둠
                }

                // 3. 위험 단어도 상자 크기 봐가면서 차단
                if (isRiskyMatch) {
                    const container = isMainList || isAdArea;
                    if (container) {
                        if (container.innerText.length < 2000) container.style.display = 'none';
                        else el.style.display = 'none';
                    } else {
                        el.style.display = 'none';
                    }
                }
            }
        });

        // 추가적인 파편 제거 (작은 span이나 div 중 광고 문구가 있는 경우)
        document.querySelectorAll('span, b, a').forEach(el => {
            if (el.children.length > 0) return;
            const text = el.innerText.trim();
            if (strongKeywords.some(kw => text.includes(kw))) {
                const box = el.closest('div, li, tr');
                if (box && box.innerText.length < 300) {
                    box.style.display = 'none';
                }
            }
        });

        // --- [B. 사이트별 특화 로직] ---

        if (isTorrent) {
            // TorrentQQ 특화: 사이드바 위젯 통째로 제거 (추천프로그램 등)
            document.querySelectorAll('.sidebar-box, .widget, .panel, aside').forEach(box => {
                const inner = box.innerText;
                if (inner.includes('추천프로그램') || inner.includes('광고문의') || inner.includes('배너문의')) {
                    if (inner.length < 1000) box.style.display = 'none';
                }
            });

            // 버튼 및 링크 처리
            document.querySelectorAll('a, button, span').forEach(el => {
                const text = el.innerText.trim();
                const href = el.href || "";
                
                // 마그넷 링크 처리
                if (text.includes('마그넷 링크') || text.includes('즉시 감상')) {
                    el.innerText = '📲 앱에서 열기';
                    el.style.cssText = 'background-color: #e50914 !important; color: white !important; font-weight: bold !important; border: none !important; padding: 10px 20px !important; border-radius: 5px !important; box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4) !important;';
                }
                
                // 토렌트 파일 / 다운로드 링크 처리
                if (text.includes('토렌트 파일') || text.includes('다운로드 링크')) {
                    el.innerText = '📥 토렌트';
                    el.style.cssText = 'background-color: #333 !important; color: #eee !important; border: 1px solid #444 !important; padding: 10px 15px !important; border-radius: 5px !important; transition: 0.2s;';
                }

                // 프로그램 링크 직접 차단 (qbittorrent, vuze, utorrent 등)
                if (href.includes('qbittorrent') || href.includes('vuze') || href.includes('gomlab') || href.includes('potplayer') || href.includes('kmplayer') || href.includes('utorrent')) {
                    const box = el.closest('.sidebar-box, .widget, .panel, li, div');
                    if (box && box.innerText.length < 1000) box.style.display = 'none';
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
            // TVWiki 특화: 배너 리스트 차단
            document.querySelectorAll('#bannerList, .banner2, .banner_list, .banner_box, .notice, .ad-unit, a[href*="t.me/tvwiki"]').forEach(el => {
                el.style.display = 'none';
            });
            
            // 이미지/링크 정밀 분석
            document.querySelectorAll('img, a').forEach(el => {
                const source = (el.tagName === 'IMG' ? el.src : el.href) || "";
                if (source.includes('/data/banner/') || dangerousKeywords.some(kw => source.toLowerCase().includes(kw))) {
                    const adContainer = el.closest('.banner_area, .sidebar_banner, [class*="banner"]');
                    if (adContainer) adContainer.style.display = 'none';
                    else el.style.display = 'none';
                }
            });
        }
    };

    // --- [3. 실행 및 감시] ---
    const observer = new MutationObserver(cleanup);
    const start = () => {
        if (document.body) {
            cleanup();
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            setTimeout(start, 50);
        }
    };
    start();
    setInterval(cleanup, 1000);
})();
