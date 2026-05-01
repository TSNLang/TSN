// module-resolver.ts - Resolves TSN module imports
// Handles: std: modules, relative paths, absolute paths

import { readFileSync } from 'node:fs';

import { ImportDecl, ExportDecl, FunctionDecl, VarDecl, InterfaceDecl, ClassDecl, EnumDecl, ASTKind, TypeAnnotation, Program } from './types.ts';
import { Lexer } from './lexer.ts';
import { Parser } from './parser.ts';
import { Reporter } from './diagnostics.ts';
import { CodeGenerator } from './codegen.ts';

function toLLVMTypeName(type: TypeAnnotation): string {
  if (type.isPointer) return `ptr<${toLLVMNamedBaseType(type.name)}>`;
  if (type.name === 'string') return 'string';
  return toLLVMNamedBaseType(type.name);
}

function toLLVMNamedBaseType(name: string): string {
  const map: Record<string, string> = {
    i8: 'i8', i16: 'i16', i32: 'i32', i64: 'i64', i128: 'i128',
    u8: 'i8', u16: 'i16', u32: 'i32', u64: 'i64', u128: 'i128',
    u1: 'i1', bool: 'i1', boolean: 'i1',
    f16: 'half', half: 'half', bfloat: 'bfloat',
    f32: 'float', float: 'float',
    f64: 'double', double: 'double',
    number: 'double',
    void: 'void', string: 'string',
    null: 'i8', undefined: 'i8',
  };

  if (name in map) return map[name];
  return name;
}

// Represents an exported symbol from a module
export interface ExportedSymbol {
  name: string;            // Symbol name
  kind: 'function' | 'const' | 'let' | 'interface' | 'class' | 'enum';
  llvmType?: string;       // LLVM type for functions: return type
  paramTypes?: string[];   // Parameter types for functions
  varType?: string;        // Variable type
  ast?: any;               // Full AST node (for classes/generics)
}

// Represents a compiled module's exports
export interface ModuleExports {
  modulePath: string;      // Original source path
  llFilePath: string;      // Compiled .ll file path
  symbols: ExportedSymbol[];
  program?: Program;
}

// Standard library module definitions
// These remain hardcoded until they are moved into TSN stdlib modules
const STD_MODULES: Record<string, ExportedSymbol[]> = {
};

export class ModuleResolver {
  private moduleCache: Map<string, ModuleExports> = new Map();
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  // Resolve a module path to its exports
  resolveModule(modulePath: string): ModuleExports | null {
    console.log(`--- moduleResolver.resolve: ${modulePath}`);
    if (this.moduleCache.has(modulePath)) {
      console.log(`--- moduleResolver.resolve: cache hit for ${modulePath}`);
      return this.moduleCache.get(modulePath)!;
    }

    if (modulePath.startsWith('std/')) {
      const parts = modulePath.split('/');
      const name = parts[parts.length - 1];
      return this.resolveStdModule('std:' + (name.endsWith('.tsn') ? name.substring(0, name.length - 4) : name));
    }

    if (modulePath.startsWith('std:')) {
      return this.resolveStdModule(modulePath);
    }

    return this.resolveFileModule(modulePath);
  }

  // Get symbols exported from a module for a specific import
  getImportedSymbols(
    importDecl: ImportDecl,
    moduleExports: ModuleExports
  ): Map<string, ExportedSymbol> {
    const result = new Map<string, ExportedSymbol>();
    const namespace = importDecl.namespace;

    console.log(`--- getImportedSymbols: import from ${importDecl.source}, symbols count=${moduleExports.symbols.length}`);

    // Handle default import: import Optional from 'std:option'
    if (importDecl.defaultImport) {
        const symName = importDecl.defaultImport;
        const sym = moduleExports.symbols.find(s => s.name === symName);
        if (sym) {
            result.set(symName, sym);
        }
    }

    if (namespace) {
      for (const sym of moduleExports.symbols) {
        console.log(`--- getImportedSymbols: namespace=${namespace}, sym.name=${sym.name}, sym.realName=${sym.realName}`);
        result.set(`${importDecl.namespace}.${sym.name}`, sym);
      }
    } else {
      for (const spec of importDecl.specifiers) {
        const exported = moduleExports.symbols.find((s) => s.name === spec.imported || s.name.endsWith("." + spec.imported));
        if (exported) {
          console.log(`--- getImportedSymbols: spec.local=${spec.local}, exported.name=${exported.name}, exported.realName=${exported.realName}`);
          result.set(spec.local, exported);
        }
      }
    }

    return result;
  }

  // Generate LLVM IR declarations for imported symbols
  generateExternalDeclarations(
    importDecl: ImportDecl,
    moduleExports: ModuleExports,
    namespace?: string
  ): string[] {
    const declarations: string[] = [];

    declarations.push(`; Imports from "${importDecl.source}"`);

    for (const sym of moduleExports.symbols) {
      if (sym.kind === 'function') {
        const params = (sym.paramTypes || []).join(', ');
        const mangledName = sym.realName || (namespace ? `${namespace}_${sym.name}` : sym.name);

        declarations.push(`declare ${sym.llvmType} @${mangledName}(${params})`);
      } else if (sym.kind === 'const' || sym.kind === 'let') {
        const mangledName = sym.realName || sym.name;
        declarations.push(`@${mangledName} = external global ${sym.varType}`);
      }
    }

    return declarations;
  }

  private resolveStdModule(modulePath: string): ModuleExports | null {
    console.log(`--- resolveStdModule start: ${modulePath}`);
    if (STD_MODULES[modulePath]) {
        return {
          modulePath,
          llFilePath: '',
          symbols: STD_MODULES[modulePath],
        };
    }

    // Attempt to resolve as a TSN standard module in src/std/
    const stdName = modulePath.substring(4); // remove 'std:'
    const stdPath = `src/std/${stdName}.tsn`;
    console.log(`--- resolveStandardModule: modulePath=${modulePath}, stdPath=${stdPath}`);
    
    try {
        console.log(`🔍 Loading std module from: ${stdPath}`);
        const content = readFileSync(stdPath, 'utf8');
        const lexer = new Lexer(content);
        const tokens = lexer.tokenize();
        const reporter = new Reporter(content, stdPath);
        const parser = new Parser(tokens, reporter);
        const program = parser.parse();
        
        const symbols: ExportedSymbol[] = [];
        const codegen = new CodeGenerator(); // Use CodeGenerator to check target OS
        const sourceLines = content.split(/\r?\n/);
        const seenSymbols = new Set<string>();

        const addExportedSymbol = (innerDecl: any, namespace?: string) => {
            console.log(`--- addExportedSymbol: start, innerDecl.kind=${innerDecl.kind}, namespace=${namespace}`);
            if (innerDecl.kind === ASTKind.NamespaceDecl) {
              const ns = innerDecl as NamespaceDecl;
              console.log(`--- addExportedSymbol: entering namespace ${ns.name}, body size=${ns.body.length}`);
              for (const sub of ns.body) {
                if (sub.kind === ASTKind.FunctionDecl || sub.kind === ASTKind.ClassDecl || sub.kind === ASTKind.VarDecl || sub.kind === ASTKind.EnumDecl) {
                  addExportedSymbol(sub as any, ns.name);
                } else if (sub.kind === ASTKind.ExportDecl) {
                  const exportDecl = sub as ExportDecl;
                  addExportedSymbol(exportDecl.declaration, ns.name);
                } else {
                  console.log(`--- addExportedSymbol: skipping sub kind=${sub.kind}`);
                }
              }
              return;
            }
            if (innerDecl.kind === ASTKind.ClassDecl) {
                const c = innerDecl as ClassDecl;
                const fullName = namespace ? `${namespace}.${c.name}` : c.name;
                if (seenSymbols.has(`class:${fullName}`)) return;
                seenSymbols.add(`class:${fullName}`);
                symbols.push({ name: fullName, kind: 'class', ast: c });
            } else if (innerDecl.kind === ASTKind.FunctionDecl) {
                const f = innerDecl as FunctionDecl;
                const fullName = namespace ? `${namespace}.${f.name}` : f.name;
                if (!codegen.isTargetOSMatch(f.targetOS) || seenSymbols.has(`function:${fullName}`)) return;
                seenSymbols.add(`function:${fullName}`);
                
                // Mangle names for stdlib functions so they match when imported
                const oldScopeStack = (codegen as any).scopeStack;
                (codegen as any).scopeStack = namespace ? [namespace] : [];
                const mangledName = (codegen as any).mangleName(f.name, f.params, !!f.ffiLib || f.isDeclare);
                (codegen as any).scopeStack = oldScopeStack;
                
                // If it's a namespaced function, use the namespaced name in metadata
                const metaName = mangledName;
                console.log(`--- addExportedSymbol: fullName=${fullName}, metaName=${metaName}, mangledName=${mangledName}`);

                symbols.push({
                  name: fullName,
                  realName: metaName,
                  kind: 'function',
                  llvmType: toLLVMTypeName(f.returnType),
                  paramTypes: f.params.map((p) => toLLVMTypeName(p.type)),
                  ast: f,
                  isExternal: !!f.ffiLib || f.isDeclare // Mark as external if it's FFI or declare
                });
            } else if (innerDecl.kind === ASTKind.VarDecl) {
                const v = innerDecl as VarDecl;
                const fullName = namespace ? `${namespace}.${v.name}` : v.name;
                if (seenSymbols.has(`var:${fullName}`)) return;
                seenSymbols.add(`var:${fullName}`);
                symbols.push({
                    name: fullName,
                    kind: v.isConst ? 'const' : 'let',
                    varType: toLLVMTypeName(v.type || { name: 'i32' } as any),
                    ast: v
                });
            } else if (innerDecl.kind === ASTKind.EnumDecl) {
                const enumDecl = innerDecl as EnumDecl;
                const fullName = namespace ? `${namespace}.${enumDecl.name}` : enumDecl.name;
                if (seenSymbols.has(`enum:${fullName}`)) return;
                seenSymbols.add(`enum:${fullName}`);
                symbols.push({ name: fullName, kind: 'enum', ast: enumDecl });
            }
        };

        const isInlineExportedDecl = (decl: any): boolean => {
          const lineText = sourceLines[decl.line - 1] || '';
          return /\bexport\b/.test(lineText);
        };
        
        for (const decl of program.declarations) {
            console.log(`--- resolveStandardModule: top-level decl kind=${decl.kind}, line=${decl.line}`);
            if (decl.kind === ASTKind.ExportDecl) {
                addExportedSymbol((decl as ExportDecl).declaration as FunctionDecl | ClassDecl | VarDecl | EnumDecl);
                continue;
            }

            if (decl.kind === ASTKind.NamespaceDecl) {
                const ns = decl as NamespaceDecl;
                const lineText = sourceLines[ns.line - 1] || '';
                const isNSExported = /\bexport\b/.test(lineText);
                console.log(`--- resolveStandardModule: checking namespace ${ns.name}, lineText="${lineText}", isNSExported=${isNSExported}`);
                // For stdlib, we treat all namespaces as exported if they are top-level
                if (isNSExported || true) {
                    addExportedSymbol(ns);
                }
                continue;
            }

            // Some stdlib declarations are parsed as plain declarations when `export`
            // shares the line with decorators. Detect those from the original source line.
            if (
              (decl.kind === ASTKind.ClassDecl || decl.kind === ASTKind.FunctionDecl || decl.kind === ASTKind.VarDecl || decl.kind === ASTKind.EnumDecl)
              && isInlineExportedDecl(decl as FunctionDecl | ClassDecl | VarDecl | EnumDecl)
            ) {
                addExportedSymbol(decl as FunctionDecl | ClassDecl | VarDecl | EnumDecl);
            }
        }
        
        const exports: ModuleExports = {
          modulePath: stdPath,
          llFilePath: '',
          symbols,
          program,
        };
        
        this.moduleCache.set(modulePath, exports);
        return exports;
    } catch (e) {
      console.error(`Failed to resolve standard module: ${modulePath} at ${stdPath}:`, e);
      return null;
    }
  }

  private resolveFileModule(modulePath: string): ModuleExports | null {
    const metaPath = this.resolveMetaPath(modulePath);

    try {
      const metaContent = readFileSync(metaPath, 'utf8');
      const meta = JSON.parse(metaContent) as ModuleExports;
      this.moduleCache.set(modulePath, meta);
      return meta;
    } catch {
      const sourcePath = this.resolveSourcePath(modulePath);

      try {
        const content = readFileSync(sourcePath, 'utf8');
        const lexer = new Lexer(content);
        const tokens = lexer.tokenize();
        const reporter = new Reporter(content, sourcePath);
        const parser = new Parser(tokens, reporter);
        const program = parser.parse();

        const symbols: ExportedSymbol[] = [];
        const seenSymbols = new Set<string>();
        const codegen = new CodeGenerator(new ModuleResolver(this.baseDir));
        const sourceLines = content.split(/\r?\n/);

        const addExportedSymbol = (innerDecl: FunctionDecl | ClassDecl | VarDecl | EnumDecl) => {
          if (innerDecl.kind === ASTKind.ClassDecl) {
            const c = innerDecl as ClassDecl;
            if (seenSymbols.has(`class:${c.name}`)) return;
            seenSymbols.add(`class:${c.name}`);
            symbols.push({ name: c.name, kind: 'class', ast: c });
          } else if (innerDecl.kind === ASTKind.FunctionDecl) {
            const f = innerDecl as FunctionDecl;
            if (!codegen.isTargetOSMatch(f.targetOS) || seenSymbols.has(`function:${f.name}`)) return;
            seenSymbols.add(`function:${f.name}`);
            symbols.push({
              name: f.name,
              kind: 'function',
              llvmType: toLLVMTypeName(f.returnType),
              paramTypes: f.params.map((p) => toLLVMTypeName(p.type)),
              ast: f,
            });
          } else if (innerDecl.kind === ASTKind.VarDecl) {
            const v = innerDecl as VarDecl;
            if (seenSymbols.has(`var:${v.name}`)) return;
            seenSymbols.add(`var:${v.name}`);
            symbols.push({
              name: v.name,
              kind: v.isConst ? 'const' : 'let',
              varType: toLLVMTypeName(v.type || { name: 'i32' } as any),
              ast: v,
            });
          } else if (innerDecl.kind === ASTKind.EnumDecl) {
            const enumDecl = innerDecl as EnumDecl;
            if (seenSymbols.has(`enum:${enumDecl.name}`)) return;
            seenSymbols.add(`enum:${enumDecl.name}`);
            symbols.push({ name: enumDecl.name, kind: 'enum', ast: enumDecl });
          }
        };

        const isInlineExportedDecl = (decl: FunctionDecl | ClassDecl | VarDecl | EnumDecl): boolean => {
          const lineText = sourceLines[decl.line - 1] || '';
          return /\bexport\b/.test(lineText);
        };

        for (const decl of program.declarations) {
          if (decl.kind === ASTKind.ExportDecl) {
            addExportedSymbol((decl as ExportDecl).declaration as FunctionDecl | ClassDecl | VarDecl | EnumDecl);
            continue;
          }

          if (
            (decl.kind === ASTKind.ClassDecl || decl.kind === ASTKind.FunctionDecl || decl.kind === ASTKind.VarDecl || decl.kind === ASTKind.EnumDecl)
            && isInlineExportedDecl(decl as FunctionDecl | ClassDecl | VarDecl | EnumDecl)
          ) {
            addExportedSymbol(decl as FunctionDecl | ClassDecl | VarDecl | EnumDecl);
          }
        }

        const exports: ModuleExports = {
          modulePath: sourcePath,
          llFilePath: sourcePath.replace(/\.tsn$/, '.ll'),
          symbols,
          program,
        };

        this.moduleCache.set(modulePath, exports);
        return exports;
      } catch {
        console.warn(`Module not compiled: ${modulePath} (${metaPath})`);
        return null;
      }
    }
  }

  private resolveSourcePath(modulePath: string): string {
    if (modulePath.startsWith('std/')) {
        return `src/${modulePath}`;
    }
    if (!modulePath.startsWith('/') && !modulePath.match(/^[A-Z]:/)) {
      return `${this.baseDir}/${modulePath}`;
    }
    return modulePath;
  }

  // Generate .meta file path from .tsn path
  resolveMetaPath(modulePath: string): string {
    if (modulePath.startsWith('std/')) {
        return `src/${modulePath.replace(/\.tsn$/, '.meta')}`;
    }
    let resolved = modulePath;
    if (!modulePath.startsWith('/') && !modulePath.match(/^[A-Z]:/)) {
      // If modulePath already starts with baseDir, don't prepend it again
      const normalizedBase = this.baseDir.replace(/\\/g, '/');
      const normalizedModule = modulePath.replace(/\\/g, '/');
      if (normalizedModule.startsWith(normalizedBase + '/')) {
        resolved = normalizedModule;
      } else {
        resolved = `${this.baseDir}/${modulePath}`;
      }
    }
    return resolved.replace(/\.tsn$/, '.meta');
  }

  // Generate a .meta file from a compiled program's exports
  static generateMetaFile(
    sourcePath: string,
    llFilePath: string,
    exportedSymbols: ExportedSymbol[]
  ): string {
    const meta: ModuleExports = {
      modulePath: sourcePath,
      llFilePath,
      symbols: exportedSymbols,
    };
    return JSON.stringify(meta, null, 2);
  }
}
