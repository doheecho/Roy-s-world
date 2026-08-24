// ===================== 기억력/연주: 멜로디 연주하기 (오선보 + 건반) =====================
// 이 파일은 memory.js 의 playPianoTone()/getPianoAudioCtx()/PIANO_WHITE_FREQ_BASE/PIANO_SHARP_FREQ_BASE 를 재사용합니다.
//
// ---- 노래 데이터 표기법 ----
// 기본 단위는 4분음표입니다.
//   도레미파솔라시      : 글자 하나 = 4분음표 1개 (기본, 괄호 없으면 무조건 4분음표)
//   도(8) 도(16) 도(2) 도(1) : 괄호 안 숫자 = 음표의 "분모" (8=8분,16=16분,2=2분,1=온음표)
//   u도 u레 ...        : 한 옥타브 위 (뒤에 (8) 등 길이 지정 가능, 예: u도(8))
//   d도 d레 ...        : 한 옥타브 아래
//   -                   : 4분쉼표 1개 (기본). -(8) 처럼 뒤에 숫자를 붙이면 그 길이만큼 쉼
//   ~                   : 바로 앞 음을 16분음표 1개 분량 더 홀드(연장)
// 연속된 쉼표(-)는 자동으로 합쳐져서 알맞은 쉼표 기호로 그려집니다.
// 새 노래를 추가하려면 MELODY_SONGS 배열에 buildMelodySong(id, 이름, 패턴문자열)만 추가하면 됩니다.

// 내부적으로는 16분음표 1개 = 1유닛(최소단위)로 계산합니다.
var MELODY_DEFAULT_UNITS = 4; // 괄호 없을 때 기본값 = 4분음표
var MELODY_MEASURE_UNITS = 16; // 한 칸(마디, 4/4 기준 4분음표 4개) = 16유닛
var MELODY_UNIT_MS = 120; // 16분음표 1유닛의 재생 길이(ms) - 4분음표=480ms 기준
var MELODY_FIRST_NOTE_DELAY_MS = 1000; // 오디오 컨텍스트가 완전히 켜질 시간을 주기 위한 첫 음 지연

// 음이름(자연음 7개) - 크로매틱 인덱스(0~11)에서 sharp:false 인 자리와 대응
var MELODY_PITCH_CLASSES = [
    { name: '도', sharp: false }, { name: '도#', sharp: true },
    { name: '레', sharp: false }, { name: '레#', sharp: true },
    { name: '미', sharp: false },
    { name: '파', sharp: false }, { name: '파#', sharp: true },
    { name: '솔', sharp: false }, { name: '솔#', sharp: true },
    { name: '라', sharp: false }, { name: '라#', sharp: true },
    { name: '시', sharp: false }
];
var MELODY_WHITE_NAMES = ['도', '레', '미', '파', '솔', '라', '시'];
var MELODY_PC_TO_DIA = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };

function melodyStaffY(pitchClass, octaveOffset) {
    var dia = MELODY_PC_TO_DIA[pitchClass - (MELODY_PITCH_CLASSES[pitchClass].sharp ? 1 : 0)];
    var step = octaveOffset * 7 + dia;
    return 70 - step * 7;
}
function getMelodyNoteFreq(pitchClass, octaveOffset) {
    var meta = MELODY_PITCH_CLASSES[pitchClass];
    var dia = MELODY_PC_TO_DIA[pitchClass - (meta.sharp ? 1 : 0)];
    var baseName = MELODY_WHITE_NAMES[dia];
    var mult = Math.pow(2, octaveOffset);
    return meta.sharp ? PIANO_SHARP_FREQ_BASE[baseName] * mult : PIANO_WHITE_FREQ_BASE[baseName] * mult;
}
function getLedgerLineYs(y) {
    var ys = [];
    if (y < 0) { for (var ly = -14; ly >= y; ly -= 14) { ys.push(ly); } }
    else if (y > 56) { for (var ly2 = 70; ly2 <= y; ly2 += 14) { ys.push(ly2); } }
    return ys;
}

// ---- 패턴 문자열 파서 ----
function melodyMatchDurationParen(s, i) {
    if (s.charAt(i) !== '(') return null;
    var j = i + 1, numStr = '';
    while (j < s.length && s.charAt(j) >= '0' && s.charAt(j) <= '9') { numStr += s.charAt(j); j++; }
    if (numStr === '' || s.charAt(j) !== ')') return null;
    var denom = parseInt(numStr, 10);
    if (!denom || denom <= 0) return null;
    var units = Math.round(16 / denom);
    return { units: units, nextIndex: j + 1 };
}
function parseMelodyPattern(str) {
    var noteMap = { '도': 0, '레': 2, '미': 4, '파': 5, '솔': 7, '라': 9, '시': 11 };
    var events = [];
    var i = 0;
    while (i < str.length) {
        var c = str.charAt(i);
        if (c === '~') {
            if (events.length > 0 && events[events.length - 1].type === 'note') {
                events[events.length - 1].units += 1;
            }
            i++; continue;
        }
        var octaveOffset = 0;
        var checkIdx = i;
        if (c === 'u') { octaveOffset = 1; checkIdx = i + 1; }
        else if (c === 'd') { octaveOffset = -1; checkIdx = i + 1; }
        var c2 = str.charAt(checkIdx);
        if (noteMap.hasOwnProperty(c2)) {
            var pitchClass = noteMap[c2];
            var afterNoteIdx = checkIdx + 1;
            if (str.charAt(afterNoteIdx) === '#') {
                pitchClass += 1;
                afterNoteIdx += 1;
                if (pitchClass >= 12) { pitchClass -= 12; octaveOffset += 1; } // 시# 같은 예외 처리(다음 옥타브로 넘어감)
            }
            i = afterNoteIdx;
            var dur = MELODY_DEFAULT_UNITS;
            var dm = melodyMatchDurationParen(str, i);
            if (dm) { dur = dm.units; i = dm.nextIndex; }
            events.push({ type: 'note', pitchClass: pitchClass, octaveOffset: octaveOffset, units: dur });
            continue;
        }
        if (c === '-') {
            i++;
            var dur2 = MELODY_DEFAULT_UNITS;
            var dm2 = melodyMatchDurationParen(str, i);
            if (dm2) { dur2 = dm2.units; i = dm2.nextIndex; }
            if (events.length > 0 && events[events.length - 1].type === 'rest') {
                events[events.length - 1].units += dur2;
            } else {
                events.push({ type: 'rest', units: dur2 });
            }
            continue;
        }
        i++;
    }
    var startUnit = 0;
    var noteEvents = [];
    events.forEach(function (e) {
        e.startUnit = startUnit;
        startUnit += e.units;
        if (e.type === 'note') { e.noteIndex = noteEvents.length; noteEvents.push(e); }
    });
    return { events: events, noteEvents: noteEvents, totalUnits: startUnit };
}
function buildMelodySong(id, name, pattern) {
    var parsed = parseMelodyPattern(pattern);
    return { id: id, name: name, events: parsed.events, noteEvents: parsed.noteEvents, totalUnits: parsed.totalUnits };
}
function getSongOctaveOffsets(song) {
    var set = { 0: true };
    song.noteEvents.forEach(function (e) { set[e.octaveOffset] = true; });
    var offsets = Object.keys(set).map(function (k) { return parseInt(k, 10); });
    offsets.sort(function (a, b) { return b - a; });
    return offsets;
}
function melodySegIndexOf(ev) { return Math.floor(ev.startUnit / melodyState.segmentUnits); }

var MELODY_SONGS = [
    buildMelodySong('twinkle', '작은별', '도(4)도(4)솔(4)솔(4)라(4)라(4)솔(4)-(4)파(4)파(4)미(4)미(4)레(4)레(4)도(4)-(4)솔(4)솔(4)파(4)파(4)미(4)미(4)레(4)-(4)솔(4)솔(4)파(4)파(4)미(4)미(4)레(4)-(4)도(4)도(4)솔(4)솔(4)라(4)라(4)솔(4)-(4)파(4)파(4)미(4)미(4)레(4)레(4)도(4)-(4)'),
    buildMelodySong('butterfly', '나비야', '솔(4)미(4)미(4)-(4)파(4)레(4)레(4)-(4)도(4)레(4)미(4)파(4)솔(4)솔(4)솔(4)-(4)솔(4)미(4)미(4)미(4)파(4)레(4)레(4)-(4)도(4)미(4)솔(4)솔(4)미(4)미(4)미(4)-(4)레(4)레(4)레(4)레(4)레(4)미(4)파(4)-(4)미(4)미(4)미(4)미(4)미(4)파(4)솔(4)-(4)솔(4)미(4)미(4)-(4)파(4)레(4)레(4)-(4)도(4)미(4)솔(4)솔(4)미(4)미(4)미(4)'),
    buildMelodySong('schoolbell', '학교종', '솔(4)솔(4)라(4)라(4)솔(4)솔(4)미(4)-(4)솔(4)솔(4)미(4)미(4)레(4)-(4)-(4)-(4)솔(4)솔(4)라(4)라(4)솔(4)솔(4)미(4)-(4)솔(4)미(4)레(4)미(4)도(4)-(4)-(4)'),
    buildMelodySong('bear', '곰세마리', '도(8)-(8)도(8)도(8)도(8)-(8)도(8)-(8)미(8)-(8)솔(8)-(8)미(8)-(8)도(8)-(8)솔(8)솔(8)미(8)-(8)솔(8)솔(8)미(8)-(8)도(8)-(8)도(8)-(8)도(8)-(8)-(8)-(8)솔(8)-(8)솔(8)-(8)미(8)-(8)도(8)-(8)솔(8)-(8)솔(8)-(8)솔(8)-(8)-(8)-(8)솔(8)-(8)솔(8)-(8)미(8)-(8)도(8)-(8)솔(8)-(8)솔(8)-(8)솔(8)-(8)-(8)-(8)솔(8)-(8)솔(8)-(8)미(8)-(8)도(8)-(8)솔(8)-(8)u솔(8)라(8)솔(8)-(8)-(8)-(8)u도(8)-(8)솔(8)-(8)u도(8)-(8)솔(8)-(8)미(8)-(8)레(8)-(8)도(8)-(8)-(8)-(8)')
];

var melodySettings = { songId: 'twinkle', segmentMeasures: 2 };
var melodyState = {};
var melodyMode = 'song';
var freePlaySettings = { octaves: 1 };
var freePlayState = {};

function initMelodyGame() { renderMelodySetup(); }
function setMelodyMode(m) { melodyMode = m; renderMelodySetup(); }

function renderMelodySetup() {
    var html = '<div class="game-title-box">🎼 멜로디 연주하기</div>';
    html += '<div class="setup-btn-group" style="margin-bottom:0.8rem;">';
    html += '<button class="setup-btn' + (melodyMode === 'song' ? ' active' : '') + '" onclick="setMelodyMode(\'song\')">🎵 노래 연습</button>';
    html += '<button class="setup-btn' + (melodyMode === 'free' ? ' active' : '') + '" onclick="setMelodyMode(\'free\')">🎹 자유 연주</button>';
    html += '</div>';
    html += melodyMode === 'free' ? renderFreePlaySetupInner() : renderSongSetupInner();
    document.getElementById('mainArea').innerHTML = html;
}

function renderSongSetupInner() {
    var html = '<div class="game-sub-desc">악보를 보고 건반을 순서대로 눌러 연주해보세요! 틀려도 끝까지 연주할 수 있어요.</div>';
    html += '<div class="setup-section-label">노래 선택</div><div class="setup-btn-group">';
    MELODY_SONGS.forEach(function (s) {
        html += '<button class="setup-btn' + (melodySettings.songId === s.id ? ' active' : '') + '" onclick="setMelodySong(\'' + s.id + '\')">' + s.name + '</button>';
    });
    html += '</div>';
    html += '<div class="setup-section-label">연주 길이</div><div class="setup-btn-group">';
    [2, 4].forEach(function (m) {
        html += '<button class="setup-btn' + (melodySettings.segmentMeasures === m ? ' active' : '') + '" onclick="setMelodySegmentMeasures(' + m + ')">' + m + '칸씩</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startMelodySession()">시작하기 🚀</button>';
    return html;
}
function setMelodySegmentMeasures(m) { melodySettings.segmentMeasures = m; renderMelodySetup(); }

function renderFreePlaySetupInner() {
    var opts = [1, 2, 3];
    var html = '<div class="game-sub-desc">정해진 곡 없이 건반을 자유롭게 눌러 연주해보세요!</div>';
    html += '<div class="setup-section-label">옥타브 수</div><div class="setup-btn-group">';
    opts.forEach(function (n) {
        html += '<button class="setup-btn' + (freePlaySettings.octaves === n ? ' active' : '') + '" onclick="setFreePlayOctaves(' + n + ')">' + n + '옥타브</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startFreePlaySession()">시작하기 🚀</button>';
    return html;
}
function setFreePlayOctaves(n) { freePlaySettings.octaves = n; renderMelodySetup(); }
function setMelodySong(id) { melodySettings.songId = id; renderMelodySetup(); }
function getMelodySong() {
    var found = null;
    MELODY_SONGS.forEach(function (s) { if (s.id === melodySettings.songId) found = s; });
    return found || MELODY_SONGS[0];
}

// ===================== 건반 (도~시 12건반, 옥타브별로 세로로 쌓임) - 노래연습/자유연주 공용 =====================
// includeTrailingDo=true 이면 다음 옥타브의 '도'를 마지막에 추가해서 "도~도"까지 표시
function buildMelodyKeyboardRow(octaveOffset, includeTrailingDo) {
    var keys = [];
    var whiteSlot = 0;
    for (var pc = 0; pc < 12; pc++) {
        var meta = MELODY_PITCH_CLASSES[pc];
        var freq = getMelodyNoteFreq(pc, octaveOffset);
        if (!meta.sharp) {
            keys.push({ pitchClass: pc, octaveOffset: octaveOffset, name: meta.name, freq: freq, black: false, whiteSlot: whiteSlot });
            whiteSlot++;
        } else {
            keys.push({ pitchClass: pc, octaveOffset: octaveOffset, name: meta.name, freq: freq, black: true, whiteSlot: whiteSlot - 1 });
        }
    }
    if (includeTrailingDo) {
        keys.push({ pitchClass: 0, octaveOffset: octaveOffset + 1, name: '도', freq: getMelodyNoteFreq(0, octaveOffset + 1), black: false, whiteSlot: whiteSlot });
    }
    return keys;
}
function renderOctaveKeyboardRow(keys, rowLabel, clickFnName) {
    var whiteCount = keys.filter(function (k) { return !k.black; }).length;
    var whitePct = 100 / whiteCount;
    var blackPct = whitePct * 0.62;
    var rowH = 110;
    var html = '';
    if (rowLabel) { html += '<div style="font-size:0.75rem; color:#6b7280; margin:0.3rem 0 0.15rem 0.2rem;">' + rowLabel + '</div>'; }
    html += '<div style="position:relative; width:100%; height:' + rowH + 'px; margin-bottom:0.5rem;">';
    var wSlot = 0;
    keys.forEach(function (k) {
        if (k.black) return;
        html += '<button style="position:absolute; left:' + (wSlot * whitePct) + '%; top:0; width:' + whitePct + '%; height:' + rowH + 'px; background:#ffffff; border:2px solid #1f2937; border-radius:0 0 0.3rem 0.3rem; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0.4rem; font-weight:800; font-size:0.85rem; color:#4b5563; box-shadow:0 3px 0 #cbd5e1; z-index:1; transition:background 0.08s, transform 0.08s;" onclick="' + clickFnName + '(this,' + k.octaveOffset + ',' + k.pitchClass + ')">' + k.name + '</button>';
        wSlot++;
    });
    keys.forEach(function (k) {
        if (!k.black) return;
        var leftPct = (k.whiteSlot + 1) * whitePct - blackPct / 2;
        html += '<button style="position:absolute; left:' + leftPct + '%; top:0; width:' + blackPct + '%; height:' + (rowH * 0.6) + 'px; background:#1f2937; border:2px solid #000; border-radius:0 0 0.25rem 0.25rem; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0.3rem; font-weight:800; font-size:0.68rem; color:#fff; z-index:2; transition:background 0.08s, transform 0.08s;" onclick="' + clickFnName + '(this,' + k.octaveOffset + ',' + k.pitchClass + ')">' + k.name + '</button>';
    });
    html += '</div>';
    return html;
}

// ===================== 자유 연주 =====================
function startFreePlaySession() {
    freePlayState = { octaves: freePlaySettings.octaves };
    renderFreePlayGame();
}
function renderFreePlayGame() {
    var n = freePlayState.octaves;
    var html = '<div class="game-title-box">🎹 자유 연주 (' + n + '옥타브)</div>';
    html += '<div class="game-sub-desc">건반을 눌러 자유롭게 연주해보세요!</div>';
    for (var i = n - 1; i >= 0; i--) {
        html += renderOctaveKeyboardRow(buildMelodyKeyboardRow(i, true), (i + 1) + '옥타브', 'freePlayKeyClick');
    }
    html += '<button class="action-btn secondary" style="width:100%; margin-top:0.6rem;" onclick="renderMelodySetup()">설정으로 돌아가기 ⏮</button>';
    document.getElementById('mainArea').innerHTML = html;
}
// 건반을 누르면 색을 바꾸고 살짝 눌리는 효과를 줌 (흰/검 건반 색 자동 구분)
function flashKeyPress(btn) {
    if (!btn) return;
    var isBlackKey = btn.style.background.indexOf('31, 41, 55') > -1 || btn.style.background === '#1f2937' || btn.style.background === 'rgb(31, 41, 55)';
    var origBg = btn.style.background;
    btn.style.background = isBlackKey ? '#eab308' : '#fde68a';
    btn.style.transform = 'translateY(2px)';
    var t = setTimeout(function () {
        btn.style.background = origBg;
        btn.style.transform = '';
    }, 150);
    activeTimers.push(t);
}
function freePlayKeyClick(btn, octaveOffset, pitchClass) {
    playPianoTone(getMelodyNoteFreq(pitchClass, octaveOffset));
    vibrateShort();
    flashKeyPress(btn);
}

// ===================== 노래 연습 세션 =====================
function startMelodySession(fullMode) {
    var song = getMelodySong();
    melodyState = {
        song: song, pos: 0, hits: 0,
        mode: fullMode ? 'full' : 'segment',
        segmentUnits: MELODY_MEASURE_UNITS * melodySettings.segmentMeasures,
        segIndex: 0, finished: false, isPlaying: false, demoActiveEvent: null,
        displayFull: false
    };
    renderMelodyGame(); // 자동재생 없이 화면만 그림 - 구간듣기/전체듣기 버튼을 눌러야 재생 시작
}
function retryMelodySong() { startMelodySession(melodyState.mode === 'full'); }

function getVisibleEvents() {
    if (melodyState.mode === 'full' || melodyState.displayFull) return melodyState.song.events;
    return melodyState.song.events.filter(function (e) { return melodySegIndexOf(e) === melodyState.segIndex; });
}
function getUnitOffset() {
    if (melodyState.mode === 'full' || melodyState.displayFull) return 0;
    return melodyState.segIndex * melodyState.segmentUnits;
}

// ---- 재생 컨트롤: 구간 듣기 / 전체 듣기 / 중단하기 ----
function listenSegmentDemo() {
    melodyState.displayFull = false;
    startMelodyPlaybackWith(getVisibleEvents());
}
function listenFullDemo() {
    melodyState.displayFull = true;
    updateMelodyTop(); // 전체 악보로 화면 전환
    startMelodyPlaybackWith(melodyState.song.events);
}
function stopMelodyPlayback() {
    clearAllGameTimers();
    melodyState.isPlaying = false;
    melodyState.demoActiveEvent = null;
    if (melodyState.displayFull && melodyState.mode !== 'full') {
        melodyState.displayFull = false; // 전체듣기 중단하면 다시 구간 화면으로
    }
    updateMelodyTop();
}
function startMelodyPlaybackWith(events) {
    melodyState.isPlaying = true;
    updateMelodyTop();
    playMelodyEventsDemo(events, function () {
        melodyState.isPlaying = false;
        melodyState.demoActiveEvent = null;
        if (melodyState.displayFull && melodyState.mode !== 'full') { melodyState.displayFull = false; }
        updateMelodyTop();
    });
}
// 구간이 바뀔 때(연주 중 다음 구간으로 넘어갈 때)는 그대로 자동으로 미리 들려줌
function startMelodyPlayback() { startMelodyPlaybackWith(getVisibleEvents()); }


// ---- 오선보 렌더링 ----
function isMelodyWideScreen() { return window.innerWidth >= 700; }

function renderMelodyStaffLines(events, unitOffset) {
    var lineUnits = isMelodyWideScreen() ? melodyState.segmentUnits : melodyState.segmentUnits / 2;
    var unitPx = isMelodyWideScreen() ? 22 : 18;
    var groups = {};
    events.forEach(function (ev) {
        var rel = ev.startUnit - unitOffset;
        var lineIdx = Math.floor(rel / lineUnits);
        if (!groups[lineIdx]) groups[lineIdx] = [];
        groups[lineIdx].push(ev);
    });
    var lineIdxs = Object.keys(groups).map(function (k) { return parseInt(k, 10); }).sort(function (a, b) { return a - b; });
    var html = '<div style="margin-bottom:0.8rem;">';
    lineIdxs.forEach(function (li) {
        var lineOffset = unitOffset + li * lineUnits;
        html += renderMelodyStaffSvg(groups[li], lineOffset, lineUnits, unitPx);
    });
    html += '</div>';
    return html;
}

function classifyMelodyDuration(u) {
    if (u <= 1) return { hollow: false, stem: true, flags: 2, dot: false };
    if (u === 2) return { hollow: false, stem: true, flags: 1, dot: false };
    if (u === 3) return { hollow: false, stem: true, flags: 1, dot: true };
    if (u === 4) return { hollow: false, stem: true, flags: 0, dot: false };
    if (u === 6) return { hollow: false, stem: true, flags: 0, dot: true };
    if (u === 8) return { hollow: true, stem: true, flags: 0, dot: false };
    if (u === 12) return { hollow: true, stem: true, flags: 0, dot: true };
    if (u >= 16) return { hollow: true, stem: false, flags: 0, dot: false };
    return { hollow: u >= 8, stem: true, flags: u < 2 ? 1 : 0, dot: false };
}

function renderQuarterRestPath(cx, midY, fill) {
    var d = 'M ' + (cx - 4) + ' ' + (midY - 11) +
        ' L ' + (cx + 4) + ' ' + (midY - 11) +
        ' L ' + (cx - 4) + ' ' + (midY + 1) +
        ' L ' + (cx + 4) + ' ' + (midY + 1) +
        ' L ' + (cx - 2) + ' ' + (midY + 11);
    return '<path d="' + d + '" stroke="' + fill + '" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round" />';
}
function renderEighthRestShape(cx, midY, fill) {
    var h = '<circle cx="' + (cx + 4) + '" cy="' + (midY - 6) + '" r="3" fill="' + fill + '" />';
    h += '<line x1="' + (cx + 4) + '" y1="' + (midY - 6) + '" x2="' + (cx - 4) + '" y2="' + (midY + 9) + '" stroke="' + fill + '" stroke-width="2" stroke-linecap="round" />';
    return h;
}
function renderSixteenthRestShape(cx, midY, fill) {
    var h = '<circle cx="' + (cx + 5) + '" cy="' + (midY - 8) + '" r="2.6" fill="' + fill + '" />';
    h += '<circle cx="' + (cx + 1) + '" cy="' + (midY - 1) + '" r="2.6" fill="' + fill + '" />';
    h += '<line x1="' + (cx + 5) + '" y1="' + (midY - 8) + '" x2="' + (cx - 5) + '" y2="' + (midY + 11) + '" stroke="' + fill + '" stroke-width="2" stroke-linecap="round" />';
    return h;
}
function renderMelodyRestGlyph(cx, staffTop, units, fill) {
    var midY = staffTop + 28;
    var line4Y = staffTop + 14;
    if (units <= 1) { return renderSixteenthRestShape(cx, midY, fill); }
    if (units === 2) { return renderEighthRestShape(cx, midY, fill); }
    if (units === 3) { return renderEighthRestShape(cx, midY, fill) + '<circle cx="' + (cx + 12) + '" cy="' + (midY - 4) + '" r="1.6" fill="' + fill + '" />'; }
    if (units === 4) { return renderQuarterRestPath(cx, midY, fill); }
    if (units === 6) { return renderQuarterRestPath(cx, midY, fill) + '<circle cx="' + (cx + 12) + '" cy="' + (midY - 4) + '" r="1.6" fill="' + fill + '" />'; }
    if (units === 8) { return '<rect x="' + (cx - 6) + '" y="' + (midY - 5) + '" width="12" height="5" fill="' + fill + '" />'; }
    if (units === 12) { return '<rect x="' + (cx - 6) + '" y="' + (midY - 5) + '" width="12" height="5" fill="' + fill + '" />' + '<circle cx="' + (cx + 11) + '" cy="' + (midY - 2) + '" r="1.6" fill="' + fill + '" />'; }
    return '<rect x="' + (cx - 6) + '" y="' + line4Y + '" width="12" height="5" fill="' + fill + '" />';
}

function renderMelodyStaffSvg(events, unitOffset, widthUnits, unitPx) {
    var leftPad = 46;
    var minY = 0, maxY = 56;
    events.forEach(function (ev) {
        if (ev.type === 'rest') return;
        var y = melodyStaffY(ev.pitchClass, ev.octaveOffset);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });
    // 여백 최소화: 위쪽은 (기둥 높이 + 여유), 아래쪽은 (계이름표 공간 + 여유)만큼만 확보 - 잘리지 않는 선에서 최대한 축소
    var staffTop = Math.max(0, -minY) + 24;
    var bottomMargin = Math.max(0, maxY - 56) + 26;
    var svgHeight = staffTop + 56 + bottomMargin;
    var svgWidth = leftPad + widthUnits * unitPx + 24;
    var html = '<div style="background:#fff; border:2px solid #1f2937; border-radius:0.6rem; padding:0.6rem 0.4rem; margin-bottom:0.5rem; overflow-x:auto;">';
    html += '<svg width="' + svgWidth + '" height="' + svgHeight + '" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" style="display:block; max-width:100%;">';
    [0, 14, 28, 42, 56].forEach(function (ly) {
        html += '<line x1="4" y1="' + (staffTop + ly) + '" x2="' + (svgWidth - 4) + '" y2="' + (staffTop + ly) + '" stroke="#1f2937" stroke-width="1.5" />';
    });
    // 마디선: 4분음표 4개(=MELODY_MEASURE_UNITS)마다 세로 마디줄
    for (var mb = MELODY_MEASURE_UNITS; mb <= widthUnits; mb += MELODY_MEASURE_UNITS) {
        var barX = leftPad + mb * unitPx;
        html += '<line x1="' + barX + '" y1="' + staffTop + '" x2="' + barX + '" y2="' + (staffTop + 56) + '" stroke="#1f2937" stroke-width="1.2" />';
    }
    html += '<text x="6" y="' + (staffTop + 52) + '" font-size="46" fill="#1f2937">𝄞</text>';
    events.forEach(function (ev) {
        var relUnit = ev.startUnit - unitOffset;
        var cx = leftPad + relUnit * unitPx + (ev.units * unitPx) / 2 + 14;
        if (ev.type === 'rest') {
            html += renderMelodyRestGlyph(cx, staffTop, ev.units, '#9ca3af');
            return;
        }
        var meta = MELODY_PITCH_CLASSES[ev.pitchClass];
        var y = melodyStaffY(ev.pitchClass, ev.octaveOffset);
        var cy = staffTop + y;
        var isCurrent = ev.noteIndex === melodyState.pos;
        var isPast = ev.noteIndex < melodyState.pos;
        var isDemoActive = ev === melodyState.demoActiveEvent;
        var fill = isCurrent ? '#f59e0b' : (isPast ? '#9ca3af' : '#1f2937');
        if (isDemoActive) { fill = '#eab308'; }
        var d = classifyMelodyDuration(ev.units);
        getLedgerLineYs(y).forEach(function (ly) {
            html += '<line x1="' + (cx - 14) + '" y1="' + (staffTop + ly) + '" x2="' + (cx + 14) + '" y2="' + (staffTop + ly) + '" stroke="#1f2937" stroke-width="1.5" />';
        });
        if (isDemoActive) {
            html += '<circle class="melody-pulse" cx="' + cx + '" cy="' + cy + '" r="13" fill="#fde047" />';
        }
        if (meta.sharp) {
            html += '<text x="' + (cx - 20) + '" y="' + (cy + 6) + '" font-size="16" fill="' + fill + '">♯</text>';
        }
        if (d.hollow) {
            html += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="7" ry="5.5" fill="#fff" stroke="' + fill + '" stroke-width="2" transform="rotate(-20 ' + cx + ' ' + cy + ')" />';
        } else {
            html += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="7" ry="5.5" fill="' + fill + '" transform="rotate(-20 ' + cx + ' ' + cy + ')" />';
        }
        if (d.stem) {
            var stemX = cx + 6.5, stemTopY = cy - 22;
            html += '<line x1="' + stemX + '" y1="' + cy + '" x2="' + stemX + '" y2="' + stemTopY + '" stroke="' + fill + '" stroke-width="1.5" />';
            for (var fi = 0; fi < d.flags; fi++) {
                var fy = stemTopY + fi * 8;
                var flagPath = 'M ' + stemX + ' ' + fy + ' L ' + (stemX + 9) + ' ' + (fy + 5) + ' L ' + stemX + ' ' + (fy + 11) + ' Z';
                html += '<path d="' + flagPath + '" fill="' + fill + '" />';
            }
        }
        if (d.dot) {
            html += '<circle cx="' + (cx + 12) + '" cy="' + (cy - 2) + '" r="1.6" fill="' + fill + '" />';
        }
        html += '<text x="' + cx + '" y="' + (staffTop + maxY + 20) + '" font-size="12" fill="' + (isDemoActive ? '#a16207' : '#6b7280') + '" font-weight="' + (isDemoActive ? '800' : '400') + '" text-anchor="middle">' + meta.name + '</text>';
    });
    html += '</svg></div>';
    return html;
}

function renderMelodyKeyboard() {
    var offsets = getSongOctaveOffsets(melodyState.song);
    var html = '';
    offsets.forEach(function (off) {
        var label = offsets.length > 1 ? (off === 0 ? '기본 옥타브' : (off > 0 ? '+1옥타브 (높은음)' : '-1옥타브 (낮은음)')) : null;
        html += renderOctaveKeyboardRow(buildMelodyKeyboardRow(off, true), label, 'melodyKeyClick');
    });
    return html;
}

function renderMelodyTopHtml() {
    var song = melodyState.song;
    var totalNotes = song.noteEvents.length;
    var isFull = melodyState.mode === 'full';
    var html = '<style>@keyframes melodyPulse{0%,100%{opacity:0.2;}50%{opacity:0.75;}}.melody-pulse{animation:melodyPulse 0.5s ease-in-out infinite;}</style>';
    html += '<div class="game-title-box">🎼 멜로디 연주하기 · ' + song.name + (isFull ? ' (전체곡)' : '') + '</div>';
    html += '<div class="game-sub-desc">주황색 음표를 순서대로 건반으로 눌러보세요! (연주 중 노란색으로 반짝이는 음이 지금 들리는 음이에요)</div>';
    html += '<div class="status-row"><div>' + melodyState.pos + ' / ' + totalNotes + '음 연주함</div><div>맞은 음: ' + melodyState.hits + '</div></div>';
    html += renderMelodyStaffLines(getVisibleEvents(), getUnitOffset());
    if (melodyState.isPlaying) {
        html += '<button class="action-btn secondary" style="margin-bottom:0.8rem;" onclick="stopMelodyPlayback()">⏸ 중단하기</button>';
    } else if (isFull) {
        html += '<button class="action-btn secondary" style="margin-bottom:0.8rem;" onclick="listenFullDemo()">🔊 다시 듣기</button>';
    } else {
        html += '<div class="options-grid" style="margin-bottom:0.8rem;">';
        html += '<button class="action-btn secondary" onclick="listenSegmentDemo()">🔊 구간 듣기</button>';
        html += '<button class="action-btn secondary" onclick="listenFullDemo()">🎬 전체 듣기</button>';
        html += '</div>';
    }
    return html;
}
// 건반은 세션 동안 절대 바뀌지 않으므로(같은 곡이면 옥타브 구성 고정) 한 번만 그리고,
// 이후에는 melodyTopArea(악보/상태/재생버튼)만 갱신해서 건반 DOM이 계속 살아있게 함
// -> 건반 눌림 효과(flashKeyPress)가 화면에 그려질 시간을 확보하기 위함
function renderMelodyGame() {
    var html = '<div id="melodyTopArea">' + renderMelodyTopHtml() + '</div>';
    html += '<div id="melodyKeyboardArea">' + renderMelodyKeyboard() + '</div>';
    document.getElementById('mainArea').innerHTML = html;
}
function updateMelodyTop() {
    var el = document.getElementById('melodyTopArea');
    if (el) { el.innerHTML = renderMelodyTopHtml(); } else { renderMelodyGame(); }
}

// ---- 리듬 그대로 재생 (쉼표=무음, 홀드=길게) + 재생 중인 음 노란색 하이라이트 ----
function playMelodyTone(freq, ms) {
    var ctx = getPianoAudioCtx();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    var dur = ms / 1000;
    var peak = 0.28;
    var attack = Math.min(0.012, dur * 0.2); // 짧은 어택(클릭 노이즈 방지)
    var release = Math.min(0.07, dur * 0.4); // 끝부분만 짧게 릴리즈
    var sustainEnd = Math.max(attack, dur - release);
    var now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + attack);
    gain.gain.setValueAtTime(peak, now + sustainEnd); // 음 길이 대부분을 일정한 크기로 유지 -> 눌린 느낌
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur);
}
function playMelodyEventsDemo(events, onComplete) {
    var i = 0;
    function step() {
        if (i >= events.length) {
            melodyState.demoActiveEvent = null;
            if (onComplete) onComplete();
            return;
        }
        var ev = events[i];
        var durMs = ev.units * MELODY_UNIT_MS;
        if (ev.type === 'note') {
            melodyState.demoActiveEvent = ev;
            playMelodyTone(getMelodyNoteFreq(ev.pitchClass, ev.octaveOffset), Math.min(durMs * 0.92, 1600));
        } else {
            melodyState.demoActiveEvent = null;
        }
        updateMelodyTop();
        var t = setTimeout(function () { i++; step(); }, durMs);
        activeTimers.push(t);
    }
    var t0 = setTimeout(step, MELODY_FIRST_NOTE_DELAY_MS);
    activeTimers.push(t0);
}

function melodyKeyClick(btn, octaveOffset, pitchClass) {
    if (melodyState.finished) return;
    playPianoTone(getMelodyNoteFreq(pitchClass, octaveOffset));
    vibrateShort();
    flashKeyPress(btn);
    var noteEvents = melodyState.song.noteEvents;
    var expectedEvent = noteEvents[melodyState.pos];
    if (pitchClass === expectedEvent.pitchClass && octaveOffset === expectedEvent.octaveOffset) melodyState.hits++;
    melodyState.pos++;
    if (melodyState.pos >= noteEvents.length) {
        melodyState.finished = true;
        stopMelodyPlayback();
        renderMelodyResult();
        return;
    }
    if (melodyState.mode === 'segment') {
        var nextSeg = melodySegIndexOf(noteEvents[melodyState.pos]);
        if (nextSeg !== melodyState.segIndex) {
            melodyState.segIndex = nextSeg;
            updateMelodyTop();
            startMelodyPlayback();
            return;
        }
    }
    updateMelodyTop();
}

function renderMelodyResult() {
    var song = melodyState.song;
    var total = song.noteEvents.length;
    var pct = Math.round((melodyState.hits / total) * 100);
    var grade = pct >= 90 ? '🌟 참 잘했어요!' : (pct >= 70 ? '👍 잘했어요!' : (pct >= 50 ? '💪 조금 더 연습해봐요' : '🔁 다시 도전해봐요'));
    var isFull = melodyState.mode === 'full';
    var html = '<div class="game-title-box">🎼 멜로디 연주하기 · ' + song.name + '</div>';
    html += '<div class="game-sub-desc">연주를 모두 마쳤어요!</div>';
    html += '<div class="msg-box" style="display:block; text-align:center; font-size:1.05rem; line-height:1.8;">' + grade + '<br>정확도 <b>' + pct + '%</b> (' + melodyState.hits + ' / ' + total + '음 일치)</div>';
    html += '<div class="options-grid">';
    html += '<button class="action-btn" onclick="retryMelodySong()">다시 연주하기 🔁</button>';
    if (!isFull) {
        html += '<button class="action-btn secondary" onclick="startMelodySession(true)">전체곡 연주하기 🎬</button>';
    } else {
        html += '<button class="action-btn secondary" onclick="startMelodySession(false)">구간별로 다시 연습 📖</button>';
    }
    html += '</div>';
    html += '<button class="action-btn secondary" style="width:100%; margin-top:0.5rem;" onclick="renderMelodySetup()">다른 노래 선택 🎵</button>';
    html += '<button class="action-btn secondary" style="width:100%; margin-top:0.5rem;" onclick="goHome()">⏮ 이전으로 가기</button>';
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 게임 등록 =====================
GAME_INIT_FNS.melodyGame = initMelodyGame;
