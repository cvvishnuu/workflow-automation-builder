/**
 * Clerk Provider Wrapper
 * Client component that wraps the app with Clerk authentication
 */

'use client';

import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ReactNode, useEffect } from 'react';
import { setTokenProvider } from '@/lib/api';

/**
 * Auth Initializer Component
 * Sets up the token provider for API calls
 */
function AuthInitializer() {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set up the token provider for API calls
    setTokenProvider(async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error('Failed to get token:', error);
        return null;
      }
    });
  }, [getToken]);

  return null;
}

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        elements: {
          formButtonPrimary:
            'bg-primary text-primary-foreground hover:bg-primary/90',
          card: 'shadow-md',
        },
      }}
    >
      <AuthInitializer />
      {children}
    </ClerkProvider>
  );
}
