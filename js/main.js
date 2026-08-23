// ===================== 게임 등록 레지스트리 =====================
// 각 games/*.js 파일이 자신의 초기화 함수를 여기에 등록한다 (파일 하단 참고).
// main.js는 개별 게임 함수 이름을 몰라도 되므로, 게임을 추가/삭제해도 main.js를 건드릴 필요가 없다.
var GAME_INIT_FNS = {};

// ===================== 공통 유틸 =====================
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickRandom(arr) { return arr[getRandomInt(0, arr.length - 1)]; }
function pickN(arr, n) {
    var copy = arr.slice(); var res = [];
    for (var i = 0; i < n && copy.length > 0; i++) {
        var idx = getRandomInt(0, copy.length - 1);
        res.push(copy[idx]); copy.splice(idx, 1);
    }
    return res;
}
function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
        var j = getRandomInt(0, i);
        var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
}
function vibrateShort() {
    if (navigator.vibrate) { navigator.vibrate(30); }
}

// ===================== 공용 뜻풀이 팝업 모달 =====================
function openMeaningModal(title, desc) {
    document.getElementById('meaningModalTitle').innerText = title;
    document.getElementById('meaningModalDesc').innerText = desc;
    document.getElementById('meaningModalOverlay').classList.add('open');
}
function closeMeaningModal() {
    document.getElementById('meaningModalOverlay').classList.remove('open');
}

// ===================== 데이터 풀 (여러 카테고리에서 공용으로 사용) =====================
var ICON_POOL = ["🐶", "🐱", "🐰", "🦊", "🐻", "🐼", "🦁", "🐯", "🐨", "🐸", "🐵", "🐷", "🐮", "🐔", "🦋", "🐝", "🍎", "🍌", "🍇", "🍓", "⭐", "🌈", "☀️", "🚗", "✈️", "🎈"];

// ===================== 라우터 / 홈 화면 =====================
var GAME_LIST = [
    { cat: "🧠 기억력 게임", games: [
        { id: "memoryMatch", emoji: "🃏", name: "카드 짝맞추기", desc: "숨겨진 카드의 짝을 찾아요", quickStart: "startMemoryMatchGame" },
        { id: "simonGame", emoji: "🔵", name: "순서 기억하기", desc: "불빛 순서를 기억해서 눌러요", quickStart: "initSimonGame" },
        { id: "flashMemory", emoji: "⚡", name: "순간 기억하기", desc: "잠깐 보여준 걸 기억해요", quickStart: "startFlashSession" },
        { id: "pianoKeys", emoji: "🎹", name: "피아노 건반 누르기", desc: "건반이 눌리는 순서를 기억해서 따라 눌러요", quickStart: "startPianoSession" }
    ]},
    { cat: "🧩 공간지각 게임", games: [
        { id: "mazeGame", emoji: "🐭", name: "미로 찾기", desc: "출구까지 길을 찾아가요", quickStart: "startMazeSession" },
        { id: "topViewMatch", emoji: "📦", name: "위에서 본 모양 맞추기", desc: "쌓기나무를 정면에서 보면?", quickStart: "startTopViewSession" },
        { id: "mapFinder", emoji: "🗺️", name: "지도 찾기", desc: "위치 관계를 보고 방향을 찾아요", quickStart: "initMapFinder" },
        { id: "cube3dMatch", emoji: "🧊", name: "3D 블록 돌리기", desc: "블록을 드래그해서 목표 모양과 맞춰요", quickStart: "startCube3DSession" },
        { id: "projectionMatch", emoji: "🔦", name: "평면도로 입체 찾기", desc: "이 방향에서 본 모양은 어떤 도형일까?", quickStart: "startProjMatchSession" },
        { id: "coordHunt", emoji: "💎", name: "좌표 보물찾기", desc: "가로,세로 좌표를 읽고 보물을 찾아요", quickStart: "initCoordHunt" },
        { id: "gearRotation", emoji: "⚙️", name: "톱니바퀴 회전 방향 맞추기", desc: "맞물린 톱니바퀴의 회전 방향을 추론해요", quickStart: "initGearRotation" },
        { id: "lightMirrorMaze", emoji: "🔆", name: "빛과 거울 미로", desc: "거울을 배치해 레이저를 별까지 반사시켜요", quickStart: "startLightMazeSession" },
        { id: "paperFold", emoji: "🧩", name: "접힌 종이 구멍 뚫기", desc: "종이를 접고 구멍을 뚫은 뒤 펼친 모양을 맞혀요", quickStart: "startPaperFoldSession" },
        { id: "cheeseMaze", emoji: "🧀", name: "치즈 갉아먹기 미로", desc: "모든 칸을 한 번씩만 지나 구멍으로 탈출해요", quickStart: "startCheeseSession" }
    ]},
    { cat: "📝 언어 상식 퀴즈", games: [
        { id: "chosungQuiz", emoji: "🔤", name: "초성 퀴즈", desc: "초성 보고 소리내어 맞혀요", quickStart: "startChosungSession" },
        { id: "hanjaQuiz", emoji: "漢", name: "한자 공부", desc: "한자와 한자어의 뜻을 배우고 반대말도 찾아봐요", quickStart: "startHanjaSession" },
        { id: "proverbIdiom", emoji: "📜", name: "고사성어·속담 맞추기", desc: "뜻 설명을 읽고 알맞은 고사성어나 속담을 골라요", quickStart: "startProverbSession" },
        { id: "worldQuiz", emoji: "🌍", name: "세계 나라·수도 맞추기", desc: "국기를 보고 나라와 수도 이름을 맞혀요", quickStart: "startWorldQuizSession" }
    ]},
    { cat: "👀 관찰력 게임", games: [
        { id: "spotChange", emoji: "🔎", name: "무엇이 바뀌었을까", desc: "5초 안에 달라진 곳을 모두 찾아요", quickStart: "startSpotChangeGame" },
        { id: "numberRush", emoji: "🔢", name: "숫자야 나와라!", desc: "작은 수부터 순서대로 눌러요", quickStart: "startNumberRushSession" }
    ]},
    { cat: "🎯 논리 사고 놀이", games: [
        { id: "patternMatrix", emoji: "🧩", name: "패턴 매트릭스", desc: "규칙을 찾아 빈칸을 채워요", quickStart: "startPatternSession" },
        { id: "sizeLogic", emoji: "📏", name: "크기 순서 추론", desc: "단서를 읽고 순서를 추론해요", quickStart: "initSizeLogic" },
        { id: "mirrorSymmetry", emoji: "🪞", name: "거울 대칭 완성하기", desc: "거울처럼 똑같이 반대쪽을 완성해요", quickStart: "initMirrorSymmetry" },
        { id: "syllogism", emoji: "🧠", name: "참/거짓 명제 추론", desc: "단서를 보고 맞다/틀리다/모른다를 골라요", quickStart: "initSyllogism" },
        { id: "numSeq", emoji: "🔢", name: "숫자 규칙 추리", desc: "규칙을 찾아 다음 숫자를 맞혀요", quickStart: "initNumSeq" },
        { id: "weightScale", emoji: "⚖️", name: "무게 저울 추론하기", desc: "저울 단서를 보고 교환 비율을 추론해요", quickStart: "initWeightScale" },
        { id: "sudokuLite", emoji: "🧮", name: "스도쿠 퍼즐 라이트", desc: "가로·세로·상자 안에 같은 그림이 없게 채워요", quickStart: "startSudokuSession" },
        { id: "suspectLogic", emoji: "🕵️", name: "범인을 찾아라!", desc: "단서를 보고 용의자를 소거해 범인을 찾아요", quickStart: "startSuspectSession" }
    ]},
    { cat: "🔢 수학 놀이", games: [
        { id: "clockMatch", emoji: "🕐", name: "아날로그 시계 맞추기", desc: "바늘을 돌려 시각을 맞춰요", quickStart: "initClockMatch" },
        { id: "probabilityDraw", emoji: "🎲", name: "확률 저울 뽑기", desc: "구슬 개수를 보고 뽑힐 확률이 높은 색을 맞혀요", quickStart: "initProbabilityDraw" },
        { id: "changeCounter", emoji: "💰", name: "거스름돈 계산", desc: "물건을 스캔하고 정확한 거스름돈을 건네요", quickStart: "startChangeSession" },
        { id: "mathAdventure", emoji: "➕", name: "수학 대모험", desc: "학년별 수학 문제를 풀며 계산력을 키워요", quickStart: "startMathAdvSession" }
    ]},
    { cat: "💻 코딩 사고 놀이", games: [
        { id: "hamburgerMaker", emoji: "🍔", name: "햄버거 만들기", desc: "순서가 결과를 바꿔요! 명령을 순서대로 쌓아 직접 실행해요", quickStart: "initHamburger" },
        { id: "codeTrace", emoji: "🔍", name: "명령 미리보기", desc: "코드는 위에서부터 차례로 실행돼요. 실행 전에 결과를 먼저 읽어봐요", quickStart: "startCodeTraceSession" },
        { id: "blockCoding", emoji: "🧑‍💻", name: "블록코딩 로봇", desc: "같은 동작을 반복으로 묶고, 틀리면 디버깅으로 고쳐요", quickStart: "startBlockCodeSession" },
        { id: "conditionalRobot", emoji: "🚦", name: "조건문 로봇", desc: "조건에 따라 다른 행동을 해요(만약 ~라면)", quickStart: "initConditionalRobot" },
        { id: "variableScore", emoji: "🔢", name: "변수 점수 만들기", desc: "값(변수)은 계속 바뀔 수 있어요", quickStart: "initVariableScore" },
        { id: "logicGate", emoji: "💡", name: "AND OR 스위치 놀이", desc: "여러 조건을 AND(둘다)/OR(하나만)로 합쳐요", quickStart: "initLogicGate" },
        { id: "functionFinder", emoji: "📦", name: "나만의 명령 만들기", desc: "반복되는 부분을 함수 하나로 묶어 재사용해요", quickStart: "initFunctionFinder" },
        { id: "efficiencyGuess", emoji: "⚡", name: "최소 명령 개수 맞추기", desc: "같은 결과라도 더 효율적인 방법이 있어요", quickStart: "startEfficiencySession" },
        { id: "waterPipe", emoji: "🔀", name: "논리 회로 물길 연결하기", desc: "파이프를 돌려 수도꼭지 물을 물탱크까지 연결해요", quickStart: "startWaterPipeSession" }
    ]}
];

var randomPickState = { selectedCats: null };
function renderRandomGamePicker() {
    document.getElementById('homeBtn').style.display = 'inline-block';
    if (!randomPickState.selectedCats) {
        randomPickState.selectedCats = GAME_LIST.map(function (b) { return b.cat; });
    }
    var allSelected = randomPickState.selectedCats.length === GAME_LIST.length;
    var html = '<div class="game-title-box">🎲 무작위 게임 시작하기</div>';
    html += '<div class="game-sub-desc">원하는 카테고리를 골라보세요! 고른 카테고리 안에서 무작위로 게임 하나를 시작해요.</div>';
    html += '<div class="setup-btn-group">';
    html += '<button class="setup-btn' + (allSelected ? ' active' : '') + '" onclick="toggleRandomPickAll()">전체</button>';
    GAME_LIST.forEach(function (block) {
        var active = randomPickState.selectedCats.indexOf(block.cat) > -1;
        html += '<button class="setup-btn' + (active ? ' active' : '') + '" onclick="toggleRandomPickCat(\'' + block.cat.replace(/'/g, "\\'") + '\')">' + block.cat + '</button>';
    });
    html += '</div>';
    var poolCount = 0;
    GAME_LIST.forEach(function (block) {
        if (randomPickState.selectedCats.indexOf(block.cat) > -1) poolCount += block.games.length;
    });
    html += '<button class="action-btn" ' + (poolCount === 0 ? 'disabled' : '') + ' onclick="startRandomGame()">무작위로 시작하기 🎲 (' + poolCount + '개 중 하나)</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function toggleRandomPickAll() {
    if (randomPickState.selectedCats.length === GAME_LIST.length) {
        randomPickState.selectedCats = [];
    } else {
        randomPickState.selectedCats = GAME_LIST.map(function (b) { return b.cat; });
    }
    renderRandomGamePicker();
}
function toggleRandomPickCat(cat) {
    var idx = randomPickState.selectedCats.indexOf(cat);
    if (idx > -1) { randomPickState.selectedCats.splice(idx, 1); }
    else { randomPickState.selectedCats.push(cat); }
    renderRandomGamePicker();
}
var randomModeActive = false;
var randomModePool = [];
var randomModeCurrent = null;
var randomModeRound = 0;
var randomModeClearedCount = 0;
function startRandomGame() {
    var pool = [];
    GAME_LIST.forEach(function (block) {
        if (randomPickState.selectedCats.indexOf(block.cat) > -1) {
            block.games.forEach(function (g) { pool.push(g); });
        }
    });
    if (pool.length === 0) return;
    randomModeActive = true;
    randomModePool = pool;
    randomModeRound = 1;
    randomModeClearedCount = 0;
    launchRandomModeGame(pickRandom(pool));
}
function launchRandomModeGame(g) {
    randomModeCurrent = g;
    clearAllGameTimers();
    if (typeof stopVoiceRecognition === 'function') stopVoiceRecognition();
    endGameSession();
    startGameSession(g.id);
    document.getElementById('homeBtn').style.display = 'inline-block';
    updateMetaProgressBar();
    window[g.quickStart]();
}
function nextRandomModeRound() {
    randomModeClearedCount++;
    randomModeRound++;
    var next = pickRandom(randomModePool);
    if (randomModePool.length > 1) {
        while (next.id === randomModeCurrent.id) { next = pickRandom(randomModePool); }
    }
    launchRandomModeGame(next);
}
function exitRandomMode() {
    randomModeActive = false;
    randomModePool = [];
    randomModeCurrent = null;
    hideMetaProgressBar();
    renderRandomGamePicker();
}

// ===================== 오늘의 게임 시작하기 (설정 없이 바로 무작위 10판) =====================
var TODAY_MODE_TOTAL = 10;
var todayModeActive = false;
var todayModePool = [];
var todayModeCurrent = null;
var todayModeRound = 0;
var todayModeClearedCount = 0;
function startTodayGame() {
    var pool = [];
    GAME_LIST.forEach(function (block) { block.games.forEach(function (g) { pool.push(g); }); });
    if (pool.length === 0) return;
    todayModeActive = true;
    todayModePool = pool;
    todayModeRound = 1;
    todayModeClearedCount = 0;
    launchTodayModeGame(pickRandom(pool));
}
function launchTodayModeGame(g) {
    todayModeCurrent = g;
    clearAllGameTimers();
    if (typeof stopVoiceRecognition === 'function') stopVoiceRecognition();
    endGameSession();
    startGameSession(g.id);
    document.getElementById('homeBtn').style.display = 'inline-block';
    updateMetaProgressBar();
    window[g.quickStart]();
}
function nextTodayModeRound() {
    todayModeClearedCount++;
    if (todayModeRound >= TODAY_MODE_TOTAL) {
        renderTodayModeComplete();
        return;
    }
    todayModeRound++;
    var next = pickRandom(todayModePool);
    if (todayModePool.length > 1) {
        while (next.id === todayModeCurrent.id) { next = pickRandom(todayModePool); }
    }
    launchTodayModeGame(next);
}
function exitTodayMode() {
    todayModeActive = false;
    todayModePool = [];
    todayModeCurrent = null;
    hideMetaProgressBar();
    renderHome();
}
function renderTodayModeComplete() {
    todayModeActive = false;
    hideMetaProgressBar();
    clearAllGameTimers();
    document.getElementById('homeBtn').style.display = 'inline-block';
    var html = '<div class="game-title-box">🔥 오늘의 게임 완료!</div>';
    html += '<div class="game-sub-desc">오늘의 무작위 게임 ' + TODAY_MODE_TOTAL + '판을 모두 클리어했어요! 수고하셨어요 🎉</div>';
    html += '<button class="action-btn" style="width:100%;" onclick="renderHome()">처음으로 돌아가기 🏠</button>';
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 무작위/오늘의 게임 진행 상태 표시줄 =====================
function updateMetaProgressBar() {
    var bar = document.getElementById('metaProgressBar');
    if (!bar) return;
    if (todayModeActive) {
        bar.style.display = 'block';
        bar.innerHTML = '🔥 오늘의 게임 · ' + todayModeRound + ' / ' + TODAY_MODE_TOTAL + '라운드 진행 중 (' + todayModeClearedCount + '개 클리어)';
    } else if (randomModeActive) {
        bar.style.display = 'block';
        bar.innerHTML = '🎲 무작위 게임 · ' + randomModeRound + '라운드 진행 중 (' + randomModeClearedCount + '개 클리어)';
    } else {
        bar.style.display = 'none';
        bar.innerHTML = '';
    }
}
function hideMetaProgressBar() {
    var bar = document.getElementById('metaProgressBar');
    if (bar) { bar.style.display = 'none'; bar.innerHTML = ''; }
}

function renderHome() {
    document.getElementById('homeBtn').style.display = 'none';
    hideMetaProgressBar();
    var html = '';
    html += '<div class="options-grid" style="margin-bottom:0.6rem;">';
    html += '<button class="action-btn" onclick="startTodayGame()">🔥 오늘의 게임 시작하기</button>';
    html += '<button class="action-btn secondary" onclick="renderRandomGamePicker()">🎲 무작위 게임 시작하기</button>';
    html += '</div>';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">';
    html += '<div style="font-weight:800; color:var(--primary);">👋 ' + (currentUser || '플레이어') + '님</div>';
    html += '<button class="action-btn secondary" style="padding:0.4rem 0.7rem; font-size:0.78rem;" onclick="renderHistory()">📜 게임 기록</button>';
    html += '</div>';
    GAME_LIST.forEach(function (block) {
        html += '<div class="category-block">';
        html += '<div class="category-title">' + block.cat + '</div>';
        html += '<div class="tile-row">';
        block.games.forEach(function (g) {
            html += '<div class="game-tile" onclick="startGame(\'' + g.id + '\')">';
            html += '<span class="tile-emoji">' + g.emoji + '</span>';
            html += '<div class="tile-name">' + g.name + '</div>';
            html += '<div class="tile-desc">' + g.desc + '</div>';
            html += '</div>';
        });
        html += '</div></div>';
    });
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 사용자 이름 + 게임 기록(필터/정렬) =====================
var currentUser = '';
var activeGameSession = null;
var historyFilter = { user: '', game: '' };
var historySort = { key: 'date', dir: 'desc' };

function renderUsernamePrompt() {
    document.getElementById('homeBtn').style.display = 'none';
    var html = '<div class="game-title-box">👋 환영해요!</div>';
    html += '<div class="game-sub-desc">이름을 입력하거나 골라주세요.</div>';
    var names = [];
    try { names = JSON.parse(localStorage.getItem('playerNameList') || '[]'); } catch (e) { }
    if (names.length > 0) {
        html += '<div class="setup-section-label">최근 사용한 이름</div><div class="setup-btn-group">';
        names.forEach(function (n) {
            html += '<button class="setup-btn" onclick="selectExistingUsername(\'' + n.replace(/'/g, "\\'") + '\')">' + n + '</button>';
        });
        html += '</div>';
    }
    html += '<div class="setup-section-label">새 이름 입력</div>';
    html += '<input type="text" id="usernameInput" placeholder="이름을 입력하세요" style="width:100%; box-sizing:border-box; padding:0.7rem; border:2px solid #d1d5db; border-radius:0.6rem; font-size:1rem; margin-bottom:0.8rem;" />';
    html += '<button class="action-btn" onclick="submitUsername()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function selectExistingUsername(name) {
    currentUser = name;
    renderHome();
}
function submitUsername() {
    var input = document.getElementById('usernameInput');
    var name = ((input && input.value) || '').trim();
    if (!name) name = '플레이어';
    currentUser = name;
    try {
        var names = JSON.parse(localStorage.getItem('playerNameList') || '[]');
        if (names.indexOf(name) === -1) {
            names.push(name);
            if (names.length > 20) names = names.slice(names.length - 20);
        }
        localStorage.setItem('playerNameList', JSON.stringify(names));
    } catch (e) { }
    renderHome();
}
function changeUserName() { renderUsernamePrompt(); }

function getGameName(id) {
    var found = null;
    GAME_LIST.forEach(function (block) {
        block.games.forEach(function (g) { if (g.id === id) found = g.name; });
    });
    return found || id;
}
function captureCurrentRoundNumber() {
    var rows = document.querySelectorAll('.status-row');
    if (rows.length > 0) {
        var text = rows[0].innerText || rows[0].textContent || '';
        var m = text.match(/(\d+)\s*라운드/);
        if (m) return parseInt(m[1], 10);
    }
    return 0;
}
function startGameSession(id) {
    activeGameSession = { id: id, name: getGameName(id), startTime: Date.now() };
}
function endGameSession() {
    if (!activeGameSession) return;
    var roundNum = captureCurrentRoundNumber();
    var record = {
        user: currentUser || '플레이어',
        gameId: activeGameSession.id,
        game: activeGameSession.name,
        round: roundNum,
        date: new Date().toISOString()
    };
    try {
        var list = JSON.parse(localStorage.getItem('gameHistory') || '[]');
        list.push(record);
        if (list.length > 300) list = list.slice(list.length - 300);
        localStorage.setItem('gameHistory', JSON.stringify(list));
    } catch (e) { /* 저장 실패시 무시 */ }
    activeGameSession = null;
}
function setHistoryFilterUser(u) { historyFilter.user = u; renderHistory(); }
function setHistoryFilterGame(g) { historyFilter.game = g; renderHistory(); }
function toggleHistorySort(key) {
    if (historySort.key === key) { historySort.dir = historySort.dir === 'asc' ? 'desc' : 'asc'; }
    else { historySort.key = key; historySort.dir = key === 'date' ? 'desc' : 'asc'; }
    renderHistory();
}
function renderHistory() {
    document.getElementById('homeBtn').style.display = 'inline-block';
    var html = '<div class="game-title-box">📜 게임 기록</div>';
    var list = [];
    try { list = JSON.parse(localStorage.getItem('gameHistory') || '[]'); } catch (e) { }

    var allUsers = [];
    var allGames = [];
    list.forEach(function (r) {
        if (allUsers.indexOf(r.user) === -1) allUsers.push(r.user);
        if (allGames.indexOf(r.game) === -1) allGames.push(r.game);
    });

    html += '<div class="setup-section-label">이름 필터</div><div class="setup-btn-group">';
    html += '<button class="setup-btn' + (historyFilter.user === '' ? ' active' : '') + '" onclick="setHistoryFilterUser(\'\')">전체</button>';
    allUsers.forEach(function (u) {
        html += '<button class="setup-btn' + (historyFilter.user === u ? ' active' : '') + '" onclick="setHistoryFilterUser(\'' + u.replace(/'/g, "\\'") + '\')">' + u + '</button>';
    });
    html += '</div>';

    html += '<div class="setup-section-label">게임 필터</div>';
    html += '<select onchange="setHistoryFilterGame(this.value)" style="width:100%; box-sizing:border-box; padding:0.6rem; border:2px solid #d1d5db; border-radius:0.6rem; font-size:0.9rem; margin-bottom:1rem;">';
    html += '<option value=""' + (historyFilter.game === '' ? ' selected' : '') + '>전체 게임</option>';
    allGames.forEach(function (g) {
        html += '<option value="' + g.replace(/"/g, '&quot;') + '"' + (historyFilter.game === g ? ' selected' : '') + '>' + g + '</option>';
    });
    html += '</select>';

    html += '<div class="setup-section-label">정렬</div>';
    html += '<div class="options-grid" style="grid-template-columns: 1fr 1fr;">';
    html += '<button class="action-btn secondary" onclick="toggleHistorySort(\'round\')">라운드순 ' + (historySort.key === 'round' ? (historySort.dir === 'asc' ? '▲' : '▼') : '') + '</button>';
    html += '<button class="action-btn secondary" onclick="toggleHistorySort(\'date\')">날짜순 ' + (historySort.key === 'date' ? (historySort.dir === 'asc' ? '▲' : '▼') : '') + '</button>';
    html += '</div>';

    var filtered = list.filter(function (r) {
        return (historyFilter.user === '' || r.user === historyFilter.user) && (historyFilter.game === '' || r.game === historyFilter.game);
    });
    filtered.sort(function (a, b) {
        var av = historySort.key === 'round' ? a.round : new Date(a.date).getTime();
        var bv = historySort.key === 'round' ? b.round : new Date(b.date).getTime();
        return historySort.dir === 'asc' ? (av - bv) : (bv - av);
    });

    if (filtered.length === 0) {
        html += '<div class="game-sub-desc">기록이 없어요. 게임을 하고 홈으로 돌아오면 자동으로 기록돼요!</div>';
    } else {
        html += '<div class="msg-box" style="display:block; background:#f8fafc; border-color:#e5e7eb; text-align:left; line-height:1.9;">';
        filtered.forEach(function (r) {
            var d = new Date(r.date);
            var dateStr = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
            var origIdx = list.indexOf(r);
            html += '<div style="display:flex; justify-content:space-between; align-items:center; gap:0.4rem;">';
            html += '<span><b>' + r.user + '</b> · ' + r.game + ' · ' + r.round + '라운드 · <span style="color:#9ca3af; font-size:0.78rem;">' + dateStr + '</span></span>';
            html += '<button onclick="deleteHistoryRecord(' + origIdx + ')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.95rem; flex-shrink:0;">🗑️</button>';
            html += '</div>';
        });
        html += '</div>';
        html += '<div class="options-grid" style="grid-template-columns: 1fr 1fr; margin-bottom:0.6rem;"><button class="action-btn secondary" onclick="clearHistory()">기록 전체 지우기 🗑️</button></div>';
    }
    html += '<div class="options-grid" style="grid-template-columns: 1fr 1fr; margin-top:0.5rem;"><button class="action-btn secondary" onclick="changeUserName()">이름 바꾸기 👤</button></div>';
    document.getElementById('mainArea').innerHTML = html;
}
function clearHistory() {
    try { localStorage.removeItem('gameHistory'); } catch (e) { }
    renderHistory();
}
function deleteHistoryRecord(idx) {
    try {
        var list = JSON.parse(localStorage.getItem('gameHistory') || '[]');
        list.splice(idx, 1);
        localStorage.setItem('gameHistory', JSON.stringify(list));
    } catch (e) { }
    renderHistory();
}

function goHome() {
    randomModeActive = false;
    todayModeActive = false;
    hideMetaProgressBar();
    clearAllGameTimers();
    if (typeof stopVoiceRecognition === 'function') stopVoiceRecognition();
    endGameSession();
    renderHome();
}

// ===================== 결과 버튼 공통 (모든 게임 공용) =====================
function buildStandardResultButtons(nextCall, retryCall, homeCall) {
    var effNext = todayModeActive ? 'nextTodayModeRound()' : (randomModeActive ? 'nextRandomModeRound()' : nextCall);
    var effHome = todayModeActive ? 'exitTodayMode()' : (randomModeActive ? 'exitRandomMode()' : homeCall);
    return '<button class="action-btn" onclick="' + effNext + '">다음 단계로 ▶</button>' +
        '<div class="options-grid">' +
        '<button class="action-btn secondary" onclick="' + retryCall + '">이번 단계 다시풀기 🔁</button>' +
        '<button class="action-btn secondary" onclick="' + effHome + '">초기 화면으로 ⏮</button>' +
        '</div>';
}

// ===================== 타이머 관리 (모든 게임 공용) =====================
var activeTimers = [];
function clearAllGameTimers() {
    activeTimers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    activeTimers = [];
}

// ===================== 게임 시작 라우터 =====================
function startGame(id) {
    randomModeActive = false;
    todayModeActive = false;
    hideMetaProgressBar();
    clearAllGameTimers();
    if (typeof stopVoiceRecognition === 'function') stopVoiceRecognition();
    startGameSession(id);
    document.getElementById('homeBtn').style.display = 'inline-block';
    var fn = GAME_INIT_FNS[id];
    if (fn) fn();
}

// ===================== 앱 시작점 =====================
// 하이브리드 웹뷰(Cordova/Capacitor)에서 DOM 초기화 전에 스크립트가 실행되는 것을 막기 위해
// DOMContentLoaded 이후에 진입 화면을 그린다.
document.addEventListener('DOMContentLoaded', function () {
    renderUsernamePrompt();
});
