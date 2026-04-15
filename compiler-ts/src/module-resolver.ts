// module-resolver.ts - Resolves TSN module imports
// Handles: std: modules, relative paths, absolute paths

import { ImportDecl, ExportDecl, FunctionDecl, VarDecl, InterfaceDecl, ASTKind, TypeAnnotation } from './types.ts';

// Represents an exported symbol from a module
export interface ExportedSymbol {
  name: string;            // Symbol name
  kind: 'function' | 'const' | 'let' | 'interface';
  llvmType?: string;       // LLVM type for functions: return type
  paramTypes?: string[];   // Parameter types for functions
  varType?: string;        // Variable type
}

// Represents a compiled module's exports
export interface ModuleExports {
  modulePath: string;      // Original source path
  llFilePath: string;      // Compiled .ll file path
  symbols: ExportedSymbol[];
}

// Standard library module definitions
// These are hardcoded since they map to C runtime functions
const STD_MODULES: Record<string, ExportedSymbol[]> = {
  'std:console': [
    { name: 'log',   kind: 'function', llvmType: 'void', paramTypes: ['ptr'] },
    { name: 'error', kind: 'function', llvmType: 'void', paramTypes: ['ptr'] },
    { name: 'warn',  kind: 'function', llvmType: 'void', paramTypes: ['ptr'] },
  ],
  'std:process': [
    { name: 'exit', kind: 'function', llvmType: 'void', paramTypes: ['i32'] },
    { name: 'args', kind: 'function', llvmType: 'ptr', paramTypes: [] },
  ],
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
    { name: 'length',  kind: 'function', llvmType: 'i32', paramTypes: ['ptr'] },
    { name: 'charAt',  kind: 'function', llvmType: 'i32', paramTypes: ['ptr', 'i32'] },
    { name: 'concat',  kind: 'function', llvmType: 'ptr', paramTypes: ['ptr', 'ptr'] },
    { name: 'compare', kind: 'function', llvmType: 'i32', paramTypes: ['ptr', 'ptr'] },
    { name: 'substr',  kind: 'function', llvmType: 'ptr', paramTypes: ['ptr', 'i32', 'i32'] },
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
    // Check cache
    if (this.moduleCache.has(modulePath)) {
      return this.moduleCache.get(modulePath)!;
    }

    // Check if it's a std: module
    if (modulePath.startsWith('std:')) {
      return this.resolveStdModule(modulePath);
    }

    // Try to resolve as file path (would need to compile it)
    return this.resolveFileModule(modulePath);
  }

  // Get symbols exported from a module for a specific import
  getImportedSymbols(
    importDecl: ImportDecl, 
    moduleExports: ModuleExports
  ): Map<string, ExportedSymbol> {
    const result = new Map<string, ExportedSymbol>();

    if (importDecl.namespace) {
      // import * as name from "module"
      // All exported symbols available as name.symbol
      for (const sym of moduleExports.symbols) {
        result.set(`${importDecl.namespace}.${sym.name}`, sym);
      }
    } else {
      // import { foo, bar as baz } from "module"
      for (const spec of importDecl.specifiers) {
        const exported = moduleExports.symbols.find(s => s.name === spec.imported);
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
        const mangledName = namespace 
          ? `${namespace}_${sym.name}`  // console.log -> console_log
          : sym.name;
        
        declarations.push(`declare ${sym.llvmType} @${mangledName}(${params})`);
      } else if (sym.kind === 'const' || sym.kind === 'let') {
        declarations.push(`@${sym.name} = external global ${sym.varType}`);
      }
    }

    return declarations;
  }

  private resolveStdModule(modulePath: string): ModuleExports | null {
    const symbols = STD_MODULES[modulePath];
    if (!symbols) {
      console.error(`Unknown standard module: ${modulePath}`);
      return null;
    }

    const exports: ModuleExports = {
      modulePath,
      llFilePath: '', // std modules don't have .ll files
      symbols,
    };

    this.moduleCache.set(modulePath, exports);
    return exports;
  }

  private resolveFileModule(modulePath: string): ModuleExports | null {
    // For file modules, we need to:
    // 1. Find the .meta file (generated during compilation)
    // 2. Load exported symbols from it
    // 3. Return the module exports
    
    const metaPath = this.resolveMetaPath(modulePath);
    
    try {
      const metaContent = Deno.readTextFileSync(metaPath);
      const meta = JSON.parse(metaContent) as ModuleExports;
      this.moduleCache.set(modulePath, meta);
      return meta;
    } catch {
      // .meta file doesn't exist yet - module hasn't been compiled
      console.warn(`Module not compiled: ${modulePath} (${metaPath})`);
      return null;
    }
  }

  // Generate .meta file path from .tsn path
  resolveMetaPath(modulePath: string): string {
    // Resolve relative to base dir
    let resolved = modulePath;
    if (!modulePath.startsWith('/') && !modulePath.match(/^[A-Z]:/)) {
      resolved = `${this.baseDir}/${modulePath}`;
    }
    // Change .tsn extension to .meta
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
