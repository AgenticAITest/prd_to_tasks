export interface ParsedSection {
  level: number;
  title: string;
  content: string;
  children: ParsedSection[];
}

export interface ParsedMarkdown {
  title: string;
  sections: ParsedSection[];
  codeBlocks: { language: string; content: string }[];
  tables: string[][];
  lists: string[][];
}

export class MarkdownParser {
  parse(content: string): ParsedMarkdown {
    const lines = content.split('\n');
    const sections: ParsedSection[] = [];
    const codeBlocks: { language: string; content: string }[] = [];
    const tables: string[][] = [];
    const lists: string[][] = [];

    let title = '';
    let currentSection: ParsedSection | null = null;
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent = '';
    let inTable = false;
    let tableRows: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          codeBlocks.push({ language: codeBlockLang, content: codeBlockContent.trim() });
          inCodeBlock = false;
          codeBlockLang = '';
          codeBlockContent = '';
        } else {
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent += line + '\n';
        continue;
      }

      // Handle tables
      if (line.includes('|') && !line.trim().startsWith('#')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        // Skip separator rows
        if (!line.match(/^\s*\|[\s-:|]+\|\s*$/)) {
          tableRows.push(line);
        }
        continue;
      } else if (inTable) {
        if (tableRows.length > 0) {
          tables.push(tableRows);
        }
        inTable = false;
        tableRows = [];
      }

      // Handle headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const headerTitle = headerMatch[2].trim();

        if (level === 1 && !title) {
          title = headerTitle;
        }

        const section: ParsedSection = {
          level,
          title: headerTitle,
          content: '',
          children: [],
        };

        if (level === 2) {
          sections.push(section);
          currentSection = section;
        } else if (currentSection && level > 2) {
          currentSection.children.push(section);
        }

        continue;
      }

      // Handle lists
      if (line.match(/^[\s]*[-*+]\s+/) || line.match(/^[\s]*\d+\.\s+/)) {
        const listItem = line.replace(/^[\s]*[-*+\d.]+\s+/, '').trim();
        if (lists.length === 0 || !line.startsWith(' ')) {
          lists.push([listItem]);
        } else {
          lists[lists.length - 1].push(listItem);
        }
        continue;
      }

      // Regular content
      if (currentSection && line.trim()) {
        currentSection.content += line + '\n';
      }
    }

    // Handle remaining table
    if (inTable && tableRows.length > 0) {
      tables.push(tableRows);
    }

    return {
      title,
      sections,
      codeBlocks,
      tables,
      lists,
    };
  }

  extractSectionByTitle(parsed: ParsedMarkdown, title: string): ParsedSection | null {
    const lowerTitle = title.toLowerCase();
    return parsed.sections.find(
      (s) => s.title.toLowerCase().includes(lowerTitle)
    ) || null;
  }

  extractAllText(parsed: ParsedMarkdown): string {
    let text = parsed.title + '\n\n';

    const extractSection = (section: ParsedSection, depth: number = 0): string => {
      let result = '#'.repeat(section.level) + ' ' + section.title + '\n';
      result += section.content + '\n';
      for (const child of section.children) {
        result += extractSection(child, depth + 1);
      }
      return result;
    };

    for (const section of parsed.sections) {
      text += extractSection(section);
    }

    return text;
  }
}

export const markdownParser = new MarkdownParser();
