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
let customMode = 'auto'; // 'auto' or 'manual'
let playerState = {
    lives: 3,
    streak: 0,
    markedCount: 0,
    card: null
};
let isLeaving = false; // Flag to prevent 'kicked' modal during voluntary exit

let html5QrScanner = null;

// --- Helper Functions ---

function switchCustomTab(mode) {
    customMode = mode;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${mode}`);
    if (activeTab) activeTab.classList.add('active');

    const title = document.getElementById('custom-modal-title');
    const desc = document.getElementById('custom-modal-desc');
    const importArea = document.getElementById('json-import-area');
    const guideAuto = document.getElementById('guide-container-auto');
    const guideManual = document.getElementById('guide-container-manual');

    if (mode === 'auto') {
        if (title) title.textContent = "Eigene Mathe-Aufgaben";
        if (desc) desc.textContent = "Ergebnisse werden automatisch berechnet (1-90).";
        if (importArea) importArea.placeholder = '[{"term":"12+8"}, {"term":"5·3"}]';
        if (guideAuto) guideAuto.classList.remove('hidden');
        if (guideManual) guideManual.classList.add('hidden');
    } else {
        if (title) title.textContent = "Quiz & Text-Aufgaben";
        if (desc) desc.textContent = "Gib Frage und Antwort manuell ein (Text möglich).";
        if (importArea) importArea.placeholder = '[{"term":"Frage", "result":"Antwort"}]';
        if (guideAuto) guideAuto.classList.add('hidden');
        if (guideManual) guideManual.classList.remove('hidden');
    }

    // Clear and reset list for the new mode
    const list = document.getElementById('custom-problems-list');
    if (list) {
        list.innerHTML = '';
        for (let i = 0; i < 15; i++) addCustomRow();
    }
    updateCustomCount();
}
window.switchCustomTab = switchCustomTab;

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

    // Check for active session
    if (checkSession()) return;

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

    const btnUploadTrigger = document.getElementById('btn-upload-json');
    const fileInput = document.getElementById('json-file-input');
    if (btnUploadTrigger && fileInput) {
        btnUploadTrigger.onclick = () => fileInput.click();
        fileInput.onchange = handleFileUpload;
    }

    const btnDownloadGuide = document.getElementById('btn-download-guide');
    if (btnDownloadGuide) {
        btnDownloadGuide.onclick = () => {
            const a = document.createElement('a');
            a.href = 'BINGOLATOR_PROMPT.md';
            a.download = 'BINGOLATOR_PROMPT.md';
            a.click();
        };
    }

    const btnDownloadTextGuide = document.getElementById('btn-download-text-guide');
    if (btnDownloadTextGuide) {
        btnDownloadTextGuide.onclick = () => {
            const a = document.createElement('a');
            a.href = 'BINGOLATOR_TEXT_PROMPT.md';
            a.download = 'BINGOLATOR_TEXT_PROMPT.md';
            a.click();
        };
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

    const btnCloseQrLarge = document.getElementById('btn-close-qr-large');
    if (btnCloseQrLarge) btnCloseQrLarge.onclick = () => hideModal('lobby-qr-modal');

    const btnScanQr = document.getElementById('btn-scan-qr');
    if (btnScanQr) btnScanQr.onclick = startQrScanner;

    const btnCloseQr = document.getElementById('btn-close-qr');
    if (btnCloseQr) btnCloseQr.onclick = stopQrScanner;

    const btnWinnerContinue = document.getElementById('btn-winner-continue');
    if (btnWinnerContinue) btnWinnerContinue.onclick = continueGame;

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
                    if (parts.length > 1) code = parts[1].split('&')[0];
                }
            } else {
                if (decodedText.trim().length === 4) code = decodedText.trim();
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
 * Custom Problems Logic
 */
function openCustomModal() {
    hideModal('create-game-modal');
    showModal('custom-problems-modal');
    customProblems = [];
    const list = document.getElementById('custom-problems-list');
    if (list) list.innerHTML = '';
    for (let i = 0; i < 15; i++) addCustomRow();
}

function addCustomRow() {
    const list = document.getElementById('custom-problems-list');
    if (!list) return;

    const rowId = Date.now() + Math.random();
    const row = document.createElement('div');
    row.className = 'custom-problem-row';
    row.id = `row-${rowId}`;
    row.style = 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; animation: slideIn 0.2s ease-out;';

    if (customMode === 'auto') {
        row.innerHTML = `
            <input type="text" class="custom-term-input" placeholder="z.B. 12 + 8" style="flex: 2; padding: 8px;">
            <div class="custom-result-display" style="flex: 1; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; text-align: center; font-weight: 700; color: var(--secondary-color); min-height: 40px; display: flex; align-items: center; justify-content: center;">-</div>
            <button class="btn-kick-player" style="position: static; width: 32px; height: 32px;" onclick="removeCustomRow('${rowId}')">×</button>
        `;
    } else {
        // Manual Mode: Input for Result instead of Display
        row.innerHTML = `
            <input type="text" class="custom-term-input" placeholder="Frage / Begriff" style="flex: 2; padding: 8px;">
            <input type="text" class="custom-manual-result-input" placeholder="Antwort" style="flex: 1; padding: 8px; font-weight:700; color:var(--secondary-color); text-align:center;">
            <button class="btn-kick-player" style="position: static; width: 32px; height: 32px;" onclick="removeCustomRow('${rowId}')">×</button>
            <div class="custom-result-display hidden"></div> <!-- Hidden sync target -->
        `;
    }

    list.appendChild(row);

    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleCustomInput(input, row);
                input.blur();
            }
        });
        input.addEventListener('blur', (e) => {
            handleCustomInput(input, row);
        });
    });
}

function removeCustomRow(id) {
    const row = document.getElementById(`row-${id}`);
    if (row) row.remove();
    updateCustomCount();
}

function handleCustomInput(input, row) {
    let term = row.querySelector('.custom-term-input').value.trim();
    const resultDisplay = row.querySelector('.custom-result-display');
    const manualResultInput = row.querySelector('.custom-manual-result-input');

    if (customMode === 'auto') {
        // Prettify input: replace * with · and / with :
        term = term.replace(/\*/g, '·').replace(/\//g, ':');
        row.querySelector('.custom-term-input').value = term;

        row.querySelector('.custom-term-input').style.borderColor = '';
        resultDisplay.style.color = 'var(--secondary-color)';

        if (!term) {
            resultDisplay.textContent = '-';
            updateCustomCount();
            return;
        }

        try {
            const sanitizedTerm = term.replace(/·/g, '*').replace(/:/g, '/').replace(/×/g, '*').replace(/÷/g, '/');
            if (/[^0-9+\-*/().\s]/.test(sanitizedTerm)) throw new Error();
            const result = eval(sanitizedTerm);

            if (isNaN(result) || !isFinite(result)) throw new Error();

            resultDisplay.textContent = result;

            if (result < 1 || result > 90) {
                resultDisplay.textContent = 'Range!';
                resultDisplay.style.color = 'var(--danger)';
                row.querySelector('.custom-term-input').style.borderColor = 'var(--danger)';
            }

            const allResults = Array.from(document.querySelectorAll('.custom-result-display'))
                .map(el => el.textContent)
                .filter(t => t !== '-' && t !== 'Range!' && t !== 'Double!' && t !== '?');

            const count = allResults.filter(r => r === result.toString()).length;
            if (count > 1) {
                resultDisplay.textContent = 'Double!';
                resultDisplay.style.color = 'var(--danger)';
                row.querySelector('.custom-term-input').style.borderColor = 'var(--danger)';
            }
            sortCustomRows();
        } catch (e) {
            resultDisplay.textContent = '?';
            resultDisplay.style.color = 'var(--text-muted)';
        }
    } else {
        // MANUAL MODE
        const result = manualResultInput.value.trim();
        resultDisplay.textContent = result || '-'; // Sync display for counting logic

        manualResultInput.style.borderColor = '';
        if (result) {
            // Check for duplicates in manual results
            const allResults = Array.from(document.querySelectorAll('.custom-manual-result-input'))
                .map(el => el.value.trim())
                .filter(t => t !== "");

            const count = allResults.filter(r => r.toLowerCase() === result.toLowerCase()).length;
            if (count > 1) {
                manualResultInput.style.borderColor = 'var(--danger)';
            }
        }
    }

    updateCustomCount();
}

function sortCustomRows() {
    if (customMode !== 'auto') return; // Only sort automatically calculated math

    const list = document.getElementById('custom-problems-list');
    const rows = Array.from(list.querySelectorAll('.custom-problem-row'));

    rows.sort((a, b) => {
        const resA = parseFloat(a.querySelector('.custom-result-display').textContent) || 999;
        const resB = parseFloat(b.querySelector('.custom-result-display').textContent) || 999;
        return resA - resB;
    });

    rows.forEach(row => list.appendChild(row));
}

function updateCustomCount() {
    let validCount = 0;
    if (customMode === 'auto') {
        validCount = Array.from(document.querySelectorAll('.custom-result-display'))
            .filter(el => {
                const val = parseFloat(el.textContent);
                return !isNaN(val) && val >= 1 && val <= 90;
            }).length;
    } else {
        validCount = Array.from(document.querySelectorAll('.custom-manual-result-input'))
            .filter(el => el.value.trim() !== "").length;
    }

    const countEl = document.getElementById('custom-count');
    if (countEl) {
        countEl.textContent = validCount;
        countEl.style.color = validCount >= 15 ? 'var(--success)' : 'var(--primary-color)';
    }
}

async function saveAndCreateCustomGame() {
    const rows = Array.from(document.querySelectorAll('.custom-problem-row'));
    const pool = [];
    let hasError = false;

    rows.forEach(row => {
        const term = row.querySelector('.custom-term-input').value.trim();
        let result;

        if (customMode === 'auto') {
            const resultText = row.querySelector('.custom-result-display').textContent;
            result = parseFloat(resultText);
            if (term && (isNaN(result) || result < 1 || result > 90 || resultText === 'Double!')) {
                hasError = true;
            }
        } else {
            result = row.querySelector('.custom-manual-result-input').value.trim();
            if (term && !result) hasError = true;
        }

        if (term && result) {
            pool.push({ term, result, drawn: false });
        }
    });

    if (hasError) return alert("Einige Aufgaben haben Fehler oder fehlende Antworten.");
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
        range: customMode === 'auto' ? 'custom' : 'text'
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
        let result;
        if (customMode === 'auto') {
            result = row.querySelector('.custom-result-display').textContent;
            if (result === '-' || result === '?' || result === 'Range!' || result === 'Double!') result = undefined;
        } else {
            result = row.querySelector('.custom-manual-result-input').value.trim();
        }
        return { term, result };
    }).filter(item => item.term !== "");

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
            const rowId = Date.now() + Math.random();
            const row = document.createElement('div');
            row.className = 'custom-problem-row';
            row.id = `row-${rowId}`;
            row.style = 'display: flex; gap: 10px; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; animation: slideIn 0.2s ease-out;';

            if (customMode === 'auto') {
                row.innerHTML = `
                    <input type="text" class="custom-term-input" placeholder="z.B. 12 + 8" style="flex: 2; padding: 8px;" value="${item.term}">
                    <div class="custom-result-display" style="flex: 1; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; text-align: center; font-weight: 700; color: var(--secondary-color); min-height: 40px; display: flex; align-items: center; justify-content: center;">-</div>
                    <button class="btn-kick-player" style="position: static; width: 32px; height: 32px;" onclick="removeCustomRow('${rowId}')">×</button>
                `;
            } else {
                row.innerHTML = `
                    <input type="text" class="custom-term-input" placeholder="Frage / Begriff" style="flex: 2; padding: 8px;" value="${item.term}">
                    <input type="text" class="custom-manual-result-input" placeholder="Antwort" style="flex: 1; padding: 8px; font-weight:700; color:var(--secondary-color); text-align:center;" value="${item.result || ''}">
                    <button class="btn-kick-player" style="position: static; width: 32px; height: 32px;" onclick="removeCustomRow('${rowId}')">×</button>
                    <div class="custom-result-display hidden"></div>
                `;
            }

            list.appendChild(row);

            // Add Listeners
            const termInput = row.querySelector('.custom-term-input');
            if (termInput) {
                termInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        handleCustomInput(termInput, row);
                        termInput.blur();
                    }
                });
                termInput.addEventListener('blur', () => handleCustomInput(termInput, row));
            }

            if (customMode !== 'auto') {
                const manualInput = row.querySelector('.custom-manual-result-input');
                if (manualInput) {
                    manualInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            handleCustomInput(manualInput, row);
                            manualInput.blur();
                        }
                    });
                    manualInput.addEventListener('blur', () => handleCustomInput(manualInput, row));
                }
            }

            // Initial calculation/validation for each row
            if (termInput) handleCustomInput(termInput, row);
        }
    });

    // Add empty rows if less than 15
    const currentCount = list.querySelectorAll('.custom-problem-row').length;
    for (let i = currentCount; i < 15; i++) {
        addCustomRow();
    }

    updateCustomCount();
    if (customMode === 'auto') sortCustomRows();
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
        const sessionStr = localStorage.getItem('bingolator_session');
        let session = null;
        if (sessionStr) {
            try {
                session = JSON.parse(sessionStr);
            } catch (e) { }
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
            playerState.wonRows = []; // Reset wonRows
            playerState.card = generateLottoCard(data.pool);
            saveSession();
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
        resEl.textContent = problem.term;
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
            div.innerHTML = `<span class="h-term-only">${item.term}</span>`;

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
                cell.innerHTML = `<span>${val}</span>`;
                cell.onclick = () => handleCellClick(val, cell, r, c);
            }
            grid.appendChild(cell);
        });
    });

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

    if (value === currentGameData.currentProblem.result) {
        cell.classList.add('marked');
        playerState.markedCount++;
        playerState.streak++; // Increment Streak
        playerState.card[r][c] = { val: value, marked: true };

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

        updatePlayerHearts();
        updatePlayerStreak(); // Update UI
        saveSession();

        if (playerState.lives === 0) {
            showModal('gameOverOverlay');
        }
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
        display.textContent = problem ? problem.term : "Warte auf Host...";
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
