// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAr7VRO7wfiQ37tPkLyV-pBxkLOgBw4L8Y",
    authDomain: "bingolator.firebaseapp.com",
    databaseURL: "https://bingolator-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "bingolator",
    storageBucket: "bingolator.firebasestorage.app",
    messagingSenderId: "971969513936",
    appId: "1:971969513936:web:7a8da25e240dd3fec651d5"
};

// Global State
let database = null;
let isHost = false;
let gameId = null;
let playerName = "";
let playerId = null;
let currentView = "lobby-view";
let currentGameData = null;
let playerState = {
    lives: 3,
    streak: 0,
    markedCount: 0,
    card: null
};

let html5QrScanner = null;

/**
 * Initialize Firebase & Core App
 */
function initApp() {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        database = firebase.database();
    }

    // Bind UI Events
    document.getElementById('btn-open-create-modal').onclick = () => showModal('create-game-modal');
    document.getElementById('btn-close-create-modal').onclick = () => hideModal('create-game-modal');
    document.getElementById('btn-create-confirm').onclick = createNewGame;
    document.getElementById('btn-enter').onclick = joinGameByCode;
    document.getElementById('btn-leave-lobby').onclick = confirmLeaveGame; // Show modal first
    document.getElementById('btn-confirm-leave').onclick = executeLeaveGame; // Action
    document.getElementById('btn-start-game').onclick = startGame;
    document.getElementById('btn-host-draw').onclick = hostDrawNext;
    
    // QR Modals
    document.getElementById('btn-show-qr-large').onclick = () => showModal('lobby-qr-modal');
    document.getElementById('btn-close-qr-large').onclick = () => hideModal('lobby-qr-modal');
    document.getElementById('btn-scan-qr').onclick = startQrScanner;
    document.getElementById('btn-close-qr').onclick = stopQrScanner;

    // Click Outside Modal to Close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && overlay.id !== 'leave-confirm-modal' && overlay.id !== 'host-left-modal') {
                hideModal(overlay.id);
                if (overlay.id === 'qr-modal') stopQrScanner();
            }
        });
    });

    // Check for auto-join URL
    const params = new URLSearchParams(window.location.search);
    if (params.has('join')) {
        const code = params.get('join').toUpperCase();
        document.getElementById('join-code').value = code;
        
        // Enter Quick Join Mode
        document.getElementById('lobby-view').classList.add('quick-join-mode');
        document.getElementById('btn-enter').textContent = `Beitreten`;
        document.getElementById('join-code').disabled = true;
        
        // UX: Focus name input
        setTimeout(() => document.getElementById('player-name').focus(), 100);
    }
}

/**
 * View & Modal Management
 */
function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    currentView = viewId;

    // Handle Back Button Visibility
    const backBtn = document.getElementById('numo-back-link');
    if (viewId === 'lobby-view') {
        backBtn.style.display = 'flex';
    } else {
        backBtn.style.display = 'none';
    }
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/**
 * QR Scanner Logic
 */
function startQrScanner() {
    showModal('qr-modal');
    html5QrScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            let code = decodedText;
            if (decodedText.includes('join=')) {
                try {
                    const url = new URL(decodedText);
                    code = url.searchParams.get('join');
                } catch (e) {
                    code = decodedText.split('join=')[1].split('&')[0];
                }
            }
            
            if (code) {
                stopQrScanner();
                // Redirect to self with join param
                window.location.search = `?join=${code}`;
            } else {
                alert("Ungültiger QR-Code");
            }
        },
        (errorMessage) => { /* ignore */ }
    ).catch(err => {
        console.error("Scanner error:", err);
        alert("Kamera konnte nicht gestartet werden.");
    });
}

function stopQrScanner() {
    if (html5QrScanner) {
        html5QrScanner.stop().then(() => {
            html5QrScanner.clear();
            hideModal('qr-modal');
        }).catch(err => console.error(err));
    } else {
        hideModal('qr-modal');
    }
}

/**
 * Host Logic: Create Game
 */
async function createNewGame() {
    isHost = true;
    playerName = document.getElementById('player-name').value || "Host";
    gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const settings = {
        opType: document.getElementById('opType').value,
        range: document.getElementById('range').value
    };

    const pool = generateProblemPool(settings);

    try {
        await database.ref('games/' + gameId).set({
            status: 'WAITING',
            hostName: playerName,
            settings: settings,
            pool: pool,
            players: {},
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        hideModal('create-game-modal');
        setupLobbyListener();
        switchView('waiting-room-view');
        updateLobbyUI();
    } catch (err) {
        console.error("Host error:", err);
        alert("Fehler beim Erstellen des Spiels: " + err.message);
    }
}

/**
 * Player Logic: Join Game
 */
async function joinGameByCode() {
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code.length !== 4) return alert("Code ungültig!");
    
    playerName = document.getElementById('player-name').value;
    if (!playerName) return alert("Bitte gib deinen Namen ein!");
    
    gameId = code;
    isHost = false;

    const snapshot = await database.ref('games/' + gameId).once('value');
    if (!snapshot.exists()) return alert("Spiel nicht gefunden!");

    // Add self to players
    const playerRef = database.ref('games/' + gameId + '/players').push();
    playerId = playerRef.key;
    await playerRef.set({ name: playerName });

    setupLobbyListener();
    switchView('waiting-room-view');
    updateLobbyUI();
}

/**
 * Shared Lobby Logic & Listeners
 */
function setupLobbyListener() {
    const gameRef = database.ref('games/' + gameId);
    
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        // 1. Check if Game was deleted (Host left)
        if (!data) {
            if (!isHost) {
                showModal('host-left-modal');
            }
            // If I am host, I just deleted it, so I am leaving anyway via redirect
            return;
        }
        
        currentGameData = data;

        // 2. Check if I was kicked (Player only)
        if (!isHost && playerId) {
            if (!data.players || !data.players[playerId]) {
                alert("Du wurdest aus der Lobby entfernt.");
                location.reload();
                return;
            }
        }

        // 3. Sync Player List
        const players = data.players || {};
        updatePlayerList(players);

        // 4. Toggle "Waiting for players" text
        const playerCount = Object.keys(players).length;
        const statusText = document.getElementById('lobby-status-text');
        if (playerCount > 0) {
            statusText.style.display = 'none';
        } else {
            statusText.style.display = 'block';
        }

        // 5. Game Start Transition
        if (data.status === 'PLAYING' && currentView !== 'game-view') {
            initGameScreen(data);
        }

        // 6. Host Draws
        if (data.currentProblem) {
            updateProblemDisplay(data.currentProblem);
        }
    });
}

function updatePlayerList(players) {
    const list = document.getElementById('lobby-player-slots');
    list.innerHTML = '';
    
    Object.entries(players).forEach(([pid, p]) => {
        const card = document.createElement('div');
        card.className = 'player-card-dynamic';
        
        // Avatar + Name
        let html = `<div class="avatar">${p.name[0].toUpperCase()}</div><div class="name">${p.name}</div>`;
        
        // Host: Add Kick Button
        if (isHost && pid !== 'HOST') { // Assuming host isn't in players list usually, but if so, protect self
             html += `<button class="btn-kick-player" onclick="kickPlayer('${pid}')" title="Spieler entfernen">×</button>`;
        }
        
        card.innerHTML = html;
        list.appendChild(card);
    });

    if (isHost) {
        document.getElementById('btn-start-game').classList.remove('hidden');
    }
}

function updateLobbyUI() {
    document.getElementById('lobby-code-display').textContent = gameId;
    document.getElementById('qr-modal-code').textContent = gameId;
    
    const joinUrl = window.location.origin + window.location.pathname + "?join=" + gameId;
    const qr = qrcode(0, 'M');
    qr.addData(joinUrl);
    qr.make();
    document.getElementById('lobby-qr-large-container').innerHTML = qr.createImgTag(8);
}

/**
 * Host Management Actions
 */
function kickPlayer(pid) {
    if (confirm("Spieler wirklich entfernen?")) {
        database.ref('games/' + gameId + '/players/' + pid).remove();
    }
}

// Make global so onclick works
window.kickPlayer = kickPlayer;

function confirmLeaveGame() {
    showModal('leave-confirm-modal');
}

async function executeLeaveGame() {
    if (isHost) {
        // Host: Delete Game
        await database.ref('games/' + gameId).remove();
    } else if (playerId) {
        // Player: Remove self
        await database.ref('games/' + gameId + '/players/' + playerId).remove();
    }
    
    // Redirect
    window.location.href = window.location.pathname;
}

/**
 * Game Progression
 */
async function startGame() {
    if (!isHost) return;
    await database.ref('games/' + gameId).update({ status: 'PLAYING' });
    hostDrawNext();
}

function initGameScreen(data) {
    switchView('game-view');
    if (isHost) {
        document.getElementById('host-dashboard').classList.remove('hidden');
    } else {
        playerState.card = generateLottoCard(data.pool);
        renderBingoCard(playerState.card);
    }
}

/**
 * Host: Drawing Logic
 */
async function hostDrawNext() {
    const available = currentGameData.pool.filter(p => !p.drawn);
    if (available.length === 0) return alert("Alle Zahlen gezogen!");

    const problem = available[Math.floor(Math.random() * available.length)];
    problem.drawn = true;
    problem.id = Date.now();

    const history = currentGameData.history || [];
    history.push(problem);

    await database.ref('games/' + gameId).update({
        currentProblem: problem,
        history: history,
        pool: currentGameData.pool
    });

    document.getElementById('host-current-result').textContent = problem.result;
    document.getElementById('host-current-term').textContent = problem.term;
}

/**
 * Player: Bingo Logic
 */
function renderBingoCard(card) {
    const grid = document.getElementById('bingoCard');
    grid.innerHTML = '';
    card.forEach((row, r) => {
        row.forEach((val, c) => {
            const cell = document.createElement('div');
            cell.className = 'bingo-cell' + (val === null ? ' empty' : '');
            if (val !== null) {
                cell.textContent = val;
                cell.onclick = () => handleCellClick(val, cell);
            }
            grid.appendChild(cell);
        });
    });
}

function handleCellClick(value, cell) {
    if (!currentGameData.currentProblem || cell.classList.contains('marked')) return;
    if (value === currentGameData.currentProblem.result) {
        cell.classList.add('marked');
        playerState.markedCount++;
        if (playerState.markedCount === 15) document.getElementById('winOverlay').classList.remove('hidden');
    } else {
        cell.classList.add('error-shake');
        setTimeout(() => cell.classList.remove('error-shake'), 500);
        
        // Remove Life Logic (Client Side Only for now)
        if (playerState.lives > 0) {
            playerState.lives--;
            updatePlayerHearts();
            if (playerState.lives === 0) {
                document.getElementById('gameOverOverlay').classList.remove('hidden');
            }
        }
    }
}

function updateProblemDisplay(problem) {
    document.getElementById('currentTermDisplay').textContent = problem.term;
}

function updatePlayerHearts() {
    const container = document.getElementById('heartsContainer');
    let html = '';
    for(let i=0; i<3; i++) {
        html += i < playerState.lives ? '❤' : '<span style="opacity:0.3">❤</span>';
    }
    container.innerHTML = html;
}

/**
 * Helpers (Generators)
 */
function generateProblemPool(settings) {
    const pool = [];
    const seen = new Set();
    const max = settings.range === '1x1' ? 10 : parseInt(settings.range);
    
    while (pool.length < 60) {
        let a, b, op, res, term;
        const ops = settings.opType === 'mixed' ? ['+','-','*','/'] : [settings.opType.replace('add','+').replace('sub','-').replace('mul','*').replace('div','/')];
        op = ops[Math.floor(Math.random() * ops.length)];

        if (settings.range === '1x1') { a=rand(1,10); b=rand(1,10); op='*'; } 
        else if (op==='+') { a=rand(1,max-5); b=rand(1,max-a); }
        else if (op==='-') { a=rand(5,max); b=rand(1,a); }
        else if (op==='*') { a=rand(1,10); b=rand(1,max/a); }
        else { b=rand(2,10); res=rand(1,max/2); a=b*res; }

        res = op==='+'?a+b : op==='-'?a-b : op==='*'?a*b : a/b;
        term = `${a} ${op.replace('*','×').replace('/','÷')} ${b}`;
        
        if (res > 0 && !seen.has(res)) {
            seen.add(res);
            pool.push({ term, result: res, drawn: false });
        }
    }
    return pool;
}

function generateLottoCard(pool) {
    const selected = pool.map(p => p.result).sort(() => 0.5 - Math.random()).slice(0, 15).sort((a,b) => a-b);
    const card = [Array(9).fill(null), Array(9).fill(null), Array(9).fill(null)];
    const cols = Array.from({length:9}, () => []);
    selected.forEach(n => { let c = Math.min(Math.floor(n/10), 8); cols[c].push(n); });
    
    cols.forEach((nums, c) => {
        nums.forEach(n => {
            const r = [0,1,2].sort(() => 0.5-Math.random()).find(row => card[row].filter(v=>v!==null).length < 5 && card[row][c]===null);
            if (r !== undefined) card[r][c] = n;
        });
    });
    return card;
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Entry
document.addEventListener('DOMContentLoaded', initApp);
