import { Link, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Entity, Relationship, RelationshipType } from '@/types/entity';

interface ERDRelationshipsPanelProps {
  relationships: Relationship[];
  entities: Entity[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<Relationship>) => void;
  onRemove: (id: string) => void;
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string; symbol: string }[] = [
  { value: 'one-to-one', label: '1:1 (One to One)', symbol: '-' },
  { value: 'one-to-many', label: '1:N (One to Many)', symbol: '<' },
  { value: 'many-to-one', label: 'N:1 (Many to One)', symbol: '>' },
  { value: 'many-to-many', label: 'N:N (Many to Many)', symbol: '<>' },
];

export function ERDRelationshipsPanel({
  relationships,
  entities,
  onAdd,
  onUpdate,
  onRemove,
}: ERDRelationshipsPanelProps) {
  // Get fields for a specific entity
  const getEntityFields = (entityName: string) => {
    const entity = entities.find((e) => e.name === entityName);
    return entity?.fields || [];
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Link className="h-4 w-4" />
            Relationships ({relationships.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-3 w-3 mr-1" />
            Add Relationship
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[350px]">
          <div className="space-y-3 pr-4">
            {relationships.map((rel) => {
              const fromFields = getEntityFields(rel.from.entity);
              const toFields = getEntityFields(rel.to.entity);

              return (
                <div key={rel.id} className="border rounded-md p-3 space-y-3">
                  {/* Header with name and delete */}
                  <div className="flex items-center justify-between">
                    <Input
                      className="h-7 w-48 text-sm"
                      value={rel.name}
                      onChange={(e) => onUpdate(rel.id, { name: e.target.value })}
                      placeholder="Relationship name"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onRemove(rel.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* From Entity and Field */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">From Entity</Label>
                      <Select
                        value={rel.from.entity}
                        onValueChange={(value) =>
                          onUpdate(rel.id, {
                            from: { ...rel.from, entity: value, field: '' },
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent>
                          {entities.map((e) => (
                            <SelectItem key={e.id} value={e.name}>
                              {e.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">From Field</Label>
                      <Select
                        value={rel.from.field}
                        onValueChange={(value) =>
                          onUpdate(rel.id, {
                            from: { ...rel.from, field: value },
                          })
                        }
                        disabled={!rel.from.entity}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {fromFields.map((f) => (
                            <SelectItem key={f.id} value={f.name}>
                              {f.displayName} ({f.dataType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Relationship Type */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Relationship Type</Label>
                    <Select
                      value={rel.type}
                      onValueChange={(value) => onUpdate(rel.id, { type: value as RelationshipType })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIP_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-1 rounded">{type.symbol}</code>
                              {type.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* To Entity and Field */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">To Entity</Label>
                      <Select
                        value={rel.to.entity}
                        onValueChange={(value) =>
                          onUpdate(rel.id, {
                            to: { ...rel.to, entity: value, field: '' },
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent>
                          {entities.map((e) => (
                            <SelectItem key={e.id} value={e.name}>
                              {e.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">To Field</Label>
                      <Select
                        value={rel.to.field}
                        onValueChange={(value) =>
                          onUpdate(rel.id, {
                            to: { ...rel.to, field: value },
                          })
                        }
                        disabled={!rel.to.entity}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {toFields.map((f) => (
                            <SelectItem key={f.id} value={f.name}>
                              {f.displayName} ({f.dataType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Visual representation */}
                  {rel.from.entity && rel.to.entity && (
                    <div className="text-xs text-center pt-2 border-t">
                      <Badge variant="outline" className="font-mono">
                        {rel.from.entity}.{rel.from.field || '?'}{' '}
                        <span className="text-primary mx-1">
                          {RELATIONSHIP_TYPES.find((t) => t.value === rel.type)?.symbol || '>'}
                        </span>{' '}
                        {rel.to.entity}.{rel.to.field || '?'}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}

            {relationships.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No relationships defined</p>
                <p className="text-xs mt-1">Click "Add Relationship" to define entity connections</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
