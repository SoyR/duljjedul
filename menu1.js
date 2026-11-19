// menu1 전용: 탭 전환 + 컬러뽑기(복권 추첨기 연출)
// 선물뽑기 로직은 기존 script.js를 그대로 사용

/* ---------- 탭 ---------- */
const TABS = ['color', 'gift'];

function switchTab(name) {
    TABS.forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        const panel = document.getElementById(`panel-${tab}`);
        const active = tab === name;
        btn.setAttribute('aria-selected', String(active));
        panel.classList.toggle('hidden', !active);
    });
    history.replaceState(null, '', `#${name}`);
}

/* ---------- 컬러뽑기 ---------- */
// 인원수 모드: 2명이면 빨주, 3명이면 빨주노 ... 10명이면 빨주노초파남보흰검갈
const LOTTO_COLORS = [
    { name: '빨강', color: '#E53935' },
    { name: '주황', color: '#FB8C00' },
    { name: '노랑', color: '#FDD835' },
    { name: '초록', color: '#43A047' },
    { name: '파랑', color: '#1E88E5' },
    { name: '남색', color: '#283593' },
    { name: '보라', color: '#8E24AA' },
    { name: '흰색', color: '#FFFFFF' },
    { name: '검정', color: '#212121' },
    { name: '갈색', color: '#795548' },
];

// 둘째덜 모드: 기존처럼 빨주노초파보 6가지
const DORIDUL_COLORS = ['빨강', '주황', '노랑', '초록', '파랑', '보라']
    .map(name => LOTTO_COLORS.find(c => c.name === name));

const LOTTO_MEMBERS = ['수민', '홍비', '인수', '도희', '율린', '보은'];

// 물리 계산은 260×260 좌표계에서 하고, 화면에는 %로 배치 (화면 크기와 무관)
const SIZE = 260;
const R = SIZE / 2;
const BALL_R = 19;

const MIX_MS = 3100;
const SETTLE_MS = 350;
const EXIT_MS = 600;

// 추첨기 하나 = 원형 통 + 그 안의 공들. 컬러뽑기와 선물뽑기가 각각 하나씩 사용
// ballR: 공 반지름 (260 좌표계 기준, 추첨기가 260px일 때 실제 px과 같음)
function makeMachine(globeId, drumId, ballR) {
    return {
        globe: document.getElementById(globeId),
        drum: document.getElementById(drumId),
        balls: [],
        mixing: false,
        r: ballR,
        limit: R - ballR,
    };
}

const colorMachine = makeMachine('lotto-globe', 'lotto-drum-text', BALL_R);
const giftMachine = makeMachine('gift-globe', 'gift-drum-text', 28); // 선물뽑기 공 56px
const MACHINES = [colorMachine, giftMachine];

const lotto = {
    busy: false,
    winner: null,
    mode: null,     // 'doridul' | 'count' (시작 전에는 null)
    drawCount: 0,   // 지금까지 뽑은 개수
    done: [],       // 둘째덜 모드: 이미 뽑은 사람
    current: null,  // 둘째덜 모드: 이번에 뽑을 사람
};

// 추첨기 안의 공을 새로 채움. item: { name, color, label?, textColor?, image? }
function createBalls(m, items) {
    m.balls.forEach(b => b.el.remove());
    m.balls = items.map((c, i) => {
        const el = document.createElement('div');
        el.className = 'lotto-ball';
        el.style.width = el.style.height = `${(m.r * 2 / SIZE) * 100}%`;
        el.setAttribute('aria-hidden', 'true');
        if (c.image) {
            // 사진 공: 배경색·테두리 없이 이미지만
            el.classList.add('is-photo');
            el.style.backgroundImage = `url("${c.image}")`;
        } else {
            el.style.backgroundColor = c.color;
        }
        if (c.label && !c.image) {
            el.textContent = c.label;
            el.style.color = c.textColor;
        }
        m.globe.appendChild(el);
        return {
            ...c,
            el,
            x: R + ((i % 4) - 1.5) * m.r * 2.2,
            y: R - 30 + Math.floor(i / 4) * m.r * 2.2,
            vx: (Math.random() - 0.5) * 2,
            vy: 0,
            held: false,
            drawn: false,
            // 사진·이름 공만 굴러가듯 회전 (컬러 공은 광택이 같이 돌면 어색해서 제외)
            spin: Boolean(c.image || c.label),
            angle: Math.random() * 40 - 20,
        };
    });
    renderBalls(m);
}

function stepPhysics(m, k) {
    const gravity = 0.35;
    const friction = Math.pow(m.mixing ? 0.995 : 0.98, k);
    const bounce = m.mixing ? 0.8 : 0.45;
    const maxSpeed = 17;

    m.balls.forEach(b => {
        if (b.held) return;
        b.vy += gravity * k;
        if (m.mixing) {
            // 아래쪽에서 바람이 불어 올려주는 추첨기 느낌 (세기도 매번 랜덤)
            b.vx += (Math.random() - 0.5) * 2.8 * k;
            b.vy += (Math.random() - 0.5) * 2.8 * k - (b.y > R ? (0.9 + Math.random() * 1.0) * k : 0);
            // 가끔 아무 방향으로 세게 튕겨서 움직임을 예측하기 어렵게
            if (Math.random() < 0.04 * k) {
                const angle = Math.random() * Math.PI * 2;
                const power = 4 + Math.random() * 5;
                b.vx += Math.cos(angle) * power;
                b.vy += Math.sin(angle) * power;
            }
        }
        b.vx *= friction;
        b.vy *= friction;
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > maxSpeed) {
            b.vx *= maxSpeed / speed;
            b.vy *= maxSpeed / speed;
        }
        b.x += b.vx * k;
        b.y += b.vy * k;
        // 가로로 움직인 만큼 살짝 굴러가는 회전 (실제 굴림의 약 40%)
        if (b.spin) b.angle += (b.vx * k / m.r) * (180 / Math.PI) * 0.4;

        // 원형 벽 충돌
        const dx = b.x - R;
        const dy = b.y - R;
        const d = Math.hypot(dx, dy);
        if (d > m.limit) {
            const nx = dx / d;
            const ny = dy / d;
            b.x = R + nx * m.limit;
            b.y = R + ny * m.limit;
            const vn = b.vx * nx + b.vy * ny;
            if (vn > 0) {
                b.vx -= (1 + bounce) * vn * nx;
                b.vy -= (1 + bounce) * vn * ny;
            }
        }
    });

    // 공끼리 충돌 (같은 질량 탄성 충돌)
    for (let i = 0; i < m.balls.length; i++) {
        for (let j = i + 1; j < m.balls.length; j++) {
            const a = m.balls[i];
            const b = m.balls[j];
            if (a.drawn || b.drawn) continue; // 이미 뽑혀 사라진 공은 충돌 없음
            if (a.held && b.held) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 0.01;
            const overlap = m.r * 2 - d;
            if (overlap <= 0) continue;
            const nx = dx / d;
            const ny = dy / d;

            if (a.held || b.held) {
                // 뽑힌 공은 고정, 다른 공만 밀어냄
                const free = a.held ? b : a;
                const sign = a.held ? 1 : -1;
                free.x += nx * overlap * sign;
                free.y += ny * overlap * sign;
                continue;
            }

            a.x -= nx * overlap / 2;
            a.y -= ny * overlap / 2;
            b.x += nx * overlap / 2;
            b.y += ny * overlap / 2;
            const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (rel > 0) {
                const impulse = rel * (1 + bounce) / 2;
                a.vx -= impulse * nx;
                a.vy -= impulse * ny;
                b.vx += impulse * nx;
                b.vy += impulse * ny;
            }
        }
    }
}

function renderBalls(m) {
    m.balls.forEach(b => {
        b.el.style.left = `${((b.x - m.r) / SIZE) * 100}%`;
        b.el.style.top = `${((b.y - m.r) / SIZE) * 100}%`;
        if (b.spin) b.el.style.rotate = `${b.angle.toFixed(1)}deg`;
    });
}

// 화면에 보이는 추첨기만 계산 (숨겨진 탭은 건너뜀)
let lastFrameTime = 0;
function lottoLoop(time) {
    const dt = lastFrameTime ? Math.min(time - lastFrameTime, 50) : 16.67;
    lastFrameTime = time;
    const k = dt / 16.67;
    MACHINES.forEach(m => {
        if (!m.globe || m.globe.offsetParent === null) return;
        // 빠르게 움직일 때 공이 겹쳐 지나가지 않도록 나눠서 계산
        stepPhysics(m, k / 2);
        stepPhysics(m, k / 2);
        renderBalls(m);
    });
    requestAnimationFrame(lottoLoop);
}
requestAnimationFrame(lottoLoop);

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function tweenBall(ball, tx, ty, duration) {
    return new Promise(resolve => {
        const sx = ball.x;
        const sy = ball.y;
        const start = performance.now();
        function tick(now) {
            const t = Math.min((now - start) / duration, 1);
            const e = 1 - Math.pow(1 - t, 3);
            ball.x = sx + (tx - sx) * e;
            ball.y = sy + (ty - sy) * e;
            if (t < 1) requestAnimationFrame(tick);
            else resolve();
        }
        requestAnimationFrame(tick);
    });
}

const remainingBalls = m => m.balls.filter(b => !b.drawn);

// 공 하나를 아래 출구로 빼내고 사라지게 (다시 나오지 않음)
async function ejectBall(m, ball) {
    ball.held = true;
    ball.vx = ball.vy = 0;
    await tweenBall(ball, R, SIZE - m.r - 2, EXIT_MS);
    ball.el.classList.add('is-out');
    ball.drawn = true;
    await wait(250);
}

// 섞고 → 가라앉히고 → 한 개 뽑아내기. target이 없으면 남은 공 중 무작위
async function runDraw(m, target) {
    m.mixing = true;
    m.drum.classList.add('is-on');
    await wait(MIX_MS);
    m.mixing = false;
    m.drum.classList.remove('is-on');
    await wait(SETTLE_MS);

    const pool = remainingBalls(m);
    const winner = target || pool[Math.floor(Math.random() * pool.length)];
    await ejectBall(m, winner);
    return winner;
}

/* ---------- 시작 화면 ---------- */
// 시작 전 상태: 추첨기 안에 인원수 드롭다운(둘째덜 포함) + 시작 버튼
function showStartState() {
    lotto.mode = null;
    lotto.drawCount = 0;
    lotto.winner = null;
    lotto.done = [];
    lotto.current = null;
    previewCountBalls();
    document.getElementById('lotto-turn').classList.add('hidden');
    document.getElementById('lotto-result').innerHTML = '';
    document.getElementById('lotto-history').innerHTML = '';
    document.getElementById('lotto-label').textContent = '인원수를 고르고 시작해주세요';
    document.getElementById('lotto-start-panel').classList.remove('hidden');
    const btn = document.getElementById('lotto-btn');
    btn.classList.add('hidden');
    btn.disabled = false;
    document.getElementById('lotto-restart').classList.add('hidden');
}

// '다시하기': 뽑는 중(애니메이션 중)이 아니면 언제든 시작 화면으로
function restartLotto() {
    if (lotto.busy) return;
    showStartState();
}

// 시작 전에는 드롭다운에서 고른 인원수만큼 공을 미리 보여줌
function previewCountBalls() {
    if (lotto.mode) return;
    const value = document.getElementById('lotto-count').value;
    createBalls(colorMachine, value === 'doridul' ? DORIDUL_COLORS : LOTTO_COLORS.slice(0, Number(value)));
}

// '시작': 드롭다운이 둘째덜이면 이름 룰렛 모드, 숫자면 인원수 모드
function startLotto() {
    if (document.getElementById('lotto-count').value === 'doridul') startDoridulMode();
    else startCountMode();
}

function enterDrawState() {
    document.getElementById('lotto-start-panel').classList.add('hidden');
    document.getElementById('lotto-turn').classList.remove('hidden');
    const btn = document.getElementById('lotto-btn');
    btn.textContent = '컬러 뽑기';
    btn.classList.remove('hidden');
    document.getElementById('lotto-restart').classList.remove('hidden');
}

// 인원수 모드: 고른 인원수만큼의 컬러로 뽑기 (이름 없이)
function startCountMode() {
    if (lotto.busy) return;
    const count = Number(document.getElementById('lotto-count').value);
    createBalls(colorMachine, LOTTO_COLORS.slice(0, count));
    lotto.mode = 'count';
    enterDrawState();
    document.getElementById('lotto-members').classList.add('hidden');
    updateCountTurnLabel();
    document.getElementById('lotto-label').textContent = '버튼을 눌러 컬러를 뽑아주세요';
}

function updateCountTurnLabel() {
    const left = remainingBalls(colorMachine).length;
    document.getElementById('lotto-turn-label').innerHTML =
        `<b class="lotto-turn-name">${lotto.drawCount + 1}번째</b> 컬러 뽑기 (남은 컬러 ${left}개)`;
}

// 둘째덜: 6명 이름 룰렛 + 빨주노초파보
async function startDoridulMode() {
    if (lotto.busy) return;
    createBalls(colorMachine, DORIDUL_COLORS);
    lotto.mode = 'doridul';
    enterDrawState();
    document.getElementById('lotto-members').classList.remove('hidden');
    renderMembersRow();
    await pickNextPerson();
}

/* ---------- 둘째덜 모드: 뽑을 사람 ---------- */
function renderMembersRow(highlight) {
    const row = document.getElementById('lotto-members');
    row.innerHTML = '';
    LOTTO_MEMBERS.forEach(name => {
        const badge = document.createElement('span');
        badge.className = 'member-badge';
        if (lotto.done.includes(name)) badge.classList.add('is-done');
        if (name === highlight) badge.classList.add('selected');
        badge.textContent = name;
        row.appendChild(badge);
    });
}

// 아직 안 뽑은 사람 중에서 룰렛처럼 돌다가 한 명 지정
async function pickNextPerson() {
    lotto.busy = true;
    const btn = document.getElementById('lotto-btn');
    const turnLabel = document.getElementById('lotto-turn-label');
    const label = document.getElementById('lotto-label');
    btn.disabled = true;
    turnLabel.textContent = '이번에 뽑을 사람은!';

    const pool = LOTTO_MEMBERS.filter(n => !lotto.done.includes(n));
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    if (pool.length > 1) {
        // 점점 느려지는 하이라이트 (마지막 칸이 chosen)
        const steps = 10 + Math.floor(Math.random() * pool.length);
        const start = (pool.indexOf(chosen) - steps % pool.length + pool.length * 10) % pool.length;
        for (let i = 0; i <= steps; i++) {
            renderMembersRow(pool[(start + i) % pool.length]);
            await wait(50 + i * i * 0.8);
        }
    }

    lotto.current = chosen;
    renderMembersRow(chosen);
    turnLabel.innerHTML = `이번에 뽑을 사람은! <b class="lotto-turn-name">${chosen}</b>`;
    label.textContent = `${chosen} 님, 버튼을 눌러 컬러를 뽑아주세요`;
    btn.disabled = false;
    lotto.busy = false;
}

/* ---------- 컬러 뽑기 ---------- */
async function drawColor() {
    if (lotto.busy) return;

    // 다 뽑았으면 버튼이 '처음부터 다시'로 동작
    if (remainingBalls(colorMachine).length === 0) {
        showStartState();
        return;
    }

    lotto.busy = true;

    const btn = document.getElementById('lotto-btn');
    const label = document.getElementById('lotto-label');
    const result = document.getElementById('lotto-result');
    const isDoridul = lotto.mode === 'doridul';
    const person = isDoridul ? lotto.current : null;
    const who = isDoridul ? `${person} 님의 컬러` : `${lotto.drawCount + 1}번째 컬러`;
    btn.disabled = true;

    result.innerHTML = '';
    label.textContent = `${who}는...`;

    // 섞고 하나 뽑아서 아래 출구로 (뽑힌 공은 이번 세션에서 다시 나오지 않음)
    const winner = await runDraw(colorMachine);
    lotto.winner = winner;

    // 3) 결과 표시
    lotto.drawCount++;
    if (isDoridul) {
        lotto.done.push(person);
        lotto.current = null;
        renderMembersRow();
    }
    const left = remainingBalls(colorMachine).length;
    label.textContent = `${who}는!`;
    result.innerHTML = `
        <span class="lotto-result-ball" style="background-color:${winner.color}"></span>
        <span class="lotto-result-name">${winner.name}</span>
    `;
    addHistory(isDoridul ? person : `${lotto.drawCount}번`, winner);

    if (left === 0) {
        document.getElementById('lotto-turn-label').textContent = '모두 컬러를 뽑았어요! 🎄';
        btn.textContent = '처음부터 다시';
        btn.disabled = false;
        lotto.busy = false;
        return;
    }

    btn.textContent = '다음 컬러 뽑기';
    if (isDoridul) {
        await wait(1200); // 결과를 잠깐 보여준 뒤 다음 사람 지정
        await pickNextPerson();
    } else {
        updateCountTurnLabel();
        btn.disabled = false;
        lotto.busy = false;
    }
}

function addHistory(who, ball) {
    const list = document.getElementById('lotto-history');
    const item = document.createElement('span');
    item.className = 'lotto-history-item';
    item.innerHTML = `<b>${who}</b><span class="lotto-history-dot" style="background-color:${ball.color}"></span>${ball.name}`;
    list.appendChild(item);
}

/* ---------- 초기화 ---------- */
showStartState();
switchTab(location.hash === '#gift' ? 'gift' : 'color');

/* ---------- 선물뽑기: '둘째덜' 옵션 ----------
   script.js(공유 파일)는 건드리지 않고, 이름 입력칸 만드는 함수만 menu1에서 감싸서 확장 */
const baseRenderNameInputs = renderNameInputs;
renderNameInputs = function (value) {
    if (value !== 'doridul') {
        baseRenderNameInputs(value);
        return;
    }
    baseRenderNameInputs(LOTTO_MEMBERS.length);
    document.querySelectorAll('#name-inputs input').forEach((input, i) => {
        input.value = LOTTO_MEMBERS[i];
        input.readOnly = true; // 수정 불가
        input.classList.add('is-fixed');
    });
};

/* ---------- 선물뽑기: 추첨기 연출 ----------
   컬러뽑기와 같은 추첨기에 사람 이름이 적힌 공을 넣고, 섞은 뒤 한 명을 뽑아냄.
   script.js(공유 파일)는 그대로 두고 필요한 함수만 menu1에서 감싸거나 교체 */

// 밝은 공(노랑·흰색)은 글자를 어둡게
const DARK_TEXT_COLORS = ['#FDD835', '#FFFFFF'];

// 둘째덜 사진 공 (그 외 이름은 이름이 적힌 컬러 공)
const GIFT_PHOTOS = {
    '보은': 'landom/bong_1.png',
    '도희': 'landom/do_1.png',
    '수민': 'landom/soom_1.png',
    '인수': 'landom/insu_1.png',
    '홍비': 'landom/hong_1.png',
    '율린': 'landom/yul_1.png',
};
Object.values(GIFT_PHOTOS).forEach(src => { new Image().src = src; }); // 미리 불러오기

function fillGiftMachine() {
    createBalls(giftMachine, INITIAL_MEMBERS.map((name, i) => {
        const c = LOTTO_COLORS[i % LOTTO_COLORS.length];
        return {
            name,
            label: name,
            color: c.color,
            textColor: DARK_TEXT_COLORS.includes(c.color) ? '#5a2a28' : '#fff',
            image: GIFT_PHOTOS[name],
        };
    }));
}

// 게임 시작(첫 번째 주자 뽑기 화면)할 때 이름 공 채우기
const baseSetupStep2 = setupStep2;
setupStep2 = function () {
    baseSetupStep2();
    fillGiftMachine();
};

startLoadingAnimation = async function (onComplete) {
    const btn = document.getElementById('action-btn');
    const resultNameEl = document.getElementById('result-name');
    btn.disabled = true;

    // 로딩 문구(두근두근 등)는 기존처럼 계속 바뀜
    const msgTimer = setInterval(() => {
        const msg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
        resultNameEl.innerHTML = `<span class="loading-text">${msg}</span>`;
    }, 250);

    const pool = [...remainingMembers];
    const chosenIndex = Math.floor(Math.random() * pool.length);
    const target = giftMachine.balls.find(b => b.name === pool[chosenIndex]);
    await runDraw(giftMachine, target);

    clearInterval(msgTimer);
    btn.disabled = false;

    // drawFirst/drawNext가 내부에서 Math.random()을 한 번 호출해 사람을 고르므로,
    // 그 한 번만 추첨기에서 나온 사람의 순번이 나오도록 맞춰줌
    const realRandom = Math.random;
    Math.random = () => {
        Math.random = realRandom;
        return (chosenIndex + 0.5) / pool.length;
    };
    try {
        onComplete();
    } finally {
        Math.random = realRandom;
    }
    addResultFace();
};

// 최종 결과의 '선물 전달 순서' 목록에서 각 이름 왼쪽에 얼굴 사진 붙이기
function addChainFaces() {
    // 각 줄 맨 앞의 크리스마스트리 아이콘 제거
    document.querySelectorAll('#chain-history .chain-item').forEach(item => {
        const first = item.firstChild;
        if (first && first.nodeType === Node.TEXT_NODE) {
            first.textContent = first.textContent.replace('🎄', '').trimStart();
        }
    });
    document.querySelectorAll('#chain-history .chain-item b').forEach(b => {
        const photo = GIFT_PHOTOS[b.textContent];
        if (!photo) return;
        const img = document.createElement('img');
        img.className = 'chain-face';
        img.src = photo;
        img.alt = '';
        b.prepend(img);
    });
}

// 결과 이름 왼쪽에 얼굴 사진(공과 같은 56px) 붙이기 — 사진이 있는 사람만
function addResultFace() {
    const el = document.getElementById('result-name');
    const name = el.textContent;
    const photo = GIFT_PHOTOS[name];
    if (!photo) return;
    const img = document.createElement('img');
    img.className = 'result-face';
    img.src = photo;
    img.alt = '';
    const span = document.createElement('span');
    span.textContent = name;
    el.replaceChildren(img, span);
}

// 마지막 한 명은 자동 확정되므로, 남은 공도 출구로 빼냄
const baseSetupFinalStep = setupFinalStep;
setupFinalStep = function () {
    const last = remainingMembers[remainingMembers.length - 1];
    baseSetupFinalStep();
    addResultFace();
    addChainFaces();
    const ball = giftMachine.balls.find(b => b.name === last && !b.drawn);
    if (ball) ejectBall(giftMachine, ball);
};

// '둘째덜'이 기본 선택이므로, 위에서 확장한 함수로 이름칸을 다시 그림
// (script.js의 initGame은 이 파일보다 먼저 실행돼서 빈 칸으로 그려져 있음)
renderNameInputs(document.getElementById('member-count').value);

// 결과 얼굴 사진을 추첨기 안 공과 같은 크기로 유지 (화면 크기에 따라 추첨기가 변하므로)
if (window.ResizeObserver && giftMachine.globe) {
    new ResizeObserver(() => {
        // clientWidth는 zoom 안쪽 기준 크기라 결과 사진과 같은 기준으로 계산됨
        const size = giftMachine.globe.clientWidth * (giftMachine.r * 2 / SIZE);
        if (size > 0) document.documentElement.style.setProperty('--gift-ball-size', `${size.toFixed(1)}px`);
    }).observe(giftMachine.globe);
}
