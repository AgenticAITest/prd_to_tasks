import { Check, X, Database, Link2, Lightbulb, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Entity, Relationship, EntitySuggestion } from '@/types/entity';

interface EntityExtractionReviewPanelProps {
  entities: Entity[];
  relationships: Relationship[];
  suggestions: EntitySuggestion[];
  onAccept: () => void;
  onDiscard: () => void;
}

export function EntityExtractionReviewPanel({
  entities,
  relationships,
  suggestions,
  onAccept,
  onDiscard,
}: EntityExtractionReviewPanelProps) {
  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-purple-600" />
            <span className="text-purple-700">AI Extraction Complete</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-purple-600 font-medium">{entities.length}</span>
              <span className="text-muted-foreground ml-1">entities</span>
            </div>
            <div>
              <span className="text-purple-600 font-medium">{relationships.length}</span>
              <span className="text-muted-foreground ml-1">relationships</span>
            </div>
            <div>
              <span className="text-purple-600 font-medium">{suggestions.length}</span>
              <span className="text-muted-foreground ml-1">suggestions</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={onAccept} className="flex-1 bg-purple-600 hover:bg-purple-700">
          <Check className="h-4 w-4 mr-2" />
          Accept All
        </Button>
        <Button onClick={onDiscard} variant="outline" className="flex-1">
          <X className="h-4 w-4 mr-2" />
          Discard
        </Button>
      </div>

      {/* Extracted Entities */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Extracted Entities
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[250px]">
            <div className="p-2 space-y-1">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between p-2 rounded-md border bg-card hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-purple-100 flex items-center justify-center">
                      <Database className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{entity.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {entity.tableName} · {entity.fields.length} fields
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {entity.type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                      AI
                    </Badge>
                  </div>
                </div>
              ))}
              {entities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No entities extracted
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Relationships */}
      {relationships.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Relationships
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[150px]">
              <div className="p-2 space-y-1">
                {relationships.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center gap-2 p-2 rounded-md border bg-card text-sm"
                  >
                    <Badge variant="outline" className="text-xs font-mono">
                      {rel.from.entity}
                    </Badge>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{rel.type}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs font-mono">
                      {rel.to.entity}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[150px]">
              <div className="p-2 space-y-2">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-2 rounded-md border bg-amber-50 border-amber-200"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm font-medium">{suggestion.suggestion}</p>
                    <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
