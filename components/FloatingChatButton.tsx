import React, { useState, useRef, useCallback, useEffect } from 'react';
import Icon from './Icon';

interface FloatingChatButtonProps {
    onClick: () => void;
    hasApiKey: boolean;
}

// Calculate initial position immediately (no animation)
const getInitialPosition = () => {
    const safeBottom = typeof window !== 'undefined'
        ? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom') || '0')
        : 0;
    const bottomNavHeight = 72;
    const margin = 16;
    const buttonSize = 60;
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

    return {
        x: windowWidth - buttonSize - margin,
        y: windowHeight - buttonSize - bottomNavHeight - safeBottom - margin
    };
};

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onClick, hasApiKey }) => {
    // Position state - initialized directly at bottom right (no animation from top)
    const initialPos = getInitialPosition();
    const [position, setPosition] = useState(initialPos);
    const [isDragging, setIsDragging] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const positionRef = useRef(initialPos);
    const hasMoved = useRef(false);
    const moveThreshold = 10; // pixels to consider as a drag vs click

    // Initialize position on mount - instant, no animation
    useEffect(() => {
        const initPosition = () => {
            const pos = getInitialPosition();
            setPosition(pos);
            positionRef.current = pos;
        };

        // Initialize immediately
        initPosition();
        setIsReady(true);

        window.addEventListener('resize', initPosition);
        return () => window.removeEventListener('resize', initPosition);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        dragStartRef.current = { x: touch.clientX, y: touch.clientY };
        hasMoved.current = false;
        setIsPressed(true);
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragStartRef.current.x;
        const deltaY = touch.clientY - dragStartRef.current.y;

        // Check if moved beyond threshold
        if (Math.abs(deltaX) > moveThreshold || Math.abs(deltaY) > moveThreshold) {
            hasMoved.current = true;
            setIsDragging(true);
        }

        if (hasMoved.current) {
            const newX = positionRef.current.x + deltaX;
            const newY = positionRef.current.y + deltaY;

            // Boundary constraints
            const buttonSize = 60;
            const margin = 8;
            const maxX = window.innerWidth - buttonSize - margin;
            const maxY = window.innerHeight - buttonSize - margin;

            const constrainedX = Math.max(margin, Math.min(maxX, newX));
            const constrainedY = Math.max(margin, Math.min(maxY, newY));

            setPosition({ x: constrainedX, y: constrainedY });
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        setIsPressed(false);

        if (hasMoved.current) {
            setIsDragging(false);

            // Snap to nearest edge
            const buttonSize = 60;
            const margin = 16;
            const currentX = position.x;
            const centerX = window.innerWidth / 2;

            const snapX = currentX < centerX
                ? margin
                : window.innerWidth - buttonSize - margin;

            setPosition(prev => ({ ...prev, x: snapX }));
            positionRef.current = { x: snapX, y: position.y };
        } else {
            // It was a tap, not a drag
            onClick();
        }

        hasMoved.current = false;
    }, [position, onClick]);

    // Also handle mouse events for testing in browser
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        hasMoved.current = false;
        setIsPressed(true);
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPressed) return;

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        if (Math.abs(deltaX) > moveThreshold || Math.abs(deltaY) > moveThreshold) {
            hasMoved.current = true;
            setIsDragging(true);
        }

        if (hasMoved.current) {
            const newX = positionRef.current.x + deltaX;
            const newY = positionRef.current.y + deltaY;

            const buttonSize = 60;
            const margin = 8;
            const maxX = window.innerWidth - buttonSize - margin;
            const maxY = window.innerHeight - buttonSize - margin;

            const constrainedX = Math.max(margin, Math.min(maxX, newX));
            const constrainedY = Math.max(margin, Math.min(maxY, newY));

            setPosition({ x: constrainedX, y: constrainedY });
        }
    }, [isPressed]);

    const handleMouseUp = useCallback(() => {
        if (!isPressed) return;
        setIsPressed(false);

        if (hasMoved.current) {
            setIsDragging(false);

            const buttonSize = 60;
            const margin = 16;
            const currentX = position.x;
            const centerX = window.innerWidth / 2;

            const snapX = currentX < centerX
                ? margin
                : window.innerWidth - buttonSize - margin;

            setPosition(prev => ({ ...prev, x: snapX }));
            positionRef.current = { x: snapX, y: position.y };
        } else {
            onClick();
        }

        hasMoved.current = false;
    }, [isPressed, position, onClick]);

    // Global mouse up handler
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isPressed && !hasMoved.current) {
                setIsPressed(false);
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [isPressed]);

    // Don't render until position is ready to prevent flash from top
    if (!isReady) return null;

    return (
        <button
            ref={buttonRef}
            className={`fixed z-30 w-[60px] h-[60px] rounded-full shadow-2xl flex items-center justify-center transition-transform duration-200 ${isDragging ? 'scale-110' : isPressed ? 'scale-95' : 'scale-100'
                } bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-400`}
            style={{
                left: position.x,
                top: position.y,
                touchAction: 'none',
                boxShadow: '0 4px 25px rgba(59, 130, 246, 0.5), 0 0 50px rgba(6, 182, 212, 0.25)',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="relative">
                <Icon name="sparkles" className="w-7 h-7 text-white drop-shadow-sm" />
                {!hasApiKey && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white animate-pulse shadow-sm" />
                )}
            </div>

            {/* Animated ring effect - premium blue glow */}
            {hasApiKey && (
                <>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 animate-ping opacity-25" />
                    <div className="absolute inset-[-3px] rounded-full border-2 border-white/40" />
                    <div className="absolute inset-[-6px] rounded-full border border-white/20" />
                </>
            )}
        </button>
    );
};

export default FloatingChatButton;
