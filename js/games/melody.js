// ===================== 기억력/연주: 멜로디 연주하기 (오선보 + 건반) =====================
// 이 파일은 memory.js 의 buildPianoKeys()/playPianoTone()/getPianoAudioCtx() 를 그대로 재사용합니다.
// (도~도 한 옥타브, 반음 포함 13건반: buildPianoKeys('mid') 결과와 인덱스가 1:1로 대응)
//
// 노래 데이터는 문자열 표기법으로 작성합니다 (parseMelodyPattern이 자동으로 박자를 계산):
//   도레미파솔라시 : 각 글자 = 4분음표 1박
//   -              : 4분음표 1박짜리 쉼표(무음). 연달아 쓰면 그만큼 길게 쉼
//   ~              : 바로 앞 음을 1박 더 늘려서 홀드(예: "솔~" = 솔을 2박 = 2분음표)
//   도(높은음)      : 옥타브 위 도 (일반 "도"는 항상 낮은 도)
// 새 노래를 추가하려면 MELODY_SONGS 배열에 buildMelodySong(id, 이름, 패턴문자열)만 추가하면 됩니다.

var SEGMENT_BEATS = 16; // 구간(다시듣기 단위) = 4분음표 4마디 = 16박
var MELODY_BEAT_MS = 480; // 4분음표 1박의 재생 길이(ms)

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
function parseMelodyPattern(str) {
    var noteMap = { '도': 0, '레': 2, '미': 4, '파': 5, '솔': 7, '라': 9, '시': 11 };
    var beatTokens = [];
    var i = 0;
    while (i < str.length) {
        var c = str.charAt(i);
        if (c === '-') { beatTokens.push('REST'); i++; continue; }
        if (c === '~') { beatTokens.push('SUSTAIN'); i++; continue; }
        if (str.substr(i, 6) === '도(높은음)') { beatTokens.push(12); i += 6; continue; }
        if (noteMap.hasOwnProperty(c)) { beatTokens.push(noteMap[c]); i++; continue; }
        i++; // 공백 등 인식 안되는 글자는 무시
    }
    var events = [];
    beatTokens.forEach(function (t) {
        if (t === 'SUSTAIN') {
            if (events.length > 0 && events[events.length - 1].type === 'note') {
                events[events.length - 1].beats++;
            }
        } else if (t === 'REST') {
            if (events.length > 0 && events[events.length - 1].type === 'rest') {
                events[events.length - 1].beats++;
            } else {
                events.push({ type: 'rest', beats: 1 });
            }
        } else {
            events.push({ type: 'note', idx: t, beats: 1 });
        }
    });
    var startBeat = 0;
    var noteEvents = [];
    events.forEach(function (e) {
        e.startBeat = startBeat;
        e.segIndex = Math.floor(startBeat / SEGMENT_BEATS);
        startBeat += e.beats;
        if (e.type === 'note') { e.noteIndex = noteEvents.length; noteEvents.push(e); }
    });
    return { events: events, noteEvents: noteEvents, totalBeats: startBeat };
}
function buildMelodySong(id, name, pattern) {
    var parsed = parseMelodyPattern(pattern);
    return { id: id, name: name, events: parsed.events, noteEvents: parsed.noteEvents, totalBeats: parsed.totalBeats };
}

var MELODY_SONGS = [
    buildMelodySong('twinkle', '작은별', '도도솔솔라라솔-파파미미레레도-솔솔파파미미레-솔솔파파미미레-도도솔솔라라솔-파파미미레레도-'),
    buildMelodySong('butterfly', '나비야', '솔미미-파레레-도레미파솔솔솔-솔미미미파레레-도미솔솔미미미-레레레레레미파-미미미미미파솔-솔미미-파레레-도미솔솔미미미'),
    buildMelodySong('schoolbell', '학교종', '솔솔라라솔솔미-솔솔미미레---솔솔라라솔솔미-솔미레미도--'),
    buildMelodySong('bear', '곰세마리', '도~도도도-도-미~솔솔미미도-솔솔미-솔솔미-도-도-도---솔-솔-미-도-솔-솔-솔---솔-솔-미-도-솔-솔-솔---솔-솔-미-도-솔-솔라솔---도(높은음)-솔-도(높은음)-솔-미-레-도---')
];

var melodyKeys = null;
var melodySettings = { songId: 'twinkle' };
var melodyState = {};

function initMelodyGame() { renderMelodySetup(); }

function renderMelodySetup() {
    var html = '<div class="game-title-box">🎼 멜로디 연주하기</div>';
    html += '<div class="game-sub-desc">악보를 보고 건반을 순서대로 눌러 연주해보세요! 틀려도 끝까지 연주할 수 있어요.</div>';
    html += '<div class="setup-section-label">노래 선택</div><div class="setup-btn-group">';
    MELODY_SONGS.forEach(function (s) {
        html += '<button class="setup-btn' + (melodySettings.songId === s.id ? ' active' : '') + '" onclick="setMelodySong(\'' + s.id + '\')">' + s.name + '</button>';
    });
    html += '</div>';
    html += '<button class="action-btn" onclick="startMelodySession()">시작하기 🚀</button>';
    document.getElementById('mainArea').innerHTML = html;
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
function getBeatOffset() { return melodyState.mode === 'full' ? 0 : melodyState.segIndex * SEGMENT_BEATS; }
function getWidthBeats() { return melodyState.mode === 'full' ? melodyState.song.totalBeats : SEGMENT_BEATS; }

// ---- 오선보 렌더링 (넓게, 가로 스크롤) ----
function renderMelodyStaff(events, beatOffset, widthBeats) {
    var BEAT_PX = 42;
    var leftPad = 46;
    var staffTop = 15;
    var svgWidth = leftPad + widthBeats * BEAT_PX + 24;
    var svgHeight = 100;
    var html = '<div style="background:#fff; border:2px solid #1f2937; border-radius:0.6rem; padding:0.6rem 0.4rem; margin-bottom:0.8rem; overflow-x:auto;">';
    html += '<svg width="' + svgWidth + '" height="' + svgHeight + '" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" style="display:block;">';
    [0, 14, 28, 42, 56].forEach(function (ly) {
        html += '<line x1="4" y1="' + (staffTop + ly) + '" x2="' + (svgWidth - 4) + '" y2="' + (staffTop + ly) + '" stroke="#1f2937" stroke-width="1.5" />';
    });
    html += '<text x="6" y="' + (staffTop + 52) + '" font-size="46" fill="#1f2937">𝄞</text>';
    events.forEach(function (ev) {
        var relBeat = ev.startBeat - beatOffset;
        var cx = leftPad + relBeat * BEAT_PX + (ev.beats * BEAT_PX) / 2 + 14;
        if (ev.type === 'rest') {
            var rw = Math.max(ev.beats * BEAT_PX - 10, 10);
            html += '<rect x="' + (cx - rw / 2) + '" y="' + (staffTop + 24) + '" width="' + rw + '" height="8" rx="3" fill="#d1d5db" />';
            return;
        }
        var meta = MELODY_NOTE_META[ev.idx];
        var cy = staffTop + meta.y;
        var isCurrent = ev.noteIndex === melodyState.pos;
        var isPast = ev.noteIndex < melodyState.pos;
        var fill = isCurrent ? '#f59e0b' : (isPast ? '#9ca3af' : '#1f2937');
        var hollow = ev.beats >= 2;
        if (meta.ledger) {
            html += '<line x1="' + (cx - 14) + '" y1="' + cy + '" x2="' + (cx + 14) + '" y2="' + cy + '" stroke="#1f2937" stroke-width="1.5" />';
        }
        if (meta.sharp) {
            html += '<text x="' + (cx - 20) + '" y="' + (cy + 6) + '" font-size="16" fill="' + fill + '">♯</text>';
        }
        if (hollow) {
            html += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="7" ry="5.5" fill="#fff" stroke="' + fill + '" stroke-width="2" transform="rotate(-20 ' + cx + ' ' + cy + ')" />';
        } else {
            html += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="7" ry="5.5" fill="' + fill + '" transform="rotate(-20 ' + cx + ' ' + cy + ')" />';
        }
        if (ev.beats < 4) {
            html += '<line x1="' + (cx + 6.5) + '" y1="' + cy + '" x2="' + (cx + 6.5) + '" y2="' + (cy - 30) + '" stroke="' + fill + '" stroke-width="1.5" />';
        }
        if (ev.beats === 3) {
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
    html += renderMelodyStaff(getVisibleEvents(), getBeatOffset(), getWidthBeats());
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
        var durMs = ev.beats * MELODY_BEAT_MS;
        if (ev.type === 'note') {
            var key = melodyState.keys[ev.idx];
            playMelodyTone(key.freq, Math.min(durMs * 0.92, 1600));
        }
        var t = setTimeout(function () { i++; step(); }, durMs);
        activeTimers.push(t);
    }
    var t0 = setTimeout(step, 250);
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
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 게임 등록 =====================
GAME_INIT_FNS.melodyGame = initMelodyGame;
