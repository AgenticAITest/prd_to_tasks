import { useState } from 'react';
import { Play, Download, Copy, Check, Database, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useERDStore } from '@/store/erdStore';
import { useEntityStore } from '@/store/entityStore';
import { useProjectStore } from '@/store/projectStore';
import { toast } from 'sonner';

// Import real generators
import { generateDBML, validateERD, generateMigrationSQL } from '@/core/erd-generator';

// Import sub-components
import { ERDValidationPanel } from './ERDValidationPanel';
import { ERDGenerationOptions } from './ERDGenerationOptions';
import { ERDRelationshipsPanel } from './ERDRelationshipsPanel';

export function ERDBuilderPhase() {
  const [activeTab, setActiveTab] = useState('entities');
  const [copiedDBML, setCopiedDBML] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);

  const {
    dbml,
    sqlMigration,
    isGenerating,
    generateProgress,
    validationResult,
    generationOptions,
    setGenerating,
    setDBML,
    setSqlMigration,
    setValidationResult,
    updateGenerationOptions,
  } = useERDStore();

  const {
    entities,
    relationships,
    addRelationship,
    updateRelationship,
    removeRelationship,
  } = useEntityStore();

  const { setPhaseStatus, advancePhase } = useProjectStore();

  const handleGenerate = async () => {
    if (entities.length === 0) {
      toast.error('No entities to generate. Go back to Entity Extraction phase.');
      return;
    }

    setGenerating(true, 0);

    try {
      // Step 1: Validate (10%)
      await new Promise((r) => setTimeout(r, 100));
      setGenerating(true, 10);
      const validation = validateERD(entities, relationships);
      setValidationResult(validation);

      // Step 2: Generate DBML (50%)
      await new Promise((r) => setTimeout(r, 100));
      setGenerating(true, 50);
      const generatedDBML = generateDBML(entities, relationships, generationOptions);
      setDBML(generatedDBML);

      // Step 3: Generate SQL Migration (90%)
      await new Promise((r) => setTimeout(r, 100));
      setGenerating(true, 90);
      const sql = generateMigrationSQL(
        entities,
        relationships,
        generationOptions.schemaName || 'public'
      );
      setSqlMigration(sql);

      // Step 4: Complete (100%)
      await new Promise((r) => setTimeout(r, 100));
      setGenerating(false, 100);

      // Set phase status based on validation
      if (validation.isValid) {
        setPhaseStatus(3, 'completed');
        toast.success('ERD generated successfully!');
      } else {
        setPhaseStatus(3, 'has-issues');
        toast.warning(`ERD generated with ${validation.errors.length} errors and ${validation.warnings.length} warnings`);
      }
    } catch (error) {
      setGenerating(false);
      toast.error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCopyDBML = async () => {
    await navigator.clipboard.writeText(dbml);
    setCopiedDBML(true);
    toast.success('DBML copied to clipboard');
    setTimeout(() => setCopiedDBML(false), 2000);
  };

  const handleCopySQL = async () => {
    await navigator.clipboard.writeText(sqlMigration);
    setCopiedSQL(true);
    toast.success('SQL copied to clipboard');
    setTimeout(() => setCopiedSQL(false), 2000);
  };

  const handleDownloadDBML = () => {
    const blob = new Blob([dbml], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.dbml';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('DBML file downloaded');
  };

  const handleDownloadSQL = () => {
    const blob = new Blob([sqlMigration], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'migration.sql';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('SQL migration file downloaded');
  };

  const handleAddRelationship = () => {
    addRelationship({
      name: `rel_${relationships.length + 1}`,
      from: { entity: '', field: '', cardinality: '*' },
      to: { entity: '', field: '', cardinality: '1' },
      type: 'many-to-one',
      source: { type: 'manual' },
    });
  };

  const handleProceed = () => {
    if (validationResult && !validationResult.isValid) {
      toast.error('Please fix validation errors before proceeding');
      return;
    }
    advancePhase();
  };

  const hasValidationErrors = validationResult && validationResult.errors.length > 0;
  const canProceed = dbml && !hasValidationErrors;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            ERD Builder
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate database schema from {entities.length} entities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={entities.length === 0 || isGenerating}
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate ERD'}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleProceed}
                    disabled={!canProceed}
                  >
                    Proceed to Tasks
                  </Button>
                </span>
              </TooltipTrigger>
              {hasValidationErrors && (
                <TooltipContent>
                  <p>Fix validation errors before proceeding</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Progress indicator */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {generateProgress < 20
                    ? 'Validating entities...'
                    : generateProgress < 60
                    ? 'Generating DBML schema...'
                    : generateProgress < 95
                    ? 'Generating SQL migration...'
                    : 'Completing...'}
                </span>
                <span>{generateProgress}%</span>
              </div>
              <Progress value={generateProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Panel */}
      <ERDValidationPanel validationResult={validationResult} />

      {/* Generation Options */}
      <ERDGenerationOptions
        options={generationOptions}
        onOptionsChange={updateGenerationOptions}
        disabled={isGenerating}
      />

      {/* Empty state */}
      {entities.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Entities Found</h3>
              <p className="text-sm">
                Go back to the Entity Extraction phase to define entities before generating ERD.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      {entities.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="entities">
              Entities ({entities.length})
            </TabsTrigger>
            <TabsTrigger value="relationships">
              Relationships ({relationships.length})
            </TabsTrigger>
            <TabsTrigger value="dbml">
              DBML Preview
              {dbml && <Check className="h-3 w-3 ml-1 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="sql">
              SQL Migration
              {sqlMigration && <Check className="h-3 w-3 ml-1 text-green-500" />}
            </TabsTrigger>
          </TabsList>

          {/* Entities Tab */}
          <TabsContent value="entities" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Entity Summary</CardTitle>
                <CardDescription>
                  {entities.length} entities ready for schema generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {entities.map((entity) => {
                      const hasPK = entity.fields.some((f) => f.constraints.primaryKey);
                      return (
                        <div key={entity.id} className="border rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entity.displayName}</span>
                              {!hasPK && (
                                <Badge variant="destructive" className="text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  No PK
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline">{entity.type}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            Table: <code className="bg-muted px-1 rounded">{entity.tableName}</code>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Fields: </span>
                            {entity.fields.length > 0 ? (
                              <span className="text-xs">
                                {entity.fields.map((f, i) => (
                                  <span key={f.id}>
                                    {i > 0 && ', '}
                                    <code className="bg-muted px-1 rounded">
                                      {f.columnName}
                                      {f.constraints.primaryKey && ' (PK)'}
                                    </code>
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">None</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships" className="mt-4">
            <ERDRelationshipsPanel
              relationships={relationships}
              entities={entities}
              onAdd={handleAddRelationship}
              onUpdate={(id, updates) => updateRelationship(id, updates)}
              onRemove={removeRelationship}
            />
          </TabsContent>

          {/* DBML Preview Tab */}
          <TabsContent value="dbml" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">DBML Schema</CardTitle>
                    <CardDescription>Database Markup Language format</CardDescription>
                  </div>
                  {dbml && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCopyDBML}>
                        {copiedDBML ? (
                          <Check className="h-4 w-4 mr-1" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copiedDBML ? 'Copied' : 'Copy'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDownloadDBML}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {dbml ? (
                    <pre className="text-sm font-mono bg-muted p-4 rounded-md whitespace-pre-wrap">
                      {dbml}
                    </pre>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Database className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>Click "Generate ERD" to create the DBML schema</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SQL Migration Tab */}
          <TabsContent value="sql" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">SQL Migration</CardTitle>
                    <CardDescription>PostgreSQL migration script</CardDescription>
                  </div>
                  {sqlMigration && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCopySQL}>
                        {copiedSQL ? (
                          <Check className="h-4 w-4 mr-1" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        {copiedSQL ? 'Copied' : 'Copy'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDownloadSQL}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {sqlMigration ? (
                    <pre className="text-sm font-mono bg-muted p-4 rounded-md whitespace-pre-wrap">
                      {sqlMigration}
                    </pre>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Database className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p>Click "Generate ERD" to create the SQL migration</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
