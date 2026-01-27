'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const AUTH_SUCCESS_MESSAGE = 'AUTH_SUCCESS';
const AUTH_ERROR_MESSAGE = 'AUTH_ERROR';

export default function AuthCallbackPage() {
    const { data: session, status } = useSession();
    const [notified, setNotified] = useState(false);

    useEffect(() => {
        if (notified) return;

        if (status === 'loading') return;

        if (status === 'authenticated' && session?.user) {
            window.opener?.postMessage({ type: AUTH_SUCCESS_MESSAGE }, window.location.origin);
            setNotified(true);
            setTimeout(() => window.close(), 1000);
        } else if (status === 'unauthenticated') {
            const urlParams = new URLSearchParams(window.location.search);
            const error = urlParams.get('error');
            window.opener?.postMessage({ type: AUTH_ERROR_MESSAGE, error }, window.location.origin);
            setNotified(true);
            setTimeout(() => window.close(), 2000);
        }
    }, [session, status, notified]);

    const isSuccess = status === 'authenticated';
    const isError = status === 'unauthenticated' && notified;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-8">
                {status === 'loading' && (
                    <>
                        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Completing sign in...</p>
                    </>
                )}

                {isSuccess && (
                    <>
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <p className="text-foreground font-medium">Sign in successful!</p>
                        <p className="text-muted-foreground text-sm mt-2">This window will close automatically.</p>
                    </>
                )}

                {isError && (
                    <>
                        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-foreground font-medium">Sign in failed</p>
                        <p className="text-muted-foreground text-sm mt-2">This window will close automatically.</p>
                    </>
                )}
            </div>
        </div>
    );
}
