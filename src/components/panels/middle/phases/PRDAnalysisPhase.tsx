import { useState } from 'react';
import { Play, FileText, List, Book, Monitor, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePRDStore } from '@/store/prdStore';
import { useProjectStore } from '@/store/projectStore';
import { parsePRDMarkdown } from '@/core/prd-parser';
import { analyzePRD } from '@/core/analyzer';
import { toast } from 'sonner';

export function PRDAnalysisPhase() {
  const [activeTab, setActiveTab] = useState('overview');
  const { prd, isParsing, isAnalyzing, parseProgress, analyzeProgress } = usePRDStore();
  const { files, setPhaseStatus, advancePhase } = useProjectStore();

  const prdFiles = files.filter((f) => f.type === 'prd');
  const isProcessing = isParsing || isAnalyzing;

  const handleAnalyze = async () => {
    if (prdFiles.length === 0) {
      toast.error('No PRD file uploaded');
      return;
    }

    const prdFile = prdFiles[0];
    const content = prdFile.content;

    if (!content || content.trim().length === 0) {
      toast.error('PRD file is empty');
      return;
    }

    try {
      // Phase 1: Parsing
      usePRDStore.getState().setParsing(true, 0);
      usePRDStore.getState().setRawContent(content);

      // Simulate some progress for UX
      for (let i = 0; i <= 50; i += 10) {
        await new Promise((r) => setTimeout(r, 100));
        usePRDStore.getState().setParsing(true, i);
      }

      // Actually parse the PRD
      const parseResult = parsePRDMarkdown(content);

      if (!parseResult.success || !parseResult.prd) {
        usePRDStore.getState().setParsing(false);
        toast.error(`Failed to parse PRD: ${parseResult.error || 'Unknown error'}`);
        return;
      }

      usePRDStore.getState().setParsing(true, 100);
      await new Promise((r) => setTimeout(r, 200));
      usePRDStore.getState().setParsing(false);

      // Phase 2: Analysis
      usePRDStore.getState().setAnalyzing(true, 0);

      for (let i = 0; i <= 50; i += 10) {
        await new Promise((r) => setTimeout(r, 100));
        usePRDStore.getState().setAnalyzing(true, i);
      }

      // Actually analyze the PRD
      const analysisResult = analyzePRD(parseResult.prd);

      usePRDStore.getState().setAnalyzing(true, 100);
      await new Promise((r) => setTimeout(r, 200));
      usePRDStore.getState().setAnalyzing(false);

      // Store the results
      usePRDStore.getState().setPRD(parseResult.prd);
      usePRDStore.getState().setAnalysisResult(analysisResult);

      // Check for blocking issues
      if (analysisResult.blockingIssues.length > 0) {
        setPhaseStatus(1, 'has-issues');
        toast.warning(`PRD analyzed with ${analysisResult.blockingIssues.length} blocking issue(s)`);
      } else {
        setPhaseStatus(1, 'completed');
        toast.success('PRD analyzed successfully!');
      }
    } catch (error) {
      usePRDStore.getState().setParsing(false);
      usePRDStore.getState().setAnalyzing(false);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Analysis failed: ${message}`);
      usePRDStore.getState().setError(message);
    }
  };

  const handleProceed = () => {
    const { phaseStatus } = useProjectStore.getState();

    // Allow proceeding if phase is completed OR has-issues (warnings don't block)
    if (phaseStatus[1] === 'completed' || phaseStatus[1] === 'has-issues') {
      // Force advance by setting to completed first if has-issues
      if (phaseStatus[1] === 'has-issues') {
        setPhaseStatus(1, 'completed');
        toast.info('Proceeding with warnings. You can revisit later.');
      }
      advancePhase();
    } else {
      toast.error('Please analyze the PRD first');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">PRD Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Parse and analyze your PRD documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAnalyze}
            disabled={prdFiles.length === 0 || isProcessing}
          >
            <Play className="h-4 w-4 mr-2" />
            {isProcessing ? 'Analyzing...' : 'Analyze PRD'}
          </Button>
          {prd && (
            <Button onClick={handleProceed} variant="outline">
              Proceed to Entities
            </Button>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{isParsing ? 'Parsing PRD...' : 'Analyzing...'}</span>
                <span>{isParsing ? parseProgress : analyzeProgress}%</span>
              </div>
              <Progress value={isParsing ? parseProgress : analyzeProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* No files message */}
      {prdFiles.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No PRD Files</h3>
            <p className="text-sm text-muted-foreground">
              Upload a PRD file (.md, .txt, or .pdf) in the left panel to begin analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content tabs */}
      {prdFiles.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">
              <FileText className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="requirements">
              <List className="h-4 w-4 mr-2" />
              Requirements
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Book className="h-4 w-4 mr-2" />
              Business Rules
            </TabsTrigger>
            <TabsTrigger value="screens">
              <Monitor className="h-4 w-4 mr-2" />
              Screens
            </TabsTrigger>
            <TabsTrigger value="raw">
              <Code className="h-4 w-4 mr-2" />
              Raw PRD
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            {prd ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="text-sm text-muted-foreground">Project:</span>
                      <span className="ml-2 font-medium">{prd.projectName}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Module:</span>
                      <span className="ml-2 font-medium">{prd.moduleName}</span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Version:</span>
                      <span className="ml-2 font-medium">{prd.version}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Requirements:</span>
                      <Badge variant="secondary">{prd.functionalRequirements.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">User Roles:</span>
                      <Badge variant="secondary">{prd.userRoles.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Entities:</span>
                      <Badge variant="secondary">{prd.dataRequirements.entities.length}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {prd.overview.description || 'No description available'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Click "Analyze PRD" to parse and extract information from your PRD files.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="requirements" className="mt-4">
            {prd ? (
              <div className="space-y-2">
                {prd.functionalRequirements.map((fr) => (
                  <Card key={fr.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{fr.id}</Badge>
                          <CardTitle className="text-base">{fr.title}</CardTitle>
                        </div>
                        <Badge
                          variant={
                            fr.priority === 'must'
                              ? 'destructive'
                              : fr.priority === 'should'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {fr.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground">{fr.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {fr.businessRules.length} rules
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fr.screens.length} screens
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Analyze PRD to see requirements.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rules" className="mt-4">
            {prd ? (
              <div className="space-y-2">
                {prd.functionalRequirements.flatMap((fr) =>
                  fr.businessRules.map((br) => (
                    <Card key={br.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{br.id}</Badge>
                            <CardTitle className="text-base">{br.name}</CardTitle>
                          </div>
                          <Badge variant="secondary">{br.type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground">{br.description}</p>
                        {br.formula && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm font-mono">
                            {br.formula}
                          </div>
                        )}
                        {br.errorMessage && (
                          <p className="text-xs text-destructive mt-2">
                            Error: {br.errorMessage}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
                {prd.functionalRequirements.every((fr) => fr.businessRules.length === 0) && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No business rules found in PRD. Add rules using BR-XXX-X format.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Analyze PRD to see business rules.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="screens" className="mt-4">
            {prd ? (
              <div className="space-y-2">
                {prd.functionalRequirements.flatMap((fr) =>
                  fr.screens.map((screen) => (
                    <Card key={screen.id}>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{screen.id}</Badge>
                            <CardTitle className="text-base">{screen.name}</CardTitle>
                          </div>
                          <Badge variant="secondary">{screen.type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Route:</span> {screen.route}
                        </div>
                        {screen.fieldMappings.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs font-medium">Fields:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {screen.fieldMappings.map((field) => (
                                <Badge key={field.fieldId} variant="outline" className="text-xs">
                                  {field.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {screen.actions.length > 0 && (
                          <div className="mt-2">
                            <span className="text-xs font-medium">Actions:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {screen.actions.map((action) => (
                                <Badge key={action.id} variant="secondary" className="text-xs">
                                  {action.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
                {prd.functionalRequirements.every((fr) => fr.screens.length === 0) && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No screens found in PRD. Add screens using SCR-XXX format.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Analyze PRD to see screens.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Raw PRD Content</CardTitle>
                <CardDescription>The original content of your PRD file</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {prdFiles[0]?.content || 'No content'}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
