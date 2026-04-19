import { Program, Declaration, Statement, Expression, FunctionDecl, InterfaceDecl, VarDecl, Assignment, ReturnStmt, IfStmt, WhileStmt, ForStmt, ExprStmt, BreakStmt, ContinueStmt, BinaryExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr, Identifier, NumberLiteral, StringLiteral, BoolLiteral, NullLiteral, AddressofExpr, ASTKind, TypeAnnotation, ImportDecl, ExportDecl, EnumDecl, NamespaceDecl, Parameter, ClassDecl, ClassField, ClassMethod, NewExpr, ThisExpr } from './types.ts';
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
  private importedSymbols: Map<string, ExportedSymbol> = new Map();
  private importedModules: Map<string, ModuleExports> = new Map();
  private includedModulePaths: Set<string> = new Set();
  private externalDecls: string[] = [];
  private currentOutput: string[] | null = null;
  private globalBuffer: string[] = [];
  private exportedSymbols: ExportedSymbol[] = [];
  private isUnsafeContext: boolean = false;
  private lastExpressionWasUndefined: boolean = false;

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

  private emitCleanup(): void {
    const currentScope = this.cleanupStack[this.cleanupStack.length - 1];
    if (currentScope.size === 0) return;
    this.ensureExternalDeclaration('tsn_decRef', { name: 'tsn_decRef', kind: 'function', llvmType: 'void', paramTypes: ['ptr'] } as any);
    for (const varName of currentScope) {
      const ptr = this.newTemp();
      this.emit(`${ptr} = load ptr, ptr %${varName}, align 8`);
      this.emit(`call void @tsn_decRef(ptr ${ptr})`);
    }
  }

  getExportedSymbols(): ExportedSymbol[] {
    return this.exportedSymbols;
  }

  generate(program: Program): string {
    this.output = []; this.tempCounter = 0; this.labelCounter = 0; this.stringCounter = 0;
    this.externalDecls = []; this.exportedSymbols = [];
    this.globalBuffer = []; this.currentOutput = null;
    this.importedSymbols.clear(); this.importedModules.clear(); this.includedModulePaths.clear();

    // PRE-SCAN: Collect all signatures
    for (const decl of program.declarations) this.preScanDeclaration(decl);

    // Phase 2: Struct definitions
    for (const decl of program.declarations) this.generateStructsRecursive(decl);

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
      const pts = ['ptr', ...c.constructorDecl.params.map(p => this.getLLVMType(p.type))];
      this.functions.set(mName, { name: mName, returnType: 'void', paramTypes: pts });
      this.functions.set(ctorName, { name: mName, returnType: 'void', paramTypes: pts });
    }
      for (const m of c.methods) {
        const mName = this.mangleName(m.name, m.params);
        const rt = this.getLLVMType(m.returnType);
        const pts = ['ptr', ...m.params.map(p => this.getLLVMType(p.type))];
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
      const rt = this.getLLVMType(fn.returnType), pts = fn.params.map(p => this.getLLVMType(p.type));
      this.functions.set(mName, { name: mName, returnType: rt, paramTypes: pts, isExternal: !!fn.ffiLib || fn.isDeclare } as any);
      const scopedName = this.scopeStack.length > 0 ? this.scopeStack.join('.') + '.' + fn.name : fn.name;
      this.functions.set(scopedName, { name: mName, returnType: rt, paramTypes: pts, isExternal: !!fn.ffiLib || fn.isDeclare } as any);
    } else if (decl.kind === ASTKind.ExportDecl) this.preScanDeclaration((decl as ExportDecl).declaration);
  }

  private generateStructsRecursive(decl: Declaration): void {
    if (decl.kind === ASTKind.InterfaceDecl) this.generateInterface(decl as InterfaceDecl);
    else if (decl.kind === ASTKind.StructDecl) this.generateStruct(decl as StructDecl);
    else if (decl.kind === ASTKind.ClassDecl) this.generateClassStruct(decl as ClassDecl);
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
    if (decl.kind === ASTKind.VarDecl) this.generateGlobalConst(decl as VarDecl);
    else if (decl.kind === ASTKind.NamespaceDecl) {
      this.scopeStack.push((decl as NamespaceDecl).name);
      for (const sub of (decl as NamespaceDecl).body) this.generateGlobalsRecursive(sub);
      this.scopeStack.pop();
    } else if (decl.kind === ASTKind.ExportDecl) this.generateGlobalsRecursive((decl as ExportDecl).declaration);
  }

  private generateFunctionsRecursive(decl: Declaration): void {
    if (decl.kind === ASTKind.FunctionDecl) this.generateFunction(decl as FunctionDecl);
    else if (decl.kind === ASTKind.ClassDecl) this.generateClassMethods(decl as ClassDecl);
    else if (decl.kind === ASTKind.NamespaceDecl) {
      this.scopeStack.push((decl as NamespaceDecl).name);
      for (const sub of (decl as NamespaceDecl).body) this.generateFunctionsRecursive(sub);
      this.scopeStack.pop();
    } else if (decl.kind === ASTKind.ExportDecl) this.generateFunctionsRecursive((decl as ExportDecl).declaration);
  }

  private generateClassStruct(c: ClassDecl): void {
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
    this.structs.set(c.name, { name: c.name, fields, base: c.baseClassName });
    this.emit(`%${c.name} = type { ${llvmFields.join(', ')} }`);
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
    this.scopeStack.push(c.name); this.currentClassName = c.name;
    if (c.constructorDecl) {
      const fn = { 
        name: 'constructor', 
        params: c.constructorDecl.params, 
        returnType: { name: 'void', isPointer: false, isArray: false }, 
        body: c.constructorDecl.body, 
        isDeclare: false, 
        kind: ASTKind.FunctionDecl 
      } as any;
      this.generateFunction(fn, true);
    }
    for (const m of c.methods) {
      const fn = { 
        kind: ASTKind.FunctionDecl,
        name: m.name, 
        params: m.params, 
        returnType: m.returnType, 
        body: m.body, 
        isDeclare: false 
      } as any;
      this.generateFunction(fn, true);
    }
    this.currentClassName = null; this.scopeStack.pop();
  }

  private processImport(decl: ImportDecl): void {
    const exports = this.moduleResolver.resolveModule(decl.source);
    if (!exports) return;
    this.importedModules.set(decl.source, exports);
    const imported = this.moduleResolver.getImportedSymbols(decl, exports);
    for (const [name, sym] of imported) {
        this.importedSymbols.set(name, sym);
        if (sym.kind === 'class' && sym.ast) {
            this.genericClasses.set(name, sym.ast);
            this.classDecls.set(name, sym.ast); // Also add to classDecls to support VTable building
        } else if (sym.kind === 'function' && sym.ast && sym.ast.typeParameters && sym.ast.typeParameters.length > 0) {
            this.genericFunctions.set(name, sym.ast);
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
      for (const p of params) res += this.getLLVMType(p.type).replace(/ptr/g, 'p').replace(/\[|\]| /g, '');
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

  private generateGlobalConst(decl: VarDecl): void {
    const t = decl.type ? this.getLLVMType(decl.type) : 'i32';
    const mName = this.scopeStack.length > 0 ? this.scopeStack.join('_') + '_' + decl.name : decl.name;
    const isPointerLike = !!decl.type && (decl.type.isPointer || decl.type.name === 'string');
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
      this.emit(`@${mName} = ${decl.isConst ? 'constant' : 'global'} ${t} ${val}, align 4`);
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
    let paramsStr = decl.params.map(p => `${this.toLLVMType(this.getLLVMType(p.type))} %${p.name}`).join(', ');
    if (isMethod) paramsStr = `ptr %this${paramsStr ? ', ' + paramsStr : ''}`;

    if (decl.isDeclare || decl.ffiLib) {
      this.ensureExternalDeclaration(mName, {
        name: decl.name,
        kind: 'function',
        llvmType: rt,
        paramTypes: decl.params.map(p => this.getLLVMType(p.type)),
      } as any);
      return;
    }

    const oldRet = this.currentFunctionReturnType, oldParams = this.currentFunctionParams, oldParamTypes = this.currentFunctionParamTypes;
    const oldHoisted = this.hoistedVars, oldLocalVarTypes = this.localVarTypes;
    const oldUnsafe = this.isUnsafeContext;

    this.isUnsafeContext = !!decl.isUnsafe;

    this.currentFunctionParams.clear(); this.currentFunctionParamTypes.clear();
    this.currentFunctionReturnType = rt; this.hoistedVars.clear(); this.localVarTypes.clear();
    this.cleanupStack.push(new Set());

    if (isMethod) { this.currentFunctionParams.add('this'); this.currentFunctionParamTypes.set('this', 'ptr'); }
    for (const p of decl.params) { 
      this.currentFunctionParams.add(p.name); 
      const pt = p.type.name === 'string' ? 'string' : this.getLLVMType(p.type);
      this.currentFunctionParamTypes.set(p.name, pt); 
    }

    this.emit(`define ${rt} @${mName}(${paramsStr}) {`);
    this.emit('entry:'); this.indent++;

    if (isMethod) {
      this.emit(`%this.addr = alloca ptr, align 8`);
      this.emit(`store ptr %this, ptr %this.addr, align 8`);
    }
    for (const p of decl.params) {
      const t = this.getLLVMType(p.type);
      this.emit(`%${p.name}.addr = alloca ${t}, align ${this.getAlignment(t)}`);
      this.emit(`store ${t} %${p.name}, ptr %${p.name}.addr, align ${this.getAlignment(t)}`);
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
      if (rt === 'void') this.emit('ret void');
      else this.emit(`ret ${rt} 0`);
    }
    this.indent--; this.emit('}'); this.emit('');

    this.cleanupStack.pop();
    this.isUnsafeContext = oldUnsafe;
    this.currentFunctionReturnType = oldRet;
    this.currentFunctionParams = oldParams;
    this.currentFunctionParamTypes = oldParamTypes;
    this.hoistedVars = oldHoisted;
    this.localVarTypes = oldLocalVarTypes;
  }

  private collectVarDecls(stmts: Statement[]): { name: string; llvmType: string }[] {
    const vars: { name: string; llvmType: string }[] = [];
    for (const s of stmts) this.collectVarDeclsFromStmt(s, vars);
    return vars;
  }

  private collectVarDeclsFromStmt(s: Statement, out: { name: string; llvmType: string }[]): void {
    switch (s.kind) {
      case ASTKind.VarDecl: {
        const v = s as VarDecl;
        let lt = 'i32';
        if (v.type) {
            lt = this.getLLVMType(v.type);
        }
        else if (v.init && v.init.kind === ASTKind.NewExpr) lt = `%${(v.init as NewExpr).className}`;
        else if (v.init && v.init.kind === ASTKind.StringLiteral) lt = 'string';
        else if (v.init && v.init.kind === ASTKind.Identifier) {
           const id = (v.init as Identifier).name;
           const it = this.localVarTypes.get(id) || (this.currentFunctionParams.has(id) ? this.currentFunctionParamTypes.get(id) : 'i32');
           if (it) lt = it;
        } else if (v.init && v.init.kind === ASTKind.CallExpr) {
           const ce = v.init as CallExpr;
           if (ce.callee.kind === ASTKind.Identifier) {
               const name = (ce.callee as Identifier).name;
               const info = this.functions.get(this.resolveMangledName(name)) || this.functions.get(name);
               if (info) lt = info.returnType;
           } else if (ce.callee.kind === ASTKind.MemberExpr) {
               const m = ce.callee as MemberExpr;
               if (m.object.kind === ASTKind.Identifier) {
                  const fullName = `${(m.object as Identifier).name}.${m.member}`;
                  const imported = this.importedSymbols.get(fullName);
                  if (imported) {
                      if (ce.genericArgs && ce.genericArgs.length > 0 && imported.ast) {
                          const instName = this.instantiateFunction(fullName, ce.genericArgs);
                          const info = this.functions.get(instName);
                          if (info) lt = info.returnType;
                      } else lt = imported.llvmType || 'i32';
                  }
               }
           }
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
    if (this.isPointerType(t)) return 'ptr';
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
      this.emit(`store ${fieldType} ${this.coerceToType(val, vt, fieldType)}, ptr ${fPtr}, align ${this.getAlignment(fieldType)}`);
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
          this.ensureExternalDeclaration('tsn_decRef', { name: 'tsn_decRef', kind: 'function', llvmType: 'void', paramTypes: ['ptr'] });
          this.emit(`call void @tsn_decRef(ptr ${oldVal})`);
          this.emit(`store ${this.toLLVMType(lt)} ${val}, ptr %${id}, align 8`);
          if (s.value.kind === ASTKind.Identifier) {
              const srcId = (s.value as Identifier).name;
              this.emit(`store ptr null, ptr %${srcId}, align 8`);
          }
      } else {
          const lType = this.toLLVMType(lt);
          if (global) this.emit(`store ${lType} ${this.coerceToType(val, vt, lType)}, ptr @${global.name}, align 4`);
          else if (this.currentFunctionParams.has(id)) this.emit(`store ${lType} ${this.coerceToType(val, vt, lType)}, ptr %${id}.addr, align 4`);
          else this.emit(`store ${lType} ${this.coerceToType(val, vt, lType)}, ptr %${id}, align ${this.getAlignment(lt)}`);
      }
      return;
    }
  }

  private generateReturn(s: ReturnStmt): void {
    let finalVal: string | undefined;
    if (s.value) {
      finalVal = this.generateExpression(s.value);
    }

    this.emitCleanup();

    if (finalVal) {
      this.emit(`ret ${this.currentFunctionReturnType} ${this.coerceToType(finalVal, this.getValueType(finalVal), this.currentFunctionReturnType)}`);
    } else this.emit('ret void');
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
      default: return '0';
    }
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
    const size = this.getTypeSize(`%${className}`);
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
        return `${expectedT} ${this.coerceToType(a, actualT, expectedT)}`;
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
    const g = this.globals.get(e.name);
    if (g) {
      if (g.type.startsWith('[')) return `@${g.name}`;
      const t = this.newTemp(); this.emit(`${t} = load ${g.type}, ptr @${g.name}, align ${this.getAlignment(g.type)}`);
      this.tempTypes.set(t, g.type); return t;
    }
    if (this.currentFunctionParams.has(e.name)) {
      const pt = this.currentFunctionParamTypes.get(e.name)!;
      const t = this.newTemp(); this.emit(`${t} = load ${this.toLLVMType(pt)}, ptr %${e.name}.addr, align ${this.getAlignment(pt)}`);
      this.tempTypes.set(t, pt); return t;
    }
    const lt = this.localVarTypes.get(e.name) || 'i32';
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

  private generateBinaryExpr(e: BinaryExpr): string {
    const l = this.generateExpression(e.left), r = this.generateExpression(e.right), t = this.newTemp();
    const opMap: Record<string, string> = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'sdiv', '==': 'icmp eq', '!=': 'icmp ne', '<': 'icmp slt', '<=': 'icmp sle', '>': 'icmp sgt', '>=': 'icmp sge', '&&': 'and', '||': 'or' };
    const op = opMap[e.operator] || 'add';
    if (e.operator === '&&' || e.operator === '||') {
      const l1 = this.coerceToType(l, this.getValueType(l), 'i1'), r1 = this.coerceToType(r, this.getValueType(r), 'i1');
      this.emit(`${t} = ${op} i1 ${l1}, ${r1}`); this.tempTypes.set(t, 'i1'); return t;
    }
    const lt = this.getValueType(l), rt = (lt === 'ptr' || r === 'null') ? 'ptr' : 'i32';
    
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

    this.emit(`${t} = ${op} ${rt} ${l}, ${r}`); this.tempTypes.set(t, op.startsWith('icmp') ? 'i1' : 'i32'); return t;
  }

  private generateUnaryExpr(e: UnaryExpr): string {
    const v = this.generateExpression(e.operand);
    if (e.operator === '-') {
        const t = this.newTemp();
        this.emit(`${t} = sub i32 0, ${v}`);
        this.tempTypes.set(t, 'i32');
        return t;
    } else {
        const cond = this.coerceToType(v, this.getValueType(v), 'i1');
        const t = this.newTemp();
        this.emit(`${t} = xor i1 ${cond}, true`);
        this.tempTypes.set(t, 'i1');
        return t;
    }
  }

  private generateInternalCall(name: string, args: Expression[]): string {
    const info = this.functions.get(name);
    const aStr = args.map((arg, i) => {
      const v = this.generateExpression(arg), t = info && info.paramTypes[i] ? info.paramTypes[i] : this.getValueType(v);
      return `${this.toLLVMType(t)} ${this.coerceToType(v, this.getValueType(v), t)}`;
    }).join(', ');
    const rt = info ? info.returnType : 'i32';
    const llvmRt = this.toLLVMType(rt);
    const actualName = info ? info.name : name;
    if (llvmRt === 'void') { this.emit(`call void @${actualName}(${aStr})`); return '0'; }
    const t = this.newTemp();
    this.emit(`${t} = call ${llvmRt} @${actualName}(${aStr})`);
    this.tempTypes.set(t, rt);
    return t;
  }

  private generateCallExpr(e: CallExpr): string {
    if (e.callee.kind === ASTKind.MemberExpr) return this.generateMemberCallExpr(e);
    
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
    if (e.genericArgs && e.genericArgs.length > 0) {
        name = this.instantiateFunction(name, e.genericArgs);
    }
    const mangled = this.resolveMangledName(name);
    const imported = this.importedSymbols.get(name);
    if (imported && imported.kind === 'function') {
        this.ensureExternalDeclaration(name, imported);
        return this.generateImportedCall(name, name, imported, e.args);
    }
    const info = this.functions.get(mangled) || this.functions.get(name);
    
    const actualName = (info && (info as any).isExternal) ? (info as any).name : mangled;
    
    const args = e.args.map((arg, i) => {
      const v = this.generateExpression(arg);
      const actualT = this.getValueType(v);
      const expectedT = info && info.paramTypes[i] ? info.paramTypes[i] : actualT;
      return `${this.toLLVMType(expectedT)} ${this.coerceToType(v, actualT, expectedT)}`;
    }).join(', ');
    const rt = info ? info.returnType : 'i32';
    const llvmRt = this.toLLVMType(rt);
    if (llvmRt === 'void') { this.emit(`call void @${actualName}(${args})`); return '0'; }
    const t = this.newTemp(); this.emit(`${t} = call ${llvmRt} @${actualName}(${args})`); this.tempTypes.set(t, rt); return t;
  }

  private generateMemberCallExpr(e: CallExpr): string {
    const m = e.callee as MemberExpr;
    
    // Handle imported symbols (e.g., console.log, option.Some)
    if (m.object.kind === ASTKind.Identifier) {
        const objName = (m.object as Identifier).name;
        const fullName = `${objName}.${m.member}`;
        const imported = this.importedSymbols.get(fullName);
        if (imported) {
            if (e.genericArgs && e.genericArgs.length > 0 && imported.ast && imported.ast.typeParameters) {
                // Monomorphize imported generic function
                this.genericFunctions.set(fullName, imported.ast);
                const instName = this.instantiateFunction(fullName, e.genericArgs);
                return this.generateInternalCall(instName, e.args);
            }
            const mangledName = `${objName}_${m.member}`;
            return this.generateImportedCall(fullName, mangledName, imported, e.args);
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
    const objType = this.tempTypes.get(obj) || 'ptr';
    
    // Built-in string methods
    if (objType === 'string') {
        const stringMethods: Record<string, { func: string, rt: string, pts: string[] }> = {
            'includes':   { func: 'string_includes',   rt: 'i1',  pts: ['ptr', 'ptr'] },
            'indexOf':    { func: 'string_indexOf',    rt: 'i32', pts: ['ptr', 'ptr'] },
            'startsWith': { func: 'string_startsWith', rt: 'i1',  pts: ['ptr', 'ptr'] },
            'endsWith':   { func: 'string_endsWith',   rt: 'i1',  pts: ['ptr', 'ptr'] },
        };

        const method = stringMethods[m.member];
        if (method) {
            this.ensureExternalDeclaration(method.func, { name: method.func, kind: 'function', llvmType: method.rt, paramTypes: method.pts } as any);
            const search = this.generateExpression(e.args[0]);
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
        const val = this.generateExpression(e.args[0]);
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
                const args = e.args.map((arg, i) => {
                    const v = this.generateExpression(arg);
                    const actualT = this.getValueType(v);
                    const expectedT = info && info.paramTypes[i + 1] ? info.paramTypes[i + 1] : actualT;
                    return `${this.toLLVMType(expectedT)} ${this.coerceToType(v, actualT, expectedT)}`;
                }).join(', ');
                const aStr = [`ptr ${obj}`, ...args.length ? [args] : []].join(', ');
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
    const resolvedName = this.resolveMangledName(dotName);
    const info = this.functions.get(resolvedName) || this.functions.get(dotName);
    const args = e.args.map((arg, i) => {
      const v = this.generateExpression(arg);
      const actualT = this.getValueType(v);
      const expectedT = info && info.paramTypes[i + 1] ? info.paramTypes[i + 1] : actualT;
      return `${this.toLLVMType(expectedT)} ${this.coerceToType(v, actualT, expectedT)}`;
    }).join(', ');
    const rt = info ? info.returnType : 'i32';
    const llvmRt = this.toLLVMType(rt);
    const actualName = info ? info.name : (resolvedName.includes('.') ? resolvedName : dotName);
    const aStr = [`ptr ${obj}`, ...args.length ? [args] : []].join(', ');

    if (info && (info as any).isExternal) {
      this.ensureExternalDeclaration(actualName, info as any);
    } else if (!info && !this.functions.has(actualName) && actualName.includes('.')) {
        // Handle possible missing method declaration (e.g. from imported classes)
        const [clsName, methName] = actualName.split('.');
        console.log(`🔍 Checking imported symbol for ${clsName}`);
        const sym = this.importedSymbols.get(clsName);
        if (sym && sym.kind === 'class' && sym.ast) {
             const method = (sym.ast as ClassDecl).methods.find(m => m.name === methName);
             if (method) {
                 const mName = this.mangleNameWithScope(clsName, methName, method.params);
                 const mInfo = {
                     name: mName,
                     kind: 'function',
                     llvmType: this.getLLVMType(method.returnType),
                     paramTypes: ['ptr', ...method.params.map(p => this.getLLVMType(p.type))]
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
      this.emit(`${t} = load ${et}, ptr ${ePtr}, align 4`); this.tempTypes.set(t, et); return t;
    }
    const lt = this.localVarTypes.get(base) || 'i32';
    if (lt.startsWith('[')) {
      const et = lt.match(/\[.*? x (.*?)\]/)![1];
      this.emit(`${ePtr} = getelementptr inbounds ${lt}, ptr %${base}, i32 0, i32 ${idx}`);
      this.emit(`${t} = load ${et}, ptr ${ePtr}, align 4`); this.tempTypes.set(t, et); return t;
    }
    this.emit(`${ePtr} = getelementptr inbounds i32, ptr %${base}, i32 ${idx}`);
    this.emit(`${t} = load i32, ptr ${ePtr}, align 4`); this.tempTypes.set(t, 'i32'); return t;
  }

  private generateMemberExpr(e: MemberExpr): string {
    if (e.object.kind === ASTKind.Identifier) {
      const en = this.enums.get((e.object as Identifier).name);
      if (en && en.has(e.member)) return en.get(e.member)!.toString();
    }
    const obj = this.generateExpression(e.object);
    const objType = this.tempTypes.get(obj) || 'ptr';

    // Built-in string properties
    if (objType === 'string') {
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
    this.emit(`${t} = load ${fieldType}, ptr ${fPtr}, align ${this.getAlignment(fieldType)}`);
    this.tempTypes.set(t, fieldType);
    return t;
  }

  private generateAddressof(e: AddressofExpr): string {
    if (e.operand.kind === ASTKind.Identifier) {
      const id = (e.operand as Identifier).name, g = this.globals.get(id);
      if (g) return `@${g.name}`; if (this.currentFunctionParams.has(id)) return `%${id}.addr`; return `%${id}`;
    }
    return 'null';
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
      'void': 'void', 'string': 'ptr',
      'null': 'i8', 'undefined': 'i8'
    };
    if (map[n]) return map[n];
    if (this.classDecls.has(n) || this.interfaceDecls.has(n)) return 'ptr';
    if (this.structDecls.has(n)) return `%${n}`;
    return (n === 'string') ? 'ptr' : 'i32';
  }

  private isClassType(llvmType: string): boolean {
    const name = llvmType.startsWith('%') ? llvmType.substring(1) : llvmType;
    return this.classDecls.has(name);
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
    if (this.isPointerType(t)) return 'ptr';
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
      if (t === 'i64' || this.isPointerType(t) || t === 'double') return 8;
      return 4; 
  }
  
  private getTypeSize(t: string): number {
    if (t === 'i128') return 16;
    if (t === 'i64' || this.isPointerType(t) || t === 'double') return 8;
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

    if (src === 'i32' && dest === 'i1') { const t = this.newTemp(); this.emit(`${t} = icmp ne i32 ${v}, 0`); this.tempTypes.set(t, 'i1'); return t; }
    if (src === 'i1' && dest === 'i32') { const t = this.newTemp(); this.emit(`${t} = zext i1 ${v} to i32`); this.tempTypes.set(t, 'i32'); return t; }
    return v;
  }

  private escapeString(s: string): string { return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\0A').replace(/\t/g, '\\09').replace(/"/g, '\\"'); }
  private newTemp(): string { return `%${this.tempCounter++}`; }
  private newLabel(p: string): string { return `${p}.${this.labelCounter++}`; }
  private emit(l: string): void { (this.currentOutput ?? this.output).push('  '.repeat(this.indent) + l); }

  private buildVTable(c: ClassDecl): void {
      if (this.vTables.has(c.name)) return;

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

      this.vTables.set(c.name, { className: c.name, methodNames, mangledNames });
  }

  private mangleNameWithScope(scope: string, name: string, params: Parameter[]): string {
      const oldScope = this.scopeStack;
      this.scopeStack = [scope];
      const res = this.mangleName(name, params);
      this.scopeStack = oldScope;
      return res;
  }

  private generateVTable(v: VTableInfo): void {
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
          paramTypes: ['ptr', ...m.params.map(p => this.getLLVMType(p.type))]
      };
  }
  private buildInterfaceVTable(i: InterfaceDecl): void {
      if (this.vTables.has(i.name)) return;
      const methodNames = i.methods.map(m => m.name);
      // Interfaces don't have mangled implementations, just a layout
      this.vTables.set(i.name, { className: i.name, methodNames, mangledNames: [] });
  }

  private instantiateClass(className: string, args: TypeAnnotation[]): string {
    const mangledName = className + "_" + args.map(a => a.name).join("_");
    if (this.instantiatedNames.has(mangledName)) return mangledName;

    const baseDecl = this.genericClasses.get(className);
    if (!baseDecl) return className;

    this.instantiatedNames.add(mangledName);

    const oldOutput = this.currentOutput;
    this.currentOutput = this.globalBuffer;

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
    this.scopeStack.push(mangledName);
    if (instantiatedDecl.constructorDecl) {
        const mName = this.mangleName('constructor', instantiatedDecl.constructorDecl.params);
        const pts = ['ptr', ...instantiatedDecl.constructorDecl.params.map(p => this.getLLVMType(p.type))];
        this.functions.set(`${mangledName}.constructor`, { name: mName, returnType: 'void', paramTypes: pts });
    }
    for (const m of instantiatedDecl.methods) {
        const mName = this.mangleName(m.name, m.params);
        const rt = this.getLLVMType(m.returnType);
        const pts = ['ptr', ...m.params.map(p => this.getLLVMType(p.type))];
        this.functions.set(`${mangledName}.${m.name}`, { name: mName, returnType: rt, paramTypes: pts });
    }
    this.scopeStack.pop();

    // Generate methods
    this.generateClassMethods(instantiatedDecl);

    this.currentOutput = oldOutput;
    return mangledName;
  }

  private instantiateFunction(fnName: string, args: TypeAnnotation[]): string {
    const mangledName = fnName + "_" + args.map(a => a.name).join("_");
    if (this.instantiatedNames.has(mangledName)) return mangledName;

    const baseDecl = this.genericFunctions.get(fnName);
    if (!baseDecl) return fnName;

    this.instantiatedNames.add(mangledName);

    const typeMap = new Map<string, TypeAnnotation>();
    baseDecl.typeParameters?.forEach((p, i) => typeMap.set(p, args[i]));

    const instantiatedDecl: FunctionDecl = this.cloneAndReplace(baseDecl, typeMap) as FunctionDecl;
    instantiatedDecl.name = mangledName;
    instantiatedDecl.typeParameters = [];

    const mName = this.mangleName(instantiatedDecl.name, instantiatedDecl.params);
    const rt = this.getLLVMType(instantiatedDecl.returnType);
    const pts = instantiatedDecl.params.map(p => this.getLLVMType(p.type));
    this.functions.set(mangledName, { name: mName, returnType: rt, paramTypes: pts });

    const oldOutput = this.currentOutput;
    this.currentOutput = this.globalBuffer;
    this.generateFunction(instantiatedDecl);
    this.currentOutput = oldOutput;

    return mangledName;
  }

  private instantiateInterface(ifName: string, args: TypeAnnotation[]): string {
    const mangledName = ifName + "_" + args.map(a => a.name).join("_");
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
    this.currentOutput = this.globalBuffer;
    // Add to decls and generate
    this.interfaceDecls.set(mangledName, instantiatedDecl);
    this.buildInterfaceVTable(instantiatedDecl);
    this.generateInterface(instantiatedDecl);
    this.currentOutput = oldOutput;

    return mangledName;
  }


  private cloneAndReplace(node: any, typeMap: Map<string, TypeAnnotation>): any {
      if (!node || typeof node !== 'object') return node;
      if (Array.isArray(node)) return node.map(n => this.cloneAndReplace(n, typeMap));

      // If it's a TypeAnnotation, check if it's a generic parameter
      if (node.name && typeof node.name === 'string' && typeMap.has(node.name) && node.isPointer === false && node.isArray === false) {
          const replacement = typeMap.get(node.name)!;
          return { ...node, name: replacement.name, isPointer: replacement.isPointer, isArray: replacement.isArray, arraySize: replacement.arraySize, genericArgs: replacement.genericArgs };
      }

      const newNode: any = { ...node };
      for (const key in newNode) {
          newNode[key] = this.cloneAndReplace(newNode[key], typeMap);
      }
      return newNode;
  }

  includeImportedModulePrograms(program: Program): Program {
    const declarations: Declaration[] = [];
    const included = new Set<string>();

    const visitProgram = (current: Program, keepImports: boolean) => {
      for (const decl of current.declarations) {
        if (decl.kind === ASTKind.ImportDecl) {
          const importDecl = decl as ImportDecl;
          if (keepImports) declarations.push(decl);
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
