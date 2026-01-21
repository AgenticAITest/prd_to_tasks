import { PhaseStepper } from './PhaseStepper';
import { PRDAnalysisPhase } from './phases/PRDAnalysisPhase';
import { EntityExtractionPhase } from './phases/EntityExtractionPhase';
import { ERDBuilderPhase } from './phases/ERDBuilderPhase';
import { TaskGenerationPhase } from './phases/TaskGenerationPhase';
import { useProjectStore } from '@/store/projectStore';
import { ScrollArea } from '@/components/ui/scroll-area';

const PHASE_COMPONENTS = {
  1: PRDAnalysisPhase,
  2: EntityExtractionPhase,
  3: ERDBuilderPhase,
  4: TaskGenerationPhase,
};

export function MiddlePanel() {
  const currentPhase = useProjectStore((s) => s.currentPhase);
  const project = useProjectStore((s) => s.project);

  const PhaseComponent = PHASE_COMPONENTS[currentPhase];

  return (
    <div className="h-full flex flex-col">
      <PhaseStepper />
      <ScrollArea className="flex-1">
        <div className="p-4">
          {project ? (
            <PhaseComponent />
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No Project Open
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Create a new project or open an existing one to start analyzing PRDs
                and generating tasks.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
