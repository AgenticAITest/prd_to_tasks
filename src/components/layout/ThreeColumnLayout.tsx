import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface ThreeColumnLayoutProps {
  leftPanel: ReactNode;
  middlePanel: ReactNode;
  rightPanel: ReactNode;
}

export function ThreeColumnLayout({
  leftPanel,
  middlePanel,
  rightPanel,
}: ThreeColumnLayoutProps) {
  const {
    leftPanelCollapsed,
    rightPanelCollapsed,
    toggleLeftPanel,
    toggleRightPanel,
  } = useUIStore();

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel */}
      <div
        className={cn(
          'bg-muted/30 border-r transition-all duration-200 flex flex-col',
          leftPanelCollapsed ? 'w-12' : 'w-64'
        )}
      >
        <div className="flex items-center justify-between p-2 border-b">
          {!leftPanelCollapsed && (
            <span className="text-sm font-medium">Files</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 ml-auto"
            onClick={toggleLeftPanel}
          >
            {leftPanelCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          {!leftPanelCollapsed && leftPanel}
        </div>
      </div>

      {/* Resize Handle (decorative) */}
      <div className="w-1 bg-border hover:bg-primary/20 transition-colors cursor-col-resize flex items-center justify-center">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 hover:opacity-100" />
      </div>

      {/* Middle Panel */}
      <div className="flex-1 bg-background overflow-hidden">
        {middlePanel}
      </div>

      {/* Resize Handle (decorative) */}
      <div className="w-1 bg-border hover:bg-primary/20 transition-colors cursor-col-resize flex items-center justify-center">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 hover:opacity-100" />
      </div>

      {/* Right Panel */}
      <div
        className={cn(
          'bg-muted/30 border-l transition-all duration-200 flex flex-col',
          rightPanelCollapsed ? 'w-12' : 'w-80'
        )}
      >
        <div className="flex items-center justify-between p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleRightPanel}
          >
            {rightPanelCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          {!rightPanelCollapsed && (
            <span className="text-sm font-medium">Analysis</span>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {!rightPanelCollapsed && rightPanel}
        </div>
      </div>
    </div>
  );
}
