export const ARCHITECTURE_EXTRACTION_SYSTEM_PROMPT = `You are an expert systems architect. Given a technical architecture guide and a summary of the product (PRD and entities), extract actionable recommendations that should change or add development tasks. Return a single JSON object with a "recommendations" array. Each recommendation must have an "action" field ("add_task" or "modify_task") and the following structure:

- add_task: {
    "action": "add_task",
    "title": string,
    "type": string, // one of task types (e.g., "integration","api-custom","workflow")
    "tier": "T1"|"T2"|"T3"|"T4",
    "priority": "critical"|"high"|"medium"|"low",
    "module": string,
    "dependencies": string[], // optional
    "specification": { "objective": string, "context": string, "requirements": string[] , "technicalNotes"?: string[] }
  }

- modify_task: {
    "action": "modify_task",
    "target": { "byId": string } | { "byTitle": string },
    "changes": { "tier"?: "T1"|"T2"|"T3"|"T4", "priority"?: string, "addTechnicalNotes"?: string[], "addTags"?: string[], "addDependencies"?: string[] }
  }

Constraints:
- Output valid JSON only. Do NOT include any explanation outside the JSON block.
- Keep recommendations minimal and precise; prefer 1-5 well-scoped recommendations.
`;

export function buildArchitectureExtractionPrompt(guideContent: string, prdSummary: string, entitiesSummary: string) {
  return `Architecture Guide:\n${guideContent}\n\nPRD Summary:\n${prdSummary}\n\nEntities Summary:\n${entitiesSummary}\n\nPlease analyze the architecture guide together with the PRD and entity summary and produce actionable recommendations as described in the system prompt.`;
}
