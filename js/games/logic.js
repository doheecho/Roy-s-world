// ===================== 8. 논리: 패턴 매트릭스 =====================
var MATRIX_SHAPE_POOL = ["●", "■", "▲", "◆", "★", "♥", "♦", "♣", "♠"];
var patternSettings = { size: 3, timeLimit: 0 };
var patternState = {};
var patternRound = 1, patternCorrect = 0;

function initPatternMatrix() { patternRound = 1; patternCorrect = 0; renderPatternSetup(); }
function renderPatternSetup() {
    var sizes = [{v: 2, l: '2x2'}, {v: 3, l: '3x3'}, {v: 4, l: '4x4'}, {v: 'random', l: '무작위'}];
    var times = [{v: 5, l: '5초'}, {v: 10, l: '10초'}, {v: 20, l: '20초'}, {v: 0, l: '무제한'}];
    var html = '<div class="game-title-box">🧩 패턴 매트릭스</div>';
    html += '<div class="game-sub-desc">난이도를 골라 시작해보세요!</div>';

    html += '<div class="setup-section-label">조각 수</div><div class="setup-btn-group">';
    sizes.forEach(function (s) {
        html += '<button class="setup-btn' + (patternSettings.size === s.v ? ' active' : '') + '" onclick="setPatternSize(' + (s.v === 'random' ? "'random'" : s.v) + ')">' + s.l + '</button>';
    });
    html += '</div>';

    html += '<div class="setup-section-label">제한 시간</div><div class="setup-btn-group">';
    times.forEach(function (t) {
        html += '<button class="setup-btn' + (patternSettings.timeLimit === t.v ? ' active' : '') + '" onclick="setPatternTime(' + t.v + ')">' + t.l + '</button>';
    });
    html += '</div>';

    html += '<button class="action-btn" onclick="startPatternSession()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}

function setPatternSize(s) { patternSettings.size = s; renderPatternSetup(); }
function setPatternTime(t) { patternSettings.timeLimit = t; renderPatternSetup(); }
function startPatternSession() { generatePatternMatrixRound(); }

function generatePatternMatrixRound() {
    var size = patternSettings.size === 'random' ? pickRandom([2, 3, 4]) : patternSettings.size;
    var icons = pickN(MATRIX_SHAPE_POOL, Math.max(4, size));
    var type = getRandomInt(0, 2);
    var grid = [];
    for (var r = 0; r < size; r++) {
        var row = [];
        for (var c = 0; c < size; c++) {
            var val = 0;
            if(type === 0) val = r + c;
            else if(type === 1) val = r + (size - c);
            else val = r * 2 + c;
            row.push(icons[val % icons.length]);
        }
        grid.push(row);
    }
    var hideR = getRandomInt(0, size-1), hideC = getRandomInt(0, size-1);
    var answer = grid[hideR][hideC];

    var decoys = icons.filter(function(i) { return i !== answer; });
    var opts = [answer].concat(pickN(decoys, 3));
    var options = shuffleArray(opts.slice(0, 4));

    patternState = { size: size, grid: grid, hideR: hideR, hideC: hideC, answer: answer, options: options, answered: false, finished: false, timeLeft: patternSettings.timeLimit, timerId: null };
    renderPatternMatrix();
    if(patternSettings.timeLimit > 0) startPatternTimer();
}

function retryPatternRound() {
    patternState.answered = false;
    patternState.finished = false;
    patternState.timeLeft = patternSettings.timeLimit;
    renderPatternMatrix();
    if(patternSettings.timeLimit > 0) startPatternTimer();
}

function startPatternTimer() {
    var bar = document.getElementById('patternTimerBar');
    if (bar) bar.style.width = '100%';
    patternState.timerId = setInterval(function () {
        patternState.timeLeft -= 0.1;
        var pct = (patternState.timeLeft / patternSettings.timeLimit) * 100;
        if (pct < 0) pct = 0;
        var b = document.getElementById('patternTimerBar');
        if (b) b.style.width = pct + '%';
        if (patternState.timeLeft <= 0) {
            clearInterval(patternState.timerId);
            handlePatternTimeout();
        }
    }, 100);
    activeTimers.push(patternState.timerId);
}

function handlePatternTimeout() {
    if (patternState.finished) return;
    patternState.finished = true;
    patternState.answered = true;
    var buttons = document.querySelectorAll('.opt-btn');
    buttons.forEach(function (b, i) { if (patternState.options[i] === patternState.answer) b.classList.add('correct'); });
    var msg = document.getElementById('patternMsg');
    msg.className = 'msg-box bad'; msg.style.display = 'block';
    msg.innerText = '⏰ 시간이 다 됐어요! 정답은 "' + patternState.answer + '" 였어요.';
    document.getElementById('mainArea').insertAdjacentHTML('beforeend',
        '<div class="options-grid">' +
        '<button class="action-btn" onclick="retryPatternRound()">다시 풀어보기 🔁</button>' +
        '<button class="action-btn secondary" onclick="initPatternMatrix()">처음부터 풀기 🔄</button>' +
        '</div>');
}

function renderPatternMatrix() {
    var html = '<div class="game-title-box">🧩 패턴 매트릭스</div>';
    html += '<div class="game-sub-desc">가로세로 규칙을 찾아 빈칸에 들어갈 모양을 골라보세요!</div>';
    html += '<div class="status-row"><div>' + patternRound + '라운드</div><div>정답: ' + patternCorrect + ' / ' + (patternRound - 1) + '</div></div>';

    if (patternSettings.timeLimit > 0) {
        html += '<div class="timer-container" style="display:block;"><div class="timer-bar" id="patternTimerBar"></div></div>';
    }

    html += '<div class="matrix-grid" style="grid-template-columns: repeat(' + patternState.size + ', 60px);">';
    for (var r = 0; r < patternState.size; r++) {
        for (var c = 0; c < patternState.size; c++) {
            var isBlank = (r === patternState.hideR && c === patternState.hideC);
            html += '<div class="matrix-cell' + (isBlank ? ' blank' : '') + '">' + (isBlank ? '?' : patternState.grid[r][c]) + '</div>';
        }
    }
    html += '</div>';
    html += '<div class="options-grid">';
    patternState.options.forEach(function (opt, idx) {
        html += '<button class="opt-btn" onclick="checkPatternMatrix(this,' + idx + ')">' + opt + '</button>';
    });
    html += '</div>';
    html += '<div id="patternMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}

function checkPatternMatrix(btn, idx) {
    if (patternState.answered) return;
    patternState.answered = true;
    patternState.finished = true;
    clearInterval(patternState.timerId);

    var buttons = document.querySelectorAll('.opt-btn');
    var opt = patternState.options[idx];
    var msg = document.getElementById('patternMsg');
    if (opt === patternState.answer) {
        btn.classList.add('correct');
        patternCorrect++;
        msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 정답이에요!';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextPatternRound()', 'retryPatternRound()', 'initPatternMatrix()'));
    } else {
        btn.classList.add('wrong');
        buttons.forEach(function (b, i) { if (patternState.options[i] === patternState.answer) b.classList.add('correct'); });
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아쉬워요! 정답은 "' + patternState.answer + '" 였어요.';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend',
            '<div class="options-grid">' +
            '<button class="action-btn" onclick="retryPatternRound()">다시 풀어보기 🔁</button>' +
            '<button class="action-btn secondary" onclick="initPatternMatrix()">처음부터 풀기 🔄</button>' +
            '</div>');
    }
    patternRound++;
}
function nextPatternRound() { generatePatternMatrixRound(); }

// ===================== 10. 논리: 크기 순서 추론 =====================
var sizeLogicState = {};
var sizeLogicRound = 1, sizeLogicCorrect = 0;
function initSizeLogic() { sizeLogicRound = 1; sizeLogicCorrect = 0; generateSizeLogicRound(); }
function generateSizeLogicRound() {
    var n = 4;
    var items = pickN(ICON_POOL, n); // 뽑힌 순서 그대로 "큰 것부터"의 정답 순서로 사용
    var clues = [];
    for (var i = 0; i < n - 1; i++) { clues.push(items[i] + ' 는(은) ' + items[i + 1] + ' 보다 커요.'); }
    var shuffled = shuffleArray(items.slice());
    sizeLogicState = { correctOrder: items.slice(), shuffled: shuffled, picked: [], checked: false, clues: shuffleArray(clues) };
    renderSizeLogic();
}
function renderSizeLogic() {
    var html = '<div class="game-title-box">📏 크기 순서 추론</div>';
    html += '<div class="game-sub-desc">아래 단서를 읽고, 가장 큰 것부터 순서대로 눌러보세요!</div>';
    html += '<div class="status-row"><div>' + sizeLogicRound + '라운드</div><div>정답: ' + sizeLogicCorrect + ' / ' + (sizeLogicRound - 1) + '</div></div>';
    html += '<div class="msg-box" style="display:block; background:#f8fafc; border-color:#e5e7eb; color:#1f2937; text-align:left; font-size:1.1rem; line-height:1.8;">' + sizeLogicState.clues.join('<br>') + '</div>';
    html += '<div class="sequence-answer-row">';
    for (var i = 0; i < sizeLogicState.correctOrder.length; i++) {
        html += '<div class="sequence-answer-slot">' + (sizeLogicState.picked[i] ? sizeLogicState.picked[i] : (i + 1)) + '</div>';
    }
    html += '</div>';
    html += '<div class="sequence-pool-row">';
    sizeLogicState.shuffled.forEach(function (it, idx) {
        var picked = sizeLogicState.picked.indexOf(it) > -1;
        html += '<button class="sequence-btn' + (picked ? ' picked' : '') + '" ' + (picked ? 'disabled' : '') + ' onclick="pickSizeLogicItem(' + idx + ')">' + it + '</button>';
    });
    html += '</div>';
    html += '<div id="sizeLogicMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}
function pickSizeLogicItem(idx) {
    if (sizeLogicState.checked) return;
    var it = sizeLogicState.shuffled[idx];
    if (sizeLogicState.picked.indexOf(it) > -1) return;
    vibrateShort();
    sizeLogicState.picked.push(it);
    if (sizeLogicState.picked.length === sizeLogicState.correctOrder.length) {
        sizeLogicState.checked = true;
        var isCorrect = sizeLogicState.picked.every(function (p, i) { return p === sizeLogicState.correctOrder[i]; });
        renderSizeLogic();
        var msg = document.getElementById('sizeLogicMsg');
        if (isCorrect) {
            sizeLogicCorrect++;
            msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 정확히 추론했어요!';
            document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextSizeLogicRound()', 'retrySizeLogicRound()', 'restartSizeLogic()'));
        } else {
            msg.className = 'msg-box bad'; msg.style.display = 'block';
            msg.innerText = '아쉬워요! 정답 순서는 ' + sizeLogicState.correctOrder.join(' → ') + ' 였어요.';
            document.getElementById('mainArea').insertAdjacentHTML('beforeend',
                '<div class="options-grid">' +
                '<button class="action-btn" onclick="retrySizeLogicRound()">다시 풀어보기 🔁</button>' +
                '<button class="action-btn secondary" onclick="restartSizeLogic()">처음부터 풀기 🔄</button>' +
                '</div>');
        }
    } else {
        renderSizeLogic();
    }
}
function retrySizeLogicRound() {
    sizeLogicState.picked = [];
    sizeLogicState.checked = false;
    renderSizeLogic();
}
function restartSizeLogic() { sizeLogicRound = 1; sizeLogicCorrect = 0; generateSizeLogicRound(); }
function nextSizeLogicRound() { sizeLogicRound++; generateSizeLogicRound(); }

// ===================== 27. 논리: 거울 대칭 완성하기 =====================
var mirrorState = {};
var mirrorRound = 1, mirrorCorrect = 0;
function initMirrorSymmetry() { mirrorRound = 1; mirrorCorrect = 0; generateMirrorRound(); }
function generateMirrorRound() {
    var halfW = 3, h = 4;
    var w = halfW * 2;
    var filledLeft = [];
    var count = getRandomInt(3, 5);
    var guard = 0;
    while (filledLeft.length < count && guard < 100) {
        guard++;
        var x = getRandomInt(0, halfW - 1), y = getRandomInt(0, h - 1);
        var exists = filledLeft.some(function (c) { return c.x === x && c.y === y; });
        if (!exists) filledLeft.push({ x: x, y: y });
    }
    var correctRight = filledLeft.map(function (c) { return { x: w - 1 - c.x, y: c.y }; });
    mirrorState = { w: w, h: h, halfW: halfW, filledLeft: filledLeft, correctRight: correctRight, selected: [], finished: false };
    renderMirrorSymmetry();
}
function clickMirrorCell(x, y) {
    if (mirrorState.finished) return;
    if (x < mirrorState.halfW) return;
    vibrateShort();
    var already = mirrorState.selected.some(function (c) { return c.x === x && c.y === y; });
    if (already) return;
    var isCorrect = mirrorState.correctRight.some(function (c) { return c.x === x && c.y === y; });
    if (isCorrect) {
        mirrorState.selected.push({ x: x, y: y });
        if (mirrorState.selected.length === mirrorState.correctRight.length) {
            mirrorState.finished = true;
            mirrorCorrect++;
            renderMirrorSymmetry();
            var msg = document.getElementById('mirrorMsg');
            msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 완벽한 대칭을 만들었어요!';
            document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextMirrorRound()', 'retryMirrorRound()', 'initMirrorSymmetry()'));
            return;
        }
        renderMirrorSymmetry();
    } else {
        var msg2 = document.getElementById('mirrorMsg');
        msg2.className = 'msg-box bad'; msg2.style.display = 'block'; msg2.innerText = '음... 대칭 위치가 아니에요. 다시 찾아보세요!';
    }
}
function nextMirrorRound() { mirrorRound++; generateMirrorRound(); }
function retryMirrorRound() { mirrorState.selected = []; mirrorState.finished = false; renderMirrorSymmetry(); }
function renderMirrorSymmetry() {
    var html = '<div class="game-title-box">🪞 거울 대칭 완성하기</div>';
    html += '<div class="game-sub-desc">왼쪽 그림과 거울처럼 똑같이 되도록, 오른쪽에서 알맞은 칸을 클릭하세요!</div>';
    html += '<div class="status-row"><div>' + mirrorRound + '라운드</div><div>정답: ' + mirrorCorrect + ' / ' + (mirrorRound - 1) + '</div></div>';
    html += '<div class="maze-wrap"><div class="maze-grid" style="grid-template-columns: repeat(' + mirrorState.w + ', 34px);">';
    for (var y = 0; y < mirrorState.h; y++) {
        for (var x = 0; x < mirrorState.w; x++) {
            var isLeftFilled = mirrorState.filledLeft.some(function (c) { return c.x === x && c.y === y; });
            var isSelected = mirrorState.selected.some(function (c) { return c.x === x && c.y === y; });
            var isMirrorLine = x === mirrorState.halfW - 1;
            var bg = '#f8fafc';
            if (x < mirrorState.halfW && isLeftFilled) bg = '#8b5cf6';
            if (x >= mirrorState.halfW && isSelected) bg = '#8b5cf6';
            var borderRight = isMirrorLine ? '3px dashed #94a3b8' : '1px solid #e2e8f0';
            html += '<div class="maze-cell" style="background:' + bg + '; border-right:' + borderRight + '; cursor:pointer;" onclick="clickMirrorCell(' + x + ',' + y + ')"></div>';
        }
    }
    html += '</div></div>';
    html += '<div id="mirrorMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 28. 논리: 참/거짓 명제 추론 (인적성검사 스타일) =====================
var syllogismState = {};
var syllogismRound = 1, syllogismCorrect = 0;
function initSyllogism() { syllogismRound = 1; syllogismCorrect = 0; generateSyllogismRound(); }
function generateSyllogismRound() {
    var items = pickN(ICON_POOL, 4);
    var type = pickRandom(['valid', 'invalid', 'unknown']);
    var premise1, premise2, conclusion, answer;
    if (type === 'valid') {
        premise1 = items[0] + '는(은) ' + items[1] + '보다 커요.';
        premise2 = items[1] + '는(은) ' + items[2] + '보다 커요.';
        conclusion = items[0] + '는(은) ' + items[2] + '보다 크다.';
        answer = '맞다';
    } else if (type === 'invalid') {
        premise1 = items[0] + '는(은) ' + items[1] + '보다 커요.';
        premise2 = items[1] + '는(은) ' + items[2] + '보다 커요.';
        conclusion = items[2] + '는(은) ' + items[0] + '보다 크다.';
        answer = '틀리다';
    } else {
        premise1 = items[0] + '는(은) ' + items[1] + '보다 커요.';
        premise2 = items[2] + '는(은) ' + items[3] + '보다 커요.';
        conclusion = items[0] + '는(은) ' + items[3] + '보다 크다.';
        answer = '알 수 없다';
    }
    syllogismState = { premise1: premise1, premise2: premise2, conclusion: conclusion, answer: answer, answered: false };
    renderSyllogism();
}
function renderSyllogism() {
    var html = '<div class="game-title-box">🧠 참/거짓 명제 추론</div>';
    html += '<div class="game-sub-desc">아래 단서 두 개를 보고, 마지막 문장이 맞는지 틀리는지 알 수 없는지 골라보세요!</div>';
    html += '<div class="status-row"><div>' + syllogismRound + '라운드</div><div>정답: ' + syllogismCorrect + ' / ' + (syllogismRound - 1) + '</div></div>';
    html += '<div class="msg-box" style="display:block; background:#f8fafc; border-color:#e5e7eb; text-align:left; line-height:1.9;">';
    html += '단서1: ' + syllogismState.premise1 + '<br>';
    html += '단서2: ' + syllogismState.premise2;
    html += '</div>';
    html += '<div class="game-sub-desc" style="text-align:center; font-weight:800;">➡️ ' + syllogismState.conclusion + '</div>';
    html += '<div class="options-grid" style="grid-template-columns: repeat(3, 1fr);">';
    ['맞다', '틀리다', '알 수 없다'].forEach(function (opt) {
        html += '<button class="opt-btn text-opt" onclick="checkSyllogism(this,\'' + opt + '\')">' + opt + '</button>';
    });
    html += '</div>';
    html += '<div id="syllogismMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}
function checkSyllogism(btn, guess) {
    if (syllogismState.answered) return;
    syllogismState.answered = true;
    vibrateShort();
    var buttons = document.querySelectorAll('.opt-btn');
    var msg = document.getElementById('syllogismMsg');
    if (guess === syllogismState.answer) {
        btn.classList.add('correct');
        syllogismCorrect++;
        msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 정답이에요!';
    } else {
        btn.classList.add('wrong');
        buttons.forEach(function (b) { if (b.innerText === syllogismState.answer) b.classList.add('correct'); });
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아쉬워요! 정답은 "' + syllogismState.answer + '" 였어요.';
    }
    syllogismRound++;
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('generateSyllogismRound()', 'retrySyllogismRound()', 'initSyllogism()'));
}
function retrySyllogismRound() { syllogismState.answered = false; renderSyllogism(); }

// ===================== 29. 논리: 숫자 규칙 추리 (인적성검사 스타일) =====================
var numSeqState = {};
var numSeqRound = 1, numSeqCorrect = 0;
function initNumSeq() { numSeqRound = 1; numSeqCorrect = 0; generateNumSeqRound(); }
function generateNumSeqRound() {
    var ruleType = pickRandom(['add', 'sub', 'mul', 'alt']);
    var seq = [];
    var k = getRandomInt(2, 5);
    var ruleText = '';
    if (ruleType === 'add') {
        var start = getRandomInt(1, 10);
        for (var i = 0; i < 5; i++) seq.push(start + k * i);
        ruleText = '규칙: ' + start + '에서 시작해서 숫자가 ' + k + '씩 커져요. (+' + k + ')';
    } else if (ruleType === 'sub') {
        var start2 = getRandomInt(30, 50);
        for (var i2 = 0; i2 < 5; i2++) seq.push(start2 - k * i2);
        ruleText = '규칙: ' + start2 + '에서 시작해서 숫자가 ' + k + '씩 작아져요. (-' + k + ')';
    } else if (ruleType === 'mul') {
        var v = getRandomInt(1, 3);
        var m = pickRandom([2, 3]);
        var mulStart = v;
        for (var i3 = 0; i3 < 5; i3++) { seq.push(v); v *= m; }
        ruleText = '규칙: ' + mulStart + '에서 시작해서 숫자가 ' + m + '배씩 커져요. (×' + m + ')';
    } else {
        var a = getRandomInt(3, 6), b = getRandomInt(1, 3);
        var v2 = getRandomInt(5, 10);
        seq.push(v2);
        for (var i4 = 1; i4 < 5; i4++) { v2 = (i4 % 2 === 1) ? v2 + a : v2 - b; seq.push(v2); }
        ruleText = '규칙: 번갈아가며 ' + a + '을(를) 더하고(+' + a + '), ' + b + '을(를) 빼요(-' + b + ').';
    }
    var shown = seq.slice(0, 4);
    var answer = seq[4];
    var options = [answer];
    [1, -1, 2, -2].forEach(function (d) {
        var v3 = answer + d;
        if (options.indexOf(v3) === -1 && options.length < 4) options.push(v3);
    });
    while (options.length < 4) { options.push(options[options.length - 1] + 1); }
    numSeqState = { shown: shown, answer: answer, ruleText: ruleText, fullSeq: seq, options: shuffleArray(options), answered: false };
    renderNumSeq();
}
function renderNumSeq() {
    var html = '<div class="game-title-box">🔢 숫자 규칙 추리</div>';
    html += '<div class="game-sub-desc">숫자들 사이의 규칙을 찾아서, 물음표에 들어갈 숫자를 맞혀보세요!</div>';
    html += '<div class="status-row"><div>' + numSeqRound + '라운드</div><div>정답: ' + numSeqCorrect + ' / ' + (numSeqRound - 1) + '</div></div>';
    html += '<div class="big-display" style="font-size:2rem; letter-spacing:0.2rem;">' + numSeqState.shown.join(',  ') + ',  ?</div>';
    html += '<div class="options-grid">';
    numSeqState.options.forEach(function (opt, idx) {
        html += '<button class="opt-btn text-opt" onclick="checkNumSeq(this,' + idx + ')">' + opt + '</button>';
    });
    html += '</div>';
    html += '<div id="numSeqMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}
function checkNumSeq(btn, idx) {
    if (numSeqState.answered) return;
    numSeqState.answered = true;
    vibrateShort();
    var buttons = document.querySelectorAll('.opt-btn');
    var opt = numSeqState.options[idx];
    var msg = document.getElementById('numSeqMsg');
    if (opt === numSeqState.answer) {
        btn.classList.add('correct');
        numSeqCorrect++;
        msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 정답이에요!';
    } else {
        btn.classList.add('wrong');
        buttons.forEach(function (b, i) { if (numSeqState.options[i] === numSeqState.answer) b.classList.add('correct'); });
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아쉬워요! 정답은 ' + numSeqState.answer + '였어요.';
    }
    document.getElementById('mainArea').insertAdjacentHTML('beforeend',
        '<div class="msg-box" style="display:block; background:#f8fafc; border-color:#e5e7eb; text-align:left;">' +
        numSeqState.ruleText + '<br>전체 숫자: ' + numSeqState.fullSeq.join(', ') +
        '</div>');
    numSeqRound++;
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('generateNumSeqRound()', 'retryNumSeqRound()', 'initNumSeq()'));
}
function retryNumSeqRound() { numSeqState.answered = false; renderNumSeq(); }

// ===================== 30. 논리: 무게 저울 추론하기 =====================
var weightState = {};
var weightRound = 1, weightCorrect = 0;
function initWeightScale() { weightRound = 1; weightCorrect = 0; generateWeightRound(); }
function renderWeightClueRow(iconLeft, iconRight, count) {
    var html = '<div class="row-display" style="margin-bottom:0.6rem;">';
    html += '<div class="row-box">' + iconLeft + '</div>';
    html += '<div style="display:flex; align-items:center; font-weight:800; font-size:1.3rem;">=</div>';
    for (var i = 0; i < count; i++) { html += '<div class="row-box">' + iconRight + '</div>'; }
    html += '</div>';
    return html;
}
function generateWeightRound() {
    var items = pickN(ICON_POOL, 3);
    var r1 = pickRandom([2, 3]);
    var r2 = pickRandom([2, 3]);
    var answer = r1 * r2;
    var options = [answer];
    [r1 + r2, r1, r2, answer + 1, answer - 1].forEach(function (v) {
        if (v > 0 && options.indexOf(v) === -1 && options.length < 4) options.push(v);
    });
    while (options.length < 4) { options.push(options[options.length - 1] + 1); }
    weightState = { items: items, r1: r1, r2: r2, answer: answer, options: shuffleArray(options), answered: false };
    renderWeightScale();
}
function renderWeightScale() {
    var html = '<div class="game-title-box">⚖️ 무게 저울 추론하기</div>';
    html += '<div class="game-sub-desc">저울이 수평을 이루는 단서 두 개를 보고, 물음표에 들어갈 개수를 추론해보세요!</div>';
    html += '<div class="status-row"><div>' + weightRound + '라운드</div><div>정답: ' + weightCorrect + ' / ' + (weightRound - 1) + '</div></div>';
    html += renderWeightClueRow(weightState.items[0], weightState.items[1], weightState.r1);
    html += renderWeightClueRow(weightState.items[1], weightState.items[2], weightState.r2);
    html += '<div class="game-sub-desc" style="text-align:center; font-weight:800;">그렇다면 ' + weightState.items[0] + ' 1개는 ' + weightState.items[2] + ' 몇 개와 같을까요?</div>';
    html += '<div class="options-grid">';
    weightState.options.forEach(function (opt, idx) {
        html += '<button class="opt-btn text-opt" onclick="checkWeightScale(this,' + idx + ')">' + weightState.items[2] + ' ' + opt + '개</button>';
    });
    html += '</div>';
    html += '<div id="weightMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}
function checkWeightScale(btn, idx) {
    if (weightState.answered) return;
    weightState.answered = true;
    vibrateShort();
    var buttons = document.querySelectorAll('.opt-btn');
    var opt = weightState.options[idx];
    var msg = document.getElementById('weightMsg');
    if (opt === weightState.answer) {
        btn.classList.add('correct');
        weightCorrect++;
        msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 정답이에요! ' + weightState.r1 + ' × ' + weightState.r2 + ' = ' + weightState.answer + '개예요.';
    } else {
        btn.classList.add('wrong');
        buttons.forEach(function (b, i) { if (weightState.options[i] === weightState.answer) b.classList.add('correct'); });
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아쉬워요! 정답은 ' + weightState.answer + '개였어요. (' + weightState.r1 + ' × ' + weightState.r2 + ')';
    }
    weightRound++;
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('generateWeightRound()', 'retryWeightRound()', 'initWeightScale()'));
}
function retryWeightRound() { weightState.answered = false; renderWeightScale(); }

// ===================== 31. 논리: 스도쿠 퍼즐 라이트 =====================
var SUDOKU_BASE = [[0, 1, 2, 3], [2, 3, 0, 1], [1, 0, 3, 2], [3, 2, 1, 0]];
var SUDOKU_HINT_MAP = { low: 3, mid: 2, high: 1, extreme: 0 };
var sudokuSettings = { level: 'low', timeLimit: 20 };
var sudokuState = {};
var sudokuRound = 1, sudokuCorrect = 0;
function initSudokuLite() { renderSudokuSetup(); }
function renderSudokuSetup() {
    var levels = [
        { v: 'low', l: '하 (힌트 3개)' },
        { v: 'mid', l: '중 (힌트 2개)' },
        { v: 'high', l: '상 (힌트 1개)' },
        { v: 'extreme', l: '최상 (힌트 없음)' }
    ];
    var html = '<div class="game-title-box">🧮 스도쿠 퍼즐 라이트</div>';
    html += '<div class="game-sub-desc">난이도를 골라 시작해보세요! 난이도에 따라 사용할 수 있는 힌트 개수가 달라져요.</div>';
    html += '<div class="setup-section-label">난이도</div><div class="setup-btn-group">';
    levels.forEach(function (t) {
        html += '<button class="setup-btn' + (sudokuSettings.level === t.v ? ' active' : '') + '" onclick="setSudokuLevel(\'' + t.v + '\')">' + t.l + '</button>';
    });
    html += '</div>';
    var times = [{ v: 20, l: '20초' }, { v: 40, l: '40초' }, { v: 60, l: '60초' }, { v: 0, l: '무제한' }];
    html += '<div class="setup-section-label">제한시간</div><div class="setup-btn-group">';
    times.forEach(function (t) {
        html += '<button class="setup-btn' + (sudokuSettings.timeLimit === t.v ? ' active' : '') + '" onclick="setSudokuTimeLimit(' + t.v + ')">' + t.l + '</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startSudokuSession()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function setSudokuLevel(v) { sudokuSettings.level = v; renderSudokuSetup(); }
function setSudokuTimeLimit(v) { sudokuSettings.timeLimit = v; renderSudokuSetup(); }
function startSudokuSession() { sudokuRound = 1; sudokuCorrect = 0; generateSudokuRound(); }
function startSudokuTimer() {
    var bar = document.getElementById('sudokuTimerBar');
    if (bar) bar.style.width = (sudokuState.timeLeft / sudokuState.timeLimit * 100) + '%';
    sudokuState.timerId = setInterval(function () {
        sudokuState.timeLeft -= 0.1;
        var b = document.getElementById('sudokuTimerBar');
        if (b) b.style.width = Math.max(0, sudokuState.timeLeft / sudokuState.timeLimit * 100) + '%';
        if (sudokuState.timeLeft <= 0) { handleSudokuTimeout(); }
    }, 100);
    activeTimers.push(sudokuState.timerId);
}
function handleSudokuTimeout() {
    if (sudokuState.timedOut || sudokuState.checked) return;
    if (sudokuState.timerId) { clearInterval(sudokuState.timerId); sudokuState.timerId = null; }
    sudokuState.timedOut = true;
    renderSudoku();
}
function generateSudokuSolution() {
    var grid = SUDOKU_BASE.map(function (row) { return row.slice(); });
    var perm = shuffleArray([0, 1, 2, 3]);
    grid = grid.map(function (row) { return row.map(function (v) { return perm[v]; }); });
    if (Math.random() < 0.5) { var t = grid[0]; grid[0] = grid[1]; grid[1] = t; }
    if (Math.random() < 0.5) { var t2 = grid[2]; grid[2] = grid[3]; grid[3] = t2; }
    if (Math.random() < 0.5) { var b0 = grid[0], b1 = grid[1]; grid[0] = grid[2]; grid[1] = grid[3]; grid[2] = b0; grid[3] = b1; }
    if (Math.random() < 0.5) { grid.forEach(function (row) { var t3 = row[0]; row[0] = row[1]; row[1] = t3; }); }
    if (Math.random() < 0.5) { grid.forEach(function (row) { var t4 = row[2]; row[2] = row[3]; row[3] = t4; }); }
    if (Math.random() < 0.5) { grid.forEach(function (row) { var a = row[0], b = row[1]; row[0] = row[2]; row[1] = row[3]; row[2] = a; row[3] = b; }); }
    if (Math.random() < 0.5) {
        var tg = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        for (var r = 0; r < 4; r++) { for (var c = 0; c < 4; c++) { tg[c][r] = grid[r][c]; } }
        grid = tg;
    }
    return grid;
}
function generateSudokuRound() {
    var solution = generateSudokuSolution();
    var icons = pickN(ICON_POOL, 4);
    var blankPositions = pickN(Array.from({ length: 16 }, function (_, i) { return i; }), 8);
    var editable = [[false, false, false, false], [false, false, false, false], [false, false, false, false], [false, false, false, false]];
    var userGrid = solution.map(function (row) { return row.slice(); });
    blankPositions.forEach(function (pos) {
        var r = Math.floor(pos / 4), c = pos % 4;
        editable[r][c] = true;
        userGrid[r][c] = null;
    });
    if (sudokuState.timerId) { clearInterval(sudokuState.timerId); }
    sudokuState = {
        solution: solution, icons: icons, editable: editable, userGrid: userGrid,
        origUserGrid: userGrid.map(function (row) { return row.slice(); }),
        checked: false, wrongCells: [],
        hintsRemaining: SUDOKU_HINT_MAP[sudokuSettings.level], hintMode: false, hintedCells: [],
        timeLimit: sudokuSettings.timeLimit, timeLeft: sudokuSettings.timeLimit, timerId: null, timedOut: false
    };
    renderSudoku();
    if (sudokuState.timeLimit > 0) { startSudokuTimer(); }
}
function useSudokuHint() {
    if (sudokuState.timedOut) return;
    if (sudokuState.checked || sudokuState.hintMode || sudokuState.hintsRemaining <= 0) return;
    sudokuState.hintMode = true;
    renderSudoku();
}
function sudokuCellClick(r, c) {
    if (sudokuState.timedOut) return;
    if (sudokuState.checked) return;
    if (!sudokuState.editable[r][c]) return;
    if (sudokuState.hintedCells.indexOf(r + ',' + c) > -1) return;
    if (sudokuState.hintMode) {
        vibrateShort();
        sudokuState.userGrid[r][c] = sudokuState.solution[r][c];
        sudokuState.hintedCells.push(r + ',' + c);
        sudokuState.hintsRemaining--;
        sudokuState.hintMode = false;
        sudokuState.wrongCells = [];
        renderSudoku();
        return;
    }
    vibrateShort();
    var cur = sudokuState.userGrid[r][c];
    sudokuState.userGrid[r][c] = (cur === null) ? 0 : (cur + 1) % 4;
    sudokuState.wrongCells = [];
    renderSudoku();
}
function checkSudoku() {
    if (sudokuState.timedOut) return;
    if (sudokuState.checked) return;
    var allFilled = true;
    for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
            if (sudokuState.editable[r][c] && sudokuState.userGrid[r][c] === null) allFilled = false;
        }
    }
    var msg = document.getElementById('sudokuMsg');
    if (!allFilled) {
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아직 빈칸이 남아있어요! 모두 채워주세요.';
        return;
    }
    var wrongCells = [];
    for (var r2 = 0; r2 < 4; r2++) {
        for (var c2 = 0; c2 < 4; c2++) {
            if (sudokuState.editable[r2][c2] && sudokuState.userGrid[r2][c2] !== sudokuState.solution[r2][c2]) {
                wrongCells.push(r2 + ',' + c2);
            }
        }
    }
    if (wrongCells.length === 0) {
        sudokuState.checked = true;
        if (sudokuState.timerId) { clearInterval(sudokuState.timerId); sudokuState.timerId = null; }
        sudokuCorrect++;
        renderSudoku();
        msg = document.getElementById('sudokuMsg');
        msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 완벽해요! 규칙에 맞게 모두 채웠어요.';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextSudokuRound()', 'retrySudokuRound()', 'renderSudokuSetup()'));
    } else {
        sudokuState.wrongCells = wrongCells;
        renderSudoku();
        msg = document.getElementById('sudokuMsg');
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아직 틀린 칸이 있어요! 빨간 테두리 칸을 다시 눌러 바꿔보세요.';
    }
}
function nextSudokuRound() { sudokuRound++; generateSudokuRound(); }
function retrySudokuRound() {
    if (sudokuState.timerId) { clearInterval(sudokuState.timerId); }
    sudokuState.userGrid = sudokuState.origUserGrid.map(function (row) { return row.slice(); });
    sudokuState.checked = false;
    sudokuState.wrongCells = [];
    sudokuState.hintMode = false;
    sudokuState.hintedCells = [];
    sudokuState.hintsRemaining = SUDOKU_HINT_MAP[sudokuSettings.level];
    sudokuState.timeLeft = sudokuState.timeLimit;
    sudokuState.timerId = null;
    sudokuState.timedOut = false;
    renderSudoku();
    if (sudokuState.timeLimit > 0) { startSudokuTimer(); }
}
function renderSudoku() {
    var html = '<div class="game-title-box">🧮 스도쿠 퍼즐 라이트</div>';
    html += '<div class="game-sub-desc">가로줄, 세로줄, 굵은 선으로 나뉜 2×2 상자 안에 같은 그림이 두 번 나오지 않도록 빈칸을 채워보세요! 빈칸을 누르면 그림이 바뀌어요.</div>';
    html += '<div class="status-row"><div>' + sudokuRound + '라운드</div><div>정답: ' + sudokuCorrect + ' / ' + (sudokuRound - 1) + '</div></div>';
    if (sudokuState.timeLimit > 0 && !sudokuState.checked && !sudokuState.timedOut) {
        html += '<div class="timer-container"><div class="timer-bar" id="sudokuTimerBar" style="width:' + (sudokuState.timeLeft / sudokuState.timeLimit * 100) + '%;"></div></div>';
    }
    if (sudokuState.timedOut) {
        html += '<div class="msg-box bad" style="display:block;">⏰ 시간이 다 됐어요!</div>';
    }
    if (sudokuState.hintMode) {
        html += '<div class="msg-box" style="display:block; background:#f5f3ff; border-color:#c4b5fd; color:#5b21b6;">💡 정답을 표시하고 싶은 칸을 선택하세요!</div>';
    }
    html += '<div class="matrix-grid" style="grid-template-columns: repeat(4, 60px);">';
    for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
            var isEditable = sudokuState.editable[r][c];
            var isHinted = sudokuState.hintedCells.indexOf(r + ',' + c) > -1;
            var val = sudokuState.userGrid[r][c];
            var content = (val === null) ? '?' : sudokuState.icons[val];
            var isWrong = sudokuState.wrongCells.indexOf(r + ',' + c) > -1;
            var clickable = isEditable && !isHinted && !sudokuState.timedOut;
            var cls = 'matrix-cell' + ((isEditable && val === null) ? ' blank' : '');
            var styleParts = [];
            if (c === 1) styleParts.push('border-right:3px solid #334155');
            if (r === 1) styleParts.push('border-bottom:3px solid #334155');
            if (clickable) styleParts.push('cursor:pointer');
            if (sudokuState.hintMode && clickable) { styleParts.push('border-color:#8b5cf6'); styleParts.push('background:#f5f3ff'); }
            if (isHinted) { styleParts.push('border-color:#eab308'); styleParts.push('background:#fef9c3'); }
            if (isWrong) { styleParts.push('border-color:#ef4444'); styleParts.push('background:#fee2e2'); }
            var styleAttr = styleParts.length ? ' style="' + styleParts.join(';') + ';"' : '';
            var onclickAttr = clickable ? ' onclick="sudokuCellClick(' + r + ',' + c + ')"' : '';
            html += '<div class="' + cls + '"' + styleAttr + onclickAttr + '>' + content + '</div>';
        }
    }
    html += '</div>';
    if (sudokuState.timedOut) {
        html += '<div class="options-grid">';
        html += '<button class="action-btn" onclick="retrySudokuRound()">다시 시도 🔁</button>';
        html += '<button class="action-btn secondary" onclick="renderSudokuSetup()">처음부터 ⏮</button>';
        html += '</div>';
        html += '<div id="sudokuMsg" class="msg-box"></div>';
        document.getElementById('mainArea').innerHTML = html;
        return;
    }
    html += '<div class="options-grid">';
    html += '<button class="action-btn" ' + (sudokuState.checked ? 'disabled' : '') + ' onclick="checkSudoku()">확인하기 ✅</button>';
    var hintDisabled = sudokuState.checked || sudokuState.hintMode || sudokuState.hintsRemaining <= 0;
    var hintStyle = sudokuState.hintsRemaining > 0 ? 'background:#8b5cf6;' : 'background:#d1d5db; color:#9ca3af;';
    html += '<button class="action-btn" style="' + hintStyle + '" ' + (hintDisabled ? 'disabled' : '') + ' onclick="useSudokuHint()">💡 힌트 (' + sudokuState.hintsRemaining + '개 남음)</button>';
    html += '</div>';
    html += '<div class="options-grid">';
    html += '<button class="action-btn secondary" onclick="generateSudokuRound()">새 퍼즐 🔄</button>';
    html += '<button class="action-btn secondary" onclick="renderSudokuSetup()">난이도 변경 ⚙️</button>';
    html += '</div>';
    html += '<div id="sudokuMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 32. 논리: 범인을 찾아라! =====================
var SUSPECT_COLOR_HEX = { '빨강': '#ef4444', '파랑': '#3b82f6', '노랑': '#eab308' };
var SUSPECT_SKIN_TONES = ['#fbbf77', '#f3ae6d', '#e8965a', '#c97b4a'];
var SUSPECT_COLORS = ['빨강', '파랑', '노랑'];
function buildSuspectSVG(s) {
    var shirtColor = SUSPECT_COLOR_HEX[s.color];
    var svg = '<svg viewBox="0 0 80 92" xmlns="http://www.w3.org/2000/svg" style="width:60px; height:70px;">';
    svg += '<rect x="14" y="46" width="52" height="42" rx="12" fill="' + shirtColor + '" />';
    svg += '<circle cx="40" cy="30" r="22" fill="' + s.skin + '" />';
    if (s.glasses) {
        svg += '<circle cx="30" cy="31" r="8" fill="rgba(255,255,255,0.4)" stroke="#1f2937" stroke-width="3" />';
        svg += '<circle cx="50" cy="31" r="8" fill="rgba(255,255,255,0.4)" stroke="#1f2937" stroke-width="3" />';
        svg += '<line x1="38" y1="31" x2="42" y2="31" stroke="#1f2937" stroke-width="3" />';
    } else {
        svg += '<circle cx="30" cy="30" r="2.5" fill="#1f2937" />';
        svg += '<circle cx="50" cy="30" r="2.5" fill="#1f2937" />';
    }
    svg += '<path d="M 30 41 Q 40 47 50 41" stroke="#7c4a24" stroke-width="2.5" fill="none" stroke-linecap="round" />';
    if (s.hat) {
        svg += '<path d="M 14 20 Q 40 -8 66 20 Z" fill="#374151" />';
        svg += '<rect x="9" y="18" width="62" height="7" rx="3.5" fill="#374151" />';
    }
    svg += '</svg>';
    return svg;
}
var suspectSettings = { count: 6, timeLimit: 0 };
var suspectState = {};
var suspectRound = 1, suspectCorrect = 0;
function initSuspectLogic() { renderSuspectSetup(); }
function renderSuspectSetup() {
    var counts = [{ v: 6, l: '6명' }, { v: 8, l: '8명' }, { v: 10, l: '10명' }, { v: 'random', l: '무작위' }];
    var times = [{ v: 5, l: '5초' }, { v: 10, l: '10초' }, { v: 20, l: '20초' }, { v: 0, l: '무제한' }];
    var html = '<div class="game-title-box">🕵️ 범인을 찾아라!</div>';
    html += '<div class="game-sub-desc">난이도를 골라 시작해보세요!</div>';
    html += '<div class="setup-section-label">용의자 수</div><div class="setup-btn-group">';
    counts.forEach(function (c) { html += '<button class="setup-btn' + (suspectSettings.count === c.v ? ' active' : '') + '" onclick="setSuspectCount(' + (c.v === 'random' ? "'random'" : c.v) + ')">' + c.l + '</button>'; });
    html += '</div>';
    html += '<div class="setup-section-label">제한 시간</div><div class="setup-btn-group">';
    times.forEach(function (t) { html += '<button class="setup-btn' + (suspectSettings.timeLimit === t.v ? ' active' : '') + '" onclick="setSuspectTimeLimit(' + t.v + ')">' + t.l + '</button>'; });
    html += '</div>';
    html += '<button class="action-btn" onclick="startSuspectSession()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function setSuspectCount(v) { suspectSettings.count = v; renderSuspectSetup(); }
function setSuspectTimeLimit(v) { suspectSettings.timeLimit = v; renderSuspectSetup(); }
function startSuspectSession() { suspectRound = 1; suspectCorrect = 0; generateSuspectRound(); }
function generateSuspects(n) {
    var combos = [];
    [true, false].forEach(function (hat) {
        [true, false].forEach(function (glasses) {
            SUSPECT_COLORS.forEach(function (color) { combos.push({ hat: hat, glasses: glasses, color: color }); });
        });
    });
    var chosenCombos = pickN(combos, n);
    var skins = [];
    for (var i = 0; i < n; i++) { skins.push(pickRandom(SUSPECT_SKIN_TONES)); }
    return chosenCombos.map(function (c, idx) { return { id: idx, skin: skins[idx], hat: c.hat, glasses: c.glasses, color: c.color, eliminated: false }; });
}
function buildClueOptions(ans) {
    var options = [];
    options.push({ text: ans.hat ? '모자를 쓰고 있어요' : '모자를 쓰지 않았어요', test: function (s) { return s.hat === ans.hat; } });
    options.push({ text: ans.glasses ? '안경을 쓰고 있어요' : '안경을 쓰지 않았어요', test: function (s) { return s.glasses === ans.glasses; } });
    options.push({ text: ans.color + ' 옷을 입고 있어요', test: function (s) { return s.color === ans.color; } });
    SUSPECT_COLORS.forEach(function (c) {
        if (c !== ans.color) { options.push({ text: c + ' 옷을 입지 않았어요', test: function (s) { return s.color !== c; } }); }
    });
    return options;
}
function generateSuspectClues(suspects, ans) {
    var remaining = suspects.slice();
    var clues = [];
    var usedText = {};
    var guard = 0;
    while (remaining.length > 1 && guard < 20) {
        guard++;
        var options = buildClueOptions(ans).filter(function (o) { return !usedText[o.text]; });
        var best = null, bestElim = -1;
        options.forEach(function (o) {
            var elim = remaining.filter(function (s) { return !o.test(s); }).length;
            if (elim > bestElim) { bestElim = elim; best = o; }
        });
        if (!best || bestElim <= 0) break;
        usedText[best.text] = true;
        clues.push(best.text);
        remaining = remaining.filter(function (s) { return best.test(s); });
    }
    return clues;
}
function generateSuspectRound() {
    var n = suspectSettings.count === 'random' ? pickRandom([6, 8, 10]) : suspectSettings.count;
    var suspects = generateSuspects(n);
    var answerId = pickRandom(suspects.map(function (s) { return s.id; }));
    var ans = suspects.filter(function (s) { return s.id === answerId; })[0];
    var clues = generateSuspectClues(suspects, ans);
    suspectState = {
        suspects: suspects, clues: clues, clueIndex: 0, answerId: answerId, checked: false, success: false,
        timeLimit: suspectSettings.timeLimit, timeLeft: suspectSettings.timeLimit, timerId: null, timedOut: false
    };
    renderSuspectLogic();
    if (suspectSettings.timeLimit > 0) { startSuspectTimer(); }
}
function startSuspectTimer() {
    var bar = document.getElementById('suspectTimerBar');
    if (bar) bar.style.width = '100%';
    suspectState.timerId = setInterval(function () {
        suspectState.timeLeft -= 0.1;
        var pct = (suspectState.timeLeft / suspectState.timeLimit) * 100;
        if (pct < 0) pct = 0;
        var b = document.getElementById('suspectTimerBar');
        if (b) b.style.width = pct + '%';
        if (suspectState.timeLeft <= 0) {
            clearInterval(suspectState.timerId);
            handleSuspectTimeout();
        }
    }, 100);
    activeTimers.push(suspectState.timerId);
}
function handleSuspectTimeout() {
    if (suspectState.checked || suspectState.timedOut) return;
    suspectState.timedOut = true;
    renderSuspectLogic();
    var msg = document.getElementById('suspectMsg');
    var ans = suspectState.suspects.filter(function (s) { return s.id === suspectState.answerId; })[0];
    msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '⏰ 시간이 다 됐어요! 범인은 노란 테두리로 표시된 용의자였어요.';
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextSuspectRound()', 'retrySuspectRound()', 'restartSuspectLogic()'));
}
function restartSuspectLogic() { renderSuspectSetup(); }
function nextSuspectRound() { suspectRound++; generateSuspectRound(); }
function retrySuspectRound() {
    suspectState.checked = false;
    suspectState.success = false;
    suspectState.timedOut = false;
    suspectState.clueIndex = 0;
    suspectState.suspects.forEach(function (s) { s.eliminated = false; });
    renderSuspectLogic();
    if (suspectState.timeLimit > 0) { suspectState.timeLeft = suspectState.timeLimit; startSuspectTimer(); }
}
function toggleSuspectEliminate(id) {
    if (suspectState.checked || suspectState.timedOut) return;
    vibrateShort();
    var s = suspectState.suspects.filter(function (x) { return x.id === id; })[0];
    s.eliminated = !s.eliminated;
    renderSuspectLogic();
}
function nextSuspectClue() {
    if (suspectState.timedOut) return;
    if (suspectState.clueIndex < suspectState.clues.length - 1) {
        suspectState.clueIndex++;
        renderSuspectLogic();
    }
}
function checkSuspectAnswer() {
    if (suspectState.timedOut) return;
    var active = suspectState.suspects.filter(function (s) { return !s.eliminated; });
    var msg = document.getElementById('suspectMsg');
    if (active.length === 1 && active[0].id === suspectState.answerId) {
        suspectState.checked = true;
        suspectState.success = true;
        suspectCorrect++;
        if (suspectState.timerId) { clearInterval(suspectState.timerId); }
        renderSuspectLogic();
        msg = document.getElementById('suspectMsg');
        msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 범인을 찾았습니다!';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextSuspectRound()', 'retrySuspectRound()', 'restartSuspectLogic()'));
    } else if (active.length === 0) {
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '앗, 모든 용의자를 지워버렸어요! 범인이 사라지면 안 돼요. 다시 살펴보세요.';
    } else if (active.length > 1) {
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아직 용의자가 ' + active.length + '명 남았어요. 단서를 다시 살펴보고 더 지워보세요!';
    } else {
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '이 용의자는 범인이 아니에요! 단서를 다시 살펴보세요.';
    }
}
function renderSuspectLogic() {
    var html = '<div class="game-title-box">🕵️ 범인을 찾아라!</div>';
    html += '<div class="game-sub-desc">단서를 하나씩 확인하면서, 조건에 맞지 않는 용의자를 눌러서 지워보세요! (여러 명을 한 번에 지워도 돼요)</div>';
    html += '<div class="status-row"><div>' + suspectRound + '라운드</div><div>정답: ' + suspectCorrect + ' / ' + (suspectRound - 1) + '</div></div>';
    if (suspectState.timeLimit > 0 && !suspectState.checked && !suspectState.timedOut) {
        html += '<div class="timer-container" style="display:block;"><div class="timer-bar" id="suspectTimerBar"></div></div>';
    }
    var remainCount = suspectState.suspects.filter(function (s) { return !s.eliminated; }).length;
    html += '<div class="status-row"><div>남은 단서: ' + (suspectState.clues.length - suspectState.clueIndex - 1) + '개</div><div>남은 용의자: ' + remainCount + '명</div></div>';
    html += '<div class="msg-box" style="display:block; background:#f8fafc; border-color:#e5e7eb; text-align:left; line-height:1.9;">';
    for (var i = 0; i <= suspectState.clueIndex; i++) { html += '단서 ' + (i + 1) + ': ' + suspectState.clues[i] + '<br>'; }
    html += '</div>';
    html += '<div class="tile-row" style="grid-template-columns: repeat(3, 1fr); gap:0.6rem;">';
    suspectState.suspects.forEach(function (s) {
        var isFlash = ((suspectState.checked && suspectState.success) || suspectState.timedOut) && s.id === suspectState.answerId;
        var cardStyle = 'text-align:center; padding:0.6rem 0.4rem;' + (s.eliminated ? 'opacity:0.3; background:#e5e7eb;' : '') + (isFlash ? 'background:#fef9c3; border-color:#eab308; animation: gearHighlightPulse 1s infinite;' : '');
        var clickAttr = (!suspectState.checked && !suspectState.timedOut) ? ' onclick="toggleSuspectEliminate(' + s.id + ')"' : '';
        html += '<div class="game-tile" style="' + cardStyle + ' cursor:pointer; position:relative;"' + clickAttr + '>';
        html += buildSuspectSVG(s);
        if (s.eliminated) html += '<div style="position:absolute; top:0.3rem; right:0.3rem; font-size:1.1rem; color:#ef4444; font-weight:800;">❌</div>';
        html += '</div>';
    });
    html += '</div>';
    html += '<div class="options-grid">';
    if (suspectState.clueIndex < suspectState.clues.length - 1) {
        html += '<button class="action-btn secondary" ' + (suspectState.timedOut ? 'disabled' : '') + ' onclick="nextSuspectClue()">다음 단서 ▶</button>';
    }
    html += '<button class="action-btn" ' + (suspectState.checked || suspectState.timedOut ? 'disabled' : '') + ' onclick="checkSuspectAnswer()">범인 지목하기 ✅</button>';
    html += '</div>';
    html += '<div id="suspectMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
    if (suspectState.timeLimit > 0 && !suspectState.checked && !suspectState.timedOut) {
        var barEl = document.getElementById('suspectTimerBar');
        if (barEl) barEl.style.width = (suspectState.timeLeft / suspectState.timeLimit * 100) + '%';
    }
}

// ===================== 게임 등록 =====================
GAME_INIT_FNS.patternMatrix = initPatternMatrix;
GAME_INIT_FNS.sizeLogic = initSizeLogic;
GAME_INIT_FNS.mirrorSymmetry = initMirrorSymmetry;
GAME_INIT_FNS.syllogism = initSyllogism;
GAME_INIT_FNS.numSeq = initNumSeq;
GAME_INIT_FNS.weightScale = initWeightScale;
GAME_INIT_FNS.sudokuLite = initSudokuLite;
GAME_INIT_FNS.suspectLogic = initSuspectLogic;
