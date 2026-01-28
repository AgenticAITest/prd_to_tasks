import { useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExecutionWorkspace } from '@/components/execution/ExecutionWorkspace';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useEnvironmentStore } from '@/store/environmentStore';
import { useTaskStore } from '@/store/taskStore';

function App() {
  const isExecutionMode = useEnvironmentStore((s) => s.isExecutionMode);
  const tasks = useTaskStore((s) => s.tasks);
  const taskSet = useTaskStore((s) => s.taskSet);

  // Debug: Log store states on mount and changes
  useEffect(() => {
    console.log('[App] Debug - Store States:');
    console.log('[App] isExecutionMode:', isExecutionMode);
    console.log('[App] tasks.length:', tasks?.length);
    console.log('[App] taskSet:', taskSet ? 'exists' : 'null');

    // Check localStorage directly
    const storedTasks = localStorage.getItem('prd-to-tasks-tasks');
    console.log('[App] localStorage prd-to-tasks-tasks:', storedTasks ? JSON.parse(storedTasks) : 'not found');

    const storedEnv = localStorage.getItem('prd-to-tasks-environment');
    console.log('[App] localStorage prd-to-tasks-environment:', storedEnv ? JSON.parse(storedEnv) : 'not found');
  }, [isExecutionMode, tasks, taskSet]);

  return (
    <TooltipProvider>
      {isExecutionMode ? <ExecutionWorkspace /> : <AppLayout />}
    </TooltipProvider>
  );
}

export default App;
