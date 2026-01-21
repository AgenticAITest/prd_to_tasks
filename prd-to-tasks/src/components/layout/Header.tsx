import { Settings, HelpCircle, FolderOpen, ChevronDown, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjectStore } from '@/store/projectStore';
import { useUIStore } from '@/store/uiStore';

export function Header() {
  const { project, recentProjects, createProject } = useProjectStore();
  const { openModal } = useUIStore();

  const handleNewProject = () => {
    const name = prompt('Enter project name:');
    if (name) {
      createProject(name);
    }
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4">
      {/* Left section - Logo and project dropdown */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">PRD to Tasks</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              {project ? project.name : 'No Project'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Project</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNewProject}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openModal('new-project')}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Open Project
            </DropdownMenuItem>
            {recentProjects.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Recent Projects
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {recentProjects.map((recent) => (
                      <DropdownMenuItem key={recent.id}>
                        {recent.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right section - Settings and help */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openModal('settings')}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
