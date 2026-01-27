/**
 * Task List Panel (Left Panel)
 * Displays scrollable task list with status indicators
 * Includes AI chat component at bottom for task modifications
 */

import { useState } from 'react';
import { Check, Circle, Play, Send, MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTaskStore } from '@/store/taskStore';
import { cn } from '@/lib/utils';

type TaskStatus = 'pending' | 'in-progress' | 'completed';

export function TaskListPanel() {
  const { tasks, selectedTaskId, selectTask } = useTaskStore();
  const [chatMessage, setChatMessage] = useState('');

  // For now, all tasks are pending. This will be connected to actual execution state later.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getTaskStatus = (_taskId: string): TaskStatus => {
    // TODO: Connect to actual task execution state
    return 'pending';
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    // TODO: Implement AI chat for task modifications
    console.log('Chat message:', chatMessage);
    setChatMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col border-r">
      {/* Header */}
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm">Tasks</h3>
        <p className="text-xs text-muted-foreground">
          {tasks.length} tasks to complete
        </p>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {tasks.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No tasks generated yet.
              <br />
              Complete Phase 4 first.
            </div>
          ) : (
            tasks.map((task) => {
              const status = getTaskStatus(task.id);
              const isSelected = selectedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={cn(
                    'p-2 rounded-md cursor-pointer transition-colors flex items-start gap-2',
                    isSelected
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted border border-transparent'
                  )}
                  onClick={() => selectTask(task.id)}
                >
                  {/* Status Icon */}
                  <div className="mt-0.5">
                    {status === 'completed' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : status === 'in-progress' ? (
                      <Play className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1">
                        {task.id}
                      </Badge>
                    </div>
                    <div className="text-sm font-medium truncate">
                      {task.title}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* AI Chat Section */}
      <div className="border-t p-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MessageSquare className="h-3 w-3" />
          <span>AI Assistant</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Ask about tasks..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-sm"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSendMessage}
            disabled={!chatMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Coming soon: AI-powered task modifications
        </p>
      </div>
    </div>
  );
}
