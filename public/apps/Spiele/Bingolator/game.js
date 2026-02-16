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
let isLeaving = false; // Flag to prevent 'kicked' modal during voluntary exit

let html5QrScanner = null;

// --- Helper Functions ---

function leaveGame() {
    isLeaving = true;
    window.location.href = window.location.pathname; 
}

function showModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
}

function hideModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');
    currentView = viewId;

    const backBtn = document.getElementById('numo-back-link');
    if (viewId === 'lobby-view' && !document.body.classList.contains('quick-join-active')) {
        if (backBtn) backBtn.style.display = 'flex';
    } else {
        if (backBtn) backBtn.style.display = 'none';
    }
}

// --- Persistence & PWA Logic ---

function saveSession() {
    if (!gameId || !playerName || isLeaving) return;
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
    playerState = {
        lives: 3,
        streak: 0,
        markedCount: 0,
        card: null
    };
}

function checkSession() {
    const sessionStr = localStorage.getItem('bingolator_session');
    if (!sessionStr) return false;

    try {
        const session = JSON.parse(sessionStr);
        // 5 minute timeout
        if (Date.now() - session.lastActive > 5 * 60 * 1000) {
            clearSession();
            return false;
        }

        // Restore state
        gameId = session.gameId;
        playerName = session.playerName;
        playerId = session.playerId;
        isHost = session.isHost;
        playerState.card = session.card;
        playerState.markedCount = session.markedCount || 0;
        playerState.lives = session.lives !== undefined ? session.lives : 3;
        
        console.log("Restoring session:", gameId);
        
        // Ensure UI is ready
        bindEvents();

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
    if (!modal) return;
    modal.classList.add('active');

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/i.test(ua);

    document.getElementById('inst-ios').style.display = isIOS ? 'block' : 'none';
    document.getElementById('inst-android').style.display = isAndroid ? 'block' : 'none';
    document.getElementById('inst-desktop').style.display = (!isIOS && !isAndroid) ? 'block' : 'none';

    const nativeBtn = document.getElementById('btn-native-install');
    if (deferredPrompt && nativeBtn) {
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
        const pNameInput = document.getElementById('player-name');
        if (pNameInput) pNameInput.value = savedName;
        playerName = savedName;
    }

    // Restore Settings
    const savedSettings = localStorage.getItem('bingolator_settings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings.opType) {
                const opEl = document.getElementById('opType');
                if (opEl) opEl.value = settings.opType;
            }
            if (settings.range) {
                const rangeEl = document.getElementById('range');
                if (rangeEl) rangeEl.value = settings.range;
            }
        } catch(e) { console.error("Error loading settings", e); }
    }

    // Check for active session
    if (checkSession()) return;

    // Bind UI Events
    bindEvents();

    const params = new URLSearchParams(window.location.search);
    if (params.has('join')) {
        const code = params.get('join').toUpperCase();
        const joinCodeInput = document.getElementById('join-code');
        if (joinCodeInput) {
            joinCodeInput.value = code;
            joinCodeInput.disabled = true;
        }
        document.body.classList.add('quick-join-active'); 
        const lobbyView = document.getElementById('lobby-view');
        if (lobbyView) lobbyView.classList.add('quick-join-mode');
        
        const btnEnter = document.getElementById('btn-enter');
        if (btnEnter) btnEnter.textContent = `Beitreten`;
        
        setTimeout(() => {
            const pNameInput = document.getElementById('player-name');
            if (pNameInput) pNameInput.focus();
        }, 100);
    }
}

function bindEvents() {
    const btnOpenCreate = document.getElementById('btn-open-create-modal');
    if (btnOpenCreate) btnOpenCreate.onclick = () => showModal('create-game-modal');
    
    const btnCloseCreate = document.getElementById('btn-close-create-modal');
    if (btnCloseCreate) btnCloseCreate.onclick = () => hideModal('create-game-modal');
    
    const btnConfirmCreate = document.getElementById('btn-create-confirm');
    if (btnConfirmCreate) btnConfirmCreate.onclick = createNewGame;
    
    const btnEnter = document.getElementById('btn-enter');
    if (btnEnter) btnEnter.onclick = joinGameByCode;
    
    const btnTriggerInstall = document.getElementById('btn-trigger-install');
    if (btnTriggerInstall) btnTriggerInstall.onclick = showInstallModal;
    
    const btnCloseInstall = document.getElementById('btn-close-install');
    if (btnCloseInstall) btnCloseInstall.onclick = () => hideModal('pwa-install-modal');

    const btnLeaveLobby = document.getElementById('btn-leave-lobby');
    if (btnLeaveLobby) btnLeaveLobby.onclick = confirmLeaveGame; 
    
    const btnConfirmLeave = document.getElementById('btn-confirm-leave');
    if (btnConfirmLeave) btnConfirmLeave.onclick = executeLeaveGame; 
    
    const btnConfirmKick = document.getElementById('btn-confirm-kick');
    if (btnConfirmKick) btnConfirmKick.onclick = executeKickPlayer;

    const btnQuickBack = document.getElementById('btn-quick-back');
    if(btnQuickBack) btnQuickBack.onclick = leaveGame;

    const btnStartGame = document.getElementById('btn-start-game');
    if (btnStartGame) btnStartGame.onclick = startGame;
    
    const btnHostDraw = document.getElementById('btn-host-draw');
    if (btnHostDraw) btnHostDraw.onclick = hostDrawNext;
    
    const btnShowQr = document.getElementById('btn-show-qr-large');
    if (btnShowQr) btnShowQr.onclick = () => showModal('lobby-qr-modal');
    
    const btnCloseQrLarge = document.getElementById('btn-close-qr-large');
    if (btnCloseQrLarge) btnCloseQrLarge.onclick = () => hideModal('lobby-qr-modal');
    
    const btnScanQr = document.getElementById('btn-scan-qr');
    if (btnScanQr) btnScanQr.onclick = startQrScanner;
    
    const btnCloseQr = document.getElementById('btn-close-qr');
    if (btnCloseQr) btnCloseQr.onclick = stopQrScanner;

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.onclick = (e) => {
            const persistentModals = ['leave-confirm-modal', 'host-left-modal', 'kick-confirm-modal', 'player-kicked-modal'];
            if (e.target === overlay && !persistentModals.includes(overlay.id)) {
                hideModal(overlay.id);
                if (overlay.id === 'qr-modal') stopQrScanner();
            }
        };
    });

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
    const nameInput = document.getElementById('player-name');
    playerName = (nameInput ? nameInput.value : "") || "Host";
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
    const joinInput = document.getElementById('join-code');
    const code = (joinInput ? joinInput.value : "").trim().toUpperCase();
    if (code.length !== 4) return alert("Code ungültig!");
    
    const nameInput = document.getElementById('player-name');
    playerName = nameInput ? nameInput.value : "";
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
        if (isLeaving) return;

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
        if (!isHost && playerId && !isLeaving) {
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

        updateProblemDisplay(data.currentProblem);
    });
}

function updatePlayerList(players) {
    const list = document.getElementById('lobby-player-slots');
    if (!list) return;
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
        const btnStart = document.getElementById('btn-start-game');
        if (btnStart) btnStart.classList.remove('hidden');
    }
}

function updateLobbyUI() {
    const lobbyCodeDisplay = document.getElementById('lobby-code-display');
    if (lobbyCodeDisplay) lobbyCodeDisplay.textContent = gameId;
    
    const qrModalCode = document.getElementById('qr-modal-code');
    if (qrModalCode) qrModalCode.textContent = gameId;
    
    const baseUrl = window.location.href.split('?')[0];
    const joinUrl = `${baseUrl}?join=${gameId}`;
    
    const qr = qrcode(0, 'M');
    qr.addData(joinUrl);
    qr.make();
    const qrContainer = document.getElementById('lobby-qr-large-container');
    if (qrContainer) qrContainer.innerHTML = qr.createImgTag(8);
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
    isLeaving = true;
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
    // Don't draw immediately, let the host click the button
    await database.ref('games/' + gameId).update({ 
        status: 'PLAYING',
        currentProblem: null,
        history: [] 
    });
}

function initGameScreen(data) {
    switchView('game-view');
    if (isHost) {
        const hostDashboard = document.getElementById('host-dashboard');
        if (hostDashboard) hostDashboard.classList.remove('hidden');
        
        const resEl = document.getElementById('host-current-result');
        if (resEl) {
            resEl.textContent = "Bereit?";
            resEl.className = 'huge-term-display ready-state';
        }
        
        const termEl = document.getElementById('host-current-term');
        if (termEl) termEl.textContent = "Klicke 'Zahl ziehen'";
    } else {
        // Player setup
        const sessionStr = localStorage.getItem('bingolator_session');
        let session = null;
        if (sessionStr) {
            try {
                session = JSON.parse(sessionStr);
            } catch(e) {}
        }

        // Only restore if it's the SAME game
        if (session && session.card && session.gameId === gameId) {
            playerState.card = session.card;
            playerState.markedCount = session.markedCount || 0;
            playerState.lives = session.lives !== undefined ? session.lives : 3;
        } else {
            // New Game: Explicitly reset state
            playerState.lives = 3;
            playerState.markedCount = 0;
            playerState.card = generateLottoCard(data.pool);
            saveSession();
        }

        renderBingoCard(playerState.card);
        updatePlayerHearts();
        
        // Hide overlays
        const goOverlay = document.getElementById('gameOverOverlay');
        if (goOverlay) goOverlay.classList.add('hidden');
        const winOverlay = document.getElementById('winOverlay');
        if (winOverlay) winOverlay.classList.add('hidden');
    }
}

async function hostDrawNext() {
    const available = currentGameData.pool.filter(p => !p.drawn);
    if (available.length === 0) return alert("Alle Zahlen gezogen!");

    const problem = available[Math.floor(Math.random() * available.length)];
    const poolIndex = currentGameData.pool.findIndex(p => p.term === problem.term);
    currentGameData.pool[poolIndex].drawn = true;
    
    problem.id = Date.now();

    const history = currentGameData.history || [];
    history.push(problem);

    await database.ref('games/' + gameId).update({
        currentProblem: problem,
        history: history,
        pool: currentGameData.pool
    });

    updateHostDrawDisplay(problem, history);
}

function updateHostDrawDisplay(problem, history) {
    const resEl = document.getElementById('host-current-result');
    const termEl = document.getElementById('host-current-term');
    
    if (resEl) {
        resEl.textContent = problem.term;
        resEl.className = 'huge-term-display';
    }
    if (termEl) termEl.textContent = "Aktuelle Aufgabe:";

    const historyEl = document.getElementById('host-history');
    if (historyEl) {
        historyEl.innerHTML = '';
        [...history].reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `<span class="h-term-only">${item.term}</span>`;
            historyEl.appendChild(div);
        });
    }
}

function renderBingoCard(card) {
    const grid = document.getElementById('bingoCard');
    if (!grid) return;
    grid.innerHTML = '';
    card.forEach((row, r) => {
        row.forEach((cellData, c) => {
            let val = null;
            let isMarked = false;

            if (cellData !== null) {
                if (typeof cellData === 'object') {
                    val = cellData.val;
                    isMarked = cellData.marked;
                } else {
                    val = cellData;
                }
            }

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
    if (playerState.lives <= 0) return;
    if (!currentGameData || !currentGameData.currentProblem || cell.classList.contains('marked')) return;
    
    if (value === currentGameData.currentProblem.result) {
        cell.classList.add('marked');
        playerState.markedCount++;
        playerState.card[r][c] = { val: value, marked: true };
        saveSession();

        if (playerState.markedCount === 15) {
            const winOverlay = document.getElementById('winOverlay');
            if (winOverlay) winOverlay.classList.remove('hidden');
        }
    } else {
        cell.classList.add('error-shake');
        setTimeout(() => cell.classList.remove('error-shake'), 500);
        
        playerState.lives--;
        updatePlayerHearts();
        saveSession();
        
        if (playerState.lives === 0) {
            const gameOverOverlay = document.getElementById('gameOverOverlay');
            if (gameOverOverlay) gameOverOverlay.classList.remove('hidden');
        }
    }
}

function updateProblemDisplay(problem) {
    const display = document.getElementById('currentTermDisplay');
    if (display) {
        display.textContent = problem ? problem.term : "Warte auf Host...";
    }
}

function updatePlayerHearts() {
    const container = document.getElementById('heartsContainer');
    if (!container) return;
    let html = '';
    for(let i=0; i<3; i++) {
        html += i < playerState.lives ? '❤' : '<span style="opacity:0.3">❤</span>';
    }
    container.innerHTML = html;
}

function generateProblemPool(settings) {
    const pool = [];
    const seenResults = new Set();
    const max = settings.range === '1x1' ? 10 : parseInt(settings.range);
    
    while (pool.length < 80) {
        let a, b, op, res, term;
        const ops = settings.opType === 'mixed' ? ['+','-','*','/'] : [settings.opType.replace('add','+').replace('sub','-').replace('mul','*').replace('div','/')];
        op = ops[Math.floor(Math.random() * ops.length)];

        if (settings.range === '1x1') { 
            a=rand(1,10); b=rand(1,10); op='*'; 
        } else if (op==='+') { 
            a=rand(1,max-5); b=rand(1,max-a); 
        } else if (op==='-') { 
            a=rand(5,max); b=rand(1,a); 
        } else if (op==='*') { 
            a=rand(1,10); b=rand(1, Math.floor(max/a) || 1); 
        } else { 
            b=rand(2,10); res=rand(1, Math.floor(max/b) || 1); a=b*res; 
        }

        res = op==='+'?a+b : op==='-'?a-b : op==='*'?a*b : a/b;
        term = `${a} ${op.replace('*','×').replace('/','÷')} ${b}`;
        
        if (res > 0 && !seenResults.has(res)) {
            seenResults.add(res);
            pool.push({ term, result: res, drawn: false });
        }
    }
    return pool;
}

function generateLottoCard(pool) {
    const allResults = pool.map(p => p.result);
    const columnBins = Array.from({ length: 9 }, () => []);
    
    allResults.forEach(res => {
        let col = Math.floor(res / 10);
        if (col > 8) col = 8;
        columnBins[col].push(res);
    });
    columnBins.forEach(bin => bin.sort(() => Math.random() - 0.5));

    let card;
    let valid = false;
    let attempts = 0;

    // Check for "Zerstreuung": max 2 adjacent empty cells in a row
    function isWellDispersed(row) {
        let currentEmpty = 0;
        for (let cell of row) {
            if (cell === null) {
                currentEmpty++;
                if (currentEmpty > 2) return false;
            } else {
                currentEmpty = 0;
            }
        }
        return true;
    }

    while (!valid && attempts < 2000) {
        attempts++;
        card = Array.from({ length: 3 }, () => Array(9).fill(null));
        let rowCounts = [0, 0, 0];
        let colCounts = Array(9).fill(0);

        // 1. Mandatory: Each column must have 1-2 numbers for perfect dispersal
        // Target: 6 columns with 2 numbers, 3 columns with 1 number = 15 total
        let colTargets = [1,1,1,2,2,2,2,2,2].sort(() => Math.random() - 0.5);

        // 2. Try to fill according to targets and row constraints
        let success = true;
        for (let c = 0; c < 9; c++) {
            let target = colTargets[c];
            let placed = 0;
            let rowIndices = [0, 1, 2].sort(() => Math.random() - 0.5);
            
            for (let r of rowIndices) {
                if (placed < target && rowCounts[r] < 5) {
                    card[r][c] = true;
                    rowCounts[r]++;
                    colCounts[c]++;
                    placed++;
                }
            }
            if (placed < target) { success = false; break; }
        }

        if (success && rowCounts.every(count => count === 5)) {
            // Check horizontal dispersal
            if (card.every(row => isWellDispersed(row))) {
                valid = true;
            }
        }
    }

    // Replace placeholders with real values
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            if (card[r][c] === true) {
                if (columnBins[c].length > 0) {
                    card[r][c] = columnBins[c].pop();
                } else {
                    card[r][c] = rand(c * 10, (c * 10) + 9) || 1;
                }
            }
        }
    }
    return card;
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

document.addEventListener('DOMContentLoaded', initApp);
