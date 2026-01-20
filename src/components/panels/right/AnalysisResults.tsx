import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePRDStore } from '@/store/prdStore';
import { useEntityStore } from '@/store/entityStore';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AnalysisResults() {
  const { prd } = usePRDStore();
  const { entities } = useEntityStore();

  if (!prd) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Analyze a PRD to see analysis results
          </p>
        </CardContent>
      </Card>
    );
  }

  // Mock CRUD coverage data
  const crudCoverage = [
    { entity: 'User', create: true, read: true, update: true, delete: true },
    { entity: 'Product', create: true, read: true, update: true, delete: false },
    { entity: 'Order', create: true, read: true, update: false, delete: false },
  ];

  // Mock workflow summary
  const workflows = [
    {
      name: 'Order Processing',
      states: 5,
      transitions: 7,
      hasApproval: true,
      isComplete: true,
    },
    {
      name: 'User Registration',
      states: 3,
      transitions: 3,
      hasApproval: false,
      isComplete: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* CRUD Coverage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">CRUD Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {crudCoverage.map((item) => (
              <div key={item.entity} className="flex items-center gap-2">
                <span className="w-20 text-sm truncate">{item.entity}</span>
                <div className="flex gap-1">
                  {['C', 'R', 'U', 'D'].map((op, i) => {
                    const covered = [item.create, item.read, item.update, item.delete][i];
                    return (
                      <Badge
                        key={op}
                        variant={covered ? 'default' : 'outline'}
                        className={cn(
                          'w-6 h-6 p-0 flex items-center justify-center text-xs',
                          covered ? 'bg-green-500' : 'text-muted-foreground'
                        )}
                      >
                        {op}
                      </Badge>
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground ml-auto">
                  {[item.create, item.read, item.update, item.delete].filter(Boolean).length}/4
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t">
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Coverage</span>
              <span>75%</span>
            </div>
            <Progress value={75} className="h-1.5" />
          </div>
        </CardContent>
      </Card>

      {/* Workflow Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflows.map((wf) => (
              <div key={wf.name} className="p-2 rounded-md border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{wf.name}</span>
                  {wf.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{wf.states} states</span>
                  <span>{wf.transitions} transitions</span>
                  {wf.hasApproval && (
                    <Badge variant="outline" className="text-xs h-4">
                      Approval
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Entity Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Entity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Entities</span>
              <span className="font-medium">{entities.length || 3}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Master</span>
              <span className="font-medium">
                {entities.filter((e) => e.type === 'master').length || 2}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction</span>
              <span className="font-medium">
                {entities.filter((e) => e.type === 'transaction').length || 1}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Relationships</span>
              <span className="font-medium">4</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screen Coverage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Screen Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">List Screens</span>
              <Badge variant="secondary">3</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Form Screens</span>
              <Badge variant="secondary">4</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Detail Screens</span>
              <Badge variant="secondary">2</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modals</span>
              <Badge variant="secondary">3</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
