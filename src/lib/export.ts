import type { TaskSet, ProgrammableTask } from '@/types/task';
import type { Entity, Relationship } from '@/types/entity';

export type ExportFormat = 'json' | 'yaml' | 'markdown';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeSummary?: boolean;
  filteredTaskIds?: string[];
}

// Export tasks to JSON
export function exportTasksToJSON(taskSet: TaskSet, options: Partial<ExportOptions> = {}): string {
  const { includeMetadata = true, filteredTaskIds } = options;

  const tasks = filteredTaskIds
    ? taskSet.tasks.filter((t) => filteredTaskIds.includes(t.id))
    : taskSet.tasks;

  const exportData = includeMetadata
    ? {
        ...taskSet,
        tasks,
        exportedAt: new Date().toISOString(),
      }
    : { tasks };

  return JSON.stringify(exportData, null, 2);
}

// Export tasks to YAML
export function exportTasksToYAML(taskSet: TaskSet, options: Partial<ExportOptions> = {}): string {
  const { includeMetadata = true, filteredTaskIds } = options;

  const tasks = filteredTaskIds
    ? taskSet.tasks.filter((t) => filteredTaskIds.includes(t.id))
    : taskSet.tasks;

  const lines: string[] = [];

  if (includeMetadata) {
    lines.push(`# Task Set Export`);
    lines.push(`id: ${taskSet.id}`);
    lines.push(`projectId: ${taskSet.projectId}`);
    lines.push(`generatedAt: ${taskSet.generatedAt.toISOString()}`);
    lines.push(`exportedAt: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('summary:');
    lines.push(`  totalTasks: ${taskSet.summary.totalTasks}`);
    lines.push('  tierBreakdown:');
    lines.push(`    T1: ${taskSet.summary.tierBreakdown?.T1 ?? 0}`);
    lines.push(`    T2: ${taskSet.summary.tierBreakdown?.T2 ?? 0}`);
    lines.push(`    T3: ${taskSet.summary.tierBreakdown?.T3 ?? 0}`);
    lines.push(`    T4: ${taskSet.summary.tierBreakdown?.T4 ?? 0}`);
    lines.push('');
  }

  lines.push('tasks:');

  tasks.forEach((task) => {
    lines.push(`  - id: ${task.id}`);
    lines.push(`    title: "${escapeYAMLString(task.title)}"`);
    lines.push(`    type: ${task.type}`);
    lines.push(`    tier: ${task.tier}`);
    lines.push(`    module: ${task.module}`);
    lines.push(`    priority: ${task.priority}`);
    lines.push(`    estimatedComplexity: ${task.estimatedComplexity}`);

    if (task.relatedFR) {
      lines.push(`    relatedFR: ${task.relatedFR}`);
    }
    if (task.relatedEntity) {
      lines.push(`    relatedEntity: ${task.relatedEntity}`);
    }

    if (task.dependencies.length > 0) {
      lines.push('    dependencies:');
      task.dependencies.forEach((dep) => {
        lines.push(`      - ${dep}`);
      });
    }

    lines.push('    specification:');
    lines.push(`      objective: "${escapeYAMLString(task.specification.objective)}"`);
    lines.push(`      context: "${escapeYAMLString(task.specification.context)}"`);
    lines.push('      requirements:');
    task.specification.requirements.forEach((req) => {
      lines.push(`        - "${escapeYAMLString(req)}"`);
    });

    lines.push('    acceptanceCriteria:');
    task.acceptanceCriteria.forEach((ac) => {
      lines.push(`      - "${escapeYAMLString(ac)}"`);
    });

    if (task.tags.length > 0) {
      lines.push(`    tags: [${task.tags.map((t) => `"${t}"`).join(', ')}]`);
    }

    lines.push('');
  });

  return lines.join('\n');
}

// Export tasks to Markdown
export function exportTasksToMarkdown(taskSet: TaskSet, options: Partial<ExportOptions> = {}): string {
  const { includeSummary = true, filteredTaskIds } = options;

  const tasks = filteredTaskIds
    ? taskSet.tasks.filter((t) => filteredTaskIds.includes(t.id))
    : taskSet.tasks;

  const lines: string[] = [];

  lines.push('# Development Tasks');
  lines.push('');
  lines.push(`> Generated: ${taskSet.generatedAt.toISOString()}`);
  lines.push(`> Total Tasks: ${tasks.length}`);
  lines.push('');

  if (includeSummary) {
    lines.push('## Summary');
    lines.push('');
    lines.push('### Tasks by Tier');
    lines.push('| Tier | Count | Description |');
    lines.push('|------|-------|-------------|');
    lines.push(`| T1 | ${taskSet.summary.tierBreakdown?.T1 ?? 0} | Simple, repetitive tasks |`);
    lines.push(`| T2 | ${taskSet.summary.tierBreakdown?.T2 ?? 0} | Standard complexity |`);
    lines.push(`| T3 | ${taskSet.summary.tierBreakdown?.T3 ?? 0} | Complex logic |`);
    lines.push(`| T4 | ${taskSet.summary.tierBreakdown?.T4 ?? 0} | Architecture decisions |`);
    lines.push('');

    lines.push('### Tasks by Type');
    lines.push('| Type | Count |');
    lines.push('|------|-------|');
    if (taskSet.summary.typeBreakdown) {
      Object.entries(taskSet.summary.typeBreakdown).forEach(([type, count]) => {
        lines.push(`| ${type} | ${count} |`);
      });
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Group tasks by module
  const tasksByModule = new Map<string, ProgrammableTask[]>();
  tasks.forEach((task) => {
    const module = task.module || 'General';
    if (!tasksByModule.has(module)) {
      tasksByModule.set(module, []);
    }
    tasksByModule.get(module)!.push(task);
  });

  tasksByModule.forEach((moduleTasks, module) => {
    lines.push(`## Module: ${module}`);
    lines.push('');

    moduleTasks.forEach((task) => {
      lines.push(`### ${task.id}: ${task.title}`);
      lines.push('');
      lines.push(`| Property | Value |`);
      lines.push(`|----------|-------|`);
      lines.push(`| Type | ${task.type} |`);
      lines.push(`| Tier | ${task.tier} |`);
      lines.push(`| Priority | ${task.priority} |`);
      lines.push(`| Complexity | ${task.estimatedComplexity} |`);
      if (task.relatedFR) {
        lines.push(`| Related FR | ${task.relatedFR} |`);
      }
      if (task.relatedEntity) {
        lines.push(`| Related Entity | ${task.relatedEntity} |`);
      }
      lines.push('');

      if (task.dependencies.length > 0) {
        lines.push(`**Dependencies:** ${task.dependencies.join(', ')}`);
        lines.push('');
      }

      lines.push('#### Objective');
      lines.push(task.specification.objective);
      lines.push('');

      lines.push('#### Context');
      lines.push(task.specification.context);
      lines.push('');

      lines.push('#### Requirements');
      task.specification.requirements.forEach((req) => {
        lines.push(`- ${req}`);
      });
      lines.push('');

      lines.push('#### Acceptance Criteria');
      task.acceptanceCriteria.forEach((ac) => {
        lines.push(`- [ ] ${ac}`);
      });
      lines.push('');

      if (task.testCases && task.testCases.length > 0) {
        lines.push('#### Test Cases');
        lines.push('| ID | Name | Type | Priority |');
        lines.push('|----|------|------|----------|');
        task.testCases.forEach((tc) => {
          lines.push(`| ${tc.id} | ${tc.name} | ${tc.type} | ${tc.priority} |`);
        });
        lines.push('');

        task.testCases.forEach((tc) => {
          lines.push(`<details>`);
          lines.push(`<summary>${tc.id}: ${tc.name}</summary>`);
          lines.push('');
          lines.push(`- **Given:** ${tc.given}`);
          lines.push(`- **When:** ${tc.when}`);
          lines.push(`- **Then:** ${tc.then}`);
          lines.push('');
          lines.push(`</details>`);
          lines.push('');
        });
      }

      if (task.tags.length > 0) {
        lines.push(`**Tags:** ${task.tags.map((t) => `\`${t}\``).join(' ')}`);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });
  });

  return lines.join('\n');
}

// Export DBML schema
export function exportDBML(dbml: string): string {
  return dbml;
}

// Export entities to JSON
export function exportEntitiesToJSON(
  entities: Entity[],
  relationships: Relationship[]
): string {
  return JSON.stringify(
    {
      entities,
      relationships,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

// Download file helper
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Get appropriate file extension for format
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return '.json';
    case 'yaml':
      return '.yaml';
    case 'markdown':
      return '.md';
    default:
      return '.txt';
  }
}

// Get appropriate MIME type for format
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'json':
      return 'application/json';
    case 'yaml':
      return 'text/yaml';
    case 'markdown':
      return 'text/markdown';
    default:
      return 'text/plain';
  }
}

// Export all project data
export function exportProject(
  taskSet: TaskSet | null,
  entities: Entity[],
  relationships: Relationship[],
  dbml: string | null,
  format: ExportFormat
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(
        {
          tasks: taskSet,
          entities,
          relationships,
          dbml,
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      );

    case 'yaml':
      const yamlLines: string[] = [];
      yamlLines.push('# Project Export');
      yamlLines.push(`exportedAt: ${new Date().toISOString()}`);
      yamlLines.push('');
      if (dbml) {
        yamlLines.push('# DBML Schema');
        yamlLines.push('dbml: |');
        dbml.split('\n').forEach((line) => {
          yamlLines.push(`  ${line}`);
        });
        yamlLines.push('');
      }
      if (taskSet) {
        yamlLines.push(exportTasksToYAML(taskSet, { includeMetadata: false }));
      }
      return yamlLines.join('\n');

    case 'markdown':
      const mdLines: string[] = [];
      mdLines.push('# Project Export');
      mdLines.push('');
      if (dbml) {
        mdLines.push('## Database Schema (DBML)');
        mdLines.push('');
        mdLines.push('```dbml');
        mdLines.push(dbml);
        mdLines.push('```');
        mdLines.push('');
      }
      if (taskSet) {
        mdLines.push(exportTasksToMarkdown(taskSet));
      }
      return mdLines.join('\n');

    default:
      return '';
  }
}

// Helper to escape YAML strings
function escapeYAMLString(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
