'use client';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PopupSignInPage() {
    const searchParams = useSearchParams();
    const provider = searchParams.get('provider') || 'google';
    const callbackUrl = searchParams.get('callbackUrl') || '/en/auth/callback';

    useEffect(() => {
        signIn(provider, { callbackUrl });
    }, [provider, callbackUrl]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center p-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Redirecting to {provider}...</p>
            </div>
        </div>
    );
}
