import { AlertTriangle, AlertCircle, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePRDStore } from '@/store/prdStore';
import { useProjectStore } from '@/store/projectStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DisplayWarning {
  id: string;
  severity: 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  location: { type: string };
}

export function BlockingIssues() {
  const { blockingIssues, warnings, prd, semanticAnalysisResult } = usePRDStore();
  const { setPhase } = useProjectStore();

  // Combine pattern-based and semantic analysis issues
  const patternIssues = blockingIssues;
  const semanticBlockingIssues = semanticAnalysisResult?.overallAssessment.blockingIssues || [];
  const semanticWarnings = semanticAnalysisResult?.overallAssessment.warnings || [];

  // Add gap-related issues from semantic analysis
  const gapIssues: string[] = [];
  if (semanticAnalysisResult) {
    semanticAnalysisResult.gaps.missingScreens.forEach((s) => {
      gapIssues.push(`Missing Screen: ${s}`);
    });
    semanticAnalysisResult.gaps.incompleteWorkflows.forEach((w) => {
      gapIssues.push(`Incomplete Workflow: ${w}`);
    });
    semanticAnalysisResult.conflicts.requirementConflicts.forEach((c) => {
      gapIssues.push(`Conflict: ${c.fr1} vs ${c.fr2} - ${c.description}`);
    });
    semanticAnalysisResult.conflicts.ruleConflicts.forEach((c) => {
      gapIssues.push(`Rule Conflict: ${c.rule1} vs ${c.rule2} - ${c.description}`);
    });
  }

  const allSemanticBlockingIssues = [...semanticBlockingIssues, ...gapIssues];

  // Combine all warnings
  const allWarnings: DisplayWarning[] = [
    ...warnings.map((w) => ({
      id: w.id,
      severity: w.severity,
      category: w.category,
      title: w.title,
      description: w.description,
      location: { type: w.location.type },
    })),
    ...semanticWarnings.map((w, i) => ({
      id: `semantic-warning-${i}`,
      severity: 'medium' as const,
      category: 'ai-detected',
      title: w,
      description: w,
      location: { type: 'general' },
    })),
  ];

  // Add undefined entities and missing validations as warnings
  if (semanticAnalysisResult) {
    semanticAnalysisResult.gaps.undefinedEntities.forEach((e, i) => {
      allWarnings.push({
        id: `undefined-entity-${i}`,
        severity: 'medium',
        category: 'ai-detected',
        title: `Undefined Entity: ${e}`,
        description: `Entity "${e}" is mentioned but not formally defined in the PRD.`,
        location: { type: 'general' },
      });
    });
    semanticAnalysisResult.gaps.missingValidations.forEach((v, i) => {
      allWarnings.push({
        id: `missing-validation-${i}`,
        severity: 'medium',
        category: 'ai-detected',
        title: `Missing Validation: ${v}`,
        description: v,
        location: { type: 'general' },
      });
    });
  }

  const handleGoToIssue = (issue: typeof patternIssues[0]) => {
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

  const hasSemanticAnalysis = !!semanticAnalysisResult;
  const canProceed = hasSemanticAnalysis && semanticAnalysisResult.overallAssessment.canProceed;

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      {hasSemanticAnalysis && (
        <Card className={cn(
          canProceed ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
        )}>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              {canProceed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">Ready to proceed to Entity Extraction</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700 font-medium">Issues must be resolved before proceeding</span>
                </>
              )}
              <Badge variant="outline" className="ml-auto">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Analyzed
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI-Detected Blocking Issues */}
      {hasSemanticAnalysis && allSemanticBlockingIssues.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <AlertCircle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-sm">
                AI-Detected Blocking Issues ({allSemanticBlockingIssues.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allSemanticBlockingIssues.map((issue, idx) => (
                <div
                  key={`semantic-${idx}`}
                  className="p-3 rounded-md bg-destructive/10 border border-destructive/20"
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="destructive" className="text-xs shrink-0 mt-0.5">
                      blocking
                    </Badge>
                    <span className="text-sm">{issue}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern-Based Blocking Issues */}
      <Card className={cn(patternIssues.length > 0 && 'border-destructive')}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle
              className={cn(
                'h-4 w-4',
                patternIssues.length > 0 ? 'text-destructive' : 'text-green-500'
              )}
            />
            <CardTitle className="text-sm">
              Pattern-Based Issues ({patternIssues.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {patternIssues.length > 0 ? (
            <div className="space-y-3">
              {patternIssues.map((issue) => (
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
              <span className="text-sm">No pattern-based issues found</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No semantic analysis message */}
      {!hasSemanticAnalysis && prd && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-purple-700">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm">
                Click "Analyze with AI" in the PRD Analysis phase for comprehensive semantic analysis
              </span>
            </div>
          </CardContent>
        </Card>
      )}

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
              {allWarnings.slice(0, 10).map((warning) => (
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
                    {warning.category === 'ai-detected' && (
                      <Sparkles className="h-3 w-3 text-purple-400" />
                    )}
                    <span className="text-sm">{warning.title}</span>
                  </div>
                  {warning.description !== warning.title && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {warning.description}
                    </p>
                  )}
                </div>
              ))}
              {allWarnings.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{allWarnings.length - 10} more warnings
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No warnings</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
