(() => {
    // =========================================================
    // 설정
    // =========================================================
    const PLAYERS = [
        { id: 'hong', name: '홍비' },
        { id: 'soom', name: '수민' },
        { id: 'insu', name: '인수' },
        { id: 'do',   name: '도희' },
        { id: 'yul',  name: '율린' },
        { id: 'bong', name: '보은' },
    ];
    const SIDE_NAMES = { red: '홍팀', white: '백팀' };

    const CELLS_PER_SIDE = 4;                    // 모서리 사이의 칸 수
    const SIDE = CELLS_PER_SIDE + 1;             // 한 변의 칸 간격 수
    const TOTAL = SIDE * 4;                      // 전체 칸 수 (시작=도착 칸 포함)
    const GRID = SIDE + 1;                       // 한 줄의 칸 수 (모서리 포함)
    const CORNER_ICONS = { [SIDE]: '🎁', [SIDE * 2]: '🎄', [SIDE * 3]: '⛄' };

    const CLAP = '👏 무조건 박수 쳐주세요!';
    const SOLO_QUESTIONS = [
        { text: '올해 제일 잘한 일과<br>내년의 소소한 목표', note: CLAP },
        { text: '조금은 이상하거나<br>디테일한 이상형 요소' },
        { text: '12주년 연말을 맞이하여<br>모두에게 한마디' },
        { text: '이세계의 내가<br>가지고 싶은 직업' },
        { text: '복권에 당첨되면<br>모두에게 사주고 싶은 것' },
        { text: '내가 가진 키링이나 피규어 중에<br>제일 이상한 것' },
    ];
    const PAIR_QUESTIONS = [
        { text: '서로의 첫인상 말하기' },
        { text: '서로의 이미지에 맞는<br>동물 하나 이야기하기' },
        { text: '그 사람과 같이 하고 싶은<br>활동 1개 이야기하기' },
    ];
    const MINIGAMES = ['jump', 'keyring', 'keyring'];   // 점프게임 1번, 키링게임 최대 2번
    const ROULETTE = ['크게 박수쳐주기<br>(엄청난 환호)', '마실 것 사주기'];

    // 주사위: 면 번호 → 앞으로 보이게 하는 회전 [x, y]
    const DICE_FACES = [
        { v: 1, t: 'translateZ(calc(var(--s) / 2))' },
        { v: 6, t: 'rotateY(180deg) translateZ(calc(var(--s) / 2))' },
        { v: 2, t: 'rotateY(90deg) translateZ(calc(var(--s) / 2))' },
        { v: 5, t: 'rotateY(-90deg) translateZ(calc(var(--s) / 2))' },
        { v: 3, t: 'rotateX(90deg) translateZ(calc(var(--s) / 2))' },
        { v: 4, t: 'rotateX(-90deg) translateZ(calc(var(--s) / 2))' },
    ];
    const DICE_SHOW = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
    const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

    // =========================================================
    // 공용
    // =========================================================
    const $ = id => document.getElementById(id);
    const board = $('board');
    const diceEl = $('dice');
    const modal = $('modal');
    const modalCard = $('modal-card');
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const randInt = n => Math.floor(Math.random() * n);
    const rand = (a, b) => Math.random() * (b - a) + a;
    const shuffle = arr => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = randInt(i + 1);
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    let images = [];
    let players, roundPool, current, busy, finishCount, spinX, spinY, bonus, pools, arrivalSeq;
    let pendingEvent = null, usedCells = new Set(), lastDice = 1;

    // =========================================================
    // 이미지 경로 확인 (hong.png 없으면 landom/hong_1.png 사용)
    // =========================================================
    function resolveImage(p) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(`${p.id}.png`);
            img.onerror = () => {
                const fb = new Image();
                fb.onload = () => resolve(`landom/${p.id}_1.png`);
                fb.onerror = () => resolve('');
                fb.src = `landom/${p.id}_1.png`;
            };
            img.src = `${p.id}.png`;
        });
    }

    // =========================================================
    // 보드
    // =========================================================
    function cellGrid(i) {
        const n = ((i % TOTAL) + TOTAL) % TOTAL;
        const last = GRID - 1;
        if (n <= SIDE) return [last, last - n];                 // 오른쪽 변: 아래 → 위
        if (n <= SIDE * 2) return [last - (n - SIDE), 0];       // 윗변: 오른쪽 → 왼쪽
        if (n <= SIDE * 3) return [0, n - SIDE * 2];            // 왼쪽 변: 위 → 아래
        return [n - SIDE * 3, last];                            // 아랫변: 왼쪽 → 오른쪽
    }

    function cellCenter(i) {
        const [c, r] = cellGrid(i);
        return [(c + 0.5) / GRID * 100, (r + 0.5) / GRID * 100];
    }

    const isCorner = i => i % SIDE === 0;

    function buildBoard() {
        for (let i = 0; i < TOTAL; i++) {
            const cell = document.createElement('div');
            const [x, y] = cellCenter(i);
            cell.className = 'cell';
            cell.id = `cell-${i}`;
            cell.style.left = x + '%';
            cell.style.top = y + '%';
            if (isCorner(i)) {
                cell.classList.add('corner');
                if (i === 0) {
                    cell.classList.add('start');
                    cell.innerHTML = 'START<br>GOAL';
                } else {
                    cell.textContent = CORNER_ICONS[i];
                }
            } else {
                cell.textContent = i;
            }
            board.appendChild(cell);
        }
    }

    // =========================================================
    // 정6면체 주사위
    // =========================================================
    function buildDice() {
        DICE_FACES.forEach(({ v, t }) => {
            const face = document.createElement('div');
            face.className = 'cube-face' + (v === 1 ? ' one' : '');
            face.style.transform = t;
            for (let i = 0; i < 9; i++) {
                const s = document.createElement('span');
                if (PIPS[v].includes(i)) s.className = 'pip';
                face.appendChild(s);
            }
            diceEl.appendChild(face);
        });
    }

    function setDice(value, animate) {
        const [ax, ay] = DICE_SHOW[value];
        if (animate) {
            spinX += 360 * (2 + randInt(2));
            spinY += 360 * (2 + randInt(2));
        }
        diceEl.style.transition = animate ? '' : 'none';
        diceEl.style.transform = `rotateX(${spinX + ax}deg) rotateY(${spinY + ay}deg)`;
    }

    // =========================================================
    // 같이 가는 짝 (같은 칸에서 만난 최초 2명)
    // =========================================================
    const groupOf = p => players.filter(x => !x.cleared && x.groupId === p.groupId);
    const groupNames = p => groupOf(p).map(x => x.name).join(' & ');
    const isCurrent = p => !!current && !p.cleared && p.groupId === current.groupId;

    // 이동을 마친 칸에 이미 있던 사람 (여러 명이면 가장 먼저 와 있던 사람)
    // 만나면 2명 질문이 뜨지만 함께 움직이지는 않음
    function findMeet(p) {
        if (p.pos <= 0 || p.pos >= TOTAL) return null;
        return players
            .filter(x => x !== p && !x.cleared && x.pos === p.pos)
            .sort((a, b) => a.arrivedAt - b.arrivedAt)[0] || null;
    }

    // =========================================================
    // 말
    // =========================================================
    function ensureToken(p) {
        if (p.token) return p.token;
        const t = document.createElement('div');
        t.className = `token pop side-${p.side}`;
        t.innerHTML = `<img src="${p.img}" alt="${p.name}">`;
        board.appendChild(t);
        p.token = t;
        return t;
    }

    function layoutTokens() {
        const groups = {};
        players.forEach(p => {
            if (!p.token || p.cleared) return;
            const key = p.pos % TOTAL;
            (groups[key] = groups[key] || []).push(p);
        });
        Object.entries(groups).forEach(([cell, list]) => {
            const [cx, cy] = cellCenter(Number(cell));
            // 같은 짝끼리 붙어 있도록 정렬
            list.sort((a, b) => a.groupId - b.groupId || a.arrivedAt - b.arrivedAt);
            const n = list.length;
            const r = n === 1 ? 0 : (isCorner(Number(cell)) ? 3.2 : 2.4);
            list.forEach((p, idx) => {
                const ang = (Math.PI * 2 * idx) / n - Math.PI / 2;
                p.token.style.left = (cx + r * Math.cos(ang)) + '%';
                p.token.style.top = (cy + r * Math.sin(ang)) + '%';
                p.token.classList.toggle('current', isCurrent(p));
            });
        });
    }

    function hop(p) {
        const t = p.token;
        if (!t) return;
        t.classList.remove('hop', 'pop');
        void t.offsetWidth;
        t.classList.add('hop');
    }

    async function moveGroup(p, steps) {
        if (p.pos < 0) {
            p.pos = 0;
            ensureToken(p);
            layoutTokens();
            await wait(550);
        }
        const group = groupOf(p);
        const target = Math.min(TOTAL, p.pos + steps);
        while (p.pos < target) {
            group.forEach(x => { x.pos++; });
            layoutTokens();
            group.forEach(hop);
            await wait(330);
        }
        const stamp = ++arrivalSeq;
        group.forEach(x => { x.arrivedAt = stamp; });
        return group;
    }

    // =========================================================
    // 점수
    // =========================================================
    function sideScore(side) {
        return players
            .filter(p => p.side === side)
            .reduce((sum, p) => sum + p.points + p.finishScore, 0) + bonus[side];
    }

    function renderScores() {
        ['red', 'white'].forEach(side => {
            $(`score-${side}`).textContent = sideScore(side);
            $(`faces-${side}`).innerHTML = players
                .filter(p => p.side === side)
                .map(p => `<img src="${p.img}" alt="${p.name}" title="${p.name}" class="${p.cleared ? 'done' : ''}">`)
                .join('');
        });
    }

    function renderPlayers() {
        $('players').innerHTML = players.map(p => {
            let state;
            if (p.cleared) state = `🏁 도착 +${p.finishScore}`;
            else if (p.pos < 0) state = '대기';
            else state = `${p.pos}칸`;
            const cls = ['player-chip', `side-${p.side}`];
            if (isCurrent(p)) cls.push('current');
            if (p.cleared) cls.push('done');
            else if (!roundPool.includes(p) && !isCurrent(p)) cls.push('played');
            return `<div class="${cls.join(' ')}">
                <img src="${p.img}" alt="${p.name}">
                <span class="chip-name">${p.name}</span>
                <span class="chip-state">${state}</span>
            </div>`;
        }).join('');
        renderScores();
    }

    function setFace(p) {
        $('turn-face').innerHTML = p ? `<img src="${p.img}" alt="${p.name}">` : '?';
        $('turn-name').textContent = p ? p.name : '';
    }

    // =========================================================
    // 팝업 공용
    // =========================================================
    function openModal(html) {
        modalCard.innerHTML = html;
        modal.classList.remove('hidden');
        modalCard.scrollTop = 0;
        return modalCard;
    }

    function closeModal() {
        modal.classList.add('hidden');
        modalCard.innerHTML = '';
    }

    function landersHtml(group) {
        return `<div class="landers">${group.map(p => `
            <div class="lander side-${p.side}">
                <img src="${p.img}" alt="${p.name}">
                <span>${p.name}</span>
                <small>${SIDE_NAMES[p.side]}</small>
            </div>`).join('')}</div>`;
    }

    const resultButtonsHtml = `
        <div class="btn-row modal-actions">
            <button class="btn primary" data-result="1">완료 (+1점)</button>
            <button class="btn" data-result="0">실패 (0점)</button>
        </div>`;

    function awaitResult(root) {
        return new Promise(resolve => {
            root.querySelectorAll('[data-result]').forEach(btn => {
                btn.addEventListener('click', () => resolve(btn.dataset.result === '1'), { once: true });
            });
        });
    }

    const awaitClick = el => new Promise(resolve => el.addEventListener('click', resolve, { once: true }));

    // =========================================================
    // 팀 나누기 (홍팀 3명 / 백팀 3명)
    // =========================================================
    async function splitTeams() {
        const card = openModal(`
            <div class="modal-tag">TEAM</div>
            <h3 class="modal-title">홍팀 vs 백팀</h3>
            <p class="modal-sub">6명을 랜덤으로 3명씩 나눕니다!</p>
            <div class="split-grid" id="split-grid"></div>
            <button class="btn primary" id="split-start" disabled>게임 시작</button>
        `);

        const grid = card.querySelector('#split-grid');
        const renderGrid = list => {
            grid.innerHTML = list.map(p => `
                <div class="lander side-${p.side}">
                    <img src="${p.img}" alt="${p.name}">
                    <span>${p.name}</span>
                </div>`).join('');
        };

        const finalOrder = shuffle(players);
        finalOrder.forEach((p, i) => { p.side = i < 3 ? 'red' : 'white'; });

        // 섞이는 연출
        const start = performance.now();
        while (performance.now() - start < 1800) {
            const temp = shuffle(players).map((p, i) => ({ ...p, side: i % 2 ? 'red' : 'white' }));
            renderGrid(temp);
            await wait(110);
        }

        grid.outerHTML = `
            <div class="split-cols">
                ${['red', 'white'].map(side => `
                    <div class="split-col ${side}">
                        <h4>${SIDE_NAMES[side]}</h4>
                        ${players.filter(p => p.side === side).map(p => `
                            <div class="lander side-${p.side}">
                                <img src="${p.img}" alt="${p.name}">
                                <span>${p.name}</span>
                            </div>`).join('')}
                    </div>`).join('')}
            </div>`;

        const btn = card.querySelector('#split-start');
        btn.disabled = false;
        await awaitClick(btn);
        closeModal();
    }

    // =========================================================
    // 칸 이벤트 뽑기
    // =========================================================
    // 질문은 사람당 1번: 도달한 사람 중 한 명이라도 이미 받은 질문은 제외
    const notAsked = (list, group) => list.filter(q => group.every(p => !p.asked.has(q.text)));

    function drawEvent(group) {
        const isPair = group.length > 1;
        const questions = notAsked(isPair ? PAIR_QUESTIONS : SOLO_QUESTIONS, group);
        const options = [
            ...questions.map(q => ({ kind: 'question', q })),
            // 미니게임은 혼자 도착했을 때만 (같은 칸에서 만났을 때는 질문만)
            ...(isPair ? [] : pools.mini.map(m => ({ kind: m }))),
        ];

        if (options.length) {
            const pick = options[randInt(options.length)];
            if (pick.kind === 'question') {
                return { kind: 'question', q: pick.q, label: isPair ? '함께 질문' : '질문' };
            }
            pools.mini.splice(pools.mini.indexOf(pick.kind), 1);
            return { kind: pick.kind };
        }

        // 2명 질문을 다 했으면 → 방금 도착한 사람에게 개인 질문
        if (isPair) {
            const mover = [group[group.length - 1]];
            const solo = notAsked(SOLO_QUESTIONS, mover);
            if (solo.length) return { kind: 'question', q: solo[randInt(solo.length)], label: '질문', group: mover };
        }

        // 뜰 것이 없으면 쉬어가기
        return { kind: 'rest' };
    }

    async function runEvent(landers) {
        const ev = drawEvent(landers);
        const group = ev.group || landers;
        if (ev.kind === 'question') group.forEach(p => p.asked.add(ev.q.text));

        let success;
        if (ev.kind === 'question') success = await runQuestion(group, ev);
        else if (ev.kind === 'jump') success = await runJumpGame(group);
        else if (ev.kind === 'keyring') success = await runKeyringGame(group);
        else success = await runRest(group);

        closeModal();
        if (success === true) {
            // 혼자면 본인 +1, 만난 2명이면 각자의 팀에 +1 (같은 팀이면 그 팀에 +1)
            if (group.length > 1) [...new Set(group.map(x => x.side))].forEach(side => { bonus[side] += 1; });
            else group[0].points += 1;
        }
        return { kind: ev.kind, success, group };
    }

    async function runQuestion(group, ev) {
        const card = openModal(`
            <div class="modal-tag">${ev.label}</div>
            ${landersHtml(group)}
            <h3 class="modal-question">${ev.q.text}</h3>
            ${ev.q.note ? `<p class="modal-note">${ev.q.note}</p>` : ''}
            ${resultButtonsHtml}
        `);
        return awaitResult(card);
    }

    async function runRest(group) {
        const card = openModal(`
            <div class="modal-tag deep">쉬어가기</div>
            ${landersHtml(group)}
            <h3 class="modal-question">모든 질문을 다 했어요!<br>이번 칸은 쉬어갑니다 ☕</h3>
            <div class="btn-row modal-actions"><button class="btn primary" data-result="0">계속하기</button></div>
        `);
        return awaitResult(card);
    }

    // =========================================================
    // 미니게임 공용: 각 팀에서 플레이할 사람 랜덤 선택
    // =========================================================
    const vsPlayersHtml = `<div class="vs-players" id="vs-players"></div>`;

    async function pickTeamPlayers(card) {
        const box = card.querySelector('#vs-players');
        const bySide = side => players.filter(p => p.side === side);
        const render = (r, w) => {
            box.innerHTML = `
                <div class="lander side-red"><img src="${r.img}" alt="${r.name}"><span>${r.name}</span><small>홍팀</small></div>
                <span class="vs">vs</span>
                <div class="lander side-white"><img src="${w.img}" alt="${w.name}"><span>${w.name}</span><small>백팀</small></div>`;
        };
        const start = performance.now();
        while (performance.now() - start < 900) {
            render(bySide('red')[randInt(3)], bySide('white')[randInt(3)]);
            await wait(80);
        }
        const picked = { red: bySide('red')[randInt(3)], white: bySide('white')[randInt(3)] };
        render(picked.red, picked.white);
        box.classList.add('picked');
        return picked;
    }

    // =========================================================
    // 미니게임 1: 점프게임 (menu2 게임과 분리된 독립 버전)
    // =========================================================
    function createJumpGame(frame, charEl, scoreEl, goal) {
        const CHAR_LEFT = 40, CHAR_SIZE = 32;
        const CHAR_HIT = CHAR_SIZE * 0.75, CHAR_INSET = (CHAR_SIZE - CHAR_HIT) / 2;
        const OB_SIZE = 20, OB_HIT = OB_SIZE * 0.8, OB_INSET = (OB_SIZE - OB_HIT) / 2;
        const GIFT_SIZE = 28, GIFT_BOTTOM = 50;
        const JUMP_HEIGHT = 72, JUMP_DURATION = 340;
        const SPEED = 0.22, JUMP_BOOST = 32 / JUMP_DURATION, CLOUD_SPEED = SPEED * 0.85;
        const WALK_INTERVAL = 150;

        let obstacles = [], gifts = [], clouds = [];
        let score = 0, jumping = false, jumpStart = 0, running = false, last = 0, startTime = 0;
        let obT = 0, giftT = 0, cloudT = 0, walkT = 0, walkToggle = false, resolveFn = null, rafId = null;

        function clearAll() {
            [...obstacles, ...gifts, ...clouds].forEach(o => o.el.remove());
            obstacles = []; gifts = []; clouds = [];
        }

        function spawn(list, el, extra) {
            const x = frame.clientWidth;
            el.style.left = x + 'px';
            if (extra) extra(el);
            frame.appendChild(el);
            list.push({ el, x });
        }

        function jump() {
            if (!running || jumping) return;
            jumping = true;
            jumpStart = performance.now();
            charEl.src = 'game_character_4.png';
        }

        function finish(success) {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            if (resolveFn) resolveFn({ score, success, time: (performance.now() - startTime) / 1000 });
            resolveFn = null;
        }

        function tick(ts) {
            if (!running) return;
            if (!last) last = ts;
            const dt = Math.min(ts - last, 50);
            last = ts;

            if ((obT -= dt) <= 0) {
                const el = document.createElement('div');
                el.className = 'obstacle';
                spawn(obstacles, el);
                obT = rand(1600, 2800);
            }
            if ((giftT -= dt) <= 0) {
                const el = document.createElement('img');
                el.src = 'gift.svg';
                el.className = 'gift-item';
                el.alt = 'gift';
                spawn(gifts, el);
                giftT = rand(1500, 2800);
            }
            if ((cloudT -= dt) <= 0) {
                const el = document.createElement('img');
                el.src = Math.random() < 0.5 ? 'cloud_1.svg' : 'cloud_2.svg';
                el.className = 'cloud';
                el.alt = '';
                spawn(clouds, el, e => { e.style.bottom = rand(90, 150) + 'px'; });
                cloudT = rand(1200, 2400);
            }

            const move = (list, speed, size) => {
                for (let i = list.length - 1; i >= 0; i--) {
                    const o = list[i];
                    o.x -= speed * dt;
                    o.el.style.left = o.x + 'px';
                    if (o.x < -size) { o.el.remove(); list.splice(i, 1); }
                }
            };
            move(clouds, CLOUD_SPEED, 24);
            move(obstacles, SPEED + (jumping ? JUMP_BOOST : 0), OB_SIZE);
            move(gifts, SPEED, GIFT_SIZE);

            let jumpOffset = 0;
            if (jumping) {
                const prog = Math.min((ts - jumpStart) / JUMP_DURATION, 1);
                jumpOffset = prog < 0.5 ? JUMP_HEIGHT * (prog / 0.5) : JUMP_HEIGHT * (1 - (prog - 0.5) / 0.5);
                if (prog >= 1) {
                    jumping = false;
                    jumpOffset = 0;
                    charEl.src = walkToggle ? 'game_character_3.png' : 'game_character_2.png';
                }
            } else if ((walkT -= dt) <= 0) {
                walkT = WALK_INTERVAL;
                walkToggle = !walkToggle;
                charEl.src = walkToggle ? 'game_character_3.png' : 'game_character_2.png';
            }
            charEl.style.bottom = jumpOffset + 'px';

            const hL = CHAR_LEFT + CHAR_INSET, hR = CHAR_LEFT + CHAR_SIZE - CHAR_INSET;
            const hB = jumpOffset + CHAR_INSET, hT = jumpOffset + CHAR_SIZE - CHAR_INSET;
            for (const o of obstacles) {
                const oL = o.x + OB_INSET, oR = oL + OB_HIT;
                if (hL < oR && hR > oL && hB < OB_HIT && hT > 0) { finish(false); return; }
            }

            for (let i = gifts.length - 1; i >= 0; i--) {
                const g = gifts[i];
                if (CHAR_LEFT < g.x + GIFT_SIZE && CHAR_LEFT + CHAR_SIZE > g.x &&
                    jumpOffset < GIFT_BOTTOM + GIFT_SIZE && jumpOffset + CHAR_SIZE > GIFT_BOTTOM) {
                    g.el.remove();
                    gifts.splice(i, 1);
                    score++;
                    scoreEl.textContent = score;
                    if (score >= goal) { finish(true); return; }
                }
            }

            rafId = requestAnimationFrame(tick);
        }

        function start() {
            clearAll();
            score = 0;
            scoreEl.textContent = '0';
            jumping = false;
            charEl.src = 'game_character_1.png';
            charEl.style.bottom = '0px';
            last = 0;
            obT = rand(1600, 2800);
            giftT = rand(1000, 2000);
            cloudT = rand(1200, 2400);
            walkT = WALK_INTERVAL;
            running = true;
            startTime = performance.now();
            return new Promise(resolve => {
                resolveFn = resolve;
                rafId = requestAnimationFrame(tick);
            });
        }

        function stop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            clearAll();
        }

        return { start, jump, stop };
    }

    async function runJumpGame(group) {
        const GOAL = 5;
        const card = openModal(`
            <div class="modal-tag">미니게임</div>
            <h3 class="modal-title">점프게임</h3>
            <p class="modal-sub">블록을 피해 선물 🎁 ${GOAL}개를 모으면 성공!<br>홍팀과 백팀이 한 번씩 도전해요. (스페이스바로도 점프)</p>
            ${vsPlayersHtml}
            <div class="jg-turn" id="jg-turn"></div>
            <div class="score-board">🎁 <span id="jg-score">0</span> / ${GOAL}</div>
            <div class="game-frame" id="jg-frame">
                <div class="ground-line"></div>
                <img id="jg-char" src="game_character_1.png" class="character" alt="character">
            </div>
            <div class="jg-controls">
                <button class="btn primary" id="jg-start">START</button>
                <button class="jump-btn" id="jg-jump">Jump!</button>
            </div>
            <div class="jg-results" id="jg-results"></div>
            <div id="jg-actions" class="btn-row modal-actions hidden"><button class="btn primary" id="jg-ok">확인</button></div>
        `);

        const game = createJumpGame(card.querySelector('#jg-frame'), card.querySelector('#jg-char'),
            card.querySelector('#jg-score'), GOAL);
        const onKey = e => {
            if (e.code === 'Space') { e.preventDefault(); game.jump(); }
        };
        document.addEventListener('keydown', onKey);
        card.querySelector('#jg-jump').addEventListener('click', game.jump);
        card.querySelector('#jg-frame').addEventListener('pointerdown', game.jump);

        const startBtn = card.querySelector('#jg-start');
        startBtn.disabled = true;
        const picked = await pickTeamPlayers(card);
        const results = {};
        const lines = [];
        for (const side of shuffle(['red', 'white'])) {
            card.querySelector('#jg-turn').textContent = `🎮 ${SIDE_NAMES[side]} ${picked[side].name} 도전!`;
            startBtn.textContent = `${SIDE_NAMES[side]} START`;
            startBtn.disabled = false;
            await awaitClick(startBtn);
            startBtn.disabled = true;
            const r = await game.start();
            results[side] = r;
            lines.push(`${SIDE_NAMES[side]} ${picked[side].name}: 🎁 ${r.score}개 ${r.success ? `· 성공 (${r.time.toFixed(1)}초)` : '· 실패'}`);
            card.querySelector('#jg-results').innerHTML = lines.join('<br>');
            await wait(700);
        }
        game.stop();
        document.removeEventListener('keydown', onKey);
        startBtn.classList.add('hidden');
        card.querySelector('#jg-turn').textContent = '경기 종료!';

        // 승부: 성공한 팀 > (둘 다 성공) 더 빨리 성공한 팀 > (둘 다 실패) 선물을 더 많이 모은 팀
        const { red, white } = results;
        let winner = null;
        if (red.success !== white.success) winner = red.success ? 'red' : 'white';
        else if (red.success && white.success) winner = red.time === white.time ? null : (red.time < white.time ? 'red' : 'white');
        else if (red.score !== white.score) winner = red.score > white.score ? 'red' : 'white';

        card.querySelector('#jg-results').innerHTML = lines.join('<br>') +
            `<div class="jg-winner">${winner ? `🏆 ${SIDE_NAMES[winner]} 승리! +1점` : '🤝 무승부! 추가 점수 없음'}</div>`;

        // 완료/실패 없이 확인 → 이긴 팀에 자동 +1
        card.querySelector('#jg-actions').classList.remove('hidden');
        await awaitClick(card.querySelector('#jg-ok'));
        if (winner) bonus[winner] += 1;
        renderScores();
        return null;
    }

    // =========================================================
    // 미니게임 2: 키링게임
    // =========================================================
    async function runKeyringGame(group) {
        const LIMIT = 25;
        const card = openModal(`
            <div class="modal-tag">미니게임</div>
            <h3 class="modal-title">키링게임</h3>
            <p class="modal-sub">두 팀이 번갈아 '키링달기'를 눌러요.<br>가방끈을 끊어지게 만든 팀이 패배!</p>
            ${vsPlayersHtml}
            <div class="kr-turn" id="kr-turn"></div>
            <div class="bag-stage" id="bag-stage">
                <div class="bag-handle left"></div>
                <div class="bag-handle right"></div>
                <div class="bag-body" id="bag-body"><div class="bag-flap"></div></div>
                <div class="keyrings" id="kr-rings"></div>
            </div>
            <div class="kr-result" id="kr-result"></div>
            <button class="btn primary" id="kr-btn">키링달기</button>
            <div id="kr-actions" class="btn-row modal-actions hidden"><button class="btn primary" id="kr-ok">확인</button></div>
        `);

        const stage = card.querySelector('#bag-stage');
        const bagBody = card.querySelector('#bag-body');
        const rings = card.querySelector('#kr-rings');
        const btn = card.querySelector('#kr-btn');
        const turnEl = card.querySelector('#kr-turn');

        let total = 0;
        let count = 0;
        let side = Math.random() < 0.5 ? 'red' : 'white';
        const faces = shuffle(players);

        btn.disabled = true;
        const picked = await pickTeamPlayers(card);
        btn.disabled = false;
        const showTurn = () => { turnEl.textContent = `🎒 ${SIDE_NAMES[side]} ${picked[side].name} 차례`; };
        showTurn();

        const loser = await new Promise(resolve => {
            btn.addEventListener('click', () => {
                total += 1 + randInt(5);                    // 1~5 (숫자는 보이지 않음)
                const p = faces[count % faces.length];
                count++;

                const ring = document.createElement('div');
                ring.className = 'keyring';
                const chainLen = 14 + randInt(42);
                ring.style.left = (34 + rand(0, 140)) + 'px';
                ring.style.top = (70 + rand(0, 10)) + 'px';
                ring.style.zIndex = 10 + count;
                ring.innerHTML = `<div class="chain" style="height:${chainLen}px"></div><div class="ring"></div><img src="${p.img}" alt="${p.name}">`;
                rings.appendChild(ring);

                bagBody.classList.remove('wobble');
                void bagBody.offsetWidth;
                bagBody.classList.add('wobble');

                if (total >= LIMIT) {
                    btn.disabled = true;
                    resolve(side);
                    return;
                }
                side = side === 'red' ? 'white' : 'red';
                showTurn();
            });
        });

        // 가방끈이 끊어지고 키링이 우수수 도망
        turnEl.textContent = '💥 툭!';
        stage.classList.add('broken');
        rings.querySelectorAll('.keyring').forEach(r => {
            r.style.animation = 'none';
            const dx = rand(-260, 260);
            const dy = rand(-220, 160);
            r.style.transform = `translate(${dx}px, ${dy}px) rotate(${rand(-540, 540)}deg)`;
            r.style.opacity = '0';
        });

        const winner = loser === 'red' ? 'white' : 'red';
        await wait(700);
        btn.classList.add('hidden');
        card.querySelector('#kr-result').innerHTML =
            `가방끈이 끊어졌어요! ${SIDE_NAMES[loser]} 패배<br>🏆 ${SIDE_NAMES[winner]} 승리! +1점`;

        // 완료/실패 없이 확인 → 이긴 팀에 자동 +1
        card.querySelector('#kr-actions').classList.remove('hidden');
        await awaitClick(card.querySelector('#kr-ok'));
        bonus[winner] += 1;
        renderScores();
        return null;
    }

    // =========================================================
    // 게임 종료 & 룰렛
    // =========================================================
    async function showFinal() {
        const red = sideScore('red');
        const white = sideScore('white');
        const loser = red === white ? null : (red < white ? 'red' : 'white');
        const winner = loser ? (loser === 'red' ? 'white' : 'red') : null;

        const ranks = players.slice()
            .sort((a, b) => a.finishOrder - b.finishOrder)
            .map(p => `${p.finishOrder}. ${p.name} (${SIDE_NAMES[p.side]})`)
            .join('<br>');

        const card = openModal(`
            <h3 class="modal-title">${winner ? `🏆 ${SIDE_NAMES[winner]} 승리!` : '🤝 무승부!'}</h3>
            <div class="final-scores">
                <div class="side-score red"><span class="side-label">홍팀</span><span class="side-points">${red}</span></div>
                <div class="side-score white"><span class="side-label">백팀</span><span class="side-points">${white}</span></div>
            </div>
            <div class="final-ranks">${ranks}</div>
            <p class="modal-sub">${loser ? `${SIDE_NAMES[loser]}은 룰렛을 돌려주세요!` : '두 팀 모두 룰렛을 돌려주세요!'}</p>
            <div class="wheel-wrap">
                <div class="wheel-pointer">▼</div>
                <div class="wheel" id="wheel">
                    <span class="wheel-label a">${ROULETTE[0]}</span>
                    <span class="wheel-label b">${ROULETTE[1]}</span>
                </div>
            </div>
            <div class="wheel-result" id="wheel-result"></div>
            <div class="btn-row">
                <button class="btn primary" id="wheel-btn">룰렛 돌리기</button>
                <button class="btn" id="final-close">닫기</button>
            </div>
        `);

        let rotation = 0;
        const wheel = card.querySelector('#wheel');
        const spinBtn = card.querySelector('#wheel-btn');
        spinBtn.addEventListener('click', async () => {
            spinBtn.disabled = true;
            card.querySelector('#wheel-result').textContent = '';
            const pick = randInt(2);                               // 0: 오른쪽 반(0~180°), 1: 왼쪽 반
            const target = pick === 0 ? rand(20, 160) : rand(200, 340);
            rotation += 360 * 6 + ((360 - target) - (rotation % 360) + 360) % 360;
            wheel.style.transform = `rotate(${rotation}deg)`;
            await wait(4700);
            card.querySelector('#wheel-result').innerHTML = `🎉 ${ROULETTE[pick].replace('<br>', ' ')}!`;
            spinBtn.disabled = false;
            spinBtn.textContent = '다시 돌리기';
        });
        card.querySelector('#final-close').addEventListener('click', closeModal);
    }

    // =========================================================
    // 순서뽑기
    // =========================================================
    const FAST_MS = 1100;   // 빠른 교차 시간
    const SLOW_MS = 400;    // 감속 후 정지까지 (총 1.5초)

    function buildTicks() {
        const ticks = [];
        for (let t = 0; t < FAST_MS; t += 60) ticks.push(t);   // 빠른 교차
        const slow = [];
        let iv = 70;
        for (let i = 0; i < 4; i++) { slow.push(iv); iv *= 1.35; }
        const scale = SLOW_MS / slow.reduce((a, b) => a + b, 0);
        let t = FAST_MS;
        slow.forEach(s => { t += s * scale; ticks.push(Math.round(t)); }); // 점점 느려져 정지
        return ticks;
    }

    async function pickTurn() {
        if (busy) return;
        busy = true;
        $('pick-btn').disabled = true;
        $('dice-result').textContent = '';

        const active = players.filter(p => !p.cleared);
        if (roundPool.length === 0) roundPool = active.slice();
        // 짝은 하나의 단위로 뽑힘
        const units = [...new Set(roundPool.map(p => p.groupId))];
        const unitId = units[randInt(units.length)];
        const unitMembers = roundPool.filter(p => p.groupId === unitId);
        const chosen = unitMembers[randInt(unitMembers.length)];

        current = null;
        layoutTokens();
        renderPlayers();
        $('status').textContent = '두구두구두구... 🥁';

        const face = $('turn-face');
        face.classList.remove('picked');
        face.classList.add('spinning');

        const ticks = buildTicks();
        const start = performance.now();
        let shown = null;
        for (let i = 0; i < ticks.length; i++) {
            const delay = ticks[i] - (performance.now() - start);
            if (delay > 0) await wait(delay);
            let next;
            if (i === ticks.length - 1) {
                next = chosen;
            } else {
                do { next = active[randInt(active.length)]; }
                while (active.length > 1 && next === shown);
            }
            shown = next;
            setFace(next);
            if (ticks[i] > FAST_MS) face.classList.remove('spinning');
        }

        face.classList.remove('spinning');
        void face.offsetWidth;
        face.classList.add('picked');

        current = chosen;
        roundPool = roundPool.filter(p => p.groupId !== chosen.groupId);
        const isPair = groupOf(chosen).length > 1;
        $('turn-name').textContent = groupNames(chosen);
        layoutTokens();
        renderPlayers();
        $('status').textContent = isPair
            ? `🤝 ${groupNames(chosen)} 함께 차례! 주사위를 굴려주세요 🎲`
            : `${chosen.name}(${SIDE_NAMES[chosen.side]}) 차례! 주사위를 굴려주세요 🎲`;

        $('pick-btn').classList.add('hidden');
        $('pick-btn').disabled = false;
        $('roll-btn').classList.remove('hidden');
        saveState();
        busy = false;
    }

    // =========================================================
    // 주사위 굴리기 → 이동 → 이벤트
    // =========================================================
    async function rollDice() {
        if (busy || !current) return;
        busy = true;
        $('roll-btn').disabled = true;
        $('dice-result').textContent = '';
        $('status').textContent = `${current.name} 주사위를 굴립니다...`;

        const value = 1 + randInt(6);
        lastDice = value;
        const bounce = $('dice-bounce');
        bounce.classList.remove('rolling');
        void bounce.offsetWidth;
        bounce.classList.add('rolling');
        setDice(value, true);
        await wait(1900);

        const p = current;
        $('dice-result').textContent = `${value}!`;
        $('status').textContent = `${p.name} ${value}칸 이동!`;
        await wait(400);

        await moveGroup(p, value);

        if (p.pos >= TOTAL) {
            // 도착: 먼저 들어온 순서대로 6,5,4…
            const score = Math.max(1, players.length - finishCount);
            finishCount++;
            p.cleared = true;
            p.finishScore = score;
            p.finishOrder = finishCount;
            p.token.classList.remove('hop', 'pop');
            p.token.classList.add('clear');
            const tok = p.token;
            setTimeout(() => tok.remove(), 950);
            p.token = null;
            roundPool = roundPool.filter(x => x !== p);
            $('status').textContent = `🎉 ${p.name} 도착! +${score}점`;
        } else {
            const mate = findMeet(p);
            if (mate) {
                $('status').textContent = `🤝 ${mate.name} & ${p.name} 같은 칸에서 만났어요!`;
                [mate, p].forEach(hop);
            } else {
                $('status').textContent = `${p.name} ${p.pos}번 칸에 도착!`;
            }
            layoutTokens();
            renderPlayers();

            {
                // 모든 칸(모서리 포함, START/GOAL 제외)에서 팝업
                // 이동 결과를 먼저 저장 → 팝업 중 새로고침해도 같은 칸의 팝업이 다시 뜸
                pendingEvent = { player: p.id, mate: mate ? mate.id : null };
                usedCells.add(p.pos);
                saveState();
                await wait(mate ? 900 : 500);
                $(`cell-${p.pos}`).classList.add('used');
                await resolveEvent();
            }
        }

        await endTurn();
    }

    // 칸 팝업 실행 (새로고침 후 이어하기에서도 사용)
    async function resolveEvent() {
        const p = byId(pendingEvent.player);
        const mate = pendingEvent.mate ? byId(pendingEvent.mate) : null;
        const group = mate ? [mate, p] : [p];
        const { kind, success, group: answered } = await runEvent(group);
        const names = answered.map(x => x.name).join(' & ');
        pendingEvent = null;
        $('status').textContent = kind === 'jump' || kind === 'keyring'
            ? `${kind === 'jump' ? '🎁 선물게임' : '🎒 키링게임'} 끝! 다음 순서를 뽑아주세요!`
            : success
            ? `✅ ${names} 완료! +1점`
            : `${names} 실패… 다음 순서를 뽑아주세요!`;
    }

    async function endTurn() {
        current = null;
        layoutTokens();
        renderPlayers();

        $('roll-btn').classList.add('hidden');
        $('roll-btn').disabled = false;
        saveState();

        if (players.every(x => x.cleared)) {
            $('status').textContent = '🏆 모두 도착했어요! 최종 결과를 확인하세요.';
            setFace(null);
            $('turn-face').textContent = '🏆';
            busy = false;
            await wait(900);
            showFinal();
            return;
        }
        $('pick-btn').classList.remove('hidden');
        busy = false;
    }

    // =========================================================
    // 저장 / 이어하기 (새로고침해도 게임 유지)
    // =========================================================
    const STORAGE_KEY = 'doridul_marble_state_v1';
    const byId = id => players.find(p => p.id === id);

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                players: players.map(p => ({
                    id: p.id, side: p.side, pos: p.pos, cleared: p.cleared, groupId: p.groupId,
                    arrivedAt: p.arrivedAt, points: p.points, finishScore: p.finishScore,
                    finishOrder: p.finishOrder, asked: [...p.asked],
                })),
                roundPool: roundPool.map(p => p.id),
                current: current ? current.id : null,
                pendingEvent,
                bonus,
                mini: pools.mini,
                finishCount,
                arrivalSeq,
                usedCells: [...usedCells],
                lastDice,
            }));
        } catch (e) { /* 저장 실패는 무시 */ }
    }

    function loadState() {
        try {
            const st = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (st && Array.isArray(st.players) && st.players.length === PLAYERS.length) return st;
        } catch (e) { /* 손상된 저장값은 무시 */ }
        return null;
    }

    function clearState() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* 무시 */ }
    }

    function initState() {
        if (players) players.forEach(p => p.token && p.token.remove());
        players = PLAYERS.map((p, i) => ({
            ...p, img: images[i], side: 'red', pos: -1, cleared: false, token: null,
            groupId: i, arrivedAt: 0, points: 0, finishScore: 0, finishOrder: 0, asked: new Set(),
        }));
        pools = { mini: MINIGAMES.slice() };
        bonus = { red: 0, white: 0 };
        roundPool = [];
        current = null;
        pendingEvent = null;
        usedCells = new Set();
        finishCount = 0;
        arrivalSeq = 0;
        lastDice = 1;
        spinX = 0;
        spinY = 0;
        document.querySelectorAll('.cell.used').forEach(c => c.classList.remove('used'));
        setDice(1, false);
        setFace(null);
        $('turn-face').classList.remove('picked', 'spinning');
        $('dice-result').textContent = '';
        $('pick-btn').classList.remove('hidden');
        $('pick-btn').disabled = true;
        $('roll-btn').classList.add('hidden');
    }

    async function restore(st) {
        busy = true;
        initState();
        st.players.forEach(sp => {
            const p = byId(sp.id);
            if (!p) return;
            Object.assign(p, {
                side: sp.side, pos: sp.pos, cleared: sp.cleared, groupId: sp.groupId,
                arrivedAt: sp.arrivedAt, points: sp.points, finishScore: sp.finishScore,
                finishOrder: sp.finishOrder, asked: new Set(sp.asked || []),
            });
        });
        roundPool = (st.roundPool || []).map(byId).filter(Boolean);
        current = st.current ? byId(st.current) : null;
        pendingEvent = st.pendingEvent || null;
        bonus = st.bonus || { red: 0, white: 0 };
        pools = { mini: st.mini || MINIGAMES.slice() };
        finishCount = st.finishCount || 0;
        arrivalSeq = st.arrivalSeq || 0;
        usedCells = new Set(st.usedCells || []);
        lastDice = st.lastDice || 1;

        usedCells.forEach(i => { const c = $(`cell-${i}`); if (c) c.classList.add('used'); });
        players.forEach(p => {
            if (p.pos >= 0 && !p.cleared) {
                ensureToken(p).classList.remove('pop');
            }
        });
        setDice(lastDice, false);
        layoutTokens();
        renderPlayers();

        if (pendingEvent) {
            // 팝업이 떠 있던 상태에서 새로고침 → 같은 칸의 팝업을 다시 띄움
            setFace(current || byId(pendingEvent.player));
            $('pick-btn').classList.add('hidden');
            $('status').textContent = '이어서 진행합니다...';
            await wait(400);
            await resolveEvent();
            await endTurn();
            return;
        }

        if (current) {
            setFace(current);
            $('pick-btn').classList.add('hidden');
            $('roll-btn').classList.remove('hidden');
            $('status').textContent = `${current.name}(${SIDE_NAMES[current.side]}) 차례! 주사위를 굴려주세요 🎲`;
        } else if (players.every(x => x.cleared)) {
            $('pick-btn').classList.add('hidden');
            $('turn-face').textContent = '🏆';
            $('status').textContent = '🏆 모두 도착했어요! 최종 결과를 확인하세요.';
            showFinal();
        } else {
            $('pick-btn').disabled = false;
            $('status').textContent = "이어서 진행합니다. '순서뽑기'를 눌러주세요!";
        }
        busy = false;
    }

    // =========================================================
    // 초기화 (새 게임)
    // =========================================================
    async function reset() {
        if (busy) return;
        busy = true;
        clearState();
        initState();
        $('status').textContent = '팀을 나누는 중...';
        renderPlayers();

        await splitTeams();
        renderPlayers();
        saveState();
        $('pick-btn').disabled = false;
        $('status').textContent = "'순서뽑기'를 눌러 첫 번째 차례를 정해보세요!";
        busy = false;
    }

    buildBoard();
    buildDice();
    $('pick-btn').addEventListener('click', pickTurn);
    $('roll-btn').addEventListener('click', rollDice);
    $('reset-btn').addEventListener('click', () => {
        if (busy) return;
        if (confirm('처음부터 다시 시작할까요? (팀도 새로 나눕니다)')) reset();
    });

    // =========================================================
    // 입장 비밀번호
    // =========================================================
    const AUTH_KEY = 'doridul_marble_auth';
    // 비밀번호의 SHA-256 해시 (소스에 비밀번호를 그대로 적지 않기 위함)
    const PASSWORD_HASH = '7349e3dbe99900e49b6c8f1cea76dff6f4c2ea1ec6df6bcfc07311c7d704bf8c';

    async function sha256(text) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const isAuthed = () => { try { return sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) { return false; } };

    function askPassword() {
        const card = openModal(`
            <div class="modal-tag">LOCKED</div>
            <h3 class="modal-title">🔒 비밀번호를 입력해주세요</h3>
            <form class="pw-form" id="pw-form" autocomplete="off">
                <input type="password" inputmode="numeric" class="pw-input" id="pw-input" placeholder="비밀번호" autofocus>
                <p class="pw-error" id="pw-error"></p>
                <div class="btn-row">
                    <button type="submit" class="btn primary">입장하기</button>
                    <a href="index.html" class="btn">메인으로</a>
                </div>
            </form>
        `);
        const input = card.querySelector('#pw-input');
        const error = card.querySelector('#pw-error');
        setTimeout(() => input.focus(), 50);

        return new Promise(resolve => {
            card.querySelector('#pw-form').addEventListener('submit', async e => {
                e.preventDefault();
                if (await sha256(input.value.trim()) === PASSWORD_HASH) {
                    try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (err) { /* 무시 */ }
                    closeModal();
                    resolve();
                } else {
                    error.textContent = '비밀번호가 틀렸어요.';
                    input.value = '';
                    input.focus();
                    card.classList.remove('shake');
                    void card.offsetWidth;
                    card.classList.add('shake');
                }
            });
        });
    }

    // 새로고침일 때만 이어하기(비밀번호도 다시 묻지 않음).
    // 메인 등 다른 페이지에서 들어오면 비밀번호를 다시 묻고 새 게임
    const navEntry = performance.getEntriesByType('navigation')[0];
    const isReload = navEntry ? navEntry.type === 'reload' : performance.navigation?.type === 1;
    if (!isReload) {
        clearState();
        try { sessionStorage.removeItem(AUTH_KEY); } catch (e) { /* 무시 */ }
    }

    // 브라우저 뒤로가기 캐시로 페이지가 그대로 복원된 경우에도 비밀번호 + 새 게임
    window.addEventListener('pageshow', e => {
        if (e.persisted) {
            clearState();
            try { sessionStorage.removeItem(AUTH_KEY); } catch (err) { /* 무시 */ }
            location.reload();
        }
    });

    Promise.all(PLAYERS.map(resolveImage)).then(async list => {
        images = list;
        if (!isAuthed()) await askPassword();
        const saved = loadState();
        if (saved) restore(saved);
        else reset();
    });

    // 테스트용 접근
    window.__marble = {
        get players() { return players; }, get pools() { return pools; }, get bonus() { return bonus; },
        runEvent, showFinal, renderPlayers, layoutTokens, ensureToken, setDice, findMeet, groupOf,
    };
})();
