import { useState } from 'react';
import { Play, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useERDStore } from '@/store/erdStore';
import { useEntityStore } from '@/store/entityStore';
import { useProjectStore } from '@/store/projectStore';
import { toast } from 'sonner';

export function ERDBuilderPhase() {
  const [activeTab, setActiveTab] = useState('entities');
  const [copied, setCopied] = useState(false);

  const { dbml, isGenerating, generateProgress, setGenerating, setDBML } = useERDStore();
  const { entities, relationships } = useEntityStore();
  const { setPhaseStatus, advancePhase } = useProjectStore();

  const handleGenerate = async () => {
    setGenerating(true, 0);

    // Simulate DBML generation
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 150));
      setGenerating(true, i);
    }

    // Generate simple DBML
    let generatedDBML = '// Generated DBML Schema\n\n';

    entities.forEach((entity) => {
      generatedDBML += `Table ${entity.tableName} {\n`;
      generatedDBML += `  id uuid [pk]\n`;
      entity.fields.forEach((field) => {
        const constraints: string[] = [];
        if (field.constraints.primaryKey) constraints.push('pk');
        if (field.constraints.unique) constraints.push('unique');
        if (!field.constraints.nullable) constraints.push('not null');
        const constraintStr = constraints.length > 0 ? ` [${constraints.join(', ')}]` : '';
        generatedDBML += `  ${field.columnName} ${field.dataType}${constraintStr}\n`;
      });
      generatedDBML += `  created_at timestamp [not null]\n`;
      generatedDBML += `  updated_at timestamp [not null]\n`;
      generatedDBML += `}\n\n`;
    });

    relationships.forEach((rel) => {
      generatedDBML += `Ref: ${rel.from.entity}.${rel.from.field} > ${rel.to.entity}.${rel.to.field}\n`;
    });

    setDBML(generatedDBML);
    setGenerating(false);
    setPhaseStatus(3, 'completed');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(dbml);
    setCopied(true);
    toast.success('DBML copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([dbml], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.dbml';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('DBML file downloaded');
  };

  const handleProceed = () => {
    advancePhase();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">ERD Builder</h2>
          <p className="text-sm text-muted-foreground">
            Generate DBML schema from entities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={entities.length === 0 || isGenerating}
            variant="outline"
          >
            <Play className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate DBML'}
          </Button>
          {dbml && (
            <Button onClick={handleProceed}>
              Proceed to Tasks
            </Button>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating DBML schema...</span>
                <span>{generateProgress}%</span>
              </div>
              <Progress value={generateProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="dbml">DBML Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Entity Summary</CardTitle>
              <CardDescription>
                {entities.length} entities with {relationships.length} relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {entities.map((entity) => (
                    <div key={entity.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{entity.displayName}</div>
                        <Badge variant="outline">{entity.type}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Table: {entity.tableName}
                      </div>
                      <div className="text-sm">
                        Fields: {entity.fields.map((f) => f.displayName).join(', ') || 'None'}
                      </div>
                    </div>
                  ))}
                  {entities.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No entities defined. Go back to Entity Extraction phase.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dbml" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>DBML Schema</CardTitle>
                  <CardDescription>Generated database schema in DBML format</CardDescription>
                </div>
                {dbml && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopy}>
                      {copied ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownload}>
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
                  <div className="text-center py-8 text-muted-foreground">
                    Click "Generate DBML" to create the schema
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
