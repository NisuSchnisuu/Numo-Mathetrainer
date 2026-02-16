// DOM Elements
const views = {
    lobby: document.getElementById('lobby-view'),
    waiting: document.getElementById('waiting-room-view'),
    game: document.getElementById('game-view')
};

const screens = {
    joinSection: document.querySelector('.join-section'),
    settingsPanel: document.querySelector('.settings-panel')
};

const inputs = {
    playerName: document.getElementById('player-name'),
    joinCode: document.getElementById('join-code'),
    gridSize: document.getElementById('grid-size'),
    difficulty: document.getElementById('difficulty'),
    winningScore: document.getElementById('winning-score'),
    customScore: document.getElementById('custom-score'),
    numberRange: document.getElementById('number-range')
};

const elements = {
    grid: document.getElementById('game-grid'),
    targetNumber: document.getElementById('target-number'),
    playersList: document.getElementById('players-container'),
    lobbyCode: document.getElementById('lobby-code-display'),
    lobbySlots: document.getElementById('lobby-player-slots'),
    lobbyQR: document.getElementById('lobby-qr-container')
};

const buttons = {
    createGameTrigger: document.getElementById('btn-open-create-modal'),
    createGameConfirm: document.getElementById('btn-create-confirm'),
    closeCreateModal: document.getElementById('btn-close-create-modal'),
    // joinGame removed
    enterGame: document.getElementById('btn-enter'),
    startGame: document.getElementById('btn-start-game'),
    buzzer: document.getElementById('buzzer-btn'),
    installTrigger: document.getElementById('btn-trigger-install'),
    // New Back Buttons
    lobbyBack: document.getElementById('btn-lobby-back'),
    gameBack: document.getElementById('btn-game-back')
};

// State
let appState = {
    currentView: 'lobby',
    playerName: '',
    playerId: null, // assigned by firebase
    gameId: null,
    isHost: false,
    gridData: [],
    gridSize: 7,
    difficulty: 'normal',
    winningScore: 10,
    target: 0,
    players: {},

    // Gameplay State
    buzzerOwner: null,
    buzzerTimer: null,
    selectedCells: [], // Array of indices (Synced)
    vetoVotes: {},
    isLocked: false,
    lockedUntil: null,
    penaltyInterval: null,

    // Teacher Mode State
    teacherMode: false, // Local toggle state

    // Spectator State
    localModalClosed: false, // User manually closed the spectator modal

    // Flow Control
    isLeaving: false
};

// --- View Management ---
function switchView(viewName) {
    appState.currentView = viewName;

    // Hide all views
    Object.values(views).forEach(el => {
        if (el) el.classList.remove('active');
    });

    // Show target view
    if (views[viewName]) {
        views[viewName].classList.add('active');
    }

    // Auto-Save Session on view change if game is active
    if (appState.gameId && appState.playerId) {
        saveSession();
    }
}

// --- Persistence Helpers ---
function saveSession() {
    if (appState.isLeaving) return; // Block save if leaving
    if (appState.gameId && appState.playerId) {
        const session = {
            gameId: appState.gameId,
            playerId: appState.playerId,
            isHost: appState.isHost,
            playerName: appState.playerName,
            difficulty: appState.difficulty,
            currentView: appState.currentView,
            lastActive: Date.now() // Timestamp for timeout
        };
        localStorage.setItem('trio_session', JSON.stringify(session));
    }
}

function clearSession() {
    localStorage.removeItem('trio_session');
}

function checkSession() {
    const sessionStr = localStorage.getItem('trio_session');
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr);

            // Timeout Check (5 minutes = 300,000 ms)
            if (session.lastActive && (Date.now() - session.lastActive > 5 * 60 * 1000)) {
                console.log("Session expired (timeout > 5min). Clearing.");
                clearSession();
                return false;
            }

            if (session.gameId && session.playerId) {
                console.log("Found previous session:", session);
                // Restore State
                appState.gameId = session.gameId;
                appState.playerId = session.playerId;
                appState.isHost = session.isHost;
                appState.playerName = session.playerName || '';
                if (session.difficulty) appState.difficulty = session.difficulty;

                // Pre-fill name input if it exists
                if (inputs.playerName) inputs.playerName.value = appState.playerName;

                console.log("Restoring session:", session);
                subscribeToGame(appState.gameId);

                // Optimistic View Restore
                if (session.currentView) {
                    console.log("Optimistic Switch to:", session.currentView);
                    if (session.currentView === 'game') switchView('game');
                    else if (session.currentView === 'waiting') enterWaitingRoom();
                }

                return true;
            }
        } catch (e) {
            console.error("Session parse error", e);
            clearSession();
        }
    }
    return false;
}

function loadGameSettings() {
    const settingsStr = localStorage.getItem('trio_game_settings');
    if (!settingsStr) return;

    try {
        const settings = JSON.parse(settingsStr);
        console.log("Loading saved game settings:", settings);

        if (settings.difficulty && inputs.difficulty) inputs.difficulty.value = settings.difficulty;
        if (settings.gridSize && inputs.gridSize) inputs.gridSize.value = settings.gridSize;
        if (settings.winningScore && inputs.winningScore) {
            inputs.winningScore.value = settings.winningScore;
            if (settings.winningScore === 'custom' && inputs.customScore) {
                inputs.customScore.value = settings.customScore || '';
                inputs.customScore.style.display = 'block';
            }
        }
        if (settings.numberRange && inputs.numberRange) inputs.numberRange.value = settings.numberRange;
    } catch (e) {
        console.error("Error loading settings", e);
    }
}

// PWA Install Logic
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show the native install button if it exists
    const nativeBtn = document.getElementById('btn-native-install');
    if (nativeBtn) nativeBtn.style.display = 'block';
});

// IMPROVED Standalone Check
function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: minimal-ui)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           (window.navigator.standalone === true);
}

function init() {
    const isStandalone = isStandaloneMode();
    const isInIframe = window.parent !== window;

    // Detect if parent shell is standalone
    let isParentStandalone = false;
    if (isInIframe) {
        try {
            isParentStandalone = window.parent.matchMedia('(display-mode: standalone)').matches ||
                                 window.parent.matchMedia('(display-mode: minimal-ui)').matches ||
                                 window.parent.navigator.standalone === true;
        } catch (e) {}
    }

    if (!isStandalone) {
        // Show the Trigger Button in Lobby if not already standalone
        if (buttons.installTrigger) {
            buttons.installTrigger.style.display = 'block';
        }
    } else {
        // Explicitly hide install button if standalone
        if (buttons.installTrigger) {
            buttons.installTrigger.style.display = 'none';
        }
    }

    // Interval to ensure back button visibility is correct based on view and mode
    setInterval(() => {
        const backBtn = document.getElementById('numo-back-link');
        if (backBtn) {
            const currentStandalone = isStandaloneMode();
            if (appState.currentView === 'lobby' && !(currentStandalone && !isInIframe)) {
                backBtn.style.display = 'flex';
            } else {
                backBtn.style.display = 'none';
            }
        }
    }, 500);

    // --- SESSION & URL RESTORATION ---
    
    // 1. Pre-fill Player Name
    const savedName = localStorage.getItem('trio_player_name');
    if (savedName && inputs.playerName) {
        inputs.playerName.value = savedName;
        appState.playerName = savedName;
    }

    // 2. Check for Join Link via URL Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    
    // 3. Load Saved Game Settings (Difficulty, Grid, etc.)
    loadGameSettings();
    
    if (joinCode) {
        console.log("Join code found in URL:", joinCode);
        if (inputs.joinCode) inputs.joinCode.value = joinCode.toUpperCase();
        enableQuickJoinMode();
        // Skip session restore if we're explicitly trying to join a new game via link
    } else {
        // 3. Check for existing session
        checkSession();
    }

    // 4. Auto-Show Install Modal if requested via URL
    if (urlParams.get('install') === 'true') {
        showInstallModal();
        // Clean URL to avoid re-opening on reload
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('install');
        window.history.replaceState({}, document.title, newUrl.toString());
    }

    setupEventListeners();
}

function showInstallModal() {
    const modal = document.getElementById('pwa-install-modal');
    if (!modal) return;
    
    modal.classList.add('active');

    // Detect OS logic
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isTouch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    const isIOS = (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) || (ua.includes("Mac") && isTouch);
    const isAndroid = /android/i.test(ua);

    let targetId = 'install-desktop';
    if (isIOS) targetId = 'install-ios';
    else if (isAndroid) targetId = 'install-android';

    document.querySelectorAll('.platform-guide').forEach(el => el.style.display = 'none');
    const guide = document.getElementById(targetId);
    if (guide) guide.style.display = 'block';

    // Show native button only for non-iOS (Android or Desktop) if prompt is available
    const nativeBtn = document.getElementById('btn-native-install');
    if (nativeBtn && deferredPrompt && !isIOS) {
        nativeBtn.style.display = 'block';
    }
}

function enableQuickJoinMode() {
    // Quick Join UI Mode
    // 1. Hide "Create Game" related buttons
    const btnCreate = document.getElementById('btn-open-create-modal');
    const btnClass = document.getElementById('btn-class-game');
    const separator = document.querySelector('.lobby-separator');

    if (btnCreate) btnCreate.style.display = 'none';
    if (btnClass) btnClass.style.display = 'none';
    if (separator) separator.style.display = 'none';

    // 2. Hide "Join Code" input and divider (since code is prefilled)
    const joinInput = document.getElementById('join-code');
    const scanBtn = document.getElementById('btn-scan-qr');
    const joinLabel = document.querySelector('#join-container label');

    if (joinInput) joinInput.style.display = 'none';
    if (scanBtn) scanBtn.style.display = 'none';
    if (joinLabel) joinLabel.style.display = 'none';

    // 3. Add specific layout class
    const lobbyContainer = document.querySelector('.lobby-container');
    if (lobbyContainer) lobbyContainer.classList.add('quick-join-mode');

    // 4. Add "Back to Main Menu" button
    const joinContainer = document.getElementById('join-container');
    if (joinContainer) {
        // Check if button already exists
        let backBtn = document.getElementById('btn-quick-join-back');
        if (!backBtn) {
            backBtn = document.createElement('button');
            backBtn.id = 'btn-quick-join-back';
            backBtn.className = 'btn-secondary';
            backBtn.style.cssText = 'width: 100%; margin-top: 15px; padding: 12px; font-size: 0.95rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);';
            backBtn.innerHTML = '← Zurück zum Hauptmenü';
            backBtn.addEventListener('click', () => {
                // Remove the game code from URL and reload to show full lobby
                window.location.href = window.location.pathname;
            });
            joinContainer.appendChild(backBtn);
        }
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    setupLobbyNewEvents(); // Bind new lobby buttons
    setupTeacherShortcut(); // Init shortcut
    setupHelpSystem(); // Init Help System

    // PWA Install Logic
    const installTrigger = document.getElementById('btn-trigger-install');
    if (installTrigger) {
        installTrigger.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            if (window.parent !== window) {
                const url = new URL(window.location.href);
                url.searchParams.set('install', 'true');
                window.open(url.toString(), '_blank');
            } else {
                showInstallModal();
            }
        });
    }

    const closeInstallBtn = document.getElementById('btn-close-install');
    if (closeInstallBtn) {
        closeInstallBtn.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            console.log("Trio Install Modal Close Clicked");
            const modal = document.getElementById('pwa-install-modal');
            if (modal) modal.classList.remove('active');
        });
    }

    // Teacher Broadcast Toggle Listener
    const cbBroadcast = document.getElementById('cb-teacher-broadcast');
    if (cbBroadcast) {
        cbBroadcast.addEventListener('change', (e) => {
            if (appState.gameId && appState.isHost) {
                db.ref(`games/${appState.gameId}/settings/teacherBroadcast`).set(e.target.checked);
            }
        });
    }

    // 1. OPEN CREATE MODAL
    if (buttons.createGameTrigger) {
        buttons.createGameTrigger.addEventListener('click', () => {
            const name = inputs.playerName.value.trim();
            if (!name) { showMessage('Fehler', 'Bitte gib deinen Namen ein!'); return; }

            // Save name
            localStorage.setItem('trio_player_name', name);

            appState.tempIsTeacherCreate = false; // Normal mode

            // Open Modal
            document.getElementById('create-game-modal').classList.add('active');

            // Set Title for Normal Mode
            const modalTitle = document.querySelector('#create-game-modal h2');
            if (modalTitle) modalTitle.innerText = "Spiel konfigurieren";

            // Hide Observe setting for normal game (Element removed from DOM, check removed)
        });
    }

    // 2. CLOSE CREATE MODAL
    if (buttons.closeCreateModal) {
        buttons.closeCreateModal.addEventListener('click', () => {
            document.getElementById('create-game-modal').classList.remove('active');
        });
    }

    // 3. CONFIRM CREATE GAME (Inside Modal)
    if (buttons.createGameConfirm) {
        buttons.createGameConfirm.addEventListener('click', () => {
            const name = inputs.playerName.value.trim(); // Re-read just in case
            // Settings are read from inputs directly in createGame()

            // Persist Settings
            const settings = {
                difficulty: inputs.difficulty.value,
                gridSize: inputs.gridSize.value,
                winningScore: inputs.winningScore.value,
                customScore: inputs.customScore.value,
                numberRange: inputs.numberRange ? inputs.numberRange.value : 'base'
            };
            localStorage.setItem('trio_game_settings', JSON.stringify(settings));

            // Close Modal
            document.getElementById('create-game-modal').classList.remove('active');

            // Trigger Game Creation
            // Check flag from Teacher button
            createGame(name, appState.tempIsTeacherCreate || false);
        });
    }

    // Enter Game (Join)
    buttons.enterGame.addEventListener('click', () => {
        const name = inputs.playerName.value.trim();
        const code = inputs.joinCode.value.trim();
        if (!name || !code) { showMessage('Fehler', 'Name und Game-Code sind erforderlich!'); return; }

        // Persist Name
        localStorage.setItem('trio_player_name', name);

        joinGame(code, name);
    });

    buttons.startGame.addEventListener('click', startGameAction);
    const refreshBtn = document.getElementById('btn-vote-refresh');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            if (appState.settings && appState.settings.classMode) {
                handleClassReroll();
            } else {
                showConfirm("Zielzahl ändern?", "Möchtest du eine Abstimmung starten?", () => {
                    initiateVote();
                });
            }
        };
        // Initial check for cooldown visuals
        if (appState.settings && appState.settings.classMode) updateRerollTimer();
    }


    buttons.buzzer.addEventListener('click', handleBuzzerClick);

    // Back Button Listeners
    // Re-select to ensure freshness
    const lobbyBack = document.getElementById('btn-lobby-back');
    if (lobbyBack) lobbyBack.addEventListener('click', handleGlobalBack);

    const gameBack = document.getElementById('btn-game-back');
    if (gameBack) gameBack.addEventListener('click', () => {
        showConfirm("Spiel verlassen?", "Möchtest du das Spiel wirklich verlassen?", () => {
            leaveGame();
        });
    });

    // Winning Score Change Listener
    if (inputs.winningScore) {
        inputs.winningScore.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                inputs.customScore.style.display = 'block';
                inputs.customScore.focus();
            } else {
                inputs.customScore.style.display = 'none';
            }
        });
    }

    // Init QR Scanner
    setupQRScanner();

    // Close Spectator Modal
    const btnCloseCalc = document.getElementById('btn-close-calc-modal');
    if (btnCloseCalc) {
        btnCloseCalc.addEventListener('click', (e) => {
            console.log("Close button clicked");
            e.stopPropagation(); // Prevent bubbling
            e.preventDefault();

            // Only allow closing if read-only (spectator)
            const modal = document.getElementById('calc-modal');
            if (modal.classList.contains('read-only')) {
                console.log("Closing read-only modal");
                appState.localModalClosed = true;
                modal.classList.remove('active');
                modal.style.display = 'none'; // Force hide over inline flex
            } else {
                console.log("Modal not read-only, ignoring close.");
            }
        });
    }
    // Auto-save on visibility change (leaving the app)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveSession();
        }
    });
}

function handleGlobalBack() {
    // If in Game or Waiting -> Leave Game logic
    if (appState.currentView === 'game' || appState.currentView === 'waiting') {
        showConfirm("Spiel verlassen?", "Möchtest du das Spiel wirklich verlassen?", () => {
            leaveGame();
        });
    } else {
        // Default fallback (though usually hidden in lobby)
        switchView('lobby');
    }
}

// --- Custom Modal Helpers ---
function showMessage(title, message) {
    showModal(title, message, null, true);
}

function showConfirm(title, message, onConfirm) {
    showModal(title, message, onConfirm, false);
}

function showModal(title, message, onConfirm, isAlert = false, confirmText = 'OK', cancelText = 'Abbrechen', onCancel = null) {
    const modal = document.getElementById('app-modal');
    const titleEl = document.getElementById('app-modal-title');
    const msgEl = document.getElementById('app-modal-message');
    const confirmBtn = document.getElementById('app-modal-confirm');
    const cancelBtn = document.getElementById('app-modal-cancel');

    titleEl.innerText = title;
    msgEl.innerText = message;

    // Clear old listeners
    const newConfirm = confirmBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    if (isAlert) {
        newCancel.style.display = 'none';
        newConfirm.innerText = confirmText;
        newConfirm.style.width = '100%';
    } else {
        newCancel.style.display = 'block';
        newConfirm.innerText = confirmText;
        newCancel.innerText = cancelText;
        newConfirm.style.width = 'auto';
    }

    newConfirm.onclick = () => {
        modal.classList.remove('active');
        if (onConfirm) onConfirm();
    };

    newCancel.onclick = () => {
        modal.classList.remove('active');
        if (onCancel) onCancel();
    };

    modal.classList.add('active');
}


// --- Firebase Logic ---

function createGame(playerName, isTeacherGame = false) {
    const shortId = Math.floor(10000 + Math.random() * 90000).toString(); // 5 digit code
    const gameRef = db.ref(`games/${shortId}`);

    gameRef.once('value').then(snapshot => {
        if (snapshot.exists()) {
            // Collision? Retry recursively
            createGame(playerName, isTeacherGame);
            return;
        }

        appState.playerName = playerName;
        appState.isHost = true;
        appState.difficulty = inputs.difficulty.value;
        appState.gridSize = parseInt(inputs.gridSize.value);
        appState.numberRange = inputs.numberRange ? inputs.numberRange.value : 'base';
        appState.gameId = shortId;

        let wScore = parseInt(inputs.winningScore.value);
        if (inputs.winningScore.value === 'custom') {
            wScore = parseInt(inputs.customScore.value);
        }
        if (!wScore || wScore < 1) wScore = 10; // Fallback
        appState.winningScore = wScore;

        // Teacher Settings
        // Teacher Settings
        // const observeMode = document.getElementById('observe-mode').checked; // REMOVED


        // Use teacher mode from arg or existing appState? 
        // Logic: specific button passes isTeacherGame=true.
        appState.isTeacherMode = isTeacherGame;
        appState.isHost = true; // Ensure Host flag is set local


        // Host Player ID (still needs to be unique inside the game)
        // We can use a simple random string for player ID too since it's local scope
        // But push() is fine for players list.
        const playersRef = gameRef.child('players');
        const hostPlayerRef = playersRef.push();
        appState.playerId = hostPlayerRef.key;

        const gameData = {
            state: 'waiting',
            settings: {
                difficulty: appState.difficulty,
                gridSize: appState.gridSize,
                winningScore: appState.winningScore,
                numberRange: appState.numberRange || 'base',
                teacherMode: isTeacherGame,
                classMode: isTeacherGame
            },
            hostId: appState.playerId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastActive: firebase.database.ServerValue.TIMESTAMP
        };

        gameRef.set(gameData).then(() => {
            hostPlayerRef.set({
                name: playerName,
                score: 0,
                status: 'waiting',
                isHost: true
            });

            subscribeToGame(appState.gameId);
            enterWaitingRoom();
            saveSession();
            // Disabling auto-delete on disconnect to allow Reloads!
            // gameRef.onDisconnect().remove(); 
        });
    });
}



function joinGame(gameId, playerName) {
    appState.playerName = playerName;
    appState.gameId = gameId;
    appState.isHost = false;

    const gameRef = db.ref(`games/${gameId}`);

    // Check if game exists first
    gameRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            showMessage('Fehler', 'Spiel nicht gefunden!');
            return;
        }

        const playerRef = gameRef.child('players').push();
        appState.playerId = playerRef.key;

        playerRef.set({
            name: playerName,
            score: 0,
            status: 'waiting',
            isHost: false
        }).then(() => {
            subscribeToGame(gameId);
            enterWaitingRoom();

            saveSession(); // Save session
        });
    });
}

function enterWaitingRoom() {
    switchView('waiting');

    // UI Updates
    if (elements.lobbyCode) elements.lobbyCode.innerText = appState.gameId;
    const modalCode = document.getElementById('qr-modal-code');
    if (modalCode) modalCode.innerText = appState.gameId;


    // QR Code with Direct Link
    const protocol = window.location.protocol;
    const host = window.location.host;
    let path = window.location.pathname;

    if (path.endsWith('index.html')) {
        path = path.substring(0, path.length - 'index.html'.length);
    }
    if (!path.endsWith('/')) {
        path += '/';
    }

    const joinUrl = `${protocol}//${host}${path}?join=${appState.gameId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;

    const qrContainer = document.getElementById('lobby-qr-large-container');
    if (qrContainer) {
        qrContainer.innerHTML = `<img src="${qrUrl}" alt="Game QR Code" style="width:100%; height:auto; border-radius:8px;" />`;
    }

    const statusText = document.getElementById('lobby-status-text');

    if (appState.isHost) {
        if (buttons.startGame) buttons.startGame.style.display = 'block';
        if (statusText) statusText.style.display = 'none';
    } else {
        if (buttons.startGame) buttons.startGame.style.display = 'none';
        if (statusText) {
            statusText.style.display = 'block';
            statusText.innerText = "Warte auf Host...";
        }
    }

    updateClassModeIndicator();
}

function updateClassModeIndicator() {
    const badge = document.getElementById('class-mode-badge');
    if (!badge) return;

    if (appState.settings && appState.settings.classMode) {
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function leaveGame() {
    appState.isLeaving = true;

    const gid = appState.gameId;
    const pid = appState.playerId;
    const isHost = appState.isHost;

    if (gid) {
        const gameRef = db.ref(`games/${gid}`);
        gameRef.off();
    }

    if (gid && pid) {
        const gameRef = db.ref(`games/${gid}`);
        if (isHost) {
            gameRef.remove();
        } else {
            gameRef.child(`players/${pid}`).remove();
        }
    }

    clearSession();

    appState.gameId = null;
    appState.playerId = null;
    appState.isHost = false;
    appState.gridData = [];
    appState.target = 0;
    appState.players = {};
    appState.buzzerOwner = null;
    appState.selectedCells = [];
    appState.vetoVotes = {};
    appState.isLocked = false;
    appState.lockedUntil = null;
    appState.settings = null;
    appState.hostId = null;
    appState.isLeaving = false;

    // Reset tracking variables for listeners
    currentSubscribedGameId = null;
    currentAttachedGameId = null;

    if (appState.buzzerTimer) clearInterval(appState.buzzerTimer);
    if (appState.penaltyInterval) clearInterval(appState.penaltyInterval);

    const grid = document.getElementById('game-grid');
    if (grid) grid.innerHTML = '';

    const targetNumber = document.getElementById('target-number');
    if (targetNumber) targetNumber.innerText = '?';

    switchView('lobby');
}

function startGameAction() {
    if (!appState.isHost) return;

    // Generate Grid
    const { grid, solutions } = generateGridData(appState.gridSize);

    if (solutions.length === 0) {
        console.warn("Retrying gen...");
        startGameAction();
        return;
    }

    if (appState.settings && appState.settings.classMode) {
        // --- CLASS MODE START ---
        // 1. Filter for unique results to ensure no target appears twice
        const uniqueMap = new Map();
        solutions.forEach(s => {
            if (!uniqueMap.has(s.result)) uniqueMap.set(s.result, s);
        });
        const uniqueSolutions = Array.from(uniqueMap.values());

        // 2. Shuffle Unique Solutions to create a random path
        const shuffled = uniqueSolutions.sort(() => 0.5 - Math.random());

        // 3. Update DB
        const updates = {
            grid: grid,
            state: 'playing',
            solutions: shuffled, // Store UNIQUE solutions for the class path
            // No global target in class mode
            target: null,
            vote: null,
            winner: null
        };

        // 4. Reset all players to Index 0
        Object.keys(appState.players).forEach(pid => {
            updates[`players/${pid}/currentSolutionIndex`] = 0;
            updates[`players/${pid}/score`] = 0;
            updates[`players/${pid}/lockedUntil`] = null;
        });

        db.ref(`games/${appState.gameId}`).update(updates)
            .then(() => console.log("HOST: Class Game Started"))
            .catch(e => console.error("HOST: Start Failed", e));

    } else {
        // --- CLASSIC MODE START ---
        const randomSol = solutions[Math.floor(Math.random() * solutions.length)];
        appState.target = randomSol.result;
        appState.currSolutions = solutions;

        const gameId = `games/${appState.gameId}`;
        db.ref(gameId).update({
            grid: grid,
            target: appState.target,
            usedTargets: [appState.target], // Track used targets
            state: 'playing',
            solutions: null,
            currentAttempt: null,
            buzzerOwner: null,
            buzzerTimestamp: null,
            winner: null
        }).then(() => console.log("HOST: DB Update Success"))
            .catch(e => console.error("HOST: DB Update Failed", e));
    }
}

// --- Listeners ---

let currentSubscribedGameId = null;
function subscribeToGame(gameId) {
    if (currentSubscribedGameId === gameId) {
        console.log("Already subscribed to game:", gameId);
        return;
    }
    currentSubscribedGameId = gameId;

    console.log("Subscribing to game:", gameId);
    const gameRef = db.ref(`games/${gameId}`);

    // 1. Status Check (Waiting -> Playing)
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        console.log("Game Data received:", data);

        // Host Disconnected / Game Ended
        // Host Disconnected / Game Ended
        // Host Disconnected / Game Ended
        if (!data) {
            // Prevent action if we're already leaving or have already left
            if (appState.isLeaving || !appState.gameId) {
                console.log("Already leaving or no active game, skipping.");
                return;
            }

            if (!appState.isHost) {
                // If Game Over Modal is already active, don't show "Host left" message
                const gameOverModal = document.getElementById('game-over-modal');
                if (gameOverModal && gameOverModal.classList.contains('active')) {
                    console.log("Game over active, host left. User can finish viewing ranking.");
                    return;
                }

                // Non-host: Host has left the game
                showModal("Spiel beendet", "Der Host hat das Spiel verlassen.", () => {
                    leaveGame(); // Clean up and return to lobby
                }, true);
            } else {
                // Host Zombie Session Fix:
                // If I am Host but data is gone (e.g. auto-cleanup), we must reset.
                console.warn("HOST: Game data not found (Zombie Session). Clearing.");
                leaveGame(); // Clean up and return to lobby
            }
            return;
        }

        // Settings Sync
        if (data.settings) {
            appState.gridSize = data.settings.gridSize;
            appState.difficulty = data.settings.difficulty;
            if (data.settings.winningScore) appState.winningScore = data.settings.winningScore;

            // Sync Teacher Settings
            appState.settings = data.settings; // Keep reference

            // Sync Host ID for broadcast logic
            if (data.hostId) appState.hostId = data.hostId;

            // Teacher Broadcast Listener Sync
            const teacherToggle = document.getElementById('cb-teacher-broadcast');
            if (teacherToggle) {
                // Update visual state if strictly listening? 
                // If I am host, I control it. If I am student, I don't see it.
                // So sync to UI is mostly for maintaining state on reload for Host.
                if (data.settings.teacherBroadcast !== undefined) {
                    teacherToggle.checked = data.settings.teacherBroadcast;
                }
            }

            // Show/Hide Teacher Controls based on role
            const teacherControls = document.getElementById('teacher-controls');
            if (teacherControls) {
                // Show if I am Host AND (Teacher Mode OR Just Host?)
                // User said: "im Klassenmodus... man als host"
                // Let's restrict to Teacher Mode for now OR just Host.
                if (appState.isHost && (appState.settings.teacherMode || appState.isTeacherMode)) {
                    teacherControls.style.display = 'flex';
                } else {
                    teacherControls.style.display = 'none';
                }
            }

            // Note: appState.teacherMode is local UI toggle. 
            // We should use appState.settings.teacherMode for game logic.

            // Update difficulty badge
            const diffEl = document.getElementById('difficulty-display');
            if (diffEl) {
                const map = { normal: 'Normal', advanced: 'Fortgeschritten', pro: 'Profi' };
                diffEl.innerText = map[appState.difficulty] || appState.difficulty;
            }

            // Refresh modal if active (e.g. strict mode buttons)
            // If difficulty changed (or loaded late), we need to update visibility of buttons
            const modal = document.getElementById('calc-modal');
            if (modal && modal.classList.contains('active')) {
                populateModalButtons(true);
            }

            updateClassModeIndicator();
        }

        let forceRender = false;

        // State Transition
        if (data.state === 'playing' && appState.currentView !== 'game') {
            switchView('game');
            forceRender = true; // Force render since view just appeared
        } else if (data.state === 'waiting' && appState.currentView !== 'waiting') {
            enterWaitingRoom();
        }

        // Data Sync
        if (data.grid) {
            const strGrid = JSON.stringify(data.grid);
            // If data changed AND/OR we forced a render (e.g. host just started)
            if (strGrid !== JSON.stringify(appState.gridData) || forceRender) {
                appState.gridData = data.grid;
                renderGrid();

                // If Modal is open, we might need to repopulate buttons now that grid is here!
                if (document.getElementById('calc-modal').classList.contains('active')) {
                    populateModalButtons(true);
                }
            }
        }
        // Sync Solutions (Class Mode)
        if (data.solutions) appState.allSolutions = data.solutions;
        
        // Sync Used Targets (Classic Mode)
        if (data.usedTargets) appState.usedTargets = data.usedTargets;

        if (appState.settings && appState.settings.classMode) {
            const myP = data.players ? data.players[appState.playerId] : null;
            if (myP && appState.allSolutions && myP.currentSolutionIndex !== undefined) {
                const newTarget = appState.allSolutions[myP.currentSolutionIndex]?.result;
                // If target changed or first fetch
                if (newTarget !== undefined && appState.target !== newTarget) {
                    appState.target = newTarget;
                    elements.targetNumber.innerText = newTarget;
                    appState.selectedCells = [];
                    updateGridSelection();
                    closeCalculationModal(false);
                } else if (newTarget === undefined && appState.allSolutions.length > 0) {
                    // End of game
                    elements.targetNumber.innerText = "🏆";
                }
            }

            // Adjust UI
            if (buttons.buzzer) buttons.buzzer.style.display = 'none';

            // Setup Skip Button
            const voteBox = document.getElementById('vote-box');
            if (voteBox) {
                voteBox.style.display = 'flex';
                const voteBtn = document.getElementById('btn-vote-veto');
                if (voteBtn) {
                    voteBtn.innerText = "Überspringen (20s)";
                    voteBtn.onclick = handleSkipClick;

                    // Check Cooldown
                    const cooldown = parseInt(localStorage.getItem('skipCooldown') || '0');
                    if (cooldown > Date.now()) {
                        voteBtn.disabled = true;
                        voteBtn.innerText = `Warten (${Math.ceil((cooldown - Date.now()) / 1000)}s)`;
                        // We rely on render loop to update text
                    } else {
                        voteBtn.disabled = false;
                    }
                }
            }

        } else if (data.target) {
            console.log("SYNC: Target update received:", data.target);
            if (appState.target !== data.target || forceRender) {
                // Target changed = someone solved correctly
                // Reset local penalty timer so everyone can participate in new round
                if (appState.penaltyInterval) {
                    clearInterval(appState.penaltyInterval);
                    appState.penaltyInterval = null;
                }
                appState.lockedUntil = null;
                appState.isLocked = false;

                // Reset buzzer button if it was showing penalty
                if (buttons.buzzer && !appState.buzzerOwner) {
                    buttons.buzzer.innerText = "TRIO!";
                    buttons.buzzer.classList.remove('buzzer-locked');
                    buttons.buzzer.disabled = false;
                }

                appState.target = data.target;
                elements.targetNumber.innerText = appState.target;

                // Update Modal Target if open
                const modalTarget = document.getElementById('modal-target-display');
                if (modalTarget) modalTarget.innerText = `Ziel: ${appState.target}`;

                if (appState.isHost) db.ref(`games/${gameId}/veto`).remove();
            }
        }

        // Vote Sync
        if (data.vote) {
            handleVoteUpdate(data.vote, data.players);
        } else {
            // No vote active -> clear UI
            const dv = document.getElementById('vote-dots');
            if (dv) dv.innerHTML = '';
            const vb = document.getElementById('vote-box');
            if (vb) vb.style.display = 'none';
        }

        // Players Sync
        if (data.players) {
            appState.players = data.players;

            // Check if current player was removed by host
            const myData = data.players[appState.playerId];
            if (!myData && !appState.isHost && !appState.isLeaving) {
                // Player was removed from the game by host
                leaveGame();
                showMessage("Entfernt", "Du wurdest vom Host aus der Lobby entfernt.");
                return; // Stop processing
            }

            renderLobbySlots(data.players);
            renderPlayersList(data.players);

            if (myData && myData.lockedUntil) {
                if (myData.lockedUntil > Date.now()) {
                    appState.lockedUntil = myData.lockedUntil;
                    startPenaltyCountdown();
                }
                else appState.lockedUntil = null;
            }
            if (data.veto) updateVetoUI(data.veto, Object.keys(data.players).length);
            if (appState.isHost && data.veto) checkVetoThreshold(data.veto, Object.keys(data.players).length);

            // REFRESH Buzzer Name if active (Fix for "Jemand" on reload)
            if (appState.buzzerOwner && appState.buzzerOwner !== appState.playerId) {
                // Force update UI text now that we have player names
                handleBuzzerOwnerChange(appState.buzzerOwner, null);
                // Note: passing null timestamp as we don't want to re-trigger timer logic or effects, just text
            }
        }

        // --- HOST LOGIC FIX ---
        // Ensure host logic (attempt listener) is always attached if I am the host.
        // This fixes the issue where solutions are pushed to DB but never validated until a reload.
        if (appState.isHost) {
            attachHostLogic(gameId);
        }

        if (data.winner) {
            const gom = document.getElementById('game-over-modal');
            if (gom && !gom.classList.contains('active')) {
                handleGameWin(data.winner, data.players);
            }
        }
    });

    // Real-Time Selection Sync
    gameRef.child('status/selection').on('value', snap => {
        const sel = snap.val() || [];
        // Only update if DIFFERENT to avoid jitter if loopback
        if (JSON.stringify(sel) !== JSON.stringify(appState.selectedCells)) {
            appState.selectedCells = sel;
            updateGridSelection();

            // If modal is open but buttons missing (Reload case), repopulate
            const modal = document.getElementById('calc-modal');
            if (modal.classList.contains('active') && sel.length > 0) {
                populateModalButtons(true); // Preserve formula
            }
        }
    });

    // Real-Time Modal Sync
    gameRef.child('status/modal').on('value', snap => {
        const modalState = snap.val();
        if (modalState) {
            // Ensure grid selected cells are ready?
            // If not, we wait for selection sync to trigger repopulate.
            handleModalSync(modalState);
        } else {
            closeCalculationModal(false); // Ensure close if null
        }
    });

    // Result Sync (Popup)
    gameRef.child('status/result').on('value', snap => {
        const res = snap.val();
        if (res && res.timestamp > (Date.now() - 5000)) { // Only recent
            handleResultSync(res);
            // Verify modal closes for everyone?
            // Host logic sets status/modal to false implicitly by clearing status?
            // No, status/modal is separate.
            // We should ensure modal closes.
            closeCalculationModal(false);
        }
    });
    // Buzzer unique listener
    gameRef.child('status').on('value', snap => {
        const status = snap.val();
        if (status && status.buzzerOwner) {
            if (appState.buzzerOwner !== status.buzzerOwner) {
                handleBuzzerOwnerChange(status.buzzerOwner, status.timestamp);
            }
        } else {
            if (appState.buzzerOwner !== null) {
                resetBuzzerState();
            }
        }
    });

}

function setupQRScanner() {
    const scanBtn = document.getElementById('btn-scan-qr');
    const qrModal = document.getElementById('qr-modal');
    const closeQrBtn = document.getElementById('btn-close-qr');
    let html5QrcodeScanner = null;
    let permissionGranted = false; // Cache permission status

    if (scanBtn) {
        scanBtn.addEventListener('click', async () => {
            qrModal.classList.add('active');

            // Explicit Permission Request Logic (Only if not already granted)
            if (!permissionGranted) {
                try {
                    // 1. Check persistent permission state (if supported)
                    if (navigator.permissions && navigator.permissions.query) {
                        try {
                            const status = await navigator.permissions.query({ name: 'camera' });
                            if (status.state === 'granted') {
                                permissionGranted = true;
                                console.log("Camera permission already granted (persistent).");
                            }
                        } catch (e) {
                            console.log("Permission query failed/unsupported", e);
                        }
                    }

                    // 2. If still not granted, request it explicitly
                    if (!permissionGranted) {
                        // Check if API is available
                        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                            throw new Error("Browser API not available (Non-Secure Context?)");
                        }

                        const constraints = {
                            video: {
                                facingMode: "environment",
                                zoom: true,
                                width: { ideal: 1920 },
                                height: { ideal: 1080 }
                            }
                        };
                        const stream = await navigator.mediaDevices.getUserMedia(constraints);

                        // If successful, stop this stream immediately to release camera for the library
                        stream.getTracks().forEach(track => track.stop());

                        // Mark as granted so we don't ask again this session
                        permissionGranted = true;
                    }

                } catch (err) {
                    console.warn("Permission check failed:", err);
                    const isSecure = window.isSecureContext;
                    let msg = "Kamera-Zugriff verweigert oder nicht unterstützt.";
                    if (!isSecure) {
                        msg += "\n\n⚠️ HINWEIS: Auf mobilen Geräten funktioniert die Kamera nur über HTTPS oder Localhost. Wenn du über eine IP-Adresse zugreifst, blockiert der Browser die Kamera.";
                    } else {
                        msg += "\nBitte Kamera-Berechtigung in den Browser-Einstellungen prüfen.";
                    }
                    alert(msg);
                    qrModal.classList.remove('active');
                    return;
                }
            }

            // Init Scanner Library
            if (!html5QrcodeScanner) {
                // Verbose false
                html5QrcodeScanner = new Html5Qrcode("reader", false);
            }

            // OPTIMIZATION:
            // 1. fps: 15 (faster scanning)
            // 2. qrbox: slightly larger
            // 3. aspectRatio: 1.0 (square)
            // 4. experimentalFeatures: useBarCodeDetectorIfSupported (uses native android API if available -> super fast)
            const config = {
                fps: 15,
                qrbox: { width: 300, height: 300 },
                aspectRatio: 1.0,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            };

            // Camera Config with Zoom hint
            // Note: Html5QrcodeScanner 'start' method takes config. 
            // We can try to pass advanced constraints if the library supports passing MediaTrackConstraints.
            // Documentation says: start(cameraIdOrConfig, configuration, qrCodeSuccessCallback...)
            // cameraIdOrConfig can be { facingMode: "environment" } OR { deviceId: ... }
            // To use zoom, we need 'advanced' constraints.

            const cameraConfig = {
                facingMode: "environment"
            };

            // HTML5-QRCode doesn't explicitly document passing 'advanced' constraints in the simple config object easily,
            // but let's try standard getUserMedia constraint format.
            // If that fails, we rely on the library's default.
            // NOTE: The library creates its own stream. 
            // We can try to force high res which often equals "less wide angle" on some phones, effectively zooming.

            html5QrcodeScanner.start(
                cameraConfig,
                config,
                (decodedText, decodedResult) => {
                    // SUCCESS
                    console.log("Scan success:", decodedText);

                    // Handle URL or Code
                    let code = decodedText;

                    // If URL, extract 'join' param
                    try {
                        const url = new URL(decodedText);
                        const joinParam = url.searchParams.get('join');
                        if (joinParam) code = joinParam;
                    } catch (e) {
                        // Not a URL, use raw text
                    }

                    if (code && code.length >= 4) { // Basic validation
                        // Stop scanner
                        html5QrcodeScanner.stop().then(() => {
                            qrModal.classList.remove('active');

                            // FILL & FORCE REDIRECT/RELOAD
                            // This guarantees we enter the "Clean Join State" same as native camera
                            window.location.href = window.location.pathname + '?join=' + code;

                        }).catch(err => console.error(err));
                    }

                }, (errorMessage) => {
                    // parse error, ignore
                }).then(() => {
                    // Init Zoom
                    setupZoomControls(html5QrcodeScanner);
                }).catch(err => {
                    console.error("Error starting scanner", err);
                    // This catch might still be hit if something else is wrong
                    alert("Fehler beim Starten des Scanners: " + err);
                    qrModal.classList.remove('active');
                });
        });
    }

    // Close QR Modal
    if (closeQrBtn) {
        closeQrBtn.addEventListener('click', () => {
            stopScanner();
        });
    }

    function stopScanner() {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop().then(() => {
                qrModal.classList.remove('active');
            }).catch(err => {
                console.error("Stop failed", err);
                qrModal.classList.remove('active');
            });
        } else {
            qrModal.classList.remove('active');
        }
    }

    // Helper to handle hardware zoom
    async function setupZoomControls(html5QrcodeScanner) {
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomDisplay = document.getElementById('zoom-level-display');
        const zoomContainer = document.getElementById('zoom-controls');

        if (!zoomSlider || !zoomContainer) return;

        // Reset UI
        zoomContainer.style.display = 'none';

        // Wait a bit for the camera to actually start and track to be available
        setTimeout(async () => {
            try {
                // Get the running track from the library provided mechanism if possible, 
                // OR find the video element and get its stream. 
                // HTML5-QRCode puts a <video> element inside the div#reader.
                const videoEl = document.querySelector('#reader video');
                if (!videoEl || !videoEl.srcObject) return;

                const track = videoEl.srcObject.getVideoTracks()[0];
                if (!track) return;

                const capabilities = track.getCapabilities();
                const settings = track.getSettings();

                // Check for Zoom support
                if (!capabilities.zoom) {
                    console.log("Zoom not supported by hardware");
                    return;
                }

                // Show Controls
                zoomContainer.style.display = 'flex';
                zoomDisplay.style.display = 'block';

                const min = capabilities.zoom.min;
                const max = capabilities.zoom.max;
                const step = capabilities.zoom.step || 0.1;
                let currentZoom = settings.zoom || min || 1;

                // Configure Slider
                zoomSlider.min = min;
                zoomSlider.max = max;
                zoomSlider.step = step;
                zoomSlider.value = currentZoom;

                zoomDisplay.innerText = currentZoom.toFixed(1) + "x";

                // Input Event
                zoomSlider.oninput = async (e) => {
                    const val = parseFloat(e.target.value);
                    try {
                        await track.applyConstraints({ advanced: [{ zoom: val }] });
                        zoomDisplay.innerText = val.toFixed(1) + "x";
                    } catch (err) {
                        console.error("Zoom failed", err);
                    }
                };

            } catch (e) {
                console.error("Error setting up zoom", e);
            }
        }, 1000); // 1s delay to ensure video is ready
    }

}

function handleResultSync(res) {
    const pName = appState.players[res.playerId]?.name || 'Spieler';
    const isMe = (res.playerId === appState.playerId);

    let title, msg;
    if (res.correct) {
        title = "RICHTIG! 🎉";
        msg = `+${res.score} Punkte für ${res.playerName}!`;
        playSound('success');
        startConfetti();
        if (isMe) {
            // My successful attempt
        }
    } else {
        title = "FALSCH! ❌";
        if (isMe) {
            msg = res.reason || "Das war leider falsch! Du bist für 15s gesperrt.";
        } else {
            // Generic message for others, no specific formula
            msg = `${res.playerName}: Das war nicht ganz korrekt.`;
        }
        playSound('fail');
    } // Auto-close after 3s
    // Class Mode: Suppress global feedback
    if (appState.settings && appState.settings.classMode && !isMe) {
        // Do nothing for others in Class Mode
        return;
    }

    showModal(title, msg, null, true, "OK");
    setTimeout(() => {
        const m = document.getElementById('app-modal');
        if (m.classList.contains('active')) m.classList.remove('active');
    }, 3000);
}

function handleGameWin(winnerId, players) {
    const winnerName = players[winnerId]?.name || "Unbekannt";
    const isMe = (winnerId === appState.playerId);

    // Clear local penalty state
    if (appState.penaltyInterval) {
        clearInterval(appState.penaltyInterval);
        appState.penaltyInterval = null;
    }
    appState.lockedUntil = null;
    appState.isLocked = false;

    // Reset buzzer if exists
    if (buttons.buzzer) {
        buttons.buzzer.innerText = "TRIO!";
        buttons.buzzer.classList.remove('buzzer-locked');
        buttons.buzzer.disabled = false;
    }

    // --- POPULATE GAME OVER MODAL ---
    const modal = document.getElementById('game-over-modal');
    const winnerText = document.getElementById('game-over-winner-text');
    const rankingBody = document.getElementById('game-over-ranking-body');
    const personalRankDisplay = document.getElementById('personal-rank-display');

    if (!modal || !winnerText || !rankingBody) return;

    winnerText.innerText = isMe ? "Herzlichen Glückwunsch! Du hast gewonnen!" : `${winnerName} hat das Spiel gewonnen!`;

    // Sort players by score
    const sortedPlayers = Object.entries(players)
        .map(([id, p]) => ({ id, ...p }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

    // Podium
    const p1 = document.getElementById('podium-1-name');
    const p2 = document.getElementById('podium-2-name');
    const p3 = document.getElementById('podium-3-name');
    
    if (p1) p1.innerText = sortedPlayers[0] ? sortedPlayers[0].name : '-';
    if (p2) p2.innerText = sortedPlayers[1] ? sortedPlayers[1].name : '-';
    if (p3) p3.innerText = sortedPlayers[2] ? sortedPlayers[2].name : '-';

    // Ranking Table
    rankingBody.innerHTML = '';
    let myRank = 0;
    let lastScore = -1;
    let currentRank = 0;

    sortedPlayers.forEach((p, index) => {
        const pScore = p.score || 0;
        if (pScore !== lastScore) {
            currentRank = index + 1;
            lastScore = pScore;
        }

        if (p.id === appState.playerId) {
            myRank = currentRank;
        }

        const row = document.createElement('tr');
        if (p.id === appState.playerId) row.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        
        row.innerHTML = `
            <td class="rank-num">#${currentRank}</td>
            <td class="rank-name">${p.name} ${p.id === appState.playerId ? '(Du)' : ''}</td>
            <td class="rank-score">${pScore} Pkt.</td>
        `;
        rankingBody.appendChild(row);
    });

    if (personalRankDisplay) personalRankDisplay.innerText = `Dein Rang: #${myRank}`;

    // Close any other modals
    document.querySelectorAll('.modal-overlay').forEach(m => {
        if (m.id !== 'game-over-modal') m.classList.remove('active');
    });
    
    // Show Game Over Modal
    modal.classList.add('active');

    // Winner effects
    if (isMe && typeof startConfetti === 'function') {
        startConfetti();
        if (typeof playSound === 'function') playSound('success');
    }
    const homeBtn = document.getElementById('btn-game-over-home');
    if (homeBtn) {
        homeBtn.onclick = () => {
            modal.classList.remove('active');
            leaveGame();
        };
    }
}

// --- Gameplay Logic ---

function handleBuzzerClick() {
    if (!appState.gameId) return;

    // Check Lock
    const now = Date.now();
    if (appState.lockedUntil && now < appState.lockedUntil) {
        const wait = Math.ceil((appState.lockedUntil - now) / 1000);
        showMessage('Gesperrt', `Du bist noch ${wait}s gesperrt!`);
        return;
    }

    // If locked by someone else (SPECTATOR MODE) -> Re-open Modal if closed
    if (appState.isLocked && appState.buzzerOwner !== appState.playerId) {
        // Check if we previously closed it
        if (appState.localModalClosed) {
            appState.localModalClosed = false;
            // Force re-sync / open
            const modal = document.getElementById('calc-modal');
            modal.classList.add('active'); // It should already be populated by sync
            modal.style.display = ''; // RESET inline hide from close button
            // Re-apply read-only just in case
            modal.classList.add('read-only');
        }
        return;
    }

    if (appState.isLocked && appState.buzzerOwner !== appState.playerId) return;

    // Firebase Transaction to claim buzzer
    const gameRef = db.ref(`games/${appState.gameId}`);

    gameRef.child('status').transaction((currentStatus) => {
        if (!currentStatus || !currentStatus.buzzerOwner) {
            return { buttonOwner: appState.playerId, timestamp: firebase.database.ServerValue.TIMESTAMP, buzzerOwner: appState.playerId };
        }
        return undefined;
    }, (error, committed) => {
        if (committed) {
            console.log('Buzzer claimed!');
            // Initialize Status
            gameRef.child('status').update({
                selection: [],
                modal: { isOpen: false, formula: '' }
            });
        }
    });
}

function handleBuzzerOwnerChange(ownerId, timestamp) {
    appState.buzzerOwner = ownerId;
    const isMe = (ownerId === appState.playerId);

    if (isMe) {
        buttons.buzzer.innerText = "WÄHLE 3 ZAHLEN!";
        buttons.buzzer.classList.add('active-buzzer');
        buttons.buzzer.classList.remove('buzzer-locked');
        buttons.buzzer.disabled = false;
        appState.isLocked = false;

        // Only start timer if modal is NOT open
        if (!document.getElementById('calc-modal').classList.contains('active')) {
            startSelectionTimer();
        }
    } else {
        const ownerName = appState.players[ownerId]?.name || 'Jemand';

        // Spectator Mode Check
        // If I am allowed to observe, I can click the buzzer to re-open the modal
        // Logic duplicated from handleModalSync
        const isHostOwner = (appState.hostId && ownerId === appState.hostId);
        const observeMode = (appState.settings && appState.settings.observeMode !== undefined) ? appState.settings.observeMode : true;
        const teacherBroadcast = (appState.settings && appState.settings.teacherBroadcast);
        const canObserve = appState.isHost || observeMode || (isHostOwner && teacherBroadcast);

        if (canObserve) {
            buttons.buzzer.innerText = `${ownerName} RECHNET... (ZUSCHAUEN)`;
            buttons.buzzer.classList.remove('active-buzzer');
            buttons.buzzer.classList.remove('buzzer-locked');
            buttons.buzzer.disabled = false; // Enable for "Re-Open" action
            buttons.buzzer.style.opacity = '1';
            buttons.buzzer.style.cursor = 'pointer';
        } else {
            buttons.buzzer.innerText = `${ownerName} RECHNET...`;
            buttons.buzzer.classList.remove('active-buzzer');
            buttons.buzzer.classList.remove('buzzer-locked');
            buttons.buzzer.disabled = true;
            buttons.buzzer.style.opacity = '0.7';
            buttons.buzzer.style.cursor = 'not-allowed';
        }

        appState.isLocked = true;

        // Clear any local selection timer if it was running (edge case)
        if (appState.selectionTimer) {
            clearInterval(appState.selectionTimer);
            appState.selectionTimer = null;
        }
    }
    updateGridSelection(); // Refresh dimming based on new owner

    // Update Modal Read-Only state if open
    const modal = document.getElementById('calc-modal');
    if (modal.classList.contains('active')) {
        if (isMe) modal.classList.remove('read-only');
        else modal.classList.add('read-only');
    }
}

function startSelectionTimer() {
    if (appState.selectionTimer) clearInterval(appState.selectionTimer);

    let timeLeft = 10;
    updateBuzzerTimerDisplay(timeLeft);

    appState.selectionTimer = setInterval(() => {
        timeLeft--;
        updateBuzzerTimerDisplay(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(appState.selectionTimer);
            handleSelectionTimeout();
        }
    }, 1000);
}

function updateBuzzerTimerDisplay(seconds) {
    if (appState.buzzerOwner === appState.playerId) {
        buttons.buzzer.innerHTML = `WÄHLE 3 ZAHLEN! <span style="font-size: 0.9rem; display: block; margin-top: 5px; color: #0f172a; font-weight: bold;">🔒 ${seconds}s</span>`;
    }
}

function handleSelectionTimeout() {
    if (appState.buzzerOwner !== appState.playerId) return;
    showMessage("Zu langsam!", "Du hast nicht rechtzeitig ausgewählt. 10s Sperre!");

    // Apply Penalty Logic locally -> Trigger standard failure path
    // We can reuse the failure part of validateAttempt logic?
    // Or simpler: Push a fail state or just set lockedUntil directly.

    const gameRef = db.ref(`games/${appState.gameId}`);
    const lockTime = Date.now() + 10000; // 10 seconds for timeout

    // Reset state & Lock
    const updates = {};
    updates[`players/${appState.playerId}/lockedUntil`] = lockTime;
    updates['status'] = null; // Clears buzzer owner
    gameRef.update(updates);
}

function resetBuzzerState() {
    appState.buzzerOwner = null;
    appState.isLocked = false;
    appState.selectedCells = [];
    if (appState.selectionTimer) {
        clearInterval(appState.selectionTimer);
        appState.selectionTimer = null;
    }
    updateGridSelection();

    buttons.buzzer.innerText = "TRIO!";
    buttons.buzzer.classList.remove('active-buzzer');
    buttons.buzzer.classList.remove('buzzer-locked');
    buttons.buzzer.disabled = false;

    // Class Mode Safeguard
    if (appState.settings && appState.settings.classMode) {
        buttons.buzzer.style.display = 'none';
    } else {
        buttons.buzzer.style.display = ''; // Restore default
    }

    // Check local lock
    if (appState.lockedUntil && appState.lockedUntil > Date.now()) {
        const wait = Math.ceil((appState.lockedUntil - Date.now()) / 1000);
        buttons.buzzer.innerHTML = `TRIO! <span style="font-size: 0.9rem; display: block; margin-top: 5px; color: var(--danger); font-weight: bold;">🔒 ${wait}s</span>`;
        buttons.buzzer.classList.add('buzzer-locked');
        buttons.buzzer.disabled = true;
    }
}

function handleCellClick(e) {
    if (appState.lockedUntil && appState.lockedUntil > Date.now()) return; // Block input if locked
    // Class Mode: No buzzer needed. Classic Mode: Must own buzzer.
    if (!appState.settings?.classMode && appState.buzzerOwner !== appState.playerId) return;

    const cell = e.target;
    // Handle clicking a dimmed cell -> Reset selection to just this cell if valid (removed per new logic)

    // pointer-events: none handles dimming logic usually, but we removed dimming for "others" only.
    // If I am owner, nothing is dimmed.

    const index = parseInt(cell.dataset.index);
    const existingIdx = appState.selectedCells.indexOf(index);
    let newSelection = [...appState.selectedCells];

    // Toggle logic
    if (existingIdx !== -1) {
        newSelection = newSelection.filter(i => i !== index);
    } else {
        if (newSelection.length >= 3) {
            flashInvalidCell(cell);
            return;
        }

        // Add tentatively and validate
        newSelection.push(index);

        if (validateSelection(newSelection)) {
            // Valid
        } else {
            flashInvalidCell(cell);
            return;
        }
    }

    updateSelection(newSelection);
}

function validateSelection(indices) {
    if (indices.length <= 1) return true;

    const s = appState.gridSize;
    // 1. Sort geographically (Row then Col) to ensure vectors are consistent
    const coords = indices.map(idx => {
        return { r: Math.floor(idx / s), c: idx % s };
    }).sort((a, b) => (a.r - b.r) || (a.c - b.c));

    // 2. Check Vector Consistency
    // Get Vector P1 -> P2
    const dr1 = coords[1].r - coords[0].r;
    const dc1 = coords[1].c - coords[0].c;

    // Valid Directions:
    // (0, 1), (1, 0), (1, 1), (1, -1)  <- Standard Neighbors (Dist 1)
    // (0, 2), (2, 0), (2, 2), (2, -2)  <- Skip 1 (Dist 2)
    // Basic check: |dr| == |dc| OR dr==0 OR dc==0

    if (Math.abs(dr1) !== Math.abs(dc1) && dr1 !== 0 && dc1 !== 0) return false; // Not linear/diagonal
    if (Math.max(Math.abs(dr1), Math.abs(dc1)) > 2) return false; // Gap too big (> 1 skipped)

    if (indices.length === 3) {
        // Get Vector P2 -> P3
        const dr2 = coords[2].r - coords[1].r;
        const dc2 = coords[2].c - coords[1].c;

        // Vectors MUST be identical for equidistance and collinearity
        if (dr1 !== dr2 || dc1 !== dc2) return false;
    }

    return true;
}

function flashInvalidCell(cell) {
    cell.classList.add('invalid-flash');
    setTimeout(() => cell.classList.remove('invalid-flash'), 400);
}




function updateSelection(newSel) {
    if (appState.settings && appState.settings.classMode) {
        appState.selectedCells = newSel;
        updateGridSelection();
        if (newSel.length === 3) openCalculationModal();
    } else {
        db.ref(`games/${appState.gameId}/status/selection`).set(newSel);

        if (newSel.length === 3) {
            // Auto-open modal if we are the owner
            openCalculationModal();
        }
    }
}



function updateGridSelection() {
    const cells = document.querySelectorAll('.grid-cell');
    // Class Mode always "owns" the board locally
    const isClassMode = appState.settings && appState.settings.classMode;
    const hasOwner = appState.buzzerOwner !== null || isClassMode;
    const isOwner = (appState.buzzerOwner === appState.playerId) || isClassMode;

    cells.forEach(c => {
        const idx = parseInt(c.dataset.index);
        c.classList.remove('selected', 'selected-border', 'dimmed', 'highlight-possible');
        c.style.filter = '';

        if (hasOwner) {
            if (appState.selectedCells.includes(idx)) {
                c.classList.add('selected-border');
            } else {
                if (!isOwner) {
                    c.classList.add('dimmed');
                }
            }
        }
    });
}    // --- Calculation Modal ---

let modalState = { formula: '', usedIndices: [] };

function handleModalSync(remoteState) {
    const modal = document.getElementById('calc-modal');
    const wasActive = modal.classList.contains('active');

    // 1. Open/Close State
    if (remoteState.isOpen) {

        // CHECK OBSERVE MODE BEFORE OPENING
        // Helper Vars (Declared ONCE)
        const headerOwner = appState.buzzerOwner;
        const isOwner = (headerOwner === appState.playerId);


        // --- VISIBILITY CHECK ---
        // If I am NOT the owner, check if I wanted to close this
        if (!isOwner && appState.localModalClosed) {
            return; // Data is enabled/updated, but we keep it hidden.
        }

        modal.classList.add('active');
        if (modal.style.display === 'none') modal.style.display = ''; // Unhide

        modal.style.display = 'flex';

        // Show Target
        const targetEl = document.getElementById('modal-target-display');
        if (targetEl) targetEl.innerText = `Ziel: ${appState.target}`;

        // Check local owner vs observer
        if (isOwner) {
            modal.classList.remove('read-only');
        } else {
            modal.classList.add('read-only');
            // Only populate if just opened to avoid wiping formula or rebuilding DOM constantly
            if (!wasActive) {
                // Initial open or reload
                populateModalButtons(true);
            }
        }

        // 2. Formula Sync (Respect Observe Mode)
        // (Redundant check removed as we return early above if !observeMode)

        if (remoteState.formula !== undefined) {
            modalState.formula = remoteState.formula;
            updateFormulaDisplay();
        }

        // 3. Used Indices Sync
        if (remoteState.usedIndices) {
            modalState.usedIndices = remoteState.usedIndices || [];
            // Update Visuals
            const numPad = document.getElementById('modal-numpad');
            if (numPad) {
                Array.from(numPad.children).forEach(btn => {
                    const idx = parseInt(btn.dataset.index);
                    if (modalState.usedIndices.includes(idx)) btn.classList.add('used');
                    else btn.classList.remove('used');
                });
            }
        }

        // 4. History Sync
        if (remoteState.history) {
            modalState.history = remoteState.history || [];
        }

    } else {
        closeCalculationModal(false); // Local close without push
        // Reset local close state so next time it opens fresh
        appState.localModalClosed = false;
    }
}

function openCalculationModal() {
    if (appState.settings && appState.settings.classMode) {
        // Local Open for Class Mode
        const modal = document.getElementById('calc-modal');
        modal.classList.add('active');
        modal.classList.remove('read-only');
        const targetEl = document.getElementById('modal-target-display');
        if (targetEl) targetEl.innerText = `Ziel: ${appState.target}`;
        populateModalButtons();
    } else {
        // Only owner calls this via updateSelection(3)
        if (appState.buzzerOwner !== appState.playerId) return;

        // Clear Selection Timer
        if (appState.selectionTimer) {
            clearInterval(appState.selectionTimer);
            appState.selectionTimer = null;
        }

        db.ref(`games/${appState.gameId}/status/modal`).set({
            isOpen: true,
            formula: '',
            usedIndices: []
        });

        populateModalButtons(); // Owner resets formula initially
    }
}

function populateModalButtons(preserveFormula = false) {
    // Safety Check: Grid must be loaded
    if (!appState.gridData || appState.gridData.length === 0) {
        console.warn("populateModalButtons: Grid not ready, skipping.");
        return;
    }

    const numPad = document.getElementById('modal-numpad');
    numPad.innerHTML = '';

    if (!preserveFormula) {
        modalState.formula = '';
        modalState.usedIndices = [];
        modalState.usedIndices = [];
        modalState.history = []; // Clear history
    } else {
        // Attempt to reconstruct history from formula string for validation context
        // Only if history is NOT already present (e.g. from sync)
        if (!modalState.history) modalState.history = [];

        if (modalState.history.length === 0 && modalState.formula.length > 0) {
            const lastChar = modalState.formula.slice(-1);
            const isDigit = /[0-9]/.test(lastChar);
            // Push a dummy history item to set context
            modalState.history.push({
                type: isDigit ? 'num' : 'op',
                idx: -1,
                dummy: true,
                // Best-effort prevFormula for dummy items to prevent crash
                prevFormula: modalState.formula.slice(0, -1)
            });
        }
    }
    // If preserving, we keep formula but we might need to recalc usedIndices?
    // Actually formula string doesn't tell us used indicies easily unless we parse.
    // But for Reload, we get formula from Remote, but usedIndices??
    // We can't easily reconstruct usedIndices from formula string alone (e.g. if two 3s exist).
    // STRICT MODE: We probably need to sync usedIndices to firebase too if we want perfect resume.
    // For now: If preserving (Reload), we assume usedIndices is empty or best effort.
    // BUT: If usedIndices is empty, buttons won't be grayed out!
    // The user said "numbers disappear".
    // Let's at least show the numbers.
    updateFormulaDisplay();

    appState.selectedCells.forEach(idx => {
        const num = appState.gridData[idx];
        const btn = document.createElement('button');
        btn.className = 'btn-calc num-btn';
        btn.innerText = num;
        btn.dataset.index = idx;

        // Restore used class for persistence
        if (modalState.usedIndices.includes(idx)) {
            btn.classList.add('used');
        }

        btn.onclick = () => handleNumClick(num, idx, btn);
        numPad.appendChild(btn);
    });

    // Attach listeners only once or re-attach safely?
    // They are global IDs. Re-attaching is fine.
    document.getElementById('btn-solve').onclick = submitSolution;
    document.querySelectorAll('.btn-calc.op').forEach(b => {
        b.onclick = () => handleOpClick(b.dataset.op, b);

        // Difficulty Check for Visibility
        // Fallback: If appState.difficulty is null (reload race condition), check DOM or default to normal?
        let currentDiff = appState.difficulty;
        if (!currentDiff && inputs.difficulty) {
            currentDiff = inputs.difficulty.value || 'normal';
        }

        if (currentDiff === 'normal') {
            if (b.dataset.op === '/' || b.dataset.op === '(' || b.dataset.op === ')') {
                b.style.display = 'none';
            } else {
                b.style.display = '';
            }
        } else if (currentDiff === 'advanced') {
            if (b.dataset.op === '*' || b.dataset.op === '(' || b.dataset.op === ')') {
                b.style.display = 'none';
            } else {
                b.style.display = '';
            }
        } else {
            b.style.display = '';
        }

        // Restore used class for operators
        if (['+', '-', '*', '/'].includes(b.dataset.op) && modalState.formula.includes(b.dataset.op)) {
            b.classList.add('used');
        } else {
            b.classList.remove('used');
        }
    });
    document.getElementById('btn-clear').onclick = handleClear;
    const btnBack = document.getElementById('btn-backspace');
    if (btnBack) btnBack.onclick = handleBackspace;

    // Give Up Button - Available for the active player
    const btnGiveUp = document.getElementById('btn-give-up');
    if (btnGiveUp) {
        btnGiveUp.onclick = handleGiveUp;
        // Only show if I am the active player (Buzzer Owner) or Class Mode
        if ((appState.settings && appState.settings.classMode) || appState.buzzerOwner === appState.playerId) {
            btnGiveUp.style.display = 'block';
            btnGiveUp.innerText = "AUFGEBEN (15s)";
        } else {
            btnGiveUp.style.display = 'none';
        }
    }
}

// Handle Give Up - Player voluntarily forfeits their turn with 15s penalty
function handleGiveUp() {
    if (!appState.settings?.classMode && appState.buzzerOwner !== appState.playerId) return;

    showConfirm(
        "Aufgeben?",
        "Möchtest du wirklich aufgeben? Du erhältst eine 15s Sperre.",
        () => {
            // Close the calculation modal
            document.getElementById('calc-modal').classList.remove('active');
            document.getElementById('calc-modal').style.display = '';

            // Apply 15s penalty
            const gameRef = db.ref(`games/${appState.gameId}`);
            const lockTime = Date.now() + 15000; // 15 seconds penalty

            // Reset state & Lock
            const updates = {};
            updates[`players/${appState.playerId}/lockedUntil`] = lockTime;
            updates['status'] = null; // Clears buzzer owner
            gameRef.update(updates);

            // Reset local selection
            updateSelection([]);

            // Show message
            showMessage("Aufgegeben", "Du bist für 15s gesperrt.");
        }
    );
}

function closeCalculationModal(push = true) {
    document.getElementById('calc-modal').classList.remove('active');
    document.getElementById('calc-modal').style.display = '';

    if (appState.settings && appState.settings.classMode) {
        updateSelection([]);
    } else if (push && appState.gameId && appState.buzzerOwner === appState.playerId) {
        db.ref(`games/${appState.gameId}/status/modal`).set({ isOpen: false });
        // Reset selection too
        updateSelection([]);
        // Reset buzzer? No, buzzer reset happens on correct/penalty.
        // If they just close check penalty logic?? 
        // For now assumes submit is the way out.
    }
}

function updateRemoteFormula() {
    if (appState.settings && appState.settings.classMode) return;
    if (appState.buzzerOwner === appState.playerId) {
        db.ref(`games/${appState.gameId}/status/modal`).update({
            formula: modalState.formula,
            usedIndices: modalState.usedIndices,
            history: modalState.history
        });
    }
}





function handleNumClick(num, idx, btn) {
    if (!appState.settings?.classMode && appState.buzzerOwner !== appState.playerId) return;
    if (modalState.usedIndices.includes(idx)) return;

    const prev = modalState.formula;

    // Check consecutive numbers restriction
    // If last char is a digit or ends with number, prevent.
    // Actually we deal with multichar numbers? No, digits are single.
    // BUT user said "2 numbers consecutive". 19 is consecutive. 1 9.
    // Do we allow 19? The request says "never 2 numbers consecutive without operator".
    // This implies we cannot form multi-digit numbers?
    // "1-9" is single digit. "1-20" is double digit.
    // But these are TILES. The tiles are treated as atomic numbers.
    // So "19" is one tile. "5" is one tile.
    // The issue is clicking "5" then "3" -> "53".
    // We want to force "5 + 3".
    // So if the last inputs was a 'num' type in history, prevent.
    if (modalState.history && modalState.history.length > 0) {
        const last = modalState.history[modalState.history.length - 1];
        if (last.type === 'num') {
            if (btn) flashInvalidElement(btn);
            return; // Block consecutive numbers
        }
    }

    if (!modalState.history) modalState.history = [];
    modalState.history.push({ type: 'num', idx: idx, prevFormula: prev });

    modalState.formula += num;
    modalState.usedIndices.push(idx);
    btn.classList.add('used');

    updateRemoteFormula();
    updateFormulaDisplay();
}

function handleOpClick(op, btn) {
    if (!appState.settings?.classMode && appState.buzzerOwner !== appState.playerId) return;

    const prev = modalState.formula;

    // RULE: Start with Number validations (handled by history check)
    // If first input, MUST be a number?
    if (!modalState.history || modalState.history.length === 0) {
        if (op !== '(') {
            if (btn) flashInvalidElement(btn);
            return;
        }
    }

    // --- VALIDATION & FEEDBACK LOGIC ---

    // Helper to flash existing operator in display
    const flashExistingOp = (opsToFind) => {
        const spans = document.getElementById('formula-display').querySelectorAll('.char-op');
        spans.forEach(span => {
            if (opsToFind.includes(span.dataset.char)) {
                flashInvalidElement(span);
            }
        });
    };

    const hasPlus = modalState.formula.includes('+');
    const hasMinus = modalState.formula.includes('-');
    const hasMult = modalState.formula.includes('*');
    const hasDiv = modalState.formula.includes('/');

    // 1. Line Operator Conflict (+/-)
    if (['+', '-'].includes(op)) {
        if (hasPlus || hasMinus) {
            if (btn) flashInvalidElement(btn);
            flashExistingOp(['+', '-']);
            return;
        }
    }

    // 2. Point Operator Conflict (* or /) - Validation depends on Difficulty
    if (['*', '/'].includes(op)) {
        // In Normal/Advanced, only ONE point op is allowed usually?
        // Normal: (A * B) +/- C.  One *.
        // Advanced: (A / B) +/- C. One /.
        // Profi: Mixed. One Point, One Line. So One Point max.
        // So in ALL modes, max 1 Point op is a safe rule based on game design?
        // Let's assume yes: "never 2 operationszeichen" implies structure limit?
        // Actually, the user prompts specifically asked for "Kombination von */: mit +/-".
        // This implicitly limits to one of each pair type for Profi too.

        if (hasMult || hasDiv) {
            if (btn) flashInvalidElement(btn);
            flashExistingOp(['*', '/']);
            return;
        }
    }

    // 3. Consecutive Operators (except parens)
    if (modalState.history && modalState.history.length > 0) {
        const last = modalState.history[modalState.history.length - 1];
        if (last.type === 'op' && ['+', '-', '*', '/'].includes(last.op) && ['+', '-', '*', '/'].includes(op)) {
            if (btn) flashInvalidElement(btn);
            return;
        }
    }

    // History Update
    if (!modalState.history) modalState.history = [];
    modalState.history.push({ type: 'op', prevFormula: prev, op: op });

    modalState.formula += op;

    // Visual Feedback (mark used if single-use logic applies, which it does for ops in this game)
    if (btn && ['+', '-', '*', '/'].includes(op)) {
        btn.classList.add('used');
    }

    updateRemoteFormula();
    updateFormulaDisplay();
}

function flashInvalidElement(el) {
    el.style.border = "2px solid red";
    el.style.animation = "shake 0.3s";
    setTimeout(() => {
        el.style.border = "";
        el.style.animation = "";
    }, 400);
}

function handleBackspace() {
    if (!modalState.history || modalState.history.length === 0) return;

    const lastAction = modalState.history.pop();

    if (lastAction.prevFormula !== undefined) {
        modalState.formula = lastAction.prevFormula;
    } else {
        // Fallback for dummy history items without prevFormula
        // Just remove the last character to avoid crash
        modalState.formula = modalState.formula.slice(0, -1);
    }

    if (lastAction.type === 'num') {
        // Remove from usedIndices (it's the last added index? YES, if we push consecutively)
        // But better to use filter or indexOf to be safe?
        // lastAction.idx is robust.
        modalState.usedIndices = modalState.usedIndices.filter(i => i !== lastAction.idx);

        // UI Update: Remove .used
        const btn = document.querySelector(`.num-btn[data-index="${lastAction.idx}"]`);
        if (btn) btn.classList.remove('used');
    }

    updateRemoteFormula();
    updateFormulaDisplay();

    // Also update operators used state?
    // handleOpClick logic re-checks operators in `updateLobby`? No, `renderCalculationModal`.
    // We should trigger that update.
    // Simplest: Call `updateOperatorButtonsState()` if we extract it, or copy logic.
    // Let's iterate operators and update classes.
    document.querySelectorAll('.btn-calc.op').forEach(b => {
        if (['+', '-', '*', '/'].includes(b.dataset.op) && modalState.formula.includes(b.dataset.op)) {
            b.classList.add('used');
        } else {
            b.classList.remove('used');
        }
    });
}

function handleClear() {
    if (!appState.settings?.classMode && appState.buzzerOwner !== appState.playerId) return;
    modalState.formula = '';
    modalState.usedIndices = [];
    modalState.history = [];
    document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('used'));
    document.querySelectorAll('.btn-calc.op').forEach(b => b.classList.remove('used'));

    updateRemoteFormula();
    updateFormulaDisplay();
}

function updateFormulaDisplay() {
    const container = document.getElementById('formula-display');
    container.innerHTML = ''; // Clear current

    // Parse formula into tokens for granular display
    // Tokens: Numbers (sequences of digits), Operators, Parens
    // Regex: Split by boundaries but keep delimiters. 
    // Actually, we can just iterate chars if we want char-level control, 
    // OR we can tokenize properly. 
    // For "12 + 5", we want "12", " ", "+", " ", "5".
    // But since we built it char by char, maybe we treat each char as a span?
    // "12" is visually one block usually. But flashing "1" and "2" separately is fine.
    // However, for operators like "+", it is a single char.
    // Let's do CHAR based for simplicity and max control.

    const chars = modalState.formula.split('');
    chars.forEach((char, index) => {
        const span = document.createElement('span');

        let displayChar = char;
        if (char === '*') displayChar = '·';
        if (char === '/') displayChar = ':';

        span.innerText = displayChar;
        span.dataset.char = char; // Store real value
        span.dataset.index = index;

        // Styling classes
        if (['+', '-', '*', '/', '(', ')'].includes(char)) span.className = 'char-op';
        else if (/[0-9]/.test(char)) span.className = 'char-num';
        else span.className = 'char-other';

        container.appendChild(span);
    });
}


function submitSolution() {
    const solveBtn = document.getElementById('btn-solve');
    if (!modalState.formula) {
        flashInvalidElement(solveBtn);
        return;
    }

    // Client-Side Structure Validation
    let check = { valid: true };

    // Ensure helper functions are available (hoisted)
    if (typeof checkNormal === 'function') {
        if (appState.difficulty === 'crazy') {
            const p = checkProfi(modalState.formula);
            const a = checkAdvanced(modalState.formula);
            const n = checkNormal(modalState.formula);
            if (!p.valid && !a.valid && !n.valid) {
                check = { valid: false, reason: "Ungültiges Format (Entspricht keinem Muster)." };
            }
        } else if (appState.difficulty === 'pro') {
            check = checkProfi(modalState.formula);
        } else if (appState.difficulty === 'advanced') {
            check = checkAdvanced(modalState.formula);
        } else {
            // Normal (default)
            check = checkNormal(modalState.formula);
        }
    }

    if (!check.valid) {
        flashInvalidElement(solveBtn);
        showMessage("Ungültig", check.reason || "Formel entspricht nicht den Regeln.");

        // Specific Profi Feedback (Parentheses)
        if (appState.difficulty === 'pro' && check.reason.includes('Klammern')) {
            const openBtn = document.querySelector('.btn-calc.op[data-op="("]');
            const closeBtn = document.querySelector('.btn-calc.op[data-op=")"]');
            if (openBtn) flashInvalidElement(openBtn);
            if (closeBtn) flashInvalidElement(closeBtn);
        }
        return;
    }

    try { calculateFormula(modalState.formula); } catch (e) {
        flashInvalidElement(solveBtn);
        showMessage('Fehler', "Ungültige Formel");
        return;
    }

    const attempt = {
        playerId: appState.playerId,
        playerName: appState.playerName || 'Spieler',
        indices: appState.selectedCells,
        formula: modalState.formula,
        target: appState.target,
        currentIndex: (appState.settings?.classMode && appState.players[appState.playerId]) ? appState.players[appState.playerId].currentSolutionIndex : null
    };

    db.ref(`games/${appState.gameId}/attempts`).push(attempt);
    updateLastActive(); // Keep game alive
    closeCalculationModal();
}

function calculateFormula(str) {
    if (/[^0-9+\-*/().\s]/.test(str)) throw new Error("Invalid chars");
    return Function(`'use strict'; return (${str})`)();
}

function handleAttemptsHost(attemptsDict) {
    // Usually child_added listener handles this. 
    // We attach it once.
}

let currentAttachedGameId = null;
function attachHostLogic(gameId) {
    if (currentAttachedGameId === gameId) return;
    currentAttachedGameId = gameId;
    db.ref(`games/${gameId}/attempts`).on('child_added', snapshot => {
        validateAttempt(snapshot.val(), snapshot.key);
    });
}
// Attach on create
// Modified: We call this if appState.isHost inside subscribe or create
// Let's call it in subscribe loop if isHost and not attached

// Validation Helpers
function checkNormal(f) {
    const countMult = (f.match(/\*/g) || []).length;
    const countPlus = (f.match(/\+/g) || []).length;
    const countMinus = (f.match(/-/g) || []).length;

    if (countMult !== 1) return { valid: false, reason: "Es muss genau eine Mal-Rechnung enthalten sein!" };
    if (countPlus + countMinus !== 1) return { valid: false, reason: "Es muss genau eine Plus- oder Minus-Rechnung enthalten sein!" };
    if (f.trim().startsWith('-')) return { valid: false, reason: "Keine negativen Startzahlen erlaubt." };

    // Position checks removed per user request: a-b*c allowed.
    return { valid: true };
}

function checkAdvanced(f) {
    const countDiv = (f.match(/\//g) || []).length;
    const countPlus = (f.match(/\+/g) || []).length;
    const countMinus = (f.match(/-/g) || []).length;

    if (countDiv !== 1) return { valid: false, reason: "Es muss genau eine Geteilt-Rechnung enthalten sein!" };
    if (countPlus + countMinus !== 1) return { valid: false, reason: "Es muss genau eine Plus- oder Minus-Rechnung enthalten sein!" };
    if (f.trim().startsWith('-')) return { valid: false, reason: "Keine negativen Startzahlen erlaubt." };

    // Position checks removed per user request.
    return { valid: true };
}

function checkProfi(f) {
    if (!f.includes('(') || !f.includes(')')) return { valid: false, reason: "Es müssen Klammern verwendet werden!" };

    const hasMultDiv = f.includes('*') || f.includes('/');
    const hasPlusMinus = f.includes('+') || f.includes('-');
    if (!hasMultDiv || !hasPlusMinus) return { valid: false, reason: "Es müssen Strich- UND Punktrechnung (mit Klammern) enthalten sein!" };

    const match = f.match(/\(([^)]+)\)/);
    if (match) {
        const innerContent = match[1];
        if (innerContent.includes('*') || innerContent.includes('/')) {
            return { valid: false, reason: "Ungültige Struktur! Punktrechnung darf nicht in der Klammer stehen." };
        }
    }
    return { valid: true };
}

function validateAttempt(attempt, attemptKey) {
    const gameRef = db.ref(`games/${appState.gameId}`);
    let valid = false;
    let failReason = null;
    let result = null;
    let score = 1;

    try {
        result = calculateFormula(attempt.formula);

        // Math Check First
        let target = attempt.target;
        if (appState.settings && appState.settings.classMode && appState.allSolutions && attempt.currentIndex !== undefined) {
            // Validate against the server-side target for this index
            const sol = appState.allSolutions[attempt.currentIndex];
            if (sol) target = sol.result;
        }

        if (Math.abs(result - target) > 0.001) {
            failReason = `Ergebnis ${result} stimmt nicht mit Ziel ${target} überein.`;
        } else {
            // Structure Check
            console.log("Validating Difficulty:", appState.difficulty);

            if (appState.difficulty === 'crazy') {
                const p = checkProfi(attempt.formula);
                if (p.valid) { score = 3; valid = true; }
                else {
                    const a = checkAdvanced(attempt.formula);
                    if (a.valid) { score = 2; valid = true; }
                    else {
                        const n = checkNormal(attempt.formula);
                        if (n.valid) { score = 1; valid = true; }
                        else {
                            failReason = "Ungültiges Format für 'Verrückt'! (Muss Normal, Fortgeschritten oder Profi Muster sein).";
                        }
                    }
                }
            } else if (appState.difficulty === 'pro') {
                const c = checkProfi(attempt.formula);
                if (c.valid) valid = true;
                else failReason = c.reason;
            } else if (appState.difficulty === 'advanced') {
                const c = checkAdvanced(attempt.formula);
                if (c.valid) valid = true;
                else failReason = c.reason;
            } else {
                // Normal (default)
                const c = checkNormal(attempt.formula);
                if (c.valid) valid = true;
                else failReason = c.reason;
            }
        }
    } catch (e) {
        failReason = "Ungültige Formel (Syntaxfehler).";
    }

    const resultData = {
        correct: valid,
        score: valid ? score : 0,
        playerId: attempt.playerId,
        playerName: attempt.playerName || 'Unbekannt',
        target: attempt.target,
        formula: attempt.formula,
        reason: valid ? null : (failReason || "Das Ergebnis ist leider falsch."),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    gameRef.child('status/result').set(resultData);
    db.ref(`games/${appState.gameId}/attempts/${attemptKey}`).remove();

    if (valid) {
        gameRef.child(`players/${attempt.playerId}/score`).transaction(current => {
            return (current || 0) + score;
        }, (error, committed, snapshot) => {
            if (committed) {
                const newScore = snapshot.val();
                if (appState.winningScore && newScore >= appState.winningScore) {
                    gameRef.update({
                        state: 'finished',
                        winner: attempt.playerId
                    });
                }
            }
        });

        // Reset all penalty timers when someone solves correctly
        // This allows everyone to participate in the new round
        if (appState.players) {
            const penaltyResets = {};
            Object.keys(appState.players).forEach(pid => {
                penaltyResets[`players/${pid}/lockedUntil`] = null;
            });
            gameRef.update(penaltyResets);
        }

        // CLASS MODE: Individual Progress
        if (appState.settings && appState.settings.classMode) {
            gameRef.child(`players/${attempt.playerId}/currentSolutionIndex`).transaction(curr => (curr || 0) + 1);
            // No global reset
        } else {
            // CLASSIC MODE: Global Reset
            gameRef.child('status').set(null);
            generateNewTarget();
        }
    } else {
        // Hardcore Mode: Point Deduction
        if (appState.settings && appState.settings.hardcoreMode) {
            gameRef.child(`players/${attempt.playerId}/score`).transaction(current => {
                // Allow negative? "Minuspunkt". current - 1.
                // Assuming default 0 start. 0 -> -1.
                return (current || 0) - 1;
            });
        }

        // 15s Penalty for wrong calculation
        const lockTime = Date.now() + 15000;
        gameRef.child(`players/${attempt.playerId}/lockedUntil`).set(lockTime);
        gameRef.child('status').set(null);
    }
}

function startPenaltyCountdown() {
    if (appState.penaltyInterval) clearInterval(appState.penaltyInterval);
    if (!appState.lockedUntil || appState.lockedUntil <= Date.now()) {
        appState.lockedUntil = null;
        // Reset button text if not buzzer owner
        if (appState.buzzerOwner === null) {
            buttons.buzzer.innerText = "TRIO!";
            buttons.buzzer.classList.remove('buzzer-locked');
            buttons.buzzer.disabled = false;
        }
        return;
    }

    buttons.buzzer.disabled = true;
    appState.penaltyInterval = setInterval(() => {
        const remaining = Math.ceil((appState.lockedUntil - Date.now()) / 1000);

        // Class Mode: Show countdown in Rank Display
        if (appState.settings && appState.settings.classMode) {
            updateRankDisplay();
        }

        // CHECK: Is someone else calculating? If so, enable "Anschauen" despite penalty! (Classic Mode Only)
        if (!appState.settings?.classMode && appState.buzzerOwner && appState.buzzerOwner !== appState.playerId) {
            buttons.buzzer.innerText = "Anschauen";
            buttons.buzzer.classList.remove('buzzer-locked');
            buttons.buzzer.disabled = false;
        } else if (remaining <= 0) {
            clearInterval(appState.penaltyInterval);
            appState.lockedUntil = null;
            if (appState.settings && appState.settings.classMode) {
                // Restore Rank Display
                updateRankDisplay();
            } else if (appState.buzzerOwner === null) {
                buttons.buzzer.innerText = "TRIO!";
                buttons.buzzer.classList.remove('buzzer-locked');
                buttons.buzzer.disabled = false;
            }
        } else {
            if (!appState.settings?.classMode) {
                buttons.buzzer.innerHTML = `TRIO! <span style="font-size: 0.9rem; display: block; margin-top: 5px; color: var(--danger); font-weight: bold;">🔒 ${remaining}s</span>`;
                buttons.buzzer.classList.add('buzzer-locked');
                buttons.buzzer.disabled = true;
            }
        }
    }, 1000);

    // Initial immediate update
    const remaining = Math.ceil((appState.lockedUntil - Date.now()) / 1000);
    if (appState.settings && appState.settings.classMode) {
        // This is now handled by updateRankDisplay, which checks appState.lockedUntil
        // and updates the rankFooter.
        updateRankDisplay();
    } else if (appState.buzzerOwner && appState.buzzerOwner !== appState.playerId) {
        buttons.buzzer.innerText = "Anschauen";
        buttons.buzzer.classList.remove('buzzer-locked');
        buttons.buzzer.disabled = false;
    } else {
        buttons.buzzer.innerHTML = `TRIO! <span style="font-size: 0.9rem; display: block; margin-top: 5px; color: var(--danger); font-weight: bold;">🔒 ${remaining}s</span>`;
        buttons.buzzer.classList.add('buzzer-locked');
        buttons.buzzer.disabled = true;
    }
}

function generateNewTarget() {
    // Only target
    if (!appState.currSolutions || appState.currSolutions.length === 0) {
        // Find solutions if missing
        appState.currSolutions = findSolutions(appState.gridData, appState.gridSize, appState.difficulty);
    }
    
    // Filter out used targets if they exist in state
    const used = appState.usedTargets || [];
    const availableSolutions = appState.currSolutions.filter(s => !used.includes(s.result));
    
    if (availableSolutions.length > 0) {
        const t = availableSolutions[Math.floor(Math.random() * availableSolutions.length)].result;
        
        // Update target and append to usedTargets atomically
        const gameRef = db.ref(`games/${appState.gameId}`);
        gameRef.child('usedTargets').transaction(current => {
            const arr = current || [];
            if (!arr.includes(t)) arr.push(t);
            return arr;
        });
        gameRef.update({ target: t, veto: null });
    } else {
        // All unique results used? Regenerate Grid
        console.log("All unique targets used. Regenerating grid...");
        startGameAction();
    }
}

// --- Helpers + Renderers (Unified) ---

function handleSkipClick() {
    if (!appState.gameId || !appState.playerId) return;

    // Check Cooldown
    const cooldown = parseInt(localStorage.getItem('skipCooldown') || '0');
    if (cooldown > Date.now()) return;

    // Set Cooldown (20 seconds)
    const newCooldown = Date.now() + 20000;
    localStorage.setItem('skipCooldown', newCooldown);

    // Disable Button Locally
    const voteBtn = document.getElementById('btn-vote-veto');
    if (voteBtn) {
        voteBtn.disabled = true;
        voteBtn.innerText = "Warten (20s)";
    }

    // Increment Index directly
    const playerRef = db.ref(`games/${appState.gameId}/players/${appState.playerId}`);
    playerRef.child('currentSolutionIndex').transaction(current => (current || 0) + 1);

    // Clear selection
    appState.selectedCells = [];
    updateGridSelection();
    closeCalculationModal(false);
}

function handleClassReroll() {
    if (!appState.gameId || !appState.playerId) return;

    const cooldownKey = 'rerollCooldown';
    const cooldown = parseInt(localStorage.getItem(cooldownKey) || '0');
    const remaining = Math.ceil((cooldown - Date.now()) / 1000);

    if (remaining > 0) {
        showMessage("Wartezeit", `Bitte warte noch ${remaining}s bis zum nächsten Wechsel.`);
        return;
    }

    showConfirm("Zielzahl wechseln?", "Möchtest du die Zielzahl wirklich überspringen? (30s Cooldown)", () => {
        // Set Cooldown (30 seconds)
        localStorage.setItem(cooldownKey, Date.now() + 30000);

        // Execute Skip (Same logic as Skip button really, just different trigger/cooldown)
        // Increment Index directly
        const playerRef = db.ref(`games/${appState.gameId}/players/${appState.playerId}`);
        playerRef.child('currentSolutionIndex').transaction(current => (current || 0) + 1);

        // Clear selection
        appState.selectedCells = [];
        updateGridSelection();
        closeCalculationModal(false);

        showMessage("Erledigt", "Zielzahl wurde gewechselt.");
        updateRerollTimer();
    });
}

function updateRerollTimer() {
    const btn = document.getElementById('btn-vote-refresh');
    const timer = document.getElementById('reroll-timer');
    if (!btn || !timer) return;

    if (!appState.settings?.classMode) {
        timer.style.display = 'none';
        return;
    }

    const cooldownKey = 'rerollCooldown';
    const cooldown = parseInt(localStorage.getItem(cooldownKey) || '0');
    const remaining = Math.ceil((cooldown - Date.now()) / 1000);

    if (remaining > 0) {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        timer.style.display = 'block';
        timer.innerText = `${remaining}s`;

        // Schedule next update if not already running
        if (!appState.rerollTimerInterval) {
            appState.rerollTimerInterval = setInterval(updateRerollTimer, 1000);
        }
    } else {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        timer.style.display = 'none';

        if (appState.rerollTimerInterval) {
            clearInterval(appState.rerollTimerInterval);
            appState.rerollTimerInterval = null;
        }
    }
}

function updateVetoUI(vetoMap, totalPlayers) {
    let vetoEl = document.getElementById('veto-counter');
    if (!vetoEl) {
        vetoEl = document.createElement('div');
        vetoEl.id = 'veto-counter';
        // Styling...
        if (elements.targetNumber && elements.targetNumber.parentNode)
            elements.targetNumber.parentNode.appendChild(vetoEl);

        const btn = document.createElement('button');
        btn.innerText = "Zielzahl wechseln";
        btn.className = 'btn-secondary';
        btn.style.marginTop = '10px';
        btn.onclick = () => {
            db.ref(`games/${appState.gameId}/veto/${appState.playerId}`).set(true);
        };
        if (elements.targetNumber && elements.targetNumber.parentNode)
            elements.targetNumber.parentNode.appendChild(btn);
    }
    vetoEl.innerText = `${Object.keys(vetoMap).length}/${Math.ceil(totalPlayers / 2) + 1} Stimmen`;
}

function checkVetoThreshold(vetoMap, totalPlayers) {
    if (Object.keys(vetoMap).length > totalPlayers * 0.5) generateNewTarget();
}

function generateGridData(size) {
    const totalCells = size * size;
    let max = 9;
    let min = 1;
    let maxTarget = 50;

    // Range Logic
    // Default to base if unspeicified or 'base'
    if (appState.numberRange === 'extended') {
        max = 19; // "1-19"
        maxTarget = 100; // "Zielzahl 100"
    } else {
        // base
        max = 9; // "1-9"
        maxTarget = 50; // "Zielzahl bis 50"
    }

    const newGrid = [];
    for (let i = 0; i < size * size; i++) {
        let num = Math.floor(Math.random() * (max - min + 1)) + min;
        newGrid.push(num);
    }

    const solutions = findSolutions(newGrid, size, appState.difficulty, maxTarget);

    // --- Validation Analysis ---
    const possibleSet = new Set(solutions.map(s => s.result));
    const impossible = [];
    for (let i = 1; i <= maxTarget; i++) {
        if (!possibleSet.has(i)) impossible.push(i);
    }
    console.group(`🎲 Analyse für Modus: ${appState.difficulty.toUpperCase()}`);
    console.log(`Zahlenraum: 1 bis ${maxTarget}`);
    console.log(`Anzahl Lösungen: ${solutions.length}`);
    if (impossible.length > 0) {
        console.log(`🚫 Unmögliche Zielzahlen (${impossible.length}):`, impossible.join(', '));
    } else {
        console.log("✅ Alle Zahlen im Bereich sind möglich!");
    }
    console.groupEnd();
    // ---------------------------

    return { grid: newGrid, solutions };
}

function getNumberColor(num) {
    // Use Golden Angle (approx 137.5 degrees) to maximize contrast between sequential numbers
    // Base Hue shift helps avoid too many reds/pinks if starting at 0
    const hue = (num * 137.508) % 360;
    return `hsl(${hue}, 70%, 50%)`;
}

function findSolutions(grid, size, difficulty, maxTarget = 50) {
    const solutions = [];
    const addSol = (nums, result) => { if (Number.isInteger(result) && result > 0 && result <= maxTarget) solutions.push({ result, nums }); };

    // Simple Loop (Reuse earlier logic)
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size - 2; col++) {
            const idx = row * size + col;
            tryAdd([grid[idx], grid[idx + 1], grid[idx + 2]], difficulty, addSol);
        }
    }
    for (let col = 0; col < size; col++) {
        for (let row = 0; row < size - 2; row++) {
            const idx = row * size + col;
            tryAdd([grid[idx], grid[idx + size], grid[idx + size * 2]], difficulty, addSol);
        }
    }

    // Diagonal TL-BR
    for (let row = 0; row < size - 2; row++) {
        for (let col = 0; col < size - 2; col++) {
            const idx = row * size + col;
            // idx, idx+(s+1), idx+2*(s+1)
            tryAdd([grid[idx], grid[idx + size + 1], grid[idx + 2 * (size + 1)]], difficulty, addSol);
        }
    }

    // Diagonal TR-BL
    for (let row = 0; row < size - 2; row++) {
        for (let col = 2; col < size; col++) {
            const idx = row * size + col;
            // idx, idx+(s-1), idx+2*(s-1)
            tryAdd([grid[idx], grid[idx + size - 1], grid[idx + 2 * (size - 1)]], difficulty, addSol);
        }
    }
    return solutions;
}

function tryAdd(triplet, diff, addSol) {
    const [a, b, c] = triplet;
    if (diff === 'normal') {
        // Normal: (A * B) +/- C (Target structure, but we try permutations because user picks 3 numbers)
        // User selects 3 numbers. We need to see if ANY combination of them fits (A*B)+/-C
        // Permutations: [a,b,c], [a,c,b], [b,a,c], [b,c,a], [c,a,b], [c,b,a]

        const perms = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];

        perms.forEach(p => {
            // (p0 * p1) + p2
            addSol(triplet, (p[0] * p[1]) + p[2]);
            // (p0 * p1) - p2
            addSol(triplet, (p[0] * p[1]) - p[2]);
        });
    } else if (diff === 'advanced') {
        // Advanced: (A / B) +/- C
        const perms = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];

        perms.forEach(p => {
            // (p0 / p1) + p2
            addSol(triplet, (p[0] / p[1]) + p[2]);
            // (p0 / p1) - p2
            addSol(triplet, (p[0] / p[1]) - p[2]);
        });
    } else {
        // Profi: Full Permutations
        // STRICT RULE: Line Operation (+/-) MUST be in parentheses. Point Operation (*//) MUST be outside.
        // Allowed: (A +/- B) * C   or   (A +/- B) / C
        // Allowed: A * (B +/- C)   or   A / (B +/- C)
        // Disallowed: (A * B) + C  (Point in parens)

        const ops = ['+', '-', '*', '/'];
        const perms = [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]];

        perms.forEach(p => {
            ops.forEach(o1 => ops.forEach(o2 => {
                const isLine1 = ['+', '-'].includes(o1);
                const isPoint1 = ['*', '/'].includes(o1);
                const isLine2 = ['+', '-'].includes(o2);
                const isPoint2 = ['*', '/'].includes(o2);

                // Structure 1: (p0 o1 p1) o2 p2
                // We assume parentheses are around the FIRST operation (o1).
                // So o1 MUST be Line, o2 MUST be Point.
                if (isLine1 && isPoint2) {
                    try {
                        const res1 = eval(`(${p[0]}${o1}${p[1]})${o2}${p[2]}`);
                        addSol(triplet, res1);
                    } catch (e) { }
                }

                // Structure 2: p0 o1 (p1 o2 p2)
                // We assume parentheses are around the SECOND operation (o2).
                // So o2 MUST be Line, o1 MUST be Point.
                if (isPoint1 && isLine2) {
                    try {
                        const res2 = eval(`${p[0]}${o1}(${p[1]}${o2}${p[2]})`);
                        addSol(triplet, res2);
                    } catch (e) { }
                }
            }));
        });
    }
}

// NEW LOBBY RENDER LOGIC
function renderLobbySlots(playersObj) {
    const slotsContainer = document.getElementById('lobby-player-slots');
    if (!slotsContainer) return;

    slotsContainer.innerHTML = '';
    const playersEntries = Object.entries(playersObj || {});
    const players = playersEntries.map(([id, data]) => ({ id, ...data }));

    // UPDATE GRID CLASS BASED ON COUNT
    slotsContainer.className = 'player-grid-dynamic'; // reset base class
    if (players.length <= 2) slotsContainer.classList.add('grid-few');
    else if (players.length <= 4) slotsContainer.classList.add('grid-medium');
    else slotsContainer.classList.add('grid-many');

    // Status Text update
    const statusText = document.getElementById('lobby-status-text');
    if (statusText) statusText.textContent = `${players.length} Spieler bereit. Warte auf Host...`;

    players.forEach(p => {
        const card = document.createElement('div');
        card.className = 'player-card-dynamic';

        // Avatar (First letter)
        const initial = p.name ? p.name.charAt(0).toUpperCase() : '?';

        // Check if this is the host's own card (can't remove yourself)
        const isOwnCard = p.id === appState.playerId;
        const canRemove = appState.isHost && !isOwnCard;

        card.innerHTML = `
            ${canRemove ? `<button class="btn-remove-player" data-player-id="${p.id}" data-player-name="${p.name}" title="Spieler entfernen">×</button>` : ''}
            <div class="avatar">${initial}</div>
            <div class="name">${p.name}</div>
        `;

        // Add click handler for remove button
        if (canRemove) {
            const removeBtn = card.querySelector('.btn-remove-player');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const playerId = removeBtn.getAttribute('data-player-id');
                    const playerName = removeBtn.getAttribute('data-player-name');
                    removePlayerFromLobby(playerId, playerName);
                });
            }
        }

        slotsContainer.appendChild(card);
    });
}

// Remove a player from the lobby (host only)
function removePlayerFromLobby(playerId, playerName) {
    if (!appState.isHost || !appState.gameId) return;

    showConfirm(
        "Spieler entfernen?",
        `Möchtest du ${playerName} wirklich aus der Lobby entfernen?`,
        () => {
            db.ref(`games/${appState.gameId}/players/${playerId}`).remove()
                .then(() => {
                    console.log(`Player ${playerName} removed from lobby`);
                })
                .catch(err => {
                    console.error("Error removing player:", err);
                    showMessage("Fehler", "Spieler konnte nicht entfernt werden.");
                });
        }
    );
}

function renderPlayersList(players) {
    const container = document.getElementById('players-container');
    if (!container) return; // Safety
    container.innerHTML = '';

    const list = players ? Object.values(players) : [];
    list.sort((a, b) => (b.score || 0) - (a.score || 0));

    // No longer limiting to top 4. Show everyone in scrollable list.
    let displayList = list;

    // Calculate Ranks from FULL list or display list? 
    // Usually ranks are global. So calculate ranks on 'list', then filter 'displayList' logic 
    // BUT render loop uses displayList. 
    // Better: Iterate 'displayList' but use 'list' for rank context if needed. 
    // Simple approach: The top 4 ARE the top 4, so their ranks are 1,2,3,4 anyway.

    // Logic for dense ranking needs linear walk.
    // If we only show top 4, we just render them. 
    // Wait, render loop does ranking onsite.

    let currentRank = 1;
    let lastScore = displayList.length > 0 ? (displayList[0].score || 0) : -1;

    displayList.forEach((p, index) => {
        const pScore = p.score || 0;
        if (pScore < lastScore) {
            currentRank++; // Move to next rank if score is lower
            lastScore = pScore;
        } else if (index > 0 && pScore === lastScore) {
            // Same rank as previous, do nothing to currentRank
        } else {
            // First item, rank is 1
        }

        /* 
           However, "Standard Competition Ranking" (1224) vs "Dense" (1223).
           User: "2. platzierten... 3. platzierten".
           Let's use Dense for visuals so both 2nd places get Silver.
        */

        let rankIcon = '';
        if (currentRank === 1) rankIcon = '👑';
        else if (currentRank === 2) rankIcon = '🥈';
        else if (currentRank === 3) rankIcon = '🥉';

        const item = document.createElement('div');
        item.className = 'player-item';

        // Host gets yellow border
        if (p.isHost) item.style.borderLeft = "3px solid var(--warning)";

        item.innerHTML = `
            <span>${p.name} ${rankIcon}</span>
            <span class="player-score">${p.score || 0}</span>
        `;
        container.appendChild(item);
    });

    // Update Rank Display in Class Mode
    if (appState.settings && appState.settings.classMode) {
        updateRankDisplay();
    }
}

function updateRankDisplay() {
    if (!appState.players || !appState.playerId) return;

    // Use players list for ranking context
    const sortedEntries = Object.entries(appState.players).sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));

    let myRank = -1;
    let currentRank = 1;
    for (let i = 0; i < sortedEntries.length; i++) {
        const [id, p] = sortedEntries[i];
        if (i > 0) {
            const prevScore = sortedEntries[i - 1][1].score || 0;
            const currScore = p.score || 0;
            if (currScore < prevScore) {
                currentRank = i + 1;
            }
        }

        if (id === appState.playerId) {
            myRank = currentRank;
            break;
        }
    }

    // New logic: Append to .player-list
    const playerList = document.querySelector('.player-list');
    if (!playerList) return;

    let rankFooter = document.getElementById('rank-footer');

    // Clean up old rank display if it exists in buzzer container
    const oldRankEl = document.getElementById('class-rank-display');
    if (oldRankEl) oldRankEl.remove();

    if (!rankFooter) {
        rankFooter = document.createElement('div');
        rankFooter.id = 'rank-footer';
        rankFooter.style.cssText = `
            margin-top: auto;
            padding: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            text-align: center;
            color: #94a3b8;
            font-size: 0.9rem;
            border-radius: 0 0 12px 12px;
        `;
        // Ensure parent is flex column to push footer to bottom
        playerList.style.display = 'flex';
        playerList.style.flexDirection = 'column';
        playerList.appendChild(rankFooter);
    }

    // Check penalty lock display override
    if (appState.lockedUntil && appState.lockedUntil > Date.now()) {
        const remaining = Math.ceil((appState.lockedUntil - Date.now()) / 1000);
        rankFooter.innerHTML = `Rang: ${myRank} <span style="color: var(--danger); margin-left: 10px;">🔒 ${remaining}s</span>`;
    } else {
        rankFooter.innerHTML = `Rang: ${myRank}`;
    }
}

function renderGrid() {
    const grid = document.getElementById('game-grid');
    grid.innerHTML = '';

    // Auto Grid Size styling
    grid.style.gridTemplateColumns = `repeat(${appState.gridSize}, 1fr)`;

    appState.gridData.forEach((num, index) => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = index;
        cell.innerText = num;
        cell.onclick = (e) => handleCellClick(e);
        cell.style.backgroundColor = getNumberColor(num);
        cell.style.color = 'white';
        // Add text shadow for better readability
        cell.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
        grid.appendChild(cell);
    });
    updateGridSelection();
}

// Start App
// Sound Effect Stub
function playSound(type) {
    // console.log("Playing sound:", type);
    // Placeholder for actual sound logic
    // e.g. new Audio('assets/sounds/' + type + '.mp3').play();
}

function startConfetti() {
    // console.log("Confetti!");
    // Placeholder for confetti animation
}

document.addEventListener('DOMContentLoaded', () => {
    // --- ORIENTATION LOCK LOGIC ---
    const checkOrientation = () => {
        const overlay = document.getElementById('orientation-lock-overlay');
        if (!overlay) return;

        // Check if portrait
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;

        // Optional: Check if touch device to reduce desktop annoyance? 
        // User said: "wenn das gerät hochformat unterstützt" (supports portrait).
        // Desktops support portrait logic via window size, but phones "rotate".
        // Let's assume strict Landscape requirement for all.
        if (isPortrait) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation(); // Initial check

    init(); // Call the original init function
});

// --- VOTING SYSTEM ---

function initiateVote() {
    if (!appState.gameId || !appState.playerId) return;
    const voteRef = db.ref(`games/${appState.gameId}/vote`);

    voteRef.set({
        initiator: appState.playerName,
        timestamp: Date.now(),
        status: 'active',
        votes: {
            [appState.playerId]: 'accept' // Auto-accept by initiator
        }
    });
}

function handleVoteUpdate(voteData, players) {
    const voteBox = document.getElementById('vote-box');
    const dotsContainer = document.getElementById('vote-dots');

    if (!voteData || (voteData.status !== 'active' && voteData.status !== 'rejected')) {
        if (voteBox) voteBox.style.display = 'none';
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
    }

    if (voteBox) voteBox.style.display = 'flex';
    if (dotsContainer) dotsContainer.innerHTML = '';

    // 1. Check if I need to vote
    const myVote = voteData.votes ? voteData.votes[appState.playerId] : null;
    const voteBtn = document.getElementById('btn-cast-vote');

    if (voteData.status === 'rejected') {
        if (voteBtn) voteBtn.style.display = 'none';
    } else if (!myVote) {
        // Show Button instead of auto-popup
        if (voteBtn) {
            voteBtn.style.display = 'block';
            voteBtn.onclick = () => {
                showModal("Abstimmung", `${voteData.initiator} möchte die Zielzahl mischen.`, () => {
                    castVote('accept');
                }, false, "Akzeptieren", "Ablehnen", () => {
                    castVote('reject');
                });
            };
        }
    } else {
        if (voteBtn) voteBtn.style.display = 'none';
    }

    // 2. Render Dots
    if (players && dotsContainer) {
        Object.keys(players).forEach(pid => {
            const dot = document.createElement('div');
            dot.className = 'vote-dot';

            const pVote = voteData.votes ? voteData.votes[pid] : null;
            if (pVote === 'accept') dot.classList.add('accept');
            else if (pVote === 'reject') dot.classList.add('reject');
            else dot.classList.add('pending'); // Add pending class explicitly if needed, or default grey

            dotsContainer.appendChild(dot);
        });
    }

    // 3. Host Logic
    if (appState.isHost) {
        const totalPlayers = Object.keys(players).length;
        const votes = voteData.votes || {};
        const accepts = Object.values(votes).filter(v => v === 'accept').length;
        const rejects = Object.values(votes).filter(v => v === 'reject').length;

        if (rejects > 0) {
            // Rejection: Set status to rejected (shows red dot) and wait
            if (voteData.status !== 'rejected') {
                db.ref(`games/${appState.gameId}/vote/status`).set('rejected');
                setTimeout(() => {
                    db.ref(`games/${appState.gameId}/vote`).remove();
                }, 2000);
            }
        } else if (accepts === totalPlayers) {
            db.ref(`games/${appState.gameId}/vote`).remove();
            rerollTarget(); // Changed from startGameAction()
        }
    }
}

function castVote(decision) {
    if (!appState.gameId || !appState.playerId) return;
    db.ref(`games/${appState.gameId}/vote/votes/${appState.playerId}`).set(decision);
}
// --- REROLL LOGIC ---
function rerollTarget() {
    if (!appState.isHost) return;

    // Find solutions for EXISTING grid
    const solutions = findSolutions(appState.gridData, appState.gridSize, appState.difficulty);

    if (solutions.length === 0) {
        console.warn("No solutions for current grid, forced regen.");
        startGameAction();
        return;
    }

    const randomSol = solutions[Math.floor(Math.random() * solutions.length)];
    appState.target = randomSol.result;
    appState.currSolutions = solutions;

    // Force UI Update (Host Sync Fix)
    elements.targetNumber.innerText = appState.target;

    console.log("HOST: Rerolling Target to:", appState.target);

    // Update DB (Target ONLY)
    db.ref(`games/${appState.gameId}`).update({
        target: appState.target
    }).then(() => console.log("HOST: Target Reroll Update Success"))
        .catch(e => console.error("HOST: Target Reroll Update Failed", e));
}

// --- NEW LOBBY EVENTS ---
function setupLobbyNewEvents() {
    // QR Modal
    const showQrBtn = document.getElementById('btn-show-qr-large');
    const qrModalLarge = document.getElementById('lobby-qr-modal');
    const closeQrLarge = document.getElementById('btn-close-qr-large');

    if (showQrBtn && qrModalLarge) {
        showQrBtn.addEventListener('click', () => {
            qrModalLarge.classList.add('active');
        });
    }

    if (closeQrLarge && qrModalLarge) {
        closeQrLarge.addEventListener('click', () => {
            qrModalLarge.classList.remove('active');
        });
    }

    // Close on click outside
    if (qrModalLarge) {
        qrModalLarge.addEventListener('click', (e) => {
            if (e.target === qrModalLarge) qrModalLarge.classList.remove('active');
        });
    }

    // Leave Button (New Icon)
    const leaveBtn = document.getElementById('btn-leave-lobby');
    if (leaveBtn) {
        leaveBtn.addEventListener('click', () => {
            // Leave logic
            if (typeof leaveGame === 'function') {
                showConfirm("Lobby verlassen?", "Möchtest du die Lobby verlassen?", () => { leaveGame(); });
            } else {
                if (confirm("Lobby verlassen?")) {
                    switchView('lobby');
                }
            }
        });
    }
}



// --- Teacher Mode Logic ---
function setupTeacherShortcut() {
    document.addEventListener('keydown', (e) => {
        // Shift + Alt + L
        // We use e.code === 'KeyL' for better reliability on Mac/iPad keyboards where Alt+L produces special characters
        const isL = e.key === 'L' || e.key === 'l' || e.code === 'KeyL';
        if (e.shiftKey && e.altKey && isL) {
            toggleTeacherMode();
        }
    });

    // Secret Touch/Click Hack for iPad users without keyboards (5 taps on TRIO title)
    const title = document.querySelector('.game-title');
    if (title) {
        let clickCount = 0;
        let lastClick = 0;
        title.addEventListener('click', () => {
            const now = Date.now();
            if (now - lastClick > 500) clickCount = 0; // Reset if too slow
            clickCount++;
            lastClick = now;
            if (clickCount === 5) {
                toggleTeacherMode();
                clickCount = 0;
                // Optional: visual feedback?
                if (typeof showMessage === 'function' && appState.teacherMode) {
                    // showMessage('Info', 'Klassenmodus aktiviert 🎓');
                }
            }
        });
    }

    // Class Game Button Listener
    const btnClass = document.getElementById('btn-class-game');
    if (btnClass) {
        btnClass.addEventListener('click', () => {
            const name = inputs.playerName.value.trim();
            if (!name) { showMessage('Fehler', 'Bitte gib deinen Namen ein!'); return; }

            // Save name
            localStorage.setItem('trio_player_name', name);

            // Set Teacher Context Flag
            appState.tempIsTeacherCreate = true;

            // Open Modal with Teacher Context
            document.getElementById('create-game-modal').classList.add('active');

            // Set Title for Class Mode
            const modalTitle = document.querySelector('#create-game-modal h2');
            if (modalTitle) modalTitle.innerText = "Klassenspiel konfigurieren 🎓";

            // Show Observe Setting
            const obs = document.getElementById('setting-observe-container');
            if (obs) obs.style.display = 'flex';

            // Show class mode badge
            const classModeBadge = document.getElementById('class-mode-badge');
            if (classModeBadge) classModeBadge.style.display = 'inline-block';
        });
    }

    // Normal Create Button Listener override/hook
    // We already have a listener for 'btn-open-create-modal' in setupEventListeners.
    // We should ensure it resets the flag.
    const btnNormal = document.getElementById('btn-open-create-modal');
    if (btnNormal) {
        // We can't easily remove anonymous listener, but we can add one that runs before/after.
        btnNormal.addEventListener('click', () => {
            appState.tempIsTeacherCreate = false;
        });
    }

    // Update Confirm Handler logic?
    // The confirm handler in setupEventListeners uses createGame(name).
    // We need to pass the flag.
    // The existing handler is: 
    // buttons.createGameConfirm.addEventListener('click', () => { ... createGame(name) ... })
    // We need to replace or modify it. 
    // Use appState.tempIsTeacherCreate inside the existing createGame function? 
    // No, createGame call in existing listener doesn't pass arg.
    // MODIFYING EXISTING LISTENER via code replacement above is hard because it's inside init.

    // BETTER: Modify the existing listener in setupEventListeners to use the flag.
}

function toggleTeacherMode() {
    appState.teacherMode = !appState.teacherMode;
    const btn = document.getElementById('btn-class-game');

    if (appState.teacherMode) {
        if (btn) {
            btn.style.display = 'block';
            // Animation?
            btn.animate([{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 300 });
        }
    } else {
        if (btn) btn.style.display = 'none';
    }
}

// --- HELP SYSTEM LOGIC ---
const helpPages = {
    home: {
        title: "Willkommen",
        content: `
            <h3 style="text-align:center; margin-top:0; margin-bottom:10px;">Dein Wegweiser</h3>
            <p style="text-align:center; margin-bottom:20px; font-size:0.9rem; color:var(--text-muted);">Trio ist ein schnelles Kopfrechenspiel.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="help-card" onclick="renderHelpPage('gameplay')" style="text-align:center; padding:10px; margin-bottom:0;">
                    <div style="font-size:1.5rem; margin-bottom:4px;">🎮</div>
                    <h4 style="font-size:0.95rem; margin-bottom:2px;">Spielprinzip</h4>
                    <p style="font-size:0.8rem;">Suchen, Buzzern, Rechnen</p>
                </div>
                <div class="help-card" onclick="renderHelpPage('modes')" style="text-align:center; padding:10px; margin-bottom:0;">
                    <div style="font-size:1.5rem; margin-bottom:4px;">⚡</div>
                    <h4 style="font-size:0.95rem; margin-bottom:2px;">Modi</h4>
                    <p style="font-size:0.8rem;">Alle Regeln im Überblick</p>
                </div>
                <div class="help-card" onclick="renderHelpPage('settings')" style="text-align:center; padding:10px; margin-bottom:0;">
                    <div style="font-size:1.5rem; margin-bottom:4px;">⚙️</div>
                    <h4 style="font-size:0.95rem; margin-bottom:2px;">Einstellungen</h4>
                    <p style="font-size:0.8rem;">Grösse & Zahlenraum</p>
                </div>
                <div class="help-card" onclick="renderHelpPage('tips')" style="text-align:center; padding:10px; margin-bottom:0;">
                    <div style="font-size:1.5rem; margin-bottom:4px;">💡</div>
                    <h4 style="font-size:0.95rem; margin-bottom:2px;">Tipps</h4>
                    <p style="font-size:0.8rem;">PWA & QR-Code</p>
                </div>
            </div>
        `
    },
    gameplay: {
        title: "Spielprinzip",
        content: `
            <h3>So funktioniert Trio</h3>
            
            <!-- 1. ZIEL & ABLAUF -->
            <div style="margin-bottom:30px;">
                <h4 style="color:var(--primary-color); margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">1. Das Ziel & Ablauf</h4>
                <p style="margin-bottom:15px;">Dein Ziel ist es, <strong>3 Zahlen</strong> im Gitter zu finden, mit denen du genau die <strong>Zielzahl</strong> (oben rechts) ausrechnen kannst.</p>
                
                <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px;">
                    <ul style="margin:0; padding-left:20px; line-height:1.6; color:#e2e8f0;">
                        <li style="margin-bottom:10px;">👁️ <strong>Suchen:</strong> Alle Spieler suchen gleichzeitig auf dem gleichen Spielfeld.</li>
                        <li style="margin-bottom:10px;">🔵 <strong>Buzzern:</strong> Lösung gefunden? Drücke den blauen <strong>"TRIO!"-Button</strong>!</li>
                        <li style="margin-bottom:10px;">👆 <strong>Auswählen:</strong> Du hast jetzt <strong>10 Sekunden</strong> Zeit, deine 3 Zahlen anzutippen.</li>
                        <li>🧮 <strong>Rechnen:</strong> Gib deine Rechnung in den Taschenrechner ein.</li>
                    </ul>
                </div>
            </div>

            <!-- 2. RECHNEN REGELN -->
             <div style="margin-bottom:30px;">
                <h4 style="color:var(--primary-color); margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">2. Die Rechen-Regel</h4>
                <p style="margin-bottom:10px;">Du musst die 3 Zahlen mathematisch kombinieren. Dabei gilt die <strong>Mix-Pflicht</strong>:</p>
                
                <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; text-align:center;">
                    <p style="font-size:0.95rem; margin-bottom:15px;">Du brauchst immer genau <strong>eine Strichrechnung</strong> & <strong>eine Punktrechnung</strong>.</p>
                    
                    <div style="display:flex; justify-content:center; gap:15px; align-items:center; margin-bottom:15px;">
                        <div style="background:#334155; padding:8px 15px; border-radius:8px; border:1px solid #4ade80;">
                            <span style="display:block; font-size:1.2rem; color:#4ade80; font-weight:bold;">+ / -</span>
                            <span style="font-size:0.7rem; color:#94a3b8;">STRICH</span>
                        </div>
                        <span style="font-size:1.5rem;">&</span>
                        <div style="background:#334155; padding:8px 15px; border-radius:8px; border:1px solid #facc15;">
                            <span style="display:block; font-size:1.2rem; color:#facc15; font-weight:bold;">· / :</span>
                            <span style="font-size:0.7rem; color:#94a3b8;">PUNKT</span>
                        </div>
                    </div>

                    <div style="text-align:left; background:#1e293b; padding:10px; border-radius:6px; font-size:0.9rem;">
                        <div style="margin-bottom:5px;">✅ <code>3 · 4 + 5</code> (Mix = Gültig)</div>
                        <div style="color:#f87171;">❌ <code>3 + 4 + 5</code> (Nur Strich = Verboten)</div>
                        <div style="color:#f87171;">❌ <code>3 · 4 · 5</code> (Nur Punkt = Verboten)</div>
                    </div>
                </div>
            </div>

            <!-- 3. AUSWAHL-REGELN -->
            <div style="margin-bottom:30px;">
                <h4 style="color:var(--primary-color); margin-bottom:10px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px;">3. Die Auswahl-Regeln</h4>
                <p style="margin-bottom:15px;">Es gelten strenge geometrische Regeln für die Auswahl der 3 Zahlen:</p>
                
                <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; border-left:4px solid var(--warning); margin-bottom:20px;">
                    <p style="margin-bottom:10px;"><strong>Die "3-Gewinnt" Regel:</strong></p>
                    <ul style="margin:0; padding-left:20px;">
                        <li>Die 3 Zahlen müssen auf einer <strong>geraden Linie</strong> liegen.</li>
                        <li>Sie müssen <strong>direkt nebeneinander</strong> liegen.</li>
                        <li>❌ <strong>KEINE Lücken</strong> oder Abstände erlaubt!</li>
                        <li>❌ <strong>KEINE Ecken</strong> oder Kanten erlaubt!</li>
                    </ul>
                </div>

                <!-- BEISPIELE (SUB-POINT) -->
                <div style="margin-left:10px;">
                    <span style="font-size:0.9rem; color:#4ade80; font-weight:bold; display:block; margin-bottom:10px;">✅ GÜLTIG (Direkt benachbart):</span>
                    <div class="help-grid-examples" style="margin:0 0 20px 0; justify-content:flex-start; gap:20px;">
                        <!-- Horizontal -->
                        <div class="mini-grid-container">
                            <div class="mini-grid">
                                <div class="mini-cell"></div><div class="mini-cell"></div><div class="mini-cell"></div>
                                <div class="mini-cell selected"></div><div class="mini-cell selected"></div><div class="mini-cell selected"></div>
                                <div class="mini-cell"></div><div class="mini-cell"></div><div class="mini-cell"></div>
                            </div>
                            <span class="mini-grid-label">Waagerecht</span>
                        </div>
                        <!-- Vertical -->
                        <div class="mini-grid-container">
                            <div class="mini-grid">
                                <div class="mini-cell"></div><div class="mini-cell selected"></div><div class="mini-cell"></div>
                                <div class="mini-cell"></div><div class="mini-cell selected"></div><div class="mini-cell"></div>
                                <div class="mini-cell"></div><div class="mini-cell selected"></div><div class="mini-cell"></div>
                            </div>
                            <span class="mini-grid-label">Senkrecht</span>
                        </div>
                         <!-- Diagonal -->
                        <div class="mini-grid-container">
                            <div class="mini-grid">
                                <div class="mini-cell selected"></div><div class="mini-cell"></div><div class="mini-cell"></div>
                                <div class="mini-cell"></div><div class="mini-cell selected"></div><div class="mini-cell"></div>
                                <div class="mini-cell"></div><div class="mini-cell"></div><div class="mini-cell selected"></div>
                            </div>
                            <span class="mini-grid-label">Diagonal</span>
                        </div>
                    </div>

                    <span style="font-size:0.9rem; color:#f87171; font-weight:bold; display:block; margin-bottom:10px;">❌ UNGÜLTIG (Verboten):</span>
                    <div class="help-grid-examples" style="margin:0; justify-content:flex-start; gap:20px;">
                        <!-- Gap Invalid -->
                        <div class="mini-grid-container">
                            <div class="mini-grid" style="grid-template-columns: repeat(5, 1fr);">
                                <div class="mini-cell invalid" style="background:var(--danger)"></div>
                                <div class="mini-cell"></div>
                                <div class="mini-cell invalid" style="background:var(--danger)"></div>
                                <div class="mini-cell"></div>
                                <div class="mini-cell invalid" style="background:var(--danger)"></div>
                            </div>
                            <span class="mini-grid-label" style="color:var(--danger)">Mit Lücke</span>
                        </div>

                        <!-- Corner Invalid -->
                        <div class="mini-grid-container">
                            <div class="mini-grid">
                                <div class="mini-cell invalid" style="background:var(--danger)"></div><div class="mini-cell invalid" style="background:var(--danger)"></div><div class="mini-cell"></div>
                                <div class="mini-cell invalid" style="background:var(--danger)"></div><div class="mini-cell"></div><div class="mini-cell"></div>
                                <div class="mini-cell"></div><div class="mini-cell"></div><div class="mini-cell"></div>
                            </div>
                            <span class="mini-grid-label" style="color:var(--danger)">Über Eck</span>
                        </div>
                    </div>
                </div>
            </div>
        `
    },
    modes: {
        title: "Schwierigkeitsstufen",
        content: `
            <h3>Modi & Regeln</h3>

            <div class="help-card" onclick="this.classList.toggle('active')">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="color: #4ade80; margin:0;">🟢 Normal</h4>
                    <span style="font-size:0.8rem; background:rgba(74, 222, 128, 0.1); padding:2px 6px; border-radius:4px; color:#4ade80;">Einsteiger</span>
                </div>
                <div style="margin-top:10px; display:flex; gap:10px; font-family:monospace; font-size:1.2rem;">
                    <span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px;">+</span>
                    <span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px;">-</span>
                    <span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px;">·</span>
                </div>
                <ul style="margin-top:10px; font-size:0.9rem;">
                    <li>Genau 1x Mal (<code>·</code>)</li>
                    <li>Genau 1x Strich (<code>+</code>/<code>-</code>)</li>
                </ul>
            </div>

            <div class="help-card">
                 <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="color: #facc15; margin:0;">🟡 Fortgeschritten</h4>
                </div>
                <div style="margin-top:10px; display:flex; gap:10px; font-family:monospace; font-size:1.2rem;">
                    <span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px;">+</span>
                    <span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px;">-</span>
                    <span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px;">:</span>
                </div>
                <ul style="margin-top:10px; font-size:0.9rem;">
                    <li>Genau 1x Geteilt (<code>:</code>)</li>
                    <li>Genau 1x Strich (<code>+</code>/<code>-</code>)</li>
                </ul>
            </div>

            <div class="help-card">
                 <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="color: #f87171; margin:0;">🔴 Profi</h4>
                    <span style="font-size:0.8rem; background:rgba(248, 113, 113, 0.1); padding:2px 6px; border-radius:4px; color:#f87171;">Experten</span>
                </div>
                <p style="margin-top:5px; font-size:0.9rem;">Klammerpflicht!</p>
                <div style="background:#1e293b; padding:8px; border-radius:6px; font-family:monospace; margin-top:5px;">
                    ( A ± B ) ·/: C
                </div>
                <p style="font-size:0.8rem; margin-top:5px; color:#94a3b8;">Punktrechnung (· oder :) muss ausserhalb der Klammer stehen.</p>
            </div>

            <div class="help-card">
                <h4 style="color: #c084fc;">🟣 Verrückt</h4>
                <p>Alles erlaubt! Punkte (1-3) je nach Komplexität.</p>
            </div>
        `
    },
    settings: {
        title: "Einstellungen",
        content: `
            <h3>Konfiguration</h3>
            
            <div class="help-card">
                <h4>🔢 Zahlenraum</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
                    <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; text-align:center;">
                        <span style="display:block; color:#fbbf24; font-weight:bold;">1-9</span>
                        <span style="font-size:0.8rem;">Ziel bis 50</span>
                    </div>
                    <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; text-align:center;">
                        <span style="display:block; color:#fbbf24; font-weight:bold;">1-20</span>
                        <span style="font-size:0.8rem;">Ziel bis 100</span>
                    </div>
                </div>
            </div>

            <div class="help-card">
                <h4>📏 Gittergrösse</h4>
                <p>5x5 (Klein), 7x7 (Standard), 9x9 (Gross)</p>
            </div>

            <div class="help-card">
                 <h4>🔥 Hardcore Modus</h4>
                 <p>Für Profis: Bei einer falschen Antwort verlierst du <strong>einen Punkt</strong>!</p>
            </div>
            
            <div class="help-card">
                 <h4>👁️ Lehrer Modus</h4>
                 <p>Der Host kann <strong>"Beobachten"</strong> aktivieren. Alle Spieler sehen dann live, was der aktive Spieler rechnet.</p>
            </div>
        `
    },
    tips: {
        title: "Tipps & Tricks",
        content: `
            <h3>App installieren</h3>
            <p style="margin-bottom:20px;">Füge die App zum Startbildschirm hinzu für Vollbild-Modus.</p>
            <div style="display:flex; gap:10px; margin-bottom:30px;">
                <div style="flex:1; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                    <strong>iOS</strong><br>
                    Teilen <span style="font-family:serif;">⎋</span> &rarr; "Zum Home-Bildschirm"
                </div>
                <div style="flex:1; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                    <strong>Android</strong><br>
                    Menü &rarr; "App installieren"
                </div>
            </div>
            
            <h3>QR-Code Scan</h3>
            <p>Freunde können den QR-Code in der Lobby scannen und landen direkt im Spiel!</p>
        `
    }
};

function setupHelpSystem() {
    const btnOpen = document.getElementById('btn-open-help');
    const btnClose = document.getElementById('btn-close-help');
    const btnBack = document.getElementById('btn-help-back');
    const modal = document.getElementById('help-modal');

    if (btnOpen) {
        btnOpen.addEventListener('click', () => {
            renderHelpPage('home'); // Reset to home on open
            modal.classList.add('active');
        });
    }

    if (btnClose) {
        btnClose.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            renderHelpPage('home');
        });
    }

    // Navigation Buttons
    document.querySelectorAll('.btn-help-nav').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            if (target) renderHelpPage(target);
        });
    });
}

function renderHelpPage(pageId) {
    const page = helpPages[pageId] || helpPages['home'];
    const contentArea = document.getElementById('help-content-area');
    const title = document.getElementById('help-modal-title');
    const backBtn = document.getElementById('btn-help-back');

    // Update Content
    title.innerText = page.title;
    contentArea.innerHTML = page.content;

    // Update Nav Buttons State
    document.querySelectorAll('.btn-help-nav').forEach(btn => {
        if (btn.dataset.target === pageId) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Show/Hide Back Button logic
    if (pageId === 'home') {
        backBtn.style.display = 'none';
        title.innerText = "Anleitung"; // Override Header for Home
    } else {
        backBtn.style.display = 'block';
    }

    // Scroll to top
    contentArea.scrollTop = 0;
}

// --- Auto-Cleanup Logic ---

function updateLastActive() {
    if (appState.gameId) {
        db.ref(`games/${appState.gameId}`).update({
            lastActive: firebase.database.ServerValue.TIMESTAMP
        });
    }
}

function checkAutoCleanup() {
    // 30 Minutes cutoff
    const cutoff = Date.now() - (30 * 60 * 1000);

    // Query games inactive since cutoff
    // Note: We limit to a few to prevent heavy load on every client init
    db.ref('games')
        .orderByChild('lastActive')
        .endAt(cutoff)
        .limitToFirst(5)
        .once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const updates = {};
                snapshot.forEach(child => {
                    console.log(`Cleaning up old game: ${child.key}`);
                    updates[child.key] = null; // Delete
                });
                // Atomic delete
                db.ref('games').update(updates);
            }
        })
        .catch(e => console.warn("Cleanup check failed (permission?):", e));
}
