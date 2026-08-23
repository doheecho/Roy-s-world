// ===================== 기억력/연주: 멜로디 연주하기 (오선보 + 건반) =====================
// 이 파일은 memory.js 의 buildPianoKeys()/playPianoTone() 를 그대로 재사용합니다.
// (도~도 한 옥타브, 반음 포함 13건반: buildPianoKeys('mid') 결과와 인덱스가 1:1로 대응)

var MELODY_SEGMENT_SIZE = 4;

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

// 동요 멜로디 데이터 (인덱스 배열, 한 옥타브 안에서만 구성)
var MELODY_SONGS = [
    { id: 'twinkle', name: '작은별', notes: [0, 0, 7, 7, 9, 9, 7, 5, 5, 4, 4, 2, 2, 0] },
    { id: 'butterfly', name: '나비야', notes: [7, 4, 4, 5, 2, 2, 0, 2, 4, 5, 7, 7, 7] },
    { id: 'schoolbell', name: '학교종', notes: [7, 7, 9, 9, 7, 7, 4, 7, 7, 4, 4, 2] },
    { id: 'bear', name: '곰세마리', notes: [4, 4, 4, 5, 7, 7, 4, 4, 4, 5, 7, 7] }
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

function startMelodySession() {
    if (!melodyKeys) melodyKeys = buildPianoKeys('mid');
    var song = getMelodySong();
    melodyState = {
        song: song, keys: melodyKeys, pos: 0, hits: 0,
        segStart: 0, segEnd: Math.min(MELODY_SEGMENT_SIZE, song.notes.length),
        finished: false
    };
    renderMelodyGame();
    playMelodySegmentDemo();
}
function retryMelodySong() { startMelodySession(); }

// ---- 오선보 렌더링 ----
function renderMelodyStaff() {
    var song = melodyState.song;
    var segNotes = song.notes.slice(melodyState.segStart, melodyState.segEnd);
    var noteGap = 56;
    var leftPad = 46;
    var svgWidth = leftPad + segNotes.length * noteGap + 20;
    var svgHeight = 100;
    var staffTop = 15;
    var html = '<div style="background:#fff; border:2px solid #1f2937; border-radius:0.6rem; padding:0.6rem 0.4rem; margin-bottom:0.8rem; overflow-x:auto;">';
    html += '<svg width="' + svgWidth + '" height="' + svgHeight + '" viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" style="display:block;">';
    [0, 14, 28, 42, 56].forEach(function (ly) {
        html += '<line x1="4" y1="' + (staffTop + ly) + '" x2="' + (svgWidth - 4) + '" y2="' + (staffTop + ly) + '" stroke="#1f2937" stroke-width="1.5" />';
    });
    html += '<text x="6" y="' + (staffTop + 52) + '" font-size="46" fill="#1f2937">𝄞</text>';
    segNotes.forEach(function (noteIdx, i) {
        var meta = MELODY_NOTE_META[noteIdx];
        var cx = leftPad + i * noteGap + 26;
        var cy = staffTop + meta.y;
        var isCurrent = (melodyState.segStart + i) === melodyState.pos;
        var isPast = (melodyState.segStart + i) < melodyState.pos;
        var fill = isCurrent ? '#f59e0b' : (isPast ? '#9ca3af' : '#1f2937');
        if (meta.ledger) {
            html += '<line x1="' + (cx - 14) + '" y1="' + cy + '" x2="' + (cx + 14) + '" y2="' + cy + '" stroke="#1f2937" stroke-width="1.5" />';
        }
        if (meta.sharp) {
            html += '<text x="' + (cx - 20) + '" y="' + (cy + 6) + '" font-size="16" fill="' + fill + '">♯</text>';
        }
        html += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="7" ry="5.5" fill="' + fill + '" transform="rotate(-20 ' + cx + ' ' + cy + ')" />';
        html += '<line x1="' + (cx + 6.5) + '" y1="' + cy + '" x2="' + (cx + 6.5) + '" y2="' + (cy - 30) + '" stroke="' + fill + '" stroke-width="1.5" />';
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
    var html = '<div class="game-title-box">🎼 멜로디 연주하기 · ' + song.name + '</div>';
    html += '<div class="game-sub-desc">주황색 음표를 순서대로 건반으로 눌러보세요!</div>';
    html += '<div class="status-row"><div>' + melodyState.pos + ' / ' + song.notes.length + '음 연주함</div><div>맞은 음: ' + melodyState.hits + '</div></div>';
    html += renderMelodyStaff();
    html += '<button class="action-btn secondary" style="margin-bottom:0.8rem;" onclick="playMelodySegmentDemo()">🔊 이 구간 다시 듣기</button>';
    html += renderMelodyKeyboard();
    document.getElementById('mainArea').innerHTML = html;
}

function playMelodySegmentDemo() {
    var song = melodyState.song;
    var notes = song.notes.slice(melodyState.segStart, melodyState.segEnd);
    var i = 0;
    function step() {
        if (i >= notes.length) return;
        var key = melodyState.keys[notes[i]];
        playPianoTone(key.freq);
        var t = setTimeout(function () { i++; step(); }, 450);
        activeTimers.push(t);
    }
    var t0 = setTimeout(step, 300);
    activeTimers.push(t0);
}

function melodyKeyClick(idx) {
    if (melodyState.finished) return;
    var key = melodyState.keys[idx];
    playPianoTone(key.freq);
    vibrateShort();
    var expected = melodyState.song.notes[melodyState.pos];
    if (idx === expected) { melodyState.hits++; }
    melodyState.pos++;
    if (melodyState.pos >= melodyState.song.notes.length) {
        melodyState.finished = true;
        renderMelodyResult();
        return;
    }
    if (melodyState.pos >= melodyState.segEnd) {
        melodyState.segStart = melodyState.segEnd;
        melodyState.segEnd = Math.min(melodyState.segStart + MELODY_SEGMENT_SIZE, melodyState.song.notes.length);
        renderMelodyGame();
        playMelodySegmentDemo();
    } else {
        renderMelodyGame();
    }
}

function renderMelodyResult() {
    var song = melodyState.song;
    var total = song.notes.length;
    var pct = Math.round((melodyState.hits / total) * 100);
    var grade = pct >= 90 ? '🌟 참 잘했어요!' : (pct >= 70 ? '👍 잘했어요!' : (pct >= 50 ? '💪 조금 더 연습해봐요' : '🔁 다시 도전해봐요'));
    var html = '<div class="game-title-box">🎼 멜로디 연주하기 · ' + song.name + '</div>';
    html += '<div class="game-sub-desc">연주를 모두 마쳤어요!</div>';
    html += '<div class="msg-box" style="display:block; text-align:center; font-size:1.05rem; line-height:1.8;">' + grade + '<br>정확도 <b>' + pct + '%</b> (' + melodyState.hits + ' / ' + total + '음 일치)</div>';
    html += '<div class="options-grid">';
    html += '<button class="action-btn" onclick="retryMelodySong()">다시 연주하기 🔁</button>';
    html += '<button class="action-btn secondary" onclick="renderMelodySetup()">다른 노래 선택 🎵</button>';
    html += '</div>';
    document.getElementById('mainArea').innerHTML = html;
}

// ===================== 게임 등록 =====================
GAME_INIT_FNS.melodyGame = initMelodyGame;
