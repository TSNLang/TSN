import { Program, Declaration, Statement, Expression, FunctionDecl, InterfaceDecl, VarDecl, Assignment, ReturnStmt, IfStmt, WhileStmt, ForStmt, ExprStmt, BreakStmt, ContinueStmt, BinaryExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr, Identifier, NumberLiteral, StringLiteral, BoolLiteral, NullLiteral, AddressofExpr, ASTKind, TypeAnnotation, ImportDecl, ExportDecl, EnumDecl, NamespaceDecl, Parameter, ClassDecl, ClassField, ClassMethod, NewExpr, ThisExpr, BlockStmt, ExpressionStmt } from './types.ts';
import { ModuleResolver, ExportedSymbol, ModuleExports } from './module-resolver.ts';

interface StructInfo {
  name: string;
  fields: { name: string; type: string }[];
}

interface GlobalInfo {
  name: string;
  type: string;
  isConst: boolean;
}

interface LoopContext {
  breakLabel: string;
  continueLabel: string;
}

interface FunctionInfo {
  name: string;
  returnType: string;
  paramTypes: string[];
  restParamIndex?: number;
  restElementType?: string;
}

interface VTableInfo {
  className: string;
  methodNames: string[]; // Danh sách tên phương thức theo thứ tự index
  mangledNames: string[]; // Danh sách tên đã mangled tương ứng
}

export class CodeGenerator {
  private output: string[] = [];
  private indent: number = 0;
  private tempCounter: number = 0;
  private labelCounter: number = 0;
  private stringCounter: number = 0;
  private readonly hostOS: string;
  private cleanupStack: Set<string>[] = [new Set()];
  private structs: Map<string, StructInfo & { base?: string }> = new Map();
  private classDecls: Map<string, ClassDecl> = new Map();
  private structDecls: Map<string, StructDecl> = new Map();
  private interfaceDecls: Map<string, InterfaceDecl> = new Map();
  private vTables: Map<string, VTableInfo> = new Map();
  private genericClasses: Map<string, ClassDecl> = new Map();
  private genericInterfaces: Map<string, InterfaceDecl> = new Map();
  private genericFunctions: Map<string, FunctionDecl> = new Map();
  private genericMethods: Map<string, { classDecl: ClassDecl; method: ClassMethod }> = new Map();
  private instantiatedNames: Set<string> = new Set();
  private globals: Map<string, GlobalInfo> = new Map();
  private functions: Map<string, FunctionInfo> = new Map();
  private typeAliases: Map<string, TypeAnnotation> = new Map();
  private enums: Map<string, Map<string, number>> = new Map();
  private unionDefinitions: Map<string, TypeAnnotation> = new Map();
  private scopeStack: string[] = [];
  private stringLiterals: Map<string, string> = new Map();
  private loopStack: LoopContext[] = [];
  private currentFunctionParams: Set<string> = new Set();
  private currentFunctionParamTypes: Map<string, string> = new Map();
  private currentFunctionReturnType: string = 'void';
  private currentClassName: string | null = null;
  private tempTypes: Map<string, string> = new Map();
  private moduleResolver: ModuleResolver;
  private hoistedVars: Set<string> = new Set();
  private localVarTypes: Map<string, string> = new Map();
  private movedLocals: Set<string> = new Set();
  private importedSymbols: Map<string, ExportedSymbol> = new Map();
  private importedModules: Map<string, ModuleExports> = new Map();
  private includedModulePaths: Set<string> = new Set();
  private externalDecls: string[] = [];
  private currentOutput: string[] | null = null;
  private globalBuffer: string[] = [];
  private instantiationTargetOutput: string[] | null = null;
  private exportedSymbols: ExportedSymbol[] = [];
  private isUnsafeContext: boolean = false;
  private lastExpressionWasUndefined: boolean = false;
  private isCurrentMain: boolean = false;

  constructor(moduleResolver?: ModuleResolver) {
    this.moduleResolver = moduleResolver ?? new ModuleResolver('.');
    this.hostOS = this.detectHostOS();
  }

  private detectHostOS(): string {
    if (process.env.TSN_TARGET_OS) return process.env.TSN_TARGET_OS;
    switch (process.platform) {
      case 'win32': return 'windows';
      case 'linux': return 'linux';
      case 'darwin': return 'macos';
      case 'android': return 'android';
      case 'freebsd':
      case 'openbsd':
      case 'netbsd':
      case 'dragonfly':
        return 'bsd';
      default:
        return process.platform;
    }
  }

  private isPosixHost(): boolean {
    return this.hostOS === 'linux' || this.hostOS === 'macos' || this.hostOS === 'bsd' || this.hostOS === 'android';
  }

  private isSingleTargetOSMatch(targetOS: string): boolean {
    if (targetOS === 'posix') return this.isPosixHost();
    return targetOS === this.hostOS;
  }

  public isTargetOSMatch(targetOS?: string[]): boolean {
    if (!targetOS || targetOS.length === 0) return true;
    return targetOS.some(os => this.isSingleTargetOSMatch(os));
  }

  private emitOwnedCleanupForValue(ptr: string, type: string): void {
    if (this.isClassType(type)) {
      const className = type.startsWith('%') ? type.substring(1) : type;
      const disposeName = `${className}.dispose`;
      const disposeInfo = this.functions.get(disposeName) || this.functions.get(this.resolveMangledName(disposeName));
      if (disposeInfo) {
        this.emit(`call void @${disposeInfo.name}(ptr ${ptr})`);
      }
    }
    this.ensureExternalDeclaration('memory_free', { name: 'memory_free', kind: 'function', llvmType: 'void', paramTypes: ['ptr'] } as any);
    this.emit(`call void @memory_free(ptr ${ptr})`);
  }

  private emitCleanup(): void {
    const currentScope = this.cleanupStack[this.cleanupStack.length - 1];
    if (currentScope.size === 0) return;
    for (const varName of currentScope) {
      const ptr = this.newTemp();
      const varType = this.localVarTypes.get(varName) || 'ptr';
      this.emit(`${ptr} = load ptr, ptr %${varName}, align 8`);
      this.emitOwnedCleanupForValue(ptr, varType);
    }
  }

  getExportedSymbols(): ExportedSymbol[] {
    return this.exportedSymbols;
  }

  generate(program: Program): string {
    this.output = []; this.tempCounter = 0; this.labelCounter = 0; this.stringCounter = 0;
    this.externalDecls = []; this.exportedSymbols = [];
    this.emittedVTables.clear();
    this.globalBuffer = []; this.currentOutput = null; this.instantiationTargetOutput = null;
    this.globalBuffer.push('@__tsn_argc = global i32 0, align 4');
    this.globalBuffer.push('@__tsn_argv = global ptr null, align 8');
    this.importedSymbols.clear(); this.importedModules.clear(); this.includedModulePaths.clear();


    // PRE-SCAN: Collect all signatures
    for (const decl of program.declarations) this.preScanDeclaration(decl);

    // Phase 2: Struct definitions
    for (const decl of program.declarations) this.generateStructsRecursive(decl);
    
    // Also generate structs for any classes registered via imports (like time.StopWatch)
    for (const [name, cls] of this.classDecls) {
        if (!this.structs.has(name)) {
            if (!cls.typeParameters || cls.typeParameters.length === 0) {
                this.generateClassStruct(cls, name);
            }
        }
    }

    // Phase 3: Global variables
    for (const decl of program.declarations) this.generateGlobalsRecursive(decl);

    // Phase 3.5: VTables
    for (const [className, vtable] of this.vTables) {
        this.generateVTable(vtable);
    }

    const stringLiteralMarkerIdx = this.output.length;
    this.emit('; String literals -- PLACEHOLDER');
    this.emit('');

    // Phase 4: Function definitions
    for (const decl of program.declarations) this.generateFunctionsRecursive(decl);

    // Phase 5: Collect exported symbols
    for (const decl of program.declarations) this.collectExportedSymbols(decl);

    // Finalize string literals
    const strLines: string[] = ['; String literals'];
    for (const [globalName, value] of this.stringLiterals) {
      const escaped = this.escapeString(value);
      const byteLen = new TextEncoder().encode(value).length + 1;
      strLines.push(`${globalName} = private unnamed_addr constant [${byteLen} x i8] c"${escaped}\\00", align 1`);
    }
    if (this.hostOS === 'windows' && !this.stringLiterals.has('@.str.console_newline')) {
      this.stringLiterals.set('@.str.console_newline', '\r\n');
      strLines.push(`@.str.console_newline = private unnamed_addr constant [3 x i8] c"\\0D\\0A\\00", align 1`);
    }
    this.output.splice(stringLiteralMarkerIdx, 2, ...strLines, '');

    if (this.externalDecls.length > 0) this.output.unshift(...this.externalDecls, '');
    if (this.globalBuffer.length > 0) this.output.unshift(...this.globalBuffer, '');
    return this.output.join('\n');
  }

  private preScanDeclaration(decl: Declaration): void {
    if (decl.kind === ASTKind.ImportDecl) this.processImport(decl as ImportDecl);
    else if (decl.kind === ASTKind.TypeAliasDecl) this.typeAliases.set((decl as TypeAliasDecl).name, (decl as TypeAliasDecl).type);
    else if (decl.kind === ASTKind.VarDecl) {
        const v = decl as VarDecl;
        const mName = this.scopeStack.length > 0 ? this.scopeStack.join('_') + '_' + v.name : v.name;
        this.globals.set(v.name, { name: mName, type: this.getLLVMType(v.type || { name: 'i32' } as any), isConst: v.isConst });
    }
    else if (decl.kind === ASTKind.EnumDecl) this.processEnum(decl as EnumDecl);
    else if (decl.kind === ASTKind.InterfaceDecl) {
      const i = decl as InterfaceDecl;
      if (i.typeParameters && i.typeParameters.length > 0) {
        this.genericInterfaces.set(i.name, i);
        return;
      }
      this.interfaceDecls.set(i.name, i);
      this.buildInterfaceVTable(i);
    }
    else if (decl.kind === ASTKind.NamespaceDecl) {
      const ns = decl as NamespaceDecl; this.scopeStack.push(ns.name);
      for (const sub of ns.body) this.preScanDeclaration(sub);
      this.scopeStack.pop();
    } else if (decl.kind === ASTKind.ClassDecl) {
      const c = decl as ClassDecl;
      if (c.typeParameters && c.typeParameters.length > 0) {
        this.genericClasses.set(c.name, c);
        return;
      }
      this.classDecls.set(c.name, c);
      this.buildVTable(c); // Xây dựng VTable
      this.scopeStack.push(c.name);
      if (c.constructorDecl) {
      const ctorName = `${c.name}.constructor`;
      const mName = this.mangleName('constructor', c.constructorDecl.params);
      const pts = ['ptr', ...c.constructorDecl.params.map(p => this.getFunctionParamStorageType(p))];
      this.functions.set(mName, { name: mName, returnType: 'void', paramTypes: pts });
      this.functions.set(ctorName, { name: mName, returnType: 'void', paramTypes: pts });
    }
      for (const m of c.methods) {
        // Store generic methods for later instantiation
        if (m.typeParameters && m.typeParameters.length > 0) {
          const key = `${c.name}.${m.name}`;
          this.genericMethods.set(key, { classDecl: c, method: m });
          continue;
        }
        const mName = this.mangleName(m.name, m.params);
        const rt = this.getFunctionReturnRuntimeType(m.returnType);
        const pts = ['ptr', ...m.params.map(p => this.getFunctionParamStorageType(p))];
        this.functions.set(mName, { name: mName, returnType: rt, paramTypes: pts });
        this.functions.set(this.scopeStack.join('.') + '.' + m.name, { name: mName, returnType: rt, paramTypes: pts });
      }
      this.scopeStack.pop();
    } else if (decl.kind === ASTKind.StructDecl) {
      const s = decl as StructDecl;
      if (s.typeParameters && s.typeParameters.length > 0) {
          // Struct generics handled similarly if needed
          return;
      }
      this.structDecls.set(s.name, s);
    } else if (decl.kind === ASTKind.FunctionDecl) {
      const fn = decl as FunctionDecl;
      if (!this.isTargetOSMatch(fn.targetOS)) return;
      if (fn.typeParameters && fn.typeParameters.length > 0) {
        this.genericFunctions.set(fn.name, fn);
        return;
      }
      const mName = this.mangleName(fn.name, fn.params, !!fn.ffiLib || fn.isDeclare);
      const rt = this.getFunctionReturnRuntimeType(fn.returnType);
      const restParamIndex = fn.params.findIndex(p => !!p.isRest);
      const pts = fn.params.map(p => this.getFunctionParamStorageType(p));
      const restElementType = restParamIndex !== -1 ? this.getRestArrayClassName(fn.params[restParamIndex].type) : undefined;
      this.functions.set(mName, { name: mName, returnType: rt, paramTypes: pts, restParamIndex: restParamIndex !== -1 ? restParamIndex : undefined, restElementType, isExternal: !!fn.ffiLib || fn.isDeclare } as any);
      const scopedName = this.scopeStack.length > 0 ? this.scopeStack.join('.') + '.' + fn.name : fn.name;
      this.functions.set(scopedName, { name: mName, returnType: rt, paramTypes: pts, restParamIndex: restParamIndex !== -1 ? restParamIndex : undefined, restElementType, isExternal: !!fn.ffiLib || fn.isDeclare } as any);
    } else if (decl.kind === ASTKind.ExportDecl) this.preScanDeclaration((decl as ExportDecl).declaration);
  }

  private generateStructsRecursive(decl: Declaration): void {
    if (decl.kind === ASTKind.InterfaceDecl) this.generateInterface(decl as InterfaceDecl);
    else if (decl.kind === ASTKind.StructDecl) this.generateStruct(decl as StructDecl);
    else if (decl.kind === ASTKind.ClassDecl) {
      const c = decl as ClassDecl;
      if (!c.typeParameters || c.typeParameters.length === 0) this.generateClassStruct(c);
    }
    else if (decl.kind === ASTKind.NamespaceDecl) { for (const sub of (decl as NamespaceDecl).body) this.generateStructsRecursive(sub); }
    else if (decl.kind === ASTKind.ExportDecl) this.generateStructsRecursive((decl as ExportDecl).declaration);
  }

  private generateStruct(decl: StructDecl): void {
    const fields: { name: string; type: string }[] = [];
    
    // Flatten inherited fields
    if (decl.baseStructName) {
      const base = this.structDecls.get(decl.baseStructName);
      if (base) {
        for (const f of base.fields) {
          const t = this.getLLVMType(f.type);
          fields.push({ name: f.name, type: t });
        }
      }
    }

    for (const f of decl.fields) { const t = this.getLLVMType(f.type); fields.push({ name: f.name, type: t }); }
    this.structs.set(decl.name, { name: decl.name, fields, base: decl.baseStructName });
    const llvm = fields.map(f => f.type);
    this.emit(`%${decl.name} = type { ${llvm.join(', ')} }`);
  }

  private generateGlobalsRecursive(decl: Declaration): void {
    if (decl.kind === ASTKind.VarDecl) {
        this.generateGlobalConst(decl as VarDecl);
    }
    else if (decl.kind === ASTKind.NamespaceDecl) {
      this.scopeStack.push((decl as NamespaceDecl).name);
      for (const sub of (decl as NamespaceDecl).body) this.generateGlobalsRecursive(sub);
      this.scopeStack.pop();
    } else if (decl.kind === ASTKind.ExportDecl) {
        this.generateGlobalsRecursive((decl as ExportDecl).declaration);
    }
  }

  private generateFunctionsRecursive(decl: Declaration): void {
    if (decl.kind === ASTKind.FunctionDecl) this.generateFunction(decl as FunctionDecl);
    else if (decl.kind === ASTKind.ClassDecl) {
      const c = decl as ClassDecl;
      if (!c.typeParameters || c.typeParameters.length === 0) this.generateClassMethods(c);
    }
    else if (decl.kind === ASTKind.NamespaceDecl) {
      this.scopeStack.push((decl as NamespaceDecl).name);
      for (const sub of (decl as NamespaceDecl).body) this.generateFunctionsRecursive(sub);
      this.scopeStack.pop();
    } else if (decl.kind === ASTKind.ExportDecl) this.generateFunctionsRecursive((decl as ExportDecl).declaration);
  }

  private collectExportedSymbols(decl: Declaration): void {
    if (decl.kind === ASTKind.ExportDecl) {
      const exportDecl = decl as ExportDecl;
      const innerDecl = exportDecl.declaration;
      
      if (innerDecl.kind === ASTKind.FunctionDecl) {
        const fn = innerDecl as FunctionDecl;
        this.exportedSymbols.push({
          name: fn.name,
          kind: 'function',
          ast: fn
        });
      } else if (innerDecl.kind === ASTKind.ClassDecl) {
        const cls = innerDecl as ClassDecl;
        this.exportedSymbols.push({
          name: cls.name,
          kind: 'class',
          ast: cls
        });
      }
    } else if (decl.kind === ASTKind.NamespaceDecl) {
      const ns = decl as NamespaceDecl;
      for (const sub of ns.body) {
        this.collectExportedSymbols(sub);
      }
    }
  }

  private generateClassStruct(c: ClassDecl, customName?: string): void {
    const className = customName || c.name;
    if (this.structs.has(className)) return;
    
    const fields: { name: string; type: string }[] = [];
    const llvmFields: string[] = ['i32', 'ptr']; // index 0: _refCount, index 1: _vtable
    fields.push({ name: '_refCount', type: 'i32' });
    fields.push({ name: '_vtable', type: 'ptr' });

    // Flatten inherited fields
    if (c.baseClassName) {
        const base = this.classDecls.get(c.baseClassName);
        if (base) {
            // Note: We skip the _refCount and _vtable of the base class
            const baseFields = this.getRecursiveClassFields(c.baseClassName);
            for (const f of baseFields) {
                if (f.name === '_refCount' || f.name === '_vtable') continue;
                fields.push(f);
                llvmFields.push(f.type);
            }
        }
    }

    for (const f of c.fields) {
      const t = this.getLLVMType(f.type);
      fields.push({ name: f.name, type: t }); 
      llvmFields.push(this.toLLVMType(t)); // Ensure we use 'ptr' for pointers
    }
    this.structs.set(className, { name: className, fields, base: c.baseClassName });
    this.emit(`%${className} = type { ${llvmFields.join(', ')} }`);
  }

  private getRecursiveClassFields(className: string): { name: string; type: string }[] {
      const decl = this.classDecls.get(className);
      if (!decl) return [];
      const fields: { name: string; type: string }[] = [];
      if (decl.baseClassName) {
          fields.push(...this.getRecursiveClassFields(decl.baseClassName).filter(f => f.name !== '_refCount' && f.name !== '_vtable'));
      }
      for (const f of decl.fields) {
          fields.push({ name: f.name, type: this.getLLVMType(f.type) });
      }
      return fields;
  }

  private generateClassMethods(c: ClassDecl): void {
    const oldScope = this.scopeStack;
    const oldName = this.currentClassName;
    this.scopeStack = [c.name]; this.currentClassName = c.name;
    if (c.constructorDecl) {
      const fn = { 
        name: 'constructor', 
        params: c.constructorDecl.params, 
        returnType: { name: 'void', isPointer: false, isArray: false }, 
        body: c.constructorDecl.body, 
        isDeclare: false, 
        isUnsafe: !!c.constructorDecl.isUnsafe,
        kind: ASTKind.FunctionDecl 
      } as any;
      this.generateFunction(fn, true);
    }
    for (const m of c.methods) {
      // Skip generic methods - they'll be instantiated on demand
      if (m.typeParameters && m.typeParameters.length > 0) {
        continue;
      }
      const fn = { 
        kind: ASTKind.FunctionDecl,
        name: m.name, 
        params: m.params, 
        returnType: m.returnType, 
        body: m.body, 
        isUnsafe: !!m.isUnsafe,
        isDeclare: false 
      } as any;
      this.generateFunction(fn, true);
    }
    this.currentClassName = oldName; this.scopeStack = oldScope;
  }

  private processImport(decl: ImportDecl): void {
    const exports = this.moduleResolver.resolveModule(decl.source);
    if (!exports) return;
    
    this.importedModules.set(decl.source, exports);
    const imported = this.moduleResolver.getImportedSymbols(decl, exports);
    
    for (const [name, sym] of imported) {
        this.importedSymbols.set(name, sym);
        if (sym.kind === 'class' && sym.ast) {
            const cls = sym.ast as ClassDecl;
            
            // Only add to genericClasses if it has type parameters
            if (cls.typeParameters && cls.typeParameters.length > 0) {
                this.genericClasses.set(name, cls);
            } else {
                this.classDecls.set(name, cls);
                this.buildVTable(cls, name); // Build namespaced VTable
            }
            
            // Register methods and constructor for the imported class name
            // e.g. if name is "time.StopWatch", register "time.StopWatch.elapsed"
            if (cls.constructorDecl && (!cls.typeParameters || cls.typeParameters.length === 0)) {
                const ctorName = `${name}.constructor`;
                this.scopeStack.push(cls.name);
                const mName = this.mangleName('constructor', cls.constructorDecl.params);
                this.scopeStack.pop();
                const pts = ['ptr', ...cls.constructorDecl.params.map(p => this.getFunctionParamStorageType(p))];
                this.functions.set(ctorName, { name: mName, returnType: 'void', paramTypes: pts });
            }
            if (!cls.typeParameters || cls.typeParameters.length === 0) {
                for (const m of cls.methods) {
                    this.scopeStack.push(cls.name);
                    const mName = this.mangleName(m.name, m.params);
                    this.scopeStack.pop();
                    
                    const rt = this.getFunctionReturnRuntimeType(m.returnType);
                    const pts = ['ptr', ...m.params.map(p => this.getFunctionParamStorageType(p))];
                    this.functions.set(`${name}.${m.name}`, { name: mName, returnType: rt, paramTypes: pts });
                }
            }
        } else if (sym.kind === 'enum' && sym.ast) {
            this.processEnum(sym.ast as EnumDecl);
        } else if (sym.kind === 'function' && sym.ast) {
            const fn = sym.ast as FunctionDecl;
            
            // Auto-import generic classes used in return type
            if (fn.returnType && fn.returnType.name && fn.returnType.genericArgs) {
                const returnClassName = fn.returnType.name;
                if (!this.genericClasses.has(returnClassName)) {
                    // Find the class in exports.symbols
                    const classSymbol = exports.symbols.find(s => s.kind === 'class' && s.name === returnClassName);
                    if (classSymbol && classSymbol.ast) {
                        const cls = classSymbol.ast as ClassDecl;
                        if (cls.typeParameters && cls.typeParameters.length > 0) {
                            this.genericClasses.set(returnClassName, cls);
                        }
                    }
                }
            }
            
            if (fn.typeParameters && fn.typeParameters.length > 0) {
                this.genericFunctions.set(name, fn);
            } else {
                const mName = this.mangleName(fn.name, fn.params, !!fn.ffiLib || fn.isDeclare);
                const rt = this.getLLVMType(fn.returnType);
                const restParamIndex = fn.params.findIndex(p => !!p.isRest);
                const pts = fn.params.map(p => this.getFunctionParamStorageType(p));
                const restElementType = restParamIndex !== -1 ? this.getRestArrayClassName(fn.params[restParamIndex].type) : undefined;
                const isExternal = !!fn.ffiLib || fn.isDeclare;
                this.functions.set(name, { name: mName, returnType: this.getFunctionReturnRuntimeType(fn.returnType), paramTypes: pts, restParamIndex: restParamIndex !== -1 ? restParamIndex : undefined, restElementType, isExternal } as any);
                this.functions.set(fn.name, { name: mName, returnType: this.getFunctionReturnRuntimeType(fn.returnType), paramTypes: pts, restParamIndex: restParamIndex !== -1 ? restParamIndex : undefined, restElementType, isExternal } as any);
            }
        }
    }
  }

  private processEnum(decl: EnumDecl): void {
    const m = new Map<string, number>(); let last = -1;
    for (const member of decl.members) { last = (member.value !== undefined) ? member.value : last + 1; m.set(member.name, last); }
    this.enums.set(decl.name, m);
  }

  private mangleName(name: string, params: Parameter[], isExternal: boolean = false): string {
    if (isExternal) return name;
    if (this.scopeStack.length === 0 && params.length === 0 && name === 'main') return 'main';
    let res = '_T';
    for (const s of this.scopeStack) res += `${s.length}${s}`;
    res += `${name.length}${name}E`;
    if (params.length > 0) {
      res += '_';
      for (const p of params) res += this.getFunctionParamRuntimeType(p).replace(/ptr/g, 'p').replace(/\[|\]|<|>|%| /g, '');
    }
    return res;
  }

  private resolveMangledName(name: string): string {
    if (this.functions.has(name)) return this.functions.get(name)!.name;
    
    // Inheritance resolution for methods
    if (name.includes('.')) {
        const [className, methodName] = name.split('.');
        let currentClass = this.classDecls.get(className);
        while (currentClass && currentClass.baseClassName) {
            const baseName = `${currentClass.baseClassName}.${methodName}`;
            if (this.functions.has(baseName)) return this.functions.get(baseName)!.name;
            currentClass = this.classDecls.get(currentClass.baseClassName);
        }
    }

    let current = [...this.scopeStack];
    while (true) {
      const attempt = (current.length > 0 ? current.join('.') + '.' : '') + name;
      if (this.functions.has(attempt)) return this.functions.get(attempt)!.name;
      if (current.length === 0) break;
      current.pop();
    }
    return name;
  }

  private ensureExternalDeclaration(mangled: string, sym: ExportedSymbol): void {
    if (this.functions.has(mangled) && !(this.functions.get(mangled) as any).isExternal) return; // Don't declare if we defined it here

    if (sym.kind === 'function') {
      const params = (sym.paramTypes || []).map(p => this.toLLVMType(p)).join(', ');
      const rt = this.toLLVMType(sym.llvmType || 'void');
      const declLine = `declare ${rt} @${mangled}(${params})`;
      if (this.externalDecls.includes(declLine)) return;
      this.externalDecls.push(declLine);
    }
  }

  private ensureGenericArrayAvailable(): void {
    if (this.genericClasses.has('Array')) return;
    const arrayModule = this.moduleResolver.resolveModule('std:array');
    if (arrayModule?.program) {
      for (const decl of arrayModule.program.declarations) {
        if (decl.kind === ASTKind.ImportDecl) this.processImport(decl as ImportDecl);
      }
    }
    const arrayClass = arrayModule?.symbols.find(sym => sym.kind === 'class' && sym.name === 'Array');
    if (arrayClass?.ast) {
      const cls = arrayClass.ast as ClassDecl;
      this.genericClasses.set('Array', cls);
      this.classDecls.set('Array', cls);
      this.buildVTable(cls, 'Array');
    }
  }

  private getRestArrayClassName(t: TypeAnnotation): string {
    this.ensureGenericArrayAvailable();
    const elementType = this.getLLVMTypeByName(t.name);
    const className = `Array_${elementType}`;
    if (!this.classDecls.has(className) && this.genericClasses.has('Array')) {
      this.instantiateClass('Array', [{ name: elementType, isPointer: false, isArray: false }]);
    }
    return className;
  }

  private getFunctionParamRuntimeType(p: Parameter): string {
    if (p.isRest) return `%${this.getRestArrayClassName(p.type)}`;
    return p.type.name === 'string' ? 'string' : this.getLLVMType(p.type);
  }

  private getFunctionReturnRuntimeType(t: TypeAnnotation): string {
    const resolvedName = this.resolveTypeName(t);
    if (resolvedName === 'string') return 'string';
    if (resolvedName === 'fn') return 'ptr';

    const llvmType = this.getLLVMType(t);
    if (llvmType === 'ptr' && (this.classDecls.has(resolvedName) || this.interfaceDecls.has(resolvedName))) {
      return `%${resolvedName}`;
    }

    return llvmType;
  }

  private getFunctionParamStorageType(p: Parameter): string {
    if (p.isRest) return 'ptr';
    return this.getFunctionParamRuntimeType(p);
  }

  private generateGlobalConst(decl: VarDecl): void {
    const t = decl.type ? this.getLLVMType(decl.type) : 'i32';
    const mName = this.scopeStack.length > 0 ? this.scopeStack.join('_') + '_' + decl.name : decl.name;
    const isPointerLike = !!decl.type && (decl.type.isPointer || decl.type.isRawPointer || decl.type.name === 'string' || decl.type.name === 'ptr' || t === 'ptr');
    
    if (decl.type?.isArray) {
      const size = decl.type.arraySize || 0, et = this.getLLVMType({ name: decl.type.name, isPointer: false, isArray: false });
      this.globals.set(decl.name, { name: mName, type: `[${size} x ${et}]`, isConst: decl.isConst });
      this.emit(`@${mName} = ${decl.isConst ? 'constant' : 'global'} [${size} x ${et}] zeroinitializer, align 4`);
    } else if (isPointerLike && (!decl.init || (decl.init.kind === ASTKind.NumberLiteral && (decl.init as NumberLiteral).value === 0))) {
      this.globals.set(decl.name, { name: mName, type: t, isConst: decl.isConst });
      this.emit(`@${mName} = ${decl.isConst ? 'constant' : 'global'} ${this.toLLVMType(t)} null, align 8`);
    } else {
      const val = (decl.init?.kind === ASTKind.NumberLiteral) ? (decl.init as NumberLiteral).value : 0;
      this.globals.set(decl.name, { name: mName, type: t, isConst: decl.isConst });
      this.emit(`@${mName} = ${decl.isConst ? 'constant' : 'global'} ${this.toLLVMType(t)} ${val}, align 4`);
    }
  }

  private generateInterface(decl: InterfaceDecl): void {
    const fields: { name: string; type: string }[] = [], llvm: string[] = [];
    for (const f of decl.fields) { const t = this.getLLVMType(f.type); fields.push({ name: f.name, type: t }); llvm.push(t); }
    this.structs.set(decl.name, { name: decl.name, fields });
    this.emit(`%${decl.name} = type { ${llvm.join(', ')} }`);
  }

  private generateFunction(decl: FunctionDecl, isMethod: boolean = false): void {
    if (!this.isTargetOSMatch(decl.targetOS)) return;

    const mName = this.mangleName(decl.name, decl.params, !!decl.ffiLib || decl.isDeclare);
    const rt = this.getLLVMType(decl.returnType);
    let paramsStr = decl.params.map(p => `${this.toLLVMType(this.getFunctionParamStorageType(p))} %${p.name}`).join(', ');
    if (isMethod) paramsStr = `ptr %this${paramsStr ? ', ' + paramsStr : ''}`;

    if (decl.isDeclare || decl.ffiLib) {
      this.ensureExternalDeclaration(mName, {
        name: decl.name,
        kind: 'function',
        llvmType: rt,
        paramTypes: decl.params.map(p => this.getFunctionParamStorageType(p)),
      } as any);
      return;
    }

    const oldRet = this.currentFunctionReturnType, oldParams = this.currentFunctionParams, oldParamTypes = this.currentFunctionParamTypes;
    const oldHoisted = this.hoistedVars, oldLocalVarTypes = this.localVarTypes, oldMovedLocals = this.movedLocals;
    const oldUnsafe = this.isUnsafeContext, oldClassName = this.currentClassName, oldIsMain = this.isCurrentMain;
    this.isUnsafeContext = !!decl.isUnsafe;
    this.isCurrentMain = decl.name === 'main' && this.scopeStack.length === 0;

    this.currentFunctionParams = new Set();
    this.currentFunctionParamTypes = new Map();
    this.currentFunctionReturnType = rt;
    this.hoistedVars = new Set();
    this.localVarTypes = new Map();
    this.movedLocals = new Set();
    this.cleanupStack.push(new Set());
    this.scopeStack.push(decl.name);

    if (isMethod) { 
        this.currentFunctionParams.add('this'); 
        this.currentFunctionParamTypes.set('this', `%${this.currentClassName}`); 
    }
    for (const p of decl.params) { 
      this.currentFunctionParams.add(p.name); 
      const pt = this.getFunctionParamRuntimeType(p);
      this.currentFunctionParamTypes.set(p.name, pt); 
    }

    const llvmRt = this.isCurrentMain ? 'i32' : this.toLLVMType(rt);
    const finalParamsStr = this.isCurrentMain ? 'i32 %argc, ptr %argv' : paramsStr;
    this.emit(`define ${llvmRt} @${mName}(${finalParamsStr}) {`);
    this.emit('entry:'); this.indent++;

    if (this.isCurrentMain) {
      this.emit(`store i32 %argc, ptr @__tsn_argc, align 4`);
      this.emit(`store ptr %argv, ptr @__tsn_argv, align 8`);
    }

    if (isMethod) {
      this.emit(`%this.addr = alloca ptr, align 8`);
      this.emit(`store ptr %this, ptr %this.addr, align 8`);
    }
    for (const p of decl.params) {
      const t = this.getFunctionParamStorageType(p);
      this.emit(`%${p.name}.addr = alloca ${this.toLLVMType(t)}, align ${this.getAlignment(t)}`);
      this.emit(`store ${this.toLLVMType(t)} %${p.name}, ptr %${p.name}.addr, align ${this.getAlignment(t)}`);
    }

    const localVars = this.collectVarDecls(decl.body);
    const seen = new Set<string>();
    for (const { name, llvmType } of localVars) {
      if (!seen.has(name)) {
        seen.add(name);
        const isClass = this.isClassType(llvmType);
        const isManaged = llvmType.startsWith('ptr<');
        const isRaw = llvmType.startsWith('rawPtr<');
        const isString = llvmType === 'string';
        const isOwningManaged = isManaged && !llvmType.startsWith('ptr<void>');
        const allocaType = (isClass || isManaged || isRaw || isString) ? 'ptr' : llvmType;
        this.emit(`%${name} = alloca ${this.toLLVMType(allocaType)}, align ${this.getAlignment(allocaType)}`);
        if (isClass || isOwningManaged) { 
            this.emit(`store ptr null, ptr %${name}, align 8`);
            this.cleanupStack[this.cleanupStack.length - 1].add(name);
        }
        if (isRaw && !this.isUnsafeContext) {
           throw new Error(`Usage of rawPtr<T> requires @unsafe decorator on function`);
        }
        this.hoistedVars.add(name); this.localVarTypes.set(name, llvmType);
      }
    }

    for (const s of decl.body) this.generateStatement(s);

    if (decl.body.length === 0 || decl.body[decl.body.length - 1].kind !== ASTKind.ReturnStmt) {
      this.emitCleanup();
      if (this.isCurrentMain) this.emit('ret i32 0');
      else if (rt === 'void') this.emit('ret void');
      else this.emit(`ret ${rt} 0`);
    }
    this.isCurrentMain = oldIsMain;
    this.cleanupStack.pop();
    this.currentFunctionReturnType = oldRet;
    this.currentFunctionParams = oldParams;
    this.currentFunctionParamTypes = oldParamTypes;
    this.hoistedVars = oldHoisted;
    this.localVarTypes = oldLocalVarTypes;
    this.movedLocals = oldMovedLocals;
    this.isUnsafeContext = oldUnsafe;
    this.currentClassName = oldClassName;
    this.scopeStack.pop();
    this.indent--;
    this.emit('}\n');
  }

  private collectVarDecls(stmts: Statement[]): { name: string; llvmType: string }[] {
    const vars: { name: string; llvmType: string }[] = [];
    for (const s of stmts) this.collectVarDeclsFromStmt(s, vars);
    return vars;
  }

  private inferExprType(e: Expression): string {
      if (e.kind === ASTKind.Identifier) {
          const id = (e as Identifier).name;
          const localType = this.localVarTypes.get(id);
          if (localType) return localType;
          if (this.currentFunctionParams.has(id)) return this.currentFunctionParamTypes.get(id)!;
          const global = this.globals.get(id);
          if (global) return global.type;
          const imported = this.importedSymbols.get(id);
          if (imported) {
              if (imported.kind === 'class' || imported.kind === 'interface') return `%${imported.name}`;
              if (imported.kind === 'const' || imported.kind === 'let') return imported.varType || 'i32';
              if (imported.kind === 'enum') return imported.name;
          }
          return 'i32';
      }
      if (e.kind === ASTKind.ThisExpr) return `%${this.currentClassName}`;
      if (e.kind === ASTKind.ArrayLiteralExpr) {
          const arr = e as ArrayLiteralExpr;
          let tsnType = 'i32';
          if (arr.elements.length > 0) {
              const first = arr.elements[0];
              if (first.kind === ASTKind.SpreadElementExpr) {
                  const iterType = this.inferExprType((first as SpreadElementExpr).expr);
                  const className = iterType.startsWith('%') ? iterType.substring(1) : iterType;
                  const cDecl = this.classDecls.get(className);
                  if (cDecl) {
                      const nextMethod = cDecl.methods.find(m => m.name === 'next');
                      if (nextMethod && nextMethod.returnType.name.startsWith('Optional')) {
                          if (nextMethod.returnType.genericArgs && nextMethod.returnType.genericArgs.length > 0) {
                              tsnType = nextMethod.returnType.genericArgs[0].name;
                          } else if (nextMethod.returnType.name.includes('_')) {
                              tsnType = nextMethod.returnType.name.split('_')[1];
                          }
                      }
                  }
              } else {
                  const llvmT = this.inferExprType(first);
                  if (llvmT === 'ptr') tsnType = 'string';
                  else if (llvmT.startsWith('%')) tsnType = llvmT.substring(1);
                  else tsnType = llvmT;
              }
          }
          return `%Array_${tsnType}`;
      }
      if (e.kind === ASTKind.CallExpr) {
          const ce = e as CallExpr;
          if (ce.callee.kind === ASTKind.Identifier) {
              let name = (ce.callee as Identifier).name;
              if (ce.genericArgs && ce.genericArgs.length > 0) {
                  name = this.instantiateFunction(name, ce.genericArgs);
              }
              const info = this.functions.get(this.resolveMangledName(name)) || this.functions.get(name);
              return info ? info.returnType : 'i32';
          }
          if (ce.callee.kind === ASTKind.MemberExpr) {
              const m = ce.callee as MemberExpr;

              if (m.object.kind === ASTKind.Identifier) {
                  const id = (m.object as Identifier).name;
                  const fullName = `${id}.${m.member}`;
                  const imported = this.importedSymbols.get(fullName);
                  if (imported && imported.kind === 'function') {
                      if (ce.genericArgs && ce.genericArgs.length > 0 && imported.ast) {
                          const instName = this.instantiateFunction(fullName, ce.genericArgs);
                          const info = this.functions.get(instName);
                          if (info) return info.returnType;
                      }
                      return imported.llvmType || 'i32';
                  }
                  if (this.functions.has(fullName)) {
                      let lookupName = fullName;
                      if (ce.genericArgs && ce.genericArgs.length > 0) {
                          lookupName = this.instantiateFunction(fullName, ce.genericArgs);
                      }
                      const info = this.functions.get(lookupName) || this.functions.get(this.resolveMangledName(lookupName));
                      if (info) return info.returnType;
                  }
              }

              let objType = this.inferExprType(m.object);
              if (objType && this.isClassType(objType)) {
                  const className = objType.startsWith('%') ? objType.substring(1) : objType;
                  const dotName = `${className}.${m.member}`;

                  if (ce.genericArgs && ce.genericArgs.length > 0 && this.genericMethods.has(dotName)) {
                      const instName = this.instantiateMethod(className, m.member, ce.genericArgs);
                      const info = this.functions.get(instName);
                      if (info) return info.returnType;
                  }

                  const info = this.functions.get(dotName) || this.functions.get(this.resolveMangledName(dotName));
                  if (info) return info.returnType;

                  const cls = this.classDecls.get(className);
                  if (cls) {
                      const method = cls.methods.find(x => x.name === m.member);
                      if (method) return this.getLLVMType(method.returnType);
                  }
              }
          }
      }
      if (e.kind === ASTKind.StringLiteral) return 'string';
      if (e.kind === ASTKind.MemberExpr) {
          const me = e as MemberExpr;
          const objectType = this.inferExprType(me.object);

          if (objectType === 'string') {
              if (me.member === 'length' || me.member === 'byteLength') return 'i32';
              return 'string';
          }

          const className = objectType.startsWith('%') ? objectType.substring(1) : objectType;
          const structInfo = this.structs.get(className);
          if (structInfo) {
              const field = structInfo.fields.find(f => f.name === me.member);
              if (field) return field.type;
          }

          const classDecl = this.classDecls.get(className);
          if (classDecl) {
              const fieldDecl = classDecl.fields.find(f => f.name === me.member);
              if (fieldDecl) return this.getLLVMType(fieldDecl.type);
          }
      }
      if (e.kind === ASTKind.NewExpr) {
          const ne = e as NewExpr;
          if (ne.genericArgs && ne.genericArgs.length > 0) return `%${this.instantiateClass(ne.className, ne.genericArgs)}`;
          return `%${ne.className}`;
      }
      if (e.kind === ASTKind.BinaryExpr) {
          const be = e as BinaryExpr;
          const leftType = this.inferExprType(be.left);
          const rightType = this.inferExprType(be.right);

          if (be.operator === '+' && (leftType === 'string' || rightType === 'string')) {
              return 'string';
          }

          if (['==', '!=', '<', '<=', '>', '>=', '&&', '||'].includes(be.operator)) {
              return 'i1';
          }

          if (leftType === rightType) {
              return leftType;
          }
      }
      return 'i32';
  }

  private collectVarDeclsFromStmt(s: Statement, out: { name: string; llvmType: string }[]): void {
    switch (s.kind) {
      case ASTKind.VarDecl: {
        const v = s as VarDecl;
        let lt = 'i32';
        if (v.type) {
            lt = this.getLLVMType(v.type);
        } else if (v.init) {
            lt = this.inferExprType(v.init);
        }
        
        out.push({ name: v.name, llvmType: lt });
        this.localVarTypes.set(v.name, lt);
        break;
      }
      case ASTKind.IfStmt: { const i = s as IfStmt; for (const c of i.thenBranch) this.collectVarDeclsFromStmt(c, out); if (i.elseBranch) for (const c of i.elseBranch) this.collectVarDeclsFromStmt(c, out); break; }
      case ASTKind.WhileStmt: for (const c of (s as WhileStmt).body) this.collectVarDeclsFromStmt(c, out); break;
      case ASTKind.ForStmt: { const f = s as ForStmt; if (f.init) this.collectVarDeclsFromStmt(f.init, out); for (const c of f.body) this.collectVarDeclsFromStmt(c, out); break; }
    }
  }

  private generateStatement(s: Statement): void {
    switch (s.kind) {
      case ASTKind.VarDecl: this.generateVarDecl(s as VarDecl); break;
      case ASTKind.Assignment: this.generateAssignment(s as Assignment); break;
      case ASTKind.ReturnStmt: this.generateReturn(s as ReturnStmt); break;
      case ASTKind.IfStmt: this.generateIf(s as IfStmt); break;
      case ASTKind.WhileStmt: this.generateWhile(s as WhileStmt); break;
      case ASTKind.ForStmt: this.generateFor(s as ForStmt); break;
      case ASTKind.BreakStmt: this.generateBreak(); break;
      case ASTKind.ContinueStmt: this.generateContinue(); break;
      case ASTKind.ExprStmt: this.generateExpression((s as ExprStmt).expr); break;
    }
  }

  private toLLVMType(t: string): string {
    if (this.isPointerType(t) || this.isClassType(t)) return 'ptr';
    if (t.startsWith('%') && this.interfaceDecls.has(t.substring(1))) return 'ptr';
    return t;
  }

  private generateVarDecl(s: VarDecl): void {
    let t = this.localVarTypes.get(s.name) || (s.type ? this.getLLVMType(s.type) : 'i32');
    
    const isClass = this.isClassType(t);
    const isManaged = t.startsWith('ptr<');
    const isRaw = t.startsWith('rawPtr<');
    const isString = t === 'string';
    const isOwningManaged = isManaged && !t.startsWith('ptr<void>');
    const allocaType = (isClass || isManaged || isRaw || isString) ? 'ptr' : t;

    if (!this.hoistedVars.has(s.name)) {
        this.emit(`%${s.name} = alloca ${this.toLLVMType(allocaType)}, align ${this.getAlignment(allocaType)}`);
        if (isOwningManaged || isClass) {
            this.emit(`store ptr null, ptr %${s.name}, align 8`);
            this.cleanupStack[this.cleanupStack.length - 1].add(s.name);
        }
        this.hoistedVars.add(s.name);
        this.localVarTypes.set(s.name, t);
    }
    
    if (!s.init && this.isStructType(t)) {
        const stName = t.startsWith('%') ? t.substring(1) : t;
        const structInfo = this.structs.get(stName)!;
        const size = structInfo.fields.length * 8;
        this.emit(`call void @llvm.memset.p0.i64(ptr %${s.name}, i8 0, i64 ${size}, i1 false)`);
        this.ensureExternalDeclaration('llvm.memset.p0.i64', { name: 'memset', kind: 'function', llvmType: 'void', paramTypes: ['ptr', 'i8', 'i64', 'i1'] } as any);
    }

    if (s.init) {
      if (t.startsWith('[')) return;
      const val = this.generateExpression(s.init);
      const vt = this.getValueType(val);
      
      const coerced = this.coerceToType(val, vt, allocaType);
      this.emit(`store ${this.toLLVMType(allocaType)} ${coerced}, ptr %${s.name}, align ${this.getAlignment(allocaType)}`);
      if (isOwningManaged || isClass) {
        this.movedLocals.delete(s.name);
      }
      if ((isOwningManaged || isClass) && s.init.kind === ASTKind.Identifier) {
        const srcId = (s.init as Identifier).name;
        const srcType = this.localVarTypes.get(srcId);
        if (srcType && srcType === t) {
          this.emit(`store ptr null, ptr %${srcId}, align 8`);
          this.movedLocals.add(srcId);
        }
      }
    } else if (s.type && s.type.isUnion) {
        const undefinedIndex = s.type.unionTypes?.findIndex(ut => ut.name === 'undefined') ?? -1;
        if (undefinedIndex !== -1) {
            const undefinedVal = this.coerceToType('0', 'undefined', t);
            this.emit(`store ${this.toLLVMType(allocaType)} ${undefinedVal}, ptr %${s.name}, align 8`);
        }
    }
  }

  private generateAssignment(s: Assignment): void {
    const val = this.generateExpression(s.value);
    const vt = this.getValueType(val);
    
    if (s.target.kind === ASTKind.MemberExpr) {
      const m = s.target as MemberExpr;
      const obj = this.generateExpression(m.object);
      const objLLVMType = this.tempTypes.get(obj) || 'ptr';
      
      const stName = (m.object.kind === ASTKind.ThisExpr) ? this.currentClassName! : 
                     (objLLVMType.startsWith('%') ? objLLVMType.substring(1) : ((this.classDecls.has(objLLVMType) || this.interfaceDecls.has(objLLVMType)) ? objLLVMType : this.guessStructTypeByVal(obj)));
      
      const fIdx = this.getFieldIndex(stName, m.member);
      const structInfo = this.structs.get(stName);
      if (!structInfo) return;
      const fieldType = (structInfo && structInfo.fields[fIdx]) ? structInfo.fields[fIdx].type : 'i32';
      
      const fPtr = this.newTemp();
      this.emit(`${fPtr} = getelementptr inbounds %${stName}, ptr ${obj}, i32 0, i32 ${fIdx}`);
      this.emit(`store ${this.toLLVMType(fieldType)} ${this.coerceToType(val, vt, fieldType)}, ptr ${fPtr}, align ${this.getAlignment(fieldType)}`);
      return;
    }
    
    if (s.target.kind === ASTKind.Identifier) {
      const id = (s.target as Identifier).name, global = this.globals.get(id);
      const lt = this.localVarTypes.get(id) || 'i32';
      
      if (lt.startsWith('ptr<') && this.toLLVMType(vt) === this.toLLVMType(this.getPointerInnerType(lt))) {
          this.generateManagedAssignment(id, val, this.getPointerInnerType(lt));
          return;
      }

      if (this.isStructType(lt)) {
          const structInfo = this.structs.get(lt.substring(1))!;
          const size = this.getTypeSize(lt); 
          this.emit(`call void @llvm.memcpy.p0.p0.i64(ptr %${id}, ptr ${val}, i64 ${size}, i1 false)`);
          this.ensureExternalDeclaration('llvm.memcpy.p0.p0.i64', { name: 'memcpy', kind: 'function', llvmType: 'void', paramTypes: ['ptr', 'ptr', 'i64', 'i1'] } as any);
      } else if (this.isClassType(lt)) {
          const oldVal = this.newTemp();
          this.emit(`${oldVal} = load ptr, ptr %${id}, align 8`);
          this.emitOwnedCleanupForValue(oldVal, lt);
          this.emit(`store ${this.toLLVMType(lt)} ${val}, ptr %${id}, align 8`);
          this.movedLocals.delete(id);
          if (s.value.kind === ASTKind.Identifier) {
              const srcId = (s.value as Identifier).name;
              this.emit(`store ptr null, ptr %${srcId}, align 8`);
              this.movedLocals.add(srcId);
          }
      } else {
          const lType = this.toLLVMType(lt);
          if (global) this.emit(`store ${this.toLLVMType(lType)} ${this.coerceToType(val, vt, lType)}, ptr @${global.name}, align 4`);
          else if (this.currentFunctionParams.has(id)) this.emit(`store ${this.toLLVMType(lType)} ${this.coerceToType(val, vt, lType)}, ptr %${id}.addr, align 4`);
          else this.emit(`store ${this.toLLVMType(lType)} ${this.coerceToType(val, vt, lType)}, ptr %${id}, align ${this.getAlignment(lt)}`);
      }
      return;
    }
  }

  private generateReturn(s: ReturnStmt): void {
    let finalVal: string | undefined;
    let returnSourceLocal: string | undefined;

    if (s.value) {
      if (s.value.kind === ASTKind.Identifier) {
        const id = (s.value as Identifier).name;
        const lt = this.localVarTypes.get(id);
        if (lt && (this.isClassType(lt) || (lt.startsWith('ptr<') && !lt.startsWith('ptr<void>')))) {
          returnSourceLocal = id;
        }
      }
      finalVal = this.generateExpression(s.value);
    }

    if (returnSourceLocal) {
      this.cleanupStack[this.cleanupStack.length - 1].delete(returnSourceLocal);
      this.movedLocals.add(returnSourceLocal);
    }

    this.emitCleanup();

    if (finalVal) {
      const rt = this.toLLVMType(this.currentFunctionReturnType);
      this.emit(`ret ${this.toLLVMType(rt)} ${this.coerceToType(finalVal, this.getValueType(finalVal), this.currentFunctionReturnType)}`);
    } else {
      if (this.isCurrentMain) this.emit('ret i32 0');
      else this.emit('ret void');
    }
  }

  private generateIf(s: IfStmt): void {
    const cv = this.generateExpression(s.condition), c = this.coerceToType(cv, this.getValueType(cv), 'i1');
    const tL = this.newLabel('then'), eL = this.newLabel('endif');
    if (s.elseBranch) {
      const elseL = this.newLabel('else');
      this.emit(`br i1 ${c}, label %${tL}, label %${elseL}`);
      this.emit(`\n${tL}:`); this.indent++;
      let term = false; for (const sub of s.thenBranch) { this.generateStatement(sub); if (['ReturnStmt', 'BreakStmt', 'ContinueStmt'].includes(sub.kind)) term = true; }
      if (!term) this.emit(`br label %${eL}`);
      this.indent--; this.emit(`\n${elseL}:`); this.indent++;
      term = false; for (const sub of s.elseBranch) { this.generateStatement(sub); if (['ReturnStmt', 'BreakStmt', 'ContinueStmt'].includes(sub.kind)) term = true; }
      if (!term) this.emit(`br label %${eL}`);
      this.indent--;
    } else {
      this.emit(`br i1 ${c}, label %${tL}, label %${eL}`);
      this.emit(`\n${tL}:`); this.indent++;
      let term = false; for (const sub of s.thenBranch) { this.generateStatement(sub); if (['ReturnStmt', 'BreakStmt', 'ContinueStmt'].includes(sub.kind)) term = true; }
      if (!term) this.emit(`br label %${eL}`);
      this.indent--;
    }
    this.emit(`\n${eL}:`);
  }

  private generateWhile(s: WhileStmt): void {
    const cL = this.newLabel('while.cond'), bL = this.newLabel('while.body'), eL = this.newLabel('while.end');
    this.loopStack.push({ breakLabel: eL, continueLabel: cL });
    this.emit(`br label %${cL}`); this.emit(`\n${cL}:`); this.indent++;
    const cv = this.generateExpression(s.condition), c = this.coerceToType(cv, this.getValueType(cv), 'i1');
    this.emit(`br i1 ${c}, label %${bL}, label %${eL}`); this.indent--;
    this.emit(`\n${bL}:`); this.indent++;
    for (const sub of s.body) this.generateStatement(sub);
    this.emit(`br label %${cL}`); this.indent--; this.emit(`\n${eL}:`); this.loopStack.pop();
  }

  private generateFor(s: ForStmt): void {
    const cL = this.newLabel('for.cond'), bL = this.newLabel('for.body'), uL = this.newLabel('for.update'), eL = this.newLabel('for.end');
    this.loopStack.push({ breakLabel: eL, continueLabel: uL });
    if (s.init) this.generateStatement(s.init);
    this.emit(`br label %${cL}`); this.emit(`\n${cL}:`); this.indent++;
    if (s.condition) {
      const cv = this.generateExpression(s.condition), c = this.coerceToType(cv, this.getValueType(cv), 'i1');
      this.emit(`br i1 ${c}, label %${bL}, label %${eL}`);
    } else this.emit(`br label %${bL}`);
    this.indent--; this.emit(`\n${bL}:`); this.indent++;
    for (const sub of s.body) this.generateStatement(sub);
    this.emit(`br label %${uL}`); this.indent--;
    this.emit(`\n${uL}:`); this.indent++; if (s.update) this.generateStatement(s.update);
    this.emit(`br label %${cL}`); this.indent--; this.emit(`\n${eL}:`); this.loopStack.pop();
  }

  private generateBreak(): void { this.emit(`br label %${this.loopStack[this.loopStack.length - 1].breakLabel}`); }
  private generateContinue(): void { this.emit(`br label %${this.loopStack[this.loopStack.length - 1].continueLabel}`); }

  private generateExpression(e: Expression): string {
    this.lastExpressionWasUndefined = (e.kind === ASTKind.UndefinedLiteral);
    switch (e.kind) {
      case ASTKind.ArrayLiteralExpr: return this.generateArrayLiteralExpr(e as ArrayLiteralExpr);
      case ASTKind.TupleExpr: return this.generateTupleExpr(e as TupleExpr);
      case ASTKind.NumberLiteral: return (e as NumberLiteral).value.toString();
      case ASTKind.StringLiteral: return this.generateStringLiteral(e as StringLiteral);
      case ASTKind.BoolLiteral: return (e as BoolLiteral).value ? '1' : '0';
      case ASTKind.NullLiteral: return 'null';
      case ASTKind.UndefinedLiteral: return '0';
      case ASTKind.ThisExpr: return this.generateThis();
      case ASTKind.SuperExpr: return this.generateSuper();
      case ASTKind.NewExpr: return this.generateNew(e as NewExpr);
      case ASTKind.Identifier: return this.generateIdentifier(e as Identifier);
      case ASTKind.BinaryExpr: return this.generateBinaryExpr(e as BinaryExpr);
      case ASTKind.UnaryExpr: return this.generateUnaryExpr(e as UnaryExpr);
      case ASTKind.CallExpr: return this.generateCallExpr(e as CallExpr);
      case ASTKind.IndexExpr: return this.generateIndexExpr(e as IndexExpr);
      case ASTKind.MemberExpr: return this.generateMemberExpr(e as MemberExpr);
      case ASTKind.AddressofExpr: return this.generateAddressof(e as AddressofExpr);
      case ASTKind.SizeofExpr: return this.generateSizeofExpr(e as SizeofExpr);
      case ASTKind.CastExpr: return this.generateCastExpr(e as CastExpr);
      default: return '0';
    }
  }

  private generateCastExpr(e: CastExpr): string {
    const val = this.generateExpression(e.expr);
    const actualT = this.getValueType(val);
    const targetT = this.getLLVMType(e.targetType);
    const result = this.coerceToType(val, actualT, targetT);
    this.tempTypes.set(result, targetT);
    return result;
  }

  private generateTupleExpr(e: TupleExpr): string {
    const elements = e.elements.map(el => this.generateExpression(el));
    const types = elements.map(el => this.getValueType(el));
    const tupleType = `{ ${types.join(', ')} }`;
      
    let currentTuple = 'undef';
    const finalTemp = this.newTemp();
      
    let lastTemp = 'undef';
    for (let i = 0; i < elements.length; i++) {
      const nextTemp = this.newTemp();
      this.emit(`${nextTemp} = insertvalue ${tupleType} ${lastTemp}, ${types[i]} ${elements[i]}, ${i}`);
      lastTemp = nextTemp;
    }
      
    this.tempTypes.set(lastTemp, tupleType);
    return lastTemp;
  }

  private createRuntimeArray(tsnType: string, elements: Expression[]): string {
    this.ensureGenericArrayAvailable();
    const className = `Array_${tsnType}`;
    if (!this.classDecls.has(className) && this.genericClasses.has('Array')) {
        this.instantiateClass('Array', [{ name: tsnType, isPointer: false, isArray: false }]);
    }
    const arraySize = this.getTypeSize(`%${className}`, true);
    const arrPtr = this.newTemp();
    this.ensureExternalDeclaration('class_alloc', { name: 'class_alloc', kind: 'function', llvmType: 'ptr', paramTypes: ['i32'] });
    this.emit(`${arrPtr} = call ptr @class_alloc(i32 ${arraySize})`);

    const vinfo = this.vTables.get(className);
    if (vinfo) {
        const vtablePtr = this.newTemp();
        this.emit(`${vtablePtr} = getelementptr inbounds %${className}, ptr ${arrPtr}, i32 0, i32 1`);
        this.emit(`store ptr @_VTable.${className}, ptr ${vtablePtr}, align 8`);
    }

    const ctorMangled = this.mangleNameWithScope(className, 'constructor', []);
    this.emit(`call void @${ctorMangled}(ptr ${arrPtr})`);
    this.tempTypes.set(arrPtr, `%${className}`);

    for (const el of elements) {
        if (el.kind === ASTKind.SpreadElementExpr) {
            const spread = el as SpreadElementExpr;
            const iterVal = this.generateExpression(spread.expr);
            const iterClass = this.tempTypes.get(iterVal) || this.inferExprType(spread.expr);
            const iterClassName = iterClass.startsWith('%') ? iterClass.substring(1) : iterClass;

            const loopCond = this.newLabel('spread.cond');
            const loopBody = this.newLabel('spread.body');
            const loopEnd = this.newLabel('spread.end');

            this.emit('br label %' + loopCond);
            this.emit(loopCond + ':');

            const optVal = this.newTemp();
            const optClass = `Optional_${tsnType}`;
            const nextMangled = this.mangleNameWithScope(iterClassName, 'next', []);
            this.emit(`${optVal} = call ptr @${nextMangled}(ptr ${iterVal})`);

            const isSomeMangled = this.mangleNameWithScope(optClass, 'isSome', []);
            const isSomeRes = this.newTemp();
            this.emit(`${isSomeRes} = call i1 @${isSomeMangled}(ptr ${optVal})`);

            this.emit(`br i1 ${isSomeRes}, label %${loopBody}, label %${loopEnd}`);

            this.emit(loopBody + ':');
            const unwrapMangled = this.mangleNameWithScope(optClass, 'unwrap', []);
            const unwrapRes = this.newTemp();
            const unwrapRetT = this.toLLVMType(tsnType);
            this.emit(`${unwrapRes} = call ${unwrapRetT} @${unwrapMangled}(ptr ${optVal})`);

            const pushMangled = this.mangleNameWithScope(className, 'push', [{ name: 'item', type: { name: tsnType, isPointer: false, isArray: false } }]);
            this.emit(`call void @${pushMangled}(ptr ${arrPtr}, ${unwrapRetT} ${unwrapRes})`);

            this.emit(`br label %${loopCond}`);
            this.emit(loopEnd + ':');
        } else {
            const val = this.generateExpression(el);
            const pushMangled = this.mangleNameWithScope(className, 'push', [{ name: 'item', type: { name: tsnType, isPointer: false, isArray: false } }]);
            const valRetT = this.toLLVMType(tsnType);
            this.emit(`call void @${pushMangled}(ptr ${arrPtr}, ${valRetT} ${val})`);
        }
    }

    return arrPtr;
  }

  private generateArrayLiteralExpr(e: ArrayLiteralExpr): string {
    let tsnType = 'i32'; // Default
    
    // Type Inference for Array<T>
    if (e.elements.length > 0) {
        for (const el of e.elements) {
            if (el.kind === ASTKind.SpreadElementExpr) {
                const spread = el as SpreadElementExpr;
                const iterType = this.inferExprType(spread.expr);
                const className = iterType.startsWith('%') ? iterType.substring(1) : iterType;
                const cDecl = this.classDecls.get(className);
                if (cDecl) {
                    const nextMethod = cDecl.methods.find(m => m.name === 'next');
                    if (nextMethod && nextMethod.returnType.name.startsWith('Optional')) {
                        if (nextMethod.returnType.genericArgs && nextMethod.returnType.genericArgs.length > 0) {
                            tsnType = nextMethod.returnType.genericArgs[0].name;
                        } else if (nextMethod.returnType.name.includes('_')) {
                            tsnType = nextMethod.returnType.name.split('_')[1];
                        }
                        break;
                    }
                }
            } else {
                const llvmT = this.inferExprType(el);
                if (llvmT === 'ptr') tsnType = 'string';
                else if (llvmT.startsWith('%')) tsnType = llvmT.substring(1);
                else tsnType = llvmT;
                break;
            }
        }
    }

    return this.createRuntimeArray(tsnType, e.elements);
  }

  private generateThis(): string {
    const t = this.newTemp();
    this.emit(`${t} = load ptr, ptr %this.addr, align 8`);
    if (this.currentClassName) this.tempTypes.set(t, `%${this.currentClassName}`);
    else this.tempTypes.set(t, 'ptr');
    return t;
  }

  private generateSuper(): string {
    const t = this.newTemp();
    this.emit(`${t} = load ptr, ptr %this.addr, align 8`);
    const currentClass = this.classDecls.get(this.currentClassName || '');
    if (currentClass && currentClass.baseClassName) {
        this.tempTypes.set(t, `%${currentClass.baseClassName}`);
    } else {
        this.tempTypes.set(t, 'ptr');
    }
    return t;
  }

  private generateNew(e: NewExpr): string {
    let className = e.className;
    if (e.genericArgs && e.genericArgs.length > 0) {
        className = this.instantiateClass(e.className, e.genericArgs);
    }

    const st = this.structs.get(className);
    if (!st) return 'null';
    // 1. Alloc memory
    const size = this.getTypeSize(`%${className}`, true);
    const ptr = this.newTemp();
    this.ensureExternalDeclaration('class_alloc', { name: 'class_alloc', kind: 'function', llvmType: 'ptr', paramTypes: ['i32'] });
    this.emit(`${ptr} = call ptr @class_alloc(i32 ${size})`);
    this.tempTypes.set(ptr, `%${className}`);
    
    // 1.5 Initialize VTable pointer
    const vtablePtr = this.newTemp();
    this.emit(`${vtablePtr} = getelementptr inbounds %${className}, ptr ${ptr}, i32 0, i32 1`);
    this.emit(`store ptr @_VTable.${className}, ptr ${vtablePtr}, align 8`);
    
    // 2. Call constructor
    const scopedCtor = `${className}.constructor`;
    const info = this.functions.get(scopedCtor);
    if (info) {
      const args = e.args.map(a => this.generateExpression(a));
      const aStr = [`ptr ${ptr}`, ...args.map((a, i) => {
        const expectedT = info.paramTypes[i + 1];
        const actualT = this.getValueType(a);
        return `${this.toLLVMType(expectedT)} ${this.coerceToType(a, actualT, expectedT)}`;
      })].join(', ');
      this.emit(`call void @${info.name}(${aStr})`);
    }
    return ptr;
  }

  private generateStringLiteral(e: StringLiteral): string {
    const name = `@.str.${this.stringCounter++}`; this.stringLiterals.set(name, e.value);
    const t = this.newTemp();
    const byteLen = new TextEncoder().encode(e.value).length + 1;
    this.emit(`${t} = getelementptr inbounds [${byteLen} x i8], ptr ${name}, i32 0, i32 0`);
    this.tempTypes.set(t, 'string'); return t;
  }

  private generateIdentifier(e: Identifier): string {
    const movedType = this.localVarTypes.get(e.name);
    if (movedType && (this.isClassType(movedType) || (movedType.startsWith('ptr<') && !movedType.startsWith('ptr<void>'))) && this.movedLocals.has(e.name)) {
      throw new Error(`Use after move: '${e.name}' can no longer be used after ownership was transferred`);
    }
    if (this.currentFunctionParams.has(e.name)) {
      const pt = this.currentFunctionParamTypes.get(e.name)!;
      const t = this.newTemp(); this.emit(`${t} = load ${this.toLLVMType(pt)}, ptr %${e.name}.addr, align ${this.getAlignment(pt)}`);
      this.tempTypes.set(t, pt); return t;
    }
    const lt = this.localVarTypes.get(e.name);
    if (lt) {
      if (lt.startsWith('[')) return `%${e.name}`;
      
      // For structs (not classes), we return the pointer to the struct on stack
      if (this.isStructType(lt)) {
          this.tempTypes.set(`%${e.name}`, lt);
          return `%${e.name}`;
      }
      
      const isString = lt === 'string';
      const isManaged = lt.startsWith('ptr<');
      const isRaw = lt.startsWith('rawPtr<');
      const loadType = (this.isClassType(lt) || isString || isManaged || isRaw) ? 'ptr' : lt;
      const t = this.newTemp(); 
      this.emit(`${t} = load ${this.toLLVMType(loadType)}, ptr %${e.name}, align ${this.getAlignment(loadType)}`);
      this.tempTypes.set(t, lt); return t;
    }

    const g = this.globals.get(e.name);
    if (g) {
      if (g.type.startsWith('[')) return `@${g.name}`;
      const t = this.newTemp(); this.emit(`${t} = load ${this.toLLVMType(g.type)}, ptr @${g.name}, align ${this.getAlignment(g.type)}`);
      this.tempTypes.set(t, g.type); return t;
    }

    const fnInfo = this.functions.get(e.name) || this.functions.get(this.resolveMangledName(e.name));
    if (fnInfo) {
      const fnRef = `@${fnInfo.name}`;
      this.tempTypes.set(fnRef, 'ptr');
      return fnRef;
    }

    return `%${e.name}`; // Fallback (should be i32* usually)
  }

  private generateBinaryExpr(e: BinaryExpr): string {
    const l = this.generateExpression(e.left), r = this.generateExpression(e.right);
    const leftType = this.getValueType(l);
    const rightType = this.getValueType(r);
    const opMap: Record<string, string> = { 
        '+': 'add', '-': 'sub', '*': 'mul', '/': 'sdiv', '%': 'srem',
        '==': 'icmp eq', '!=': 'icmp ne', '<': 'icmp slt', '<=': 'icmp sle', '>': 'icmp sgt', '>=': 'icmp sge', 
        '&&': 'and', '||': 'or',
        '&': 'and', '|': 'or', '^': 'xor', 
        '<<': 'shl', '>>': 'ashr'
    };
    const op = opMap[e.operator] || 'add';

    if (e.operator === '+' && (leftType === 'string' || rightType === 'string' || (this.toLLVMType(leftType) === 'ptr' && this.toLLVMType(rightType) === 'ptr'))) {
      this.ensureExternalDeclaration('string_concat', { name: 'string_concat', kind: 'function', llvmType: 'ptr', paramTypes: ['ptr', 'ptr'] } as any);
      const result = this.newTemp();
      this.emit(`${result} = call ptr @string_concat(ptr ${this.coerceToType(l, leftType, 'ptr')}, ptr ${this.coerceToType(r, rightType, 'ptr')})`);
      this.tempTypes.set(result, 'string');
      return result;
    }

    if ((e.operator === '==' || e.operator === '!=') && leftType === 'string' && rightType === 'string') {
      this.ensureExternalDeclaration('string_equals', { name: 'string_equals', kind: 'function', llvmType: 'i1', paramTypes: ['ptr', 'ptr'] } as any);
      const equalsResult = this.newTemp();
      this.emit(`${equalsResult} = call i1 @string_equals(ptr ${this.coerceToType(l, leftType, 'ptr')}, ptr ${this.coerceToType(r, rightType, 'ptr')})`);
      if (e.operator === '!=') {
        const notResult = this.newTemp();
        this.emit(`${notResult} = xor i1 ${equalsResult}, true`);
        this.tempTypes.set(equalsResult, 'i1');
        this.tempTypes.set(notResult, 'i1');
        return notResult;
      }
      this.tempTypes.set(equalsResult, 'i1');
      return equalsResult;
    }

    if ((e.operator === '<' || e.operator === '<=' || e.operator === '>' || e.operator === '>=') && leftType === 'string' && rightType === 'string') {
      this.ensureExternalDeclaration('string_compare', { name: 'string_compare', kind: 'function', llvmType: 'i32', paramTypes: ['ptr', 'ptr'] } as any);
      const compareResult = this.newTemp();
      this.emit(`${compareResult} = call i32 @string_compare(ptr ${this.coerceToType(l, leftType, 'ptr')}, ptr ${this.coerceToType(r, rightType, 'ptr')})`);
      const comparison = this.newTemp();
      const cmpMap: Record<string, string> = { '<': 'slt', '<=': 'sle', '>': 'sgt', '>=': 'sge' };
      this.emit(`${comparison} = icmp ${cmpMap[e.operator]} i32 ${compareResult}, 0`);
      this.tempTypes.set(compareResult, 'i32');
      this.tempTypes.set(comparison, 'i1');
      return comparison;
    }

    if ((e.operator === '+' || e.operator === '-') && this.toLLVMType(leftType) === 'ptr' && rightType.startsWith('i')) {
      const baseInt = this.newTemp();
      this.emit(`${baseInt} = ptrtoint ptr ${l} to i64`);
      const offset = this.coerceToType(r, rightType, 'i64');
      const resultInt = this.newTemp();
      const llvmOp = e.operator === '+' ? 'add' : 'sub';
      this.emit(`${resultInt} = ${llvmOp} i64 ${baseInt}, ${offset}`);
      const resultPtr = this.newTemp();
      this.emit(`${resultPtr} = inttoptr i64 ${resultInt} to ptr`);
      this.tempTypes.set(baseInt, 'i64');
      this.tempTypes.set(resultInt, 'i64');
      this.tempTypes.set(resultPtr, leftType);
      return resultPtr;
    }

    if ((e.operator === '+' || e.operator === '-') && this.toLLVMType(rightType) === 'ptr' && leftType.startsWith('i') && e.operator === '+') {
      const baseInt = this.newTemp();
      this.emit(`${baseInt} = ptrtoint ptr ${r} to i64`);
      const offset = this.coerceToType(l, leftType, 'i64');
      const resultInt = this.newTemp();
      this.emit(`${resultInt} = add i64 ${baseInt}, ${offset}`);
      const resultPtr = this.newTemp();
      this.emit(`${resultPtr} = inttoptr i64 ${resultInt} to ptr`);
      this.tempTypes.set(baseInt, 'i64');
      this.tempTypes.set(resultInt, 'i64');
      this.tempTypes.set(resultPtr, rightType);
      return resultPtr;
    }
    if (e.operator === '&&' || e.operator === '||') {
      const l1 = this.coerceToType(l, this.getValueType(l), 'i1');
      const r1 = this.coerceToType(r, this.getValueType(r), 'i1');
      const t = `%${this.tempCounter}`;
      this.emit(`${t} = ${op} i1 ${l1}, ${r1}`);
      this.tempCounter++;
      this.tempTypes.set(t, 'i1');
      return t;
    }
    const t = this.newTemp();
    const lt = this.getValueType(l);
    const llvmType = this.toLLVMType(lt);
    const rt = (lt === 'ptr' || r === 'null') ? 'ptr' : llvmType;
    
    // Union comparison with null/undefined
    const isNull = r === 'null';
    const isUndefined = r === '0' && this.lastExpressionWasUndefined;

    if (this.unionDefinitions.has(lt) && (isNull || isUndefined)) {
        const unionType = this.unionDefinitions.get(lt)!;
        const targetName = isNull ? 'null' : 'undefined';
        const typeIndex = unionType.unionTypes?.findIndex(ut => ut.name === targetName) ?? -1;

        if (typeIndex !== -1) {
            const tempAlloc = this.newTemp();
            const llvmUnionType = lt;
            this.emit(`${tempAlloc} = alloca ${llvmUnionType}, align 8`);
            this.emit(`store ${llvmUnionType} ${l}, ptr ${tempAlloc}, align 4`);
            const tagPtr = this.newTemp();
            this.emit(`${tagPtr} = getelementptr inbounds ${llvmUnionType}, ptr ${tempAlloc}, i32 0, i32 0`);
            const tag = this.newTemp();
            this.emit(`${tag} = load i32, ptr ${tagPtr}, align 4`);
            
            const res = this.newTemp();
            const cmp = op.includes('eq') ? 'eq' : 'ne';
            this.emit(`${res} = icmp ${cmp} i32 ${tag}, ${typeIndex}`);
            this.tempTypes.set(res, 'i1');
            return res;
        }
    }

    this.emit(`${t} = ${op} ${rt} ${l}, ${r}`); this.tempTypes.set(t, op.startsWith('icmp') ? 'i1' : rt); return t;
  }

  private generateUnaryExpr(e: UnaryExpr): string {
    if (e.operator === '++' || e.operator === '--') {
        if (e.operand.kind !== ASTKind.Identifier) {
            // Not supported for complex expressions yet
            return '0';
        }
        const name = (e.operand as Identifier).name;
        const isGlobal = this.globals.has(name);
        if (!isGlobal && !this.localVarTypes.has(name)) {
            // Might be a property or parameter, but let's assume it's valid for now if resolve passed
        }

        const addr = isGlobal ? `@${name}` : `%${name}`;
        const type = isGlobal ? this.globals.get(name)!.type : (this.localVarTypes.get(name) || 'i32');
        const llvmType = this.toLLVMType(type);
        
        const oldVal = this.generateExpression(e.operand);
        const newVal = this.newTemp();
        const op = e.operator === '++' ? 'add' : 'sub';
        this.emit(`${newVal} = ${op} ${llvmType} ${oldVal}, 1`);
        this.emit(`store ${llvmType} ${newVal}, ptr ${addr}, align ${this.getAlignment(type)}`);
        
        if (e.isPostfix) {
            return oldVal;
        } else {
            this.tempTypes.set(newVal, type);
            return newVal;
        }
    }

    const v = this.generateExpression(e.operand);
    const vt = this.getValueType(v);
    const t = this.newTemp();
    const lType = this.toLLVMType(vt);
    
    if (e.operator === '-') {
        this.emit(`${t} = sub ${lType} 0, ${v}`);
        this.tempTypes.set(t, vt);
        return t;
    } else if (e.operator === '~') {
        this.emit(`${t} = xor ${lType} ${v}, -1`);
        this.tempTypes.set(t, vt);
        return t;
    } else {
        const cond = this.coerceToType(v, vt, 'i1');
        this.emit(`${t} = xor i1 ${cond}, true`);
        this.tempTypes.set(t, 'i1');
        return t;
    }
  }

  private generateInternalCall(name: string, args: Expression[]): string {
    const info = this.functions.get(name);
    let mappedArgs: string[] = [];

    if (info && info.restParamIndex !== undefined) {
      const fixedCount = info.restParamIndex;
      for (let i = 0; i < fixedCount; i++) {
        const arg = args[i];
        const v = this.generateExpression(arg);
        const actualT = this.getValueType(v);
        const expectedT = info.paramTypes[i] || actualT;
        mappedArgs.push(`${this.toLLVMType(expectedT)} ${this.coerceToType(v, actualT, expectedT)}`);
      }
      const restArgs = args.slice(fixedCount);
      const restType = info.restElementType || 'Array_i32';
      const elementType = restType.startsWith('Array_') ? restType.substring(6) : 'i32';
      const restArray = this.createRuntimeArray(elementType, restArgs);
      mappedArgs.push(`ptr ${restArray}`);
    } else {
      mappedArgs = args.map((arg, i) => {
        const v = this.generateExpression(arg), t = info && info.paramTypes[i] ? info.paramTypes[i] : this.getValueType(v);
        return `${this.toLLVMType(t)} ${this.coerceToType(v, this.getValueType(v), t)}`;
      });
    }

    const aStr = mappedArgs.join(', ');
    const rt = info ? info.returnType : 'i32';
    const llvmRt = this.toLLVMType(rt);
    const actualName = info ? info.name : name;
    if (info && (info as any).isExternal) {
        this.ensureExternalDeclaration(actualName, info as any);
    }
    if (llvmRt === 'void') { this.emit(`call void @${actualName}(${aStr})`); return '0'; }
    const t = this.newTemp();
    this.emit(`${t} = call ${llvmRt} @${actualName}(${aStr})`);
    this.tempTypes.set(t, rt);
    return t;
  }

  private generateCallExpr(e: CallExpr): string {
    if (e.callee.kind === ASTKind.MemberExpr) return this.generateMemberCallExpr(e.callee as MemberExpr, e.args, e.genericArgs);
    
    // Handle super() constructor call
    if (e.callee.kind === ASTKind.SuperExpr) {
        const currentClass = this.classDecls.get(this.currentClassName || '');
        if (currentClass && currentClass.baseClassName) {
            const baseClassName = currentClass.baseClassName;
            const mangled = this.resolveMangledName(`${baseClassName}.constructor`);
            const info = this.functions.get(mangled);
            const obj = this.generateThis();
            const args = e.args.map((arg, i) => {
                const v = this.generateExpression(arg), t = info && info.paramTypes[i + 1] ? info.paramTypes[i + 1] : this.getValueType(v);
                return `${t} ${this.coerceToType(v, this.getValueType(v), t)}`;
            }).join(', ');
            const aStr = [`ptr ${obj}`, ...args.length ? [args] : []].join(', ');
            this.emit(`call void @${mangled}(${aStr})`);
            return '0';
        }
    }

    let name = (e.callee as Identifier).name;

    // Function-typed parameters/local values are invoked indirectly via the loaded pointer.
    const paramRuntimeType = this.currentFunctionParams.has(name) ? this.currentFunctionParamTypes.get(name) : undefined;
    const localRuntimeType = this.localVarTypes.get(name);
    if (!e.genericArgs?.length && (paramRuntimeType === 'ptr' || localRuntimeType === 'ptr')) {
        const fnPtr = this.generateIdentifier({ kind: ASTKind.Identifier, name, line: e.line, column: e.column } as Identifier);
        const mappedArgs = e.args.map((arg) => {
          const v = this.generateExpression(arg);
          const actualT = this.getValueType(v);
          return `${this.toLLVMType(actualT)} ${this.coerceToType(v, actualT, actualT)}`;
        }).join(', ');
        const t = this.newTemp();
        this.emit(`${t} = call i32 ${fnPtr}(${mappedArgs})`);
        this.tempTypes.set(t, 'i32');
        return t;
    }

    if (e.genericArgs && e.genericArgs.length > 0) {
        name = this.instantiateFunction(name, e.genericArgs);
    }
    let mangled = this.resolveMangledName(name);
    const imported = this.importedSymbols.get(name);
    if (imported && imported.kind === 'function') {
        this.ensureExternalDeclaration(name, imported);
        return this.generateImportedCall(name, name, imported, e.args);
    }
    let info = this.functions.get(mangled) || this.functions.get(name);
    if (!info && !name.includes('.')) {
        for (const [key, value] of this.functions) {
            if (key === name || value.name === name) continue;
            if (value.name.includes(`${name.length}${name}E`)) {
                info = value;
                mangled = value.name;
                break;
            }
        }
    }
    
    const actualName = info ? info.name : mangled;
    if (info && (info as any).isExternal) {
        this.ensureExternalDeclaration(actualName, info as any);
    }
    
    let mappedArgs: string[] = [];
    if (info && info.restParamIndex !== undefined) {
      const fixedCount = info.restParamIndex;
      for (let i = 0; i < fixedCount; i++) {
        const arg = e.args[i];
        const v = this.generateExpression(arg);
        const actualT = this.getValueType(v);
        const expectedT = info.paramTypes[i] || actualT;
        mappedArgs.push(`${this.toLLVMType(expectedT)} ${this.coerceToType(v, actualT, expectedT)}`);
      }
      const restArgs = e.args.slice(fixedCount);
      const restType = info.restElementType || 'Array_i32';
      const elementType = restType.startsWith('Array_') ? restType.substring(6) : 'i32';
      const restArray = this.createRuntimeArray(elementType, restArgs);
      mappedArgs.push(`ptr ${restArray}`);
    } else {
      mappedArgs = e.args.map((arg, i) => {
        const v = this.generateExpression(arg);
        const actualT = this.getValueType(v);
        const expectedT = info && info.paramTypes[i] ? info.paramTypes[i] : actualT;
        return `${this.toLLVMType(expectedT)} ${this.coerceToType(v, actualT, expectedT)}`;
      });
    }
    const args = mappedArgs.join(', ');
    const rt = info ? info.returnType : 'i32';
    const llvmRt = this.toLLVMType(rt);
    if (llvmRt === 'void') { this.emit(`call void @${actualName}(${args})`); return '0'; }
    const t = this.newTemp(); this.emit(`${t} = call ${llvmRt} @${actualName}(${args})`); this.tempTypes.set(t, rt); return t;
  }

  private generateMemberCallExpr(m: MemberExpr, args: Expression[], genericArgs?: TypeAnnotation[]): string {
    // Namespace check (e.g. memory.alloc or string.byteLength)
    if (m.object.kind === ASTKind.Identifier) {
        const ns = (m.object as Identifier).name;
        const fullName = `${ns}.${m.member}`;
        const importedSym = this.importedSymbols.get(fullName);
        const hasNamespaceFunction = this.functions.has(fullName)
          && !this.localVarTypes.has(ns)
          && !this.currentFunctionParams.has(ns)
          && !this.globals.has(ns);

        if (importedSym && importedSym.kind === 'function') {
            if (genericArgs && genericArgs.length > 0 && importedSym.ast) {
                const instName = this.instantiateFunction(fullName, genericArgs);
                return this.generateInternalCall(instName, args);
            }
            return this.generateImportedCall(fullName, fullName, importedSym, args);
        }

        if (hasNamespaceFunction) {
            if (genericArgs && genericArgs.length > 0) {
                const instName = this.instantiateFunction(fullName, genericArgs);
                return this.generateInternalCall(instName, args);
            }
            return this.generateInternalCall(fullName, args);
        }
    }

    // Handle .address()
    if (m.member === 'address') {
        if (!this.isUnsafeContext) {
            throw new Error(`.address() is only allowed in @unsafe functions.`);
        }
        if (m.object.kind === ASTKind.Identifier) {
            const id = (m.object as Identifier).name;
            const lt = this.localVarTypes.get(id) || 'i32';
            const t = this.newTemp();
            const resType = `rawPtr<${lt}>`;
            this.emit(`${t} = bitcast ptr %${id} to ptr`); 
            this.tempTypes.set(t, resType);
            return t;
        }
    }

    const obj = this.generateExpression(m.object);
    const objType = this.tempTypes.get(obj) || this.inferExprType(m.object) || 'ptr';
    
    // Handle .set(val) and .get() for pointers
    if (this.isPointerType(objType)) {
        const innerType = this.getPointerInnerType(objType);
        const llvmInnerType = this.toLLVMType(innerType);
        
        if (m.member === 'set' && args.length > 0) {
            const val = this.generateExpression(args[0]);
            const vt = this.getValueType(val);
            this.emit(`store ${this.toLLVMType(llvmInnerType)} ${this.coerceToType(val, vt, llvmInnerType)}, ptr ${obj}, align ${this.getAlignment(innerType)}`);
            return '0';
        } else if (m.member === 'get') {
            const t = this.newTemp();
            this.emit(`${t} = load ${this.toLLVMType(llvmInnerType)}, ptr ${obj}, align ${this.getAlignment(innerType)}`);
            this.tempTypes.set(t, innerType);
            return t;
        }
    }

    // Built-in string methods
    if (objType === 'string' || (objType === 'ptr' && (m.member === 'slice' || m.member === 'includes' || m.member === 'indexOf' || m.member === 'startsWith' || m.member === 'endsWith'))) {
        const stringMethods: Record<string, { func: string, rt: string, pts: string[] }> = {
            'includes':   { func: 'string_includes',   rt: 'i1',  pts: ['ptr', 'ptr'] },
            'indexOf':    { func: 'string_indexOf',    rt: 'i32', pts: ['ptr', 'ptr'] },
            'startsWith': { func: 'string_startsWith', rt: 'i1',  pts: ['ptr', 'ptr'] },
            'endsWith':   { func: 'string_endsWith',   rt: 'i1',  pts: ['ptr', 'ptr'] },
        };

        if (m.member === 'slice') {
            this.ensureExternalDeclaration('string_substr', { name: 'string_substr', kind: 'function', llvmType: 'ptr', paramTypes: ['ptr', 'i32', 'i32'] } as any);
            const start = this.generateExpression(args[0]);
            const startType = this.getValueType(start);
            const end = args.length > 1 ? this.generateExpression(args[1]) : null;
            const endType = end ? this.getValueType(end) : 'i32';
            const startI32 = this.coerceToType(start, startType, 'i32');
            const len = this.newTemp();
            if (end) {
                const endI32 = this.coerceToType(end, endType, 'i32');
                this.emit(`${len} = sub i32 ${endI32}, ${startI32}`);
            } else {
                const totalLen = this.newTemp();
                this.ensureExternalDeclaration('string_length', { name: 'string_length', kind: 'function', llvmType: 'i32', paramTypes: ['ptr'] } as any);
                this.emit(`${totalLen} = call i32 @string_length(ptr ${obj})`);
                this.emit(`${len} = sub i32 ${totalLen}, ${startI32}`);
                this.tempTypes.set(totalLen, 'i32');
            }
            const t = this.newTemp();
            this.emit(`${t} = call ptr @string_substr(ptr ${obj}, i32 ${startI32}, i32 ${len})`);
            this.tempTypes.set(len, 'i32');
            this.tempTypes.set(t, 'string');
            return t;
        }

        const method = stringMethods[m.member];
        if (method) {
            this.ensureExternalDeclaration(method.func, { name: method.func, kind: 'function', llvmType: method.rt, paramTypes: method.pts } as any);
            const search = this.generateExpression(args[0]);
            const searchType = this.getValueType(search);
            const t = this.newTemp();
            this.emit(`${t} = call ${method.rt} @${method.func}(ptr ${obj}, ptr ${this.coerceToType(search, searchType, 'ptr')})`);
            this.tempTypes.set(t, method.rt);
            return t;
        }
    }

    // Handle .set(val) for pointers
    if (this.isPointerType(objType) && m.member === 'set') {
        const innerType = this.getPointerInnerType(objType);
        const val = this.generateExpression(args[0]);
        const vt = this.getValueType(val);
        const llvmInnerType = this.toLLVMType(innerType);
        this.emit(`store ${llvmInnerType} ${this.coerceToType(val, vt, llvmInnerType)}, ptr ${obj}, align ${this.getAlignment(innerType)}`);
        return '0';
    }
    
    let stName = 'Unknown';
    let isVirtual = false;

    if (m.object.kind === ASTKind.ThisExpr) {
        stName = this.currentClassName!;
        isVirtual = true;
    } else if (m.object.kind === ASTKind.SuperExpr) {
        const currentClass = this.classDecls.get(this.currentClassName || '');
        if (currentClass && currentClass.baseClassName) {
            stName = currentClass.baseClassName;
        }
        isVirtual = false; // Super calls are static
    } else {
        stName = objType.startsWith('%')
            ? objType.substring(1)
            : ((this.classDecls.has(objType) || this.interfaceDecls.has(objType)) ? objType : this.guessStructTypeByVal(obj));
        isVirtual = this.classDecls.has(stName) || this.interfaceDecls.has(stName);
    }

    if (isVirtual) {
        // Virtual Dispatch via VTable
        const vtable = this.vTables.get(stName);
        if (vtable) {
            const methodIdx = vtable.methodNames.indexOf(m.member);
            if (methodIdx !== -1) {
                // If it's an interface call, we don't have a mangled name here, 
                // but we use the signature from the interface method info
                const mangled = vtable.mangledNames[methodIdx];
                const info = this.functions.get(mangled) || this.getInterfaceMethodInfo(stName, m.member);
                const rt = info ? info.returnType : 'i32';
                
                if (mangled !== 'null') {
                    const sym: ExportedSymbol = {
                        name: mangled,
                        kind: 'function',
                        llvmType: rt,
                        paramTypes: info ? info.paramTypes : ['ptr']
                    } as any;
                    this.ensureExternalDeclaration(mangled, sym);
                }

                // 1. Get VTable pointer from object
                const vptrAddr = this.newTemp();
                this.emit(`${vptrAddr} = getelementptr inbounds { i32, ptr }, ptr ${obj}, i32 0, i32 1`);
                const vtablePtr = this.newTemp();
                this.emit(`${vtablePtr} = load ptr, ptr ${vptrAddr}, align 8`);
                
                // 2. Get function pointer from VTable
                const fnPtrAddr = this.newTemp();
                this.emit(`${fnPtrAddr} = getelementptr inbounds ptr, ptr ${vtablePtr}, i32 ${methodIdx}`);
                const fnPtr = this.newTemp();
                this.emit(`${fnPtr} = load ptr, ptr ${fnPtrAddr}, align 8`);
                
                // 3. Prepare arguments
                const mappedArgs = args.map((arg, i) => {
                    const v = this.generateExpression(arg);
                    const actualT = this.getValueType(v);
                    const expectedT = info && info.paramTypes[i + 1] ? info.paramTypes[i + 1] : actualT;
                    return `${this.toLLVMType(expectedT)} ${this.coerceToType(v, actualT, expectedT)}`;
                }).join(', ');
                const aStr = [`ptr ${obj}`, ...mappedArgs.length ? [mappedArgs] : []].join(', ');
                const llvmRt = this.toLLVMType(rt);
                
                // 4. Call function pointer
                if (llvmRt === 'void') {
                    this.emit(`call void ${fnPtr}(${aStr})`);
                    return '0';
                } else {
                    const t = this.newTemp();
                    this.emit(`${t} = call ${llvmRt} ${fnPtr}(${aStr})`);
                    this.tempTypes.set(t, rt);
                    return t;
                }
            }
        }
    }

    // Static Dispatch (Fallthrough or for non-virtual/super calls)
    const dotName = `${stName}.${m.member}`;
    
    // Check if this is a generic method call
    if (genericArgs && genericArgs.length > 0) {
        const genericMethodKey = dotName;
        if (this.genericMethods.has(genericMethodKey)) {
            const instantiatedName = this.instantiateMethod(stName, m.member, genericArgs);
            const info = this.functions.get(instantiatedName);
            const argStrings = args.map((arg, i) => {
                const v = this.generateExpression(arg);
                const actualT = this.getValueType(v);
                const expectedT = info && info.paramTypes[i + 1] ? info.paramTypes[i + 1] : actualT;
                return `${this.toLLVMType(expectedT)} ${this.coerceToType(v, actualT, expectedT)}`;
            }).join(', ');
            const rt = info ? info.returnType : 'i32';
            const llvmRt = this.toLLVMType(rt);
            const actualName = info ? info.name : instantiatedName;
            const aStr = [`ptr ${obj}`, ...argStrings.length ? [argStrings] : []].join(', ');
            
            if (llvmRt === 'void') { 
                this.emit(`call void @${actualName}(${aStr})`); 
                return '0'; 
            }
            const t = this.newTemp(); 
            this.emit(`${t} = call ${llvmRt} @${actualName}(${aStr})`); 
            this.tempTypes.set(t, rt); 
            return t;
        }
    }
    
    const resolvedName = this.resolveMangledName(dotName);
    const info = this.functions.get(resolvedName) || this.functions.get(dotName);
    const argStrings = args.map((arg, i) => {
      const v = this.generateExpression(arg);
      const actualT = this.getValueType(v);
      const expectedT = info && info.paramTypes[i + 1] ? info.paramTypes[i + 1] : actualT;
      return `${this.toLLVMType(expectedT)} ${this.coerceToType(v, actualT, expectedT)}`;
    }).join(', ');
    const rt = info ? info.returnType : 'i32';
    const llvmRt = this.toLLVMType(rt);
    const actualName = info ? info.name : (resolvedName.includes('.') ? resolvedName : dotName);
    const aStr = [`ptr ${obj}`, ...argStrings.length ? [argStrings] : []].join(', ');

    if (info && (info as any).isExternal) {
      this.ensureExternalDeclaration(actualName, info as any);
    } else if (!info && !this.functions.has(actualName) && actualName.includes('.')) {
        // Handle possible missing method declaration (e.g. from imported classes)
        const [clsName, methName] = actualName.split('.');
        const sym = this.importedSymbols.get(clsName);
        if (sym && sym.kind === 'class' && sym.ast) {
             const method = (sym.ast as ClassDecl).methods.find(m => m.name === methName);
             if (method) {
                 const mName = this.mangleNameWithScope(clsName, methName, method.params);
                 const mInfo = {
                     name: mName,
                     kind: 'function',
                     llvmType: this.getLLVMType(method.returnType),
                     paramTypes: ['ptr', ...method.params.map(p => this.getFunctionParamStorageType(p))]
                 };
                 this.ensureExternalDeclaration(mName, mInfo as any);
                 this.functions.set(actualName, mInfo as any);
                 this.functions.set(mName, mInfo as any);
             }
        }
    } else if (!info && !this.functions.has(actualName) && !actualName.includes('.') && this.importedSymbols.has(actualName)) {
        const sym = this.importedSymbols.get(actualName);
        if (sym && sym.kind === 'function') {
             this.ensureExternalDeclaration(actualName, sym);
        }
    }

    if (llvmRt === 'void') { this.emit(`call void @${actualName}(${aStr})`); return '0'; }
    const t = this.newTemp(); this.emit(`${t} = call ${llvmRt} @${actualName}(${aStr})`); this.tempTypes.set(t, rt); return t;
  }

  private emitWindowsConsoleLog(args: Expression[]): boolean {
    if (this.hostOS !== 'windows' || args.length !== 1 || args[0].kind !== ASTKind.StringLiteral) {
      return false;
    }

    const literal = args[0] as StringLiteral;
    const textPtr = this.generateExpression(literal);
    const textLen = new TextEncoder().encode(literal.value).length;
    const newlineName = '@.str.console_newline';
    this.stringLiterals.set(newlineName, '\r\n');

    this.ensureExternalDeclaration('GetStdHandle', { name: 'GetStdHandle', kind: 'function', llvmType: 'ptr', paramTypes: ['i32'] } as any);
    this.ensureExternalDeclaration('WriteFile', { name: 'WriteFile', kind: 'function', llvmType: 'i32', paramTypes: ['ptr', 'ptr', 'i32', 'ptr', 'ptr'] } as any);

    const handle = this.newTemp();
    this.emit(`${handle} = call ptr @GetStdHandle(i32 -11)`);

    const writtenPtr = this.newTemp();
    this.emit(`${writtenPtr} = alloca i32, align 4`);
    this.emit(`store i32 0, ptr ${writtenPtr}, align 4`);

    const newlinePtr = this.newTemp();
    this.emit(`${newlinePtr} = getelementptr inbounds [3 x i8], ptr ${newlineName}, i32 0, i32 0`);

    const writeTextResult = this.newTemp();
    this.emit(`${writeTextResult} = call i32 @WriteFile(ptr ${handle}, ptr ${textPtr}, i32 ${textLen}, ptr ${writtenPtr}, ptr null)`);

    const writeNewlineResult = this.newTemp();
    this.emit(`${writeNewlineResult} = call i32 @WriteFile(ptr ${handle}, ptr ${newlinePtr}, i32 2, ptr ${writtenPtr}, ptr null)`);

    return true;
  }

  private generateImportedCall(local: string, mangled: string, sym: ExportedSymbol, args: Expression[]): string {
    if ((local === 'log' || local === 'console.log') && args.length === 1) {
      const value = this.generateExpression(args[0]);
      const valueType = this.getValueType(value);
      const numericPrinter = valueType === 'i32'
        ? { name: 'print_i32', llvmType: 'void', paramTypes: ['i32'] }
        : valueType === 'float'
          ? { name: 'print_f32', llvmType: 'void', paramTypes: ['float'] }
          : valueType === 'double'
            ? { name: 'print_f64', llvmType: 'void', paramTypes: ['double'] }
            : null;

      if (numericPrinter) {
        this.ensureExternalDeclaration(numericPrinter.name, {
          name: numericPrinter.name,
          kind: 'function',
          llvmType: numericPrinter.llvmType,
          paramTypes: numericPrinter.paramTypes,
        } as any);
        this.emit(`call void @${numericPrinter.name}(${this.toLLVMType(valueType)} ${this.coerceToType(value, valueType, valueType)})`);
        return '0';
      }
    }

    if (sym.ast && sym.kind === 'function') {
      return this.generateInternalCall(sym.name, args);
    }

    this.ensureExternalDeclaration(mangled, sym);
    const pts = sym.paramTypes || [], aStr = args.map((arg, i) => {
      const v = this.generateExpression(arg), t = pts[i] ?? this.getValueType(v);
      return `${this.toLLVMType(t)} ${this.coerceToType(v, this.getValueType(v), t)}`;
    }).join(', ');
    const rt = sym.llvmType || 'void';
    const llvmRt = this.toLLVMType(rt);
    if (llvmRt === 'void') { this.emit(`call void @${mangled}(${aStr})`); return '0'; }
    const t = this.newTemp(); this.emit(`${t} = call ${llvmRt} @${mangled}(${aStr})`); this.tempTypes.set(t, rt); return t;
  }

  private generateIndexExpr(e: IndexExpr): string {
    const base = (e.base as Identifier).name, idx = this.generateExpression(e.index), g = this.globals.get(base);
    const ePtr = this.newTemp(), t = this.newTemp();
    if (g && g.type.startsWith('[')) {
      const et = g.type.match(/\[.*? x (.*?)\]/)![1];
      this.emit(`${ePtr} = getelementptr inbounds ${g.type}, ptr @${g.name}, i32 0, i32 ${idx}`);
      this.emit(`${t} = load ${this.toLLVMType(et)}, ptr ${ePtr}, align 4`); this.tempTypes.set(t, et); return t;
    }
    const lt = this.localVarTypes.get(base) || 'i32';
    if (lt.startsWith('[')) {
      const et = lt.match(/\[.*? x (.*?)\]/)![1];
      this.emit(`${ePtr} = getelementptr inbounds ${lt}, ptr %${base}, i32 0, i32 ${idx}`);
      this.emit(`${t} = load ${this.toLLVMType(et)}, ptr ${ePtr}, align 4`); this.tempTypes.set(t, et); return t;
    }
    this.emit(`${ePtr} = getelementptr inbounds i32, ptr %${base}, i32 ${idx}`);
    this.emit(`${t} = load i32, ptr ${ePtr}, align 4`); this.tempTypes.set(t, 'i32'); return t;
  }

  private generateMemberExpr(e: MemberExpr): string {
    if (e.object.kind === ASTKind.Identifier) {
      const enumName = (e.object as Identifier).name;
      const en = this.enums.get(enumName);
      if (en && en.has(e.member)) return en.get(e.member)!.toString();
      const importedEnum = this.importedSymbols.get(enumName);
      if (importedEnum?.kind === 'enum' && importedEnum.ast) {
        const enumDecl = importedEnum.ast as EnumDecl;
        const member = enumDecl.members.find(m => m.name === e.member);
        if (member) {
          if (!this.enums.has(enumName)) this.processEnum(enumDecl);
          const resolved = this.enums.get(enumName);
          if (resolved && resolved.has(e.member)) return resolved.get(e.member)!.toString();
        }
      }
    }
    const obj = this.generateExpression(e.object);
    const objType = this.tempTypes.get(obj) || 'ptr';

    // Built-in string properties
    if (objType === 'string' || (objType === 'ptr' && (e.member === 'length' || e.member === 'byteLength'))) {
        if (e.member === 'length') {
            this.ensureExternalDeclaration('string_length', { name: 'string_length', kind: 'function', llvmType: 'i32', paramTypes: ['ptr'] } as any);
            const t = this.newTemp();
            this.emit(`${t} = call i32 @string_length(ptr ${obj})`);
            this.tempTypes.set(t, 'i32');
            return t;
        }
        if (e.member === 'byteLength') {
            this.ensureExternalDeclaration('string_byteLength', { name: 'string_byteLength', kind: 'function', llvmType: 'i32', paramTypes: ['ptr'] } as any);
            const t = this.newTemp();
            this.emit(`${t} = call i32 @string_byteLength(ptr ${obj})`);
            this.tempTypes.set(t, 'i32');
            return t;
        }
    }

    // Handle .address
    if (e.member === 'address') {
        if (!this.isUnsafeContext) {
            throw new Error(`.address is only allowed in @unsafe functions.`);
        }
        if (e.object.kind === ASTKind.Identifier) {
            const id = (e.object as Identifier).name;
            const lt = this.localVarTypes.get(id) || 'i32';
            const t = this.newTemp();
            const resType = `rawPtr<${lt}>`;
            this.emit(`${t} = bitcast ptr %${id} to ptr`);
            this.tempTypes.set(t, resType);
            return t;
        } else if (e.object.kind === ASTKind.MemberExpr) {
            // Get pointer to member instead of value
            const me = e.object as MemberExpr;
            const obj = this.generateExpression(me.object);
            const objType = this.tempTypes.get(obj) || 'ptr';
            const stName = (me.object.kind === ASTKind.ThisExpr) ? this.currentClassName! : 
                           (objType.startsWith('%') ? objType.substring(1) : ((this.classDecls.has(objType) || this.interfaceDecls.has(objType)) ? objType : this.guessStructTypeByVal(obj)));
            
            const structInfo = this.structs.get(stName);
            if (structInfo) {
                const fIdx = this.getFieldIndex(stName, me.member);
                const fieldType = structInfo.fields[fIdx] ? structInfo.fields[fIdx].type : 'i32';
                const fPtr = this.newTemp();
                this.emit(`${fPtr} = getelementptr inbounds %${stName}, ptr ${obj}, i32 0, i32 ${fIdx}`);
                this.tempTypes.set(fPtr, `rawPtr<${fieldType}>`);
                return fPtr;
            }
        }
    }

    // Built-in pointer properties
    if (this.isPointerType(objType) && e.member === 'get') {
        if (objType.startsWith('rawPtr<') && !this.isUnsafeContext) {
            throw new Error(`.get on rawPtr<T> is only allowed in @unsafe functions.`);
        }
        const innerType = this.getPointerInnerType(objType);
        const llvmInnerType = this.toLLVMType(innerType);
        const t = this.newTemp();
        this.emit(`${t} = load ${llvmInnerType}, ptr ${obj}, align ${this.getAlignment(innerType)}`);
        this.tempTypes.set(t, innerType);
        return t;
    }

    const stName = (e.object.kind === ASTKind.ThisExpr) ? this.currentClassName! : 
                   (objType.startsWith('%') ? objType.substring(1) : ((this.classDecls.has(objType) || this.interfaceDecls.has(objType)) ? objType : this.guessStructTypeByVal(obj)));
    
    const structInfo = this.structs.get(stName);
    if (!structInfo) {
        const t = this.newTemp();
        this.emit(`${t} = load i32, ptr ${obj}, align 4`);
        this.tempTypes.set(t, 'i32');
        return t;
    }
    const fIdx = this.getFieldIndex(stName, e.member);
    const fieldType = structInfo.fields[fIdx] ? structInfo.fields[fIdx].type : 'i32';
    
    const fPtr = this.newTemp();
    const t = this.newTemp();
    
    this.emit(`${fPtr} = getelementptr inbounds %${stName}, ptr ${obj}, i32 0, i32 ${fIdx}`);
    this.emit(`${t} = load ${this.toLLVMType(fieldType)}, ptr ${fPtr}, align ${this.getAlignment(fieldType)}`);
    this.tempTypes.set(t, fieldType);
    return t;
  }

  private generateAddressof(e: AddressofExpr): string {
    if (e.operand.kind === ASTKind.Identifier) {
      const id = (e.operand as Identifier).name, g = this.globals.get(id);
      let res = '';
      let type = 'ptr';
      if (g) {
        res = `@${g.name}`;
        type = `ptr<${g.type}>`;
      } else if (this.currentFunctionParams.has(id)) {
        res = `%${id}.addr`;
        type = `ptr<${this.currentFunctionParamTypes.get(id)}>`;
      } else {
        res = `%${id}`;
        type = `ptr<${this.localVarTypes.get(id) || 'i32'}>`;
      }
      this.tempTypes.set(res, type);
      return res;
    }
    return 'null';
  }

  private generateSizeofExpr(e: SizeofExpr): string {
    const llvmType = this.getLLVMType(e.targetType);
    const size = this.getTypeSize(llvmType);
    const t = this.newTemp();
    this.emit(`${t} = add i64 ${size}, 0`);
    this.tempTypes.set(t, 'i64');
    return t;
  }

  private getTypeAnnotationKey(t: TypeAnnotation): string {
    if (t.isPointer) {
      const prefix = t.isRawPointer ? 'rawPtr' : 'ptr';
      return `${prefix}_${this.getTypeAnnotationKey({ ...t, isPointer: false, isRawPointer: false })}`;
    }
    if (t.isArray) {
      const baseKey = this.getTypeAnnotationKey({ ...t, isArray: false, arraySize: undefined });
      return t.arraySize !== undefined ? `${baseKey}_arr_${t.arraySize}` : `${baseKey}_arr`;
    }

    let name = t.name;
    if (t.genericArgs && t.genericArgs.length > 0) {
      name += '_' + t.genericArgs.map(arg => this.getTypeAnnotationKey(arg)).join('_');
    }
    return name;
  }

  private resolveTypeName(t: TypeAnnotation): string {
    let name = t.name;
    if (t.genericArgs && t.genericArgs.length > 0) {
        if (this.genericClasses.has(name)) {
            name = this.instantiateClass(name, t.genericArgs);
        } else if (this.genericInterfaces.has(name)) {
            name = this.instantiateInterface(name, t.genericArgs);
        }
    }
    return name;
  }

  private getLLVMType(t: TypeAnnotation): string {
    if (t.isUnion && t.unionTypes) {
        let maxSize = 0;
        for (const ut of t.unionTypes) {
            const size = this.getTypeSize(this.getLLVMType(ut));
            if (size > maxSize) maxSize = size;
                }
        const llvmType = `{ i32, [${maxSize} x i8] }`;
        this.unionDefinitions.set(llvmType, t);
        return llvmType;
    }
    if (t.isTuple && t.tupleElements) {
      return `{ ${t.tupleElements.map(e => this.getLLVMType(e)).join(', ')} }`;
    }
    if (t.isPointer) {
        const prefix = t.isRawPointer ? 'rawPtr<' : 'ptr<';
        return `${prefix}${this.getLLVMTypeByName(t.name)}>`;
    }
    if (t.isArray) return `[${t.arraySize || 0} x ${this.getLLVMTypeByName(t.name)}]`;
    
    const name = this.resolveTypeName(t);
    if (name === 'string') return 'ptr';
    return this.getLLVMTypeByName(name);
  }

  private getLLVMTypeByName(n: string): string {
    if (this.typeAliases.has(n)) return this.getLLVMType(this.typeAliases.get(n)!);
    const map: Record<string, string> = { 
      'i8': 'i8', 'i16': 'i16', 'i32': 'i32', 'i64': 'i64', 'i128': 'i128',
      'u8': 'i8', 'u16': 'i16', 'u32': 'i32', 'u64': 'i64', 'u128': 'i128',
      'u1': 'i1', 'bool': 'i1', 'boolean': 'i1',
      'f16': 'half', 'half': 'half', 'bfloat': 'bfloat',
      'f32': 'float', 'float': 'float',
      'f64': 'double', 'double': 'double',
      'number': 'double',
      'void': 'void', 'string': 'ptr', 'fn': 'ptr',
      'null': 'i8', 'undefined': 'i8',
      'ptr': 'ptr', 'rawPtr': 'ptr'
    };
    if (map[n]) return map[n];
    if (this.classDecls.has(n) || this.interfaceDecls.has(n)) return `%${n}`;
    if (this.structDecls.has(n)) return `%${n}`;
    return (n === 'string') ? 'ptr' : 'i32';
  }

  private isClassType(llvmType: string): boolean {
    const name = llvmType.startsWith('%') ? llvmType.substring(1) : llvmType;
    return this.classDecls.has(name);
  }

  private isInterfaceType(llvmType: string): boolean {
    const name = llvmType.startsWith('%') ? llvmType.substring(1) : llvmType;
    return this.interfaceDecls.has(name);
  }

  private isStructType(llvmType: string): boolean {
    const name = llvmType.startsWith('%') ? llvmType.substring(1) : llvmType;
    return this.structDecls.has(name);
  }

  private isPointerType(t: string): boolean {
    return t === 'ptr' || t.startsWith('ptr<') || t.startsWith('rawPtr<') || t === 'string';
  }

  private getPointerInnerType(t: string): string {
    if (t.startsWith('ptr<') && t.endsWith('>')) {
        return t.substring(4, t.length - 1);
    }
    if (t.startsWith('rawPtr<') && t.endsWith('>')) {
        return t.substring(7, t.length - 1);
    }
    return 'i8';
  }

  private toLLVMType(t: string): string {
    if (this.isPointerType(t) || this.isClassType(t)) return 'ptr';
    if (t.startsWith('%') && this.interfaceDecls.has(t.substring(1))) return 'ptr';
    return t;
  }


  private generateAutoAllocation(targetPtr: string, val: string, innerType: string): string {
    const size = this.getTypeSize(innerType);
    const heapPtr = this.newTemp();
    this.ensureExternalDeclaration('tsn_malloc', { name: 'tsn_malloc', kind: 'function', llvmType: 'ptr', paramTypes: ['i32'] });
    this.emit(`${heapPtr} = call ptr @tsn_malloc(i32 ${size})`);
    
    // Store value into heap memory
    this.emit(`store ${this.toLLVMType(innerType)} ${val}, ptr ${heapPtr}, align ${this.getAlignment(innerType)}`);
    
    // Store heap pointer into local variable
    this.emit(`store ptr ${heapPtr}, ptr ${targetPtr}, align 8`);
    
    return heapPtr;
  }

  private generateManagedAssignment(id: string, newVal: string, innerType: string): void {
      const oldPtr = this.newTemp();
      this.emit(`${oldPtr} = load ptr, ptr %${id}, align 8`);
      this.ensureExternalDeclaration('memory_free', { name: 'memory_free', kind: 'function', llvmType: 'void', paramTypes: ['ptr'] });
      this.emit(`call void @memory_free(ptr ${oldPtr})`);
      this.generateAutoAllocation(`%${id}`, newVal, innerType);
  }

  private getAlignment(t: string): number { 
      if (t === 'i128') return 16;
      if (t === 'i64' || this.isPointerType(t) || this.isClassType(t) || this.isInterfaceType(t) || t === 'double') return 8;
      return 4; 
  }
  
  private getTypeSize(t: string, asStruct: boolean = false): number {
    if (t === 'i128') return 16;
    if (t === 'i64' || this.isPointerType(t) || t === 'double') return 8;
    if (!asStruct && (this.isClassType(t) || this.isInterfaceType(t))) return 8;
    if (t === 'i32' || t === 'f32' || t === 'float') return 4;
    if (t === 'i16' || t === 'f16' || t === 'half' || t === 'bfloat') return 2;
    if (t === 'i8' || t === 'i1') return 1;
    if (t.startsWith('%')) {
        const name = t.substring(1);
        const st = this.structs.get(name);
        if (st) {
            let size = 0;
            for (const f of st.fields) {
                const fs = this.getTypeSize(f.type);
                if (size % fs !== 0) size += (fs - (size % fs));
                size += fs;
            }
            if (size % 8 !== 0) size += (8 - (size % 8));
            return size;
        }
    }
    return 4;
  }

  private getValueType(v: string): string { 
    if (v.startsWith('@')) {
       const gName = v.substring(1);
       const g = this.globals.get(gName);
       if (g) return g.type;
       return 'ptr';
    }
    if (v.startsWith('%')) {
        const type = this.tempTypes.get(v);
        if (type) return type;
        // Fallback for LLVM structures
        return 'i32';
    }
    if (v === 'null') return 'ptr';
    if (v === '0' && this.lastExpressionWasUndefined) return 'i8';
    if (/^-?\d+\.\d+$/.test(v) || /^-?\d+e[+-]?\d+$/.test(v)) return 'double';
    return 'i32'; 
  }
  private getFieldIndex(s: string, f: string): number { 
    const info = this.structs.get(s); 
    if (!info) return 0;
    const idx = info.fields.findIndex(field => field.name === f);
    return idx === -1 ? 0 : idx;
  }
  private guessStructTypeByVal(v: string): string {
    if (this.tempTypes.has(v)) {
        const t = this.tempTypes.get(v)!;
        if (t.startsWith('%')) return t.substring(1);
    }
    // Search in local types
    for (const [name, type] of this.localVarTypes) {
        if (v === `%${name}` && type.startsWith('%')) return type.substring(1);
    }
    // Search in params
    if (v.startsWith('%')) {
        const name = v.substring(1).replace('.addr', '');
        const pt = this.currentFunctionParamTypes.get(name);
        if (pt && pt.startsWith('%')) return pt.substring(1);
    }
    return Array.from(this.structs.keys())[0] || 'Unknown';
  }

    private coerceToType(v: string, src: string, dest: string): string {
    const s = this.toLLVMType(src), d = this.toLLVMType(dest);
    if (d === 'ptr' && (v === '0' || src === 'undefined')) return 'null';
    if (s === d) return v;

    if (this.unionDefinitions.has(d)) {
        const unionType = this.unionDefinitions.get(d)!;
        const typeIndex = unionType.unionTypes?.findIndex(t => this.getLLVMType(t) === s);
        if (typeIndex !== undefined && typeIndex !== -1) {
            const tempUnion = this.newTemp();
            this.emit(`${tempUnion} = alloca ${d}, align 8`);
            
            // Clear union memory to avoid garbage
            const size = this.getTypeSize(d);
            this.emit(`call void @llvm.memset.p0.i64(ptr ${tempUnion}, i8 0, i64 ${size}, i1 false)`);
            this.ensureExternalDeclaration('llvm.memset.p0.i64', { name: 'memset', kind: 'function', llvmType: 'void', paramTypes: ['ptr', 'i8', 'i64', 'i1'] } as any);

            // Set Tag
            const tagPtr = this.newTemp();
            this.emit(`${tagPtr} = getelementptr inbounds ${d}, ptr ${tempUnion}, i32 0, i32 0`);
            this.emit(`store i32 ${typeIndex}, ptr ${tagPtr}, align 4`);
            
            // Set Data
            const dataPtr = this.newTemp();
            this.emit(`${dataPtr} = getelementptr inbounds ${d}, ptr ${tempUnion}, i32 0, i32 1`);
            this.emit(`store ${s} ${v}, ptr ${dataPtr}, align 1`);
            
            const result = this.newTemp();
            this.emit(`${result} = load ${d}, ptr ${tempUnion}, align 8`);
            this.tempTypes.set(result, d);
            return result;
        }
    }
    
    // Integer to Integer
    if (s.startsWith('i') && d.startsWith('i')) {
        const sSize = parseInt(s.substring(1)), dSize = parseInt(d.substring(1));
        if (sSize > dSize) { const t = this.newTemp(); this.emit(`${t} = trunc ${s} ${v} to ${d}`); this.tempTypes.set(t, d); return t; }
        if (sSize < dSize) { const t = this.newTemp(); this.emit(`${t} = sext ${s} ${v} to ${d}`); this.tempTypes.set(t, d); return t; }
    }
    
    // Float to Float
    if ((s === 'float' || s === 'double' || s === 'half') && (d === 'float' || d === 'double' || d === 'half')) {
        if (s === 'half' || (s === 'float' && d === 'double')) { const t = this.newTemp(); this.emit(`${t} = fpext ${s} ${v} to ${d}`); this.tempTypes.set(t, d); return t; }
        const t = this.newTemp(); this.emit(`${t} = fptrunc ${s} ${v} to ${d}`); this.tempTypes.set(t, d); return t;
    }

    // Integer to Float
    if (s.startsWith('i') && (d === 'float' || d === 'double')) {
        const t = this.newTemp(); this.emit(`${t} = sitofp ${s} ${v} to ${d}`); this.tempTypes.set(t, d); return t;
    }
    
    // Float to Integer
    if ((s === 'float' || s === 'double') && d.startsWith('i')) {
        const t = this.newTemp(); this.emit(`${t} = fptosi ${s} ${v} to ${d}`); this.tempTypes.set(t, d); return t;
    }

    // Pointer to Integer
    if (s === 'ptr' && d.startsWith('i')) {
        const t = this.newTemp(); this.emit(`${t} = ptrtoint ptr ${v} to ${d}`); this.tempTypes.set(t, d); return t;
    }
    
    // Integer to Pointer
    if (s.startsWith('i') && d === 'ptr') {
        const t = this.newTemp(); this.emit(`${t} = inttoptr ${s} ${v} to ptr`); this.tempTypes.set(t, d); return t;
    }


    // Pointer to Integer
    if (s === 'ptr' && d.startsWith('i')) {
        const t = this.newTemp(); this.emit(`${t} = ptrtoint ptr ${v} to ${d}`); this.tempTypes.set(t, d); return t;
    }
    // Integer to Pointer
    if (s.startsWith('i') && d === 'ptr') {
        const t = this.newTemp(); this.emit(`${t} = inttoptr ${s} ${v} to ptr`); this.tempTypes.set(t, d); return t;
    }

    if (src === 'i32' && dest === 'i1') {
      const t = `%${this.tempCounter}`;
      this.emit(`${t} = icmp ne i32 ${v}, 0`);
      this.tempCounter++;
      this.tempTypes.set(t, 'i1');
      return t;
    }
    if (src === 'i1' && dest === 'i32') {
      const t = `%${this.tempCounter}`;
      this.emit(`${t} = zext i1 ${v} to i32`);
      this.tempCounter++;
      this.tempTypes.set(t, 'i32');
      return t;
    }
    return v;
  }

  private escapeString(s: string): string {
    const bytes = new TextEncoder().encode(s);
    let escaped = '';
    for (const byte of bytes) {
      if (byte >= 32 && byte <= 126 && byte !== 34 && byte !== 92) {
        escaped += String.fromCharCode(byte);
      } else {
        escaped += `\\${byte.toString(16).toUpperCase().padStart(2, '0')}`;
      }
    }
    return escaped;
  }
  private newTemp(): string { return `%${this.tempCounter++}`; }
  private newLabel(p: string): string { return `${p}.${this.labelCounter++}`; }
  private emit(l: string): void { (this.currentOutput ?? this.output).push('  '.repeat(this.indent) + l); }

  private buildVTable(c: ClassDecl, customName?: string): void {
      if (c.typeParameters && c.typeParameters.length > 0) return;

      const className = customName || c.name;
      if (this.vTables.has(className)) return;

      const methodNames: string[] = [];
      const mangledNames: string[] = [];

      // 1. Kế thừa VTable từ lớp cha
      if (c.baseClassName) {
          const baseDecl = this.classDecls.get(c.baseClassName);
          if (baseDecl) {
              this.buildVTable(baseDecl);
              const baseVTable = this.vTables.get(c.baseClassName)!;
              methodNames.push(...baseVTable.methodNames);
              mangledNames.push(...baseVTable.mangledNames);
          }
      }

    // 2. Thêm các phương thức từ Interfaces
    if (c.implements) {
        for (const ifType of c.implements) {
            const ifName = ifType.name;
            const iface = this.interfaceDecls.get(ifName);
            if (iface) {
                for (const m of iface.methods) {
                    if (!methodNames.includes(m.name)) {
                        methodNames.push(m.name);
                        // Placeholder, will be replaced by class implementation or stay null
                        mangledNames.push('null'); 
                    }
                }
            }
        }
    }

      // 3. Cập nhật hoặc thêm mới các phương thức của lớp hiện tại
      for (const m of c.methods) {
          // Skip generic methods - they can't be in VTable since they need type arguments
          if (m.typeParameters && m.typeParameters.length > 0) {
              continue;
          }
          const idx = methodNames.indexOf(m.name);
          const currentMangled = this.mangleNameWithScope(c.name, m.name, m.params);
          if (idx !== -1) {
              // Override or Implement Interface
              mangledNames[idx] = currentMangled;
          } else {
              // New virtual method
              methodNames.push(m.name);
              mangledNames.push(currentMangled);
          }
      }

      this.vTables.set(className, { className: className, methodNames, mangledNames });
  }

  private mangleNameWithScope(scope: string, name: string, params: Parameter[]): string {
      const oldScope = this.scopeStack;
      this.scopeStack = [scope];
      const res = this.mangleName(name, params);
      this.scopeStack = oldScope;
      return res;
  }

  private emittedVTables: Set<string> = new Set();
  private generateVTable(v: VTableInfo): void {
      if (this.emittedVTables.has(v.className)) return;
      this.emittedVTables.add(v.className);
      
      if (v.mangledNames.length === 0) {
          this.emit(`@_VTable.${v.className} = private constant [1 x ptr] [ptr null], align 8`);
          return;
      }
      
      const entries = v.mangledNames.map(m => m === 'null' ? 'ptr null' : `ptr @${m}`).join(', ');
      this.emit(`@_VTable.${v.className} = private constant [${v.mangledNames.length} x ptr] [${entries}], align 8`);
  }

  private getInterfaceMethodInfo(ifName: string, methodName: string): FunctionInfo | null {
      const iface = this.interfaceDecls.get(ifName);
      if (!iface) return null;
      const m = iface.methods.find(m => m.name === methodName);
      if (!m) return null;
      return {
          name: methodName,
          returnType: this.getLLVMType(m.returnType),
          paramTypes: ['ptr', ...m.params.map(p => this.getFunctionParamStorageType(p))]
      };
  }
  private buildInterfaceVTable(i: InterfaceDecl): void {
      if (this.vTables.has(i.name)) return;
      const methodNames = i.methods.map(m => m.name);
      // Interfaces don't have mangled implementations, just a layout
      this.vTables.set(i.name, { className: i.name, methodNames, mangledNames: [] });
  }

  private instantiateClass(className: string, args: TypeAnnotation[]): string {
    if (args.some(arg => !this.isConcreteTypeAnnotation(arg))) return className;

    const mangledName = className + "_" + args.map(a => this.getTypeAnnotationKey(a)).join("_");
    if (this.instantiatedNames.has(mangledName)) return mangledName;

    const baseDecl = this.genericClasses.get(className);
    if (!baseDecl) {
      return className;
    }

    this.instantiatedNames.add(mangledName);

    const oldOutput = this.currentOutput;
    const oldInstantiationTargetOutput = this.instantiationTargetOutput;
    const instantiationOutput: string[] = [];
    const deferredInstantiationOutput: string[] = [];
    this.instantiationTargetOutput = deferredInstantiationOutput;
    this.currentOutput = instantiationOutput;

    // Deep clone and replace type parameters
    const typeMap = new Map<string, TypeAnnotation>();
    baseDecl.typeParameters?.forEach((p, i) => typeMap.set(p, args[i]));

    const instantiatedDecl: ClassDecl = this.cloneAndReplace(baseDecl, typeMap) as ClassDecl;
    instantiatedDecl.name = mangledName;
    instantiatedDecl.typeParameters = [];

    // Add to decls and generate
    this.classDecls.set(mangledName, instantiatedDecl);
    this.buildVTable(instantiatedDecl);
    
    const oldVTable = this.output.length;
    this.generateClassStruct(instantiatedDecl);
    const vinfo = this.vTables.get(mangledName)!;
    this.generateVTable(vinfo);
    
    // Register methods
    const oldScopeInst = this.scopeStack;
    this.scopeStack = [];
    this.scopeStack.push(mangledName);
    if (instantiatedDecl.constructorDecl) {
        const mName = this.mangleName('constructor', instantiatedDecl.constructorDecl.params);
        const pts = ['ptr', ...instantiatedDecl.constructorDecl.params.map(p => this.getFunctionParamStorageType(p))];
        const mInfo = { name: mName, returnType: 'void', paramTypes: pts, isExternal: false };
        this.functions.set(`${mangledName}.constructor`, mInfo as any);
        this.functions.set(mName, mInfo as any);
    }
    for (const m of instantiatedDecl.methods) {
        // If method has type parameters, register it as a generic method
        if (m.typeParameters && m.typeParameters.length > 0) {
            const key = `${mangledName}.${m.name}`;
            this.genericMethods.set(key, { classDecl: instantiatedDecl, method: m });
            continue;
        }
        const mName = this.mangleName(m.name, m.params);
        const rt = this.getLLVMType(m.returnType);
        const pts = ['ptr', ...m.params.map(p => this.getFunctionParamStorageType(p))];
        const mInfo = { name: mName, returnType: rt, paramTypes: pts, isExternal: false };
        this.functions.set(`${mangledName}.${m.name}`, mInfo as any);
        this.functions.set(mName, mInfo as any);
    }
    this.scopeStack = oldScopeInst;

    // Pre-instantiate generic helper calls used inside the concrete class body.
    if (instantiatedDecl.constructorDecl) {
      this.scanAndInstantiateNewExpr(instantiatedDecl.constructorDecl.body);
    }
    for (const method of instantiatedDecl.methods) {
      if (!method.typeParameters || method.typeParameters.length === 0) {
        this.scanAndInstantiateNewExpr(method.body);
      }
    }

    // Generate methods
    this.generateClassMethods(instantiatedDecl);

    const targetOutput = oldInstantiationTargetOutput ?? oldOutput ?? this.globalBuffer;
    targetOutput.push(...instantiationOutput, ...deferredInstantiationOutput);
    this.currentOutput = oldOutput;
    this.instantiationTargetOutput = oldInstantiationTargetOutput;
    return mangledName;
  }

  private isConcreteTypeAnnotation(type: TypeAnnotation | undefined): boolean {
    if (!type) return false;
    if (type.name.length === 1 && type.name >= 'A' && type.name <= 'Z' && !type.isPointer && !type.isArray && !type.isTuple && !type.isUnion) {
      return false;
    }
    if (type.genericArgs && type.genericArgs.some(arg => !this.isConcreteTypeAnnotation(arg))) {
      return false;
    }
    if (type.unionTypes && type.unionTypes.some(ut => !this.isConcreteTypeAnnotation(ut))) {
      return false;
    }
    if (type.tupleElements && type.tupleElements.some(elem => !this.isConcreteTypeAnnotation(elem))) {
      return false;
    }
    return true;
  }

  private instantiateTypeAnnotationClasses(type: TypeAnnotation): void {
    if (!type) return;
    
    // Check if this is a generic class that needs instantiation
    if (type.genericArgs && type.genericArgs.length > 0) {
      const className = type.name;
      if (this.genericClasses.has(className) && type.genericArgs.every(arg => this.isConcreteTypeAnnotation(arg))) {
        this.instantiateClass(className, type.genericArgs);
      }
    }
    
    // Recursively check generic arguments
    if (type.genericArgs) {
      for (const arg of type.genericArgs) {
        this.instantiateTypeAnnotationClasses(arg);
      }
    }
    
    // Check union types
    if (type.unionTypes) {
      for (const ut of type.unionTypes) {
        this.instantiateTypeAnnotationClasses(ut);
      }
    }
    
    // Check tuple elements
    if (type.tupleElements) {
      for (const elem of type.tupleElements) {
        this.instantiateTypeAnnotationClasses(elem);
      }
    }
  }

  private instantiateFunction(fnName: string, args: TypeAnnotation[]): string {
    if (args.some(arg => !this.isConcreteTypeAnnotation(arg))) return fnName;

    const scopeParts = fnName.includes('.') ? fnName.split('.').slice(0, -1) : [];
    const baseName = fnName.includes('.') ? fnName.split('.').slice(-1)[0] : fnName;
    const instantiatedBaseName = baseName + "_" + args.map(a => this.getTypeAnnotationKey(a)).join("_");
    const mangledName = scopeParts.length > 0 ? `${scopeParts.join('.')}.${instantiatedBaseName}` : instantiatedBaseName;
    if (this.instantiatedNames.has(mangledName)) return mangledName;

    const baseDecl = this.genericFunctions.get(fnName) || this.genericFunctions.get(baseName);
    if (!baseDecl) return fnName;

    this.instantiatedNames.add(mangledName);

    const typeMap = new Map<string, TypeAnnotation>();
    baseDecl.typeParameters?.forEach((p, i) => typeMap.set(p, args[i]));

    const instantiatedDecl: FunctionDecl = this.cloneAndReplace(baseDecl, typeMap) as FunctionDecl;
    instantiatedDecl.name = instantiatedBaseName;
    instantiatedDecl.typeParameters = [];
    if ((instantiatedDecl as any).returnType?.genericArgs?.some((arg: TypeAnnotation) => !this.isConcreteTypeAnnotation(arg))) {
      return fnName;
    }

    const oldScope = this.scopeStack;
    this.scopeStack = [...scopeParts];
    const mName = this.mangleName(instantiatedDecl.name, instantiatedDecl.params);
    const pts = instantiatedDecl.params.map(p => this.getFunctionParamStorageType(p));

    // Register early so recursive class/method generation can resolve helper calls
    // back to this instantiated function while we are still building its body.
    this.functions.set(mangledName, { name: mName, returnType: 'ptr', paramTypes: pts });
    this.functions.set(mName, { name: mName, returnType: 'ptr', paramTypes: pts });

    // Instantiate generic classes used in return type
    this.instantiateTypeAnnotationClasses(instantiatedDecl.returnType);

    // Instantiate generic classes used in parameter types
    for (const param of instantiatedDecl.params) {
      this.instantiateTypeAnnotationClasses(param.type);
    }

    // Scan function body for NewExpr and instantiate generic classes
    this.scanAndInstantiateNewExpr(instantiatedDecl.body);

    const rt = this.getFunctionReturnRuntimeType(instantiatedDecl.returnType);
    this.functions.set(mangledName, { name: mName, returnType: rt, paramTypes: pts });
    this.functions.set(mName, { name: mName, returnType: rt, paramTypes: pts });

    const oldOutput = this.currentOutput;
    const oldInstantiationTargetOutput = this.instantiationTargetOutput;
    const instantiationOutput: string[] = [];
    const deferredInstantiationOutput: string[] = [];
    this.instantiationTargetOutput = deferredInstantiationOutput;
    this.currentOutput = instantiationOutput;
    this.generateFunction(instantiatedDecl);
    const targetOutput = oldInstantiationTargetOutput ?? oldOutput ?? this.globalBuffer;
    targetOutput.push(...instantiationOutput, ...deferredInstantiationOutput);
    this.currentOutput = oldOutput;
    this.instantiationTargetOutput = oldInstantiationTargetOutput;
    this.scopeStack = oldScope;

    return mangledName;
  }

  private scanAndInstantiateNewExpr(stmts: Statement[]): void {
    const scanExpr = (expr: Expression): void => {
      if (!expr) return;
      
      if (expr.kind === ASTKind.NewExpr) {
        const newExpr = expr as NewExpr;
        if (newExpr.genericArgs && newExpr.genericArgs.length > 0) {
          this.instantiateClass(newExpr.className, newExpr.genericArgs);
        }
        // Scan constructor arguments
        if (newExpr.args) {
          for (const arg of newExpr.args) {
            scanExpr(arg);
          }
        }
      } else if (expr.kind === ASTKind.CallExpr) {
        const callExpr = expr as CallExpr;
        if (callExpr.callee.kind === ASTKind.Identifier && callExpr.genericArgs && callExpr.genericArgs.length > 0) {
          this.instantiateFunction((callExpr.callee as Identifier).name, callExpr.genericArgs);
        }
        if (callExpr.args) {
          for (const arg of callExpr.args) {
            scanExpr(arg);
          }
        }
      } else if (expr.kind === ASTKind.BinaryExpr) {
        const binExpr = expr as BinaryExpr;
        scanExpr(binExpr.left);
        scanExpr(binExpr.right);
      } else if (expr.kind === ASTKind.UnaryExpr) {
        const unExpr = expr as UnaryExpr;
        scanExpr(unExpr.operand);
      } else if (expr.kind === ASTKind.MemberExpr) {
        const memExpr = expr as MemberExpr;
        scanExpr(memExpr.object);
      } else if (expr.kind === ASTKind.IndexExpr) {
        const idxExpr = expr as IndexExpr;
        scanExpr(idxExpr.object);
        scanExpr(idxExpr.index);
      }
    };

    const scanStmt = (stmt: Statement): void => {
      if (!stmt) return;
      
      if (stmt.kind === ASTKind.VarDecl) {
        const varDecl = stmt as VarDecl;
        if (varDecl.init) scanExpr(varDecl.init);
      } else if (stmt.kind === ASTKind.ReturnStmt) {
        const retStmt = stmt as ReturnStmt;
        if (retStmt.value) scanExpr(retStmt.value);
      } else if (stmt.kind === ASTKind.IfStmt) {
        const ifStmt = stmt as IfStmt;
        scanExpr(ifStmt.condition);
        for (const nested of ifStmt.thenBranch) scanStmt(nested);
        if (ifStmt.elseBranch) {
          for (const nested of ifStmt.elseBranch) scanStmt(nested);
        }
      } else if (stmt.kind === ASTKind.WhileStmt) {
        const whileStmt = stmt as WhileStmt;
        scanExpr(whileStmt.condition);
        for (const nested of whileStmt.body) scanStmt(nested);
      } else if (stmt.kind === ASTKind.ForStmt) {
        const forStmt = stmt as ForStmt;
        if (forStmt.init) scanStmt(forStmt.init);
        if (forStmt.condition) scanExpr(forStmt.condition);
        if (forStmt.update) {
          if ((forStmt.update as Statement).kind !== undefined) scanStmt(forStmt.update as Statement);
          else scanExpr(forStmt.update as unknown as Expression);
        }
        for (const nested of forStmt.body) scanStmt(nested);
      } else if (stmt.kind === ASTKind.Assignment) {
        const assign = stmt as Assignment;
        scanExpr(assign.value);
      } else if (stmt.kind === ASTKind.ExprStmt) {
        const exprStmt = stmt as ExprStmt;
        scanExpr(exprStmt.expr);
      }
    };

    for (const stmt of stmts) {
      scanStmt(stmt);
    }
  }

  private instantiateMethod(className: string, methodName: string, args: TypeAnnotation[]): string {
    if (args.some(arg => !this.isConcreteTypeAnnotation(arg))) return methodName;

    const key = `${className}.${methodName}`;
    const mangledName = key + "_" + args.map(a => this.getTypeAnnotationKey(a)).join("_");
    if (this.instantiatedNames.has(mangledName)) return mangledName;

    const genericMethodInfo = this.genericMethods.get(key);
    if (!genericMethodInfo) return methodName;

    this.instantiatedNames.add(mangledName);

    const typeMap = new Map<string, TypeAnnotation>();
    genericMethodInfo.method.typeParameters?.forEach((p, i) => typeMap.set(p, args[i]));

    const instantiatedMethod: ClassMethod = this.cloneAndReplace(genericMethodInfo.method, typeMap) as ClassMethod;
    instantiatedMethod.name = methodName + "_" + args.map(a => this.getTypeAnnotationKey(a)).join("_");
    instantiatedMethod.typeParameters = [];
    if (instantiatedMethod.returnType?.genericArgs?.some((arg: TypeAnnotation) => !this.isConcreteTypeAnnotation(arg))) {
      return methodName;
    }

    const oldScope = this.scopeStack;
    const oldClassName = this.currentClassName;
    this.scopeStack = [className];
    this.currentClassName = className;

    const mName = this.mangleName(instantiatedMethod.name, instantiatedMethod.params);
    const rt = this.getFunctionReturnRuntimeType(instantiatedMethod.returnType);
    const pts = ['ptr', ...instantiatedMethod.params.map(p => this.getFunctionParamStorageType(p))];
    this.functions.set(mangledName, { name: mName, returnType: rt, paramTypes: pts });
    this.functions.set(mName, { name: mName, returnType: rt, paramTypes: pts });

    const oldOutput = this.currentOutput;
    const oldInstantiationTargetOutput = this.instantiationTargetOutput;
    const instantiationOutput: string[] = [];
    const deferredInstantiationOutput: string[] = [];
    this.instantiationTargetOutput = deferredInstantiationOutput;
    this.currentOutput = instantiationOutput;
    
    const fn = { 
      kind: ASTKind.FunctionDecl,
      name: instantiatedMethod.name, 
      params: instantiatedMethod.params, 
      returnType: instantiatedMethod.returnType, 
      body: instantiatedMethod.body, 
      isUnsafe: !!instantiatedMethod.isUnsafe,
      isDeclare: false 
    } as any;
    this.generateFunction(fn, true);
    
    const targetOutput = oldInstantiationTargetOutput ?? oldOutput ?? this.globalBuffer;
    targetOutput.push(...instantiationOutput, ...deferredInstantiationOutput);
    this.currentOutput = oldOutput;
    this.instantiationTargetOutput = oldInstantiationTargetOutput;
    this.currentClassName = oldClassName;
    this.scopeStack = oldScope;

    return mangledName;
  }

  private instantiateInterface(ifName: string, args: TypeAnnotation[]): string {
    if (args.some(arg => !this.isConcreteTypeAnnotation(arg))) return ifName;

    const mangledName = ifName + "_" + args.map(a => this.getTypeAnnotationKey(a)).join("_");
    if (this.instantiatedNames.has(mangledName)) return mangledName;

    const baseDecl = this.genericInterfaces.get(ifName);
    if (!baseDecl) return ifName;

    this.instantiatedNames.add(mangledName);

    const typeMap = new Map<string, TypeAnnotation>();
    baseDecl.typeParameters?.forEach((p, i) => typeMap.set(p, args[i]));

    const instantiatedDecl: InterfaceDecl = this.cloneAndReplace(baseDecl, typeMap) as InterfaceDecl;
    instantiatedDecl.name = mangledName;
    instantiatedDecl.typeParameters = [];

    const oldOutput = this.currentOutput;
    const oldInstantiationTargetOutput = this.instantiationTargetOutput;
    const instantiationOutput: string[] = [];
    const deferredInstantiationOutput: string[] = [];
    this.instantiationTargetOutput = deferredInstantiationOutput;
    this.currentOutput = instantiationOutput;
    // Add to decls and generate
    this.interfaceDecls.set(mangledName, instantiatedDecl);
    this.buildInterfaceVTable(instantiatedDecl);
    this.generateInterface(instantiatedDecl);
    const targetOutput = oldInstantiationTargetOutput ?? oldOutput ?? this.globalBuffer;
    targetOutput.push(...instantiationOutput, ...deferredInstantiationOutput);
    this.currentOutput = oldOutput;
    this.instantiationTargetOutput = oldInstantiationTargetOutput;

    return mangledName;
  }


  private cloneAndReplace(node: any, typeMap: Map<string, TypeAnnotation>): any {
      const cloneTypeAnnotation = (typeNode: any, seenTypes: WeakMap<object, any>, resolving: Set<string>): any => {
          if (!typeNode || typeof typeNode !== 'object') return typeNode;
          if (seenTypes.has(typeNode)) return seenTypes.get(typeNode);

          if (typeNode.name && typeof typeNode.name === 'string' && typeMap.has(typeNode.name)) {
              if (resolving.has(typeNode.name)) {
                  return { ...typeNode };
              }
              resolving.add(typeNode.name);
              const replacement = cloneTypeAnnotation(typeMap.get(typeNode.name)!, seenTypes, resolving);
              resolving.delete(typeNode.name);
              if (typeNode.isPointer || typeNode.isArray) {
                  return {
                      ...replacement,
                      isPointer: !!typeNode.isPointer,
                      isRawPointer: !!typeNode.isRawPointer,
                      isArray: !!typeNode.isArray,
                      arraySize: typeNode.arraySize,
                  };
              }
              return replacement;
          }

          const cloned = { ...typeNode };
          seenTypes.set(typeNode, cloned);
          if (cloned.genericArgs) cloned.genericArgs = cloned.genericArgs.map((arg: TypeAnnotation) => cloneTypeAnnotation(arg, seenTypes, resolving));
          if (cloned.unionTypes) cloned.unionTypes = cloned.unionTypes.map((arg: TypeAnnotation) => cloneTypeAnnotation(arg, seenTypes, resolving));
          if (cloned.tupleElements) cloned.tupleElements = cloned.tupleElements.map((arg: TypeAnnotation) => cloneTypeAnnotation(arg, seenTypes, resolving));
          return cloned;
      };

      const visit = (current: any, seen: WeakMap<object, any>): any => {
          if (!current || typeof current !== 'object') return current;
          if (Array.isArray(current)) return current.map(item => visit(item, seen));
          if (seen.has(current)) return seen.get(current);

          const isTypeAnnotationLike = !!current.name && typeof current.name === 'string' &&
              ('isPointer' in current || 'isArray' in current || 'genericArgs' in current || 'unionTypes' in current || 'tupleElements' in current);
          if (isTypeAnnotationLike) {
              return cloneTypeAnnotation(current, new WeakMap<object, any>(), new Set<string>());
          }

          const clone: any = { ...current };
          seen.set(current, clone);
          for (const key in clone) {
              clone[key] = visit(clone[key], seen);
          }

          if (clone.kind === ASTKind.NewExpr && typeof clone.className === 'string' && typeMap.has(clone.className)) {
              const replacement = typeMap.get(clone.className)!;
              clone.className = replacement.name;
              if (!clone.genericArgs && replacement.genericArgs && replacement.genericArgs.length > 0) {
                  clone.genericArgs = replacement.genericArgs.map((arg: TypeAnnotation) =>
                      cloneTypeAnnotation(arg, new WeakMap<object, any>(), new Set<string>())
                  );
              }
          }

          return clone;
      };

      return visit(node, new WeakMap<object, any>());
  }

  includeImportedModulePrograms(program: Program): Program {
    const declarations: Declaration[] = [];
    const included = new Set<string>();

    const visitProgram = (current: Program, keepImports: boolean) => {
      for (const decl of current.declarations) {
        if (decl.kind === ASTKind.ImportDecl) {
          const importDecl = decl as ImportDecl;
          declarations.push(decl);
          const moduleExports = this.moduleResolver.resolveModule(importDecl.source);
          if (moduleExports?.program && !included.has(moduleExports.modulePath)) {
            included.add(moduleExports.modulePath);
            visitProgram(moduleExports.program, false);
          }
          continue;
        }
        declarations.push(decl);
      }
    };

    visitProgram(program, true);
    return { ...program, declarations };
  }
}
