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

    l10: { text: '올 한해도 고생많았어. 힘든일도 소소한 행복한일도..여러가지 일을 겪어왔겠구나.', next: 'l11' },
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
    l17: { text: '어떤 형태로든 앞으로도 좋은 친구, 가족, 지인 또는 소중한 사람으로 함께할 수 있기를 바래.', next: 'l18' },
    l18: { text: '마지막으로 나한테 하고 싶은말 있어?', next: 'l19' },
    l19: {
        text: '딱히 저장되는건 아니니까 자유롭게 남겨도 좋아.',
        message: true,
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

function extractYouTubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    return match ? match[1] : null;
}

let currentNodeId = 'l1';
let isTyping = false;
let typeTimer = null;
let playerName = '';
let visitorMessage = '';

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
        showChoices(node.choices);
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
    messageInputEl.value = '';
    messageCounterEl.textContent = '0/100';
    messageRowEl.classList.remove('hidden');
    messageInputEl.focus();
}

function confirmMessage() {
    visitorMessage = messageInputEl.value.trim();
    messageRowEl.classList.add('hidden');
    const node = SCRIPT[currentNodeId];
    if (node.next) renderNode(node.next);
}

async function sendMessageToOwner() {
    try {
        await fetch('https://formsubmit.co/ajax/soypers@gmail.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                _subject: '숨바에서 온 메시지',
                name: playerName || '(이름 없음)',
                message: visitorMessage || '(빈 메시지)'
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
        messageCounterEl.textContent = `${messageInputEl.value.length}/100`;
    });

    renderNode(currentNodeId);
});
