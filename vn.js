const TYPE_SPEED = 40; // ms / 글자

// 대사 스크립트: id로 연결되는 노드 그래프
// choices가 있으면 타이핑이 끝난 후 선택지 버튼을 보여줌
// input이 true면 타이핑이 끝난 후 이름 입력창을 보여줌
// 둘 다 없고 next가 있으면 ▼를 보여주고 클릭하면 다음으로 진행
const SCRIPT = {
    l1: { text: '안녕?', next: 'l2' },
    l2: { text: '어서와. 숨바에 온걸 환영해.', next: 'l3' },
    l3: {
        text: '오늘도 고생많았어. 한잔할래?',
        choices: [
            { label: '좋아', next: 'l4' },
            { label: '아니', next: 'l6' }
        ]
    },
    l4: {
        text: '그럼 뭘로 마실래?',
        choices: [
            { label: '커피', next: 'l5', drinkEmoji: '☕' },
            { label: '레모네이드', next: 'l5', drinkEmoji: '🍋' },
            { label: '칵테일', next: 'l5', drinkEmoji: '🍸' }
        ]
    },
    l5: { text: '여기 한잔 나왔어.', motion: true, next: 'l7' },
    l6: { text: '오 그래. 그럼 이야기나 해도 좋아.', next: 'l7' },
    l7: {
        text: '이름이 뭐야? 이름이 좀 그러면 별명을 이야기해도 돼. 빈칸으로 두어도 좋아.',
        input: true,
        next: 'l8'
    },
    l8: { text: '환영해.', next: 'l9' },
    l9: { text: '여기는 크리스마스를 기념해서 만들어봤어.', next: 'l10' },

    l10: { text: '올 한해도 고생많았어. 여러가지 일이 있었겠지만 지금 여기까지 왔네.', next: 'l11' },
    l11: {
        text: '나랑은 어땠어? 나랑도 자주 놀았어?',
        choices: [
            { label: '올해는 꽤 자주 놀았네.', next: 'l12a' },
            { label: '그래도 종종 만났던거 같네.', next: 'l12b' },
            { label: '한 두번 본것 같네.', next: 'l12c' },
            { label: '연락만 좀 한 것 같네.', next: 'l12d' }
        ]
    },
    l12a: { text: '그랬구나, 올 한해 나와 즐겁게 지내줘서 고마워.', next: 'l13' },
    l12b: { text: '그랬구나, 가끔이라도 함께 해줘서 고마워.', next: 'l13' },
    l12c: { text: '그랬구나, 삶이 바쁘면 그럴때도 있는거지. 그래도 잊지않고 만나줘서 고마워.', next: 'l13' },
    l12d: { text: '그랬구나, 그래도 잊지않고 연락해줘서 고마워. 내년엔 가끔 보자.', next: 'l13' },

    l13: { text: '최근에 나도 여러 일들을 겪으면서 생각이 더 많아졌어. 너도 알다시피 나 머리속 완전 우주잖아.', next: 'l14' },
    l14: { text: '그걸 정리하고 깨달음을 얻는 중요한 한해였던거같아.', next: 'l15' },
    l15: { text: '그래서 더 감사하게 되더라고.', next: 'l16' },
    l16: { text: '여기에 방문해서 내가 만든걸 봐주는 사람에게 정말 고맙다는 말을 하고싶어.', next: 'l17' },
    l17: { text: '어떤 형태로든 앞으로도 좋은 친구, 가족, 지인 또는 소중한 사람으로 함께할 수 있기를 바래.', next: 'hub' },

    hub: {
        text: '어떤 주제에 대해 이야기해볼래? 대답 저장은 네 선택이니까 걱정하지 말고 자유롭게 적어줘.',
        choices: () => {
            const available = TOPICS.filter(t => !visitedTopics.has(t.id))
                .map(t => ({ label: t.label, next: t.next }));
            return [...available, { label: '대화 그만하기', next: 'l18' }];
        }
    },

    // 올 한해 있었던 기억에 남는 일
    topicMemory1: { text: '나는 필름을 현상했을 때, 친구가 정말 이쁘게 나와서 "아 내가 얘를 이렇게 보고있구나"라고 생각한 적있어.', next: 'topicMemory2' },
    topicMemory2: { text: '굉장히 행복한 기억이였어.', next: 'topicMemory3' },
    topicMemory3: { text: '이 시절의 친구의 모습을 담을 수 있다는게.', next: 'topicMemory4' },
    topicMemory4: {
        text: '어떤 일이 기억에 남았어?',
        message: true,
        messageMaxLength: 100,
        messageKey: 'memory',
        topicId: 'memory',
        next: 'hub'
    },

    // 요즘 사는 이야기
    topicDaily1: { text: '요즘은 필름 사진에 빠져있어.', next: 'topicDaily2' },
    topicDaily2: { text: '나와 친구들의 젊은 모습을 담고 있다는 생각이 들어서 정말 즐거워.', next: 'topicDaily3' },
    topicDaily3: {
        text: '어떻게 지내?',
        message: true,
        messageMaxLength: 100,
        messageKey: 'daily',
        topicId: 'daily',
        next: 'topicDaily4'
    },
    topicDaily4: { text: '그렇구나.', next: 'hub' },

    // 철학적 논제
    topicPhil1: { text: '최근에 정의 내린 철학적 논제는...', next: 'topicPhil2' },
    topicPhil2: { text: '사랑이란 무엇일까였어.', next: 'topicPhil3' },
    topicPhil3: {
        text: '사랑이란 무엇이라고 생각해?',
        message: true,
        messageMaxLength: 300,
        messageKey: 'philosophy',
        topicId: 'philosophy',
        next: 'topicPhil4'
    },
    topicPhil4: { text: '다양한 의견이 있구나.', next: 'topicPhil5' },
    topicPhil5: {
        text: '나의 의견도 들어볼래?',
        choices: [
            { label: '좋아, 말해줘.', next: 'topicPhilYes1' },
            { label: '괜찮아, 나중에 들을게', next: 'topicPhilNo1' }
        ]
    },
    topicPhilYes1: { text: '나에게 있어서 사랑이란 "소비"라고 생각해.', next: 'topicPhilYes2' },
    topicPhilYes2: { text: '시간, 돈, 감정을 소비하는거지.', next: 'topicPhilYes3' },
    topicPhilYes3: { text: '나는 사람에게 가장 큰 사치는 "사색"이라고 생각하거든.', next: 'topicPhilYes4' },
    topicPhilYes4: { text: '누군가가 내 사치스러운 사색을 대부분 차지한다면…', next: 'topicPhilYes5' },
    topicPhilYes5: { text: '가장 큰 소비를 하고있으니까, 그것이 사랑이 아닐까?라는 생각을해.', next: 'topicPhilYes6' },
    topicPhilYes6: { text: '물론 개인적인 의견이야. 앞으로 변할수도 있고.', next: 'hub' },
    topicPhilNo1: { text: '오 그래. 대화할 시간은 많으니까', next: 'hub' },

    // 2026년 이룬 것
    topicAchieve1: { text: '2026년에는 카페 브랜딩 하나를 완성했어.', next: 'topicAchieve2' },
    topicAchieve2: { text: '아주 즐거운 작업이었어.', next: 'topicAchieve3' },
    topicAchieve3: {
        text: '2026년도에는 무엇을 이뤘어?',
        message: true,
        messageMaxLength: 100,
        messageKey: 'achievement',
        topicId: 'achievement',
        next: 'hub'
    },

    // 내년 목표
    topicGoal1: { text: '나의 내년 목표는 데드리프트 100kg 드는거야. 지금 85kg까지왔어', next: 'topicGoal2' },
    topicGoal2: {
        text: '어때, 내년 목표가 뭐야?',
        message: true,
        messageMaxLength: 100,
        messageKey: 'goal',
        topicId: 'goal',
        next: 'hub'
    },

    l18: { text: '마지막으로 나한테 하고 싶은말 있어?', next: 'l19' },
    l19: {
        text: '저장하는건 선택이니까 자유롭게 남겨도 좋아.',
        message: true,
        messageMaxLength: 100,
        messageKey: 'closing',
        next: 'l20'
    },
    l20: {
        text: '오 다 작성했으면 이걸 나한테 보내줄 수도있고 그냥 여기 바를 나갈 수도 있어.',
        choices: [
            { label: '보내기', next: 'l21', action: 'send' },
            { label: '보내지않기', next: 'l21' }
        ]
    },
    l21: { text: '내년에도 잘부탁해.', next: 'l22' },
    l22: { text: '머무르고 싶으면 머물러도 좋아', next: 'l23' },
    l23: {
        text: '머무른다고하면 내가 좋아하는 노래 플레이리스트를 들려줄게.',
        playlist: true,
        next: null
    }
};

// url에 유튜브 링크(watch/youtu.be/embed 형식 모두 가능)를 넣으면 재생 버튼이 생김
const PLAYLIST = [
    { title: 'Toploader - Dancing in the Moonlight', url: 'https://www.youtube.com/watch?v=0yBnIUX0QAE&list=RD0yBnIUX0QAE&start_radio=1' },
    { title: 'Michael Bublé - Moondance', url: 'https://www.youtube.com/watch?v=wPpJOpXp0UA&list=RDwPpJOpXp0UA&start_radio=1' },
    { title: '우효 - Dandelion (single ver.)', url: 'https://www.youtube.com/watch?v=dFpFjFwWeB8&list=PLB2LZG9YIxN4' },
    { title: 'Jack Stauber - Buttercup', url: 'https://www.youtube.com/watch?v=e2qG5uwDCW4&list=PLB2LZG9YIxN4&index=7' },
    { title: 'Maroon 5 - What Lovers Do', url: 'https://www.youtube.com/watch?v=0siKyXL_h08&list=PLB2LZG9YIxN4&index=17' },
    { title: 'Glen Check - 60\'S CARDIN', url: 'https://www.youtube.com/watch?v=0fN71Wtgoa8&list=PLB2LZG9YIxN4&index=23' },
    { title: 'Lizzo - Juice', url: 'https://www.youtube.com/watch?v=9y4sFUmiwB0&list=PLB2LZG9YIxN4&index=24' },
    { title: 'Cody・Lee(李) - 我愛你', url: 'https://www.youtube.com/watch?v=uwS__WiOYTI&list=PLB2LZG9YIxN4&index=27' },
    { title: '10CM - Sleepless in Seoul (서울의 잠 못 이루는 밤)', url: 'https://www.youtube.com/watch?v=NjRY-727IiQ&list=RDNjRY-727IiQ&start_radio=1' },
    { title: 'IU - 비밀의 화원', url: 'https://www.youtube.com/watch?v=eGXJs7zOHC4&list=RDNjRY-727IiQ&index=2' }
];

const TOPICS = [
    { id: 'memory', label: '올 한해 있었던 기억에 남는 일', next: 'topicMemory1' },
    { id: 'daily', label: '요즘 사는 이야기', next: 'topicDaily1' },
    { id: 'philosophy', label: '철학적 논제', next: 'topicPhil1' },
    { id: 'achievement', label: '2026년 이룬 것', next: 'topicAchieve1' },
    { id: 'goal', label: '내년 목표', next: 'topicGoal1' }
];

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    return match ? match[1] : null;
}

let currentNodeId = 'l1';
let isTyping = false;
let typeTimer = null;
let playerName = '';
let messageAnswers = {};
let visitedTopics = new Set();

let dialogueBoxEl, dialogueTextEl, arrowEl, choicesEl, inputRowEl, nameInputEl, nameConfirmEl, characterEl;
let messageRowEl, messageInputEl, messageCounterEl, messageConfirmEl;
let playlistEl, playlistListEl, playerWrapEl, playerEl, nowPlayingEl;

function typeText(text, onDone) {
    isTyping = true;
    dialogueTextEl.textContent = '';
    arrowEl.classList.add('hidden');

    let i = 0;
    clearInterval(typeTimer);
    typeTimer = setInterval(() => {
        i++;
        dialogueTextEl.textContent = text.slice(0, i);
        if (i >= text.length) {
            clearInterval(typeTimer);
            isTyping = false;
            onDone();
        }
    }, TYPE_SPEED);
}

function skipTyping(text, onDone) {
    clearInterval(typeTimer);
    dialogueTextEl.textContent = text;
    isTyping = false;
    onDone();
}

function renderNode(id) {
    currentNodeId = id;
    const node = SCRIPT[id];

    choicesEl.classList.add('hidden');
    choicesEl.innerHTML = '';
    inputRowEl.classList.add('hidden');
    messageRowEl.classList.add('hidden');
    playlistEl.classList.add('hidden');
    arrowEl.classList.add('hidden');

    dialogueBoxEl.classList.toggle('is_motion', !!node.motion);
    characterEl.src = node.motion ? 'bar_character_2.png' : 'bar_character_1.png';

    typeText(node.text, () => onLineRevealed(node));
}

function onLineRevealed(node) {
    if (node.choices) {
        const choiceList = typeof node.choices === 'function' ? node.choices() : node.choices;
        showChoices(choiceList);
    } else if (node.input) {
        showNameInput();
    } else if (node.message) {
        showMessageInput();
    } else if (node.playlist) {
        showPlaylist();
    } else if (node.next) {
        arrowEl.classList.remove('hidden');
    }
}

function showChoices(choices) {
    choicesEl.innerHTML = '';
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'menu-link vn-choice-btn';
        btn.textContent = choice.label;
        btn.addEventListener('click', () => {
            if (choice.action === 'send') {
                sendMessageToOwner();
            }
            if (choice.drinkEmoji) {
                SCRIPT.l5.text = `여기 한잔 나왔어. ${choice.drinkEmoji}`;
            }
            renderNode(choice.next);
        });
        choicesEl.appendChild(btn);
    });
    choicesEl.classList.remove('hidden');
}

function showNameInput() {
    nameInputEl.value = '';
    inputRowEl.classList.remove('hidden');
    nameInputEl.focus();
}

function confirmName() {
    playerName = nameInputEl.value.trim();
    SCRIPT.l8.text = playerName ? `${playerName}, 환영해.` : '환영해.';
    inputRowEl.classList.add('hidden');
    const node = SCRIPT[currentNodeId];
    if (node.next) renderNode(node.next);
}

function showMessageInput() {
    const node = SCRIPT[currentNodeId];
    const maxLength = node.messageMaxLength || 100;
    messageInputEl.value = '';
    messageInputEl.maxLength = maxLength;
    messageCounterEl.textContent = `0/${maxLength}`;
    messageRowEl.classList.remove('hidden');
    messageInputEl.focus();
}

function confirmMessage() {
    const node = SCRIPT[currentNodeId];
    const text = messageInputEl.value.trim();

    if (node.messageKey) {
        messageAnswers[node.messageKey] = text;
    }
    if (node.topicId) {
        visitedTopics.add(node.topicId);
    }

    messageRowEl.classList.add('hidden');
    if (node.next) renderNode(node.next);
}

const MESSAGE_LABELS = {
    memory: '올 한해 있었던 기억에 남는 일',
    daily: '요즘 사는 이야기',
    philosophy: '철학적 논제 (사랑이란?)',
    achievement: '2026년 이룬 것',
    goal: '내년 목표',
    closing: '마지막으로 하고 싶은 말'
};

async function sendMessageToOwner() {
    const labeledAnswers = {};
    Object.keys(messageAnswers).forEach(key => {
        const label = MESSAGE_LABELS[key] || key;
        labeledAnswers[label] = messageAnswers[key] || '(빈 답변)';
    });

    try {
        await fetch('https://formsubmit.co/ajax/soypers@gmail.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                _subject: '숨바에서 온 메시지',
                name: playerName || '(이름 없음)',
                ...labeledAnswers
            })
        });
    } catch (e) {
        // 전송 실패해도 대화 흐름은 계속 진행
    }
}

function showPlaylist() {
    playlistListEl.innerHTML = '';
    playerWrapEl.classList.add('hidden');
    playerEl.src = '';

    PLAYLIST.forEach(song => {
        const li = document.createElement('li');

        const row = document.createElement('div');
        row.className = 'vn-playlist-item';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'vn-playlist-song-title';
        titleSpan.textContent = song.title;
        row.appendChild(titleSpan);

        const videoId = extractYouTubeId(song.url);
        if (videoId) {
            const playBtn = document.createElement('button');
            playBtn.type = 'button';
            playBtn.className = 'vn-play-btn';
            playBtn.textContent = '▶';
            playBtn.setAttribute('aria-label', `${song.title} 재생`);
            playBtn.addEventListener('click', () => playSong(videoId, row, song.title));
            row.appendChild(playBtn);
        }

        li.appendChild(row);
        playlistListEl.appendChild(li);
    });
    playlistEl.classList.remove('hidden');
}

function playSong(videoId, row, title) {
    playerEl.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    playerWrapEl.classList.remove('hidden');
    nowPlayingEl.textContent = `🎵 재생 중: ${title}`;
    playlistListEl.querySelectorAll('.vn-playlist-item.is_playing').forEach(el => el.classList.remove('is_playing'));
    row.classList.add('is_playing');
}

function advance() {
    const node = SCRIPT[currentNodeId];

    if (isTyping) {
        skipTyping(node.text, () => onLineRevealed(node));
        return;
    }

    // 선택지/입력/플레이리스트가 떠 있는 동안은 화면 클릭으로 넘어가지 않음
    if (!choicesEl.classList.contains('hidden')) return;
    if (!inputRowEl.classList.contains('hidden')) return;
    if (!messageRowEl.classList.contains('hidden')) return;
    if (!playlistEl.classList.contains('hidden')) return;

    if (node.next) {
        renderNode(node.next);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    dialogueBoxEl = document.getElementById('vn-dialogue-box');
    characterEl = document.getElementById('vn-character');
    dialogueTextEl = document.getElementById('vn-dialogue-text');
    arrowEl = document.getElementById('vn-continue-arrow');
    choicesEl = document.getElementById('vn-choices');
    inputRowEl = document.getElementById('vn-input-row');
    nameInputEl = document.getElementById('vn-name-input');
    nameConfirmEl = document.getElementById('vn-name-confirm');
    messageRowEl = document.getElementById('vn-message-row');
    messageInputEl = document.getElementById('vn-message-input');
    messageCounterEl = document.getElementById('vn-message-counter');
    messageConfirmEl = document.getElementById('vn-message-confirm');
    playlistEl = document.getElementById('vn-playlist');
    playlistListEl = document.getElementById('vn-playlist-list');
    playerWrapEl = document.getElementById('vn-player-wrap');
    playerEl = document.getElementById('vn-player');
    nowPlayingEl = document.getElementById('vn-now-playing');

    dialogueBoxEl.addEventListener('click', advance);
    nameConfirmEl.addEventListener('click', confirmName);
    nameInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmName();
    });
    messageConfirmEl.addEventListener('click', confirmMessage);
    messageInputEl.addEventListener('input', () => {
        messageCounterEl.textContent = `${messageInputEl.value.length}/${messageInputEl.maxLength}`;
    });

    renderNode(currentNodeId);
});
