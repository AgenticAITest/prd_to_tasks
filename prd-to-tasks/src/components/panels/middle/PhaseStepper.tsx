import { Check, AlertCircle, Lock, FileSearch, Database, List, ClipboardList, Rocket } from 'lucide-react';
import { useProjectStore, type PhaseNumber, type PhaseStatus } from '@/store/projectStore';
import { cn } from '@/lib/utils';

interface Phase {
  number: PhaseNumber;
  title: string;
  description: string;
  icon: React.ElementType;
}

const PHASES: Phase[] = [
  {
    number: 1,
    title: 'PRD Analysis',
    description: 'Parse and analyze PRD',
    icon: FileSearch,
  },
  {
    number: 2,
    title: 'Entity Extraction',
    description: 'Extract entities and fields',
    icon: Database,
  },
  {
    number: 3,
    title: 'ERD Builder',
    description: 'Generate DBML schema',
    icon: List,
  },
  {
    number: 4,
    title: 'Task Generation',
    description: 'Generate programmable tasks',
    icon: ClipboardList,
  },
  {
    number: 5,
    title: 'Execute',
    description: 'Create environment',
    icon: Rocket,
  },
];

function getStatusIcon(status: PhaseStatus, Icon: React.ElementType) {
  switch (status) {
    case 'completed':
      return <Check className="h-4 w-4" />;
    case 'has-issues':
      return <AlertCircle className="h-4 w-4" />;
    case 'locked':
      return <Lock className="h-4 w-4" />;
    default:
      return <Icon className="h-4 w-4" />;
  }
}

function getStatusColor(status: PhaseStatus, isActive: boolean) {
  if (isActive) {
    return 'bg-primary text-primary-foreground';
  }
  switch (status) {
    case 'completed':
      return 'bg-green-500 text-white';
    case 'has-issues':
      return 'bg-orange-500 text-white';
    case 'locked':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export function PhaseStepper() {
  const { currentPhase, phaseStatus, setPhase, canAdvanceToPhase } = useProjectStore();

  const handlePhaseClick = (phase: PhaseNumber) => {
    if (canAdvanceToPhase(phase)) {
      setPhase(phase);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
      {PHASES.map((phase, index) => {
        const status = phaseStatus[phase.number];
        const isActive = currentPhase === phase.number;
        const canClick = canAdvanceToPhase(phase.number);

        return (
          <div key={phase.number} className="flex items-center">
            {/* Step indicator */}
            <div
              className={cn(
                'flex items-center gap-2',
                canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              )}
              onClick={() => handlePhaseClick(phase.number)}
            >
              {/* Circle with icon */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full transition-colors',
                  getStatusColor(status, isActive)
                )}
              >
                {getStatusIcon(status, phase.icon)}
              </div>

              {/* Label */}
              <div className="hidden md:block">
                <div
                  className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {phase.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {phase.description}
                </div>
              </div>
            </div>

            {/* Connector line */}
            {index < PHASES.length - 1 && (
              <div
                className={cn(
                  'hidden sm:block w-8 lg:w-16 h-0.5 mx-2',
                  phaseStatus[phase.number] === 'completed'
                    ? 'bg-green-500'
                    : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
