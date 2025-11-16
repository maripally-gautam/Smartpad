import React, { useEffect } from 'react';

// A lightweight wrapper that applies safe-area padding with Android fallbacks.
// iOS devices support env(safe-area-inset-*); many Android devices return 0, so we approximate.
// This prevents content from sitting under the status bar or navigation gesture area.

interface SafeAreaContainerProps {
    children: React.ReactNode;
    className?: string;
}

const SafeAreaContainer: React.FC<SafeAreaContainerProps> = ({ children, className = '' }) => {
    useEffect(() => {
        const isAndroid = /Android/i.test(navigator.userAgent);
        // Slightly larger top fallback for devices with taller status bars.
        const topFallback = isAndroid ? 32 : 0; // 32dp gives extra breathing room
        const bottomFallback = isAndroid ? 0 : 0; // we'll handle bottom spacing per-screen

        // Attempt to use visualViewport to refine (if available)
        // Not all browsers expose offsets; if they do and differ, update vars.
        try {
            const vv: any = (window as any).visualViewport;
            if (vv && typeof vv.offsetTop === 'number') {
                if (vv.offsetTop > 0) {
                    document.documentElement.style.setProperty('--safe-top', vv.offsetTop + 'px');
                }
                if (vv.height && window.innerHeight) {
                    const bottomInset = window.innerHeight - (vv.height + vv.offsetTop);
                    if (bottomInset > 0) {
                        document.documentElement.style.setProperty('--safe-bottom', bottomInset + 'px');
                    }
                }
            }
        } catch (_) { /* ignore */ }

        // Set initial variables if not already set.
        if (!getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) {
            document.documentElement.style.setProperty('--safe-top', `env(safe-area-inset-top, ${topFallback}px)`);
        }
        if (!getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) {
            document.documentElement.style.setProperty('--safe-bottom', `env(safe-area-inset-bottom, ${bottomFallback}px)`);
        }
    }, []);

    return (
        <div
            className={`flex flex-col h-full w-full ${className}`}
            style={{
                paddingTop: 'var(--safe-top)'
                // bottom padding intentionally omitted; footer/toolbars will use the variable directly
            }}
        >
            {children}
        </div>
    );
};

export default SafeAreaContainer;