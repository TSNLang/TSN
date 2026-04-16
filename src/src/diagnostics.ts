export enum DiagnosticSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

export interface Diagnostic {
  line: number;
  column: number;
  message: string;
  severity: DiagnosticSeverity;
  length?: number;
}

export class Reporter {
  private source: string;
  private filename: string;
  private lines: string[];
  private diagnostics: Diagnostic[] = [];

  constructor(source: string, filename: string) {
    this.source = source;
    this.filename = filename;
    this.lines = source.split('\n');
  }

  error(line: number, column: number, message: string, length: number = 1): void {
    this.diagnostics.push({
      line,
      column,
      message,
      severity: DiagnosticSeverity.Error,
      length,
    });
  }

  warn(line: number, column: number, message: string, length: number = 1): void {
    this.diagnostics.push({
      line,
      column,
      message,
      severity: DiagnosticSeverity.Warning,
      length,
    });
  }

  hasErrors(): boolean {
    return this.diagnostics.some((d) => d.severity === DiagnosticSeverity.Error);
  }

  print(): void {
    if (this.diagnostics.length === 0) return;

    for (const diag of this.diagnostics) {
      const color = this.getSeverityColor(diag.severity);
      const severityText = diag.severity.toUpperCase();

      console.error(`${color}${severityText}\x1b[0m: ${diag.message}`);
      console.error(`  --> ${this.filename}:${diag.line}:${diag.column}`);

      if (diag.line > 0 && diag.line <= this.lines.length) {
        const lineText = this.lines[diag.line - 1];
        const indent = diag.line.toString().length;
        
        console.error(`${' '.repeat(indent)} |`);
        console.error(`${diag.line} | ${lineText}`);
        
        const padding = ' '.repeat(diag.column - 1);
        const markers = '^'.repeat(diag.length || 1);
        console.error(`${' '.repeat(indent)} | ${padding}${color}${markers}\x1b[0m`);
      }
      console.error('');
    }
  }

  private getSeverityColor(severity: DiagnosticSeverity): string {
    switch (severity) {
      case DiagnosticSeverity.Error:
        return '\x1b[31m'; // Red
      case DiagnosticSeverity.Warning:
        return '\x1b[33m'; // Yellow
      case DiagnosticSeverity.Info:
        return '\x1b[36m'; // Cyan
      default:
        return '';
    }
  }
}
