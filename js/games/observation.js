// ===================== 5. 관찰력: 무엇이 바뀌었을까 =====================
var spotSettings = { count: 10, timeLimit: 5 };
var spotState = {};
var spotRound = 1;
function initSpotChange() {
    renderSpotChangeSetup();
}
function renderSpotChangeSetup() {
    var counts = [6, 8, 10, 12];
    var times = [{ v: 5, l: '5초' }, { v: 10, l: '10초' }, { v: 20, l: '20초' }, { v: 0, l: '무제한' }];
    var html = '<div class="game-title-box">🔎 무엇이 바뀌었을까요</div>';
    html += '<div class="game-sub-desc">난이도를 골라 시작해보세요!</div>';
    html += '<div class="setup-section-label">그림 개수</div><div class="setup-btn-group">';
    counts.forEach(function (c) {
        html += '<button class="setup-btn' + (spotSettings.count === c ? ' active' : '') + '" onclick="setSpotCount(' + c + ')">' + c + '개</button>';
    });
    html += '</div>';
    html += '<div class="setup-section-label">제한 시간</div><div class="setup-btn-group">';
    times.forEach(function (t) {
        html += '<button class="setup-btn' + (spotSettings.timeLimit === t.v ? ' active' : '') + '" onclick="setSpotTimeLimit(' + t.v + ')">' + t.l + '</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startSpotChangeGame()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function setSpotCount(c) { spotSettings.count = c; renderSpotChangeSetup(); }
function setSpotTimeLimit(t) { spotSettings.timeLimit = t; renderSpotChangeSetup(); }
function startSpotChangeGame() {
    spotRound = 1;
    generateSpotChangeRound();
}
function nextSpotChangeRound() {
    spotRound++;
    generateSpotChangeRound();
}
function generateSpotChangeRound() {
    var n = spotSettings.count;
    var icons = pickN(ICON_POOL, n);
    var changeCount = getRandomInt(1, 3);
    var changeIndices = pickN(Array.from({ length: n }, function (_, i) { return i; }), changeCount);
    var afterIcons = icons.slice();
    var usedReplacements = [];
    changeIndices.forEach(function (idx) {
        var candidates = ICON_POOL.filter(function (i) { return icons.indexOf(i) === -1 && usedReplacements.indexOf(i) === -1; });
        var replacement = pickRandom(candidates);
        usedReplacements.push(replacement);
        afterIcons[idx] = replacement;
    });
    spotState = { icons: icons, afterIcons: afterIcons, changeIndices: changeIndices, found: [], finished: false, timeLeft: spotSettings.timeLimit, timerId: null };
    renderSpotChangeRound();
    if (spotSettings.timeLimit > 0) { startSpotTimer(); }
}
function retrySpotChangeRound() {
    spotState.found = [];
    spotState.finished = false;
    spotState.timeLeft = spotSettings.timeLimit;
    renderSpotChangeRound();
    if (spotSettings.timeLimit > 0) { startSpotTimer(); }
}
function restartSpotChange() {
    spotRound = 1;
    renderSpotChangeSetup();
}
function renderSpotChangeRound() {
    var changeCount = spotState.changeIndices.length;
    var html = '<div class="game-title-box">🔎 무엇이 바뀌었을까요</div>';
    html += '<div class="game-sub-desc">위 그림과 아래 그림을 비교해서, 달라진 곳 <b style="color:var(--primary);">' + changeCount + '군데</b>를 ' + (spotSettings.timeLimit > 0 ? spotSettings.timeLimit + '초 안에 ' : '') + '모두 찾아 눌러보세요!</div>';
    if (spotSettings.timeLimit > 0) {
        html += '<div class="timer-container" style="display:block;"><div class="timer-bar" id="spotTimerBar"></div></div>';
    }
    html += '<div class="status-row"><div>' + spotRound + '라운드</div><div>찾은 개수: <span id="spotFoundCount">' + spotState.found.length + '</span> / ' + changeCount + '</div></div>';
    html += '<div class="row-label">이전 그림</div><div class="row-display">';
    spotState.icons.forEach(function (icon) { html += '<div class="row-box">' + icon + '</div>'; });
    html += '</div>';
    html += '<div class="row-label" style="font-weight:800;">지금 그림 : 위와 다른 그림을 찾아보세요!</div><div class="row-display">';
    spotState.afterIcons.forEach(function (icon, idx) {
        var alreadyFound = spotState.found.indexOf(idx) > -1;
        var extraStyle = alreadyFound ? ' style="border:2px solid #10b981;background:#d1fae5;"' : '';
        html += '<div class="row-box clickable"' + extraStyle + ' onclick="checkSpotChange(this,' + idx + ')">' + icon + '</div>';
    });
    html += '</div>';
    html += '<div id="spotMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}
function startSpotTimer() {
    var bar = document.getElementById('spotTimerBar');
    if (bar) bar.style.width = '100%';
    spotState.timerId = setInterval(function () {
        spotState.timeLeft -= 0.1;
        var pct = (spotState.timeLeft / spotSettings.timeLimit) * 100;
        if (pct < 0) pct = 0;
        var b = document.getElementById('spotTimerBar');
        if (b) b.style.width = pct + '%';
        if (spotState.timeLeft <= 0) {
            clearInterval(spotState.timerId);
            handleSpotTimeout();
        }
    }, 100);
    activeTimers.push(spotState.timerId);
}
function handleSpotTimeout() {
    if (spotState.finished) return;
    spotState.finished = true;
    var boxes = document.querySelectorAll('.row-box.clickable');
    spotState.changeIndices.forEach(function (idx) {
        if (boxes[idx] && spotState.found.indexOf(idx) === -1) {
            boxes[idx].style.border = '2px solid #10b981';
            boxes[idx].style.background = '#d1fae5';
        }
    });
    var msg = document.getElementById('spotMsg');
    msg.className = 'msg-box bad'; msg.style.display = 'block';
    msg.innerText = '아쉬워요! ' + spotRound + '라운드까지 성공했어요. (' + spotState.found.length + '/' + spotState.changeIndices.length + ' 찾음)';
    document.getElementById('mainArea').insertAdjacentHTML('beforeend',
        '<div class="options-grid">' +
        '<button class="action-btn" onclick="retrySpotChangeRound()">다시 풀어보기 🔁</button>' +
        '<button class="action-btn secondary" onclick="restartSpotChange()">처음부터 풀기 🔄</button>' +
        '</div>');
}
function checkSpotChange(el, idx) {
    if (spotState.finished) return;
    if (spotState.found.indexOf(idx) > -1) return;
    vibrateShort();
    var msg = document.getElementById('spotMsg');
    if (spotState.changeIndices.indexOf(idx) > -1) {
        spotState.found.push(idx);
        el.style.border = '2px solid #10b981'; el.style.background = '#d1fae5';
        var countEl = document.getElementById('spotFoundCount');
        if (countEl) countEl.innerText = spotState.found.length;
        if (spotState.found.length === spotState.changeIndices.length) {
            spotState.finished = true;
            clearInterval(spotState.timerId);
            msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 성공! 모두 찾았어요.';
            document.getElementById('mainArea').insertAdjacentHTML('beforeend',
                buildStandardResultButtons('nextSpotChangeRound()', 'retrySpotChangeRound()', 'restartSpotChange()'));
        } else {
            msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 하나 찾았어요! 더 찾아보세요!';
        }
    } else {
        el.style.border = '2px solid #ef4444';
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '다시 한 번 비교해보아요!';
        var t = setTimeout(function () { el.style.border = ''; msg.style.display = 'none'; }, 500);
        activeTimers.push(t);
    }
}

// ===================== 6. 관찰력: 숫자야 나와라! =====================
var numberRushSettings = { range: '1-100', count: 10 };
var numberRushRound = 1;
var numberRushState = {};
function initNumberRush() {
    renderNumberRushSetup();
}
function renderNumberRushSetup() {
    var ranges = [
        { v: '1-20', l: '1~20' }, { v: '1-50', l: '1~50' },
        { v: '1-100', l: '1~100' }, { v: '50-100', l: '50~100' }
    ];
    var counts = [1, 3, 5, 10];
    var html = '<div class="game-title-box">🔢 숫자야 나와라!</div>';
    html += '<div class="game-sub-desc">난이도를 골라 시작해보세요! 숫자 중 가장 작은 수부터 순서대로 누르는 게임이에요.</div>';
    html += '<div class="setup-section-label">숫자 범위</div><div class="setup-btn-group">';
    ranges.forEach(function (r) {
        html += '<button class="setup-btn' + (numberRushSettings.range === r.v ? ' active' : '') + '" onclick="setNumberRushRange(\'' + r.v + '\')">' + r.l + '</button>';
    });
    html += '</div>';
    html += '<div class="setup-section-label">맞춰야 할 개수</div><div class="setup-btn-group">';
    counts.forEach(function (c) {
        html += '<button class="setup-btn' + (numberRushSettings.count === c ? ' active' : '') + '" onclick="setNumberRushCount(' + c + ')">' + c + '개</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startNumberRushSession()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function setNumberRushRange(v) { numberRushSettings.range = v; renderNumberRushSetup(); }
function setNumberRushCount(c) { numberRushSettings.count = c; renderNumberRushSetup(); }
function startNumberRushSession() {
    numberRushRound = 1;
    generateNumberRushRound();
}
function generateNumberRushRound() {
    var bounds = numberRushSettings.range.split('-').map(Number);
    var min = bounds[0], max = bounds[1];
    var pool = [];
    for (var v = min; v <= max; v++) { pool.push(v); }
    var displayCount = Math.min(10, pool.length);
    var numbers = pickN(pool, displayCount);
    var sortedAll = numbers.slice().sort(function (a, b) { return a - b; });
    var targetCount = Math.min(numberRushSettings.count, sortedAll.length);
    var targetNumbers = sortedAll.slice(0, targetCount);
    var gridSize = 16;
    var positions = pickN(Array.from({ length: gridSize }, function (_, i) { return i; }), numbers.length);
    var cells = new Array(gridSize).fill(null);
    positions.forEach(function (pos, idx) { cells[pos] = numbers[idx]; });
    numberRushState = { cells: cells, sortedNumbers: targetNumbers, currentIndex: 0, total: targetNumbers.length, finished: false, failed: false };
    renderNumberRush();
}
function retryNumberRushRound() {
    numberRushState.currentIndex = 0;
    numberRushState.finished = false;
    numberRushState.failed = false;
    renderNumberRush();
}
function restartNumberRush() {
    numberRushRound = 1;
    renderNumberRushSetup();
}
function nextNumberRushProblem() {
    numberRushRound++;
    generateNumberRushRound();
}
function renderNumberRush() {
    var html = '<div class="game-title-box">🔢 숫자야 나와라!</div>';
    html += '<div class="game-sub-desc">10개의 숫자 중 가장 작은 ' + numberRushState.total + '개를 순서대로 눌러보세요!</div>';
    html += '<div class="status-row"><div>' + numberRushRound + '라운드</div><div>진행: ' + (numberRushState.finished ? numberRushState.total : numberRushState.currentIndex) + ' / ' + numberRushState.total + '</div></div>';
    html += '<div class="number-grid">';
    numberRushState.cells.forEach(function (num, idx) {
        if (num === null) {
            html += '<div class="number-btn empty"></div>';
            return;
        }
        var valueIndex = numberRushState.sortedNumbers.indexOf(num);
        var done = valueIndex > -1 && valueIndex < numberRushState.currentIndex;
        var revealCorrect = numberRushState.failed && valueIndex === numberRushState.currentIndex;
        var cls = 'number-btn' + (done ? ' done' : '') + (revealCorrect ? ' reveal-correct' : '');
        var disabled = (done || numberRushState.finished || numberRushState.failed) ? 'disabled' : '';
        html += '<button class="' + cls + '" ' + disabled + ' onclick="clickNumberRush(this,' + num + ')">' + num + '</button>';
    });
    html += '</div>';
    html += '<div id="numberRushMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
    if (numberRushState.finished) {
        var msg = document.getElementById('numberRushMsg');
        msg.className = 'msg-box'; msg.style.display = 'block';
        msg.innerText = '🎉 정답이에요! 잘했어요.';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend',
            buildStandardResultButtons('nextNumberRushProblem()', 'retryNumberRushRound()', 'restartNumberRush()'));
    } else if (numberRushState.failed) {
        var msg2 = document.getElementById('numberRushMsg');
        msg2.className = 'msg-box bad'; msg2.style.display = 'block';
        msg2.innerText = '아쉬워요! 주황색으로 표시된 숫자가 다음 정답이었어요.';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend',
            '<div class="options-grid">' +
            '<button class="action-btn" onclick="retryNumberRushRound()">다시 풀어보기 🔁</button>' +
            '<button class="action-btn secondary" onclick="restartNumberRush()">처음부터 풀기 🔄</button>' +
            '</div>');
    }
}
function clickNumberRush(btn, num) {
    if (numberRushState.finished || numberRushState.failed) return;
    var expected = numberRushState.sortedNumbers[numberRushState.currentIndex];
    if (num === expected) {
        vibrateShort();
        numberRushState.currentIndex++;
        if (numberRushState.currentIndex >= numberRushState.total) {
            numberRushState.finished = true;
        }
        renderNumberRush();
    } else {
        vibrateShort();
        numberRushState.failed = true;
        renderNumberRush();
    }
}

// ===================== 게임 등록 =====================
GAME_INIT_FNS.spotChange = initSpotChange;
GAME_INIT_FNS.numberRush = initNumberRush;
