/**
 * Home Page
 * Landing page for the application
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center space-y-8">
          <h1 className="text-6xl font-bold tracking-tight">
            Workflow Automation Platform
          </h1>
          <p className="text-xl text-muted-foreground">
            Build, deploy, and manage automated workflows with a visual editor
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/workflows">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/workflows">
              <Button variant="outline" size="lg">
                View Workflows
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2">Visual Editor</h3>
            <p className="text-muted-foreground">
              Drag and drop nodes to build complex workflows visually
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2">Real-time Execution</h3>
            <p className="text-muted-foreground">
              Watch your workflows execute in real-time with live updates
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2">Extensible</h3>
            <p className="text-muted-foreground">
              Multiple node types: HTTP requests, data transforms, conditionals, and more
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
