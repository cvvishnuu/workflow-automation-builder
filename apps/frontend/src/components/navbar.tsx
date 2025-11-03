/**
 * Navigation Bar Component
 * Main navigation for admin interface
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from './user-menu';

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/workflows', label: 'Workflows' },
    { href: '/api-keys', label: 'API Keys' },
  ];

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-8">
            <Link href="/workflows" className="text-xl font-bold">
              Workflow Automation
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => {
                const isActive = pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActive
                        ? 'text-foreground border-b-2 border-primary pb-1'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Menu */}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
