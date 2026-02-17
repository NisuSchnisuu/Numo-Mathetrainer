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
let customProblems = []; // Storage for custom problems
let playerState = {
    lives: 3,
    streak: 0,
    markedCount: 0,
    card: null
};
let isLeaving = false; // Flag to prevent 'kicked' modal during voluntary exit

let html5QrScanner = null;

// --- IndexedDB Logic ---
const DB_NAME = 'BingolatorDB';
const STORE_NAME = 'customGames';
let dbInstance = null;

function initDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };
        request.onsuccess = (e) => {
            dbInstance = e.target.result;
            resolve(dbInstance);
        };
        request.onerror = (e) => reject(e);
    });
}

async function saveGameToDB(name, problems) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put({ name, problems, timestamp: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
    });
}

async function getAllSavedGames() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
    });
}

async function getSavedGame(name) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e);
    });
}

// --- Helper Functions ---

function formatTerm(term) {
    if (!term) return "";
    // Regex for basic fraction:  number / number  (allowing optional spaces)
    // Matches:  1/2,  12 / 4, etc.
    // Does NOT match:  1/2/3, text/text (unless digits)
    // We want to be careful not to break date-like strings if they appear in text mode, but for math mode it's safe.
    // Let's assume a fraction is strictly Digits / Digits for now.

    const fractionRegex = /(\d+)\s*\/\s*(\d+)/g;

    if (fractionRegex.test(term)) {
        return term.replace(fractionRegex, (match, num, den) => {
            return `<span class="fraction"><span class="numerator">${num}</span><span class="denominator">${den}</span></span>`;
        });
    }
    return term;
}

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
        wonRows: [], // Track completed rows
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
        playerState.wonRows = session.wonRows || []; // Restore wonRows

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

    const isStandalone = isStandaloneMode();
    const isInIframe = window.parent !== window;

    // Show the Trigger Button in Lobby if not already standalone
    const installBtn = document.getElementById('btn-trigger-install');
    if (installBtn) {
        if (!isStandalone) {
            installBtn.style.display = 'block';
        } else {
            installBtn.style.display = 'none';
        }
    }

    // Interval to ensure back button visibility is correct
    setInterval(() => {
        const backBtn = document.getElementById('numo-back-link');
        if (backBtn) {
            const currentStandalone = isStandaloneMode();
            if (currentView === 'lobby-view' && !(currentStandalone && !isInIframe)) {
                backBtn.style.display = 'flex';
            } else {
                backBtn.style.display = 'none';
            }
        }
    }, 500);

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
        } catch (e) { console.error("Error loading settings", e); }
    }

    // Bind UI Events
    bindEvents();

    // Check for active session (Player)
    if (checkSession()) return;

    // CHECK FOR ACTIVE HOST SESSION
    const savedHostGame = localStorage.getItem('bingolator_host_game_id');
    if (savedHostGame) {
        // Verify existence
        database.ref('games/' + savedHostGame).once('value').then(snapshot => {
            if (snapshot.exists()) {
                // Show Rejoin UI
                const btnCreate = document.getElementById('btn-open-create-modal');
                if (btnCreate) btnCreate.classList.add('hidden');

                const rejoinContainer = document.getElementById('host-rejoin-container');
                if (rejoinContainer) rejoinContainer.classList.remove('hidden');

                // Add Listeners
                const btnRejoin = document.getElementById('btn-host-rejoin');
                if (btnRejoin) btnRejoin.onclick = () => hostRejoinGame(savedHostGame);

                const btnDelete = document.getElementById('btn-host-delete');
                if (btnDelete) btnDelete.onclick = () => hostDeleteGame(savedHostGame);
            } else {
                localStorage.removeItem('bingolator_host_game_id');
            }
        });
    }

    // 4. Auto-Show Install Modal if requested via URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('install') === 'true') {
        showInstallModal();
        // Clean URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('install');
        window.history.replaceState({}, document.title, newUrl.toString());
    }

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

    const btnOpenCustom = document.getElementById('btn-open-custom-modal');
    if (btnOpenCustom) btnOpenCustom.onclick = openCustomModal;

    const btnCloseCustom = document.getElementById('btn-close-custom-modal');
    if (btnCloseCustom) btnCloseCustom.onclick = () => hideModal('custom-problems-modal');

    const btnAddCustomRow = document.getElementById('btn-add-custom-row');
    if (btnAddCustomRow) btnAddCustomRow.onclick = addCustomRow;

    const btnSaveCustom = document.getElementById('btn-save-custom-problems');
    if (btnSaveCustom) btnSaveCustom.onclick = saveAndCreateCustomGame;

    const btnOpenImport = document.getElementById('btn-open-import-modal');
    if (btnOpenImport) btnOpenImport.onclick = () => showModal('import-json-modal');

    const btnCloseImport = document.getElementById('btn-close-import-modal');
    if (btnCloseImport) btnCloseImport.onclick = () => hideModal('import-json-modal');

    const btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson) btnExportJson.onclick = exportToJSON;

    const btnImportPaste = document.getElementById('btn-import-paste');
    if (btnImportPaste) btnImportPaste.onclick = importFromPaste;

    // SAVE GAME LOCALLY
    const btnSaveLocal = document.getElementById('btn-save-local-db');
    if (btnSaveLocal) btnSaveLocal.onclick = openSaveNameModal;

    const btnCloseSaveName = document.getElementById('btn-close-save-name');
    if (btnCloseSaveName) btnCloseSaveName.onclick = () => hideModal('save-game-name-modal');

    const btnConfirmSaveDB = document.getElementById('btn-confirm-save-db');
    if (btnConfirmSaveDB) btnConfirmSaveDB.onclick = saveCurrentCustomGame;

    // Refresh Saved Games List
    refreshSavedGamesUI();

    const btnDeleteSaved = document.getElementById('btn-delete-saved-game');
    if (btnDeleteSaved) btnDeleteSaved.onclick = deleteSelectedSavedGame;

    const selectSaved = document.getElementById('my-saved-games');
    if (selectSaved) selectSaved.onchange = loadSelectedSavedGame;

    const btnUploadTrigger = document.getElementById('btn-upload-json');
    const fileInput = document.getElementById('json-file-input');
    if (btnUploadTrigger && fileInput) {
        btnUploadTrigger.onclick = () => fileInput.click();
        fileInput.onchange = handleFileUpload;
    }



    const btnEnter = document.getElementById('btn-enter');
    if (btnEnter) btnEnter.onclick = joinGameByCode;

    const btnTriggerInstall = document.getElementById('btn-trigger-install');
    if (btnTriggerInstall) {
        btnTriggerInstall.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            if (window.parent !== window) {
                // Open standalone URL in new tab
                const url = new URL(window.location.href);
                url.searchParams.set('install', 'true');
                window.open(url.toString(), '_blank');
            } else {
                showInstallModal();
            }
        });
    }

    const btnCloseInstall = document.getElementById('btn-close-install');
    if (btnCloseInstall) {
        btnCloseInstall.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            const modal = document.getElementById('pwa-install-modal');
            if (modal) modal.classList.remove('active');
        });
    }

    const btnLeaveLobby = document.getElementById('btn-leave-lobby');
    if (btnLeaveLobby) btnLeaveLobby.onclick = confirmLeaveGame;

    const btnConfirmLeave = document.getElementById('btn-confirm-leave');
    if (btnConfirmLeave) btnConfirmLeave.onclick = executeLeaveGame;

    const btnConfirmKick = document.getElementById('btn-confirm-kick');
    if (btnConfirmKick) btnConfirmKick.onclick = executeKickPlayer;

    const btnQuickBack = document.getElementById('btn-quick-back');
    if (btnQuickBack) btnQuickBack.onclick = leaveGame;

    const btnStartGame = document.getElementById('btn-start-game');
    if (btnStartGame) btnStartGame.onclick = startGame;

    const btnHostDraw = document.getElementById('btn-host-draw');
    if (btnHostDraw) btnHostDraw.onclick = hostDrawNext;

    const btnShowQr = document.getElementById('btn-show-qr-large');
    if (btnShowQr) btnShowQr.onclick = () => showModal('lobby-qr-modal');

    // New Host Code Modal
    const btnShowCodes = document.getElementById('btn-show-player-codes');
    if (btnShowCodes) btnShowCodes.onclick = () => showModal('player-codes-modal');

    const btnCloseCodes = document.getElementById('btn-close-player-codes');
    if (btnCloseCodes) btnCloseCodes.onclick = () => hideModal('player-codes-modal');

    const btnCloseQrLarge = document.getElementById('btn-close-qr-large');
    if (btnCloseQrLarge) btnCloseQrLarge.onclick = () => hideModal('lobby-qr-modal');

    const btnScanQr = document.getElementById('btn-scan-qr');
    if (btnScanQr) btnScanQr.onclick = startQrScanner;

    const btnCloseQr = document.getElementById('btn-close-qr');
    if (btnCloseQr) btnCloseQr.onclick = stopQrScanner;

    const btnWinnerContinue = document.getElementById('btn-winner-continue');
    if (btnWinnerContinue) btnWinnerContinue.onclick = continueGame;

    // REJOIN LOGIC
    const btnOpenRejoin = document.getElementById('btn-open-rejoin-modal');
    if (btnOpenRejoin) btnOpenRejoin.onclick = () => showModal('rejoin-modal');

    const btnCloseRejoin = document.getElementById('btn-close-rejoin');
    if (btnCloseRejoin) btnCloseRejoin.onclick = () => hideModal('rejoin-modal');

    const btnConfirmRejoin = document.getElementById('btn-confirm-rejoin');
    if (btnConfirmRejoin) btnConfirmRejoin.onclick = rejoinGame;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveSession();
    });
}

// --- SAVED GAMES HELPERS ---

async function openSaveNameModal() {
    showModal('save-game-name-modal');
}

async function saveCurrentCustomGame() {
    const nameInput = document.getElementById('input-save-game-name');
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) return alert("Bitte einen Namen eingeben.");

    // Extract current rows
    const rows = Array.from(document.querySelectorAll('.custom-problem-row'));
    const data = rows.map(row => {
        const term = row.querySelector('.custom-term-input').value.trim();
        const result = row.querySelector('.custom-result-input').value.trim();
        return { term, result };
    }).filter(item => item.term !== "" && item.result !== "");

    if (data.length === 0) return alert("Keine Aufgaben zum Speichern.");

    try {
        await saveGameToDB(name, data);
        // Custom Success Modal
        hideModal('save-game-name-modal');
        nameInput.value = "";
        refreshSavedGamesUI();
        showModal('save-success-modal');
    } catch (e) {
        console.error("DB Error", e);
        alert("Fehler beim Speichern: " + e.message);
    }
}

async function refreshSavedGamesUI() {
    const select = document.getElementById('my-saved-games');
    if (!select) return;

    try {
        const games = await getAllSavedGames();
        // Keep the first default option
        const defaultOption = '<option value="">-- Kein Spiel ausgewählt --</option>';

        // Sort by newest first
        games.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        const options = games.map(g => {
            return `<option value="${g.name}">${g.name} (${g.problems.length} Aufg.)</option>`;
        }).join('');

        select.innerHTML = defaultOption + options;

        // Reset delete button state
        const btnDelete = document.getElementById('btn-delete-saved-game');
        if (btnDelete) {
            btnDelete.disabled = true;
            btnDelete.style.opacity = "0.5";
            btnDelete.style.cursor = "not-allowed";
        }
    } catch (e) {
        console.warn("Could not load saved games", e);
    }
}

async function loadSelectedSavedGame() {
    const select = document.getElementById('my-saved-games');
    const name = select.value;

    // Update delete button state
    const btnDelete = document.getElementById('btn-delete-saved-game');
    if (btnDelete) {
        if (name) {
            btnDelete.disabled = false;
            btnDelete.style.opacity = "1";
            btnDelete.style.cursor = "pointer";
        } else {
            btnDelete.disabled = true;
            btnDelete.style.opacity = "0.5";
            btnDelete.style.cursor = "not-allowed";
        }
    }

    if (!name) return;

    try {
        const game = await getSavedGame(name);
        if (!game) return;

        customProblems = game.problems || [];
        // No customMode to load anymore, validation is implicit

        // Update the "Edit" button text to show loaded state
        const btnCustom = document.getElementById('btn-open-custom-modal');
        if (btnCustom) {
            // Update the span inside or text directly?
            // We replaced text with structure, so we need to find the span
            const span = btnCustom.querySelector('span');
            if (span) {
                span.textContent = `BEARBEITEN: ${game.name}`;
            } else {
                // Fallback if structure changed unexpectedly
                btnCustom.textContent = `BEARBEITEN: ${game.name}`;
            }
            // Add subtle active indicator styles if needed, though class handles most
            btnCustom.style.borderColor = "var(--primary-color)";
            btnCustom.style.background = "rgba(16, 185, 129, 0.1)";
        }

    } catch (e) {
        console.error("Error loading game", e);
    }
}

let gameToDelete = null;

async function deleteSelectedSavedGame() {
    const select = document.getElementById('my-saved-games');
    const name = select.value;
    if (!name) return;

    // Show Custom Confirm Modal
    gameToDelete = name;
    document.getElementById('delete-game-name').textContent = name;
    showModal('delete-confirm-modal');

    // Bind confirmation click (once)
    const confirmBtn = document.getElementById('btn-confirm-delete-action');
    confirmBtn.onclick = executeDelete;
}

async function executeDelete() {
    if (!gameToDelete) return;

    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(gameToDelete);

        tx.oncomplete = () => {
            hideModal('delete-confirm-modal');
            refreshSavedGamesUI();

            // Reset Edit button
            const btnCustom = document.getElementById('btn-open-custom-modal');
            if (btnCustom) {
                const span = btnCustom.querySelector('span');
                if (span) span.textContent = "EIGENE AUFGABEN ERSTELLEN";

                btnCustom.style.borderColor = "";
                btnCustom.style.background = "";
            }
            customProblems = [];
            gameToDelete = null;
        };
    } catch (e) {
        console.error("Delete error", e);
    }
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
                    if (parts.length > 1) code = parts[1].split('&')[0];
                }
            } else {
                if (decodedText.trim().length === 4) code = decodedText.trim();
            }

            if (code) {
                stopQrScanner();
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('join', code);
                window.location.href = currentUrl.toString();
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

        // Persistent Game: Do NOT remove on disconnect
        // gameRef.onDisconnect().remove();

        localStorage.setItem('bingolator_host_game_id', gameId);

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

async function hostRejoinGame(savedId) {
    clearSession();
    gameId = savedId;
    isHost = true;
    playerName = localStorage.getItem('bingolator_player_name') || "Host";

    const snapshot = await database.ref('games/' + gameId).once('value');
    if (!snapshot.exists()) {
        alert("Spiel nicht mehr vorhanden.");
        localStorage.removeItem('bingolator_host_game_id');
        location.reload();
        return;
    }

    setupLobbyListener();

    const data = snapshot.val();
    if (data.status === 'PLAYING') {
        switchView('game-view');
        initGameScreen(data);
    } else {
        switchView('waiting-room-view');
    }
    updateLobbyUI();
    saveSession();
}

async function hostDeleteGame(savedId) {
    if (!confirm("Möchtest du das laufende Spiel wirklich löschen?")) return;

    await database.ref('games/' + savedId).remove();
    localStorage.removeItem('bingolator_host_game_id');
    location.reload();
}

/**
 * Custom Problems Logic
 */
/**
 * Custom Problems Logic
 */
function openCustomModal() {
    hideModal('create-game-modal');
    showModal('custom-problems-modal');

    // Reset Import/Guide UI
    const importArea = document.getElementById('json-import-area');
    if (importArea) importArea.placeholder = '[{"term":"12+8"}, {"term":"5·3"}, {"term":"Frage?", "result":"Antwort"}]';

    const list = document.getElementById('custom-problems-list');
    if (list) list.innerHTML = '';

    if (customProblems && customProblems.length > 0) {
        customProblems.forEach(p => addCustomRow(p));
        // Add minimal empty rows if less than 15?
        if (customProblems.length < 15) {
            for (let i = 0; i < (15 - customProblems.length); i++) addCustomRow();
        }
    } else {
        // Reset to default
        customProblems = [];
        for (let i = 0; i < 15; i++) addCustomRow();
    }

    updateCustomCount();
}

function addCustomRow(data = null) {
    const list = document.getElementById('custom-problems-list');
    if (!list) return;

    const rowId = Date.now() + Math.random();
    const row = document.createElement('div');
    row.className = 'custom-problem-row';
    row.id = `row-${rowId}`;
    row.style = 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; animation: slideIn 0.2s ease-out;';

    const termVal = data ? (data.term || "") : "";
    const resVal = data ? (data.result !== undefined ? data.result : "") : "";

    // Unified Row Structure
    row.innerHTML = `
        <div style="flex: 2; position: relative;">
             <input type="text" class="custom-term-input" placeholder="Wieviel ist 5+5?" value="${termVal}" style="width: 100%; padding: 8px;">
        </div>
        <div style="flex: 1; position: relative; display: flex; align-items: center; gap: 5px;">
             <input type="text" class="custom-result-input" placeholder="Antwort" value="${resVal}" style="width: 100%; padding: 8px; font-weight:700; color:var(--secondary-color); text-align:center;">
             <button class="btn-lock-toggle" title="Sperren/Entsperren" style="background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px;">
                 <svg class="icon-unlocked" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                 <svg class="icon-locked hidden" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
             </button>
        </div>
        <button class="btn-kick-player" style="position: static; width: 32px; height: 32px; margin-left: 5px;" onclick="removeCustomRow('${rowId}')">×</button>
    `;

    list.appendChild(row);

    const termInput = row.querySelector('.custom-term-input');
    const resultInput = row.querySelector('.custom-result-input');
    const lockBtn = row.querySelector('.btn-lock-toggle');

    // Event Listeners
    termInput.addEventListener('blur', () => handleCustomInput(row));
    termInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleCustomInput(row);
            termInput.blur(); // Triggers blur which runs check again
        }
    });

    resultInput.addEventListener('input', () => {
        // Just update count, DO NOT sort while typing
        updateCustomCount();
    });

    resultInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleCustomInput(row, true); // skip auto-calc, just validate
            resultInput.blur();
        }
    });

    resultInput.addEventListener('blur', () => {
        // Optional: Check if duplicate manual entry?
        handleCustomInput(row, true); // True = skip auto-calc, just validate
    });


    lockBtn.onclick = () => toggleRowLock(row);

    // Initial check
    if (data) {
        handleCustomInput(row);
    } else {
        // Even empty rows need to be registered in DOM before sort can see them? 
        // Yes, appended already.
        // But delay sort slightly? No, can call directly if needed, but let's let user type first.
    }
}

function toggleRowLock(row) {
    const resInput = row.querySelector('.custom-result-input');
    const lockBtn = row.querySelector('.btn-lock-toggle');
    const iconUnlocked = lockBtn.querySelector('.icon-unlocked');
    const iconLocked = lockBtn.querySelector('.icon-locked');

    if (resInput.disabled) {
        // UNLOCK
        resInput.disabled = false;
        resInput.classList.remove('locked-input');
        iconUnlocked.classList.remove('hidden');
        iconLocked.classList.add('hidden');
    } else {
        // LOCK (Manual)
        resInput.disabled = true;
        resInput.classList.add('locked-input');
        iconUnlocked.classList.add('hidden');
        iconLocked.classList.remove('hidden');
    }
}

function removeCustomRow(id) {
    const row = document.getElementById(`row-${id}`);
    if (row) row.remove();
    updateCustomCount();
}

function handleCustomInput(row, skipAutoCalc = false) {
    const termInput = row.querySelector('.custom-term-input');
    const resultInput = row.querySelector('.custom-result-input');
    const lockBtn = row.querySelector('.btn-lock-toggle');
    const iconUnlocked = lockBtn.querySelector('.icon-unlocked');
    const iconLocked = lockBtn.querySelector('.icon-locked');
    if (!termInput || !resultInput) return;

    let term = termInput.value.trim();

    // AUTO-CALC LOGIC
    if (!skipAutoCalc && term && !resultInput.value.trim() && !resultInput.disabled) {
        // Only try auto-calc if result is empty OR if it was previously auto-filled (how to track? maybe just if not locked?)
        // Simpler: If term looks like math and result is empty or we force check

        // Prettify input: replace * with · and / with :
        const displayTerm = term.replace(/\*/g, '·').replace(/\//g, ':');
        if (term !== displayTerm) {
            termInput.value = displayTerm;
            term = displayTerm;
        }

        try {
            const sanitizedTerm = term.replace(/·/g, '*').replace(/:/g, '/').replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.');

            // Regex check to allow only numbers and math operators
            if (/^[0-9+\-*/().\s]+$/.test(sanitizedTerm)) {
                // Ensure it's not just a single number (optional, but good for "Question: 10" -> "Answer: 10").
                // Actually eval is fine even for single numbers.

                const result = eval(sanitizedTerm);

                if (!isNaN(result) && isFinite(result)) {
                    // VALID MATH DETECTED
                    const finalRes = parseFloat(result.toFixed(2)); // Round to 2 decimals

                    if (finalRes >= 1 && finalRes >= 1 && finalRes <= 90 && Number.isInteger(finalRes)) {
                        resultInput.value = finalRes;
                        // LOCK IT
                        resultInput.disabled = true;
                        resultInput.classList.add('locked-input');
                        iconUnlocked.classList.add('hidden');
                        iconLocked.classList.remove('hidden');
                    } else {
                        // Valid math but out of range or decimal?
                        // User might want to input text answer instead, so don't force lock, but populate result?
                        // If 1-90 is required for Bingo numbers, then this is "Invalid for Number Mode but Okay for Text Mode"
                        // Let's populate it but NOT lock it, so user can edit if they want.
                        resultInput.value = finalRes;
                    }
                }
            }
        } catch (e) {
            // Not math, ignore
        }
    }

    validateAndSortRows(); // Trigger sort/validation on every input/blur
}

function validateAndSortRows() {
    const list = document.getElementById('custom-problems-list');
    const rows = Array.from(list.querySelectorAll('.custom-problem-row'));

    // 1. Snapshot Data & Classify
    const analyzedRows = rows.map(row => {
        const termInput = row.querySelector('.custom-term-input');
        const resultInput = row.querySelector('.custom-result-input');

        const term = termInput.value.trim();
        const result = resultInput.value.trim();

        let status = 'empty'; // Default
        let errorType = null;

        // Reset Styles
        row.classList.remove('row-error');
        termInput.classList.remove('input-error');
        resultInput.classList.remove('input-error');

        // Classification
        if (term === "" && result === "") {
            status = 'empty';
        } else if (term !== "" && result === "") {
            // Term but no Result -> Error (unless focused?)
            // For strict mode requested: "if focus not in term or result"
            // But we are sorting, which implies re-rendering, causing loss of focus if not careful.
            // Actually, DOM sorting usually preserves focus if elements are moved, NOT re-created.
            // We are just moving existing DOM nodes.

            // Check if active element is inside this row
            const isActive = row.contains(document.activeElement);

            if (!isActive) {
                status = 'error';
                errorType = 'missing_result';
                row.classList.add('row-error');
                resultInput.classList.add('input-error');
            } else {
                status = 'editing'; // Treated as valid/top for now so it doesn't jump?
            }
        } else if (result !== "") {
            status = 'valid';
        }

        return { row, term, result, status, errorType };
    });

    // 2. Detect Duplicates (Only among 'valid' or 'editing' rows with results)
    const resultCounts = {};
    analyzedRows.forEach(item => {
        if (item.result) {
            const key = item.result.toLowerCase();
            resultCounts[key] = (resultCounts[key] || 0) + 1;
        }
    });

    analyzedRows.forEach(item => {
        if (item.result) {
            const key = item.result.toLowerCase();
            if (resultCounts[key] > 1) {
                item.status = 'error'; // Downgrade to error
                item.errorType = 'duplicate';
                item.row.classList.add('row-error');
                item.row.querySelector('.custom-result-input').classList.add('input-error');
            }
        }
    });

    // 3. Sorting Logic
    // Groups: Error -> Valid (Sorted) -> Empty
    // Note: 'editing' (incomplete but focused) should probably stay with 'valid' or 'error' but top?
    // Let's group 'editing' with 'valid' to prevent jumping away while typing, 
    // OR if user wants "Empty answer... red marked", it implies error.
    // User said: "if focus is NOT in question or answer field, mark red".
    // So while typing, it is NOT red.

    analyzedRows.sort((a, b) => {
        // Priority 1: Status Grouping
        const getGroupScore = (item) => {
            if (item.status === 'error') return 0; // Top
            if (item.status === 'editing') return 1; // While typing
            if (item.status === 'valid') return 2;
            return 3; // Empty bottom
        };

        const scoreA = getGroupScore(a);
        const scoreB = getGroupScore(b);

        if (scoreA !== scoreB) return scoreA - scoreB;

        // Priority 2: Sort Valid Items
        if (a.status === 'valid' && b.status === 'valid') {
            const isNumA = !isNaN(parseFloat(a.result));
            const isNumB = !isNaN(parseFloat(b.result));

            if (isNumA && isNumB) {
                return parseFloat(a.result) - parseFloat(b.result);
            } else {
                return a.result.localeCompare(b.result);
            }
        }

        return 0; // Output stable otherwise
    });

    // 4. Re-append in new order
    analyzedRows.forEach(item => list.appendChild(item.row));

    updateCustomCount();
}

function updateCustomCount() {
    const validCount = Array.from(document.querySelectorAll('.custom-result-input'))
        .filter(el => el.value.trim() !== "").length;

    const countEl = document.getElementById('custom-count');
    if (countEl) {
        countEl.textContent = validCount;
        countEl.style.color = validCount >= 1 ? 'var(--success)' : 'var(--primary-color)';
    }
}

async function saveAndCreateCustomGame() {
    const rows = Array.from(document.querySelectorAll('.custom-problem-row'));
    const pool = [];
    let hasError = false;

    rows.forEach(row => {
        const term = row.querySelector('.custom-term-input').value.trim();
        const result = row.querySelector('.custom-result-input').value.trim();

        if (term && !result) {
            hasError = true;
            row.querySelector('.custom-result-input').style.borderColor = 'var(--danger)';
        } else if (term && result) {
            // Check if result is number or text
            const num = parseFloat(result);
            const isNum = !isNaN(num) && isFinite(num);

            // We store exactly what user typed. The mode (Numbers/Text) is determined by generateLottoCard based on content.
            pool.push({ term, result: isNum ? num : result, drawn: false });
        }
    });

    if (hasError) return alert("Einige Aufgaben haben fehlende Antworten. Bitte korrigieren.");
    if (pool.length < 15) return alert("Bitte erstelle mindestens 15 gültige Aufgaben.");

    // Start Game as Host
    clearSession();
    isHost = true;
    const nameInput = document.getElementById('player-name');
    playerName = (nameInput ? nameInput.value : "") || "Host";
    localStorage.setItem('bingolator_player_name', playerName);
    gameId = Math.random().toString(36).substring(2, 6).toUpperCase();

    const settings = {
        opType: 'custom',
        range: 'custom' // generateLottoCard checks context
    };

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

        gameRef.onDisconnect().remove();
        hideModal('custom-problems-modal');
        setupLobbyListener();
        switchView('waiting-room-view');
        updateLobbyUI();
        saveSession();
    } catch (err) {
        console.error("Custom Host error:", err);
        alert("Fehler: " + err.message);
    }
}

window.removeCustomRow = removeCustomRow;

async function exportToJSON() {
    const rows = Array.from(document.querySelectorAll('.custom-problem-row'));
    const data = rows.map(row => {
        const term = row.querySelector('.custom-term-input').value.trim();
        const result = row.querySelector('.custom-result-input').value.trim();
        return { term, result };
    }).filter(item => item.term !== "" && item.result !== "");

    if (data.length === 0) return alert("Keine Aufgaben zum Exportieren vorhanden.");
    // ... rest of exportToJSON ...

    const jsonContent = JSON.stringify(data, null, 2);

    // Try to use the modern File System Access API for "Save As" dialog
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'bingolator_aufgaben.json',
                types: [{
                    description: 'JSON File',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(jsonContent);
            await writable.close();
        } catch (err) {
            console.error("Save cancelled or failed", err);
        }
    } else {
        // Fallback for older browsers
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bingolator_aufgaben.json';
        a.click();
        URL.revokeObjectURL(url);
    }
}

function importFromPaste() {
    const area = document.getElementById('json-import-area');
    if (!area || !area.value.trim()) return alert("Bitte füge zuerst JSON-Code ein.");

    try {
        const data = JSON.parse(area.value);
        if (!Array.isArray(data)) throw new Error("JSON muss ein Array sein.");

        loadProblemsIntoUI(data);
        hideModal('import-json-modal');
        area.value = '';
    } catch (e) {
        alert("Fehler beim Parsen des JSON: " + e.message);
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data)) throw new Error("JSON muss ein Array sein.");

            loadProblemsIntoUI(data);
            hideModal('import-json-modal');
            event.target.value = ''; // Reset input
        } catch (err) {
            alert("Fehler beim Lesen der Datei: " + err.message);
        }
    };
    reader.readAsText(file);
}

function loadProblemsIntoUI(data) {
    const list = document.getElementById('custom-problems-list');
    if (!list) return;

    // Clear and fill
    list.innerHTML = '';
    data.forEach(item => {
        if (item && typeof item.term === 'string') {
            // Use the unified addCustomRow function which handles term/result data
            addCustomRow(item);
        }
    });

    // Add empty rows if less than 15
    const currentCount = list.querySelectorAll('.custom-problem-row').length;
    for (let i = currentCount; i < 15; i++) {
        addCustomRow();
    }

    updateCustomCount();
    validateAndSortRows();
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

    // Generate unique recovery code
    const recoveryCode = Math.floor(1000 + Math.random() * 9000).toString();

    const playerRef = database.ref('games/' + gameId + '/players').push();
    playerId = playerRef.key;

    await playerRef.set({
        name: playerName,
        recoveryCode: recoveryCode,
        lives: 3,
        streak: 0,
        markedCount: 0
    });

    setupLobbyListener();
    switchView('waiting-room-view');
    updateLobbyUI();

    // Display Recovery Code
    const codeDisplay = document.getElementById('player-recovery-code-display');
    if (codeDisplay) codeDisplay.textContent = recoveryCode;

    saveSession();
}

async function rejoinGame() {
    clearSession();
    const gameIdInput = document.getElementById('rejoin-game-id');
    const recoveryInput = document.getElementById('rejoin-recovery-code');

    if (!gameIdInput || !recoveryInput) return; // Modal not ready?

    const gameCode = gameIdInput.value.trim().toUpperCase();
    const recoveryCode = recoveryInput.value.trim();

    if (gameCode.length !== 4) return alert("Bitte gib die 4-stellige GAME ID ein.");
    if (recoveryCode.length !== 4) return alert("Bitte deinen 4-stelligen Wiederherstellungs-Code eingeben.");

    gameId = gameCode;
    isHost = false;

    try {
        const snapshot = await database.ref('games/' + gameId).once('value');
        if (!snapshot.exists()) {
            if (/^\d{4}$/.test(gameCode)) {
                return alert("Spiel nicht gefunden! \nHast du vielleicht deinen Code statt der Game ID oben eingegeben?");
            }
            return alert("Spiel mit ID '" + gameCode + "' nicht gefunden!");
        }

        const data = snapshot.val();
        const players = data.players || {};

        const entry = Object.entries(players).find(([pid, p]) => p.recoveryCode == recoveryCode);

        if (!entry) return alert("Code ungültig! Kein Spieler mit diesem Code gefunden.");

        playerId = entry[0];
        const playerData = entry[1];
        playerName = playerData.name;
        localStorage.setItem('bingolator_player_name', playerName);

        // Restore State
        if (playerData.card) playerState.card = playerData.card;
        if (playerData.lives !== undefined) playerState.lives = playerData.lives;
        if (playerData.markedCount !== undefined) playerState.markedCount = playerData.markedCount;
        if (playerData.streak !== undefined) playerState.streak = playerData.streak;
        if (playerData.wonRows) playerState.wonRows = playerData.wonRows || [];

        console.log("Restored player:", playerName);

        hideModal('rejoin-modal'); // Close modal on success
        setupLobbyListener();

        if (data.status === 'PLAYING') {
            switchView('game-view');
            initGameScreen(data);
        } else {
            switchView('waiting-room-view');
        }

        updateLobbyUI();

        const codeDisplay = document.getElementById('player-recovery-code-display');
        if (codeDisplay) codeDisplay.textContent = recoveryCode;

        saveSession();

    } catch (e) {
        console.error("Rejoin error", e);
        alert("Fehler beim Beitreten: " + e.message);
    }
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

        if (isHost && data.status === 'PLAYING') {
            updateHostDashboard(data);
        }

        // WINNER LOGIC
        if (data.winners) {
            updateWinnerModal(data.winners);
        } else {
            hideModal('winner-modal');
        }
    });
}

function updatePlayerList(players) {
    const list = document.getElementById('lobby-player-slots');
    // For Host Modal
    const codesList = document.getElementById('player-codes-list');
    const modalGameId = document.getElementById('codes-modal-game-id');

    if (list) list.innerHTML = '';
    if (codesList && isHost) codesList.innerHTML = '';
    if (modalGameId && isHost) modalGameId.textContent = gameId;

    Object.entries(players).forEach(([pid, p]) => {
        // Lobby List
        const card = document.createElement('div');
        card.className = 'player-card-dynamic';
        let html = `<div class="avatar">${p.name[0].toUpperCase()}</div><div class="name">${p.name}</div>`;

        if (isHost) {
            html += `<button class="btn-kick-player" onclick="openKickModal('${pid}')" title="Spieler entfernen">×</button>`;

            // Add to Codes Modal List
            if (codesList) {
                const row = document.createElement('div');
                row.className = 'code-row';
                row.style = "display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);";
                row.innerHTML = `<span style="font-weight:bold;">${p.name}</span> <span style="font-family:monospace; font-size:1.2rem; color:var(--secondary-color);">${p.recoveryCode || '----'}</span>`;
                codesList.appendChild(row);
            }
        }

        card.innerHTML = html;
        if (list) list.appendChild(card);
    });

    if (isHost) {
        const btnStart = document.getElementById('btn-start-game');
        if (btnStart) btnStart.classList.remove('hidden');
    }

    // Toggle Host Codes Button
    const btnCodes = document.getElementById('btn-show-player-codes');
    if (btnCodes) {
        if (isHost) btnCodes.classList.remove('hidden');
        else btnCodes.classList.add('hidden');
    }
}

function updateLobbyUI() {
    const lobbyCodeDisplay = document.getElementById('lobby-code-display');
    if (lobbyCodeDisplay) lobbyCodeDisplay.textContent = gameId;

    const qrModalCode = document.getElementById('qr-modal-code');
    if (qrModalCode) qrModalCode.textContent = gameId;

    const qrContainer = document.getElementById('lobby-qr-large-container');
    if (qrContainer && typeof qrcode === 'function') {
        const baseUrl = window.location.href.split('?')[0];
        const joinUrl = `${baseUrl}?join=${gameId}`;

        try {
            const qr = qrcode(0, 'M');
            qr.addData(joinUrl);
            qr.make();
            qrContainer.innerHTML = qr.createImgTag(8);
        } catch (e) { console.warn("QR Error", e); }
    }
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
            resEl.style.fontSize = ""; // Reset custom size
            resEl.style.color = "";    // Reset custom color
        }

        const termEl = document.getElementById('host-current-term');
        if (termEl) termEl.textContent = "Klicke 'Zahl ziehen'";
    } else {
        // Player setup
        // Check if we already have a restored card in playerState (from rejoin)
        if (!playerState.card) {
            const sessionStr = localStorage.getItem('bingolator_session');
            let session = null;
            if (sessionStr) {
                try { session = JSON.parse(sessionStr); } catch (e) { }
            }

            if (session && session.card && session.gameId === gameId) {
                playerState.card = session.card;
                playerState.markedCount = session.markedCount || 0;
                playerState.lives = session.lives !== undefined ? session.lives : 3;
            } else {
                // Generate NEW Card
                playerState.lives = 3;
                playerState.markedCount = 0;
                playerState.wonRows = [];
                playerState.card = generateLottoCard(data.pool);

                // SYNC INITIAL STATE TO FIREBASE
                if (playerId && gameId) {
                    database.ref(`games/${gameId}/players/${playerId}`).update({
                        card: playerState.card,
                        lives: 3,
                        markedCount: 0,
                        wonRows: []
                    });
                }
                saveSession();
            }
        } else {
            // Card exists (restored from Rejoin), just render
        }

        renderBingoCard(playerState.card);
        updatePlayerHearts();

        // Hide overlays
        const goOverlay = document.getElementById('gameOverOverlay');
        if (goOverlay) goOverlay.classList.add('hidden');
        const fhOverlay = document.getElementById('fullHouseOverlay');
        if (fhOverlay) fhOverlay.classList.add('hidden');
        const rowOverlay = document.getElementById('rowOverlay');
        if (rowOverlay) rowOverlay.classList.add('hidden');
    }
}

async function hostDrawNext() {
    // Safety check: only draw if we are at the latest state
    const lastHistoryItem = currentGameData.history ? currentGameData.history[currentGameData.history.length - 1] : null;
    const isLatest = !currentGameData.currentProblem || !lastHistoryItem || currentGameData.currentProblem.id === lastHistoryItem.id;

    if (!isLatest) return; // Prevent drawing if viewing history

    const available = currentGameData.pool.filter(p => !p.drawn);
    if (available.length === 0) {
        const resEl = document.getElementById('host-current-result');
        const termEl = document.getElementById('host-current-term');
        if (resEl) {
            resEl.textContent = "ALLE GEZOGEN";
            resEl.style.fontSize = "8vh";
            resEl.style.color = "var(--warning)";
        }
        if (termEl) termEl.textContent = "Spiel beendet";
        return;
    }

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
}

function updateHostDashboard(data) {
    const problem = data.currentProblem;
    const history = data.history || [];

    const resEl = document.getElementById('host-current-result');
    const termEl = document.getElementById('host-current-term');
    const btnDraw = document.getElementById('btn-host-draw');

    if (resEl && problem) {
        resEl.innerHTML = formatTerm(problem.term);
        resEl.className = 'huge-term-display';
        resizeHostTerm();
    } else if (resEl) {
        // Initial state
        resEl.textContent = "Bereit?";
        resEl.className = 'huge-term-display ready-state';
    }

    if (termEl) termEl.textContent = problem ? "Aktuelle Aufgabe:" : "Klicke 'Zahl ziehen'";

    const historyEl = document.getElementById('host-history');
    if (historyEl) {
        historyEl.innerHTML = '';
        [...history].reverse().forEach(item => {
            const div = document.createElement('div');
            // Add 'active' class if this is the currently displayed problem
            const isActive = problem && item.id === problem.id;
            div.className = 'history-item clickable' + (isActive ? ' active-history' : '');
            div.innerHTML = `<span class="h-term-only">${formatTerm(item.term)}</span>`;

            div.onclick = () => hostJumpToHistory(item);

            historyEl.appendChild(div);
        });
    }

    // Logic to Disable Draw Button if not at latest
    if (btnDraw) {
        const lastItem = history.length > 0 ? history[history.length - 1] : null;
        const isAtHead = !problem || !lastItem || problem.id === lastItem.id;

        if (isAtHead) {
            btnDraw.disabled = false;
            btnDraw.style.opacity = "1";
            btnDraw.style.cursor = "pointer";
            btnDraw.textContent = "Zahl ziehen";
        } else {
            btnDraw.disabled = true;
            btnDraw.style.opacity = "0.5";
            btnDraw.style.cursor = "not-allowed";
            btnDraw.textContent = "Im Verlauf...";
        }
    }
}

async function hostJumpToHistory(problem) {
    if (!isHost) return;
    // No confirmation needed
    await database.ref('games/' + gameId).update({
        currentProblem: problem
    });
}

function renderBingoCard(card) {
    const grid = document.getElementById('bingoCard');
    if (!grid) return;
    grid.innerHTML = '';

    // Ensure we handle sparse arrays from Firebase by iterating 0..8 explicitly
    for (let r = 0; r < 3; r++) {
        const row = card && card[r] ? card[r] : [];

        for (let c = 0; c < 9; c++) {
            const cellData = row[c];

            let val = null;
            let isMarked = false;

            if (cellData !== undefined && cellData !== null) {
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
                cell.innerHTML = `<span>${val}</span>`;
                cell.onclick = () => handleCellClick(val, cell, r, c);
            }
            grid.appendChild(cell);
        }
    }

    // Adjust font sizes after render (robust sequence)
    triggerResizeSequence();
}

function resizeBingoText() {
    const cells = document.querySelectorAll('.bingo-cell:not(.empty)');
    if (cells.length === 0) return;

    let globalMinSize = 1000; // Start with a large value

    // Pass 1: Find the smallest fitting font size across ALL cells
    cells.forEach(cell => {
        const span = cell.querySelector('span');
        if (!span) return;

        // Reset styles for measurement
        span.style.fontSize = '10px';
        span.style.whiteSpace = 'nowrap';
        span.style.display = 'inline-block';
        span.style.lineHeight = '1';

        const w = cell.clientWidth - 10; // Safer horizontal buffer (padding is 8px total)
        const h = cell.clientHeight - 4; // Vertical buffer

        if (w <= 0 || h <= 0) return;

        // Start at a generous maximum (75% of tile height)
        // Limits single numbers but allows them to be big enough
        let size = Math.floor(h * 0.25);
        if (size < 12) size = 12; // Minimum baseline

        span.style.fontSize = size + 'px';

        // Shrink this specific cell's font size until it fits
        while ((span.offsetWidth > w || span.offsetHeight > h) && size > 8) {
            size--;
            span.style.fontSize = size + 'px';
        }

        // Track the lowest size found so far (limiting factor)
        if (size < globalMinSize) {
            globalMinSize = size;
        }
    });

    // Safety fallback
    if (globalMinSize > 1000) globalMinSize = 16;
    if (globalMinSize < 8) globalMinSize = 8;

    // Pass 2: Apply the determined global uniform size to ALL cells
    cells.forEach(cell => {
        const span = cell.querySelector('span');
        if (span) {
            span.style.fontSize = globalMinSize + 'px';
        }
    });
}

// Trigger resize multiple times to catch layout settle
function triggerResizeSequence() {
    resizeBingoText();
    resizeHostTerm();
    setTimeout(() => { resizeBingoText(); resizeHostTerm(); }, 50);
    setTimeout(() => { resizeBingoText(); resizeHostTerm(); }, 200);
    setTimeout(() => { resizeBingoText(); resizeHostTerm(); }, 500);
}

function resizeHostTerm() {
    const el = document.getElementById('host-current-result');
    if (!el) return;

    // Skip if in ready state (Keep default CSS size)
    if (el.classList.contains('ready-state')) return;

    const parent = el.parentElement;
    if (!parent) return;

    // Reset to base max size to measure
    el.style.fontSize = '18vh';
    el.style.whiteSpace = 'nowrap';

    // Get constraints
    const maxWidth = parent.clientWidth * 0.90; // Leave 10% buffer
    let currentSize = parseFloat(window.getComputedStyle(el).fontSize);

    // Iteratively shrink until it fits
    while (el.scrollWidth > maxWidth && currentSize > 20) {
        currentSize *= 0.9; // Reduce by 10%
        el.style.fontSize = `${currentSize}px`;
    }
}

window.addEventListener('resize', triggerResizeSequence);

function handleCellClick(value, cell, r, c) {
    if (playerState.lives <= 0) return;
    if (!currentGameData || !currentGameData.currentProblem || cell.classList.contains('marked')) return;

    let updated = false;

    if (value === currentGameData.currentProblem.result) {
        cell.classList.add('marked');
        playerState.markedCount++;
        playerState.streak++;
        playerState.card[r][c] = { val: value, marked: true };
        updated = true;

        updatePlayerStreak(); // Update UI
        saveSession();

        checkForWins();

        // Optional: Keep full card win check if desired, but Row Win is now primary
        if (playerState.markedCount === 15) {
            showModal('fullHouseOverlay');
        }
    } else {
        cell.classList.add('error-shake');
        setTimeout(() => cell.classList.remove('error-shake'), 500);

        playerState.lives--;
        playerState.streak = 0; // Reset Streak
        updated = true;

        updatePlayerHearts();
        updatePlayerStreak(); // Update UI
        saveSession();

        if (playerState.lives === 0) {
            showModal('gameOverOverlay');
        }
    }

    // SYNC UPDATE TO FIREBASE
    if (updated && playerId && gameId) {
        database.ref(`games/${gameId}/players/${playerId}`).update({
            card: playerState.card,
            lives: playerState.lives,
            streak: playerState.streak,
            markedCount: playerState.markedCount,
            wonRows: playerState.wonRows || []
        });
    }
}

function checkForWins() {
    if (!playerState.card) return;

    const card = playerState.card;
    const newlyWonRows = [];

    // Check each row (0, 1, 2)
    for (let r = 0; r < 3; r++) {
        // Skip if already won
        if (playerState.wonRows.includes(r)) continue;

        let filledCount = 0;
        let slotCount = 0;

        for (let c = 0; c < 9; c++) {
            const cell = card[r][c];
            if (cell !== null) {
                slotCount++;
                if (typeof cell === 'object' && cell.marked) {
                    filledCount++;
                }
            }
        }

        // A row is won if all slots (5) are marked
        if (slotCount > 0 && filledCount === slotCount) {
            newlyWonRows.push(r);
        }
    }

    if (newlyWonRows.length > 0) {
        // Update local state
        playerState.wonRows.push(...newlyWonRows);
        saveSession();

        // Push to Firebase
        database.ref('games/' + gameId + '/winners/' + playerId).set({
            name: playerName,
            card: playerState.card,
            rows: playerState.wonRows, // Send all won rows
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // Local Row Win Modal (only if NOT full house yet)
        if (playerState.markedCount < 15) {
            showModal('rowOverlay');
        }
    }
}

function updateWinnerModal(winners) {
    const modal = document.getElementById('winner-modal');
    const list = document.getElementById('winner-list');
    const previewContainer = document.getElementById('winner-card-preview');
    const btnContinue = document.getElementById('btn-winner-continue');
    const waitMsg = document.getElementById('winner-wait-msg');

    if (!modal || !list) return;

    list.innerHTML = '';

    // Sort winners by timestamp
    const sortedWinners = Object.values(winners).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    sortedWinners.forEach(winner => {
        const chip = document.createElement('div');
        chip.className = 'winner-chip';
        chip.innerHTML = `<span>🏆</span> ${winner.name}`;

        if (isHost) {
            chip.onclick = () => {
                // Highlight selected
                document.querySelectorAll('.winner-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');

                // Show card
                if (previewContainer) {
                    previewContainer.style.display = 'block';
                    document.getElementById('preview-player-name').textContent = winner.name;
                    renderPreviewCard(winner.card, winner.rows);
                }
            };
        }

        list.appendChild(chip);
    });

    if (isHost) {
        if (btnContinue) btnContinue.classList.remove('hidden');
        if (waitMsg) waitMsg.classList.add('hidden');
    } else {
        if (btnContinue) btnContinue.classList.add('hidden');
        if (waitMsg) waitMsg.classList.remove('hidden');
    }

    showModal('winner-modal');
}

function renderPreviewCard(card, winningRows) {
    const grid = document.getElementById('preview-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Handle potential Firebase object-instead-of-array structure
    // We assume 3 rows, 9 columns fixed.
    for (let r = 0; r < 3; r++) {
        const row = card && card[r] ? card[r] : {}; // Handle missing rows

        for (let c = 0; c < 9; c++) {
            let cellData = row[c]; // Might be undefined if null in Firebase

            let val = null;
            let isMarked = false;

            if (cellData !== undefined && cellData !== null) {
                if (typeof cellData === 'object') {
                    val = cellData.val;
                    isMarked = cellData.marked;
                } else {
                    val = cellData;
                }
            }

            const cell = document.createElement('div');
            cell.className = 'bingo-cell-preview' + (val === null ? ' empty' : '') + (isMarked ? ' marked' : '');

            // Highlight winning row cells
            if (winningRows && winningRows.includes(r) && val !== null) {
                cell.style.borderColor = '#fff';
                cell.style.boxShadow = '0 0 10px #fff';
            }

            if (val !== null) cell.textContent = val;
            grid.appendChild(cell);
        }
    }
}

function continueGame() {
    if (!isHost) return;
    database.ref('games/' + gameId + '/winners').remove();
}


function updateProblemDisplay(problem) {
    const display = document.getElementById('currentTermDisplay');
    if (display) {
        display.innerHTML = problem ? formatTerm(problem.term) : "Warte auf Host...";
    }
}

function updatePlayerStreak() {
    const valEl = document.getElementById('streakValue');
    const container = document.getElementById('streakContainer');
    if (!valEl || !container) return;

    valEl.textContent = playerState.streak;

    if (playerState.streak >= 3) {
        container.style.animation = 'pulse 1s infinite';
    } else {
        container.style.animation = 'none';
    }
}

function updatePlayerHearts() {
    const container = document.getElementById('heartsContainer');
    if (!container) return;
    let html = '';
    for (let i = 0; i < 3; i++) {
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
        const ops = settings.opType === 'mixed' ? ['+', '-', '*', '/'] : [settings.opType.replace('add', '+').replace('sub', '-').replace('mul', '*').replace('div', '/')];
        op = ops[Math.floor(Math.random() * ops.length)];

        if (settings.range === '1x1') {
            a = rand(1, 10); b = rand(1, 10); op = '*';
        } else if (op === '+') {
            a = rand(1, max - 5); b = rand(1, max - a);
        } else if (op === '-') {
            a = rand(5, max); b = rand(1, a);
        } else if (op === '*') {
            a = rand(1, 10); b = rand(1, Math.floor(max / a) || 1);
        } else {
            b = rand(2, 10); res = rand(1, Math.floor(max / b) || 1); a = b * res;
        }

        res = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b;
        term = `${a} ${op.replace('*', '·').replace('/', ':')} ${b}`;

        if (res > 0 && !seenResults.has(res)) {
            seenResults.add(res);
            pool.push({ term, result: res, drawn: false });
        }
    }
    return pool;
}

function generateLottoCard(pool) {
    // 1. Get unique results from the pool
    let uniquePoolResults = [...new Set(pool.map(p => p.result))];

    // Check if results are primarily numbers
    const isNumeric = uniquePoolResults.every(r => !isNaN(parseFloat(r)) && isFinite(r));

    if (isNumeric) {
        uniquePoolResults = uniquePoolResults.map(r => parseFloat(r)).sort((a, b) => a - b);
    } else {
        // Text mode: just shuffle or keep as is, order doesn't matter for picking
        uniquePoolResults.sort(() => Math.random() - 0.5);
    }

    if (uniquePoolResults.length < 15) {
        console.error("Not enough unique results in pool to generate a card.");
        return Array.from({ length: 3 }, () => Array(9).fill(null));
    }

    // 2. Pick 15 unique results for this card
    const selectedResults = [];

    if (isNumeric) {
        // STRICT MODE for Numbers: Max 2 per column bin
        // First, group ALL unique results into potential bins
        const allBins = Array.from({ length: 9 }, () => []);
        const minVal = uniquePoolResults[0];
        const maxVal = uniquePoolResults[uniquePoolResults.length - 1];
        const totalRange = maxVal - minVal;

        uniquePoolResults.forEach(res => {
            let col;
            if (totalRange >= 80) {
                // Classic Bingo: 0-9, 10-19, ..., 80-90
                col = Math.floor(res / 10);
                if (col > 8) col = 8;
            } else {
                // Dynamic Bins for smaller ranges (e.g. 1-20)
                col = totalRange === 0 ? 0 : Math.floor(((res - minVal) / (totalRange + 1)) * 9);
            }
            col = Math.max(0, Math.min(8, col));
            allBins[col].push(res);
        });

        // Now pick up to 2 from each bin until we have 15
        const binIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        const pickedPerBin = Array(9).fill(0);

        // Pass 1: Try to get at least 1 from as many bins as possible first
        // Shuffle bin order for randomness
        let shuffledBins = [...binIndices].sort(() => Math.random() - 0.5);

        // Try to pick 15 numbers total
        let count = 0;

        // Loop until we have 15 or run out of options
        while (count < 15) {
            // Find bins that have items left AND count < 2 (strict)
            let candidates = shuffledBins.filter(i => allBins[i].length > 0 && pickedPerBin[i] < 2);

            if (candidates.length === 0) {
                // Relax rule: allow > 2 if strict fails (rare fallback)
                candidates = shuffledBins.filter(i => allBins[i].length > 0);
                if (candidates.length === 0) break; // Total exhaustion
            }

            // Pick a random bin from candidates
            const target = candidates[Math.floor(Math.random() * candidates.length)];
            const valIndex = Math.floor(Math.random() * allBins[target].length);
            const val = allBins[target].splice(valIndex, 1)[0];

            selectedResults.push(val);
            pickedPerBin[target]++;
            count++;
        }

        selectedResults.sort((a, b) => a - b);

    } else {
        // Text Mode: Simple random pick
        const shuffled = [...uniquePoolResults].sort(() => Math.random() - 0.5);
        selectedResults.push(...shuffled.slice(0, 15));
    }

    // 3. Group selected results into 9 column bins dynamically

    // 3. Group selected results into 9 column bins dynamically
    const columnBins = Array.from({ length: 9 }, () => []);

    if (isNumeric) {
        const minVal = uniquePoolResults[0];
        const maxVal = uniquePoolResults[uniquePoolResults.length - 1];
        const totalRange = maxVal - minVal;

        selectedResults.forEach(res => {
            let col;
            if (totalRange >= 80) {
                col = Math.floor(res / 10);
            } else {
                col = totalRange === 0 ? 0 : Math.floor(((res - minVal) / (totalRange + 1)) * 9);
            }
            col = Math.max(0, Math.min(8, col));
            columnBins[col].push(res);
        });
    } else {
        // Text-based: Distribute RANDOMLY across 9 columns to ensure variety
        // But ensure we don't overfill columns immediately
        // Simple approach: Round-robin or random pick
        const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8].slice(0, 15); // 15 slots
        indices.sort(() => Math.random() - 0.5); // Shuffle slots

        selectedResults.forEach((res, i) => {
            const col = indices[i];
            columnBins[col].push(res);
        });
    }

    // 4. Balance the bins
    let unbalanced = true;
    while (unbalanced) {
        unbalanced = false;
        for (let i = 0; i < 9; i++) {
            while (columnBins[i].length > 3) {
                const val = columnBins[i].pop();
                // Find a column with space (<3)
                // Prefer random distribution
                const candidates = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(c => columnBins[c].length < 3);

                if (candidates.length > 0) {
                    const target = candidates[Math.floor(Math.random() * candidates.length)];
                    columnBins[target].push(val);
                } else {
                    // Critical failure (should not happen with 15 items and 9x3 slots)
                    columnBins[i].push(val); // Put back to avoid data loss
                    unbalanced = false; // Force break to avoid infinite loop
                    break;
                }
                unbalanced = true; // Re-check all columns
            }
        }
    }

    if (isNumeric) {
        columnBins.forEach(bin => bin.sort((a, b) => a - b));
    } else {
        // For text, no sorting within column needed, but maybe looks nicer? 
        // Let's keep them random or sorted by length? Let's keep random.
    }

    let card;
    let valid = false;
    let attempts = 0;

    // 5. Grid arrangement (3 rows, 9 columns, 5 per row)
    while (!valid && attempts < 2000) {
        attempts++;
        card = Array.from({ length: 3 }, () => Array(9).fill(null));
        let rowCounts = [0, 0, 0];
        let success = true;

        for (let c = 0; c < 9; c++) {
            const bin = columnBins[c];
            if (bin.length === 0) continue;

            const availableRows = [0, 1, 2].sort(() => Math.random() - 0.5);
            let placedInCol = 0;
            for (const r of availableRows) {
                if (placedInCol < bin.length && rowCounts[r] < 5) {
                    card[r][c] = true;
                    rowCounts[r]++;
                    placedInCol++;
                }
            }
            if (placedInCol < bin.length) {
                success = false;
                break;
            }
        }

        if (success && rowCounts.every(count => count === 5)) {
            valid = true;
        }
    }

    if (valid) {
        for (let c = 0; c < 9; c++) {
            const bin = columnBins[c];
            const activeRows = [];
            for (let r = 0; r < 3; r++) {
                if (card[r][c] === true) activeRows.push(r);
            }
            activeRows.sort((a, b) => a - b);
            activeRows.forEach((r, i) => {
                card[r][c] = bin[i];
            });
        }
    } else {
        // Fallback
        card = Array.from({ length: 3 }, () => Array(9).fill(null));
        selectedResults.forEach((val, i) => {
            card[Math.floor(i / 5)][i % 9] = val;
        });
    }

    return card;
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

document.addEventListener('DOMContentLoaded', () => {
    // --- ORIENTATION LOCK LOGIC ---
    const checkOrientation = () => {
        const overlay = document.getElementById('orientation-lock-overlay');
        if (!overlay) return;

        // Check if portrait
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;

        if (isPortrait) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation(); // Initial check

    initApp();
});
