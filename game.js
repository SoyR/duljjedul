const CHAR_LEFT = 40;
const CHAR_SIZE = 32;
const CHAR_HITBOX_SCALE = 0.75; // 장애물 판정에 한해 캐릭터 판정도 관대하게
const CHAR_HITBOX_SIZE = CHAR_SIZE * CHAR_HITBOX_SCALE;
const CHAR_HITBOX_INSET = (CHAR_SIZE - CHAR_HITBOX_SIZE) / 2;
const OBSTACLE_SIZE = 20;
const OBSTACLE_HITBOX_SCALE = 0.8; // 시각 크기보다 판정을 관대하게
const OBSTACLE_HITBOX_SIZE = OBSTACLE_SIZE * OBSTACLE_HITBOX_SCALE;
const OBSTACLE_HITBOX_INSET = (OBSTACLE_SIZE - OBSTACLE_HITBOX_SIZE) / 2;
const GIFT_SIZE = 28;
const GIFT_BOTTOM = 50;
const JUMP_HEIGHT = 72;
const JUMP_DURATION = 340; // ms (상승 + 하강)
const SCROLL_SPEED = 0.22; // px / ms
const JUMP_FORWARD_BOOST = 32; // 점프 중 블록이 추가로 밀려나는 총량(px)
const JUMP_FORWARD_SPEED = JUMP_FORWARD_BOOST / JUMP_DURATION; // px / ms
const WALK_FRAME_INTERVAL = 150; // ms, 걷는 모션 프레임 전환 간격
const CLOUD_WIDTH = 24;
const CLOUD_SPEED = SCROLL_SPEED * 0.85; // block보다 아주 조금 느리게
const CLOUD_MIN_BOTTOM = 90;
const CLOUD_MAX_BOTTOM = 150;
const CLOUD_SPAWN_MIN = 2500;
const CLOUD_SPAWN_MAX = 5000;
const STORAGE_KEY = 'doridul_gift_game_leaderboard';
const LEADERBOARD_DISPLAY_COUNT = 5;

let frameEl, charEl, scoreEl;
let obstacles = [];
let gifts = [];
let clouds = [];
let score = 0;
let isJumping = false;
let jumpStart = 0;
let gameRunning = false;
let rafId = null;
let lastTimestamp = 0;
let obstacleTimer = 0;
let giftTimer = 0;
let cloudTimer = 0;
let walkFrameTimer = 0;
let walkFrameToggle = false;

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function loadScores() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveScores(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function spawnObstacle() {
    const el = document.createElement('div');
    el.className = 'obstacle';
    const x = frameEl.clientWidth;
    el.style.left = x + 'px';
    frameEl.appendChild(el);
    obstacles.push({ el, x });
}

function spawnGift() {
    const el = document.createElement('img');
    el.src = 'gift.svg';
    el.className = 'gift-item';
    el.alt = 'gift';
    const x = frameEl.clientWidth;
    el.style.left = x + 'px';
    frameEl.appendChild(el);
    gifts.push({ el, x });
}

function spawnCloud() {
    const el = document.createElement('img');
    el.src = Math.random() < 0.5 ? 'cloud_1.svg' : 'cloud_2.svg';
    el.className = 'cloud';
    el.alt = '';
    const x = frameEl.clientWidth;
    el.style.left = x + 'px';
    el.style.bottom = rand(CLOUD_MIN_BOTTOM, CLOUD_MAX_BOTTOM) + 'px';
    frameEl.appendChild(el);
    clouds.push({ el, x });
}

function jump() {
    if (!gameRunning || isJumping) return;
    isJumping = true;
    jumpStart = performance.now();
    charEl.src = 'game_character_4.png';
}

function tick(timestamp) {
    if (!gameRunning) return;
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    obstacleTimer -= dt;
    if (obstacleTimer <= 0) {
        spawnObstacle();
        obstacleTimer = rand(1600, 2800);
    }

    giftTimer -= dt;
    if (giftTimer <= 0) {
        spawnGift();
        giftTimer = rand(2000, 3800);
    }

    cloudTimer -= dt;
    if (cloudTimer <= 0) {
        spawnCloud();
        cloudTimer = rand(CLOUD_SPAWN_MIN, CLOUD_SPAWN_MAX);
    }

    for (let i = clouds.length - 1; i >= 0; i--) {
        const c = clouds[i];
        c.x -= CLOUD_SPEED * dt;
        c.el.style.left = c.x + 'px';
        if (c.x < -CLOUD_WIDTH) {
            c.el.remove();
            clouds.splice(i, 1);
        }
    }

    const obstacleSpeed = SCROLL_SPEED + (isJumping ? JUMP_FORWARD_SPEED : 0);
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x -= obstacleSpeed * dt;
        o.el.style.left = o.x + 'px';
        if (o.x < -OBSTACLE_SIZE) {
            o.el.remove();
            obstacles.splice(i, 1);
        }
    }

    for (let i = gifts.length - 1; i >= 0; i--) {
        const g = gifts[i];
        g.x -= SCROLL_SPEED * dt;
        g.el.style.left = g.x + 'px';
        if (g.x < -GIFT_SIZE) {
            g.el.remove();
            gifts.splice(i, 1);
        }
    }

    let jumpOffset = 0;
    if (isJumping) {
        const elapsed = timestamp - jumpStart;
        const progress = Math.min(elapsed / JUMP_DURATION, 1);
        jumpOffset = progress < 0.5
            ? JUMP_HEIGHT * (progress / 0.5)
            : JUMP_HEIGHT * (1 - (progress - 0.5) / 0.5);
        if (progress >= 1) {
            isJumping = false;
            jumpOffset = 0;
            charEl.src = walkFrameToggle ? 'game_character_3.png' : 'game_character_2.png';
        }
    }
    charEl.style.bottom = jumpOffset + 'px';

    if (!isJumping) {
        walkFrameTimer -= dt;
        if (walkFrameTimer <= 0) {
            walkFrameTimer = WALK_FRAME_INTERVAL;
            walkFrameToggle = !walkFrameToggle;
            charEl.src = walkFrameToggle ? 'game_character_3.png' : 'game_character_2.png';
        }
    }

    const charLeft = CHAR_LEFT;
    const charRight = CHAR_LEFT + CHAR_SIZE;
    const charBottom = jumpOffset;
    const charTop = jumpOffset + CHAR_SIZE;

    const charHitLeft = CHAR_LEFT + CHAR_HITBOX_INSET;
    const charHitRight = CHAR_LEFT + CHAR_SIZE - CHAR_HITBOX_INSET;
    const charHitBottom = jumpOffset + CHAR_HITBOX_INSET;
    const charHitTop = jumpOffset + CHAR_SIZE - CHAR_HITBOX_INSET;

    for (const o of obstacles) {
        const oLeft = o.x + OBSTACLE_HITBOX_INSET;
        const oRight = oLeft + OBSTACLE_HITBOX_SIZE;
        const oBottom = 0;
        const oTop = OBSTACLE_HITBOX_SIZE;
        if (charHitLeft < oRight && charHitRight > oLeft && charHitBottom < oTop && charHitTop > oBottom) {
            endGame();
            return;
        }
    }

    for (let i = gifts.length - 1; i >= 0; i--) {
        const g = gifts[i];
        const gLeft = g.x, gRight = g.x + GIFT_SIZE, gBottom = GIFT_BOTTOM, gTop = GIFT_BOTTOM + GIFT_SIZE;
        if (charLeft < gRight && charRight > gLeft && charBottom < gTop && charTop > gBottom) {
            g.el.remove();
            gifts.splice(i, 1);
            score++;
            scoreEl.textContent = score;
        }
    }

    rafId = requestAnimationFrame(tick);
}

function startGame() {
    obstacles.forEach(o => o.el.remove());
    gifts.forEach(g => g.el.remove());
    clouds.forEach(c => c.el.remove());
    obstacles = [];
    gifts = [];
    clouds = [];
    score = 0;
    scoreEl.textContent = '0';
    isJumping = false;
    charEl.src = 'game_character_1.png';
    charEl.style.bottom = '0px';
    lastTimestamp = 0;
    obstacleTimer = rand(1600, 2800);
    giftTimer = rand(2000, 3800);
    cloudTimer = rand(CLOUD_SPAWN_MIN, CLOUD_SPAWN_MAX);
    walkFrameTimer = WALK_FRAME_INTERVAL;
    walkFrameToggle = false;

    document.getElementById('step-start').classList.add('hidden');
    document.getElementById('step-gameover').classList.add('hidden');
    document.getElementById('step-game').classList.remove('hidden');

    gameRunning = true;
    rafId = requestAnimationFrame(tick);
}

function endGame() {
    gameRunning = false;
    if (rafId) cancelAnimationFrame(rafId);

    document.getElementById('step-game').classList.add('hidden');
    document.getElementById('step-gameover').classList.remove('hidden');
    document.getElementById('final-score').textContent = score;

    const nameInput = document.getElementById('name-input');
    const submitBtn = document.getElementById('submit-score-btn');
    nameInput.value = '';
    nameInput.disabled = false;
    submitBtn.disabled = false;

    renderLeaderboard(loadScores());
}

function submitScore() {
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim() || '익명';
    const list = loadScores();
    list.push({ name, score });
    list.sort((a, b) => b.score - a.score);
    saveScores(list);
    renderLeaderboard(list);

    nameInput.disabled = true;
    document.getElementById('submit-score-btn').disabled = true;
}

function renderLeaderboard(list, targetId) {
    const el = document.getElementById(targetId || 'leaderboard');
    const top = list.slice(0, LEADERBOARD_DISPLAY_COUNT);
    if (top.length === 0) {
        el.innerHTML = '<p style="text-align:center;">아직 기록이 없습니다.</p>';
        return;
    }
    let html = '<strong>🏆 랭킹 TOP 5</strong>';
    top.forEach((item, idx) => {
        html += `<div class="leaderboard-item"><span><span class="leaderboard-rank">${idx + 1}.</span>${escapeHtml(item.name)}</span><span>${item.score}점</span></div>`;
    });
    el.innerHTML = html;
}

function showRanking() {
    document.getElementById('step-start').classList.add('hidden');
    document.getElementById('step-ranking').classList.remove('hidden');
    renderLeaderboard(loadScores(), 'ranking-list');
}

function hideRanking() {
    document.getElementById('step-ranking').classList.add('hidden');
    document.getElementById('step-start').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    frameEl = document.getElementById('game-frame');
    charEl = document.getElementById('character');
    scoreEl = document.getElementById('score');

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('jump-btn').addEventListener('click', jump);
    document.getElementById('submit-score-btn').addEventListener('click', submitScore);
    document.getElementById('retry-btn').addEventListener('click', startGame);
    document.getElementById('ranking-btn').addEventListener('click', showRanking);
    document.getElementById('ranking-back-btn').addEventListener('click', hideRanking);
});
