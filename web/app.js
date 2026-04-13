const CONFIG = {
    ENGINES: {
        APIBAY: 'https://apibay.org/q.php',
        YTS: 'https://yts.mx/api/v2/list_movies.json',
        TMDB: 'https://api.themoviedb.org/3/search/movie'
    },
    PROXIES: [
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://corsproxy.io/?'
    ],
    IMAGE_PROXY: 'https://wsrv.nl/?url=', // High-performance image proxy to bypass YTS anti-hotlinking
    FALLBACK_POSTER: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=500&auto=format&fit=crop'
};

const state = {
    isSearching: false,
    results: []
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const movieGrid = document.getElementById('movieGrid');
const sectionTitle = document.getElementById('sectionTitle');
const detailModal = document.getElementById('detailModal');
const closeModal = document.getElementById('closeModal');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    fetchTrending();
});

async function fetchTrending() {
    state.isSearching = true;
    sectionTitle.textContent = "🔥 인기 트렌드 로딩 중...";
    renderSkeletons();
    
    try {
        const url = `${CONFIG.ENGINES.YTS}?limit=20&sort_by=download_count`;
        const ytsData = await smartFetch(url);
        
        if (ytsData?.data?.movies) {
            state.results = ytsData.data.movies.map(m => ({
                id: `yts-${m.id}`,
                title: cleanTitle(m.title_long || m.title),
                poster: m.large_cover_image || m.medium_cover_image,
                size: m.torrents?.[0]?.size || 'N/A',
                seeders: m.torrents?.[0]?.seeds || 0,
                leechers: m.torrents?.[0]?.peers || 0,
                magnet: `magnet:?xt=urn:btih:${m.torrents?.[0]?.hash}&dn=${encodeURIComponent(m.title)}`,
                quality: m.torrents?.[0]?.quality || 'HD',
                engine: 'YTS (Official)',
                desc: m.description_full || 'No description available.'
            }));
            sectionTitle.textContent = "🔥 현재 가장 인기있는 토렌트";
            renderMovies(state.results);
        } else {
            renderEmpty("트렌드 데이터를 불러오지 못했습니다.");
        }
    } catch (error) {
        console.warn("Trending fetch failed", error);
        sectionTitle.textContent = "검색어를 입력하여 시작하세요.";
        movieGrid.innerHTML = ''; 
    } finally {
        state.isSearching = false;
    }
}

function initEventListeners() {
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    closeModal.addEventListener('click', closeDetail);
    window.addEventListener('click', (e) => {
        if (e.target === detailModal) closeDetail();
    });
}

/**
 * Core Live Fetcher with Proxy Rotation
 */
async function smartFetch(url, proxyIndex = 0) {
    if (proxyIndex >= CONFIG.PROXIES.length) {
        throw new Error("All proxies failed.");
    }

    const proxy = CONFIG.PROXIES[proxyIndex];
    let fetchUrl = proxy.includes('allorigins') || proxy.includes('codetabs')
        ? `${proxy}${encodeURIComponent(url)}` 
        : `${proxy}${url}`;

    console.log(`📡 Fetching via Proxy ${proxyIndex}: ${proxy}`);

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        let data;
        if (proxy.includes('allorigins')) {
            const wrapper = await response.json();
            data = typeof wrapper.contents === 'string' ? JSON.parse(wrapper.contents) : wrapper.contents;
        } else {
            data = await response.json();
        }
        return data;
    } catch (err) {
        console.warn(`⚠️ Proxy ${proxyIndex} failed:`, err.message);
        return await smartFetch(url, proxyIndex + 1);
    }
}

/**
 * Main Search Logic (Live Aggregate)
 */
async function performSearch() {
    let query = searchInput.value.trim();
    if (!query || state.isSearching) return;

    state.isSearching = true;
    sectionTitle.textContent = `"${query}" 실시간 엔진 검색 중...`;
    renderSkeletons();

    // 1. Korean Language Translation Support
    const isKorean = /[ㄱ-ㅎ|가-힣]/.test(query);
    if (isKorean) {
        console.log("🇰🇷 Korean detected. Fetching English title from TMDB...");
        try {
            const tmdbUrl = `${CONFIG.ENGINES.TMDB}?api_key=15d1a0d4933345d4&query=${encodeURIComponent(query)}&language=ko-KR`;
            const tmdbData = await smartFetch(tmdbUrl);
            if (tmdbData?.results?.[0]) {
                const englishTitle = tmdbData.results[0].title;
                const koreanTitle = tmdbData.results[0].title || query; // In case we need the original
                console.log(`✅ Translated "${query}" -> "${englishTitle}"`);
                state.lastKoreanQuery = query; // Store for domestic search
                query = englishTitle; 
            }
        } catch (e) {
            console.warn("Translation failed, proceeding with original query.");
        }
    }

    try {
        // Run engines in parallel for maximum speed
        const [apibayData, ytsData] = await Promise.allSettled([
            smartFetch(`${CONFIG.ENGINES.APIBAY}?q=${encodeURIComponent(query)}&cat=200`),
            smartFetch(`${CONFIG.ENGINES.YTS}?query_term=${encodeURIComponent(query)}&limit=20&sort_by=seeds`)
        ]);

        let combinedResults = [];

        // 1. Process YTS Results (High Quality Meta)
        if (ytsData.status === 'fulfilled' && ytsData.value.data?.movies) {
            combinedResults = combinedResults.concat(ytsData.value.data.movies.map(m => ({
                id: `yts-${m.id}`,
                title: m.title_long || m.title,
                poster: m.large_cover_image || m.medium_cover_image,
                size: m.torrents?.[0]?.size || 'N/A',
                seeders: m.torrents?.[0]?.seeds || 0,
                leechers: m.torrents?.[0]?.peers || 0,
                magnet: `magnet:?xt=urn:btih:${m.torrents?.[0]?.hash}&dn=${encodeURIComponent(m.title)}`,
                quality: m.torrents?.[0]?.quality || 'HD',
                engine: 'YTS (Official)',
                desc: m.description_full || 'No description available.',
                korTitle: state.lastKoreanQuery || m.title
            })));
        }

        // 2. Process Apibay Results (Broad Search)
        if (apibayData.status === 'fulfilled' && Array.isArray(apibayData.value)) {
            const apiBayClean = apibayData.value
                .filter(item => item.id !== "0")
                .map(item => ({
                    id: `ab-${item.id}`,
                    title: cleanTitle(item.name),
                    fullName: item.name,
                    poster: CONFIG.FALLBACK_POSTER,
                    size: formatBytes(item.size),
                    seeders: parseInt(item.seeders),
                    leechers: parseInt(item.leechers),
                    magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}`,
                    quality: detectQuality(item.name),
                    engine: 'Apibay (TPB)',
                    desc: `Full Name: ${item.name}`,
                    korTitle: state.lastKoreanQuery || item.name
                }));
            
            // Apply Safety Filter for Domestic Quality
            const safeResults = apiBayClean.filter(item => isSafeResult(item.fullName));
            combinedResults = combinedResults.concat(safeResults);
        }

        // 3. Group by Title
        const grouped = {};
        combinedResults.forEach(item => {
            if (!grouped[item.title]) {
                grouped[item.title] = {
                    ...item,
                    versions: []
                };
            }
            grouped[item.title].versions.push(item);
        });

        // Convert back to array and sort versions within each group
        state.results = Object.values(grouped).map(group => {
            // Sort versions by seeders descending
            group.versions.sort((a, b) => b.seeders - a.seeders);
            // Use the best version as primary info
            const best = group.versions[0];
            return {
                ...best,
                versions: group.versions,
                versionCount: group.versions.length
            };
        });

        // Sort grid results by primary seeder count
        state.results.sort((a, b) => b.seeders - a.seeders);
        
        if (state.results.length > 0) {
            sectionTitle.textContent = query ? `"${query}" 검색 결과 (${state.results.length}종)` : "최근 인기 트렌드";
            renderMovies(state.results);
        } else {
            renderEmpty(`"${query}"에 대한 실제 검색 결과가 없습니다.`);
        }

    } catch (error) {
        console.error("Search failed completely:", error);
        renderError("모든 검색 엔진 연결에 실패했습니다. 통신 상태를 확인하세요.");
    } finally {
        state.isSearching = false;
    }
}

async function fetchPostersForResults() {
    const targets = state.results.filter(r => r.poster === CONFIG.FALLBACK_POSTER);
    console.log(`🖼️ Attempting to find posters for ${targets.length} items...`);
    
    for (const movie of targets) {
        try {
            // Clean title for better matching (e.g. "Kingdom (2019)" -> "Kingdom")
            const cleanSearch = movie.title.replace(/\(\d{4}\)/, '').trim();
            const url = `${CONFIG.ENGINES.YTS}?query_term=${encodeURIComponent(cleanSearch)}&limit=1`;
            const data = await smartFetch(url);
            
            if (data?.data?.movies?.[0]) {
                const realPoster = data.data.movies[0].medium_cover_image;
                const imgEl = document.getElementById(`img-${movie.id}`);
                if (imgEl) {
                    imgEl.src = realPoster;
                    movie.poster = realPoster;
                    if (movie.desc.includes('Full Name')) {
                        movie.desc = data.data.movies[0].description_full || movie.desc;
                    }
                }
            }
        } catch (e) {
            console.warn("Poster search failed for:", movie.title);
        }
    }
}

// Helpers
function isSafeResult(name) {
    const unsafeKeywords = ['game', 'mobile', 'setup', 'exe', 'apk', 'adult', 'casino', 'betting', 'crack', 'repack'];
    const lowerName = name.toLowerCase();
    
    // 1. Keyword check - Reject if contains unsafe tech or gamble keywords
    if (unsafeKeywords.some(kw => lowerName.includes(kw))) {
        console.warn(`🛡️ Filtered unsafe result: ${name}`);
        return false;
    }
    
    // 2. Movie-specific check (Optional but good)
    // Most movie releases contain year or quality tags.
    return true;
}

function cleanTitle(name) {
    // Isolate base title before quality tags
    let base = name.split(/(1080p|720p|2160p|WEB-DL|BluRay|HDTV)/i)[0];
    
    // Extract year
    const yearMatch = base.match(/(19\d{2}|20\d{2})/);
    const year = yearMatch ? yearMatch[0] : '';
    
    // Remove year and clean up trailing brackets, dots
    if (year) {
        base = base.split(year)[0];
    }
    
    let clean = base.replace(/[\.\(\)\[\]\-]/g, ' ').replace(/\s+/g, ' ').trim();
    
    return year ? `${clean} (${year})` : clean;
}

function detectQuality(name) {
    if (name.includes('2160p') || name.includes('4K')) return '4K';
    if (name.includes('1080p')) return '1080p';
    return 'HD';
}

function formatBytes(bytes) {
    if (!bytes || bytes === "0") return 'N/A';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + ['B', 'KB', 'MB', 'GB', 'TB'][i];
}

function renderMovies(movies) {
    movieGrid.innerHTML = '';
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.id = movie.id;
        
        // Dynamic Letter Art Background
        const firstLetter = movie.title.charAt(0).toUpperCase();
        const colors = ['#e50914', '#b81d24', '#564d4d', '#221f1f', '#333'];
        const bgColor = colors[firstLetter.charCodeAt(0) % colors.length];

        card.innerHTML = `
            <div class="card-poster letter-art" style="background: linear-gradient(135deg, ${bgColor}, #000); display: flex; align-items: center; justify-content: center; font-size: 60px; font-weight: 900; color: rgba(255,255,255,0.2);">
                <span>${firstLetter}</span>
            </div>
            <div class="card-info">
                <div class="card-title" title="${movie.title}">${movie.title}</div>
                <div class="card-meta">
                    <span class="badge" style="background: #E50914">${movie.quality}</span>
                    <span>${movie.size}</span>
                    <span style="color: #666; font-size: 0.7rem;">(${movie.versionCount}개 버전)</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            showDetail(movie);
        });
        
        movieGrid.appendChild(card);
    });
}

function showDetail(movie) {
    document.getElementById('modalTitle').textContent = movie.title;
    document.getElementById('modalQuality').textContent = `${movie.versionCount}개의 릴리즈 발견`;
    document.getElementById('modalSize').textContent = `최상위: ${movie.size}`;
    document.getElementById('modalSeeders').textContent = `최대 시더: ${movie.seeders}`;
    
    const modalDesc = document.getElementById('modalDesc');
    modalDesc.innerHTML = `
        <div class="release-list-container">
            <h3 style="margin-bottom: 15px; font-size: 1rem; color: #fff;">다운로드 및 시청 옵션 선택</h3>
            <div class="release-list">
                ${movie.versions.map((v, i) => `
                    <div class="release-item">
                        <div class="release-name">${v.fullName || v.title}</div>
                        <div class="release-meta">
                            <span class="v-size">${v.size}</span>
                            <span class="v-seeds">↑ ${v.seeders}</span>
                        </div>
                        <div class="release-actions">
                            <button class="v-btn copy" onclick="copyV('${v.magnet}', this)">마그넷 복사</button>
                            <button class="v-btn play" onclick="window.location.href='${v.magnet}'">ANFLIX 엔진으로 시청</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Global helper for version copy
    window.copyV = (magnet, btn) => {
        navigator.clipboard.writeText(magnet);
        const originalText = btn.textContent;
        btn.textContent = '복사 완료!';
        btn.style.background = '#00ff64';
        btn.style.color = '#000';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.color = '';
        }, 1500);
    };

    const actionContainer = document.querySelector('.action-buttons');
    actionContainer.innerHTML = '';

    // Domestic Portal Section
    const domesticSection = document.createElement('div');
    domesticSection.className = 'domestic-station';
    domesticSection.style.marginTop = '20px';
    domesticSection.style.padding = '20px';
    domesticSection.style.background = 'linear-gradient(135deg, rgba(229,9,20,0.1), rgba(0,0,0,0.4))';
    domesticSection.style.borderRadius = '12px';
    domesticSection.style.border = '1px solid rgba(229,9,20,0.2)';
    
    const searchName = movie.korTitle || movie.title;
    
    domesticSection.innerHTML = `
        <h3 style="font-size: 1rem; color: #fff; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">🇰🇷</span> 국내 엔진/자막 합본 검색
        </h3>
        <p style="font-size: 0.8rem; color: #aaa; margin-bottom: 15px; line-height: 1.4;">
            자막이 합병된 '국내 포털' 자료(토렌트큐 등)를 직접 탐색합니다. 검색어: <strong>${searchName}</strong>
        </p>
        <button class="v-btn play" style="width: 100%; height: 50px; font-size: 1rem;" onclick="searchDomestic('${searchName}')">
            토렌트큐/국내 포털 정밀 검색
        </button>
    `;
    
    actionContainer.appendChild(domesticSection);

    // Global Domestic Search Helper
    window.searchDomestic = (target) => {
        // High-level search that effectively finds current TorrentQ or similar domestic portals
        const query = encodeURIComponent(`${target} 토렌트큐`);
        window.open(`https://www.google.com/search?q=${query}&btnI=I`, '_blank'); // Using Lucky Search to jump closer
    };

    const modalPoster = document.getElementById('modalPoster');
    modalPoster.style.background = `linear-gradient(45deg, #222, #000)`;
    modalPoster.innerHTML = `<span style="font-size: 80px; font-weight: 900; color: rgba(255,255,255,0.1);">${movie.title.charAt(0)}</span>`;
    modalPoster.style.display = 'flex';
    modalPoster.style.alignItems = 'center';
    modalPoster.style.justifyContent = 'center';

    detailModal.classList.remove('hidden');
    setTimeout(() => detailModal.classList.add('visible'), 10);
}

function closeDetail() {
    detailModal.classList.remove('visible');
    setTimeout(() => detailModal.classList.add('hidden'), 400); // Wait for transition
}

function renderSkeletons() {
    movieGrid.innerHTML = Array(8).fill('<div class="skeleton-card"></div>').join('');
}

function renderEmpty(msg) {
    sectionTitle.textContent = "결과 없음";
    movieGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 100px; color: #888;">${msg}</div>`;
}

function renderError(msg) {
    sectionTitle.textContent = "검색 연결 차단됨";
    movieGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: rgba(255,15,30,0.1); border-radius: 20px; border: 1px dashed var(--primary-red);">
            <h3 style="color: var(--primary-red); margin-bottom: 15px;">브라우저 보안에 의해 검색이 차단되었습니다.</h3>
            <p style="color: #ccc; margin-bottom: 20px; line-height: 1.6;">
                로컬 파일(file://) 보안 정책 때문에 실시간 데이터 수집이 제한되고 있습니다.<br>
                <b>해결 방법:</b> 터미널에서 다음 명령어를 실행하여 서버 모드로 접속하세요.
            </p>
            <code style="display: block; background: #000; padding: 15px; border-radius: 10px; color: #00ff64; margin-bottom: 20px; font-family: monospace;">
                python3 run.py
            </code>
            <p style="color: #888;">접속 주소: <a href="http://localhost:8000" style="color: #fff;">http://localhost:8000</a></p>
        </div>
    `;
}
