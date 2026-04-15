import { Token, TokenKind } from './types.ts';

export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  // Main tokenization function
  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      
      if (this.pos >= this.source.length) break;

      const token = this.nextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    // Add EOF token
    this.tokens.push({
      kind: TokenKind.EOF,
      text: '',
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  private nextToken(): Token | null {
    const start = this.pos;
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

    // Two-character operators
    if (ch === '=' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { kind: TokenKind.EqualEqual, text: '==', line: startLine, column: startColumn };
    }
    if (ch === '!' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { kind: TokenKind.NotEqual, text: '!=', line: startLine, column: startColumn };
    }
    if (ch === '<' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { kind: TokenKind.LessEqual, text: '<=', line: startLine, column: startColumn };
    }
    if (ch === '>' && this.peek() === '=') {
      this.advance();
      this.advance();
      return { kind: TokenKind.GreaterEqual, text: '>=', line: startLine, column: startColumn };
    }
    if (ch === '&' && this.peek() === '&') {
      this.advance();
      this.advance();
      return { kind: TokenKind.And, text: '&&', line: startLine, column: startColumn };
    }
    if (ch === '|' && this.peek() === '|') {
      this.advance();
      this.advance();
      return { kind: TokenKind.Or, text: '||', line: startLine, column: startColumn };
    }
    if (ch === '-' && this.peek() === '>') {
      this.advance();
      this.advance();
      return { kind: TokenKind.Arrow, text: '->', line: startLine, column: startColumn };
    }

    // Single-character tokens
    const singleChar = this.readSingleChar(ch, startLine, startColumn);
    if (singleChar) {
      this.advance();
      return singleChar;
    }

    // Unknown character
    this.advance();
    return { kind: TokenKind.Unknown, text: ch, line: startLine, column: startColumn };
  }

  private readNumber(line: number, column: number): Token {
    let text = '';
    while (this.pos < this.source.length && this.isDigit(this.current())) {
      text += this.current();
      this.advance();
    }
    return { kind: TokenKind.Number, text, line, column };
  }

  private readIdentifierOrKeyword(line: number, column: number): Token {
    let text = '';
    while (this.pos < this.source.length && (this.isAlpha(this.current()) || this.isDigit(this.current()))) {
      text += this.current();
      this.advance();
    }

    // Check if it's a keyword
    const kind = this.getKeywordKind(text);
    return { kind, text, line, column };
  }

  private readString(quote: string, line: number, column: number): Token {
    this.advance(); // Skip opening quote
    let text = '';
    
    while (this.pos < this.source.length && this.current() !== quote) {
      if (this.current() === '\\' && this.peek() === quote) {
        this.advance(); // Skip backslash
        text += this.current();
        this.advance();
      } else if (this.current() === '\\' && this.peek() === 'n') {
        this.advance(); // Skip backslash
        this.advance(); // Skip 'n'
        text += '\n';
      } else if (this.current() === '\\' && this.peek() === 't') {
        this.advance();
        this.advance();
        text += '\t';
      } else if (this.current() === '\\' && this.peek() === '\\') {
        this.advance();
        this.advance();
        text += '\\';
      } else {
        text += this.current();
        this.advance();
      }
    }

    if (this.current() === quote) {
      this.advance(); // Skip closing quote
    }

    return { kind: TokenKind.String, text, line, column };
  }

  private readSingleChar(ch: string, line: number, column: number): Token | null {
    const map: Record<string, TokenKind> = {
      '+': TokenKind.Plus,
      '-': TokenKind.Minus,
      '*': TokenKind.Star,
      '/': TokenKind.Slash,
      '%': TokenKind.Percent,
      '=': TokenKind.Equal,
      '<': TokenKind.Less,
      '>': TokenKind.Greater,
      '!': TokenKind.Not,
      '(': TokenKind.LParen,
      ')': TokenKind.RParen,
      '{': TokenKind.LBrace,
      '}': TokenKind.RBrace,
      '[': TokenKind.LBracket,
      ']': TokenKind.RBracket,
      ';': TokenKind.Semicolon,
      '@': TokenKind.At,
      ':': TokenKind.Colon,
      ',': TokenKind.Comma,
      '.': TokenKind.Dot,
    };

    const kind = map[ch];
    if (kind) {
      return { kind, text: ch, line, column };
    }
    return null;
  }

  private getKeywordKind(text: string): TokenKind {
    const keywords: Record<string, TokenKind> = {
      'function': TokenKind.Function,
      'let': TokenKind.Let,
      'const': TokenKind.Const,
      'return': TokenKind.Return,
      'if': TokenKind.If,
      'else': TokenKind.Else,
      'while': TokenKind.While,
      'for': TokenKind.For,
      'break': TokenKind.Break,
      'continue': TokenKind.Continue,
      'interface': TokenKind.Interface,
      'declare': TokenKind.Declare,
      'null': TokenKind.Null,
      'true': TokenKind.True,
      'false': TokenKind.False,
      'addressof': TokenKind.Addressof,
      'import': TokenKind.Import,
      'export': TokenKind.Export,
      'from': TokenKind.From,
      'as': TokenKind.As,
    };

    return keywords[text] || TokenKind.Identifier;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.source.length) {
      const ch = this.current();

      // Whitespace
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
        continue;
      }

      // Newline
      if (ch === '\n') {
        this.advance();
        this.line++;
        this.column = 1;
        continue;
      }

      // Comments
      if (ch === '/' && this.peek() === '/') {
        // Single-line comment
        while (this.pos < this.source.length && this.current() !== '\n') {
          this.advance();
        }
        continue;
      }

      if (ch === '/' && this.peek() === '*') {
        // Multi-line comment
        this.advance(); // Skip '/'
        this.advance(); // Skip '*'
        while (this.pos < this.source.length - 1) {
          if (this.current() === '*' && this.peek() === '/') {
            this.advance(); // Skip '*'
            this.advance(); // Skip '/'
            break;
          }
          if (this.current() === '\n') {
            this.line++;
            this.column = 1;
          }
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  // Helper methods
  private current(): string {
    return this.source[this.pos] || '';
  }

  private peek(offset: number = 1): string {
    return this.source[this.pos + offset] || '';
  }

  private advance(): void {
    if (this.pos < this.source.length) {
      this.pos++;
      this.column++;
    }
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }
}
