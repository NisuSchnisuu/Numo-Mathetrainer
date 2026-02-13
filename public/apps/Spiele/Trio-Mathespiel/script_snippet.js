
function updateClassModeIndicator() {
    const badge = document.getElementById('class-mode-badge');
    if (!badge) return;

    if (appState.settings && appState.settings.classMode) {
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}
