// ==UserScript==
// @name         ANFLIX All-in-One Clean Mode
// @namespace    http://anflix.com/
// @version      2.4
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

    console.log(`🛡️ ANFLIX Safe Skin V2.4 Loaded (${isTorrent ? 'TORRENT' : isTVWiki ? 'TVWIKI' : 'SEND2VIDEO'})`);

    // --- [1. 공통 보안/차단 스타일] ---
    const commonCSS = `
        [href*="/ads/"], [href*="/banner/"], [href*="modooav"], [href*="avgosu"], [href*="casino"], [style*="viagra"],
        [href*="adult"], [href*="sex"], [href*="pfizer"], [href*="op"], [href*="sexy"],
        .fa-19, .badge-19 {
            display: none !important;
            visibility: hidden !important;
        }
    `;
    GM_addStyle(commonCSS);

    // 1. 확실한 광고성 키워드 (제목에 들어갈 일이 거의 없음)
    const strongKeywords = ['유흥', '룸살롱', '안마', '휴게텔', '비아그라', '바카라', '신규가입', '섹스', '야동'];
    
    // 2. 위험한 키워드 (일반 제목과 겹칠 수 있음 -> 정규식으로 정밀 검사)
    // 오피(오피스 방지), 토토(토토로 방지), 카지노(드라마 방지), 슬롯, 성인
    const riskyRegex = [
        /\b토토\b|\[토토\]|^토토$/,
        /\b오피\b|\[오피\]|^오피$/,
        /\b카지노\b|\[카지노\]|^카지노$/,
        /\b슬롯\b|\[슬롯\]|^슬롯$/,
        /\b성인\b|\[성인\]|^성인$/,
        /\bav\b|\[av\]/i,
        /19금/
    ];

    const cleanup = () => {
        // --- [A. 정밀 키워드 필터링] ---
        document.querySelectorAll('li, tr, div, a, span').forEach(el => {
            // 너무 큰 컨테이너는 개별 요소들이 처리되도록 건너뜀
            if (el.children.length > 5 && !el.classList.contains('banner_area') && !el.classList.contains('notice')) return;

            const text = el.innerText.trim().toLowerCase();
            if (!text) return;

            const isStrongMatch = strongKeywords.some(kw => text.includes(kw));
            const isRiskyMatch = riskyRegex.some(rx => rx.test(text));

            if (isStrongMatch || isRiskyMatch) {
                // 부모 컨테이너(행 또는 광고박스)를 찾아 숨김
                const container = el.closest('li, tr, .banner_area, .notice, [class*="banner"], .sidebar-box');
                if (container) {
                    container.style.display = 'none';
                } else {
                    el.style.display = 'none';
                }
            }
        });

        // --- [B. 사이트별 특화 로직] ---

        if (isTorrent) {
            // TorrentQQ 특화: 버튼 변환
            document.querySelectorAll('a, button, span').forEach(el => {
                const text = el.innerText.trim();
                if (text.includes('마그넷 링크')) {
                    el.innerText = '🚀 즉시 감상';
                    el.style.cssText = 'background-color: #e50914 !important; color: white !important; font-weight: bold !important; border: none !important; padding: 10px 20px !important; border-radius: 5px !important; box-shadow: 0 4px 12px rgba(229, 9, 20, 0.4) !important;';
                }
                if (text === '토렌트 파일') {
                    el.innerText = '💾 파일 저장';
                    el.style.cssText = 'background-color: #333 !important; color: #aaa !important; border: 1px solid #444 !important; padding: 10px 15px !important; border-radius: 5px !important; transition: 0.2s;';
                }
                if (text.includes('다운로드로 바로가기') || text.includes('광고하세요') || text.includes('놓치지 마세요')) {
                    const box = el.closest('div[style*="background-color"], [style*="border"], .sidebar-box, .widget');
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
