/**
 * Middleware
 * Protects routes with Clerk authentication
 */

import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    '/',
    '/sign-in',
    '/sign-up',
    // allow BCG calls to public workflow endpoints with bearer tokens
    '/api/v1/public/agents/:agentId/execute',
    '/api/v1/public/executions/:executionId/status',
    '/api/v1/public/executions/:executionId/results',
    '/api/v1/public/executions/:executionId/pending-approval',
    '/api/v1/public/executions/:executionId/approve',
    '/api/v1/public/executions/:executionId/reject',
  ],
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: ['/api/v1/public/(.*)'],
});

export const config = {
  // Protects all routes, including api/trpc.
  // See https://clerk.com/docs/references/nextjs/auth-middleware
  // for more information about configuring your Middleware
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
