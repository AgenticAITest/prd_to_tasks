import type { CodeGenerationContext } from './types';
import type { TaskType } from '@/types/task';

/**
 * Generate the system prompt for code generation
 */
export function getSystemPrompt(taskType: TaskType): string {
  const basePrompt = `You are an expert software engineer generating production-quality code.

CRITICAL RULES:
1. Generate ONLY valid code - no explanations, no markdown code blocks, just pure code
2. Follow best practices for the technology stack (Express, React, Prisma, TypeScript)
3. Include proper error handling and validation
4. Use TypeScript with strict typing
5. Follow the existing project patterns

OUTPUT FORMAT:
You must respond with a JSON object containing an array of files:
{
  "files": [
    {
      "path": "relative/path/to/file.ts",
      "content": "// file content here...",
      "description": "Brief description of what this file does"
    }
  ]
}

IMPORTANT:
- The content field must contain the ACTUAL code, not a placeholder
- Escape special characters in JSON strings properly
- Do not include any text outside the JSON object`;

  const taskSpecificPrompts: Partial<Record<TaskType, string>> = {
    'database-migration': `
TASK TYPE: Database Migration (Prisma)

Generate Prisma schema additions or migrations.
- Use proper Prisma types and decorators
- Include @id, @unique, @default as needed
- Define proper relations with @relation
- Add indexes for frequently queried fields
- Include created_at and updated_at for auditable entities`,

    'api-crud': `
TASK TYPE: API CRUD Routes (Express)

Generate Express router with CRUD operations.
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Include Zod validation for request bodies
- Use Prisma client for database operations
- Return proper HTTP status codes
- Include error handling with try-catch
- Follow RESTful conventions`,

    'api-custom': `
TASK TYPE: Custom API Endpoint (Express)

Generate custom API endpoints with business logic.
- Implement the specific business requirements
- Use proper validation and authorization
- Include transaction handling if needed
- Document complex logic with comments`,

    'ui-list': `
TASK TYPE: UI List Component (React)

Generate a React list component.
- Use proper TypeScript interfaces
- Include loading and error states
- Implement pagination if needed
- Use proper React hooks (useState, useEffect)
- Make API calls with proper error handling`,

    'ui-form': `
TASK TYPE: UI Form Component (React)

Generate a React form component.
- Use controlled form inputs
- Include client-side validation
- Handle form submission with proper error states
- Show loading state during submission
- Display success/error feedback`,

    'ui-detail': `
TASK TYPE: UI Detail View Component (React)

Generate a React detail view component.
- Fetch and display entity details
- Handle loading and error states
- Include edit/delete actions if specified
- Use proper TypeScript typing`,

    'validation': `
TASK TYPE: Validation Rules

Generate validation logic using Zod schemas.
- Create comprehensive validation rules
- Include custom error messages
- Handle edge cases`,

    'business-logic': `
TASK TYPE: Business Logic

Generate business logic implementation.
- Implement the specified business rules
- Include proper error handling
- Add comments for complex logic
- Consider edge cases`,

    'workflow': `
TASK TYPE: Workflow/State Machine

Generate workflow state management.
- Implement state transitions
- Validate state changes
- Include side effects handling`,
  };

  return basePrompt + (taskSpecificPrompts[taskType] || '');
}

/**
 * Generate the user prompt with task context
 */
export function getUserPrompt(context: CodeGenerationContext): string {
  const { task, entities, dbml, projectName } = context;

  let prompt = `PROJECT: ${projectName}

TASK ID: ${task.id}
TASK TITLE: ${task.title}
TASK TYPE: ${task.type}
MODULE: ${task.module}

OBJECTIVE:
${task.specification.objective}

CONTEXT:
${task.specification.context}

REQUIREMENTS:
${task.specification.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

ACCEPTANCE CRITERIA:
${task.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}
`;

  // Add database schema context
  if (task.specification.database) {
    prompt += `
DATABASE SPECIFICATION:
${JSON.stringify(task.specification.database, null, 2)}
`;
  }

  // Add API specification if available
  if (task.specification.api) {
    prompt += `
API SPECIFICATION:
${JSON.stringify(task.specification.api, null, 2)}
`;
  }

  // Add UI specification if available
  if (task.specification.ui) {
    prompt += `
UI SPECIFICATION:
${JSON.stringify(task.specification.ui, null, 2)}
`;
  }

  // Add relevant entities context
  const relatedEntities = entities.filter(
    (e) =>
      task.relatedEntity === e.name ||
      task.specification.objective.toLowerCase().includes(e.name.toLowerCase())
  );

  if (relatedEntities.length > 0) {
    prompt += `
RELATED ENTITIES:
${relatedEntities.map((e) => `
Entity: ${e.name}
Fields:
${e.fields.map((f) => `  - ${f.name}: ${f.dataType}${f.constraints.nullable ? '?' : ''}`).join('\n')}
`).join('\n')}
`;
  }

  // Add DBML for context if it's a database or API task
  if (['database-migration', 'api-crud', 'api-custom'].includes(task.type) && dbml) {
    prompt += `
DATABASE SCHEMA (DBML):
\`\`\`dbml
${dbml}
\`\`\`
`;
  }

  // Add technical notes if available
  if (task.specification.technicalNotes?.length) {
    prompt += `
TECHNICAL NOTES:
${task.specification.technicalNotes.map((n) => `- ${n}`).join('\n')}
`;
  }

  // Add edge cases if available
  if (task.specification.edgeCases?.length) {
    prompt += `
EDGE CASES TO HANDLE:
${task.specification.edgeCases.map((e) => `- ${e}`).join('\n')}
`;
  }

  // Add security notes if available
  if (task.specification.securityNotes?.length) {
    prompt += `
SECURITY CONSIDERATIONS:
${task.specification.securityNotes.map((n) => `- ${n}`).join('\n')}
`;
  }

  // Add output path hints based on task type
  prompt += `
FILE PATH CONVENTIONS:
- Prisma schema: backend/prisma/schema.prisma
- API routes: backend/src/routes/{entity}.ts
- Services: backend/src/services/{entity}.service.ts
- React components: frontend/src/components/{ComponentName}.tsx
- React pages: frontend/src/pages/{PageName}.tsx
- Types: frontend/src/types/{entity}.ts

Generate the code files needed to implement this task.`;

  return prompt;
}

/**
 * Parse the LLM response to extract generated files
 */
export function parseCodeGenerationResponse(response: string): {
  success: boolean;
  files: Array<{ path: string; content: string; description?: string }>;
  error?: string;
} {
  try {
    // Try to parse as JSON directly
    const parsed = JSON.parse(response);

    if (parsed.files && Array.isArray(parsed.files)) {
      return {
        success: true,
        files: parsed.files.map((f: { path: string; content: string; description?: string }) => ({
          path: f.path,
          content: f.content,
          description: f.description,
        })),
      };
    }

    return {
      success: false,
      files: [],
      error: 'Response does not contain a files array',
    };
  } catch {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*"files"[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.files && Array.isArray(parsed.files)) {
          return {
            success: true,
            files: parsed.files,
          };
        }
      } catch {
        // Continue to fallback
      }
    }

    // Fallback: Try to extract code blocks
    const codeBlockRegex = /```(\w+)?\s*\n?([\s\S]*?)```/g;
    const files: Array<{ path: string; content: string; description?: string }> = [];
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const lang = match[1] || 'text';
      const content = match[2].trim();

      // Try to infer file path from content or preceding text
      const pathMatch = response
        .slice(Math.max(0, match.index - 100), match.index)
        .match(/(?:file|path):\s*["`']?([^\s"`']+)["`']?/i);

      files.push({
        path: pathMatch ? pathMatch[1] : `generated-${files.length + 1}.${lang}`,
        content,
        description: `Extracted ${lang} code block`,
      });
    }

    if (files.length > 0) {
      return { success: true, files };
    }

    return {
      success: false,
      files: [],
      error: 'Failed to parse code generation response',
    };
  }
}
