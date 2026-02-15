(function() {
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const nativeBtn = document.getElementById('btn-native-install');
        if (nativeBtn) nativeBtn.style.display = 'block';
    });

    function initInstallLogic() {
        const checkStandalone = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                                window.matchMedia('(display-mode: minimal-ui)').matches ||
                                window.matchMedia('(display-mode: fullscreen)').matches ||
                                (window.navigator.standalone === true);
            return isStandalone;
        };

        const isStandalone = checkStandalone();
        const isInIframe = window.parent !== window;
        
        // Try to detect if the parent (Numo Shell) is standalone
        let isParentStandalone = false;
        if (isInIframe) {
            try {
                isParentStandalone = window.parent.matchMedia('(display-mode: standalone)').matches ||
                                     window.parent.matchMedia('(display-mode: minimal-ui)').matches ||
                                     window.parent.navigator.standalone === true;
            } catch (e) {
                // cross-origin or other error, fallback to false
            }
        }

        // Visibility Check: Only on Homescreen or Topic list
        function checkVisibility() {
            const currentStandalone = checkStandalone();
            const backBtn = document.getElementById('numo-back-link');
            const installBtn = document.getElementById('btn-trigger-install');

            // 1. Handle Back Button (Numo Logo)
            // Hide if we are running standalone
            if (backBtn) {
                if (currentStandalone && !isInIframe) {
                    backBtn.style.display = 'none';
                }
            }

            // 2. Handle Install Button
            if (installBtn) {
                // Hide if:
                // - Already standalone
                // - OR Parent is standalone (Numo App is already installed)
                const shouldHide = currentStandalone || isParentStandalone;

                if (shouldHide) {
                    installBtn.style.display = 'none';
                } else {
                    // Show if not hidden by other logic
                    // installBtn.style.display = 'flex'; // Keep CSS default or React control
                }
                
                // Add listener if not already added
                if (!installBtn.hasInstallListener) {
                    installBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (window.parent !== window) {
                            const url = new URL(window.location.href);
                            url.searchParams.set('install', 'true');
                            window.open(url.toString(), '_blank');
                            return;
                        }
                        showInstallModal();
                    });
                    installBtn.hasInstallListener = true;
                }
            }
        }

        setInterval(checkVisibility, 500);
        checkVisibility();

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
