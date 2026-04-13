// ==UserScript==
// @name         TVWIKI Clean Mode
// @namespace    http://tvwiki.net/
// @version      1.0
// @description  티비위키의 성인/도박 배너를 제거하고 쾌적한 시청 환경을 제공합니다.
// @author       ANFLIX Core
// @match        *://*/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const hostname = window.location.hostname;
    // 티비위키 여부 판단
    if (!hostname.includes('tvwiki') && !hostname.includes('tvw.la')) return;

    console.log("🛡️ TVWIKI Clean Mode Active on: " + hostname);

    // 1. CSS를 이용한 즉각적인 배너 숨김
    const css = `
        /* 상단 공지사항/텔레그램 배너 */
        .notice, 
        div[style*="background-color: #004ecc"],
        div[style*="background-color:#004ecc"],
        a[href*="t.me/tvwiki"],
        
        /* 메인 및 상세페이지 배너 리스트 */
        #bannerList,
        .banner2,
        .banner_list,
        .banner_box,
        .banner_area,
        
        /* 특정 광고 키워드 포함 요소 */
        div:has(> a[href*="code="]),
        div:has(> a[href*="ref="]),
        
        /* 사이드바 및 하단 광고박스 */
        .sidebar_banner,
        .bottom_banner {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
        }

        /* 레이아웃 정리: 배너가 사라진 자리를 메꿈 */
        .main_content {
            margin-top: 10px !important;
        }
    `;
    GM_addStyle(css);

    // 2. 동적으로 생성되는 광고 제거 (MutationObserver)
    const adsKeywords = ['casino', 'toto', 'slot', '카지노', '토토', '바카라', '슬롯', '신규가입'];

    const cleanUp = () => {
        // A. 배너라고 명시된 클래스들은 무조건 제거
        document.querySelectorAll('#bannerList, .banner2, .banner_list, .banner_box, .notice, .ad-unit').forEach(el => {
            el.style.display = 'none';
        });

        // B. 이미지 및 링크 주소 정밀 분석
        document.querySelectorAll('img, a').forEach(el => {
            const source = (el.tagName === 'IMG' ? el.src : el.href) || "";
            
            // 광고 전용 폴더(/data/banner/)나 도박 키워드가 포함된 경우
            if (source.includes('/data/banner/') || adsKeywords.some(kw => source.toLowerCase().includes(kw))) {
                // 부모가 광고 박스인 경우만 통째로 제거, 아니면 요소만 숨김
                const adContainer = el.closest('.banner_area, .sidebar_banner, [class*="banner"]');
                if (adContainer) {
                    adContainer.style.display = 'none';
                } else {
                    el.style.display = 'none';
                }
            }
        });

        // C. 텍스트 기반 제거 (광고문의 등)
        document.querySelectorAll('div, span').forEach(el => {
            if (el.children.length > 0) return;
            const text = el.innerText.trim();
            if (text === '광고문의' || text === '배너문의') {
                el.parentElement.style.display = 'none';
            }
        });
    };

    // 초기 실행 및 감시
    const observer = new MutationObserver(cleanUp);
    
    const init = () => {
        if (document.body) {
            cleanUp();
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            setTimeout(init, 50);
        }
    };
    init();

    // 쾌적한 경험을 위해 주기적 체크 추가
    setInterval(cleanUp, 1000);

})();
