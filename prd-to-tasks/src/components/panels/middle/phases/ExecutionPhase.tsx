import { useState } from 'react';
import {
  Rocket,
  Database,
  Github,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useProjectStore } from '@/store/projectStore';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useIntegrationStore } from '@/store/integrationStore';
import { useEntityStore } from '@/store/entityStore';
import { useERDStore } from '@/store/erdStore';
import { useUIStore } from '@/store/uiStore';
import { createEnvironment } from '@/core/environment';
import { openGitpodWorkspace } from '@/core/environment/gitpod-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EnvironmentCreationStep } from '@/types/environment';

const STEP_LABELS: Record<EnvironmentCreationStep, string> = {
  idle: 'Ready to create',
  'creating-database': 'Creating Neon database...',
  'generating-scaffold': 'Generating project scaffold...',
  'creating-repo': 'Creating GitHub repository...',
  'pushing-files': 'Pushing files to repository...',
  'creating-workspace': 'Setting up Gitpod workspace...',
  complete: 'Environment ready!',
  error: 'Error occurred',
};

export function ExecutionPhase() {
  const [projectName, setProjectName] = useState('');

  const { project, setPhaseStatus } = useProjectStore();
  const {
    environment,
    isCreating,
    createProgress,
    createStep,
    error,
    createEnvironment: initEnvironment,
    setProgress,
    setError,
    setEnvironment,
    updateEnvironmentStatus,
    setNeonEnvironment,
    setGitHubEnvironment,
    setGitpodEnvironment,
    enterExecutionMode,
  } = useEnvironmentStore();
  const { apiKeys, hasAllKeys } = useIntegrationStore();
  const { entities, relationships } = useEntityStore();
  const { dbml } = useERDStore();
  const { openModal, setSettingsTab } = useUIStore();

  const hasRequiredKeys = hasAllKeys();
  const isEnvironmentReady = environment?.status === 'ready';

  const handleOpenSettings = () => {
    setSettingsTab('integrations');
    openModal('settings');
  };

  const handleCreateEnvironment = async () => {
    if (!project) {
      toast.error('No project found');
      return;
    }

    if (!hasRequiredKeys) {
      toast.error('Please configure Neon and GitHub API keys in Settings');
      handleOpenSettings();
      return;
    }

    const name = projectName.trim() || project.name || 'my-project';

    // Initialize environment in store
    initEnvironment(project.id, name);

    try {
      const result = await createEnvironment({
        projectName: name,
        projectId: project.id,
        neonApiKey: apiKeys.neon!,
        githubToken: apiKeys.github!,
        scaffoldContext: {
          projectName: name,
          entities,
          relationships,
          dbml: dbml || '',
        },
        onProgress: (progress, step, message) => {
          setProgress(progress, step);
          if (step === 'error') {
            setError(message);
          }
        },
      });

      if (result.success && result.environment) {
        setEnvironment(result.environment);
        updateEnvironmentStatus('ready');
        setNeonEnvironment(result.environment.neon!);
        setGitHubEnvironment(result.environment.github!);
        setGitpodEnvironment(result.environment.gitpod!);
        setPhaseStatus(5, 'completed');
        toast.success('Environment created successfully!');
      } else {
        setError(result.error || 'Unknown error');
        toast.error(result.error || 'Failed to create environment');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast.error(message);
    }
  };

  const handleOpenNeon = () => {
    if (environment?.neon?.projectId) {
      window.open(
        `https://console.neon.tech/app/projects/${environment.neon.projectId}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  const handleOpenGitHub = () => {
    if (environment?.github?.repoUrl) {
      window.open(environment.github.repoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenGitpod = () => {
    if (environment?.github?.repoUrl) {
      openGitpodWorkspace(environment.github.repoUrl);
    }
  };

  const handleStartExecuting = () => {
    enterExecutionMode();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Execute
          </h2>
          <p className="text-sm text-muted-foreground">
            Create your development environment and start building
          </p>
        </div>
      </div>

      {/* API Keys Warning */}
      {!hasRequiredKeys && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Keys Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Configure Neon and GitHub API keys to create your environment.
            </span>
            <Button variant="outline" size="sm" onClick={handleOpenSettings}>
              Open Settings
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Create Environment Card */}
      {!isEnvironmentReady && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Environment</CardTitle>
            <CardDescription>
              Set up a cloud development environment with Neon database, GitHub repository, and Gitpod workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Name Input */}
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder={project?.name || 'my-project'}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                Used for database name, repository name, and project folder.
              </p>
            </div>

            {/* Service Icons */}
            <div className="flex gap-4 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Database</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                <span>Gitpod</span>
              </div>
            </div>

            {/* Progress */}
            {isCreating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{STEP_LABELS[createStep]}</span>
                  <span>{createProgress}%</span>
                </div>
                <Progress value={createProgress} />
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Create Button */}
            <Button
              onClick={handleCreateEnvironment}
              disabled={isCreating || !hasRequiredKeys}
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Environment...
                </>
              ) : error ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Create Environment
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Environment Ready Card */}
      {isEnvironmentReady && environment && (
        <>
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Environment Ready
              </CardTitle>
              <CardDescription>
                Your development environment has been created and is ready to use.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Environment Details */}
              <div className="grid gap-4">
                {/* Neon */}
                {environment.neon && (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">Neon Database</div>
                        <div className="text-xs text-muted-foreground">
                          {environment.neon.databaseName} ({environment.neon.region})
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenNeon}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </div>
                )}

                {/* GitHub */}
                {environment.github && (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Github className="h-5 w-5" />
                      <div>
                        <div className="font-medium">GitHub Repository</div>
                        <div className="text-xs text-muted-foreground">
                          {environment.github.owner}/{environment.github.repoName}
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenGitHub}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </div>
                )}

                {/* Gitpod */}
                {environment.gitpod && (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">Gitpod</Badge>
                      <div>
                        <div className="font-medium">Cloud Workspace</div>
                        <div className="text-xs text-muted-foreground">
                          Ready to launch
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenGitpod}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </div>
                )}
              </div>

              {/* Start Executing Button */}
              <Button
                onClick={handleStartExecuting}
                size="lg"
                className={cn('w-full mt-4')}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Executing Tasks
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Start</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p className="text-muted-foreground">
                  Your project scaffold has been pushed to GitHub. To get started:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Click "Open" on Gitpod to launch your workspace</li>
                  <li>Copy the DATABASE_URL from Neon to your .env file</li>
                  <li>Run <code className="bg-muted px-1 rounded">npm run db:push</code> to sync the schema</li>
                  <li>Run <code className="bg-muted px-1 rounded">npm run dev</code> to start developing</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
