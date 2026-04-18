// module-resolver.ts - Resolves TSN module imports
// Handles: std: modules, relative paths, absolute paths

import { readFileSync } from 'node:fs';

import { ImportDecl, ExportDecl, FunctionDecl, VarDecl, InterfaceDecl, ClassDecl, ASTKind, TypeAnnotation, Program } from './types.ts';
import { Lexer } from './lexer.ts';
import { Parser } from './parser.ts';
import { Reporter } from './diagnostics.ts';

function toLLVMTypeName(type: TypeAnnotation): string {
  if (type.isPointer) return `ptr<${toLLVMNamedBaseType(type.name)}>`;
  if (type.name === 'string') return 'ptr';
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
    void: 'void', string: 'ptr',
    null: 'i8', undefined: 'i8',
  };

  return map[name] || (name === 'string' ? 'ptr' : 'i32');
}

// Represents an exported symbol from a module
export interface ExportedSymbol {
  name: string;            // Symbol name
  kind: 'function' | 'const' | 'let' | 'interface' | 'class';
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
  'std:fs': [
    { name: 'readFile',  kind: 'function', llvmType: 'ptr', paramTypes: ['ptr'] },
    { name: 'writeFile', kind: 'function', llvmType: 'i32', paramTypes: ['ptr', 'ptr', 'i32'] },
    { name: 'exists',    kind: 'function', llvmType: 'i32', paramTypes: ['ptr'] },
  ],
  'std:memory': [
    { name: 'alloc', kind: 'function', llvmType: 'ptr', paramTypes: ['i32'] },
    { name: 'free',  kind: 'function', llvmType: 'void', paramTypes: ['ptr'] },
    { name: 'copy',  kind: 'function', llvmType: 'void', paramTypes: ['ptr', 'ptr', 'i32'] },
  ],
  'std:string': [
    { name: 'length',      kind: 'function', llvmType: 'i32', paramTypes: ['ptr'] },
    { name: 'byteLength',  kind: 'function', llvmType: 'i32', paramTypes: ['ptr'] },
    { name: 'charCodeAt',  kind: 'function', llvmType: 'i32', paramTypes: ['ptr', 'i32'] },
    { name: 'concat',      kind: 'function', llvmType: 'ptr', paramTypes: ['ptr', 'ptr'] },
    { name: 'compare',     kind: 'function', llvmType: 'i32', paramTypes: ['ptr', 'ptr'] },
    { name: 'substr',      kind: 'function', llvmType: 'ptr', paramTypes: ['ptr', 'i32', 'i32'] },
    { name: 'includes',    kind: 'function', llvmType: 'i1',  paramTypes: ['ptr', 'ptr'] },
    { name: 'indexOf',     kind: 'function', llvmType: 'i32', paramTypes: ['ptr', 'ptr'] },
    { name: 'startsWith',  kind: 'function', llvmType: 'i1',  paramTypes: ['ptr', 'ptr'] },
    { name: 'endsWith',    kind: 'function', llvmType: 'i1',  paramTypes: ['ptr', 'ptr'] },
  ],
};

export class ModuleResolver {
  private moduleCache: Map<string, ModuleExports> = new Map();
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  // Resolve a module path to its exports
  resolveModule(modulePath: string): ModuleExports | null {
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath)!;
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
        result.set(`${importDecl.namespace}.${sym.name}`, sym);
      }
    } else {
      for (const spec of importDecl.specifiers) {
        const exported = moduleExports.symbols.find((s) => s.name === spec.imported);
        if (exported) {
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
        const mangledName = namespace ? `${namespace}_${sym.name}` : sym.name;

        declarations.push(`declare ${sym.llvmType} @${mangledName}(${params})`);
      } else if (sym.kind === 'const' || sym.kind === 'let') {
        declarations.push(`@${sym.name} = external global ${sym.varType}`);
      }
    }

    return declarations;
  }

  private resolveStdModule(modulePath: string): ModuleExports | null {
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
    
    try {
        const content = readFileSync(stdPath, 'utf8');
        const lexer = new Lexer(content);
        const tokens = lexer.tokenize();
        const reporter = new Reporter(content, stdPath);
        const parser = new Parser(tokens, reporter);
        const program = parser.parse();
        
        const symbols: ExportedSymbol[] = [];
        for (let decl of program.declarations) {
            if (decl.kind === ASTKind.ExportDecl) {
                decl = (decl as ExportDecl).declaration;
            }
            
            if (decl.kind === ASTKind.ClassDecl) {
                const c = decl as ClassDecl;
                symbols.push({ name: c.name, kind: 'class', ast: c });
            } else if (decl.kind === ASTKind.FunctionDecl) {
                const f = decl as FunctionDecl;
                symbols.push({
                  name: f.name,
                  kind: 'function',
                  llvmType: toLLVMTypeName(f.returnType),
                  paramTypes: f.params.map((p) => toLLVMTypeName(p.type)),
                  ast: f,
                });
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
      console.warn(`Module not compiled: ${modulePath} (${metaPath})`);
      return null;
    }
  }

  // Generate .meta file path from .tsn path
  resolveMetaPath(modulePath: string): string {
    let resolved = modulePath;
    if (!modulePath.startsWith('/') && !modulePath.match(/^[A-Z]:/)) {
      resolved = `${this.baseDir}/${modulePath}`;
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
