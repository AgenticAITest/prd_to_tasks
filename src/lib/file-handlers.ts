export type SupportedFileType = 'markdown' | 'text' | 'html' | 'json' | 'yaml' | 'pdf' | 'unknown';

export interface FileInfo {
  name: string;
  size: number;
  type: SupportedFileType;
  extension: string;
  lastModified: Date;
}

export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
  fileInfo: FileInfo;
}

// Get file type from extension
export function getFileType(filename: string): SupportedFileType {
  const ext = filename.toLowerCase().split('.').pop() || '';

  switch (ext) {
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'txt':
      return 'text';
    case 'html':
    case 'htm':
      return 'html';
    case 'json':
      return 'json';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'pdf':
      return 'pdf';
    default:
      return 'unknown';
  }
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() || '';
}

// Validate file type for PRD upload
export function isValidPRDFile(filename: string): boolean {
  const validExtensions = ['md', 'markdown', 'txt', 'pdf'];
  const ext = getFileExtension(filename);
  return validExtensions.includes(ext);
}

// Validate file type for screen/wireframe upload
export function isValidScreenFile(filename: string): boolean {
  const validExtensions = ['html', 'htm'];
  const ext = getFileExtension(filename);
  return validExtensions.includes(ext);
}

// Get file info without reading content
export function getFileInfo(file: File): FileInfo {
  return {
    name: file.name,
    size: file.size,
    type: getFileType(file.name),
    extension: getFileExtension(file.name),
    lastModified: new Date(file.lastModified),
  };
}

// Read file as text
export function readFileAsText(file: File): Promise<FileReadResult> {
  return new Promise((resolve) => {
    const fileInfo = getFileInfo(file);

    // Check if file type is supported for text reading
    if (fileInfo.type === 'pdf') {
      resolve({
        success: false,
        error: 'PDF files are not yet supported. Please convert to markdown or text.',
        fileInfo,
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        success: true,
        content: reader.result as string,
        fileInfo,
      });
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: `Failed to read file: ${reader.error?.message || 'Unknown error'}`,
        fileInfo,
      });
    };

    reader.readAsText(file);
  });
}

// Read multiple files
export async function readMultipleFiles(files: File[]): Promise<FileReadResult[]> {
  const results = await Promise.all(files.map((file) => readFileAsText(file)));
  return results;
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

// Validate file size (default max 10MB)
export function isValidFileSize(file: File, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  return file.size <= maxSizeBytes;
}

// Create a file input for programmatic file selection
export function createFileInput(
  accept: string = '.md,.txt,.html',
  multiple: boolean = false
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;
  input.style.display = 'none';
  return input;
}

// Trigger file picker dialog
export function openFilePicker(
  accept: string = '.md,.txt,.html',
  multiple: boolean = false
): Promise<File[]> {
  return new Promise((resolve) => {
    const input = createFileInput(accept, multiple);

    input.onchange = () => {
      const files = input.files ? Array.from(input.files) : [];
      document.body.removeChild(input);
      resolve(files);
    };

    input.oncancel = () => {
      document.body.removeChild(input);
      resolve([]);
    };

    document.body.appendChild(input);
    input.click();
  });
}

// Handle drag and drop
export interface DropHandler {
  onDragEnter: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

export function createDropHandler(
  onFiles: (files: File[]) => void,
  onDragState?: (isDragging: boolean) => void
): DropHandler {
  let dragCounter = 0;

  return {
    onDragEnter: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (dragCounter === 1) {
        onDragState?.(true);
      }
    },

    onDragLeave: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        onDragState?.(false);
      }
    },

    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },

    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      onDragState?.(false);

      const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
      if (files.length > 0) {
        onFiles(files);
      }
    },
  };
}

// Parse JSON file content
export function parseJSONFile<T>(content: string): { success: boolean; data?: T; error?: string } {
  try {
    const data = JSON.parse(content) as T;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Parse YAML file content (basic implementation)
export function parseYAMLFile(content: string): { success: boolean; data?: unknown; error?: string } {
  // This is a very basic YAML parser for simple key-value pairs
  // For full YAML support, consider using a library like js-yaml
  try {
    const lines = content.split('\n');
    const result: Record<string, unknown> = {};

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }

      const trimmedLine = line.trim();

      // Simple key-value pair
      const match = trimmedLine.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;

        if (value) {
          // Simple value
          result[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
        // Note: Nested objects not supported in this basic parser
      }
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Extract content from HTML file (for screen wireframes)
export function extractHTMLContent(html: string): {
  title: string;
  body: string;
  forms: { id?: string; fields: string[] }[];
  tables: string[][];
} {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract title
  const title = doc.querySelector('title')?.textContent || '';

  // Extract body content
  const body = doc.body?.innerHTML || '';

  // Extract forms
  const forms: { id?: string; fields: string[] }[] = [];
  doc.querySelectorAll('form').forEach((form) => {
    const fields: string[] = [];
    form.querySelectorAll('input, select, textarea').forEach((field) => {
      const name = field.getAttribute('name') || field.getAttribute('id') || '';
      if (name) {
        fields.push(name);
      }
    });
    forms.push({
      id: form.getAttribute('id') || undefined,
      fields,
    });
  });

  // Extract tables
  const tables: string[][] = [];
  doc.querySelectorAll('table').forEach((table) => {
    const rows: string[] = [];
    table.querySelectorAll('th, td').forEach((cell) => {
      rows.push(cell.textContent?.trim() || '');
    });
    if (rows.length > 0) {
      tables.push(rows);
    }
  });

  return { title, body, forms, tables };
}
