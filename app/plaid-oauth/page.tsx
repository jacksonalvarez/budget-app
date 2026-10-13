'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PlaidConnect } from '../components/ImportTab';

export default function PlaidOAuthReturn() {
  const { status } = useSession();
  const router = useRouter();
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    setRedirectUri(window.location.href);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-3">Finishing bank connection</h1>
        {error && <p className="text-sm mb-4">{error}</p>}
        {status === 'authenticated' && redirectUri && (
          <PlaidConnect
            receivedRedirectUri={redirectUri}
            onError={setError}
            onConnected={async () => {
              router.push('/?tab=import');
            }}
          />
        )}
      </div>
    </main>
  );
}
