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
const DB_NAME = 'BingoDB';
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
        wonRows: playerState.wonRows,
        wrongAnswers: playerState.wrongAnswers,
        lastActive: Date.now()
    };
    localStorage.setItem('bingo_session', JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem('bingo_session');
    playerState = {
        lives: 3,
        streak: 0,
        markedCount: 0,
        wonRows: [], // Track completed rows
        card: null,
        wrongAnswers: []
    };
}

function checkSession() {
    const sessionStr = localStorage.getItem('bingo_session');
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
        playerState.wrongAnswers = session.wrongAnswers || [];

        console.log("Restoring session:", gameId);

        // Ensure UI is ready
        bindEvents();

        // Re-connect to game
        setupLobbyListener();

        // Check if we need to show Redemption Modal
        if (playerState.lives <= 0) {
            setTimeout(() => {
                initRedemptionModal();
            }, 500);
        }

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
/**
 * Initialize Firebase & Core App
 */
// --- QR SCANNER LOGIC ---

function onScanSuccess(decodedText, decodedResult) {
    // Handle the scanned code
    console.log(`Scan result: ${decodedText}`, decodedResult);

    // Clean URL if it's a full URL
    let code = decodedText;
    try {
        if (decodedText.includes('join=')) {
            const url = new URL(decodedText);
            code = url.searchParams.get('join');
        }
    } catch (e) {
        // Not a URL, hopefully a direct code
    }

    if (code) {
        stopQrScanner(); // Close scanner
        enterJoinMode(code.toUpperCase());
    }
}

function onScanFailure(error) {
    // handle scan failure, usually better to ignore and keep scanning.
    // console.warn(`Code scan error = ${error}`);
}

function startQrScanner() {
    showModal('qr-scanner-overlay');

    // If not already created
    if (!html5QrScanner) {
        html5QrScanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        html5QrScanner.render(onScanSuccess, onScanFailure);
    }
}

function stopQrScanner() {
    hideModal('qr-scanner-overlay');
    // We can pause or clear.
    // If we want to restart fresh next time:
    if (html5QrScanner) {
        html5QrScanner.clear().then(() => {
            html5QrScanner = null;
        }).catch((err) => {
            console.error("Failed to clear html5QrcodeScanner. ", err);
        });
    }
}

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
    const savedName = localStorage.getItem('bingo_player_name');
    if (savedName) {
        const pNameInput = document.getElementById('player-name');
        if (pNameInput) pNameInput.value = savedName;
        playerName = savedName;
    }

    // Restore Settings
    const savedSettings = localStorage.getItem('bingo_settings');
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

    // 4. Auto-Show Install Modal if requested via URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('install') === 'true') {
        showInstallModal();
        // Clean URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('install');
        window.history.replaceState({}, document.title, newUrl.toString());
    }

    // PRIORITIZE URL JOIN CODE
    if (params.has('join')) {
        const code = params.get('join').toUpperCase();
        enterJoinMode(code);
        // Do NOT call checkSession() if joining a specific game via URL
        // We assume the user wants to join THIS game, not restore an old one.
        return;
    }

    // Check for active session (Player)
    if (checkSession()) return;

    // CHECK FOR ACTIVE HOST SESSION
    const savedHostGame = localStorage.getItem('bingo_host_game_id');
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
                localStorage.removeItem('bingo_host_game_id');
            }
        });
    }
}

// Missing function fix
function updatePlayerStreak() {
    // Currently no UI for streak in player view, so this is a placeholder/no-op
    // or we can add console log for debug
    console.log("Streak updated:", playerState.streak);
}

function enterJoinMode(code) {
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

    // MANUAL CLAIM BUTTON
    const btnClaimBingo = document.getElementById('btn-claim-bingo');
    if (btnClaimBingo) btnClaimBingo.onclick = claimBingo;

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
                // Update URL without reload
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('join', code);
                window.history.pushState({}, '', currentUrl);

                // Trigger Join Mode manually
                enterJoinMode(code);
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
    localStorage.setItem('bingo_player_name', playerName);
    gameId = Math.random().toString(36).substring(2, 6).toUpperCase();

    // CHECK FOR CUSTOM SAVED GAME SELECTION
    const savedGameSelect = document.getElementById('my-saved-games');
    const selectedGameName = savedGameSelect ? savedGameSelect.value : "";

    let pool = [];
    let settings = {};

    if (selectedGameName) {
        try {
            const game = await getSavedGame(selectedGameName);
            if (game && game.problems && game.problems.length > 0) {
                // Map stored problems to pool format
                pool = game.problems.map(p => ({
                    term: p.term,
                    result: p.result, // Keep original (number or string)
                    drawn: false
                }));
                settings = {
                    opType: 'custom',
                    range: 'custom',
                    gameName: selectedGameName
                };
            } else {
                alert("Fehler: Ausgewähltes Spiel scheint leer zu sein.");
                return;
            }
        } catch (e) {
            console.error("Error loading custom game", e);
            alert("Fehler beim Laden des Spiels.");
            return;
        }
    } else {
        // STANDARD GENERATION
        settings = {
            opType: document.getElementById('opType').value,
            range: document.getElementById('range').value
        };
        localStorage.setItem('bingo_settings', JSON.stringify(settings));
        pool = generateProblemPool(settings);
    }

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

        localStorage.setItem('bingo_host_game_id', gameId);

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
    playerName = localStorage.getItem('bingo_player_name') || "Host";

    const snapshot = await database.ref('games/' + gameId).once('value');
    if (!snapshot.exists()) {
        alert("Spiel nicht mehr vorhanden.");
        localStorage.removeItem('bingo_host_game_id');
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
    localStorage.removeItem('bingo_host_game_id');
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
             <input type="text" class="custom-term-input" placeholder="Wieviel ist 5+5?" value="${termVal}" data-last-term="${termVal}" style="width: 100%; padding: 8px;">
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
    const lastTerm = termInput.getAttribute('data-last-term') || "";

    // AUTO-CALC LOGIC
    if (!skipAutoCalc && term && (term !== lastTerm || (!resultInput.value.trim() && !resultInput.disabled))) {
        termInput.setAttribute('data-last-term', term);
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
    localStorage.setItem('bingo_player_name', playerName);
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
                suggestedName: 'bingo_aufgaben.json',
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
        a.download = 'bingo_aufgaben.json';
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
    localStorage.setItem('bingo_player_name', playerName);

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
        localStorage.setItem('bingo_player_name', playerName);

        // Restore State
        if (playerData.card) playerState.card = playerData.card;
        if (playerData.lives !== undefined) playerState.lives = playerData.lives;
        if (playerData.markedCount !== undefined) playerState.markedCount = playerData.markedCount;
        if (playerData.streak !== undefined) playerState.streak = playerData.streak;
        if (playerData.wonRows) playerState.wonRows = playerData.wonRows || [];
        // NEW: Restore wrongAnswers if they were synced (we need to sync them first!)
        if (playerData.wrongAnswers) playerState.wrongAnswers = playerData.wrongAnswers || [];

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
        checkAndShowHostToasts(players); // NEW: Check for notifications

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

        if (data.winners) {
            updateWinnerModal(data.winners);
        } else {
            hideModal('winner-modal');
        }

        // FINISHED GAME STATE
        if (data.status === 'FINISHED') {
            const btnEnd = document.getElementById('btn-host-end-game');
            if (btnEnd) {
                btnEnd.textContent = "Verlassen";
                btnEnd.classList.add('btn-danger'); // Optional styling
            }
            if (data.bingoLog) {
                // Determine if we should show stats automatically
                // Maybe only if the user hasn't closed it yet? 
                // For now, let's just update it.
                // We add a check to avoid spamming the modal if it's already open/closed
                // But simplified: Just show it.
                if (!document.getElementById('stats-modal').classList.contains('active')) {
                    // showStatsModal(data.bingoLog); // Maybe too aggressive to show repeatedly?
                    // Only show if we just transitioned? 
                    // Let's just update the content if modal is open, or open it once.
                }
                showStatsModal(data.bingoLog);
            }
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
 * NEW: Handle Host "End Game" vs "Leave"
 */
function handleHostGameEnd() {
    if (currentGameData && currentGameData.status === 'FINISHED') {
        confirmLeaveGame();
    } else {
        showModal('finish-round-confirm-modal');
    }
}

function confirmFinishGameRound() {
    hideModal('finish-round-confirm-modal');
    finishGameRound();
}

async function finishGameRound() {
    await database.ref('games/' + gameId).update({
        status: 'FINISHED'
    });
}

function showStatsModal(bingoLog) {
    if (!bingoLog) return;
    showModal('stats-modal');

    const sortedEvents = Object.values(bingoLog).sort((a, b) => a.timestamp - b.timestamp);
    const superBingos = sortedEvents.filter(e => e.type === 'SUPER').map(e => e.player);

    // Filter Row Bingos (Standard) - Unique Players for Ranks
    const rowEvents = sortedEvents.filter(e => e.type === 'ROW');
    const uniqueWinners = [];
    const seenPlayers = new Set();

    rowEvents.forEach(e => {
        if (!seenPlayers.has(e.player)) {
            uniqueWinners.push(e.player);
            seenPlayers.add(e.player);
        }
    });

    document.getElementById('stat-1-bingo').textContent = uniqueWinners[0] || '-';
    document.getElementById('stat-2-bingo').textContent = uniqueWinners[1] || '-';
    document.getElementById('stat-3-bingo').textContent = uniqueWinners[2] || '-';

    const superEl = document.getElementById('stat-superbingo');
    if (superBingos.length > 0) {
        superEl.textContent = superBingos.join(', ');
        superEl.style.color = 'var(--success)';
        superEl.style.fontWeight = 'bold';
    } else {
        superEl.textContent = '-';
        superEl.style.color = '';
    }
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
            const sessionStr = localStorage.getItem('bingo_session');
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
        finishGameRound();
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

    if (resEl) {
        const currentId = problem ? problem.id : 'ready';
        const prevId = resEl.dataset.lastId;

        // ONLY Update if the problem ID has changed
        if (currentId !== prevId) {
            if (problem) {
                resEl.innerHTML = formatTerm(problem.term);
                resEl.className = 'huge-term-display';
                // Slight delay to ensure DOM render before measuring
                requestAnimationFrame(() => resizeHostTerm());
            } else {
                resEl.textContent = "Bereit?";
                resEl.className = 'huge-term-display ready-state';
            }
            resEl.dataset.lastId = currentId;
        }
    }

    if (termEl) termEl.textContent = problem ? "Aktuelle Aufgabe:" : "Klicke 'Zahl ziehen'";

    const historyEl = document.getElementById('host-history');
    if (historyEl) {
        // Detect if history content actually changed to prevent flickering
        // We use a simple JSON string comparison for now, or just length + last ID
        const currentHistoryIds = history.map(h => h.id).join(',');

        // Also check if the "active" item changed (based on current problem ID)
        // FORCE STRING COMPARISON: Dataset values are always strings
        const currentProblemId = (problem && problem.id !== undefined) ? String(problem.id) : '';
        const prevHistoryIds = historyEl.dataset.historyIds || '';
        const prevProblemId = historyEl.dataset.problemId || '';

        if (currentHistoryIds !== prevHistoryIds || currentProblemId !== prevProblemId) {
            historyEl.innerHTML = '';
            [...history].reverse().forEach(item => {
                const div = document.createElement('div');
                // Add 'active' class if this is the currently displayed problem
                const isActive = problem && String(item.id) === currentProblemId;
                div.className = 'history-item clickable' + (isActive ? ' active-history' : '');
                div.innerHTML = `<span class="h-term-only">${formatTerm(item.term)}</span>`;

                div.onclick = () => hostJumpToHistory(item);

                historyEl.appendChild(div);
            });

            // Update markers
            historyEl.dataset.historyIds = currentHistoryIds;
            historyEl.dataset.problemId = currentProblemId;
        }
    }

    // Logic to Disable Draw Button if not at latest
    if (btnDraw) {
        const lastItem = history.length > 0 ? history[history.length - 1] : null;
        // String conversion for safe comparison
        const isAtHead = !problem || !lastItem || String(problem.id) === String(lastItem.id);

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
    if (playerState.lives <= 0) {
        initRedemptionModal();
        return;
    }
    if (!currentGameData || !currentGameData.currentProblem || cell.classList.contains('marked')) return;
    if (currentGameData.status === 'FINISHED') return; // Game Ended

    let updated = false;

    // Use loose equality or String conversion to handle Number vs String discrepancies
    if (String(value) === String(currentGameData.currentProblem.result)) {
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

        // TRACK WRONG ANSWER
        if (!playerState.wrongAnswers) playerState.wrongAnswers = [];

        // Avoid duplicates if clicked multiple times
        const currentProblem = currentGameData.currentProblem;
        const exists = playerState.wrongAnswers.find(w => w.id === currentProblem.id);

        if (!exists) {
            playerState.wrongAnswers.push({
                id: currentProblem.id,
                term: currentProblem.term,
                correctResult: currentProblem.result
            });
        }

        updatePlayerHearts();
        // updatePlayerStreak(); // REMOVED
        saveSession();

        if (playerState.lives === 0) {
            // showModal('gameOverOverlay'); // OLD way
            initRedemptionModal(); // NEW way
        }
    }

    // SYNC UPDATE TO FIREBASE
    if (updated && playerId && gameId) {
        database.ref(`games/${gameId}/players/${playerId}`).update({
            card: playerState.card,
            lives: playerState.lives,
            // streak: playerState.streak, // REMOVED
            markedCount: playerState.markedCount,
            wonRows: playerState.wonRows || [],
            almostBingo: playerState.almostBingo || null,
            wrongAnswers: playerState.wrongAnswers || [] // SYNC THIS
        });
    }
}

// MANUAL CLAIM STATE
let lastClaimedState = { rows: 0, super: false };

function checkForWins() {
    if (!playerState.card) return;

    const card = playerState.card;
    // Track how many rows we had BEFORE this check
    const previousRowCount = playerState.wonRows.length;

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

        // -------------------------------------------------------------
        // NEW LOGIC: Only trigger "ROW" Bingo if it is the FIRST row won.
        // If player already had rows (previousRowCount > 0), subsequent rows are silent.
        // -------------------------------------------------------------
        if (previousRowCount === 0) {
            const timestamp = firebase.database.ServerValue.TIMESTAMP;
            // Push event for the first row found (usually just one at a time)
            database.ref('games/' + gameId + '/bingoLog').push({
                player: playerName,
                type: 'ROW',
                row: newlyWonRows[0],
                timestamp: timestamp
            });
        }
    }

    // CHECK FULL HOUSE (SUPERBINGO) - ALWAYS TRIGGERS
    if (playerState.markedCount === 15 && !playerState.hasFullHouse) {
        playerState.hasFullHouse = true;
        database.ref('games/' + gameId + '/bingoLog').push({
            player: playerName,
            type: 'SUPER',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }

    // CHECK FOR CLAIM BUTTON VISIBILITY
    // Show if we have ANY rows (even silent ones) or Super Bingo
    // effectively: if we have un-claimed wins
    const currentRows = playerState.wonRows.length;
    const currentSuper = playerState.hasFullHouse;

    if (currentRows > lastClaimedState.rows || (currentSuper && !lastClaimedState.super)) {
        const btnClaim = document.getElementById('btn-claim-bingo');
        if (btnClaim) btnClaim.classList.remove('hidden');
    }

    // CHECK FOR "ALMOST THERE" (1 away)
    const almostStatus = checkAlmostThere();
    if (almostStatus) {
        playerState.almostBingo = almostStatus;
    } else {
        playerState.almostBingo = null;
    }
}

function claimBingo() {
    if (!playerId || !gameId) return;

    const btnClaim = document.getElementById('btn-claim-bingo');
    if (btnClaim) btnClaim.classList.add('hidden');

    // Update claimed state
    lastClaimedState.rows = playerState.wonRows.length;
    lastClaimedState.super = playerState.hasFullHouse;

    // Push to Firebase
    database.ref('games/' + gameId + '/winners/' + playerId).set({
        name: playerName,
        card: playerState.card,
        rows: playerState.wonRows,
        isSuper: playerState.hasFullHouse || false,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

function checkAlmostThere() {
    if (!playerState.card) return null;
    const card = playerState.card;

    // 1. Check Full House (Super Bingo) - HIGHEST PRIORITY
    // Distance to 15
    if (playerState.markedCount === 14) {
        // Find the single missing number on the whole card
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = card[r][c];
                if (cell !== null) {
                    const isMarked = (typeof cell === 'object' && cell.marked);
                    if (!isMarked) {
                        let val = (typeof cell === 'object') ? cell.val : cell;
                        return { type: 'SUPER', missing: val };
                    }
                }
            }
        }
    }

    // 2. Check Rows (Standard Bingo)
    // Only relevant if we haven't won any rows yet (since 2nd row is silent)
    if (playerState.wonRows.length > 0) return null;

    for (let r = 0; r < 3; r++) {
        if (playerState.wonRows.includes(r)) continue;

        let blocked = false;
        let missing = [];

        for (let c = 0; c < 9; c++) {
            const cell = card[r][c];
            if (cell !== null) {
                // If it's a number slot
                if (typeof cell === 'object' && cell.marked) {
                    // Marked, good.
                } else {
                    // Not marked.
                    let val = (typeof cell === 'object') ? cell.val : cell;
                    missing.push(val);
                }
            }
        }

        // If exactly 1 missing, return it
        if (missing.length === 1) {
            return { type: 'ROW', row: r, missing: missing[0] };
        }
    }

    return null;
}

// --- HOST TOASTS ---
const shownToasts = new Set(); // Track "PlayerID-MissingNum-Type" to avoid spam

function checkAndShowHostToasts(players) {
    if (!isHost) return;

    Object.entries(players).forEach(([pid, p]) => {
        if (p.almostBingo) {
            // Include type in signature so "Row 1-away" is distinct from "Super 1-away"
            const type = p.almostBingo.type || 'ROW';
            const signature = `${pid}-${p.almostBingo.missing}-${type}`;

            if (!shownToasts.has(signature)) {
                // Show it
                showHostToast(p.name, p.almostBingo.missing, type === 'SUPER');
                shownToasts.add(signature);

                // Cleanup old signatures (optional, simple cache)
                if (shownToasts.size > 50) shownToasts.clear();
            }
        }
    });
}

function showHostToast(playerName, missingNum, isSuper) {
    const container = document.getElementById('host-notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'host-toast' + (isSuper ? ' super-bingo' : '');

    // Icon
    const icon = isSuper ? '🏆' : '🔥';
    const msg = isSuper
        ? `<strong>${playerName}</strong> braucht noch <strong style="font-size:1.2em; border:1px solid white; padding:0 4px; border-radius:4px;">${missingNum}</strong> für SUPERBINGO!`
        : `<strong>${playerName}</strong> braucht noch <strong style="font-size:1.2em; border:1px solid white; padding:0 4px; border-radius:4px;">${missingNum}</strong> für eine Reihe!`;

    toast.innerHTML = `<span style="font-size: 1.5rem;">${icon}</span> <span>${msg}</span>`;

    // Newest always bottom, but we use flex-col-reverse in CSS for visual stacking if preferred, 
    // OR just append. User requested "disappear upwards", "others slide up".
    // Standard flex-col + append child works:
    // [Toast 1]
    // [Toast 2]
    // If Toast 1 removed, Toast 2 slides up.

    container.appendChild(toast);

    // Remove after 5 seconds
    setTimeout(() => {
        // Slide UP and Fade OUT
        toast.style.animation = 'slideUpFadeOut 0.5s ease-in forwards';
        setTimeout(() => {
            // Collapse height to make others slide up smoothly (optional polish)
            toast.style.height = '0';
            toast.style.margin = '0';
            toast.style.padding = '0';
            toast.style.overflow = 'hidden';

            // Then remove DOM
            setTimeout(() => toast.remove(), 300);
        }, 500);
    }, 5000);
}

function updateWinnerModal(winners) {
    const modal = document.getElementById('winner-modal');
    const list = document.getElementById('winner-list');
    const previewContainer = document.getElementById('winner-card-preview');
    const btnContinue = document.getElementById('btn-winner-continue');
    const waitMsg = document.getElementById('winner-wait-msg');
    const selfWinMsg = document.getElementById('player-win-message');
    const title = modal.querySelector('.game-title');

    if (!modal || !list) return;

    list.innerHTML = '';

    // Sort winners by timestamp
    const sortedWinners = Object.entries(winners)
        .map(([pid, data]) => ({ ...data, pid }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    if (sortedWinners.length === 0) {
        hideModal('winner-modal');
        return;
    }

    const latestWinner = sortedWinners[sortedWinners.length - 1];
    const isSuperBingo = latestWinner.isSuper;

    // Update Modal Styling for SuperBingo
    if (isSuperBingo) {
        modal.classList.add('superbingo');
        title.innerHTML = 'SUPER BINGO!';
    } else {
        modal.classList.remove('superbingo');
        title.innerHTML = 'BINGO!';
    }

    // Render Winner Chips
    sortedWinners.forEach(winner => {
        const chip = document.createElement('div');
        chip.className = 'winner-chip';
        // Mark selected if it's the latest one (default behavior)
        const isSelected = winner.pid === latestWinner.pid;
        if (isSelected) chip.classList.add('selected');

        chip.innerHTML = `<span>🏆</span> ${winner.name}`;

        // Host click to switch view
        if (isHost) {
            chip.onclick = () => {
                document.querySelectorAll('.winner-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');

                if (previewContainer) {
                    previewContainer.style.display = 'block';
                    document.getElementById('preview-player-name').textContent = winner.name;
                    renderPreviewCard(winner.card, winner.rows);
                }
            };
        }
        list.appendChild(chip);
    });

    // --- AUTO SHOW LATEST WINNER ---

    // HOST VIEW
    if (isHost) {
        if (previewContainer) {
            previewContainer.style.display = 'block';
            document.getElementById('preview-player-name').textContent = latestWinner.name;
            renderPreviewCard(latestWinner.card, latestWinner.rows);
        }
        if (btnContinue) btnContinue.classList.remove('hidden');
        if (waitMsg) waitMsg.classList.add('hidden');
        if (selfWinMsg) selfWinMsg.classList.add('hidden');
    }
    // PLAYER VIEW
    else {
        // Am I the latest winner?
        if (latestWinner.pid === playerId) {
            if (selfWinMsg) selfWinMsg.classList.remove('hidden');
            if (previewContainer) {
                previewContainer.style.display = 'block';
                document.getElementById('preview-player-name').textContent = "DIR";
                renderPreviewCard(latestWinner.card, latestWinner.rows);
            }
        } else {
            // Another player won
            if (selfWinMsg) selfWinMsg.classList.add('hidden');
            // Show their card too? Request said "Show winner card" - implies generally.
            if (previewContainer) {
                previewContainer.style.display = 'block';
                document.getElementById('preview-player-name').textContent = latestWinner.name;
                renderPreviewCard(latestWinner.card, latestWinner.rows);
            }
        }

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


// --- NEW: New Number Notification ---
function updateProblemDisplay(problem) {
    const display = document.getElementById('currentTermDisplay');
    if (!display) return;

    // Determine if it's a new number (host-side drawing)
    const newTerm = problem ? formatTerm(problem.term) : "Warte...";
    const currentTerm = display.innerHTML;

    // Only trigger modal if:
    // 1. We have a problem
    // 2. The term is different (new ID is better but term diff works for unique pool)
    // 3. We are NOT the host (host sees it in dashboard)
    if (problem && newTerm !== currentTerm && !isHost) {
        showNewNumberModal(newTerm);
    }

    display.innerHTML = newTerm;
}

function showNewNumberModal(text) {
    const modal = document.getElementById('new-number-modal');
    const content = document.getElementById('new-number-display');
    if (!modal || !content) return;

    content.innerHTML = text;
    modal.classList.remove('hidden');
    modal.classList.remove('animate-out');

    // Dynamic Font Scaling
    // Reset to max size
    content.style.fontSize = '15vw'; // Start massive
    content.style.whiteSpace = 'nowrap';
    content.style.display = 'inline-block'; // Ensure correct measurement

    // Force a reflow/render to measure
    requestAnimationFrame(() => {
        // Use a small timeout to ensure layout has happened after removing 'hidden'
        setTimeout(() => {
            const maxWidth = window.innerWidth * 0.85; // 85% of screen width
            const currentWidth = content.scrollWidth;

            if (currentWidth > maxWidth) {
                const scale = maxWidth / currentWidth;
                const currentFontSize = parseFloat(window.getComputedStyle(content).fontSize);
                const newFontSize = Math.floor(currentFontSize * scale);

                // Apply, but enforce a minimum just in case
                content.style.fontSize = Math.max(newFontSize, 16) + 'px';
            }
        }, 10);
    });

    // Shortened to 2 seconds
    setTimeout(() => {
        modal.classList.add('animate-out');
        // Hide completely after animation
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('animate-out');
        }, 800);
    }, 2000);
}

// Streak logic removed.
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
    // Handle both object {result: ...} and raw values if ever mixed (should be uniform though)
    let uniquePoolResults = [...new Set(pool.map(p => p.result))];

    // Check if numeric
    const isNumeric = uniquePoolResults.every(r => !isNaN(parseFloat(r)) && isFinite(r));

    if (uniquePoolResults.length < 15) {
        console.error("Not enough unique results in pool to generate a card.");
        return Array.from({ length: 3 }, () => Array(9).fill(null));
    }

    if (isNumeric) {
        uniquePoolResults = uniquePoolResults.map(r => parseFloat(r)).sort((a, b) => a - b);
    } else {
        // Text mode: shuffle to allow random selection
        uniquePoolResults.sort(() => Math.random() - 0.5);
    }

    // 2. Determine Columns Distribution (Min 1, Max 2 per column) => 6 cols with 2, 3 cols with 1
    const colCounts = Array(9).fill(1); // Start with 1 everywhere
    // Add 6 more items randomly to 6 distinct columns
    const indicesForExtras = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5).slice(0, 6);
    indicesForExtras.forEach(i => colCounts[i]++);

    // Total items needed: 15
    const finalItems = [];
    const columnBins = Array.from({ length: 9 }, () => []);

    if (!isNumeric || uniquePoolResults.length < 40) {
        // SMALL POOL or TEXT: Use Quantile/Random Distribution
        // If numeric small pool (e.g. custom 15 items), we can't strict-bin by 1-10, 11-20 etc.
        // Instead, just distribute the AVAILABLE numbers into columns evenly.

        let available = [...uniquePoolResults];

        if (isNumeric) {
            // Sort available, and split into 9 chunks?
            // Or better: Assign specific picked numbers later?
            // Strategy: Pick 15 numbers first? 
            // If we have exactly 15, we must use all. 
            // If we have 20, we pick 15.

            // To maintain numeric order in columns:
            // 1. Pick 15 items (randomly or uniformly?)
            // If custom game < 40 items, assume we use all or most.
            // Let's Just Pick 15 unique items first.

            // If we have exactly 15, use them all.
            // If > 15, pick 15 random ones? No, for "Bingo" feel, range spread is better.
            // But for small custom sets, random is safer.

            // Let's shuffle available and pick 15, then SORT them.
            const picked = available.sort(() => Math.random() - 0.5).slice(0, 15);
            if (isNumeric) picked.sort((a, b) => a - b);

            // Now distribute 'picked' into the 9 columns according to colCounts
            // colCounts is e.g. [2, 1, 2, 2, 1, ...] sum=15
            // picked is sorted [1, 5, 8, 12, ... 90]

            let currentIdx = 0;
            for (let c = 0; c < 9; c++) {
                const count = colCounts[c];
                for (let k = 0; k < count; k++) {
                    columnBins[c].push(picked[currentIdx++]);
                }
            }
        } else {
            // Text: Just fill bins randomly based on counts
            const availableShuffled = available.sort(() => Math.random() - 0.5);
            let current = 0;
            for (let c = 0; c < 9; c++) {
                const count = colCounts[c];
                for (let k = 0; k < count; k++) {
                    if (current < availableShuffled.length) {
                        columnBins[c].push(availableShuffled[current++]);
                    }
                }
            }
        }
    } else {
        // LARGE NUMERIC POOL (Standard 1x1 or large custom) -> Use Classic Ranges
        // Goal: Pick items such that they fit the colCounts distribution.

        // Define standard ranges
        const getCol = (val) => {
            // 1-9, 10-19, ..., 80+
            if (val === 0) return 0; // standard 1x1 can have results like 4
            let c = Math.floor(val / 10);
            // Adjust: 1-10 goes to col 0? Usually 1-9 col0, 10-19 col1.
            // Bingo logic: Col 0 (B) = 1-15... wait standard US bingo is 5x5.
            // European 90-ball: 9 cols.
            // Col 0: 1-9, Col 1: 10-19 ... Col 8: 80-90.
            if (val >= 90) return 8; // Catch max
            // If result is e.g. 100 (from 10x10), put in last col?
            // Or scale based on max?
            return Math.min(8, Math.floor((val - 1) / 10)); // 1-10 -> 0? No, 1-9->0.
            // Let's stick to the previous range logic if possible, or dynamic.
            // Previous logic: col = Math.floor(res/10).
        };

        // Group ALL available results into buckets
        const allBuckets = Array.from({ length: 9 }, () => []);
        const maxVal = uniquePoolResults[uniquePoolResults.length - 1];

        uniquePoolResults.forEach(val => {
            let c;
            if (maxVal <= 90) {
                c = val === 0 ? 0 : Math.floor(val / 10);
                if (val === 90) c = 8; // 90 in last col
            } else {
                // Scale to 9 cols
                c = Math.floor((val / (maxVal + 1)) * 9);
            }
            c = Math.max(0, Math.min(8, c));
            allBuckets[c].push(val);
        });

        // Try to fulfill validCounts from these buckets
        // bucket[i] needs colCounts[i] items.
        // If not enough items in a bucket, we have a problem -> Fallback to Quantile method.

        const possible = colCounts.every((req, i) => allBuckets[i].length >= req);

        if (possible) {
            // Great! Pick random items for each col
            for (let c = 0; c < 9; c++) {
                const bucket = allBuckets[c];
                // Shuffle bucket
                const shuffled = bucket.sort(() => Math.random() - 0.5);
                const picked = shuffled.slice(0, colCounts[c]);
                // Sort within column? Yes usually strict order in column
                picked.sort((a, b) => a - b);
                columnBins[c] = picked;
            }
        } else {
            // Fallback: Quantile method (same as small pool)
            console.log("Standard binning failed (buckets too empty), using quantile fallback.");
            const picked = uniquePoolResults.sort(() => Math.random() - 0.5).slice(0, 15).sort((a, b) => a - b);
            let currentIdx = 0;
            for (let c = 0; c < 9; c++) {
                for (let k = 0; k < colCounts[c]; k++) {
                    columnBins[c].push(picked[currentIdx++]);
                }
            }
        }
    }

    // 3. Grid Construction
    // We have columnBins filled with correct counts (sum 15).
    // Now place them into the 3x9 grid (card).
    // Rule: Max 5 items per row. (Implied by total 15, 3 rows? No, 5 per row is strict).
    // We need to decide for each column WHICH rows get the cells.
    // e.g. Col 0 has 2 items -> needs 2 rows. Col 1 has 1 item -> needs 1 row.
    // Constraint: Sum of items in Row 0 must be 5. Row 1 must be 5. Row 2 must be 5.

    // Algorithm to assign rows:
    // We have 9 cols. 
    // cols with 2 items: 6 cols.
    // cols with 1 item: 3 cols.
    // Total cells = 6*2 + 3*1 = 15.
    // Target row sums: 5, 5, 5.

    // Let's assign row indices for each column.
    // For a "2-item" column, we need 2 distinct rows (e.g. [0,1], [0,2], [1,2]).
    // For a "1-item" column, we need 1 row (e.g. [0], [1], [2]).

    // We can solve this randomly:
    // Create a pool of row slots: 5x Row0, 5x Row1, 5x Row2. Total 15 slots.
    // We iterate through columns 0..8.
    // If col needs 2 items, we pick 2 distinct available row slots.
    // If col needs 1 item, we pick 1 available row slot.
    // Backtracking or randomized retry might be needed if we corner ourselves.

    let card = null;
    let attempts = 0;

    while (!card && attempts < 500) {
        attempts++;
        const tempCard = Array.from({ length: 3 }, () => Array(9).fill(null));
        const rowSlots = [5, 5, 5]; // Remaining capacity
        let success = true;

        // Shuffle column processing order to avoid bias
        const colOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => Math.random() - 0.5);

        for (const c of colOrder) {
            const count = columnBins[c].length; // 1 or 2

            // Available rows for this column (must have capacity > 0)
            const validRows = [0, 1, 2].filter(r => rowSlots[r] > 0);

            if (validRows.length < count) {
                success = false;
                break;
            }

            // Pick 'count' rows randomly from validRows
            const pickedRows = validRows.sort(() => Math.random() - 0.5).slice(0, count);

            // Mark them
            pickedRows.forEach(r => {
                tempCard[r][c] = true; // Placeholder
                rowSlots[r]--;
            });
        }

        if (success) {
            // Final verification
            if (rowSlots.every(s => s === 0)) {
                card = tempCard;
            }
        }
    }

    if (!card) {
        console.error("Failed to generate valid grid layout after attempts.");
        return Array.from({ length: 3 }, () => Array(9).fill(null)); // Should not happen often
    }

    // 4. Fill values into the determined slots
    for (let c = 0; c < 9; c++) {
        const bin = columnBins[c]; // 1 or 2 values (sorted usually)
        // Find which rows are active in this col
        const activeRows = [];
        for (let r = 0; r < 3; r++) {
            if (card[r][c] === true) activeRows.push(r);
        }
        // activeRows is sorted 0..2. bin is sorted value-wise.
        // Assign sequentially
        activeRows.forEach((r, i) => {
            card[r][c] = bin[i];
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

// --- REDEMPTION LOGIC ---

function initRedemptionModal() {
    const list = document.getElementById('redemption-tasks-container');
    if (!list) return;
    list.innerHTML = '';

    // Safety check: if no wrong answers tracked (legacy/error), give 3 random math tasks
    let tasks = playerState.wrongAnswers || [];
    if (tasks.length === 0) {
        // Fallback: This shouldn't happen normally if logic works
        tasks = [
            { term: '1 + 1', correctResult: '? (2)' },
            { term: '2 + 2', correctResult: '? (4)' },
            { term: '3 + 3', correctResult: '? (6)' }
        ];
    }

    // Render Tasks
    tasks.forEach((task, index) => {
        const card = document.createElement('div');
        card.className = 'redemption-task-card';
        card.dataset.index = index;

        // Determine mode based on correctResult type
        // If it's a number, use number input. If string, use dropdown.
        const correctVal = task.correctResult;
        const isTextMode = isNaN(parseFloat(correctVal)); // More robust check

        let contextHtml = '';

        if (isTextMode) {
            // Dropdown for text answers
            // Get unique answers from current game pool
            // Ensure pool exists, otherwise fallback
            const pool = currentGameData && currentGameData.pool ? currentGameData.pool : [];
            const allAnswers = [...new Set(pool.map(p => p.result))].sort();

            let optionsHtml = allAnswers.map(ans =>
                `<div class="redemption-option" onclick="selectRedemptionOption('${index}', '${ans.replace(/'/g, "'")}')">${ans}</div>`
            ).join('');

            contextHtml = `
                <div class="redemption-input-group">
                    <input type="text" 
                           class="redemption-input filter-input" 
                           placeholder="Antwort suchen..." 
                           oninput="filterRedemptionDropdown('${index}', this.value)"
                           onfocus="toggleRedemptionDropdown('${index}', true)"
                           autocomplete="off">
                    <div id="dropdown-${index}" class="redemption-dropdown">
                        ${optionsHtml}
                    </div>
                    <input type="hidden" id="answer-${index}" class="final-answer">
                </div>
             `;
        } else {
            // Simple Math Input
            contextHtml = `
                <div class="redemption-input-group">
                    <input type="number" id="answer-${index}" class="redemption-input final-answer" placeholder="Ergebnis?">
                </div>
            `;
        }

        card.innerHTML = `
            <span class="redemption-term">${formatTerm(task.term)}</span>
            ${contextHtml}
        `;

        list.appendChild(card);
    });

    // Bind global click to close dropdowns
    // Use a named function to avoid duplicates if possible, or just rely on new listener
    window.removeEventListener('click', closeRedemptionDropdowns); // Cleanup old if any
    window.addEventListener('click', closeRedemptionDropdowns);

    // Bind Check Button
    const checkBtn = document.getElementById('btn-check-redemption');
    if (checkBtn) checkBtn.onclick = checkRedemptionAnswers;

    showModal('redemption-modal');
}

function closeRedemptionDropdowns(event) {
    if (!event.target.matches('.filter-input')) {
        document.querySelectorAll('.redemption-dropdown').forEach(d => d.classList.remove('visible'));
        // Remove high z-index from all cards
        document.querySelectorAll('.redemption-task-card').forEach(c => c.classList.remove('active-z'));
    }
}

function toggleRedemptionDropdown(index, forceShow = false) {
    const dropdown = document.getElementById(`dropdown-${index}`);
    if (!dropdown) return;

    // Hide others and reset z-index
    document.querySelectorAll('.redemption-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.remove('visible');
    });
    document.querySelectorAll('.redemption-task-card').forEach(c => c.classList.remove('active-z'));

    // Toggle current
    const card = document.querySelector(`.redemption-task-card[data-index="${index}"]`);

    if (forceShow) {
        dropdown.classList.add('visible');
        if (card) card.classList.add('active-z');

        // If input is empty, ensure all options are visible
        const input = card.querySelector('.filter-input');
        if (input && input.value === '') {
            filterRedemptionDropdown(index, '');
        }
    } else {
        dropdown.classList.toggle('visible');
        if (dropdown.classList.contains('visible')) {
            if (card) card.classList.add('active-z');
        } else {
            if (card) card.classList.remove('active-z');
        }
    }
}

function selectRedemptionOption(index, value) {
    const input = document.querySelector(`.redemption-task-card[data-index="${index}"] .filter-input`);
    const hidden = document.getElementById(`answer-${index}`);
    const dropdown = document.getElementById(`dropdown-${index}`);
    const card = document.querySelector(`.redemption-task-card[data-index="${index}"]`);

    if (input) input.value = value;
    if (hidden) hidden.value = value;
    if (dropdown) dropdown.classList.remove('visible');
    if (card) card.classList.remove('active-z');
}

function filterRedemptionDropdown(index, text) {
    const dropdown = document.getElementById(`dropdown-${index}`);
    if (!dropdown) return;

    dropdown.classList.add('visible');
    // Ensure z-index is active
    const card = document.querySelector(`.redemption-task-card[data-index="${index}"]`);
    if (card) card.classList.add('active-z');

    const options = dropdown.querySelectorAll('.redemption-option');
    const filter = text.toLowerCase();

    let hasMatch = false;
    options.forEach(opt => {
        const txt = opt.textContent.toLowerCase();
        if (filter === '' || txt.includes(filter)) {
            opt.style.display = "block";
            hasMatch = true;
        } else {
            opt.style.display = "none";
        }
    });
}

function checkRedemptionAnswers() {
    const list = document.getElementById('redemption-tasks-container');
    const cards = list.querySelectorAll('.redemption-task-card'); let allCorrect = true;

    const tasks = playerState.wrongAnswers || [];

    cards.forEach((card, i) => {
        const task = tasks[i];

        // Get value
        let val = '';
        const simpleInput = card.querySelector('input[type="number"]');
        if (simpleInput) {
            val = simpleInput.value.trim();
        } else {
            const hidden = card.querySelector('.final-answer');
            val = hidden ? hidden.value.trim() : '';
        }

        // Compare (permissive)
        const isMatch = (val.toString().toLowerCase() === task.correctResult.toString().toLowerCase());

        if (isMatch) {
            card.classList.remove('wrong');
            card.classList.add('correct');
        } else {
            card.classList.remove('correct');
            card.classList.add('wrong');
            allCorrect = false;
        }
    });

    if (allCorrect) {
        // Success!
        setTimeout(() => {
            playerState.lives = 3;
            playerState.wrongAnswers = []; // Clear debt

            // Sync
            if (playerId && gameId) {
                database.ref(`games/${gameId}/players/${playerId}`).update({
                    lives: 3
                });
            }
            saveSession();

            hideModal('redemption-modal');
            updatePlayerHearts();
            showModal('redemption-success-modal');
        }, 800);
    } else {
        // Shake anim
        const btn = document.getElementById('btn-check-redemption');
        btn.classList.add('error-shake');
        setTimeout(() => btn.classList.remove('error-shake'), 500);
    }
}

// --- GLOBAL EXPORTS ---
window.handleHostGameEnd = handleHostGameEnd;
window.confirmFinishGameRound = confirmFinishGameRound;

/* --- HOST ALL ANSWERS GRID --- */
function showAllAnswersModal() {
    if (!currentGameData || !currentGameData.pool) return;

    // Check mode: If >80% are numbers, treat as number mode
    let numberCount = 0;
    const pool = currentGameData.pool;
    pool.forEach(p => {
        if (!isNaN(parseFloat(p.result))) numberCount++;
    });

    const isNumberMode = pool.length > 0 && (numberCount / pool.length) > 0.8;

    // Sort
    const sortedPool = [...pool].sort((a, b) => {
        if (isNumberMode) {
            const valA = parseFloat(a.result);
            const valB = parseFloat(b.result);
            if (!isNaN(valA) && !isNaN(valB)) return valA - valB;
        }
        return a.result.toString().localeCompare(b.result.toString(), undefined, { numeric: true, sensitivity: 'base' });
    });

    const grid = document.getElementById('all-answers-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Layout Class
    grid.className = 'answers-grid';
    // If Number Mode and enough items, use 10-col grid (typical for 1-90)
    // Otherwise responsive text mode
    if (isNumberMode && pool.length >= 20) {
        grid.classList.add('grid-10-cols');
    } else {
        grid.classList.add('text-mode');
    }

    sortedPool.forEach(item => {
        const div = document.createElement('div');
        div.className = 'answer-cell';
        if (item.drawn) div.classList.add('drawn');

        // Format result (if fraction or special)
        div.innerHTML = formatTerm(item.result.toString());

        // Tooltip Data
        div.dataset.term = item.term;

        // Events
        div.addEventListener('mousedown', showGridTooltip);
        div.addEventListener('touchstart', showGridTooltip, { passive: true });
        div.addEventListener('mouseup', hideGridTooltip);
        div.addEventListener('mouseleave', hideGridTooltip);
        div.addEventListener('touchend', hideGridTooltip);
        div.addEventListener('touchcancel', hideGridTooltip);

        grid.appendChild(div);
    });

    showModal('all-answers-modal');
}

window.showAllAnswersModal = showAllAnswersModal;

/* --- TOOLTIP EVENT HANDLERS --- */
function showGridTooltip(e) {
    const term = e.currentTarget.dataset.term;
    if (!term) return;

    const tooltip = document.getElementById('grid-tooltip');
    if (!tooltip) return;

    // Set Text
    tooltip.textContent = term;

    // Position
    const rect = e.currentTarget.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = rect.top + 'px';

    // Show
    tooltip.classList.remove('hidden');
    requestAnimationFrame(() => {
        tooltip.classList.add('visible');
    });
}

function hideGridTooltip() {
    const tooltip = document.getElementById('grid-tooltip');
    if (!tooltip) return;

    tooltip.classList.remove('visible');
    setTimeout(() => {
        if (!tooltip.classList.contains('visible')) {
            tooltip.classList.add('hidden');
        }
    }, 200);
}
