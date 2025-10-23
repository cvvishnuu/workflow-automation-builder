/**
 * User Menu Component
 * Displays user info and sign-out button
 */

'use client';

import { UserButton, useUser } from '@clerk/nextjs';

export function UserMenu() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground hidden sm:block">
        {user.emailAddresses[0]?.emailAddress}
      </span>
      <UserButton afterSignOutUrl="/sign-in" />
    </div>
  );
}
