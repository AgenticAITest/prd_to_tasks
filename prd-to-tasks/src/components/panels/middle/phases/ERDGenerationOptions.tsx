import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { DBMLGenerationOptions } from '@/types/erd';

interface ERDGenerationOptionsProps {
  options: DBMLGenerationOptions;
  onOptionsChange: (options: Partial<DBMLGenerationOptions>) => void;
  disabled?: boolean;
}

export function ERDGenerationOptions({ options, onOptionsChange, disabled }: ERDGenerationOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="py-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Generation Options
              </CardTitle>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Naming Convention */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Naming Convention</Label>
                <Select
                  value={options.namingConvention || 'snake_case'}
                  onValueChange={(value) =>
                    onOptionsChange({ namingConvention: value as 'snake_case' | 'camelCase' | 'PascalCase' })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="snake_case">snake_case</SelectItem>
                    <SelectItem value="camelCase">camelCase</SelectItem>
                    <SelectItem value="PascalCase">PascalCase</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Schema Name */}
              <div className="space-y-2">
                <Label className="text-xs">Schema Name</Label>
                <Input
                  className="h-8"
                  value={options.schemaName || 'public'}
                  onChange={(e) => onOptionsChange({ schemaName: e.target.value })}
                  placeholder="public"
                  disabled={disabled}
                />
              </div>
            </div>

            <Separator />

            {/* Toggle Options */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Audit Fields</Label>
                  <p className="text-[10px] text-muted-foreground">
                    created_at, updated_at
                  </p>
                </div>
                <Switch
                  checked={options.includeAuditFields ?? true}
                  onCheckedChange={(checked) => onOptionsChange({ includeAuditFields: checked })}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Soft Delete</Label>
                  <p className="text-[10px] text-muted-foreground">
                    deleted_at field
                  </p>
                </div>
                <Switch
                  checked={options.includeSoftDelete ?? true}
                  onCheckedChange={(checked) => onOptionsChange({ includeSoftDelete: checked })}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Indexes</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Auto-generate indexes
                  </p>
                </div>
                <Switch
                  checked={options.includeIndexes ?? true}
                  onCheckedChange={(checked) => onOptionsChange({ includeIndexes: checked })}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Enums</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Generate enum types
                  </p>
                </div>
                <Switch
                  checked={options.includeEnums ?? true}
                  onCheckedChange={(checked) => onOptionsChange({ includeEnums: checked })}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Notes</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Include descriptions
                  </p>
                </div>
                <Switch
                  checked={options.includeNotes ?? true}
                  onCheckedChange={(checked) => onOptionsChange({ includeNotes: checked })}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs">Comments</Label>
                  <p className="text-[10px] text-muted-foreground">
                    SQL comments
                  </p>
                </div>
                <Switch
                  checked={options.includeComments ?? true}
                  onCheckedChange={(checked) => onOptionsChange({ includeComments: checked })}
                  disabled={disabled}
                />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
