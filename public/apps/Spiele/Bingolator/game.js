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
let playerToKickId = null; // Temp storage for kick modal
let playerState = {
    lives: 3,
    streak: 0,
    markedCount: 0,
    card: null
};

let html5QrScanner = null;

// --- Helper Functions ---

function leaveGame() {
    window.location.href = window.location.pathname; 
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    currentView = viewId;

    const backBtn = document.getElementById('numo-back-link');
    if (viewId === 'lobby-view' && !document.body.classList.contains('quick-join-active')) {
        backBtn.style.display = 'flex';
    } else {
        backBtn.style.display = 'none';
    }
}

// --- Persistence & PWA Logic ---

function saveSession() {
    if (!gameId || !playerName) return;
    const session = {
        gameId,
        playerName,
        playerId,
        isHost,
        currentView,
        card: playerState.card,
        markedCount: playerState.markedCount,
        lives: playerState.lives,
        lastActive: Date.now()
    };
    localStorage.setItem('bingolator_session', JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem('bingolator_session');
}

function checkSession() {
    const sessionStr = localStorage.getItem('bingolator_session');
    if (!sessionStr) return false;

    try {
        const session = JSON.parse(sessionStr);
        // 5 minute timeout
        if (Date.now() - session.lastActive > 5 * 60 * 1000) {
            console.log("Session expired");
            clearSession();
            return false;
        }

        // Restore state
        gameId = session.gameId;
        playerName = session.playerName;
        playerId = session.playerId;
        isHost = session.isHost;
        
        console.log("Restoring session:", session);
        
        // Re-connect to game
        setupLobbyListener();
        
        return true;
    } catch (e) {
        console.error("Session restore error", e);
        clearSession();
        return false;
    }
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('btn-trigger-install');
    if (installBtn) installBtn.style.display = 'block';
});

function showInstallModal() {
    const modal = document.getElementById('pwa-install-modal');
    modal.classList.add('active');

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/i.test(ua);

    document.getElementById('inst-ios').style.display = isIOS ? 'block' : 'none';
    document.getElementById('inst-android').style.display = isAndroid ? 'block' : 'none';
    document.getElementById('inst-desktop').style.display = (!isIOS && !isAndroid) ? 'block' : 'none';

    const nativeBtn = document.getElementById('btn-native-install');
    if (deferredPrompt) {
        nativeBtn.style.display = 'block';
        nativeBtn.onclick = async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted install');
                modal.classList.remove('active');
            }
            deferredPrompt = null;
        };
    }
}

/**
 * Initialize Firebase & Core App
 */
function initApp() {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
        database = firebase.database();
    }

    // Restore Name
    const savedName = localStorage.getItem('bingolator_player_name');
    if (savedName) {
        document.getElementById('player-name').value = savedName;
        playerName = savedName;
    }

    // Restore Settings
    const savedSettings = localStorage.getItem('bingolator_settings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings.opType) document.getElementById('opType').value = settings.opType;
            if (settings.range) document.getElementById('range').value = settings.range;
        } catch(e) { console.error("Error loading settings", e); }
    }

    // Bind UI Events
    document.getElementById('btn-open-create-modal').onclick = () => showModal('create-game-modal');
    document.getElementById('btn-close-create-modal').onclick = () => hideModal('create-game-modal');
    document.getElementById('btn-create-confirm').onclick = createNewGame;
    document.getElementById('btn-enter').onclick = joinGameByCode;
    
    // PWA Events
    document.getElementById('btn-trigger-install').onclick = showInstallModal;
    document.getElementById('btn-close-install').onclick = () => hideModal('pwa-install-modal');

    // Leave Game bindings
    document.getElementById('btn-leave-lobby').onclick = confirmLeaveGame; 
    document.getElementById('btn-confirm-leave').onclick = executeLeaveGame; 
    
    // Kick Bindings
    document.getElementById('btn-confirm-kick').onclick = executeKickPlayer;

    const btnQuickBack = document.getElementById('btn-quick-back');
    if(btnQuickBack) btnQuickBack.onclick = leaveGame;

    document.getElementById('btn-start-game').onclick = startGame;
    document.getElementById('btn-host-draw').onclick = hostDrawNext;
    
    document.getElementById('btn-show-qr-large').onclick = () => showModal('lobby-qr-modal');
    document.getElementById('btn-close-qr-large').onclick = () => hideModal('lobby-qr-modal');
    document.getElementById('btn-scan-qr').onclick = startQrScanner;
    document.getElementById('btn-close-qr').onclick = stopQrScanner;

    // Click Outside Modal to Close (Safe Modals)
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            // List of modals that should NOT close on outside click (forcing a choice)
            const persistentModals = ['leave-confirm-modal', 'host-left-modal', 'kick-confirm-modal', 'player-kicked-modal'];
            
            if (e.target === overlay && !persistentModals.includes(overlay.id)) {
                hideModal(overlay.id);
                if (overlay.id === 'qr-modal') stopQrScanner();
            }
        });
    });

    const params = new URLSearchParams(window.location.search);
    if (params.has('join')) {
        const code = params.get('join').toUpperCase();
        document.getElementById('join-code').value = code;
        document.body.classList.add('quick-join-active'); 
        const lobbyView = document.getElementById('lobby-view');
        lobbyView.classList.add('quick-join-mode');
        document.getElementById('btn-enter').textContent = `Beitreten`;
        document.getElementById('join-code').disabled = true;
        setTimeout(() => document.getElementById('player-name').focus(), 100);
    } else {
        // Only check session if not joining a new game via link
        checkSession();
    }

    // Auto-save session on hide
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveSession();
    });
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
            let code = null;
            if (decodedText.includes('join=')) {
                try {
                    const url = new URL(decodedText);
                    code = url.searchParams.get('join');
                } catch (e) {
                    const parts = decodedText.split('join=');
                    if(parts.length > 1) code = parts[1].split('&')[0];
                }
            } else {
                if(decodedText.trim().length === 4) code = decodedText.trim();
            }
            
            if (code) {
                stopQrScanner();
                window.location.href = window.location.pathname + `?join=${code}`;
            } else {
                alert("Ungültiger QR-Code");
            }
        },
        (errorMessage) => { /* ignore */ }
    ).catch(err => {
        console.error("Scanner error:", err);
        alert("Kamerafehler.");
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
    clearSession();
    isHost = true;
    playerName = document.getElementById('player-name').value || "Host";
    localStorage.setItem('bingolator_player_name', playerName);
    gameId = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const settings = {
        opType: document.getElementById('opType').value,
        range: document.getElementById('range').value
    };
    localStorage.setItem('bingolator_settings', JSON.stringify(settings));

    const pool = generateProblemPool(settings);

    try {
        const gameRef = database.ref('games/' + gameId);
        await gameRef.set({
            status: 'WAITING',
            hostName: playerName,
            settings: settings,
            pool: pool,
            players: {},
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Auto-cleanup if Host disconnects
        gameRef.onDisconnect().remove();

        hideModal('create-game-modal');
        setupLobbyListener();
        switchView('waiting-room-view');
        updateLobbyUI();
        saveSession();
    } catch (err) {
        console.error("Host error:", err);
        alert("Fehler: " + err.message);
    }
}

/**
 * Player Logic: Join Game
 */
async function joinGameByCode() {
    clearSession();
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code.length !== 4) return alert("Code ungültig!");
    
    playerName = document.getElementById('player-name').value;
    if (!playerName) return alert("Bitte gib deinen Namen ein!");
    localStorage.setItem('bingolator_player_name', playerName);
    
    gameId = code;
    isHost = false;

    const snapshot = await database.ref('games/' + gameId).once('value');
    if (!snapshot.exists()) return alert("Spiel nicht gefunden!");

    const playerRef = database.ref('games/' + gameId + '/players').push();
    playerId = playerRef.key;
    await playerRef.set({ name: playerName });

    setupLobbyListener();
    switchView('waiting-room-view');
    updateLobbyUI();
    saveSession();
}

/**
 * Shared Lobby Logic & Listeners
 */
function setupLobbyListener() {
    const gameRef = database.ref('games/' + gameId);
    
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        // 1. Host Left
        if (!data) {
            if (!isHost && currentView !== 'lobby-view') {
                showModal('host-left-modal');
                clearSession();
            }
            return;
        }
        
        currentGameData = data;

        // 2. Player Kicked
        if (!isHost && playerId) {
            if (!data.players || !data.players[playerId]) {
                showModal('player-kicked-modal');
                // Remove listener to prevent further updates
                gameRef.off(); 
                clearSession();
                return;
            }
        }

        const players = data.players || {};
        updatePlayerList(players);

        const statusText = document.getElementById('lobby-status-text');
        if (statusText) {
            statusText.style.display = Object.keys(players).length > 0 ? 'none' : 'block';
        }

        if (data.status === 'PLAYING' && currentView !== 'game-view') {
            initGameScreen(data);
        }

        if (data.status === 'WAITING' && currentView === 'lobby-view') {
            switchView('waiting-room-view');
            updateLobbyUI();
        }

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
        let html = `<div class="avatar">${p.name[0].toUpperCase()}</div><div class="name">${p.name}</div>`;
        
        if (isHost) { 
             html += `<button class="btn-kick-player" onclick="openKickModal('${pid}')" title="Spieler entfernen">×</button>`;
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
    
    const baseUrl = window.location.href.split('?')[0];
    const joinUrl = `${baseUrl}?join=${gameId}`;
    
    const qr = qrcode(0, 'M');
    qr.addData(joinUrl);
    qr.make();
    document.getElementById('lobby-qr-large-container').innerHTML = qr.createImgTag(8);
}

/**
 * Host Management Actions
 */
function openKickModal(pid) {
    playerToKickId = pid;
    showModal('kick-confirm-modal');
}
window.openKickModal = openKickModal; // Make global for HTML

function executeKickPlayer() {
    if (playerToKickId && isHost) {
        database.ref('games/' + gameId + '/players/' + playerToKickId).remove();
        playerToKickId = null;
    }
    hideModal('kick-confirm-modal');
}

function confirmLeaveGame() {
    showModal('leave-confirm-modal');
}

async function executeLeaveGame() {
    hideModal('leave-confirm-modal');
    if (isHost) {
        await database.ref('games/' + gameId).remove();
    } else if (playerId) {
        await database.ref('games/' + gameId + '/players/' + playerId).remove();
    }
    clearSession();
    leaveGame();
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
        // Restore card if available in session
        const sessionStr = localStorage.getItem('bingolator_session');
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            if (session.card) {
                playerState.card = session.card;
                playerState.markedCount = session.markedCount || 0;
                playerState.lives = session.lives !== undefined ? session.lives : 3;
            }
        }

        if (!playerState.card) {
            playerState.card = generateLottoCard(data.pool);
            playerState.markedCount = 0;
            playerState.lives = 3;
        }

        renderBingoCard(playerState.card);
        updatePlayerHearts();
        
        // Re-apply marks if any
        if (playerState.markedCount > 0) {
            const cells = document.querySelectorAll('.bingo-cell');
            // We don't know which ones were marked exactly unless we store indices.
            // Let's improve card storage to include 'marked' property in cells.
        }
    }
}

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

function renderBingoCard(card) {
    const grid = document.getElementById('bingoCard');
    grid.innerHTML = '';
    card.forEach((row, r) => {
        row.forEach((cellData, c) => {
            const val = typeof cellData === 'object' && cellData !== null ? cellData.val : cellData;
            const isMarked = typeof cellData === 'object' && cellData !== null ? cellData.marked : false;

            const cell = document.createElement('div');
            cell.className = 'bingo-cell' + (val === null ? ' empty' : '') + (isMarked ? ' marked' : '');
            if (val !== null) {
                cell.textContent = val;
                cell.onclick = () => handleCellClick(val, cell, r, c);
            }
            grid.appendChild(cell);
        });
    });
}

function handleCellClick(value, cell, r, c) {
    if (!currentGameData.currentProblem || cell.classList.contains('marked')) return;
    if (value === currentGameData.currentProblem.result) {
        cell.classList.add('marked');
        playerState.markedCount++;
        
        // Update card data for persistence
        if (typeof playerState.card[r][c] === 'number') {
            playerState.card[r][c] = { val: value, marked: true };
        } else {
            playerState.card[r][c].marked = true;
        }
        saveSession();

        if (playerState.markedCount === 15) document.getElementById('winOverlay').classList.remove('hidden');
    } else {
        cell.classList.add('error-shake');
        setTimeout(() => cell.classList.remove('error-shake'), 500);
        
        if (playerState.lives > 0) {
            playerState.lives--;
            updatePlayerHearts();
            saveSession();
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

document.addEventListener('DOMContentLoaded', initApp);
