'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export interface UsePopupLoginOptions {
    /** Popup window width */
    width?: number;
    /** Popup window height */
    height?: number;
    /** Callback when login succeeds */
    onSuccess?: () => void;
    /** Callback when login fails */
    onError?: (error: string) => void;
    /** Callback when popup is closed without completing login */
    onCancel?: () => void;
}

export interface UsePopupLoginReturn {
    /** Whether popup is currently open */
    isLoading: boolean;
    /** Error message if login failed */
    error: string | null;
    /** Open popup for Google OAuth login */
    openGoogleLogin: () => void;
    /** Open popup for a specific provider */
    openPopupLogin: (provider: string) => void;
}

const AUTH_SUCCESS_MESSAGE = 'AUTH_SUCCESS';
const AUTH_ERROR_MESSAGE = 'AUTH_ERROR';

export function usePopupLogin(options: UsePopupLoginOptions = {}): UsePopupLoginReturn {
    const {
        width = 500,
        height = 600,
        onSuccess,
        onError,
        onCancel,
    } = options;

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const popupRef = useRef<Window | null>(null);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const { update: updateSession } = useSession();

    const cleanup = useCallback(() => {
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close();
        }
        popupRef.current = null;
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            // SECURITY: Verify message origin to prevent cross-origin attacks
            if (event.origin !== window.location.origin) {
                return;
            }

            const { type, error: errorMessage } = event.data || {};

            if (type === AUTH_SUCCESS_MESSAGE) {
                cleanup();
                setError(null);
                await updateSession();
                onSuccess?.();
            } else if (type === AUTH_ERROR_MESSAGE) {
                cleanup();
                const errMsg = errorMessage || 'Login failed';
                setError(errMsg);
                onError?.(errMsg);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [cleanup, onSuccess, onError, updateSession]);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const openPopupLogin = useCallback((provider: string) => {
        cleanup();
        setError(null);
        setIsLoading(true);

        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const locale = window.location.pathname.split('/')[1] || 'en';
        const callbackUrl = `${window.location.origin}/${locale}/auth/callback`;
        const signInUrl = `/${locale}/auth/signin?provider=${provider}&callbackUrl=${encodeURIComponent(callbackUrl)}`;

        popupRef.current = window.open(
            signInUrl,
            'oauth-popup',
            `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`,
        );

        if (!popupRef.current) {
            setIsLoading(false);
            const errMsg = 'Popup blocked. Please allow popups for this site.';
            setError(errMsg);
            onError?.(errMsg);
            return;
        }

        checkIntervalRef.current = setInterval(() => {
            if (popupRef.current?.closed) {
                cleanup();
                onCancel?.();
            }
        }, 500);
    }, [cleanup, width, height, onError, onCancel]);

    const openGoogleLogin = useCallback(() => {
        openPopupLogin('google');
    }, [openPopupLogin]);

    return {
        isLoading,
        error,
        openGoogleLogin,
        openPopupLogin,
    };
}
