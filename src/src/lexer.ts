import { Token, TokenKind } from './types.ts';
import { Reporter } from './diagnostics.ts';

export class Lexer {
  private source: string;
  private reporter: Reporter;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string, reporter?: Reporter) {
    this.source = source;
    // Fallback if no reporter provided
    this.reporter = reporter || new Reporter(source, 'unknown');
  }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      
      if (this.pos >= this.source.length) break;

      const token = this.nextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    this.tokens.push({
      kind: TokenKind.EOF,
      text: '',
      line: this.line,
      column: this.column,
      length: 0,
    });

    return this.tokens;
  }

  private nextToken(): Token | null {
    const startPos = this.pos;
    const startLine = this.line;
    const startColumn = this.column;
    const ch = this.current();

    // Numbers
    if (this.isDigit(ch)) {
      return this.readNumber(startLine, startColumn);
    }

    // Identifiers and keywords
    if (this.isAlpha(ch)) {
      return this.readIdentifierOrKeyword(startLine, startColumn);
    }

    // Strings
    if (ch === '"' || ch === "'") {
      return this.readString(ch, startLine, startColumn);
    }

    // Three-character operators
    const nextThree = ch + this.peek() + this.peek(2);
    if (nextThree === '...') {
      this.advance();
      this.advance();
      this.advance();
      return { kind: TokenKind.Ellipsis, text: nextThree, line: startLine, column: startColumn, length: 3 };
    }

    // Two-character operators
    const twoCharOps: Record<string, TokenKind> = {
      '==': TokenKind.EqualEqual,
      '!=': TokenKind.NotEqual,
      '<=': TokenKind.LessEqual,
      '>=': TokenKind.GreaterEqual,
      '++': TokenKind.PlusPlus,
      '--': TokenKind.MinusMinus,
      '&&': TokenKind.And,
      '||': TokenKind.Or,
      '<<': TokenKind.LessLess,
      '>>': TokenKind.GreaterGreater,
      '->': TokenKind.Arrow,
    };

    const nextTwo = ch + this.peek();
    if (twoCharOps[nextTwo]) {
      this.advance();
      this.advance();
      return { kind: twoCharOps[nextTwo], text: nextTwo, line: startLine, column: startColumn, length: 2 };
    }

    // Single-character tokens
    const singleChar = this.readSingleChar(ch, startLine, startColumn);
    if (singleChar) {
      this.advance();
      return singleChar;
    }

    // Unknown character
    this.reporter.error(startLine, startColumn, `Unknown character: '${ch}'`);
    this.advance();
    return { kind: TokenKind.Unknown, text: ch, line: startLine, column: startColumn, length: 1 };
  }

  private readNumber(line: number, column: number): Token {
    let text = '';
    const start = this.pos;

    // Hexadecimal: 0x...
    if (this.current() === '0' && (this.peek() === 'x' || this.peek() === 'X')) {
      text += '0x';
      this.advance(); // 0
      this.advance(); // x
      while (this.pos < this.source.length && this.isHexDigit(this.current())) {
        text += this.current();
        this.advance();
      }
      return { kind: TokenKind.Number, text, line, column, length: this.pos - start };
    }

    while (this.pos < this.source.length && this.isDigit(this.current())) {
      text += this.current();
      this.advance();
    }

    if (this.pos < this.source.length && this.current() === '.' && this.isDigit(this.peek())) {
      text += '.';
      this.advance();
      while (this.pos < this.source.length && this.isDigit(this.current())) {
        text += this.current();
        this.advance();
      }
    }

    // Optional scientific notation: 1.2e+10
    if (this.pos < this.source.length && (this.current() === 'e' || this.current() === 'E')) {
      const next = this.peek();
      if (this.isDigit(next) || next === '+' || next === '-') {
          text += this.current(); // 'e'
          this.advance();
          if (this.current() === '+' || this.current() === '-') {
              text += this.current();
              this.advance();
          }
          while (this.pos < this.source.length && this.isDigit(this.current())) {
            text += this.current();
            this.advance();
          }
      }
    }

    return { kind: TokenKind.Number, text, line, column, length: this.pos - start };
  }

  private readIdentifierOrKeyword(line: number, column: number): Token {
    let text = '';
    const start = this.pos;
    while (this.pos < this.source.length && (this.isAlpha(this.current()) || this.isDigit(this.current()))) {
      text += this.current();
      this.advance();
    }

    const kind = this.getKeywordKind(text);
    return { kind, text, line, column, length: this.pos - start };
  }

  private readString(quote: string, line: number, column: number): Token {
    const startPos = this.pos;
    this.advance(); // Skip opening quote
    let text = '';
    
    while (this.pos < this.source.length && this.current() !== quote) {
      if (this.current() === '\\') {
        this.advance(); // Skip backslash
        const escape = this.current();
        if (escape === quote) text += quote;
        else if (escape === 'n') text += '\n';
        else if (escape === 't') text += '\t';
        else if (escape === '\\') text += '\\';
        else {
          this.reporter.warn(this.line, this.column - 1, `Unknown escape sequence: '\\${escape}'`, 2);
          text += escape;
        }
        this.advance();
      } else {
        text += this.current();
        this.advance();
      }
    }

    if (this.pos >= this.source.length) {
      this.reporter.error(line, column, 'Unterminated string literal', this.pos - startPos);
    } else {
      this.advance(); // Skip closing quote
    }

    return { kind: TokenKind.String, text, line, column, length: this.pos - startPos };
  }

  private readSingleChar(ch: string, line: number, column: number): Token | null {
    const map: Record<string, TokenKind> = {
      '+': TokenKind.Plus, '-': TokenKind.Minus, '*': TokenKind.Star, '/': TokenKind.Slash,
      '%': TokenKind.Percent, '=': TokenKind.Equal, '<': TokenKind.Less, '>': TokenKind.Greater,
      '!': TokenKind.Not, '(': TokenKind.LParen, ')': TokenKind.RParen, '{': TokenKind.LBrace,
      '}': TokenKind.RBrace, '[': TokenKind.LBracket, ']': TokenKind.RBracket, ';': TokenKind.Semicolon,
      '@': TokenKind.At, ':': TokenKind.Colon, ',': TokenKind.Comma, '.': TokenKind.Dot, '|': TokenKind.Pipe,
      '&': TokenKind.Ampersand, '^': TokenKind.Caret, '~': TokenKind.Tilde,
    };

    const kind = map[ch];
    if (kind) {
      return { kind, text: ch, line, column, length: 1 };
    }
    return null;
  }

  private getKeywordKind(text: string): TokenKind {
    const keywords: Record<string, TokenKind> = {
      'function': TokenKind.Function, 'let': TokenKind.Let, 'const': TokenKind.Const,
      'return': TokenKind.Return, 'if': TokenKind.If, 'else': TokenKind.Else,
      'while': TokenKind.While, 'for': TokenKind.For, 'break': TokenKind.Break,
      'continue': TokenKind.Continue, 'interface': TokenKind.Interface,
      'enum': TokenKind.Enum, 'namespace': TokenKind.Namespace,
      'class': TokenKind.Class, 'this': TokenKind.This, 'new': TokenKind.New,
      'constructor': TokenKind.Constructor, 'public': TokenKind.Public, 'private': TokenKind.Private,
      'super': TokenKind.Super,
      'declare': TokenKind.Declare, 'null': TokenKind.Null, 'true': TokenKind.True,
      'false': TokenKind.False, 'addressof': TokenKind.Addressof, 'import': TokenKind.Import,
      'export': TokenKind.Export, 'from': TokenKind.From, 'as': TokenKind.As, 'type': TokenKind.Type,
      'struct': TokenKind.Struct, 'extends': TokenKind.Extends,
      'implements': TokenKind.Implements,
      'undefined': TokenKind.Undefined,
      'sizeof': TokenKind.Sizeof,
    };
    return keywords[text] || TokenKind.Identifier;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const ch = this.current();

      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
        continue;
      }

      if (ch === '\n') {
        this.advance();
        this.line++;
        this.column = 1;
        continue;
      }

      if (ch === '/' && this.peek() === '/') {
        while (this.pos < this.source.length && this.current() !== '\n') {
          this.advance();
        }
        continue;
      }

      if (ch === '/' && this.peek() === '*') {
        const startLine = this.line;
        const startCol = this.column;
        this.advance(); // /
        this.advance(); // *
        while (this.pos < this.source.length - 1) {
          if (this.current() === '*' && this.peek() === '/') {
            this.advance(); // *
            this.advance(); // /
            break;
          }
          if (this.current() === '\n') {
            this.line++;
            this.column = 1;
          }
          this.advance();
        }
        if (this.pos >= this.source.length - 1 && !(this.current() === '*' && this.peek() === '/')) {
          this.reporter.warn(startLine, startCol, 'Unterminated multi-line comment');
        }
        continue;
      }
      break;
    }
  }

  private current(): string { return this.source[this.pos] || ''; }
  private peek(offset: number = 1): string { return this.source[this.pos + offset] || ''; }
  private advance(): void {
    if (this.pos < this.source.length) {
      this.pos++;
      this.column++;
    }
  }
  private isDigit(ch: string): boolean { return ch >= '0' && ch <= '9'; }
  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }
  private isHexDigit(ch: string): boolean {
    return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
  }
}
