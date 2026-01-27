import { AppLayout } from '@/components/layout/AppLayout';
import { ExecutionWorkspace } from '@/components/execution/ExecutionWorkspace';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useEnvironmentStore } from '@/store/environmentStore';

function App() {
  const isExecutionMode = useEnvironmentStore((s) => s.isExecutionMode);

  return (
    <TooltipProvider>
      {isExecutionMode ? <ExecutionWorkspace /> : <AppLayout />}
    </TooltipProvider>
  );
}

export default App;
