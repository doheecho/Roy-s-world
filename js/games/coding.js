// ===================== 19. 코딩 사고: 블록코딩 로봇 =====================
var DIRS4 = [
    { name: '오른쪽', dx: 1, dy: 0, wallSide: 'right', arrow: '➡️' },
    { name: '아래', dx: 0, dy: 1, wallSide: 'bottom', arrow: '⬇️' },
    { name: '왼쪽', dx: -1, dy: 0, wallSide: 'left', arrow: '⬅️' },
    { name: '위', dx: 0, dy: -1, wallSide: 'top', arrow: '⬆️' }
];
var BLOCK_TYPES = [
    { type: 'forward', label: '앞으로', shortLabel: '앞으로' },
    { type: 'backward', label: '뒤로', shortLabel: '뒤로' },
    { type: 'turnLeft', label: '왼쪽 돌기', shortLabel: '왼쪽' },
    { type: 'turnRight', label: '오른쪽 돌기', shortLabel: '오른쪽' },
    { type: 'repeatStart', count: 2, label: '🔁 2번 반복 시작', shortLabel: '🔁2' },
    { type: 'repeatStart', count: 3, label: '🔁 3번 반복 시작', shortLabel: '🔁3' },
    { type: 'repeatEnd', label: '⏹ 반복 끝', shortLabel: '⏹' }
];
var blockCodeSettings = { size: 5 };
var blockCodeState = {};
var blockCodeRound = 1, blockCodeSolved = 0;
function initBlockCoding() { renderBlockCodeSetup(); }
function renderBlockCodeSetup() {
    var sizes = [{ v: 5, l: '쉬움 (5×5)' }, { v: 7, l: '보통 (7×7)' }, { v: 9, l: '어려움 (9×9)' }];
    var html = '<div class="game-title-box">🧑‍💻 블록코딩 로봇</div>';
    html += '<div class="game-sub-desc">난이도를 골라 시작해보세요! 명령 블록을 순서대로 쌓아서 캐릭터를 도착지까지 보내는 게임이에요.</div>';
    html += '<div class="setup-section-label">미로 크기</div><div class="setup-btn-group">';
    sizes.forEach(function (t) {
        html += '<button class="setup-btn' + (blockCodeSettings.size === t.v ? ' active' : '') + '" onclick="setBlockCodeSize(' + t.v + ')">' + t.l + '</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startBlockCodeSession()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function setBlockCodeSize(v) { blockCodeSettings.size = v; renderBlockCodeSetup(); }
function startBlockCodeSession() { blockCodeRound = 1; blockCodeSolved = 0; generateBlockCodeRound(); }
function generateBlockCodeRound() {
    var size = blockCodeSettings.size;
    var maze = buildMaze(size, size);
    blockCodeState = {
        maze: maze, w: size, h: size,
        goal: { x: size - 1, y: size - 1 },
        program: [],
        running: false,
        solved: false,
        buggyIndex: null,
        lastErrorMsg: '',
        debugMode: false,
        selectedEditIndex: null,
        lastFailSnapshot: null,
        player: { x: 0, y: 0 },
        facing: 0,
        stepIndex: 0,
        actions: [],
        sourceIndices: []
    };
    renderBlockCoding();
}
function restartBlockCoding() { renderBlockCodeSetup(); }
function nextBlockCodeRound() { blockCodeRound++; generateBlockCodeRound(); }
function retryBlockCoding() {
    blockCodeState.program = [];
    blockCodeState.running = false;
    blockCodeState.solved = false;
    blockCodeState.buggyIndex = null;
    blockCodeState.lastErrorMsg = '';
    blockCodeState.debugMode = false;
    blockCodeState.selectedEditIndex = null;
    blockCodeState.lastFailSnapshot = null;
    blockCodeState.player = { x: 0, y: 0 };
    blockCodeState.facing = 0;
    blockCodeState.stepIndex = 0;
    blockCodeState.actions = [];
    blockCodeState.sourceIndices = [];
    renderBlockCoding();
}
function pickPaletteBlock(idx) {
    if (blockCodeState.running || blockCodeState.solved) return;
    vibrateShort();
    if (blockCodeState.debugMode) {
        var target = blockCodeState.selectedEditIndex;
        blockCodeState.program[target] = BLOCK_TYPES[idx];
        if (target === blockCodeState.buggyIndex) {
            blockCodeState.buggyIndex = null;
            blockCodeState.lastErrorMsg = '';
        }
        blockCodeState.debugMode = false;
        blockCodeState.selectedEditIndex = null;
        renderBlockCoding();
        var msg = document.getElementById('blockCodeMsg');
        msg.className = 'msg-box'; msg.style.display = 'block';
        msg.innerText = '✅ 명령을 바꿨어요! "실행"을 눌러 다시 확인해보세요.';
    } else {
        blockCodeState.program.push(BLOCK_TYPES[idx]);
        renderBlockCoding();
    }
}
function selectDebugSlot(i) {
    if (!blockCodeState.debugMode) return;
    if (blockCodeState.running || blockCodeState.solved) return;
    vibrateShort();
    blockCodeState.selectedEditIndex = i;
    renderBlockCoding();
}
function switchToAddMode() {
    if (blockCodeState.running || blockCodeState.solved) return;
    vibrateShort();
    blockCodeState.debugMode = false;
    blockCodeState.selectedEditIndex = null;
    blockCodeState.lastFailSnapshot = null;
    renderBlockCoding();
}
function toggleDebugMode() {
    if (blockCodeState.buggyIndex === null || blockCodeState.buggyIndex === undefined) return;
    if (blockCodeState.running || blockCodeState.solved) return;
    vibrateShort();
    if (blockCodeState.debugMode) {
        blockCodeState.debugMode = false;
        blockCodeState.selectedEditIndex = null;
        renderBlockCoding();
    } else {
        blockCodeState.debugMode = true;
        blockCodeState.selectedEditIndex = blockCodeState.buggyIndex;
        renderBlockCoding();
        var msg = document.getElementById('blockCodeMsg');
        msg.className = 'msg-box bad'; msg.style.display = 'block';
        msg.innerText = '🔧 변경할 명령 블록을 다시 선택하세요! (노란색이 지금 선택된 블록이에요) 그다음 아래에서 새 명령을 눌러 바꿔보세요.';
    }
}
function undoLastBlockCodeBlock() {
    if (blockCodeState.running || blockCodeState.solved || blockCodeState.debugMode) return;
    vibrateShort();
    blockCodeState.program.pop();
    renderBlockCoding();
}
function expandBlockProgram(program) {
    var result = [];
    var sourceIndices = [];
    var errors = [];
    var i = 0;
    while (i < program.length) {
        var blk = program[i];
        if (blk.type === 'repeatStart') {
            var j = i + 1;
            var body = [];
            var bodyIndices = [];
            var foundEnd = false;
            var nestedError = false;
            while (j < program.length) {
                if (program[j].type === 'repeatEnd') { foundEnd = true; break; }
                if (program[j].type === 'repeatStart') { nestedError = true; break; }
                body.push(program[j]);
                bodyIndices.push(j);
                j++;
            }
            if (nestedError) {
                errors.push('반복 블록 안에는 아직 또 다른 반복 블록을 넣을 수 없어요.');
                break;
            }
            if (!foundEnd) {
                errors.push('"' + blk.label + '" 블록에 짝이 되는 "⏹ 반복 끝" 블록이 없어요.');
                break;
            }
            for (var r = 0; r < blk.count; r++) {
                body.forEach(function (b, bi) { result.push(b); sourceIndices.push(bodyIndices[bi]); });
            }
            i = j + 1;
        } else if (blk.type === 'repeatEnd') {
            errors.push('짝이 되는 "🔁 반복 시작" 블록 없이 "⏹ 반복 끝" 블록만 있어요.');
            break;
        } else {
            result.push(blk);
            sourceIndices.push(i);
            i++;
        }
    }
    return { actions: result, sourceIndices: sourceIndices, errors: errors };
}
function runBlockCodeProgram() {
    if (blockCodeState.running || blockCodeState.solved || blockCodeState.debugMode) return;
    blockCodeState.buggyIndex = null;
    blockCodeState.lastErrorMsg = '';
    var expanded = expandBlockProgram(blockCodeState.program);
    var msg = document.getElementById('blockCodeMsg');
    if (expanded.errors.length > 0) {
        msg.className = 'msg-box bad'; msg.style.display = 'block';
        msg.innerText = '🚫 ' + expanded.errors[0];
        blockCodeState.lastErrorMsg = expanded.errors[0];
        if (blockCodeState.program.length > 0) blockCodeState.buggyIndex = blockCodeState.program.length - 1;
        renderBlockCoding();
        return;
    }
    if (expanded.actions.length === 0) {
        msg.className = 'msg-box bad'; msg.style.display = 'block';
        msg.innerText = '먼저 명령 블록을 눌러서 프로그램을 만들어보세요!';
        return;
    }
    blockCodeState.running = true;
    blockCodeState.actions = expanded.actions;
    blockCodeState.sourceIndices = expanded.sourceIndices;
    var snap = blockCodeState.lastFailSnapshot;
    var canResume = snap && snap.expandedPrefix.length > 0 && snap.expandedPrefix.length <= expanded.actions.length &&
        snap.expandedPrefix.every(function (a, idx) { return expanded.actions[idx] === a; });
    if (canResume) {
        blockCodeState.player = { x: snap.player.x, y: snap.player.y };
        blockCodeState.facing = snap.facing;
        blockCodeState.stepIndex = snap.expandedPrefix.length;
    } else {
        blockCodeState.player = { x: 0, y: 0 };
        blockCodeState.facing = 0;
        blockCodeState.stepIndex = 0;
    }
    blockCodeState.lastFailSnapshot = null;
    renderBlockCoding();
    var t = setTimeout(stepBlockProgram, 450);
    activeTimers.push(t);
}
function stepBlockProgram() {
    if (blockCodeState.stepIndex >= blockCodeState.actions.length) {
        blockCodeState.running = false;
        if (blockCodeState.player.x === blockCodeState.goal.x && blockCodeState.player.y === blockCodeState.goal.y) {
            handleBlockCodeSuccess();
        } else {
            var lastOrig = blockCodeState.sourceIndices.length > 0 ? blockCodeState.sourceIndices[blockCodeState.sourceIndices.length - 1] : blockCodeState.program.length - 1;
            blockCodeState.lastFailSnapshot = {
                expandedPrefix: blockCodeState.actions.slice(0),
                player: { x: blockCodeState.player.x, y: blockCodeState.player.y },
                facing: blockCodeState.facing
            };
            handleBlockCodeFail('프로그램이 다 끝났는데 아직 도착하지 못했어요. 명령을 더 추가하거나 순서를 바꿔보세요.', lastOrig);
        }
        return;
    }
    var action = blockCodeState.actions[blockCodeState.stepIndex];
    if (action.type === 'turnLeft') {
        blockCodeState.facing = (blockCodeState.facing + 3) % 4;
    } else if (action.type === 'turnRight') {
        blockCodeState.facing = (blockCodeState.facing + 1) % 4;
    } else if (action.type === 'forward') {
        var cell = blockCodeState.maze[blockCodeState.player.y][blockCodeState.player.x];
        var curDir = DIRS4[blockCodeState.facing];
        if (cell[curDir.wallSide]) {
            blockCodeState.running = false;
            var origIdx = blockCodeState.sourceIndices[blockCodeState.stepIndex];
            blockCodeState.lastFailSnapshot = {
                expandedPrefix: blockCodeState.actions.slice(0, blockCodeState.stepIndex),
                player: { x: blockCodeState.player.x, y: blockCodeState.player.y },
                facing: blockCodeState.facing
            };
            handleBlockCodeFail('(' + (blockCodeState.stepIndex + 1) + '번째 명령) 벽에 부딪혔어요! 빨간색 블록을 확인하고 고쳐보세요.', origIdx);
            return;
        }
        blockCodeState.player = { x: blockCodeState.player.x + curDir.dx, y: blockCodeState.player.y + curDir.dy };
    } else if (action.type === 'backward') {
        var cell2 = blockCodeState.maze[blockCodeState.player.y][blockCodeState.player.x];
        var oppDir = DIRS4[(blockCodeState.facing + 2) % 4];
        if (cell2[oppDir.wallSide]) {
            blockCodeState.running = false;
            var origIdx2 = blockCodeState.sourceIndices[blockCodeState.stepIndex];
            blockCodeState.lastFailSnapshot = {
                expandedPrefix: blockCodeState.actions.slice(0, blockCodeState.stepIndex),
                player: { x: blockCodeState.player.x, y: blockCodeState.player.y },
                facing: blockCodeState.facing
            };
            handleBlockCodeFail('(' + (blockCodeState.stepIndex + 1) + '번째 명령) 뒤에 벽이 있어요! 빨간색 블록을 확인하고 고쳐보세요.', origIdx2);
            return;
        }
        blockCodeState.player = { x: blockCodeState.player.x + oppDir.dx, y: blockCodeState.player.y + oppDir.dy };
    }
    blockCodeState.stepIndex++;
    renderBlockCoding();
    if (blockCodeState.player.x === blockCodeState.goal.x && blockCodeState.player.y === blockCodeState.goal.y) {
        blockCodeState.running = false;
        handleBlockCodeSuccess();
        return;
    }
    var t = setTimeout(stepBlockProgram, 450);
    activeTimers.push(t);
}
function handleBlockCodeSuccess() {
    blockCodeState.solved = true;
    blockCodeState.buggyIndex = null;
    blockCodeSolved++;
    renderBlockCoding();
    var msg = document.getElementById('blockCodeMsg');
    msg.className = 'msg-box'; msg.style.display = 'block';
    msg.innerText = '🎉 성공! 명령 ' + blockCodeState.actions.length + '개로 도착했어요!';
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextBlockCodeRound()', 'retryBlockCoding()', 'restartBlockCoding()'));
}
function handleBlockCodeFail(reason, buggyOrigIndex) {
    blockCodeState.buggyIndex = (typeof buggyOrigIndex === 'number') ? buggyOrigIndex : null;
    blockCodeState.lastErrorMsg = reason;
    renderBlockCoding();
    var msg = document.getElementById('blockCodeMsg');
    msg.className = 'msg-box bad'; msg.style.display = 'block';
    msg.innerText = '🐞 ' + reason + ' 프로그램을 고친 뒤 다시 실행해보세요!';
}
function renderBlockCoding() {
    var html = '<div class="game-title-box">🧑‍💻 블록코딩 로봇</div>';
    html += '<div class="game-sub-desc">명령 블록을 순서대로 눌러 쌓고, "실행"을 눌러 캐릭터를 🏁까지 보내보세요! 틀려도 괜찮아요 — 🐞 디버깅으로 고쳐서 다시 도전하면 돼요.</div>';
    html += '<div class="status-row"><div>' + blockCodeRound + '라운드</div><div>성공: ' + blockCodeSolved + '개</div></div>';
    html += '<div class="maze-wrap">';
    html += '<div class="maze-grid" style="grid-template-columns: repeat(' + blockCodeState.w + ', 36px);">';
    for (var y = 0; y < blockCodeState.h; y++) {
        for (var x = 0; x < blockCodeState.w; x++) {
            var cell = blockCodeState.maze[y][x];
            var style = 'border-top:' + (cell.top ? '2px solid #334155' : 'none') +
                ';border-right:' + (cell.right ? '2px solid #334155' : 'none') +
                ';border-bottom:' + (cell.bottom ? '2px solid #334155' : 'none') +
                ';border-left:' + (cell.left ? '2px solid #334155' : 'none') + ';';
            var content = '';
            if (blockCodeState.player.x === x && blockCodeState.player.y === y) {
                content = '<span style="position:relative; display:inline-block;">🧑<span style="position:absolute; bottom:-8px; right:-12px; font-size:0.85em; background:#fff; border-radius:50%; line-height:1;">' + DIRS4[blockCodeState.facing].arrow + '</span></span>';
            } else if (blockCodeState.goal.x === x && blockCodeState.goal.y === y) content = '🏁';
            html += '<div class="maze-cell" style="' + style + '">' + content + '</div>';
        }
    }
    html += '</div></div>';
    html += '<div class="game-sub-desc" style="text-align:center;">현재 방향: <b style="color:var(--primary);">' + DIRS4[blockCodeState.facing].arrow + ' ' + DIRS4[blockCodeState.facing].name + '</b></div>';
    var paletteLabel = blockCodeState.debugMode ? '🔧 새 명령 선택 (눌러서 교체하기)' : '명령 블록 (눌러서 추가)';
    html += '<div class="setup-section-label">' + paletteLabel + '</div>';
    html += '<div class="palette-row">';
    BLOCK_TYPES.forEach(function (bt, idx) {
        html += '<button class="setup-btn' + (blockCodeState.debugMode ? ' active' : '') + '" style="min-width:auto;' + (blockCodeState.debugMode ? 'border-color:#eab308;' : '') + '" ' + (blockCodeState.running || blockCodeState.solved ? 'disabled' : '') + ' onclick="pickPaletteBlock(' + idx + ')">' + bt.label + '</button>';
    });
    html += '</div>';
    html += '<div class="setup-section-label">내 프로그램 (' + blockCodeState.program.length + '개)' + (blockCodeState.debugMode ? ' — 바꿀 블록을 눌러 선택하세요' : '') + '</div>';
    html += '<div class="sequence-answer-row" style="flex-wrap:wrap;">';
    if (blockCodeState.program.length === 0) {
        html += '<div class="game-sub-desc" style="margin:0;">아직 명령이 없어요. 위에서 블록을 눌러 추가해보세요!</div>';
    } else {
        blockCodeState.program.forEach(function (blk, i) {
            var isCurrent = blockCodeState.running && blockCodeState.sourceIndices[blockCodeState.stepIndex] === i;
            var isBuggy = (!blockCodeState.running) && blockCodeState.buggyIndex === i;
            var isSelected = blockCodeState.debugMode && blockCodeState.selectedEditIndex === i;
            var slotStyle = '';
            if (isCurrent) {
                slotStyle = 'background:#fef9c3;border:2px solid #eab308;';
            } else {
                if (isSelected) slotStyle += 'background:#fef9c3;';
                if (isBuggy) slotStyle += 'border:3px solid #ef4444;color:#991b1b;font-weight:800;';
            }
            var clickable = blockCodeState.debugMode ? 'cursor:pointer;' : '';
            html += '<div class="sequence-answer-slot" style="width:auto; min-width:36px; padding:0 0.4rem; font-size:0.9rem;' + slotStyle + clickable + '" onclick="selectDebugSlot(' + i + ')">' + blk.shortLabel + '</div>';
        });
        if (blockCodeState.debugMode) {
            html += '<div class="sequence-answer-slot" style="width:auto; min-width:36px; padding:0 0.5rem; font-size:0.85rem; cursor:pointer; border-style:dashed; color:var(--primary); font-weight:800;" onclick="switchToAddMode()">다음</div>';
        }
    }
    html += '</div>';
    var hasBug = (blockCodeState.buggyIndex !== null && blockCodeState.buggyIndex !== undefined);
    html += '<div class="options-grid" style="grid-template-columns: 1fr 1fr 1fr;">';
    html += '<button class="action-btn" ' + (blockCodeState.running || blockCodeState.solved || blockCodeState.debugMode ? 'disabled' : '') + ' onclick="runBlockCodeProgram()">▶ 실행</button>';
    html += '<button class="action-btn secondary" ' + (blockCodeState.running || blockCodeState.solved || blockCodeState.debugMode ? 'disabled' : '') + ' onclick="undoLastBlockCodeBlock()">↩ 지우기</button>';
    html += '<button class="action-btn" style="' + (hasBug ? 'background:#ef4444;' : 'background:#d1d5db; color:#9ca3af;') + '" ' + (hasBug ? '' : 'disabled') + ' onclick="toggleDebugMode()">🐞 디버깅' + (blockCodeState.debugMode ? ' 취소' : '') + '</button>';
    html += '</div>';
    html += '<div id="blockCodeMsg" class="msg-box"></div>';
    if (!blockCodeState.solved) {
        html += '<button class="action-btn secondary" style="margin-top:0.4rem; padding:0.5rem; font-size:0.82rem;" onclick="restartBlockCoding()">처음부터 풀기 (다른 미로) 🔄</button>';
    }
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 20. 코딩 사고: 조건문 로봇 (규칙에 따라 여러 단계 이어서 이동) =====================
var condRobotState = {};
var condRobotRound = 1, condRobotCorrect = 0;
function initConditionalRobot() { condRobotRound = 1; condRobotCorrect = 0; generateCondRobotRound(); }
function generateCondRobotRound() {
    var n = getRandomInt(4, 6);
    var colors = ['🔴', '🟢', '🔵'];
    var actionsPool = shuffleArray(['전진', '정지', '후진']);
    var deltaMap = { '전진': 1, '정지': 0, '후진': -1 };
    var rules = colors.map(function (c, i) { return { symbol: c, action: actionsPool[i], delta: deltaMap[actionsPool[i]] }; });
    var path = [];
    for (var i = 0; i < n; i++) path.push(pickRandom(colors));
    var pos = 0;
    path.forEach(function (c) {
        var rule = rules.filter(function (r) { return r.symbol === c; })[0];
        pos += rule.delta;
        if (pos < 0) pos = 0;
    });
    var finalPos = pos;
    var candidates = [finalPos];
    [1, -1, 2, -2].forEach(function (d) {
        var v = finalPos + d;
        if (v >= 0 && candidates.indexOf(v) === -1 && candidates.length < 4) candidates.push(v);
    });
    while (candidates.length < 4) { candidates.push(candidates[candidates.length - 1] + 1); }
    condRobotState = {
        rules: rules, path: path, finalPos: finalPos,
        options: shuffleArray(candidates),
        phase: 'predict', animIndex: 0, currentPos: 0,
        chosenOption: null, answered: false
    };
    renderConditionalRobot();
}
function retryCondRobotRound() {
    condRobotState.phase = 'predict';
    condRobotState.answered = false;
    condRobotState.chosenOption = null;
    condRobotState.animIndex = 0;
    condRobotState.currentPos = 0;
    renderConditionalRobot();
}
function pickCondRobotGuess(idx) {
    if (condRobotState.phase !== 'predict') return;
    vibrateShort();
    condRobotState.chosenOption = condRobotState.options[idx];
    condRobotState.phase = 'reveal';
    condRobotState.animIndex = 0;
    condRobotState.currentPos = 0;
    renderConditionalRobot();
    var t = setTimeout(stepCondRobotAnim, 500);
    activeTimers.push(t);
}
function stepCondRobotAnim() {
    if (condRobotState.animIndex >= condRobotState.path.length) {
        finishCondRobotRound();
        return;
    }
    var c = condRobotState.path[condRobotState.animIndex];
    var rule = condRobotState.rules.filter(function (r) { return r.symbol === c; })[0];
    vibrateShort();
    condRobotState.currentPos += rule.delta;
    if (condRobotState.currentPos < 0) condRobotState.currentPos = 0;
    condRobotState.animIndex++;
    renderConditionalRobot();
    var t = setTimeout(stepCondRobotAnim, 500);
    activeTimers.push(t);
}
function finishCondRobotRound() {
    condRobotState.answered = true;
    renderConditionalRobot();
    var msg = document.getElementById('condRobotMsg');
    var correct = condRobotState.chosenOption === condRobotState.finalPos;
    if (correct) {
        condRobotCorrect++;
        msg.className = 'msg-box'; msg.style.display = 'block';
        msg.innerText = '🎉 정답이에요! 로봇이 ' + condRobotState.finalPos + '번째 칸에 도착했어요.';
    } else {
        msg.className = 'msg-box bad'; msg.style.display = 'block';
        msg.innerText = '아쉬워요! 실제로는 ' + condRobotState.finalPos + '번째 칸에 도착했어요. (내 예측: ' + condRobotState.chosenOption + '번째)';
    }
    condRobotRound++;
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('generateCondRobotRound()', 'retryCondRobotRound()', 'initConditionalRobot()'));
}
function renderConditionalRobot() {
    var html = '<div class="game-title-box">🚦 조건문 로봇</div>';
    html += '<div class="game-sub-desc">아래 규칙을 보고, 로봇이 이 길을 끝까지 가면 최종적으로 몇 번째 칸에 있을지 예측해보세요!</div>';
    html += '<div class="status-row"><div>' + condRobotRound + '라운드</div><div>정답: ' + condRobotCorrect + ' / ' + (condRobotRound - 1) + '</div></div>';
    html += '<div class="msg-box" style="display:block; background:#f8fafc; border-color:#e5e7eb; color:#1f2937; text-align:left; line-height:1.9;">';
    condRobotState.rules.forEach(function (r) { html += '만약 ' + r.symbol + ' 이면 → <b>' + r.action + '</b><br>'; });
    html += '</div>';
    html += '<div class="row-label">처리할 명령 순서</div>';
    html += '<div class="row-display">';
    condRobotState.path.forEach(function (c, i) {
        var isActive = condRobotState.phase === 'reveal' && !condRobotState.answered && condRobotState.animIndex === i;
        var isPast = condRobotState.phase === 'reveal' && i < condRobotState.animIndex;
        var style = isActive ? 'border-color:#eab308; background:#fef9c3;' : (isPast ? 'opacity:0.35;' : '');
        html += '<div class="row-box" style="' + style + '">' + c + '</div>';
    });
    html += '</div>';
    if (condRobotState.phase === 'reveal') {
        html += '<div class="game-sub-desc" style="text-align:center; font-size:1.3rem; font-weight:800;">🧑 로봇 위치: <span style="color:var(--primary);">' + condRobotState.currentPos + '</span>번째</div>';
    }
    if (condRobotState.phase === 'predict') {
        html += '<div class="game-sub-desc" style="text-align:center; font-weight:800;">로봇은 최종적으로 몇 번째 칸에 도착할까요?</div>';
        html += '<div class="options-grid">';
        condRobotState.options.forEach(function (opt, idx) {
            html += '<button class="opt-btn text-opt" onclick="pickCondRobotGuess(' + idx + ')">' + opt + '번째</button>';
        });
        html += '</div>';
    }
    html += '<div id="condRobotMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 21. 코딩 사고: 명령 미리보기 (벽 없는 열린 공간에서 순서 읽고 예측) =====================
var CMD_WORD_MAP = { forward: '앞으로', backward: '뒤로', turnLeft: '왼쪽', turnRight: '오른쪽' };
var codeTraceState = {};
var codeTraceRound = 1, codeTraceCorrect = 0;
var codeTraceSettings = { size: 'medium', count: 4 };
function initCodeTrace() { renderCodeTraceSetup(); }
function renderCodeTraceSetup() {
    var sizes = [{ v: 'easy', l: '쉬움' }, { v: 'medium', l: '보통' }, { v: 'hard', l: '어려움' }, { v: 'random', l: '무작위' }];
    var counts = [{ v: 4, l: '4개' }, { v: 6, l: '6개' }, { v: 8, l: '8개' }, { v: 'random', l: '무작위' }];
    var html = '<div class="game-title-box">🔍 명령 미리보기</div>';
    html += '<div class="game-sub-desc">난이도를 골라 시작해보세요!</div>';
    html += '<div class="setup-section-label">맵 크기</div><div class="setup-btn-group">';
    sizes.forEach(function (t) {
        html += '<button class="setup-btn' + (codeTraceSettings.size === t.v ? ' active' : '') + '" onclick="setCodeTraceSize(\'' + t.v + '\')">' + t.l + '</button>';
    });
    html += '</div>';
    html += '<div class="setup-section-label">명령 개수</div><div class="setup-btn-group">';
    counts.forEach(function (t) {
        html += '<button class="setup-btn' + (codeTraceSettings.count === t.v ? ' active' : '') + '" onclick="setCodeTraceCount(' + (typeof t.v === 'string' ? "'" + t.v + "'" : t.v) + ')">' + t.l + '</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startCodeTraceSession()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function setCodeTraceSize(v) { codeTraceSettings.size = v; renderCodeTraceSetup(); }
function setCodeTraceCount(v) { codeTraceSettings.count = v; renderCodeTraceSetup(); }
function startCodeTraceSession() { codeTraceRound = 1; codeTraceCorrect = 0; generateCodeTraceRound(); }
function resolveCodeTraceSize() {
    var sizeMap = { easy: 4, medium: 5, hard: 6 };
    var s = codeTraceSettings.size;
    if (s === 'random') s = pickRandom(['easy', 'medium', 'hard']);
    return sizeMap[s];
}
function resolveCodeTraceCount() {
    var c = codeTraceSettings.count;
    if (c === 'random') return pickRandom([4, 6, 8]);
    return c;
}
function generateCodeTraceRound() {
    var size = resolveCodeTraceSize();
    var n = resolveCodeTraceCount();
    var pos = { x: 0, y: 0 }, facing = 0;
    var program = [];
    for (var i = 0; i < n; i++) {
        var d = DIRS4[facing];
        var fwdX = pos.x + d.dx, fwdY = pos.y + d.dy;
        var oppD = DIRS4[(facing + 2) % 4];
        var backX = pos.x + oppD.dx, backY = pos.y + oppD.dy;
        var choices = ['turnLeft', 'turnRight'];
        if (fwdX >= 0 && fwdX < size && fwdY >= 0 && fwdY < size) { choices.push('forward', 'forward'); }
        if (backX >= 0 && backX < size && backY >= 0 && backY < size) { choices.push('backward'); }
        var cmd = pickRandom(choices);
        if (cmd === 'forward') { pos = { x: fwdX, y: fwdY }; }
        else if (cmd === 'backward') { pos = { x: backX, y: backY }; }
        else if (cmd === 'turnLeft') facing = (facing + 3) % 4;
        else facing = (facing + 1) % 4;
        program.push(cmd);
    }
    var finalPos = pos;

    function simulate(overrideTurn) {
        var p = { x: 0, y: 0 }, f = 0;
        program.forEach(function (c) {
            if (c === 'turnLeft') f = (f + (overrideTurn ? 1 : 3)) % 4;
            else if (c === 'turnRight') f = (f + (overrideTurn ? 3 : 1)) % 4;
            else {
                var dir = (c === 'forward') ? DIRS4[f] : DIRS4[(f + 2) % 4];
                p = { x: p.x + dir.dx, y: p.y + dir.dy };
            }
        });
        return p;
    }
    var ignoreTurnsPos = (function () {
        var p = { x: 0, y: 0 };
        program.forEach(function (c) { if (c === 'forward') p = { x: p.x + 1, y: p.y }; });
        return p;
    })();
    var swappedTurnsPos = simulate(true);
    var skipLastPos = (function () {
        var savedLast = program[program.length - 1];
        program.pop();
        var p = simulate(false);
        program.push(savedLast);
        return p;
    })();

    var candidates = [finalPos];
    [ignoreTurnsPos, swappedTurnsPos, skipLastPos].forEach(function (p) {
        var exists = candidates.some(function (c) { return c.x === p.x && c.y === p.y; });
        if (!exists && p.x >= 0 && p.x < size && p.y >= 0 && p.y < size && candidates.length < 4) candidates.push(p);
    });
    var guard = 0;
    while (candidates.length < 4 && guard < 30) {
        guard++;
        var rx = getRandomInt(0, size - 1), ry = getRandomInt(0, size - 1);
        var exists2 = candidates.some(function (c) { return c.x === rx && c.y === ry; });
        if (!exists2) candidates.push({ x: rx, y: ry });
    }

    codeTraceState = {
        size: size, program: program, finalPos: finalPos,
        options: shuffleArray(candidates),
        phase: 'predict', chosen: null, animIndex: 0,
        pos: { x: 0, y: 0 }, facing: 0, answered: false
    };
    renderCodeTrace();
}
function retryCodeTraceRound() {
    codeTraceState.phase = 'predict';
    codeTraceState.chosen = null;
    codeTraceState.animIndex = 0;
    codeTraceState.pos = { x: 0, y: 0 };
    codeTraceState.facing = 0;
    codeTraceState.answered = false;
    renderCodeTrace();
}
function pickCodeTraceGuess(idx) {
    if (codeTraceState.phase !== 'predict') return;
    vibrateShort();
    codeTraceState.chosen = codeTraceState.options[idx];
    codeTraceState.phase = 'reveal';
    codeTraceState.animIndex = 0;
    codeTraceState.pos = { x: 0, y: 0 };
    codeTraceState.facing = 0;
    renderCodeTrace();
    var t = setTimeout(stepCodeTraceAnim, 450);
    activeTimers.push(t);
}
function stepCodeTraceAnim() {
    if (codeTraceState.animIndex >= codeTraceState.program.length) {
        finishCodeTraceRound();
        return;
    }
    var cmd = codeTraceState.program[codeTraceState.animIndex];
    vibrateShort();
    if (cmd === 'turnLeft') codeTraceState.facing = (codeTraceState.facing + 3) % 4;
    else if (cmd === 'turnRight') codeTraceState.facing = (codeTraceState.facing + 1) % 4;
    else {
        var d = (cmd === 'forward') ? DIRS4[codeTraceState.facing] : DIRS4[(codeTraceState.facing + 2) % 4];
        codeTraceState.pos = { x: codeTraceState.pos.x + d.dx, y: codeTraceState.pos.y + d.dy };
    }
    codeTraceState.animIndex++;
    renderCodeTrace();
    var t = setTimeout(stepCodeTraceAnim, 450);
    activeTimers.push(t);
}
function finishCodeTraceRound() {
    codeTraceState.answered = true;
    renderCodeTrace();
    var msg = document.getElementById('codeTraceMsg');
    var correct = codeTraceState.chosen.x === codeTraceState.finalPos.x && codeTraceState.chosen.y === codeTraceState.finalPos.y;
    if (correct) {
        codeTraceCorrect++;
        msg.className = 'msg-box'; msg.style.display = 'block';
        msg.innerText = '🎉 정답이에요! 정확히 예측했어요.';
    } else {
        msg.className = 'msg-box bad'; msg.style.display = 'block';
        msg.innerText = '아쉬워요! 실제 도착 위치는 (' + (codeTraceState.finalPos.x + 1) + ', ' + (codeTraceState.finalPos.y + 1) + ')였어요.';
    }
    codeTraceRound++;
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('generateCodeTraceRound()', 'retryCodeTraceRound()', 'renderCodeTraceSetup()'));
}
function renderCodeTrace() {
    var html = '<div class="game-title-box">🔍 명령 미리보기</div>';
    html += '<div class="game-sub-desc">아래 명령을 순서대로 실행하면 로봇이 어디에 도착할지 예측해보세요! (벽은 없어요)</div>';
    html += '<div class="status-row"><div>' + codeTraceRound + '라운드</div><div>정답: ' + codeTraceCorrect + ' / ' + (codeTraceRound - 1) + '</div></div>';
    html += '<div class="row-label">실행할 명령</div><div class="row-display" style="flex-wrap:wrap;">';
    codeTraceState.program.forEach(function (cmd, i) {
        var isActive = codeTraceState.phase === 'reveal' && !codeTraceState.answered && codeTraceState.animIndex === i;
        var isPast = codeTraceState.phase === 'reveal' && i < codeTraceState.animIndex;
        var style = isActive ? 'border-color:#eab308; background:#fef9c3;' : (isPast ? 'opacity:0.35;' : '');
        html += '<div class="row-box" style="width:auto; min-width:46px; padding:0 0.3rem; font-size:0.72rem; font-weight:800;' + style + '">' + CMD_WORD_MAP[cmd] + '</div>';
    });
    html += '</div>';
    html += '<div class="maze-wrap"><div class="maze-grid" style="grid-template-columns: repeat(' + codeTraceState.size + ', 32px);">';
    for (var y = 0; y < codeTraceState.size; y++) {
        for (var x = 0; x < codeTraceState.size; x++) {
            var content = '';
            var showX = codeTraceState.phase === 'reveal' ? codeTraceState.pos.x : 0;
            var showY = codeTraceState.phase === 'reveal' ? codeTraceState.pos.y : 0;
            var showFacing = codeTraceState.phase === 'reveal' ? codeTraceState.facing : 0;
            if (showX === x && showY === y) {
                content = '<span style="position:relative; display:inline-block;">🧑<span style="position:absolute; bottom:-8px; right:-12px; font-size:0.85em; background:#fff; border-radius:50%; line-height:1;">' + DIRS4[showFacing].arrow + '</span></span>';
            }
            html += '<div class="maze-cell" style="border:1px solid #e2e8f0;">' + content + '</div>';
        }
    }
    html += '</div></div>';
    html += '<div class="game-sub-desc" style="text-align:center;">현재 방향: <b style="color:var(--primary);">' + DIRS4[codeTraceState.phase === 'reveal' ? codeTraceState.facing : 0].arrow + ' ' + DIRS4[codeTraceState.phase === 'reveal' ? codeTraceState.facing : 0].name + '</b></div>';
    if (codeTraceState.phase === 'predict') {
        html += '<div class="game-sub-desc" style="text-align:center; font-weight:800;">로봇은 어디에 도착할까요? (가로, 세로)</div>';
        html += '<div class="options-grid">';
        codeTraceState.options.forEach(function (opt, idx) {
            html += '<button class="opt-btn text-opt" onclick="pickCodeTraceGuess(' + idx + ')">(' + (opt.x + 1) + ', ' + (opt.y + 1) + ')</button>';
        });
        html += '</div>';
    }
    html += '<div id="codeTraceMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 22. 코딩 사고: 변수 점수 만들기 (직접 모아보며 체험) =====================
var VARIABLE_EVENT_POOL = [
    { icon: '🍎', label: '사과', delta: 2 },
    { icon: '⭐', label: '별', delta: 3 },
    { icon: '👻', label: '유령', delta: -1 },
    { icon: '🍄', label: '버섯', delta: 1 },
    { icon: '💣', label: '폭탄', delta: -2 },
    { icon: '🪙', label: '동전', delta: 1 }
];
var variableState = {};
var variableRound = 1, variableSolved = 0;
function initVariableScore() { variableRound = 1; variableSolved = 0; generateVariableRound(); }
function generateVariableRound() {
    var n = getRandomInt(5, 7);
    var items = [];
    for (var i = 0; i < n; i++) { items.push(pickRandom(VARIABLE_EVENT_POOL)); }
    var pickCount = getRandomInt(2, Math.min(4, n));
    var shuffledIdx = shuffleArray(items.map(function (_, i2) { return i2; })).slice(0, pickCount);
    var target = shuffledIdx.reduce(function (sum, idx) { return sum + items[idx].delta; }, 0);
    if (target <= 0) target = Math.max(1, target + 3);
    variableState = { items: items, collected: [], score: 0, target: target, solved: false, failed: false };
    renderVariableScore();
}
function collectVariableItem(idx) {
    if (variableState.solved || variableState.failed) return;
    if (variableState.collected.indexOf(idx) > -1) return;
    vibrateShort();
    variableState.collected.push(idx);
    variableState.score += variableState.items[idx].delta;
    var reachedTarget = variableState.score >= variableState.target;
    var usedAll = variableState.collected.length === variableState.items.length;
    if (reachedTarget) variableState.solved = true;
    else if (usedAll) variableState.failed = true;
    renderVariableScore();
    var msg = document.getElementById('variableMsg');
    if (reachedTarget) {
        variableSolved++;
        msg.className = 'msg-box'; msg.style.display = 'block';
        msg.innerText = '🎉 목표 점수를 달성했어요! (' + variableState.score + '점)';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextVariableRound()', 'retryVariableRound()', 'initVariableScore()'));
    } else if (usedAll) {
        msg.className = 'msg-box bad'; msg.style.display = 'block';
        msg.innerText = '아쉬워요! 목표에 도달하지 못했어요. "다시 모으기"를 눌러 다른 순서로 시도해보세요.';
    }
}
function nextVariableRound() { variableRound++; generateVariableRound(); }
function resetVariableRound() {
    if (variableState.solved) return;
    vibrateShort();
    variableState.collected = [];
    variableState.score = 0;
    variableState.failed = false;
    renderVariableScore();
}
function retryVariableRound() {
    variableState.collected = [];
    variableState.score = 0;
    variableState.failed = false;
    variableState.solved = false;
    renderVariableScore();
}
function renderVariableScore() {
    var html = '<div class="game-title-box">🔢 변수 점수 만들기</div>';
    html += '<div class="game-sub-desc">아이템을 눌러서 점수를 모아보세요! 점수는 오르기도 하고 내려가기도 해요.</div>';
    html += '<div class="status-row"><div>' + variableRound + '라운드</div><div>성공: ' + variableSolved + '개</div></div>';
    html += '<div class="game-sub-desc" style="text-align:center; font-size:1.4rem; font-weight:800;">현재 점수: <span style="color:var(--primary);">' + variableState.score + '점</span> / 목표: ' + variableState.target + '점</div>';
    html += '<div class="palette-row">';
    variableState.items.forEach(function (e, idx) {
        var collected = variableState.collected.indexOf(idx) > -1;
        html += '<button class="setup-btn" style="min-width:56px;' + (collected ? 'opacity:0.35;' : '') + '" ' + (collected || variableState.solved || variableState.failed ? 'disabled' : '') + ' onclick="collectVariableItem(' + idx + ')">' + e.icon + '<br><span style="font-size:0.65rem;">' + (e.delta > 0 ? '+' : '') + e.delta + '</span></button>';
    });
    html += '</div>';
    if (!variableState.solved) {
        html += '<button class="action-btn secondary" onclick="resetVariableRound()">🔄 다시 모으기</button>';
    }
    html += '<div id="variableMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 23. 코딩 사고: 나만의 명령 만들기 (반복되는 단위를 함수로 인식) =====================
var functionState = {};
var functionRound = 1, functionCorrect = 0;
var FUNC_SHORT = { forward: '앞으로', backward: '뒤로', turnLeft: '왼쪽', turnRight: '오른쪽' };
var FUNC_CMD_POOL = ['forward', 'backward', 'turnLeft', 'turnRight'];
function initFunctionFinder() { functionRound = 1; functionCorrect = 0; generateFunctionRound(); }
function seqToLabel(seq) { return seq.map(function (c) { return FUNC_SHORT[c]; }).join(' → '); }
function generateFunctionRound() {
    var unitLen = getRandomInt(2, 3);
    var repeatCount = getRandomInt(2, 3);
    var unit = [];
    for (var i = 0; i < unitLen; i++) { unit.push(pickRandom(FUNC_CMD_POOL)); }
    var full = [];
    for (var r = 0; r < repeatCount; r++) { unit.forEach(function (c) { full.push(c); }); }
    var decoys = [];
    var guard = 0;
    while (decoys.length < 3 && guard < 50) {
        guard++;
        var cand = [];
        for (var j = 0; j < unitLen; j++) cand.push(pickRandom(FUNC_CMD_POOL));
        var sameAsUnit = cand.every(function (c, idx) { return c === unit[idx]; });
        var dup = decoys.some(function (d) { return d.every(function (c, idx) { return c === cand[idx]; }); });
        if (!sameAsUnit && !dup) decoys.push(cand);
    }
    var options = shuffleArray([unit].concat(decoys));
    functionState = { unit: unit, repeatCount: repeatCount, full: full, options: options, answered: false };
    renderFunctionFinder();
}
function renderFunctionFinder() {
    var html = '<div class="game-title-box">📦 나만의 명령 만들기</div>';
    html += '<div class="game-sub-desc">아래의 긴 명령은 사실 짧은 명령을 <b style="color:var(--primary);">' + functionState.repeatCount + '번</b> 반복한 거예요. 반복되는 부분(함수)이 무엇인지 찾아보세요!</div>';
    html += '<div class="status-row"><div>' + functionRound + '라운드</div><div>정답: ' + functionCorrect + ' / ' + (functionRound - 1) + '</div></div>';
    html += '<div class="row-label">전체 명령</div><div class="row-display">';
    functionState.full.forEach(function (c) { html += '<div class="row-box" style="width:auto; min-width:46px; padding:0 0.3rem; font-size:0.72rem; font-weight:800;">' + FUNC_SHORT[c] + '</div>'; });
    html += '</div>';
    html += '<div class="game-sub-desc" style="text-align:center; font-weight:800;">이 함수를 ' + functionState.repeatCount + '번 반복하면 될까요?</div>';
    html += '<div class="options-grid">';
    functionState.options.forEach(function (opt, idx) {
        html += '<button class="opt-btn text-opt" onclick="checkFunctionFinder(this,' + idx + ')">' + seqToLabel(opt) + '</button>';
    });
    html += '</div>';
    html += '<div id="functionMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}
function retryFunctionFinder() {
    functionState.answered = false;
    renderFunctionFinder();
}
function checkFunctionFinder(btn, idx) {
    if (functionState.answered) return;
    functionState.answered = true;
    vibrateShort();
    var buttons = document.querySelectorAll('.opt-btn');
    var opt = functionState.options[idx];
    var isCorrect = opt.every(function (c, i2) { return c === functionState.unit[i2]; });
    var msg = document.getElementById('functionMsg');
    if (isCorrect) {
        btn.classList.add('correct');
        functionCorrect++;
        msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 정답이에요! 이 함수를 ' + functionState.repeatCount + '번 부르면 전체 명령과 똑같아요.';
    } else {
        btn.classList.add('wrong');
        buttons.forEach(function (b, i3) {
            var o = functionState.options[i3];
            if (o && o.every(function (c, i4) { return c === functionState.unit[i4]; })) b.classList.add('correct');
        });
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아쉬워요! 정답은 "' + seqToLabel(functionState.unit) + '" 였어요.';
    }
    functionRound++;
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('generateFunctionRound()', 'retryFunctionFinder()', 'initFunctionFinder()'));
}

// ===================== 24. 코딩 사고: 최소 명령 개수 맞추기 (효율적으로 생각하기) =====================
var efficiencyState = {};
var efficiencyRound = 1, efficiencyCorrect = 0;
var efficiencySettings = { level: 'medium' };
function initEfficiencyGuess() { renderEfficiencySetup(); }
function renderEfficiencySetup() {
    var levels = [{ v: 'low', l: '하' }, { v: 'medium', l: '중' }, { v: 'high', l: '상' }, { v: 'random', l: '랜덤' }];
    var html = '<div class="game-title-box">⚡ 최소 명령 개수 맞추기</div>';
    html += '<div class="game-sub-desc">난이도를 골라 시작해보세요!</div>';
    html += '<div class="setup-section-label">난이도</div><div class="setup-btn-group">';
    levels.forEach(function (t) {
        html += '<button class="setup-btn' + (efficiencySettings.level === t.v ? ' active' : '') + '" onclick="setEfficiencyLevel(\'' + t.v + '\')">' + t.l + '</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startEfficiencySession()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function setEfficiencyLevel(v) { efficiencySettings.level = v; renderEfficiencySetup(); }
function startEfficiencySession() { efficiencyRound = 1; efficiencyCorrect = 0; generateEfficiencyRound(); }
function resolveEfficiencyRange() {
    var lv = efficiencySettings.level;
    if (lv === 'random') lv = pickRandom(['low', 'medium', 'high']);
    if (lv === 'low') return [1, 3];
    if (lv === 'high') return [5, 8];
    return [3, 5];
}
function generateEfficiencyRound() {
    var range = resolveEfficiencyRange();
    var R = getRandomInt(range[0], range[1]), D = getRandomInt(range[0], range[1]);
    var minCommands = R + D + 1;
    var options = [minCommands];
    [1, -1, 2, -2].forEach(function (d) {
        var v = minCommands + d;
        if (v > 0 && options.indexOf(v) === -1 && options.length < 4) options.push(v);
    });
    while (options.length < 4) { options.push(options[options.length - 1] + 1); }
    efficiencyState = { r: R, d: D, minCommands: minCommands, options: shuffleArray(options), answered: false };
    renderEfficiencyGuess();
}
function renderEfficiencyGuess() {
    var html = '<div class="game-title-box">⚡ 최소 명령 개수 맞추기</div>';
    html += '<div class="game-sub-desc">로봇이 오른쪽으로 <b style="color:var(--primary);">' + efficiencyState.r + '칸</b>, 아래로 <b style="color:var(--primary);">' + efficiencyState.d + '칸</b> 가야 도착해요. 전진과 회전을 각각 명령 1개로 셀 때, 최소 몇 개의 명령이면 도착할 수 있을까요?</div>';
    html += '<div class="status-row"><div>' + efficiencyRound + '라운드</div><div>정답: ' + efficiencyCorrect + ' / ' + (efficiencyRound - 1) + '</div></div>';
    html += '<div class="options-grid">';
    efficiencyState.options.forEach(function (opt, idx) {
        html += '<button class="opt-btn text-opt" onclick="checkEfficiencyGuess(this,' + idx + ')">' + opt + '개</button>';
    });
    html += '</div>';
    html += '<div id="efficiencyMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}
function retryEfficiencyGuess() {
    efficiencyState.answered = false;
    renderEfficiencyGuess();
}
function checkEfficiencyGuess(btn, idx) {
    if (efficiencyState.answered) return;
    efficiencyState.answered = true;
    vibrateShort();
    var buttons = document.querySelectorAll('.opt-btn');
    var opt = efficiencyState.options[idx];
    var msg = document.getElementById('efficiencyMsg');
    if (opt === efficiencyState.minCommands) {
        btn.classList.add('correct');
        efficiencyCorrect++;
        msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 정답이에요! 오른쪽 ' + efficiencyState.r + '번 + 회전 1번 + 아래 ' + efficiencyState.d + '번 = ' + efficiencyState.minCommands + '개예요.';
    } else {
        btn.classList.add('wrong');
        buttons.forEach(function (b, i5) { if (efficiencyState.options[i5] === efficiencyState.minCommands) b.classList.add('correct'); });
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아쉬워요! 정답은 ' + efficiencyState.minCommands + '개였어요.';
    }
    efficiencyRound++;
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('generateEfficiencyRound()', 'retryEfficiencyGuess()', 'initEfficiencyGuess()'));
}

// ===================== 25. 코딩 사고: AND OR 스위치 놀이 (논리 게이트) =====================
var logicGateState = {};
var logicGateRound = 1, logicGateCorrect = 0;
function initLogicGate() { logicGateRound = 1; logicGateCorrect = 0; generateLogicGateRound(); }
function generateLogicGateRound() {
    var gate = pickRandom(['AND', 'OR']);
    var sw1 = pickRandom([true, false]);
    var sw2 = pickRandom([true, false]);
    var result = gate === 'AND' ? (sw1 && sw2) : (sw1 || sw2);
    logicGateState = { gate: gate, sw1: sw1, sw2: sw2, result: result, answered: false };
    renderLogicGate();
}
function renderLogicGate() {
    var html = '<div class="game-title-box">💡 AND OR 스위치 놀이</div>';
    var gateDesc = logicGateState.gate === 'AND'
        ? '이 전구는 <b style="color:var(--primary);">AND</b> 규칙이에요. 스위치가 <b>둘 다 켜져야</b> 불이 켜져요!'
        : '이 전구는 <b style="color:var(--primary);">OR</b> 규칙이에요. 스위치가 <b>하나라도 켜지면</b> 불이 켜져요!';
    html += '<div class="game-sub-desc">' + gateDesc + '</div>';
    html += '<div class="status-row"><div>' + logicGateRound + '라운드</div><div>정답: ' + logicGateCorrect + ' / ' + (logicGateRound - 1) + '</div></div>';
    html += '<div class="msg-box" style="display:block; background:#f8fafc; border-color:#e5e7eb; text-align:center; font-size:2rem;">';
    html += (logicGateState.sw1 ? '🟢' : '⚫') + ' 스위치1 &nbsp;&nbsp; ' + (logicGateState.sw2 ? '🟢' : '⚫') + ' 스위치2';
    html += '</div>';
    html += '<div class="game-sub-desc" style="text-align:center; font-weight:800;">전구는 켜질까요, 꺼질까요?</div>';
    html += '<div class="options-grid">';
    html += '<button class="opt-btn text-opt" onclick="checkLogicGate(this,true)">💡 켜진다</button>';
    html += '<button class="opt-btn text-opt" onclick="checkLogicGate(this,false)">⚫ 꺼진다</button>';
    html += '</div>';
    html += '<div id="logicGateMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}
function retryLogicGate() {
    logicGateState.answered = false;
    renderLogicGate();
}
function checkLogicGate(btn, guess) {
    if (logicGateState.answered) return;
    logicGateState.answered = true;
    vibrateShort();
    var buttons = document.querySelectorAll('.opt-btn');
    var msg = document.getElementById('logicGateMsg');
    if (guess === logicGateState.result) {
        btn.classList.add('correct');
        logicGateCorrect++;
        msg.className = 'msg-box'; msg.style.display = 'block';
        msg.innerText = '🎉 정답이에요! ' + (logicGateState.result ? '전구가 켜져요.' : '전구가 꺼져있어요.');
    } else {
        btn.classList.add('wrong');
        buttons.forEach(function (b) {
            if ((b.innerText.indexOf('켜진다') > -1) === logicGateState.result) b.classList.add('correct');
        });
        msg.className = 'msg-box bad'; msg.style.display = 'block';
        msg.innerText = '아쉬워요! 실제로는 ' + (logicGateState.result ? '켜져요.' : '꺼져있어요.');
    }
    logicGateRound++;
    document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('generateLogicGateRound()', 'retryLogicGate()', 'initLogicGate()'));
}

// ===================== 30. 코딩 사고: 햄버거 만들기 (순차+선행조건 개념, 실제 실행) =====================
var HAMBURGER_RECIPES = [
    { name: '치즈버거', layers: ['🍞', '🥩', '🧀', '🍞'] },
    { name: '야채버거', layers: ['🍞', '🥬', '🍅', '🥒', '🍞'] },
    { name: '더블치즈버거', layers: ['🍞', '🥩', '🧀', '🥩', '🧀', '🍞'] },
    { name: '불고기버거', layers: ['🍞', '🥩', '🧅', '🍅', '🍞'] },
    { name: '베이컨버거', layers: ['🍞', '🥓', '🧀', '🥬', '🍞'] },
    { name: '스페셜버거', layers: ['🍞', '🥬', '🥩', '🧀', '🍅', '🍞'] },
    { name: '단짠버거', layers: ['🍞', '🥓', '🍯', '🧀', '🍞'] },
    { name: '아보카도버거', layers: ['🍞', '🥑', '🥩', '🍅', '🍞'] }
];
var GRILLABLE_ITEMS = ['🥩', '🥓'];
var BURGER_ACTIONS_BASE = [
    { type: 'grill', label: '🔥 굽기' },
    { type: 'serve', label: '🍽️ 서빙하기' }
];
var BURGER_VISUAL = {
    '🍞': { color: '#e3a857', dark: '#c18a3d' },
    '🥩': { color: '#6b3a1f', dark: '#4a2712' },
    '🧀': { color: '#f9c74f', dark: '#e0a92e' },
    '🥬': { color: '#7cb342', dark: '#5a8f2a' },
    '🍅': { color: '#e5533d', dark: '#c23f2b' },
    '🥒': { color: '#8bc34a', dark: '#6a9c34' },
    '🧅': { color: '#f3e9f7', dark: '#d9c2e0' },
    '🥓': { color: '#c1544a', dark: '#8f362e' },
    '🍯': { color: '#f4a825', dark: '#d68e12' },
    '🥑': { color: '#a8c256', dark: '#87a13c' }
};
function buildBurgerSVG(layers) {
    var width = 220;
    var layerH = 34;
    var totalH = layers.length * layerH + 20;
    var svg = '<svg viewBox="0 0 ' + width + ' ' + (totalH + 12) + '" xmlns="http://www.w3.org/2000/svg" style="width:100%; max-width:240px; height:auto;">';
    svg += '<ellipse cx="' + (width / 2) + '" cy="' + (totalH + 5) + '" rx="' + (width / 2 - 12) + '" ry="7" fill="rgba(0,0,0,0.15)"/>';
    for (var i = 0; i < layers.length; i++) {
        var item = layers[i];
        var v = BURGER_VISUAL[item] || { color: '#cccccc', dark: '#999999' };
        var y = totalH - (i + 1) * layerH;
        var isFirst = (i === 0);
        var isLast = (i === layers.length - 1);
        if (item === '🍞' && isFirst) {
            svg += '<path d="M 15 ' + (y + layerH) + ' Q 15 ' + (y + 10) + ' ' + (width / 2) + ' ' + (y + 8) + ' Q ' + (width - 15) + ' ' + (y + 10) + ' ' + (width - 15) + ' ' + (y + layerH) + ' Z" fill="' + v.color + '" stroke="' + v.dark + '" stroke-width="2"/>';
        } else if (item === '🍞' && isLast) {
            svg += '<path d="M 12 ' + (y + layerH) + ' Q 8 ' + y + ' ' + (width / 2) + ' ' + (y - 8) + ' Q ' + (width - 8) + ' ' + y + ' ' + (width - 12) + ' ' + (y + layerH) + ' Z" fill="' + v.color + '" stroke="' + v.dark + '" stroke-width="2"/>';
            [0.28, 0.42, 0.58, 0.72].forEach(function (fx, si) {
                svg += '<ellipse cx="' + (width * fx) + '" cy="' + (y + 8 - (si % 2) * 3) + '" rx="2.5" ry="1.8" fill="#fff8e1" transform="rotate(' + (si * 15 - 20) + ' ' + (width * fx) + ' ' + (y + 8) + ')"/>';
            });
        } else {
            svg += '<path d="M 16 ' + (y + layerH - 4) + ' Q 10 ' + (y + layerH / 2) + ' 18 ' + (y + 4) + ' L ' + (width - 18) + ' ' + (y + 4) + ' Q ' + (width - 10) + ' ' + (y + layerH / 2) + ' ' + (width - 16) + ' ' + (y + layerH - 4) + ' Z" fill="' + v.color + '" stroke="' + v.dark + '" stroke-width="1.5"/>';
        }
    }
    svg += '</svg>';
    return svg;
}
var burgerState = {};
var burgerRound = 1, burgerSolved = 0;
function initHamburger() { burgerRound = 1; burgerSolved = 0; generateHamburgerRound(); }
function generateHamburgerRound() {
    var recipe = pickRandom(HAMBURGER_RECIPES);
    var uniqueIngredients = recipe.layers.filter(function (v, i, arr) { return arr.indexOf(v) === i; });
    var addActions = shuffleArray(uniqueIngredients.map(function (ing) { return { type: 'add', item: ing, label: ing + ' 담기' }; }));
    var palette = shuffleArray(BURGER_ACTIONS_BASE.concat(addActions));
    burgerState = { recipe: recipe, palette: palette, program: [], running: false, solved: false, animIndex: 0, built: [], grilled: false, served: false, lastMsg: '' };
    renderHamburger();
}
function addBurgerAction(idx) {
    if (burgerState.running || burgerState.solved) return;
    vibrateShort();
    burgerState.program.push(burgerState.palette[idx]);
    renderHamburger();
}
function undoBurgerAction() {
    if (burgerState.running || burgerState.solved) return;
    vibrateShort();
    burgerState.program.pop();
    renderHamburger();
}
function runHamburger() {
    if (burgerState.running || burgerState.solved || burgerState.program.length === 0) return;
    burgerState.running = true;
    burgerState.animIndex = 0;
    burgerState.built = [];
    burgerState.grilled = false;
    burgerState.served = false;
    burgerState.lastMsg = '';
    renderHamburger();
    var t = setTimeout(stepHamburgerAnim, 1000);
    activeTimers.push(t);
}
function stepHamburgerAnim() {
    if (burgerState.animIndex >= burgerState.program.length) {
        finishHamburgerCheck();
        return;
    }
    var action = burgerState.program[burgerState.animIndex];
    vibrateShort();
    if (action.type === 'grill') {
        burgerState.grilled = true;
        burgerState.lastMsg = '🔥 지글지글... 고기/베이컨을 굽고 있어요!';
    } else if (action.type === 'add') {
        var isGrillable = GRILLABLE_ITEMS.indexOf(action.item) > -1;
        if (isGrillable && !burgerState.grilled) {
            burgerState.running = false;
            renderHamburger();
            var msg = document.getElementById('burgerMsg');
            msg.className = 'msg-box bad'; msg.style.display = 'block';
            msg.innerText = '🐛 앗! ' + action.item + '는 먼저 구워야 해요. "🔥 굽기"부터 실행되게 순서를 고쳐보세요.';
            document.getElementById('mainArea').insertAdjacentHTML('beforeend', '<button class="action-btn" onclick="retryHamburgerRound()">다시 실행하기 🔁</button>');
            return;
        }
        if (burgerState.served) {
            burgerState.running = false;
            renderHamburger();
            var msg2 = document.getElementById('burgerMsg');
            msg2.className = 'msg-box bad'; msg2.style.display = 'block';
            msg2.innerText = '🐛 이미 서빙했는데 재료를 더 넣었어요! "서빙하기"는 맨 마지막이어야 해요.';
            document.getElementById('mainArea').insertAdjacentHTML('beforeend', '<button class="action-btn" onclick="retryHamburgerRound()">다시 실행하기 🔁</button>');
            return;
        }
        burgerState.built.push(action.item);
        burgerState.lastMsg = action.item + '를 올렸어요!';
    } else if (action.type === 'serve') {
        burgerState.served = true;
        burgerState.lastMsg = '🍽️ 서빙 완료!';
    }
    burgerState.animIndex++;
    renderHamburger();
    var t = setTimeout(stepHamburgerAnim, 1000);
    activeTimers.push(t);
}
function finishHamburgerCheck() {
    burgerState.running = false;
    var isCorrect = burgerState.served && burgerState.built.length === burgerState.recipe.layers.length &&
        burgerState.built.every(function (l, i) { return l === burgerState.recipe.layers[i]; });
    renderHamburger();
    var msg = document.getElementById('burgerMsg');
    if (isCorrect) {
        burgerState.solved = true;
        burgerSolved++;
        msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 완벽해요! "' + burgerState.recipe.name + '" 완성!';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextHamburgerRound()', 'retryHamburgerFresh()', 'initHamburger()'));
    } else if (!burgerState.served) {
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아직 서빙을 안 했어요! "🍽️ 서빙하기"를 프로그램 맨 끝에 추가해보세요.';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend', '<button class="action-btn" onclick="retryHamburgerRound()">다시 실행하기 🔁</button>');
    } else {
        msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '순서가 달라요! 주문서를 다시 보고 순서를 고쳐보세요.';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend', '<button class="action-btn" onclick="retryHamburgerRound()">다시 실행하기 🔁</button>');
    }
}
function retryHamburgerRound() {
    burgerState.running = false;
    burgerState.built = [];
    burgerState.grilled = false;
    burgerState.served = false;
    burgerState.lastMsg = '';
    renderHamburger();
}
function nextHamburgerRound() { burgerRound++; generateHamburgerRound(); }
function retryHamburgerFresh() {
    burgerState.program = [];
    burgerState.running = false;
    burgerState.solved = false;
    burgerState.animIndex = 0;
    burgerState.built = [];
    burgerState.grilled = false;
    burgerState.served = false;
    burgerState.lastMsg = '';
    renderHamburger();
}
function renderHamburger() {
    var html = '<div class="game-title-box">🍔 햄버거 만들기</div>';
    html += '<div class="game-sub-desc">명령을 순서대로 쌓아서 "' + burgerState.recipe.name + '"를 완성해보세요! <b style="color:var(--primary);">고기·베이컨은 먼저 구워야 담을 수 있어요.</b></div>';
    html += '<div class="status-row"><div>' + burgerRound + '라운드</div><div>완성: ' + burgerSolved + '개</div></div>';
    html += '<div class="row-label">📋 주문서 (아래→위 순서)</div><div class="row-display">';
    burgerState.recipe.layers.forEach(function (l) { html += '<div class="row-box">' + l + '</div>'; });
    html += '</div>';
    html += '<div class="row-label">🍔 지금 만들어진 상태</div>';
    html += '<div style="display:flex; flex-direction:column-reverse; align-items:center; gap:2px; min-height:' + (burgerState.recipe.layers.length * 44 + 20) + 'px; margin-bottom:0.4rem;">';
    burgerState.built.forEach(function (l) { html += '<div class="row-box" style="font-size:1.6rem;">' + l + '</div>'; });
    html += '</div>';
    if (burgerState.lastMsg && burgerState.running) {
        html += '<div class="game-sub-desc" style="text-align:center; font-weight:800; color:var(--primary);">' + burgerState.lastMsg + '</div>';
    }
    html += '<div class="setup-section-label">명령 (눌러서 추가, 여러 번 눌러도 돼요)</div><div class="palette-row">';
    burgerState.palette.forEach(function (act, idx) {
        html += '<button class="setup-btn" style="min-width:auto;" ' + (burgerState.running || burgerState.solved ? 'disabled' : '') + ' onclick="addBurgerAction(' + idx + ')">' + act.label + '</button>';
    });
    html += '</div>';
    html += '<div class="setup-section-label">내 프로그램 (' + burgerState.program.length + '개)</div><div class="sequence-answer-row" style="flex-wrap:wrap;">';
    if (burgerState.program.length === 0) {
        html += '<div class="game-sub-desc" style="margin:0;">아직 명령이 없어요. 위에서 명령을 눌러 추가해보세요!</div>';
    } else {
        burgerState.program.forEach(function (act, i) {
            var isCurrent = burgerState.running && burgerState.animIndex === i;
            html += '<div class="sequence-answer-slot" style="width:auto; min-width:46px; padding:0 0.3rem; font-size:0.7rem; font-weight:800;' + (isCurrent ? 'background:#fef9c3;border-color:#eab308;' : '') + '">' + act.label + '</div>';
        });
    }
    html += '</div>';
    html += '<div class="options-grid">';
    html += '<button class="action-btn" ' + (burgerState.running || burgerState.solved ? 'disabled' : '') + ' onclick="runHamburger()">▶ 실행</button>';
    html += '<button class="action-btn secondary" ' + (burgerState.running || burgerState.solved ? 'disabled' : '') + ' onclick="undoBurgerAction()">↩ 지우기</button>';
    html += '</div>';
    html += '<div id="burgerMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 31. 코딩 사고: 논리 회로 물길 연결하기 =====================
var waterPipeSettings = { size: 4, pipeMode: 'min', timeLimit: 0 };
var waterPipeState = {};
var waterPipeRound = 1, waterPipeSolved = 0;
var WATER_ROTATE_MAP = { top: 'right', right: 'bottom', bottom: 'left', left: 'top' };
function initWaterPipe() { renderWaterPipeSetup(); }
function renderWaterPipeSetup() {
    var sizes = [{ v: 4, l: '4×4' }, { v: 6, l: '6×6' }, { v: 8, l: '8×8' }, { v: 'random', l: '무작위' }];
    var modes = [{ v: 'min', l: '최소' }, { v: 'mid', l: '중간' }, { v: 'max', l: '최대' }, { v: 'random', l: '무작위' }];
    var times = [{ v: 10, l: '10초' }, { v: 15, l: '15초' }, { v: 20, l: '20초' }, { v: 0, l: '무제한' }];
    var html = '<div class="game-title-box">🔀 논리 회로 물길 연결하기</div>';
    html += '<div class="game-sub-desc">타일 수, 파이프 수, 시간 제한을 골라 시작해보세요!</div>';
    html += '<div class="setup-section-label">타일 수</div><div class="setup-btn-group">';
    sizes.forEach(function (t) {
        html += '<button class="setup-btn' + (waterPipeSettings.size === t.v ? ' active' : '') + '" onclick="setWaterPipeSize(' + (t.v === 'random' ? "'random'" : t.v) + ')">' + t.l + '</button>';
    });
    html += '</div>';
    html += '<div class="setup-section-label">파이프 수</div><div class="setup-btn-group">';
    modes.forEach(function (t) {
        html += '<button class="setup-btn' + (waterPipeSettings.pipeMode === t.v ? ' active' : '') + '" onclick="setWaterPipeMode(\'' + t.v + '\')">' + t.l + '</button>';
    });
    html += '</div>';
    html += '<div class="setup-section-label">시간 제한</div><div class="setup-btn-group">';
    times.forEach(function (t) {
        html += '<button class="setup-btn' + (waterPipeSettings.timeLimit === t.v ? ' active' : '') + '" onclick="setWaterPipeTimeLimit(' + t.v + ')">' + t.l + '</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startWaterPipeSession()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
}
function setWaterPipeSize(v) { waterPipeSettings.size = v; renderWaterPipeSetup(); }
function setWaterPipeMode(v) { waterPipeSettings.pipeMode = v; renderWaterPipeSetup(); }
function setWaterPipeTimeLimit(v) { waterPipeSettings.timeLimit = v; renderWaterPipeSetup(); }
function startWaterPipeSession() { waterPipeRound = 1; waterPipeSolved = 0; generateWaterPipeRound(); }
function dirFromTo(a, b) {
    if (b.x > a.x) return 'right';
    if (b.x < a.x) return 'left';
    if (b.y > a.y) return 'bottom';
    return 'top';
}
function oppositeWaterDir(d) { return { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[d]; }
function getOpenSides(rotation, kind) {
    var base = kind === 'straight' ? ['top', 'bottom'] : ['top', 'right'];
    var sides = base.slice();
    for (var i = 0; i < rotation; i++) { sides = sides.map(function (s) { return WATER_ROTATE_MAP[s]; }); }
    return sides;
}
function generateWaterPath(size, sx, tx) {
    var path = [{ x: sx, y: 0 }];
    var cx = sx, cy = 0;
    while (cy < size - 1 || cx !== tx) {
        var canMoveDown = cy < size - 1;
        var needHorizontal = cx !== tx;
        var moveDown = !canMoveDown ? false : (!needHorizontal ? true : Math.random() < 0.55);
        if (moveDown) { cy++; } else { cx += (tx > cx) ? 1 : -1; }
        path.push({ x: cx, y: cy });
    }
    return path;
}
function generateWaterPathGreedy(size, sx, tx, preferLong) {
    var visited = {};
    var path = [{ x: sx, y: 0 }];
    visited[sx + ',0'] = true;
    var cur = { x: sx, y: 0 };
    var target = { x: tx, y: size - 1 };
    var maxSteps = size * size;
    for (var step = 0; step < maxSteps; step++) {
        if (cur.x === target.x && cur.y === target.y) return path;
        var dirs = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
        var candidates = [];
        dirs.forEach(function (d) {
            var nx = cur.x + d.dx, ny = cur.y + d.dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[nx + ',' + ny]) candidates.push({ x: nx, y: ny });
        });
        if (candidates.length === 0) return null;
        var nonTarget = candidates.filter(function (c) { return !(c.x === target.x && c.y === target.y); });
        var pick = (preferLong && nonTarget.length > 0) ? pickRandom(nonTarget) : pickRandom(candidates);
        visited[pick.x + ',' + pick.y] = true;
        path.push(pick);
        cur = pick;
    }
    return (cur.x === target.x && cur.y === target.y) ? path : null;
}
function generateWaterPathByMode(size, sx, tx, mode) {
    if (mode === 'min') return generateWaterPath(size, sx, tx);
    var preferLong = (mode === 'max');
    for (var attempt = 0; attempt < 40; attempt++) {
        var result = generateWaterPathGreedy(size, sx, tx, preferLong);
        if (result && result.length > 1) return result;
    }
    return generateWaterPath(size, sx, tx);
}
function generateWaterPipeRound() {
    var size = waterPipeSettings.size === 'random' ? pickRandom([4, 6, 8]) : waterPipeSettings.size;
    var mode = waterPipeSettings.pipeMode === 'random' ? pickRandom(['min', 'mid', 'max']) : waterPipeSettings.pipeMode;
    var sx = getRandomInt(0, size - 1);
    var tx = getRandomInt(0, size - 1);
    var path = generateWaterPathByMode(size, sx, tx, mode);
    var pipes = path.map(function (p, i) {
        var sideA = (i === 0) ? 'top' : dirFromTo(p, path[i - 1]);
        var sideB = (i === path.length - 1) ? 'bottom' : dirFromTo(p, path[i + 1]);
        var kind = (sideA === oppositeWaterDir(sideB)) ? 'straight' : 'elbow';
        return { kind: kind, rotation: getRandomInt(0, 3) };
    });
    waterPipeState = {
        size: size, source: { x: sx }, target: { x: tx }, path: path, pipes: pipes,
        filled: [], flowing: false, fired: false, success: false, fullVisited: [], willSucceed: false,
        timeLimit: waterPipeSettings.timeLimit, timeLeft: waterPipeSettings.timeLimit, timerId: null, timedOut: false
    };
    renderWaterPipe();
    if (waterPipeSettings.timeLimit > 0) { startWaterPipeTimer(); }
}
function startWaterPipeTimer() {
    var bar = document.getElementById('waterPipeTimerBar');
    if (bar) bar.style.width = (waterPipeState.timeLeft / waterPipeState.timeLimit * 100) + '%';
    waterPipeState.timerId = setInterval(function () {
        waterPipeState.timeLeft -= 0.1;
        var pct = (waterPipeState.timeLeft / waterPipeState.timeLimit) * 100;
        if (pct < 0) pct = 0;
        var b = document.getElementById('waterPipeTimerBar');
        if (b) b.style.width = pct + '%';
        if (waterPipeState.timeLeft <= 0) {
            clearInterval(waterPipeState.timerId);
            handleWaterPipeTimeout();
        }
    }, 100);
    activeTimers.push(waterPipeState.timerId);
}
function handleWaterPipeTimeout() {
    if (waterPipeState.fired || waterPipeState.timedOut) return;
    waterPipeState.timedOut = true;
    renderWaterPipe();
}
function restartWaterPipe() { renderWaterPipeSetup(); }
function nextWaterPipeRound() { waterPipeRound++; generateWaterPipeRound(); }
function retryWaterPipeRound() {
    waterPipeState.pipes.forEach(function (p) { p.rotation = getRandomInt(0, 3); });
    waterPipeState.filled = [];
    waterPipeState.fired = false;
    waterPipeState.success = false;
    waterPipeState.timedOut = false;
    waterPipeState.timeLeft = waterPipeState.timeLimit;
    renderWaterPipe();
    if (waterPipeState.timeLimit > 0) { startWaterPipeTimer(); }
}
function rotateWaterPipe(idx) {
    if (waterPipeState.flowing || waterPipeState.timedOut) return;
    vibrateShort();
    waterPipeState.pipes[idx].rotation = (waterPipeState.pipes[idx].rotation + 1) % 4;
    waterPipeState.filled = [];
    waterPipeState.fired = false;
    renderWaterPipe();
}
function traceWater(state) {
    var visited = [];
    var enterSide = 'top';
    var cur = state.path[0];
    var success = false;
    for (var step = 0; step < state.path.length + 1; step++) {
        var idx = -1;
        for (var i = 0; i < state.path.length; i++) { if (state.path[i].x === cur.x && state.path[i].y === cur.y) { idx = i; break; } }
        if (idx === -1) break;
        var pipe = state.pipes[idx];
        var sides = getOpenSides(pipe.rotation, pipe.kind);
        if (sides.indexOf(enterSide) === -1) break;
        visited.push({ x: cur.x, y: cur.y });
        var exitSide = (sides[0] === enterSide) ? sides[1] : sides[0];
        if (cur.x === state.target.x && cur.y === state.size - 1 && exitSide === 'bottom') { success = true; break; }
        var vec = { top: { dx: 0, dy: -1 }, bottom: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } }[exitSide];
        cur = { x: cur.x + vec.dx, y: cur.y + vec.dy };
        enterSide = oppositeWaterDir(exitSide);
    }
    return { visited: visited, success: success };
}
function flowWater() {
    if (waterPipeState.flowing || waterPipeState.timedOut) return;
    if (waterPipeState.timerId) { clearInterval(waterPipeState.timerId); waterPipeState.timerId = null; }
    var result = traceWater(waterPipeState);
    waterPipeState.flowing = true;
    waterPipeState.fired = false;
    waterPipeState.fullVisited = result.visited;
    waterPipeState.willSucceed = result.success;
    waterPipeState.filled = [];
    stepWaterFlow(0);
}
function stepWaterFlow(i) {
    if (i >= waterPipeState.fullVisited.length) {
        waterPipeState.flowing = false;
        waterPipeState.fired = true;
        waterPipeState.success = waterPipeState.willSucceed;
        if (waterPipeState.success) {
            waterPipeSolved++;
        } else if (waterPipeState.timeLimit > 0 && waterPipeState.timeLeft > 0 && !waterPipeState.timedOut) {
            startWaterPipeTimer();
        }
        renderWaterPipe();
        return;
    }
    waterPipeState.filled.push(waterPipeState.fullVisited[i]);
    renderWaterPipe();
    var t = setTimeout(function () { stepWaterFlow(i + 1); }, 220);
    activeTimers.push(t);
}
function renderPipeShape(sides, isFilled) {
    var color = isFilled ? '#0ea5e9' : '#93c5fd';
    var segMap = {
        top: 'top:0; left:50%; width:8px; height:50%; margin-left:-4px;',
        bottom: 'bottom:0; left:50%; width:8px; height:50%; margin-left:-4px;',
        left: 'left:0; top:50%; height:8px; width:50%; margin-top:-4px;',
        right: 'right:0; top:50%; height:8px; width:50%; margin-top:-4px;'
    };
    var segs = '';
    sides.forEach(function (s) {
        segs += '<div style="position:absolute; background:' + color + '; border-radius:4px; ' + segMap[s] + '"></div>';
    });
    return '<div style="position:absolute; top:0; left:0; width:100%; height:100%;">' + segs + '</div>';
}
function renderWaterPipe() {
    var html = '<div class="game-title-box">🔀 논리 회로 물길 연결하기</div>';
    html += '<div class="game-sub-desc">파이프를 눌러 90도씩 돌려서, 🚰 수도꼭지의 물이 🪣 물탱크까지 이어지도록 연결해보세요!</div>';
    html += '<div class="status-row"><div>' + waterPipeRound + '라운드</div><div>성공: ' + waterPipeSolved + '개</div></div>';
    if (waterPipeState.timeLimit > 0 && !waterPipeState.fired && !waterPipeState.timedOut) {
        html += '<div class="timer-container" style="display:block;"><div class="timer-bar" id="waterPipeTimerBar"></div></div>';
    }
    var size = waterPipeState.size;
    var pipeAt = {};
    waterPipeState.path.forEach(function (p, i) { pipeAt[p.x + ',' + p.y] = i; });
    html += '<div class="maze-wrap"><div class="maze-grid" style="grid-template-columns: repeat(' + size + ', 44px);">';
    for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
            var key = x + ',' + y;
            var isSourceCell = (y === 0 && x === waterPipeState.source.x);
            var isTargetCell = (y === size - 1 && x === waterPipeState.target.x);
            var pipeIdx = pipeAt[key];
            var content = '';
            var cellStyle = 'border:1px solid #e2e8f0; position:relative; width:44px; height:44px;';
            if (pipeIdx !== undefined) {
                var pipe = waterPipeState.pipes[pipeIdx];
                var sides = getOpenSides(pipe.rotation, pipe.kind);
                var isFilled = waterPipeState.filled.some(function (f) { return f.x === x && f.y === y; });
                content = renderPipeShape(sides, isFilled);
                cellStyle += 'cursor:pointer;';
            }
            var onclickAttr = (pipeIdx !== undefined && !waterPipeState.flowing && !waterPipeState.timedOut) ? ' onclick="rotateWaterPipe(' + pipeIdx + ')"' : '';
            var topLabel = isSourceCell ? '<div style="position:absolute; top:-22px; left:50%; transform:translateX(-50%); font-size:1.1rem;">🚰</div>' : '';
            var bottomLabel = isTargetCell ? '<div style="position:absolute; bottom:-22px; left:50%; transform:translateX(-50%); font-size:1.1rem;">🪣</div>' : '';
            html += '<div class="maze-cell" style="' + cellStyle + '"' + onclickAttr + '>' + content + topLabel + bottomLabel + '</div>';
        }
    }
    html += '</div></div>';
    html += '<div class="options-grid">';
    html += '<button class="action-btn" ' + (waterPipeState.flowing || waterPipeState.timedOut ? 'disabled' : '') + ' onclick="flowWater()">💧 물 흘리기!</button>';
    html += '</div>';
    html += '<div id="waterPipeMsg" class="msg-box"></div>';
    document.getElementById('mainArea').innerHTML = html;
    if (waterPipeState.timeLimit > 0 && !waterPipeState.fired && !waterPipeState.timedOut) {
        var barEl = document.getElementById('waterPipeTimerBar');
        if (barEl) barEl.style.width = (waterPipeState.timeLeft / waterPipeState.timeLimit * 100) + '%';
    }
    if (waterPipeState.timedOut) {
        var tmsg = document.getElementById('waterPipeMsg');
        tmsg.className = 'msg-box bad'; tmsg.style.display = 'block'; tmsg.innerText = '⏰ 시간이 다 됐어요!';
        document.getElementById('mainArea').insertAdjacentHTML('beforeend',
            '<div class="options-grid">' +
            '<button class="action-btn" onclick="retryWaterPipeRound()">다시 시도 🔁</button>' +
            '<button class="action-btn secondary" onclick="restartWaterPipe()">처음부터 풀기 🔄</button>' +
            '</div>');
    } else if (waterPipeState.fired) {
        var msg = document.getElementById('waterPipeMsg');
        if (waterPipeState.success) {
            msg.className = 'msg-box'; msg.style.display = 'block'; msg.innerText = '🎉 물탱크에 물이 가득 찼어요! 성공이에요.';
            document.getElementById('mainArea').insertAdjacentHTML('beforeend', buildStandardResultButtons('nextWaterPipeRound()', 'retryWaterPipeRound()', 'restartWaterPipe()'));
        } else {
            msg.className = 'msg-box bad'; msg.style.display = 'block'; msg.innerText = '아쉬워요! 물이 중간에 새어 나갔어요. 파이프 방향을 다시 맞춰보세요.';
            document.getElementById('mainArea').insertAdjacentHTML('beforeend',
                '<div class="options-grid">' +
                '<button class="action-btn" onclick="retryWaterPipeRound()">다시 시도 🔁</button>' +
                '<button class="action-btn secondary" onclick="restartWaterPipe()">처음부터 풀기 🔄</button>' +
                '</div>');
        }
    }
}

// ===================== 게임 등록 =====================
GAME_INIT_FNS.blockCoding = initBlockCoding;
GAME_INIT_FNS.conditionalRobot = initConditionalRobot;
GAME_INIT_FNS.codeTrace = initCodeTrace;
GAME_INIT_FNS.variableScore = initVariableScore;
GAME_INIT_FNS.functionFinder = initFunctionFinder;
GAME_INIT_FNS.efficiencyGuess = initEfficiencyGuess;
GAME_INIT_FNS.logicGate = initLogicGate;
GAME_INIT_FNS.hamburgerMaker = initHamburger;
GAME_INIT_FNS.waterPipe = initWaterPipe;
