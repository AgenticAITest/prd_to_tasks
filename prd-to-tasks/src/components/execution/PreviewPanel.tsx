/**
 * Preview Panel (Right Panel)
 * Tabbed interface for Workspace, Preview, Database, and Overview
 * Similar to Replit's right panel UX
 */

import { useState, useEffect } from 'react';
import {
  RefreshCw,
  ExternalLink,
  Monitor,
  Database,
  Code2,
  Copy,
  Check,
  Terminal,
  Play,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnvironmentStore } from '@/store/environmentStore';
import { toast } from 'sonner';

interface CopyButtonProps {
  text: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

function CopyButton({ text, copyKey, copiedKey, onCopy }: CopyButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={() => onCopy(text, copyKey)}
    >
      {copiedKey === copyKey ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

type TabType = 'overview' | 'workspace' | 'preview' | 'database';

export function PreviewPanel() {
  const { environment } = useEnvironmentStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copied, setCopied] = useState<string | null>(null);

  // Workspace (Gitpod) state
  const [gitpodLoaded, setGitpodLoaded] = useState(false);
  const [gitpodUrl, setGitpodUrl] = useState('');

  // Preview state
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoaded, setPreviewLoaded] = useState(false);

  // Database state
  const [dbUrl, setDbUrl] = useState('');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate URLs when environment is available
  useEffect(() => {
    if (environment?.github?.repoUrl) {
      // Gitpod URL with autostart
      const url = `https://gitpod.io/?autostart=true#${environment.github.repoUrl}`;
      setGitpodUrl(url);
    }

    if (environment?.neon?.projectId) {
      setDbUrl(`https://console.neon.tech/app/projects/${environment.neon.projectId}`);
    }
  }, [environment]);

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRefresh = (type: 'workspace' | 'preview' | 'database') => {
    if (type === 'workspace') {
      setGitpodLoaded(false);
      // Force iframe refresh
      const iframe = document.getElementById('gitpod-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    } else if (type === 'preview') {
      setPreviewLoaded(false);
      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    } else if (type === 'database') {
      const iframe = document.getElementById('database-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    }
  };

  const handleOpenExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Overview Tab Content
  const OverviewContent = () => (
    <div className="p-3 space-y-3 overflow-auto h-full">
      {/* Getting Started */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Click the <strong>Workspace</strong> tab to open Gitpod IDE</li>
            <li>Wait for the workspace to start (auto-runs npm dev)</li>
            <li>Once running, the app preview opens in Gitpod</li>
            <li>Copy the preview URL from Gitpod's "Ports" tab</li>
            <li>Paste it in the <strong>Preview</strong> tab for a clean view</li>
          </ol>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('workspace')}
          >
            <Code2 className="h-4 w-4" />
            Open Workspace
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => handleOpenExternal(environment?.github?.repoUrl || '')}
            disabled={!environment?.github?.repoUrl}
          >
            <ExternalLink className="h-4 w-4" />
            GitHub Repo
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab('database')}
          >
            <Database className="h-4 w-4" />
            Open Database
          </Button>
        </CardContent>
      </Card>

      {/* Environment Details */}
      {environment && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">Environment</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {environment.github && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Repo</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                  {environment.github.repoName}
                </code>
              </div>
            )}
            {environment.neon && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Database</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                  {environment.neon.databaseName}
                </code>
              </div>
            )}
            {environment.projectName && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Project</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                  {environment.projectName}
                </code>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Commands */}
      <Card>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Commands
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {[
            { label: 'Start dev', cmd: 'npm run dev' },
            { label: 'Push schema', cmd: 'npm run db:push' },
            { label: 'Prisma Studio', cmd: 'npm run db:studio' },
          ].map(({ label, cmd }) => (
            <div key={cmd} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <div className="flex items-center gap-1">
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{cmd}</code>
                <CopyButton text={cmd} copyKey={cmd} copiedKey={copied} onCopy={handleCopy} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  // Workspace Tab Content (Gitpod IDE)
  const WorkspaceContent = () => (
    <div className="h-full flex flex-col">
      {!gitpodUrl ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Code2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No environment configured</p>
            <p className="text-xs mt-1">Create an environment in Phase 5 first</p>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="h-8 border-b flex items-center justify-between px-2 bg-muted/30 shrink-0">
            <span className="text-xs text-muted-foreground truncate flex-1">
              {gitpodLoaded ? 'Gitpod Workspace' : 'Loading Gitpod...'}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRefresh('workspace')}
              >
                <RefreshCw className={`h-3 w-3 ${!gitpodLoaded ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleOpenExternal(gitpodUrl)}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Gitpod iframe */}
          <div className="flex-1 relative">
            {!gitpodLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Starting Gitpod workspace...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                </div>
              </div>
            )}
            <iframe
              id="gitpod-iframe"
              src={gitpodUrl}
              className="w-full h-full border-0"
              onLoad={() => setGitpodLoaded(true)}
              title="Gitpod Workspace"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </>
      )}
    </div>
  );

  // Preview Tab Content
  const PreviewContent = () => (
    <div className="h-full flex flex-col">
      {/* URL Input */}
      <div className="p-2 border-b space-y-2 shrink-0">
        <div className="flex gap-2">
          <Input
            value={previewUrl}
            onChange={(e) => setPreviewUrl(e.target.value)}
            placeholder="Paste preview URL from Gitpod (port 5173)"
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            className="h-8 px-3 shrink-0"
            onClick={() => {
              if (previewUrl) {
                setPreviewLoaded(false);
                // Trigger iframe reload
                const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
                if (iframe) iframe.src = previewUrl;
              }
            }}
            disabled={!previewUrl}
          >
            <Play className="h-3 w-3" />
          </Button>
          {previewUrl && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleRefresh('preview')}
              >
                <RefreshCw className={`h-4 w-4 ${!previewLoaded && previewUrl ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleOpenExternal(previewUrl)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Preview iframe or instructions */}
      <div className="flex-1 relative">
        {previewUrl ? (
          <>
            {!previewLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              id="preview-iframe"
              src={previewUrl}
              className="w-full h-full border-0"
              onLoad={() => setPreviewLoaded(true)}
              title="App Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground p-4">
            <div className="text-center max-w-[250px]">
              <Monitor className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-2">No Preview URL</p>
              <p className="text-xs">
                1. Open the <strong>Workspace</strong> tab<br/>
                2. In Gitpod, find "Ports" at bottom<br/>
                3. Click the globe icon for port 5173<br/>
                4. Paste the URL above
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Database Tab Content
  const DatabaseContent = () => (
    <div className="h-full flex flex-col">
      {!dbUrl ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Database className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No database configured</p>
            <p className="text-xs mt-1">Create an environment in Phase 5 first</p>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="h-8 border-b flex items-center justify-between px-2 bg-muted/30 shrink-0">
            <span className="text-xs text-muted-foreground">Neon Console</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRefresh('database')}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleOpenExternal(dbUrl)}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Neon iframe */}
          <div className="flex-1">
            <iframe
              id="database-iframe"
              src={dbUrl}
              className="w-full h-full border-0"
              title="Neon Database Console"
            />
          </div>
        </>
      )}
    </div>
  );

  // No environment state
  if (!environment) {
    return (
      <div className="h-full flex flex-col border-l">
        <div className="h-10 border-b flex items-center px-3 bg-muted/30 shrink-0">
          <span className="text-sm font-medium">Preview</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
          <div className="text-center">
            <Monitor className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">No Environment</p>
            <p className="text-xs mt-2 max-w-[200px]">
              Create an environment in Phase 5 to enable workspace features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col border-l ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="h-full flex flex-col">
        <div className="border-b shrink-0">
          <div className="flex items-center justify-between px-1">
            <TabsList className="h-9 bg-transparent p-0 gap-0">
              <TabsTrigger
                value="overview"
                className="h-9 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Info className="h-3 w-3 mr-1" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="workspace"
                className="h-9 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Code2 className="h-3 w-3 mr-1" />
                Workspace
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="h-9 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Monitor className="h-3 w-3 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger
                value="database"
                className="h-9 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                <Database className="h-3 w-3 mr-1" />
                DB
              </TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 mr-1"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="flex-1 m-0 overflow-hidden">
          <OverviewContent />
        </TabsContent>

        <TabsContent value="workspace" className="flex-1 m-0 overflow-hidden">
          <WorkspaceContent />
        </TabsContent>

        <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
          <PreviewContent />
        </TabsContent>

        <TabsContent value="database" className="flex-1 m-0 overflow-hidden">
          <DatabaseContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
