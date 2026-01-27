import type { ReactNode } from 'react';
import { useRef } from 'react';
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
    leftPanelWidth,
    rightPanelWidth,
    setLeftPanelWidth,
    setRightPanelWidth,
    setLeftPanelCollapsed,
    setRightPanelCollapsed,
  } = useUIStore();

  const containerRef = useRef<HTMLDivElement | null>(null);

  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  function startDragLeft(e: React.PointerEvent) {
    const container = containerRef.current;
    if (!container) return;

    // If currently collapsed, expand to saved width
    if (leftPanelCollapsed) setLeftPanelCollapsed(false);

    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startLeftWidth = leftPanelWidth;

    const minLeft = 72; // minimum width
    const maxLeft = rect.width - rightPanelWidth - 120; // leave room for middle

    (document as Document).body.style.cursor = 'col-resize';
    (document as Document).body.style.userSelect = 'none';

    function onMove(ev: PointerEvent) {
      const delta = ev.clientX - startX;
      const newWidth = clamp(startLeftWidth + delta, minLeft, maxLeft);
      setLeftPanelWidth(Math.round(newWidth));
    }

    function onUp() {
      (document as Document).body.style.cursor = '';
      (document as Document).body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function startDragRight(e: React.PointerEvent) {
    const container = containerRef.current;
    if (!container) return;

    if (rightPanelCollapsed) setRightPanelCollapsed(false);

    const rect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startRightWidth = rightPanelWidth;

    const minRight = 72;
    const maxRight = rect.width - leftPanelWidth - 120;

    (document as Document).body.style.cursor = 'col-resize';
    (document as Document).body.style.userSelect = 'none';

    function onMove(ev: PointerEvent) {
      const delta = startX - ev.clientX; // moving left increases right width
      const newWidth = clamp(startRightWidth + delta, minRight, maxRight);
      setRightPanelWidth(Math.round(newWidth));
    }

    function onUp() {
      (document as Document).body.style.cursor = '';
      (document as Document).body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      {/* Left Panel */}
      <div
        className={cn('bg-muted/30 border-r transition-all duration-200 flex flex-col')}
        style={{ width: leftPanelCollapsed ? 48 : leftPanelWidth }}
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
            aria-label={leftPanelCollapsed ? 'Open left panel' : 'Close left panel'}
          >
            {leftPanelCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          {!leftPanelCollapsed && leftPanel}
        </div>
      </div>

      {/* Resize Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startDragLeft}
        className="w-2 cursor-col-resize hover:bg-primary/20 transition-colors flex items-center justify-center touch-none"
        title="Resize left panel"
      >
        <div className="w-0.5 h-6 bg-border">
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-100" />
        </div>
      </div>

      {/* Middle Panel */}
      <div className="flex-1 bg-background overflow-auto">
        {middlePanel}
      </div>

      {/* Resize Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startDragRight}
        className="w-2 cursor-col-resize hover:bg-primary/20 transition-colors flex items-center justify-center touch-none"
        title="Resize right panel"
      >
        <div className="w-0.5 h-6 bg-border">
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-100" />
        </div>
      </div>

      {/* Right Panel */}
      <div
        className={cn('bg-muted/30 border-l transition-all duration-200 flex flex-col')}
        style={{ width: rightPanelCollapsed ? 48 : rightPanelWidth }}
      >
        <div className="flex items-center justify-between p-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleRightPanel}
            aria-label={rightPanelCollapsed ? 'Open right panel' : 'Close right panel'}
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
        <div className="flex-1 overflow-auto">
          {!rightPanelCollapsed && rightPanel}
        </div>
      </div>
    </div>
  );
}
