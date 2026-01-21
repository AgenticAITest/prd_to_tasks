import { AlertTriangle, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePRDStore } from '@/store/prdStore';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function BlockingIssues() {
  const { blockingIssues, warnings, prd } = usePRDStore();
  const { setPhase } = useProjectStore();

  // Use actual issues from analysis, not mock data
  const issues = blockingIssues;
  const allWarnings = warnings;

  const handleGoToIssue = (issue: typeof issues[0]) => {
    // Navigate to the relevant section based on issue category
    if (issue.category === 'missing-screen' || issue.category === 'missing-requirement' ||
        issue.category === 'missing-business-rule' || issue.category === 'incomplete-workflow') {
      setPhase(1); // Go to PRD Analysis phase
      toast.info(`Issue: ${issue.title}`, {
        description: issue.suggestedFix || 'Review and fix this issue in the PRD',
      });
    } else if (issue.category === 'undefined-entity' || issue.category === 'circular-dependency' ||
               issue.category === 'invalid-reference') {
      setPhase(2); // Go to Entity phase
      toast.info(`Issue: ${issue.title}`, {
        description: issue.suggestedFix || 'Review and fix this issue',
      });
    } else {
      toast.info(`Issue: ${issue.title}`, {
        description: issue.suggestedFix || 'Review and fix this issue',
      });
    }
  };

  if (!prd) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Analyze a PRD to see blocking issues
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Blocking Issues */}
      <Card className={cn(issues.length > 0 && 'border-destructive')}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle
              className={cn(
                'h-4 w-4',
                issues.length > 0 ? 'text-destructive' : 'text-green-500'
              )}
            />
            <CardTitle className="text-sm">
              Blocking Issues ({issues.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {issues.length > 0 ? (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3 rounded-md bg-destructive/10 border border-destructive/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {issue.severity}
                      </Badge>
                      <span className="font-medium text-sm">{issue.title}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {issue.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      Fix: {issue.suggestedFix}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleGoToIssue(issue)}
                    >
                      <ArrowRight className="h-3 w-3 mr-1" />
                      Go to Issue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">No blocking issues found</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warnings */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-sm">
              Warnings ({allWarnings.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {allWarnings.length > 0 ? (
            <div className="space-y-2">
              {allWarnings.map((warning) => (
                <div
                  key={warning.id}
                  className="p-2 rounded-md bg-yellow-500/10 border border-yellow-500/20"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        warning.severity === 'medium'
                          ? 'border-yellow-500 text-yellow-500'
                          : 'border-muted-foreground'
                      )}
                    >
                      {warning.severity}
                    </Badge>
                    <span className="text-sm">{warning.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {warning.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No warnings</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
