import { markdownParser, type ParsedMarkdown } from './MarkdownParser';
import type { StructuredPRD, FunctionalRequirement, BusinessRule, Screen } from '@/types/prd';
import { generateId } from '@/lib/utils';

export { markdownParser };
export type { ParsedMarkdown };

export interface PRDParseResult {
  success: boolean;
  prd?: StructuredPRD;
  error?: string;
}

// Extract FR-XXX patterns from text
export function extractFRIds(text: string): string[] {
  const matches = text.match(/FR-\d{3}/g);
  return matches ? [...new Set(matches)] : [];
}

// Extract BR-XXX-X patterns from text
export function extractBRIds(text: string): string[] {
  const matches = text.match(/BR-\d{3}-[A-Z]/g);
  return matches ? [...new Set(matches)] : [];
}

// Extract SCR-XXX patterns from text
export function extractScreenIds(text: string): string[] {
  const matches = text.match(/SCR-\d{3}/g);
  return matches ? [...new Set(matches)] : [];
}

// Simple parser that extracts basic structure from markdown
export function parsePRDMarkdown(content: string): PRDParseResult {
  try {
    const parsed = markdownParser.parse(content);

    // Create a basic PRD structure
    const prd: StructuredPRD = {
      id: generateId(),
      projectName: parsed.title || 'Untitled Project',
      moduleName: extractModuleName(parsed),
      version: '1.0.0',
      overview: {
        description: extractDescription(parsed),
        objectives: [],
        scope: {
          included: [],
          excluded: [],
        },
        assumptions: [],
        constraints: [],
      },
      userRoles: [],
      functionalRequirements: extractFunctionalRequirements(content),
      dataRequirements: {
        entities: [],
        enums: [],
      },
      nonFunctionalRequirements: {},
      qualityScore: {
        overall: 0,
        breakdown: {
          completeness: 0,
          clarity: 0,
          consistency: 0,
          testability: 0,
        },
        details: [],
      },
      analysisResults: {
        crudCoverage: [],
        workflowSummary: [],
        screenCoverage: {
          totalScreens: 0,
          screensByType: {},
          orphanedScreens: [],
          missingScreens: [],
        },
        entityUsage: [],
      },
      rawContent: content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { success: true, prd };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

function extractModuleName(parsed: ParsedMarkdown): string {
  // Try to find module name in sections
  const moduleSection = parsed.sections.find(
    (s) => s.title.toLowerCase().includes('module')
  );
  if (moduleSection) {
    return moduleSection.title.replace(/module/i, '').trim();
  }
  return 'Main';
}

function extractDescription(parsed: ParsedMarkdown): string {
  // Look for overview or description section
  const overviewSection = parsed.sections.find(
    (s) =>
      s.title.toLowerCase().includes('overview') ||
      s.title.toLowerCase().includes('description') ||
      s.title.toLowerCase().includes('introduction')
  );
  return overviewSection?.content.trim() || 'No description available';
}

// Extract business rules from content
function extractBusinessRules(content: string): BusinessRule[] {
  const rules: BusinessRule[] = [];

  // Pattern: BR-XXX-X: Rule Name or BR-XXX-X - Rule Name
  // Also matches: **BR-XXX-X**: Rule Name (markdown bold)
  const brPattern = /\*?\*?BR-(\d{3})-([A-Z])\*?\*?[:\s-]+([^\n]+)/gi;
  let match;

  while ((match = brPattern.exec(content)) !== null) {
    const brId = `BR-${match[1]}-${match[2].toUpperCase()}`;
    const titleAndDesc = match[3].trim();

    // Try to extract description from next lines
    const afterMatch = content.substring(match.index + match[0].length);
    const descMatch = afterMatch.match(/^\s*\n\s*([^#\n*-][^\n]*)/);
    const description = descMatch ? descMatch[1].trim() : '';

    // Detect rule type from keywords
    let type: BusinessRule['type'] = 'validation';
    const lowerTitle = titleAndDesc.toLowerCase();
    if (lowerTitle.includes('calculat') || lowerTitle.includes('formula') || lowerTitle.includes('compute')) {
      type = 'calculation';
    } else if (lowerTitle.includes('workflow') || lowerTitle.includes('approval') || lowerTitle.includes('state')) {
      type = 'workflow';
    } else if (lowerTitle.includes('constraint') || lowerTitle.includes('restrict') || lowerTitle.includes('limit')) {
      type = 'constraint';
    }

    // Extract formula if present (text in backticks or after "Formula:")
    const formulaMatch = titleAndDesc.match(/`([^`]+)`/) ||
                         afterMatch.match(/formula[:\s]+`?([^`\n]+)`?/i);
    const formula = formulaMatch ? formulaMatch[1].trim() : undefined;

    // Extract error message if present
    const errorMatch = afterMatch.match(/error[:\s]+["']?([^"'\n]+)["']?/i) ||
                       afterMatch.match(/message[:\s]+["']?([^"'\n]+)["']?/i);
    const errorMessage = errorMatch ? errorMatch[1].trim() : undefined;

    // Try to find related FR
    const frMatch = titleAndDesc.match(/FR-\d{3}/) || afterMatch.slice(0, 200).match(/FR-\d{3}/);
    const relatedFR = frMatch ? frMatch[0] : undefined;

    rules.push({
      id: brId,
      name: titleAndDesc.replace(/`[^`]+`/g, '').trim(),
      type,
      description: description || titleAndDesc,
      formula,
      errorMessage,
      relatedFR,
    });
  }

  return rules;
}

// Extract screens from content
function extractScreens(content: string): Screen[] {
  const screens: Screen[] = [];

  // Pattern: SCR-XXX: Screen Name or SCR-XXX - Screen Name
  // Also matches: **SCR-XXX**: Screen Name (markdown bold)
  const scrPattern = /\*?\*?SCR-(\d{3})\*?\*?[:\s-]+([^\n]+)/gi;
  let match;

  while ((match = scrPattern.exec(content)) !== null) {
    const scrId = `SCR-${match[1]}`;
    const screenName = match[2].trim();

    // Get context after this match for additional details
    const afterMatch = content.substring(match.index + match[0].length, match.index + match[0].length + 500);

    // Detect screen type from name or context
    let type: Screen['type'] = 'form';
    const lowerName = screenName.toLowerCase();

    if (lowerName.includes('list') || lowerName.includes('table') || lowerName.includes('grid')) {
      type = 'list';
    } else if (lowerName.includes('detail') || lowerName.includes('view') || lowerName.includes('display')) {
      type = 'detail';
    } else if (lowerName.includes('modal') || lowerName.includes('dialog') || lowerName.includes('popup')) {
      type = 'modal';
    } else if (lowerName.includes('dashboard') || lowerName.includes('overview')) {
      type = 'dashboard';
    } else if (lowerName.includes('report')) {
      type = 'report';
    } else if (lowerName.includes('form') || lowerName.includes('create') || lowerName.includes('edit') || lowerName.includes('add')) {
      type = 'form';
    }

    // Try to extract route
    const routeMatch = afterMatch.match(/route[:\s]+["']?([^\s"'\n]+)["']?/i) ||
                       afterMatch.match(/path[:\s]+["']?([^\s"'\n]+)["']?/i) ||
                       afterMatch.match(/url[:\s]+["']?([^\s"'\n]+)["']?/i);
    const route = routeMatch ? routeMatch[1] : `/${screenName.toLowerCase().replace(/\s+/g, '-')}`;

    // Extract fields if mentioned
    const fieldMappings: Screen['fieldMappings'] = [];
    const fieldsMatch = afterMatch.match(/fields?[:\s]*\n((?:[\s-]*[^\n]+\n?)+)/i);
    if (fieldsMatch) {
      const fieldLines = fieldsMatch[1].split('\n').filter(l => l.trim());
      fieldLines.forEach((line, idx) => {
        const fieldName = line.replace(/^[\s-*]+/, '').trim();
        if (fieldName && !fieldName.startsWith('#')) {
          fieldMappings.push({
            fieldId: `${scrId}-F${String(idx + 1).padStart(2, '0')}`,
            fieldName: fieldName.replace(/[:\s].*/,''),
            label: fieldName.replace(/[:\s].*/,''),
            entityField: fieldName.toLowerCase().replace(/\s+/g, '_'),
            inputType: 'text',
            isRequired: fieldName.toLowerCase().includes('required') || fieldName.includes('*'),
          });
        }
      });
    }

    // Extract actions/buttons if mentioned
    const actions: Screen['actions'] = [];
    const actionsMatch = afterMatch.match(/(?:actions?|buttons?)[:\s]*\n((?:[\s-]*[^\n]+\n?)+)/i);
    if (actionsMatch) {
      const actionLines = actionsMatch[1].split('\n').filter(l => l.trim());
      actionLines.forEach((line, idx) => {
        const actionName = line.replace(/^[\s-*]+/, '').trim();
        if (actionName && !actionName.startsWith('#')) {
          let actionType: Screen['actions'][0]['type'] = 'submit';
          const lowerAction = actionName.toLowerCase();
          if (lowerAction.includes('cancel') || lowerAction.includes('back')) actionType = 'cancel';
          else if (lowerAction.includes('navigate') || lowerAction.includes('go to')) actionType = 'navigate';
          else if (lowerAction.includes('download') || lowerAction.includes('export')) actionType = 'download';
          else if (lowerAction.includes('print')) actionType = 'print';

          actions.push({
            id: `${scrId}-A${String(idx + 1).padStart(2, '0')}`,
            label: actionName.replace(/[:\s].*/,''),
            type: actionType,
            action: actionName.toLowerCase().replace(/\s+/g, '_'),
          });
        }
      });
    }

    // Add default actions if none found
    if (actions.length === 0) {
      if (type === 'form') {
        actions.push(
          { id: `${scrId}-A01`, label: 'Save', type: 'submit', action: 'save' },
          { id: `${scrId}-A02`, label: 'Cancel', type: 'cancel', action: 'cancel' }
        );
      } else if (type === 'list') {
        actions.push(
          { id: `${scrId}-A01`, label: 'Add New', type: 'navigate', action: 'create' },
          { id: `${scrId}-A02`, label: 'View', type: 'navigate', action: 'view' }
        );
      }
    }

    // Try to find related FR
    const frMatch = screenName.match(/FR-\d{3}/) || afterMatch.slice(0, 200).match(/FR-\d{3}/);

    screens.push({
      id: scrId,
      name: screenName.replace(/\(.*\)/, '').trim(),
      type,
      route,
      layout: { type: 'description', content: screenName },
      fieldMappings,
      actions,
      relatedFR: frMatch ? frMatch[0] : undefined,
    });
  }

  return screens;
}

function extractFunctionalRequirements(content: string): FunctionalRequirement[] {
  const requirements: FunctionalRequirement[] = [];
  const frIds = extractFRIds(content);

  // Extract all business rules and screens first
  const allBusinessRules = extractBusinessRules(content);
  const allScreens = extractScreens(content);

  // For each FR ID found, try to extract its details
  frIds.forEach((frId) => {
    // Find the line containing this FR ID and extract surrounding context
    const frRegex = new RegExp(`${frId}[:\\s-]+([^\\n]+)`, 'i');
    const match = content.match(frRegex);

    // Get content section for this FR (until next FR or end)
    const frIndex = content.search(new RegExp(frId, 'i'));
    const nextFrMatch = content.substring(frIndex + frId.length).match(/FR-\d{3}/);
    const frSection = nextFrMatch
      ? content.substring(frIndex, frIndex + frId.length + (nextFrMatch.index || 500))
      : content.substring(frIndex, frIndex + 1000);

    // Extract description - look for text after the title line
    const descMatch = frSection.match(/\n\s*([^#\n*-][^\n]{10,})/);
    const description = descMatch ? descMatch[1].trim() : '';

    // Detect priority from keywords
    let priority: FunctionalRequirement['priority'] = 'should';
    const lowerSection = frSection.toLowerCase();
    if (lowerSection.includes('must') || lowerSection.includes('critical') || lowerSection.includes('required')) {
      priority = 'must';
    } else if (lowerSection.includes('could') || lowerSection.includes('nice to have') || lowerSection.includes('optional')) {
      priority = 'could';
    } else if (lowerSection.includes("won't") || lowerSection.includes('wont') || lowerSection.includes('out of scope')) {
      priority = 'wont';
    }

    // Find business rules that belong to this FR
    const frNumber = frId.replace('FR-', '');
    const relatedBRs = allBusinessRules.filter(br =>
      br.id.includes(`BR-${frNumber}`) || br.relatedFR === frId
    );

    // Find screens that belong to this FR
    const relatedScreens = allScreens.filter(scr =>
      scr.relatedFR === frId || frSection.includes(scr.id)
    );

    // Detect if this is a workflow
    const isWorkflow = lowerSection.includes('workflow') ||
                       lowerSection.includes('approval') ||
                       lowerSection.includes('state machine') ||
                       relatedBRs.some(br => br.type === 'workflow');

    // Extract acceptance criteria
    const acceptanceCriteria: FunctionalRequirement['acceptanceCriteria'] = [];
    const acMatch = frSection.match(/acceptance\s*criteria[:\s]*\n((?:[\s-]*[^\n]+\n?)+)/i) ||
                    frSection.match(/given.*when.*then/gi);
    if (acMatch) {
      const acLines = (acMatch[1] || acMatch[0]).split('\n').filter(l => l.trim());
      acLines.forEach((line, idx) => {
        const criterion = line.replace(/^[\s-*\d.]+/, '').trim();
        if (criterion && criterion.length > 5) {
          acceptanceCriteria.push({
            id: `${frId}-AC${String(idx + 1).padStart(2, '0')}`,
            description: criterion,
            type: 'functional',
          });
        }
      });
    }

    // Extract involved entities
    const entityPattern = /(?:entity|entities|table|model)[:\s]+([A-Z][a-zA-Z,\s]+)/gi;
    const entityMatch = frSection.match(entityPattern);
    const involvedEntities = entityMatch
      ? entityMatch.flatMap(m => m.replace(/(?:entity|entities|table|model)[:\s]+/i, '').split(/[,\s]+/).filter(e => e.length > 1))
      : [];

    requirements.push({
      id: frId,
      title: match ? match[1].trim().replace(/\*\*/g, '') : `Requirement ${frId}`,
      description,
      priority,
      accessRoles: [],
      acceptanceCriteria,
      businessRules: relatedBRs,
      screens: relatedScreens,
      screenFlow: { steps: [] },
      involvedEntities,
      isWorkflow,
    });
  });

  // Assign orphan business rules and screens to the first FR or create a new one
  const assignedBRIds = requirements.flatMap(r => r.businessRules.map(br => br.id));
  const assignedScreenIds = requirements.flatMap(r => r.screens.map(s => s.id));

  const orphanBRs = allBusinessRules.filter(br => !assignedBRIds.includes(br.id));
  const orphanScreens = allScreens.filter(s => !assignedScreenIds.includes(s.id));

  if (orphanBRs.length > 0 || orphanScreens.length > 0) {
    if (requirements.length > 0) {
      // Add to first requirement
      requirements[0].businessRules.push(...orphanBRs);
      requirements[0].screens.push(...orphanScreens);
    }
  }

  // If no FR IDs found but we have BR or SCR, create a placeholder FR
  if (requirements.length === 0) {
    requirements.push({
      id: 'FR-001',
      title: 'Main Requirement',
      description: 'Extracted from PRD',
      priority: 'must',
      accessRoles: [],
      acceptanceCriteria: [],
      businessRules: allBusinessRules,
      screens: allScreens,
      screenFlow: { steps: [] },
      involvedEntities: [],
      isWorkflow: false,
    });
  }

  return requirements;
}
