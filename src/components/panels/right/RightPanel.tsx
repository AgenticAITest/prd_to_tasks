import { QualityScore } from './QualityScore';
import { BlockingIssues } from './BlockingIssues';
import { AnalysisResults } from './AnalysisResults';
import { OutputPreview } from './OutputPreview';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';
import { BarChart2, AlertTriangle, Eye, FileText } from 'lucide-react';

export function RightPanel() {
  const rightPanelCollapsed = useUIStore((s) => s.rightPanelCollapsed);
  const currentPhase = useProjectStore((s) => s.currentPhase);

  if (rightPanelCollapsed) {
    return (
      <div className="p-2 flex flex-col items-center gap-2">
        <BarChart2 className="h-5 w-5 text-muted-foreground" />
        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        <Eye className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  // Phase 4 shows output preview instead of analysis
  if (currentPhase === 4) {
    return (
      <ScrollArea className="h-full">
        <div className="p-3 space-y-4">
          <OutputPreview />
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <Tabs defaultValue="quality">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="quality">
              <BarChart2 className="h-4 w-4 mr-1" />
              Quality
            </TabsTrigger>
            <TabsTrigger value="issues">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Issues
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <FileText className="h-4 w-4 mr-1" />
              Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quality" className="mt-4">
            <QualityScore />
          </TabsContent>

          <TabsContent value="issues" className="mt-4">
            <BlockingIssues />
          </TabsContent>

          <TabsContent value="analysis" className="mt-4">
            <AnalysisResults />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
