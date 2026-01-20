import { Plus, Trash2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useEntityStore } from '@/store/entityStore';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';
import type { EntityType, DataType } from '@/types/entity';

const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: 'master', label: 'Master' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'reference', label: 'Reference' },
  { value: 'lookup', label: 'Lookup' },
  { value: 'junction', label: 'Junction' },
];

const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'text', label: 'Text' },
  { value: 'integer', label: 'Integer' },
  { value: 'bigint', label: 'Big Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'uuid', label: 'UUID' },
  { value: 'json', label: 'JSON' },
  { value: 'enum', label: 'Enum' },
];

export function EntityExtractionPhase() {
  const {
    entities,
    selectedEntityId,
    selectEntity,
    addEntity,
    updateEntity,
    removeEntity,
    addField,
    updateField,
    removeField,
    getSelectedEntity,
  } = useEntityStore();
  const { setPhaseStatus, advancePhase } = useProjectStore();

  const selectedEntity = getSelectedEntity();

  const handleAddEntity = () => {
    addEntity({
      name: 'NewEntity',
      displayName: 'New Entity',
      tableName: 'new_entity',
      description: '',
      type: 'master',
      fields: [],
      isAuditable: true,
      isSoftDelete: true,
      source: { type: 'manual' },
      confidence: 1,
    });
  };

  const handleAddField = () => {
    if (!selectedEntityId) return;
    addField(selectedEntityId, {
      name: 'newField',
      columnName: 'new_field',
      displayName: 'New Field',
      dataType: 'string',
      constraints: {
        primaryKey: false,
        unique: false,
        nullable: true,
        indexed: false,
      },
      source: { type: 'manual' },
      confidence: 1,
    });
  };

  const handleProceed = () => {
    if (entities.length > 0) {
      setPhaseStatus(2, 'completed');
      advancePhase();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Entity Extraction</h2>
          <p className="text-sm text-muted-foreground">
            Define entities, fields, and relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddEntity} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Entity
          </Button>
          <Button onClick={handleProceed} disabled={entities.length === 0}>
            Proceed to ERD
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* Entity List */}
        <Card className="col-span-1">
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Entities ({entities.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="p-2 space-y-1">
                {entities.map((entity) => (
                  <div
                    key={entity.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
                      selectedEntityId === entity.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => selectEntity(entity.id)}
                  >
                    <div>
                      <div className="font-medium text-sm">{entity.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {entity.fields.length} fields
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {entity.type}
                    </Badge>
                  </div>
                ))}
                {entities.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No entities defined yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Entity Detail */}
        <Card className="col-span-2">
          {selectedEntity ? (
            <>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {selectedEntity.displayName}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      removeEntity(selectedEntity.id);
                      selectEntity(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Entity Properties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Display Name</Label>
                    <Input
                      value={selectedEntity.displayName}
                      onChange={(e) =>
                        updateEntity(selectedEntity.id, { displayName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Table Name</Label>
                    <Input
                      value={selectedEntity.tableName}
                      onChange={(e) =>
                        updateEntity(selectedEntity.id, { tableName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={selectedEntity.type}
                      onValueChange={(value) =>
                        updateEntity(selectedEntity.id, { type: value as EntityType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTITY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Fields */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Fields</Label>
                    <Button size="sm" variant="outline" onClick={handleAddField}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {selectedEntity.fields.map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center gap-2 p-2 border rounded-md"
                        >
                          <Input
                            className="flex-1"
                            value={field.displayName}
                            placeholder="Field name"
                            onChange={(e) =>
                              updateField(selectedEntity.id, field.id, {
                                displayName: e.target.value,
                              })
                            }
                          />
                          <Select
                            value={field.dataType}
                            onValueChange={(value) =>
                              updateField(selectedEntity.id, field.id, {
                                dataType: value as DataType,
                              })
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DATA_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeField(selectedEntity.id, field.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      {selectedEntity.fields.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No fields defined
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-16 text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Select an entity to view and edit its details
              </p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
