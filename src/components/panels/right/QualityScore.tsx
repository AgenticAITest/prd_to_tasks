import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { usePRDStore } from '@/store/prdStore';
import { cn } from '@/lib/utils';

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
  const { prd } = usePRDStore();

  const overallScore = prd ? 75 : 0; // Mock score for demo
  const grade = getGrade(overallScore);

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
          <CardTitle className="text-sm">Overall Quality</CardTitle>
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
              <Progress value={overallScore} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Completeness', score: 80, weight: 30 },
            { label: 'Clarity', score: 70, weight: 25 },
            { label: 'Consistency', score: 75, weight: 25 },
            { label: 'Testability', score: 85, weight: 10 },
            { label: 'Technical Readiness', score: 65, weight: 10 },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{item.label}</span>
                <span className="text-muted-foreground">
                  {item.score}% ({item.weight}% weight)
                </span>
              </div>
              <Progress value={item.score} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Improvement Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">Low</Badge>
              <span className="text-muted-foreground">
                Add more acceptance criteria to FR-003
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">Medium</Badge>
              <span className="text-muted-foreground">
                Define validation rules for email field
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
