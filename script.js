let INITIAL_MEMBERS = [];
const LOADING_MESSAGES = ["두근두근 💓", "두구두구두구 🥁", "메리크리스마스! 🎄"];

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

let remainingMembers = [];
let sequence = [];
let currentStep = 1;

function initGame() {
    remainingMembers = [];
    sequence = [];
    currentStep = 1;
    INITIAL_MEMBERS = [];

    document.getElementById('step-1').classList.remove('hidden');
    document.getElementById('step-game').classList.add('hidden');
    document.getElementById('chain-history').classList.add('hidden');
    document.getElementById('chain-history').innerHTML = '';

    const errorEl = document.getElementById('setup-error');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }

    const countSelect = document.getElementById('member-count');
    if (countSelect) {
        renderNameInputs(countSelect.value);
    }
}

function renderNameInputs(count) {
    const container = document.getElementById('name-inputs');
    container.innerHTML = '';
    for (let i = 1; i <= Number(count); i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'name-input';
        input.maxLength = 8;
        input.placeholder = `이름 ${i}`;
        container.appendChild(input);
    }
}

function handleSetupStart() {
    const inputs = document.querySelectorAll('#name-inputs input');
    const names = Array.from(inputs).map(input => input.value.trim());
    const errorEl = document.getElementById('setup-error');

    if (names.some(name => name === '')) {
        errorEl.textContent = '모든 이름을 입력해주세요.';
        errorEl.classList.remove('hidden');
        return;
    }
    if (new Set(names).size !== names.length) {
        errorEl.textContent = '이름이 겹치지 않게 입력해주세요.';
        errorEl.classList.remove('hidden');
        return;
    }
    errorEl.classList.add('hidden');

    INITIAL_MEMBERS = names;
    remainingMembers = [...INITIAL_MEMBERS];
    nextStep(2);
}

function nextStep(step) {
    if(step === 2) {
        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-game').classList.remove('hidden');
        setupStep2();
    }
}

function renderMembers() {
    const container = document.getElementById('members-container');
    container.innerHTML = '';
    INITIAL_MEMBERS.forEach(member => {
        const badge = document.createElement('span');
        badge.className = 'member-badge';
        if (sequence.includes(member)) {
            badge.classList.add('selected');
        }
        badge.textContent = member;
        container.appendChild(badge);
    });
}

function setupStep2() {
    currentStep = 2;
    renderMembers();
    document.getElementById('game-title').textContent = "첫 번째 주자 뽑기";
    document.getElementById('game-desc').textContent = "선물 전달을 시작할 첫 번째 사람을 뽑아주세요.";
    document.getElementById('result-label').textContent = "첫 번째 주자는?";
    document.getElementById('result-name').textContent = "";

    const btn = document.getElementById('action-btn');
    btn.disabled = false;
    btn.textContent = "첫번째 사람 뽑기";
    btn.onclick = drawFirstWithLoading;
}

function startLoadingAnimation(onComplete) {
    const btn = document.getElementById('action-btn');
    const resultNameEl = document.getElementById('result-name');
    btn.disabled = true;

    let duration = 2500; // 2.5초 로딩
    let intervalTime = 250; // 문구 변경 간격 (ms)
    let elapsedTime = 0;

    let timer = setInterval(() => {
        // 문구를 무작위로 선택
        const randomMsg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
        resultNameEl.innerHTML = `<span class="loading-text">${randomMsg}</span>`;

        elapsedTime += intervalTime;
        if (elapsedTime >= duration) {
            clearInterval(timer);
            btn.disabled = false;
            onComplete();
        }
    }, intervalTime);
}

function drawFirstWithLoading() {
    startLoadingAnimation(drawFirst);
}

function drawFirst() {
    const randomIndex = Math.floor(Math.random() * remainingMembers.length);
    const selected = remainingMembers.splice(randomIndex, 1)[0];
    sequence.push(selected);

    renderMembers();
    document.getElementById('result-name').textContent = selected;

    const btn = document.getElementById('action-btn');
    btn.textContent = "다음 선물 받을 사람 뽑기";
    btn.onclick = prepareNextDraw;
}

function prepareNextDraw() {
    currentStep++;
    const giver = sequence[sequence.length - 1];

    if (remainingMembers.length > 1) {
        document.getElementById('game-title').textContent = `선물 받을 사람 뽑기 (${sequence.length}/${INITIAL_MEMBERS.length})`;
        document.getElementById('game-desc').innerHTML = `<b>${escapeHtml(giver)}</b> 님이 선물해 줄 다음 사람을 뽑아주세요.`;
        document.getElementById('result-label').textContent = `${giver} → ?`;
        document.getElementById('result-name').textContent = "";

        const btn = document.getElementById('action-btn');
        btn.disabled = false;
        btn.textContent = "다음 선물 받을 사람 뽑기";
        btn.onclick = drawNextWithLoading;
    } else if (remainingMembers.length === 1) {
        setupFinalStep();
    }
}

function drawNextWithLoading() {
    startLoadingAnimation(drawNext);
}

function drawNext() {
    const randomIndex = Math.floor(Math.random() * remainingMembers.length);
    const selected = remainingMembers.splice(randomIndex, 1)[0];
    sequence.push(selected);

    renderMembers();
    document.getElementById('result-name').textContent = selected;

    if (remainingMembers.length > 0) {
        const btn = document.getElementById('action-btn');
        btn.textContent = "다음 순서로 진행";
        btn.onclick = prepareNextDraw;
    } else {
        setupFinalStep();
    }
}

function setupFinalStep() {
    // 마지막 남은 사람 확정
    const lastMember = remainingMembers.pop();
    sequence.push(lastMember);
    renderMembers();

    document.getElementById('game-title').textContent = "최종 결과 발표";
    document.getElementById('game-desc').innerHTML = `모든 순서가 정해졌습니다!`;
    document.getElementById('result-label').textContent = "마지막 주자";
    document.getElementById('result-name').textContent = lastMember;

    // 히스토리 목록 생성
    const historyContainer = document.getElementById('chain-history');
    historyContainer.classList.remove('hidden');

    let historyHTML = '<strong>🎁 선물 전달 순서:</strong><br><br>';
    for(let i = 0; i < sequence.length - 1; i++) {
        historyHTML += `<div class="chain-item">🎄 <b>${escapeHtml(sequence[i])}</b> ➔ <b>${escapeHtml(sequence[i+1])}</b> 에게 선물</div>`;
    }
    historyHTML += `<div class="chain-item">🎄 <b>${escapeHtml(sequence[sequence.length - 1])}</b> ➔ <b>${escapeHtml(sequence[0])}</b> 에게 선물 (첫 번째 주자)</div>`;

    historyContainer.innerHTML = historyHTML;

    // 버튼 변경
    const btn = document.getElementById('action-btn');
    btn.disabled = false;
    btn.textContent = "처음으로";
    btn.onclick = initGame;
}

// 뽑기 화면(step-1)이 있는 페이지에서만 초기화 실행
if (document.getElementById('step-1')) {
    initGame();
}
