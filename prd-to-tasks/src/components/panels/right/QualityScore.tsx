import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePRDStore } from '@/store/prdStore';
import { cn } from '@/lib/utils';
import { Sparkles, TrendingUp, Lightbulb } from 'lucide-react';

const GRADE_COLORS = {
  A: 'text-green-500',
  B: 'text-blue-500',
  C: 'text-yellow-500',
  D: 'text-orange-500',
  F: 'text-red-500',
};

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function QualityScore() {
  const { prd, analysisResult, semanticAnalysisResult } = usePRDStore();

  // Calculate overall score - prioritize semantic analysis if available
  const hasSemanticAnalysis = !!semanticAnalysisResult;
  const overallScore = hasSemanticAnalysis
    ? Math.round(
        (semanticAnalysisResult.completeness.score +
          semanticAnalysisResult.overallAssessment.confidenceScore) /
          2
      )
    : analysisResult?.qualityScore?.overall ?? 0;
  const grade = getGrade(overallScore);

  // Build breakdown from both analyses
  const breakdown = hasSemanticAnalysis
    ? [
        {
          label: 'Completeness',
          score: semanticAnalysisResult.completeness.score,
          weight: 30,
          source: 'AI',
        },
        {
          label: 'Entity Readiness',
          score: semanticAnalysisResult.entityReadiness.ready ? 100 : 50,
          weight: 25,
          source: 'AI',
        },
        {
          label: 'Consistency',
          score:
            semanticAnalysisResult.conflicts.requirementConflicts.length === 0 &&
            semanticAnalysisResult.conflicts.ruleConflicts.length === 0
              ? 100
              : 50,
          weight: 20,
          source: 'AI',
        },
        {
          label: 'Gap Coverage',
          score: calculateGapScore(semanticAnalysisResult),
          weight: 15,
          source: 'AI',
        },
        {
          label: 'Confidence',
          score: semanticAnalysisResult.overallAssessment.confidenceScore,
          weight: 10,
          source: 'AI',
        },
      ]
    : analysisResult?.qualityScore?.breakdown
    ? [
        {
          label: 'Completeness',
          score: analysisResult.qualityScore.breakdown.completeness.score,
          weight: 30,
          source: 'Pattern',
        },
        {
          label: 'Clarity',
          score: analysisResult.qualityScore.breakdown.clarity.score,
          weight: 25,
          source: 'Pattern',
        },
        {
          label: 'Consistency',
          score: analysisResult.qualityScore.breakdown.consistency.score,
          weight: 25,
          source: 'Pattern',
        },
        {
          label: 'Testability',
          score: analysisResult.qualityScore.breakdown.testability.score,
          weight: 10,
          source: 'Pattern',
        },
        {
          label: 'Technical Readiness',
          score: analysisResult.qualityScore.breakdown.technicalReadiness.score,
          weight: 10,
          source: 'Pattern',
        },
      ]
    : [
        { label: 'Completeness', score: 0, weight: 30, source: 'Pattern' },
        { label: 'Clarity', score: 0, weight: 25, source: 'Pattern' },
        { label: 'Consistency', score: 0, weight: 25, source: 'Pattern' },
        { label: 'Testability', score: 0, weight: 10, source: 'Pattern' },
        { label: 'Technical Readiness', score: 0, weight: 10, source: 'Pattern' },
      ];

  // Build suggestions from semantic analysis or use defaults
  const suggestions = hasSemanticAnalysis
    ? [
        ...semanticAnalysisResult.completeness.recommendations.slice(0, 2).map((r) => ({
          priority: 'Medium' as const,
          text: r,
        })),
        ...semanticAnalysisResult.entityReadiness.recommendations.slice(0, 2).map((r) => ({
          priority: 'Low' as const,
          text: r,
        })),
      ].slice(0, 4)
    : [
        { priority: 'Low' as const, text: 'Run AI analysis for detailed suggestions' },
      ];

  if (!prd) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            Analyze a PRD to see quality scores
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {hasSemanticAnalysis && <Sparkles className="h-4 w-4 text-purple-500" />}
            Overall Quality
            {hasSemanticAnalysis && (
              <Badge variant="outline" className="ml-auto text-purple-600 border-purple-200">
                AI Analyzed
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'text-4xl font-bold',
                GRADE_COLORS[grade]
              )}
            >
              {grade}
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>{overallScore}/100</span>
              </div>
              <Progress
                value={overallScore}
                className={cn('h-2', hasSemanticAnalysis && '[&>div]:bg-purple-500')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Score Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  {item.label}
                  {item.source === 'AI' && (
                    <Sparkles className="h-3 w-3 text-purple-400" />
                  )}
                </span>
                <span className="text-muted-foreground">
                  {item.score}% ({item.weight}% weight)
                </span>
              </div>
              <Progress
                value={item.score}
                className={cn(
                  'h-1.5',
                  item.source === 'AI' && '[&>div]:bg-purple-500'
                )}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Improvement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suggestions.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 mt-0.5',
                      suggestion.priority === 'Medium' && 'border-amber-500 text-amber-600',
                      suggestion.priority === 'Low' && 'text-muted-foreground'
                    )}
                  >
                    {suggestion.priority}
                  </Badge>
                  <span className="text-muted-foreground">{suggestion.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No suggestions available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Analysis Info */}
      {hasSemanticAnalysis && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-xs text-purple-700">
              <Sparkles className="h-3 w-3" />
              <span>
                AI analysis completed at{' '}
                {new Date(semanticAnalysisResult.analyzedAt).toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Calculate a gap score based on how many gaps were found
 */
function calculateGapScore(result: NonNullable<ReturnType<typeof usePRDStore.getState>['semanticAnalysisResult']>): number {
  const totalGaps =
    result.gaps.missingScreens.length +
    result.gaps.undefinedEntities.length +
    result.gaps.incompleteWorkflows.length +
    result.gaps.missingValidations.length;

  if (totalGaps === 0) return 100;
  if (totalGaps <= 2) return 80;
  if (totalGaps <= 5) return 60;
  if (totalGaps <= 10) return 40;
  return 20;
}
