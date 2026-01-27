/**
 * Preview Panel (Right Panel)
 * iframe for previewing the running app
 * Includes URL input and refresh button
 */

import { useState } from 'react';
import { RefreshCw, ExternalLink, Monitor, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEnvironmentStore } from '@/store/environmentStore';

export function PreviewPanel() {
  const { environment } = useEnvironmentStore();
  const [previewUrl, setPreviewUrl] = useState('http://localhost:5173');
  const [inputUrl, setInputUrl] = useState('http://localhost:5173');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    // Reset the iframe by updating the URL
    setPreviewUrl('');
    setTimeout(() => {
      setPreviewUrl(inputUrl);
      setIsLoading(false);
    }, 100);
  };

  const handleUrlChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPreviewUrl(inputUrl);
  };

  const handleOpenExternal = () => {
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleIframeError = () => {
    setError('Unable to load preview. Make sure your development server is running.');
    setIsLoading(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="h-full flex flex-col border-l">
      {/* Toolbar */}
      <div className="h-10 border-b flex items-center gap-2 px-2 bg-muted/30">
        <form onSubmit={handleUrlChange} className="flex-1 flex gap-2">
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://localhost:5173"
            className="h-7 text-xs"
          />
        </form>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleOpenExternal}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 relative bg-white">
        {/* Placeholder when no preview available */}
        {!environment?.gitpod ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/50">
            <Monitor className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-sm font-medium">Preview Not Available</p>
            <p className="text-xs text-center max-w-[200px] mt-2">
              Open your Gitpod workspace to start the development server, then refresh this preview.
            </p>
            {environment?.gitpod && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => window.open(environment.gitpod?.workspaceUrl, '_blank')}
              >
                Open Gitpod
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="m-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* iframe */}
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="App Preview"
              onError={handleIframeError}
              onLoad={handleIframeLoad}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </>
        )}
      </div>

      {/* Info Footer */}
      <div className="h-8 border-t flex items-center justify-between px-3 text-xs text-muted-foreground bg-muted/30">
        <span>Preview</span>
        <span>
          {environment?.gitpod ? 'Gitpod workspace connected' : 'Start Gitpod to enable preview'}
        </span>
      </div>
    </div>
  );
}
