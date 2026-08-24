// ===================== 기억력/연주: 멜로디 연주하기 (오선보 + 건반) =====================
// 이 파일은 memory.js 의 buildPianoKeys()/playPianoTone()/getPianoAudioCtx() 를 그대로 재사용합니다.
// (도~도 한 옥타브, 반음 포함 13건반: buildPianoKeys('mid') 결과와 인덱스가 1:1로 대응)
//
// ---- 노래 데이터 표기법 ----
// 기본 단위는 8분음표(1유닛)입니다.
//   도레미파솔라시      : 글자 하나 = 8분음표 1개 (기본)
//   도(4)               : 괄호 안 숫자는 음표의 "분모"(4=4분음표=2유닛, 2=2분음표=4유닛, 1=온음표=8유닛)
//   -                   : 8분쉼표 1개 (기본). 뒤에 (4) 등을 붙이면 그 길이만큼 쉼
//   ~                   : 바로 앞 음을 8분음표 1개 분량 더 홀드(연장)
//   도(높은음)           : 옥타브 위 도 (괄호 뒤에 (4) 등을 추가로 붙여 길이 지정 가능)
// 연속된 쉼표(-)는 자동으로 합쳐져서 알맞은 쉼표 기호(8분/4분/점4분/2분/점2분/온쉼표)로 그려집니다.
// 새 노래를 추가하려면 MELODY_SONGS 배열에 buildMelodySong(id, 이름, 패턴문자열)만 추가하면 됩니다.

var SEGMENT_UNITS = 32; // 구간(다시듣기 단위) = 4마디(8분음표 32개)
var MELODY_UNIT_MS = 240; // 8분음표 1유닛의 재생 길이(ms)
var MELODY_FIRST_NOTE_DELAY_MS = 1000; // 오디오 컨텍스트가 완전히 켜질 시간을 주기 위한 첫 음 지연

// 인덱스(0~12) = buildPianoKeys('mid') 의 keys 배열 인덱스와 동일
// 0:도 1:도# 2:레 3:레# 4:미 5:파 6:파# 7:솔 8:솔# 9:라 10:라# 11:시 12:도(높은)
var MELODY_NOTE_META = [
    { name: '도', y: 70, ledger: true, sharp: false },
    { name: '도#', y: 70, ledger: true, sharp: true },
    { name: '레', y: 63, ledger: false, sharp: false },
    { name: '레#', y: 63, ledger: false, sharp: true },
    { name: '미', y: 56, ledger: false, sharp: false },
    { name: '파', y: 49, ledger: false, sharp: false },
    { name: '파#', y: 49, ledger: false, sharp: true },
    { name: '솔', y: 42, ledger: false, sharp: false },
    { name: '솔#', y: 42, ledger: false, sharp: true },
    { name: '라', y: 35, ledger: false, sharp: false },
    { name: '라#', y: 35, ledger: false, sharp: true },
    { name: '시', y: 28, ledger: false, sharp: false },
    { name: '도', y: 21, ledger: false, sharp: false }
];

// ---- 패턴 문자열 파서 ----
function melodyMatchDurationParen(s, i) {
    if (s.charAt(i) !== '(') return null;
    var j = i + 1, numStr = '';
    while (j < s.length && s.charAt(j) >= '0' && s.charAt(j) <= '9') { numStr += s.charAt(j); j++; }
    if (numStr === '' || s.charAt(j) !== ')') return null;
    var denom = parseInt(numStr, 10);
    if (!denom || denom <= 0) return null;
    var units = Math.round(8 / denom); // 8분음표=1유닛 기준, N분음표 = 8/N 유닛
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
                events[events.length - 1].units++;
            }
            i++; continue;
        }
        var pitchIdx = null, consumed = 0;
        if (str.substr(i, 6) === '도(높은음)') { pitchIdx = 12; consumed = 6; }
        else if (noteMap.hasOwnProperty(c)) { pitchIdx = noteMap[c]; consumed = 1; }
        if (pitchIdx !== null) {
            i += consumed;
            var dur = 1;
            var dm = melodyMatchDurationParen(str, i);
            if (dm) { dur = dm.units; i = dm.nextIndex; }
            events.push({ type: 'note', idx: pitchIdx, units: dur });
            continue;
        }
        if (c === '-') {
            i++;
            var dur2 = 1;
            var dm2 = melodyMatchDurationParen(str, i);
            if (dm2) { dur2 = dm2.units; i = dm2.nextIndex; }
            if (events.length > 0 && events[events.length - 1].type === 'rest') {
                events[events.length - 1].units += dur2;
            } else {
                events.push({ type: 'rest', units: dur2 });
            }
            continue;
        }
        i++; // 공백 등 인식 안되는 글자는 무시
    }
    var startUnit = 0;
    var noteEvents = [];
    events.forEach(function (e) {
        e.startUnit = startUnit;
        e.segIndex = Math.floor(startUnit / SEGMENT_UNITS);
        startUnit += e.units;
        if (e.type === 'note') { e.noteIndex = noteEvents.length; noteEvents.push(e); }
    });
    return { events: events, noteEvents: noteEvents, totalUnits: startUnit };
}
function buildMelodySong(id, name, pattern) {
    var parsed = parseMelodyPattern(pattern);
    return { id: id, name: name, events: parsed.events, noteEvents: parsed.noteEvents, totalUnits: parsed.totalUnits };
}

var MELODY_SONGS = [
    buildMelodySong('twinkle', '작은별', '도(4)도(4)솔(4)솔(4)라(4)라(4)솔(4)-(4)파(4)파(4)미(4)미(4)레(4)레(4)도(4)-(4)솔(4)솔(4)파(4)파(4)미(4)미(4)레(4)-(4)솔(4)솔(4)파(4)파(4)미(4)미(4)레(4)-(4)도(4)도(4)솔(4)솔(4)라(4)라(4)솔(4)-(4)파(4)파(4)미(4)미(4)레(4)레(4)도(4)-(4)'),
    buildMelodySong('butterfly', '나비야', '솔(4)미(4)미(4)-(4)파(4)레(4)레(4)-(4)도(4)레(4)미(4)파(4)솔(4)솔(4)솔(4)-(4)솔(4)미(4)미(4)미(4)파(4)레(4)레(4)-(4)도(4)미(4)솔(4)솔(4)미(4)미(4)미(4)-(4)레(4)레(4)레(4)레(4)레(4)미(4)파(4)-(4)미(4)미(4)미(4)미(4)미(4)파(4)솔(4)-(4)솔(4)미(4)미(4)-(4)파(4)레(4)레(4)-(4)도(4)미(4)솔(4)솔(4)미(4)미(4)미(4)'),
    buildMelodySong('schoolbell', '학교종', '솔(4)솔(4)라(4)라(4)솔(4)솔(4)미(4)--솔(4)솔(4)미(4)미(4)레(4)--솔(4)솔(4)라(4)라(4)솔(4)솔(4)미(4)--솔(4)미(4)레(4)미(4)도--'),
    buildMelodySong('bear', '곰세마리', '도(4)도도도(4)도(4)미(4)솔(4)미(4)도(4)솔솔미(4)솔솔미(4)도(4)도(4)도(4)--솔(4)솔(4)미(4)도(4)솔(4)솔(4)솔(4)--솔(4)솔(4)미(4)도(4)솔(4)솔(4)솔(4)--솔(4)솔(4)미(4)도(4)솔(4)솔라솔(4)--도(4)솔(4)도(4)솔(4)미(4)레(4)도(4)--')
];

var melodyKeys = null;
var melodySettings = { songId: 'twinkle' };
var melodyState = {};
var melodyMode = 'song'; // 'song' | 'free'
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
    html += '<button class="action-btn" onclick="startMelodySession()">시작하기 🚀</button>';
    return html;
}

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

// ===================== 자유 연주 (옥타브 최대 3개, 세로로 쌓아서 표시) =====================
function buildFreePlayOctaveKeys(octIndex) {
    var mult = Math.pow(2, octIndex);
    var keys = [];
    var whiteSlot = 0;
    PIANO_WHITE_NOTES.forEach(function (n) {
        keys.push({ note: n, freq: PIANO_WHITE_FREQ_BASE[n] * mult, black: false, whiteSlot: whiteSlot });
        whiteSlot++;
        if (PIANO_SHARP_FREQ_BASE[n]) {
            keys.push({ note: n + '#', freq: PIANO_SHARP_FREQ_BASE[n] * mult, black: true, whiteSlot: whiteSlot - 1 });
        }
    });
    return keys;
}

function startFreePlaySession() {
    var n = freePlaySettings.octaves;
    var rows = [];
    for (var i = n - 1; i >= 0; i--) { rows.push({ octIndex: i, keys: buildFreePlayOctaveKeys(i) }); }
    freePlayState = { rows: rows, octaves: n };
    renderFreePlayGame();
}

function renderFreePlayOctaveRow(keys, octIndex) {
    var whiteCount = keys.filter(function (k) { return !k.black; }).length; // 7 (도~시)
    var whitePct = 100 / whiteCount;
    var blackPct = whitePct * 0.62;
    var rowH = 110;
    var html = '<div style="position:relative; width:100%; height:' + rowH + 'px; margin-bottom:0.5rem;">';
    var wSlot = 0;
    keys.forEach(function (k, idx) {
        if (k.black) return;
        html += '<button style="position:absolute; left:' + (wSlot * whitePct) + '%; top:0; width:' + whitePct + '%; height:' + rowH + 'px; background:#ffffff; border:2px solid #1f2937; border-radius:0 0 0.3rem 0.3rem; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0.4rem; font-weight:800; font-size:0.85rem; color:#4b5563; box-shadow:0 3px 0 #cbd5e1; z-index:1;" onclick="freePlayKeyClick(' + octIndex + ',' + idx + ')">' + k.note + '</button>';
        wSlot++;
    });
    keys.forEach(function (k, idx) {
        if (!k.black) return;
        var leftPct = (k.whiteSlot + 1) * whitePct - blackPct / 2;
        html += '<button style="position:absolute; left:' + leftPct + '%; top:0; width:' + blackPct + '%; height:' + (rowH * 0.6) + 'px; background:#1f2937; border:2px solid #000; border-radius:0 0 0.25rem 0.25rem; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0.3rem; font-weight:800; font-size:0.68rem; color:#fff; z-index:2;" onclick="freePlayKeyClick(' + octIndex + ',' + idx + ')">' + k.note + '</button>';
    });
    html += '</div>';
    return html;
}

function renderFreePlayGame() {
    var html = '<div class="game-title-box">🎹 자유 연주 (' + freePlayState.octaves + '옥타브)</div>';
    html += '<div class="game-sub-desc">건반을 눌러 자유롭게 연주해보세요!</div>';
    freePlayState.rows.forEach(function (row) {
        html += '<div style="font-size:0.75rem; color:#6b7280; margin:0.3rem 0 0.15rem 0.2rem;">' + (row.octIndex + 1) + '옥타브</div>';
        html += renderFreePlayOctaveRow(row.keys, row.octIndex);
    });
    html += '<button class="action-btn secondary" style="width:100%; margin-top:0.6rem;" onclick="renderMelodySetup()">설정으로 돌아가기 ⏮</button>';
    document.getElementById('mainArea').innerHTML = html;
}

function freePlayKeyClick(octIndex, idx) {
    var row = null;
    freePlayState.rows.forEach(function (r) { if (r.octIndex === octIndex) row = r; });
    if (!row) return;
    var key = row.keys[idx];
    playPianoTone(key.freq);
    vibrateShort();
}

function setMelodySong(id) { melodySettings.songId = id; renderMelodySetup(); }
function getMelodySong() {
    var found = null;
    MELODY_SONGS.forEach(function (s) { if (s.id === melodySettings.songId) found = s; });
    return found || MELODY_SONGS[0];
}

function startMelodySession(fullMode) {
    if (!melodyKeys) melodyKeys = buildPianoKeys('mid');
    var song = getMelodySong();
    melodyState = {
        song: song, keys: melodyKeys, pos: 0, hits: 0,
        mode: fullMode ? 'full' : 'segment',
        segIndex: 0, finished: false
    };
    renderMelodyGame();
    if (melodyState.mode === 'segment') { playMelodySegmentDemo(); }
}
function retryMelodySong() { startMelodySession(melodyState.mode === 'full'); }

// ---- 현재 보여줄 이벤트 범위 계산 ----
function getVisibleEvents() {
    if (melodyState.mode === 'full') return melodyState.song.events;
    return melodyState.song.events.filter(function (e) { return e.segIndex === melodyState.segIndex; });
}
function getUnitOffset() { return melodyState.mode === 'full' ? 0 : melodyState.segIndex * SEGMENT_UNITS; }

// ---- 오선보 렌더링: 화면 폭에 따라 한 줄(태블릿) / 두 줄(모바일)로 자동 분배 ----
function isMelodyWideScreen() { return window.innerWidth >= 700; }

function renderMelodyStaffLines(events, unitOffset) {
    var lineUnits = isMelodyWideScreen() ? 32 : 16;
    var unitPx = isMelodyWideScreen() ? 24 : 18;
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

// 음표 길이(유닛)에 따른 그리기 스타일 결정 (1=8분,2=4분,3=점4분,4=2분,6=점2분,8+=온음표)
function classifyMelodyDuration(u) {
    if (u <= 1) return { hollow: false, stem: true, flag: true, dot: false };
    if (u === 2) return { hollow: false, stem: true, flag: false, dot: false };
    if (u === 3) return { hollow: false, stem: true, flag: false, dot: true };
    if (u === 4) return { hollow: true, stem: true, flag: false, dot: false };
    if (u === 6) return { hollow: true, stem: true, flag: false, dot: true };
    if (u >= 8) return { hollow: true, stem: false, flag: false, dot: false };
    return { hollow: u >= 4, stem: true, flag: false, dot: false };
}
// 쉼표 기호 (1=8분쉼표,2=4분쉼표,3=점4분쉼표,4=2분쉼표,6=점2분쉼표,8+=온쉼표) - 실제 악보 모양을 벡터로 직접 그림
function renderQuarterRestPath(cx, midY, fill) {
    var d = 'M ' + (cx - 4) + ' ' + (midY - 11) +
        ' L ' + (cx + 4) + ' ' + (midY - 11) +
        ' L ' + (cx - 4) + ' ' + (midY + 1) +
        ' L ' + (cx + 4) + ' ' + (midY + 1) +
        ' L ' + (cx - 2) + ' ' + (midY + 11);
    return '<path d="' + d + '" stroke="' + fill + '" stroke-width="2.2" fill="none" stroke-linejoin="round" stroke-linecap="round" />';
}
function renderMelodyRestGlyph(cx, staffTop, units, fill) {
    var midY = staffTop + 28;
    var line4Y = staffTop + 14;
    if (units <= 1) {
        // 8분쉼표: 작은 고리 + 대각선 꼬리
        var h1 = '<circle cx="' + (cx + 4) + '" cy="' + (midY - 6) + '" r="3" fill="' + fill + '" />';
        h1 += '<line x1="' + (cx + 4) + '" y1="' + (midY - 6) + '" x2="' + (cx - 4) + '" y2="' + (midY + 9) + '" stroke="' + fill + '" stroke-width="2" stroke-linecap="round" />';
        return h1;
    }
    if (units === 2) {
        return renderQuarterRestPath(cx, midY, fill);
    }
    if (units === 3) {
        var h2 = renderQuarterRestPath(cx, midY, fill);
        h2 += '<circle cx="' + (cx + 12) + '" cy="' + (midY - 4) + '" r="1.6" fill="' + fill + '" />';
        return h2;
    }
    if (units === 4) {
        return '<rect x="' + (cx - 6) + '" y="' + (midY - 5) + '" width="12" height="5" fill="' + fill + '" />';
    }
    if (units === 6) {
        var h3 = '<rect x="' + (cx - 6) + '" y="' + (midY - 5) + '" width="12" height="5" fill="' + fill + '" />';
        h3 += '<circle cx="' + (cx + 11) + '" cy="' + (midY - 2) + '" r="1.6" fill="' + fill + '" />';
        return h3;
    }
    return '<rect x="' + (cx - 6) + '" y="' + line4Y + '" width="12" height="5" fill="' + fill + '" />';
}

function renderMelodyStaffSvg(events, unitOffset, widthUnits, unitPx) {
    var leftPad = 46;
    var staffTop = 15;
    var svgWidth = leftPad + widthUnits * unitPx + 24;
    var svgHeight = 100;
    var html = '<div style="background:#fff; border:2px solid #1f2937; border-radius:0.6rem; padding:0.6rem 0.4rem; margin-bottom:0.5rem; overflow-x:auto;">';
    html += '<svg width="' + svgWidth + '" height="' + svgHeight + '" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" style="display:block; max-width:100%;">';
    [0, 14, 28, 42, 56].forEach(function (ly) {
        html += '<line x1="4" y1="' + (staffTop + ly) + '" x2="' + (svgWidth - 4) + '" y2="' + (staffTop + ly) + '" stroke="#1f2937" stroke-width="1.5" />';
    });
    html += '<text x="6" y="' + (staffTop + 52) + '" font-size="46" fill="#1f2937">𝄞</text>';
    events.forEach(function (ev) {
        var relUnit = ev.startUnit - unitOffset;
        var cx = leftPad + relUnit * unitPx + (ev.units * unitPx) / 2 + 14;
        if (ev.type === 'rest') {
            html += renderMelodyRestGlyph(cx, staffTop, ev.units, '#9ca3af');
            return;
        }
        var meta = MELODY_NOTE_META[ev.idx];
        var cy = staffTop + meta.y;
        var isCurrent = ev.noteIndex === melodyState.pos;
        var isPast = ev.noteIndex < melodyState.pos;
        var fill = isCurrent ? '#f59e0b' : (isPast ? '#9ca3af' : '#1f2937');
        var d = classifyMelodyDuration(ev.units);
        if (meta.ledger) {
            html += '<line x1="' + (cx - 14) + '" y1="' + cy + '" x2="' + (cx + 14) + '" y2="' + cy + '" stroke="#1f2937" stroke-width="1.5" />';
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
            var stemX = cx + 6.5, stemTopY = cy - 30;
            html += '<line x1="' + stemX + '" y1="' + cy + '" x2="' + stemX + '" y2="' + stemTopY + '" stroke="' + fill + '" stroke-width="1.5" />';
            if (d.flag) {
                var flagPath = 'M ' + stemX + ' ' + stemTopY + ' L ' + (stemX + 9) + ' ' + (stemTopY + 5) + ' L ' + stemX + ' ' + (stemTopY + 11) + ' Z';
                html += '<path d="' + flagPath + '" fill="' + fill + '" />';
            }
        }
        if (d.dot) {
            html += '<circle cx="' + (cx + 12) + '" cy="' + (cy - 2) + '" r="1.6" fill="' + fill + '" />';
        }
        html += '<text x="' + cx + '" y="' + (staffTop + 82) + '" font-size="12" fill="#6b7280" text-anchor="middle">' + meta.name + '</text>';
    });
    html += '</svg></div>';
    return html;
}

// ---- 건반 렌더링 (도~도, 반음 포함 13건반, 항상 노출) ----
function renderMelodyKeyboard() {
    var keys = melodyState.keys;
    var whiteCount = keys.filter(function (k) { return !k.black; }).length;
    var whitePct = 100 / whiteCount;
    var blackPct = whitePct * 0.62;
    var html = '<div style="position:relative; width:100%; height:150px; margin-bottom:0.6rem;">';
    var wSlot = 0;
    keys.forEach(function (k, idx) {
        if (k.black) return;
        html += '<button style="position:absolute; left:' + (wSlot * whitePct) + '%; top:0; width:' + whitePct + '%; height:150px; background:#ffffff; border:2px solid #1f2937; border-radius:0 0 0.3rem 0.3rem; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0.5rem; font-weight:800; font-size:1rem; color:#4b5563; box-shadow:0 3px 0 #cbd5e1; z-index:1;" onclick="melodyKeyClick(' + idx + ')">' + k.note + '</button>';
        wSlot++;
    });
    keys.forEach(function (k, idx) {
        if (!k.black) return;
        var leftPct = (k.whiteSlot + 1) * whitePct - blackPct / 2;
        html += '<button style="position:absolute; left:' + leftPct + '%; top:0; width:' + blackPct + '%; height:60%; background:#1f2937; border:2px solid #000; border-radius:0 0 0.25rem 0.25rem; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0.4rem; font-weight:800; font-size:0.78rem; color:#fff; z-index:2;" onclick="melodyKeyClick(' + idx + ')">' + k.note + '</button>';
    });
    html += '</div>';
    return html;
}

function renderMelodyGame() {
    var song = melodyState.song;
    var totalNotes = song.noteEvents.length;
    var isFull = melodyState.mode === 'full';
    var html = '<div class="game-title-box">🎼 멜로디 연주하기 · ' + song.name + (isFull ? ' (전체곡)' : '') + '</div>';
    html += '<div class="game-sub-desc">주황색 음표를 순서대로 건반으로 눌러보세요!</div>';
    html += '<div class="status-row"><div>' + melodyState.pos + ' / ' + totalNotes + '음 연주함</div><div>맞은 음: ' + melodyState.hits + '</div></div>';
    html += renderMelodyStaffLines(getVisibleEvents(), getUnitOffset());
    html += '<button class="action-btn secondary" style="margin-bottom:0.8rem;" onclick="playMelodySegmentDemo()">🔊 ' + (isFull ? '전체' : '이 구간') + ' 다시 듣기</button>';
    html += renderMelodyKeyboard();
    document.getElementById('mainArea').innerHTML = html;
}

// ---- 리듬 그대로 재생 (쉼표=무음, 홀드=길게) ----
function playMelodyTone(freq, ms) {
    var ctx = getPianoAudioCtx();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    var dur = ms / 1000;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
}
function playMelodyEventsDemo(events) {
    var i = 0;
    function step() {
        if (i >= events.length) return;
        var ev = events[i];
        var durMs = ev.units * MELODY_UNIT_MS;
        if (ev.type === 'note') {
            var key = melodyState.keys[ev.idx];
            playMelodyTone(key.freq, Math.min(durMs * 0.92, 1600));
        }
        var t = setTimeout(function () { i++; step(); }, durMs);
        activeTimers.push(t);
    }
    // 오디오 컨텍스트가 완전히 켜질 시간을 주기 위해 첫 음은 1초 뒤에 시작
    var t0 = setTimeout(step, MELODY_FIRST_NOTE_DELAY_MS);
    activeTimers.push(t0);
}
function playMelodySegmentDemo() { playMelodyEventsDemo(getVisibleEvents()); }

function melodyKeyClick(idx) {
    if (melodyState.finished) return;
    var key = melodyState.keys[idx];
    playPianoTone(key.freq);
    vibrateShort();
    var noteEvents = melodyState.song.noteEvents;
    var expectedEvent = noteEvents[melodyState.pos];
    if (idx === expectedEvent.idx) melodyState.hits++;
    melodyState.pos++;
    if (melodyState.pos >= noteEvents.length) {
        melodyState.finished = true;
        renderMelodyResult();
        return;
    }
    if (melodyState.mode === 'segment') {
        var nextSeg = noteEvents[melodyState.pos].segIndex;
        if (nextSeg !== melodyState.segIndex) {
            melodyState.segIndex = nextSeg;
            renderMelodyGame();
            playMelodySegmentDemo();
            return;
        }
    }
    renderMelodyGame();
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
