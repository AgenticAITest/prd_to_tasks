import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ERDValidationResult } from '@/types/erd';

interface ERDValidationPanelProps {
  validationResult: ERDValidationResult | null;
}

export function ERDValidationPanel({ validationResult }: ERDValidationPanelProps) {
  if (!validationResult) return null;

  const { isValid, errors, warnings } = validationResult;

  return (
    <Card className={isValid ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {isValid ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">Validation Passed</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-red-700 dark:text-red-300">Validation Issues Found</span>
            </>
          )}
          <div className="ml-auto flex gap-2">
            {errors.length > 0 && (
              <Badge variant="destructive">{errors.length} Error{errors.length !== 1 ? 's' : ''}</Badge>
            )}
            {warnings.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <ScrollArea className={errors.length + warnings.length > 5 ? 'h-[150px]' : ''}>
          {/* Errors Section */}
          {errors.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">Errors (Must fix before proceeding):</h4>
              <ul className="space-y-1.5">
                {errors.map((error, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                    <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>
                      {error.entity && <strong className="font-medium">[{error.entity}]</strong>}{' '}
                      {error.field && <span className="text-red-500 dark:text-red-500">.{error.field}</span>}{' '}
                      {error.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">Warnings:</h4>
              <ul className="space-y-1.5">
                {warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <div>
                      <span>
                        {warning.entity && <strong className="font-medium">[{warning.entity}]</strong>}{' '}
                        {warning.field && <span className="text-amber-500">.{warning.field}</span>}{' '}
                        {warning.message}
                      </span>
                      {warning.suggestion && (
                        <span className="block text-muted-foreground ml-4 mt-0.5">
                          Suggestion: {warning.suggestion}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success message when valid */}
          {isValid && errors.length === 0 && warnings.length === 0 && (
            <p className="text-xs text-green-600 dark:text-green-400">
              All entities and relationships are properly configured.
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
