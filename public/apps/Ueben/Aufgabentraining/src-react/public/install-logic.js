(function() {
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const nativeBtn = document.getElementById('btn-native-install');
        if (nativeBtn) nativeBtn.style.display = 'block';
    });

    function initInstallLogic() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                            (window.navigator.standalone === true);
        const isInIframe = window.parent !== window;
        
        // Only hide if REALLY standalone AND not in iframe
        if (isStandalone && !isInIframe) return;

        // Try to find a place to insert the button if it doesn't exist
        let installBtn = document.getElementById('btn-trigger-install');
        if (!installBtn) {
            installBtn = document.createElement('button');
            installBtn.id = 'btn-trigger-install';
            installBtn.className = 'btn-trigger-install';
            installBtn.innerText = '📲 App installieren';
            document.body.appendChild(installBtn);
        }

        // Visibility Check: Only on Homescreen or Topic list (where <main> element exists)
        function checkVisibility() {
            const mainElement = document.querySelector('main');
            
            if (mainElement) {
                installBtn.style.display = 'block';
            } else {
                installBtn.style.display = 'none';
            }
        }

        setInterval(checkVisibility, 500);
        checkVisibility();

        installBtn.addEventListener('click', () => {
            // If in iframe, open direct URL in new tab
            if (window.parent !== window) {
                const url = new URL(window.location.href);
                url.searchParams.set('install', 'true');
                window.open(url.toString(), '_blank');
                return;
            }

            showInstallModal();
        });

        // Close logic
        const closeBtn = document.getElementById('btn-close-install');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('pwa-install-modal').classList.remove('active');
            });
        }

        // Native Install Action
        const nativeBtn = document.getElementById('btn-native-install');
        if (nativeBtn) {
            nativeBtn.addEventListener('click', async () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                deferredPrompt = null;
                nativeBtn.style.display = 'none';
                document.getElementById('pwa-install-modal').classList.remove('active');
            });
        }

        // Auto-show if ?install=true
        const params = new URLSearchParams(window.location.search);
        if (params.get('install') === 'true' && window.parent === window) {
            showInstallModal();
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    function showInstallModal() {
        const modal = document.getElementById('pwa-install-modal');
        if (!modal) return;
        
        modal.classList.add('active');

        // Detect OS
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

        // Native button visibility
        const nativeBtn = document.getElementById('btn-native-install');
        if (nativeBtn && deferredPrompt && !isIOS) {
            nativeBtn.style.display = 'block';
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInstallLogic);
    } else {
        initInstallLogic();
    }
})();
