import { Program, Declaration, Statement, Expression, FunctionDecl, InterfaceDecl, VarDecl, Assignment, ReturnStmt, IfStmt, WhileStmt, ForStmt, ExprStmt, BreakStmt, ContinueStmt, BinaryExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr, Identifier, NumberLiteral, StringLiteral, BoolLiteral, NullLiteral, AddressofExpr, ASTKind, TypeAnnotation, ImportDecl, ExportDecl, EnumDecl, NamespaceDecl, Parameter, ClassDecl, ClassField, ClassMethod, NewExpr, ThisExpr } from './types.ts';
import { ModuleResolver, ExportedSymbol } from './module-resolver.ts';

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

export class CodeGenerator {
  private output: string[] = [];
  private indent: number = 0;
  private tempCounter: number = 0;
  private labelCounter: number = 0;
  private stringCounter: number = 0;
  private structs: Map<string, StructInfo> = new Map();
  private globals: Map<string, GlobalInfo> = new Map();
  private functions: Map<string, FunctionInfo> = new Map();
  private typeAliases: Map<string, TypeAnnotation> = new Map();
  private enums: Map<string, Map<string, number>> = new Map();
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
  private externalDecls: string[] = [];
  private exportedSymbols: ExportedSymbol[] = [];

  constructor(moduleResolver?: ModuleResolver) {
    this.moduleResolver = moduleResolver ?? new ModuleResolver('.');
  }

  getExportedSymbols(): ExportedSymbol[] {
    return this.exportedSymbols;
  }

  generate(program: Program): string {
    this.output = []; this.tempCounter = 0; this.labelCounter = 0; this.stringCounter = 0;
    this.externalDecls = []; this.exportedSymbols = [];

    // PRE-SCAN: Collect all signatures
    for (const decl of program.declarations) this.preScanDeclaration(decl);

    // Phase 2: Struct definitions
    for (const decl of program.declarations) this.generateStructsRecursive(decl);

    // Phase 3: Global variables
    for (const decl of program.declarations) this.generateGlobalsRecursive(decl);

    const stringLiteralMarkerIdx = this.output.length;
    this.emit('; String literals -- PLACEHOLDER');
    this.emit('');

    // Phase 4: Function definitions
    for (const decl of program.declarations) this.generateFunctionsRecursive(decl);

    // Finalize string literals
    const strLines: string[] = ['; String literals'];
    for (const [globalName, value] of this.stringLiterals) {
      const escaped = this.escapeString(value);
      const len = value.length + 1;
      strLines.push(`${globalName} = private unnamed_addr constant [${len} x i8] c"${escaped}\\00", align 1`);
    }
    this.output.splice(stringLiteralMarkerIdx, 2, ...strLines, '');

    if (this.externalDecls.length > 0) this.output.unshift(...this.externalDecls, '');
    return this.output.join('\n');
  }

  private preScanDeclaration(decl: Declaration): void {
    if (decl.kind === ASTKind.ImportDecl) this.processImport(decl as ImportDecl);
    else if (decl.kind === ASTKind.TypeAliasDecl) this.typeAliases.set((decl as TypeAliasDecl).name, (decl as TypeAliasDecl).type);
    else if (decl.kind === ASTKind.EnumDecl) this.processEnum(decl as EnumDecl);
    else if (decl.kind === ASTKind.NamespaceDecl) {
      const ns = decl as NamespaceDecl; this.scopeStack.push(ns.name);
      for (const sub of ns.body) this.preScanDeclaration(sub);
      this.scopeStack.pop();
    } else if (decl.kind === ASTKind.ClassDecl) {
      const c = decl as ClassDecl; this.scopeStack.push(c.name);
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
    } else if (decl.kind === ASTKind.FunctionDecl) {
      const fn = decl as FunctionDecl;
      const mName = this.mangleName(fn.name, fn.params, !!fn.ffiLib);
      const rt = this.getLLVMType(fn.returnType), pts = fn.params.map(p => this.getLLVMType(p.type));
      this.functions.set(mName, { name: mName, returnType: rt, paramTypes: pts, isExternal: !!fn.ffiLib } as any);
      const scopedName = this.scopeStack.length > 0 ? this.scopeStack.join('.') + '.' + fn.name : fn.name;
      this.functions.set(scopedName, { name: mName, returnType: rt, paramTypes: pts, isExternal: !!fn.ffiLib } as any);
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
    const fields: { name: string; type: string }[] = [], llvm: string[] = [];
    for (const f of decl.fields) { const t = this.getLLVMType(f.type); fields.push({ name: f.name, type: t }); llvm.push(t); }
    this.structs.set(decl.name, { name: decl.name, fields });
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
    const llvmFields: string[] = ['i32']; // index 0: _refCount
    fields.push({ name: '_refCount', type: 'i32' });
    for (const f of c.fields) {
      const t = this.getLLVMType(f.type);
      fields.push({ name: f.name, type: t }); llvmFields.push(t);
    }
    this.structs.set(c.name, { name: c.name, fields });
    this.emit(`%${c.name} = type { ${llvmFields.join(', ')} }`);
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
    const imported = this.moduleResolver.getImportedSymbols(decl, exports);
    for (const [name, sym] of imported) this.importedSymbols.set(name, sym);
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
    if (this.externalDecls.some(l => l.includes(`@${mangled}(`))) return;
    if (sym.kind === 'function') {
      const params = (sym.paramTypes || []).join(', ');
      this.externalDecls.push(`declare ${sym.llvmType} @${mangled}(${params})`);
    }
  }

  private generateGlobalConst(decl: VarDecl): void {
    const t = decl.type ? this.getLLVMType(decl.type) : 'i32';
    const mName = this.scopeStack.length > 0 ? this.scopeStack.join('_') + '_' + decl.name : decl.name;
    if (decl.type?.isArray) {
      const size = decl.type.arraySize || 0, et = this.getLLVMType({ name: decl.type.name, isPointer: false, isArray: false });
      this.globals.set(decl.name, { name: mName, type: `[${size} x ${et}]`, isConst: decl.isConst });
      this.emit(`@${mName} = ${decl.isConst ? 'constant' : 'global'} [${size} x ${et}] zeroinitializer, align 4`);
    } else if (decl.type?.isPointer && decl.init?.kind === ASTKind.NumberLiteral && (decl.init as NumberLiteral).value === 0) {
      this.globals.set(decl.name, { name: mName, type: t, isConst: decl.isConst });
      this.emit(`@${mName} = ${decl.isConst ? 'constant' : 'global'} ${t} null, align 8`);
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
    const mName = this.mangleName(decl.name, decl.params, !!decl.ffiLib);
    const rt = this.getLLVMType(decl.returnType);
    let paramsStr = decl.params.map(p => `${this.getLLVMType(p.type)} %${p.name}`).join(', ');
    if (isMethod) paramsStr = `ptr %this${paramsStr ? ', ' + paramsStr : ''}`;

    if (decl.isDeclare || decl.ffiLib) { this.emit(`declare ${rt} @${mName}(${paramsStr})`); return; }

    this.currentFunctionParams.clear(); this.currentFunctionParamTypes.clear();
    this.currentFunctionReturnType = rt; this.hoistedVars.clear(); this.localVarTypes.clear();

    if (isMethod) { this.currentFunctionParams.add('this'); this.currentFunctionParamTypes.set('this', 'ptr'); }
    for (const p of decl.params) { this.currentFunctionParams.add(p.name); this.currentFunctionParamTypes.set(p.name, this.getLLVMType(p.type)); }

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
        seen.add(name); this.emit(`%${name} = alloca ${llvmType}, align ${this.getAlignment(llvmType)}`);
        this.hoistedVars.add(name); this.localVarTypes.set(name, llvmType);
      }
    }

    for (const s of decl.body) this.generateStatement(s);

    if (decl.body.length === 0 || decl.body[decl.body.length - 1].kind !== ASTKind.ReturnStmt) {
      // Ownership: Cleanup local Heap objects before return
      const currentLocals = Array.from(this.localVarTypes.entries());
      if (currentLocals.some(([_, lt]) => this.isClassType(lt))) {
        this.ensureExternalDeclaration('memory_free', { name: 'free', kind: 'function', llvmType: 'void', paramTypes: ['ptr'] });
        for (const [name, lt] of currentLocals) {
            if (this.isClassType(lt)) {
                const v = this.newTemp();
                this.emit(`${v} = load ptr, ptr %${name}, align 8`);
                this.emit(`call void @memory_free(ptr ${v})`);
            }
        }
      }
      if (rt === 'void') this.emit('ret void');
      else this.emit(`ret ${rt} 0`);
    }
    this.indent--; this.emit('}'); this.emit('');
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
        if (v.type) lt = this.getLLVMType(v.type);
        else if (v.init && v.init.kind === ASTKind.NewExpr) lt = 'ptr';
        else if (v.init && v.init.kind === ASTKind.StringLiteral) lt = 'ptr';
        else if (v.init && v.init.kind === ASTKind.Identifier) {
           const id = (v.init as Identifier).name;
           const it = this.localVarTypes.get(id) || (this.currentFunctionParams.has(id) ? this.currentFunctionParamTypes.get(id) : 'i32');
           if (it) lt = it;
        }
        
        // Final fallback: if it's a class but inferred as 'ptr', we want to keep it as 'ptr'
        // If it's a struct, it must be the struct type %Name
        
        out.push({ name: v.name, llvmType: lt });
        this.localVarTypes.set(v.name, lt); // Store early for inference
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

  private generateVarDecl(s: VarDecl): void {
    const t = this.localVarTypes.get(s.name) || (s.type ? this.getLLVMType(s.type) : 'i32');
    if (!this.hoistedVars.has(s.name)) {
        // If it's a struct, we alloca the actual struct type
        this.emit(`%${s.name} = alloca ${t}, align ${this.getAlignment(t)}`);
        this.localVarTypes.set(s.name, t);
    }
    
    // Initializer for structs (zero init)
    if (!s.init && this.isStructType(t)) {
        const stName = t.startsWith('%') ? t.substring(1) : t;
        const size = (this.structs.get(stName)?.fields.length || 0) * 8;
        this.emit(`call void @llvm.memset.p0.i64(ptr %${s.name}, i8 0, i64 ${size}, i1 false)`);
        this.ensureExternalDeclaration('llvm.memset.p0.i64', { name: 'memset', kind: 'function', llvmType: 'void', paramTypes: ['ptr', 'i8', 'i64', 'i1'] } as any);
    }

    if (s.init) {
      if (t.startsWith('[')) return;
      const val = this.generateExpression(s.init);
      const vt = this.getValueType(val);
      
      if (this.isStructType(t)) {
          const stName = t.startsWith('%') ? t.substring(1) : t;
          const structInfo = this.structs.get(stName)!;
          const size = structInfo.fields.length * 8;
          this.emit(`call void @llvm.memcpy.p0.p0.i64(ptr %${s.name}, ptr ${val}, i64 ${size}, i1 false)`);
          this.ensureExternalDeclaration('llvm.memcpy.p0.p0.i64', { name: 'memcpy', kind: 'function', llvmType: 'void', paramTypes: ['ptr', 'ptr', 'i64', 'i1'] } as any);
      } else {
          this.emit(`store ${t} ${this.coerceToType(val, vt, t)}, ptr %${s.name}, align ${this.getAlignment(t)}`);
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
                     (objLLVMType.startsWith('%') ? objLLVMType.substring(1) : this.guessStructTypeByVal(obj));
      
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
      
      // Ownership/Value Semantics:
      if (this.isStructType(lt)) {
          // Assignment of Struct = COPY via memcpy
          const structInfo = this.structs.get(lt.substring(1))!;
          const size = structInfo.fields.length * 4; 
          this.emit(`call void @llvm.memcpy.p0.p0.i64(ptr %${id}, ptr ${val}, i64 ${size}, i1 false)`);
          this.ensureExternalDeclaration('llvm.memcpy.p0.p0.i64', { name: 'memcpy', kind: 'function', llvmType: 'void', paramTypes: ['ptr', 'ptr', 'i64', 'i1'] } as any);
      } else if (this.isClassType(lt)) {
          // Assignment of Class = MOVE
          // 1. If destination already has an object, we must free it (Ownership rule)
          const oldVal = this.newTemp();
          this.emit(`${oldVal} = load ptr, ptr %${id}, align 8`);
          this.ensureExternalDeclaration('memory_free', { name: 'free', kind: 'function', llvmType: 'void', paramTypes: ['ptr'] });
          this.emit(`call void @memory_free(ptr ${oldVal})`);
          // 2. Perform the move (copy the pointer)
          this.emit(`store ${lt} ${val}, ptr %${id}, align 8`);
          // 3. Mark source as null (destructive move)
          if (s.value.kind === ASTKind.Identifier) {
              const srcId = (s.value as Identifier).name;
              this.emit(`store ptr null, ptr %${srcId}, align 8`);
          }
      } else {
          // Primitive types
          if (global) this.emit(`store ${vt} ${val}, ptr @${global.name}, align 4`);
          else if (this.currentFunctionParams.has(id)) this.emit(`store ${vt} ${val}, ptr %${id}.addr, align 4`);
          else this.emit(`store ${vt} ${val}, ptr %${id}, align ${this.getAlignment(lt)}`);
      }
      return;
    }
  }

  private generateReturn(s: ReturnStmt): void {
    let finalVal: string | undefined;
    if (s.value) {
      finalVal = this.generateExpression(s.value);
    }

    // Ownership: Cleanup local Heap objects
    const currentLocals = Array.from(this.localVarTypes.entries());
    if (currentLocals.some(([_, lt]) => this.isClassType(lt))) {
        this.ensureExternalDeclaration('memory_free', { name: 'free', kind: 'function', llvmType: 'void', paramTypes: ['ptr'] });
        for (const [name, lt] of currentLocals) {
            if (this.isClassType(lt)) {
                const v = this.newTemp();
                this.emit(`${v} = load ptr, ptr %${name}, align 8`);
                this.emit(`call void @memory_free(ptr ${v})`);
            }
        }
    }

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
    switch (e.kind) {
      case ASTKind.NumberLiteral: return (e as NumberLiteral).value.toString();
      case ASTKind.StringLiteral: return this.generateStringLiteral(e as StringLiteral);
      case ASTKind.BoolLiteral: return (e as BoolLiteral).value ? '1' : '0';
      case ASTKind.NullLiteral: return 'null';
      case ASTKind.ThisExpr: return this.generateThis();
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

  private generateThis(): string {
    const t = this.newTemp();
    this.emit(`${t} = load ptr, ptr %this.addr, align 8`);
    if (this.currentClassName) this.tempTypes.set(t, `%${this.currentClassName}`);
    else this.tempTypes.set(t, 'ptr');
    return t;
  }

  private generateNew(e: NewExpr): string {
    const st = this.structs.get(e.className);
    if (!st) return 'null';
    // 1. Alloc memory (8 bytes per field, including _refCount at index 0)
    const size = Math.max(st.fields.length * 8, 8);
    const ptr = this.newTemp();
    this.ensureExternalDeclaration('memory_alloc', { name: 'alloc', kind: 'function', llvmType: 'ptr', paramTypes: ['i32'] });
    this.emit(`${ptr} = call ptr @memory_alloc(i32 ${size})`);
    this.tempTypes.set(ptr, `%${e.className}`);
    // RC is already initialized to 1 in memory_alloc (runtime)
    
    // 2. Call constructor
    const scopedCtor = `${e.className}.constructor`;
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
    const t = this.newTemp(); this.emit(`${t} = getelementptr inbounds [${e.value.length + 1} x i8], ptr ${name}, i32 0, i32 0`);
    this.tempTypes.set(t, 'ptr'); return t;
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
      const t = this.newTemp(); this.emit(`${t} = load ${pt}, ptr %${e.name}.addr, align ${this.getAlignment(pt)}`);
      this.tempTypes.set(t, pt); return t;
    }
    const lt = this.localVarTypes.get(e.name) || 'i32';
    if (lt.startsWith('[')) return `%${e.name}`;
    
    // For structs (not classes), we return the pointer to the struct on stack
    if (this.isStructType(lt)) {
        this.tempTypes.set(`%${e.name}`, lt);
        return `%${e.name}`;
    }
    
    if (this.isClassType(lt)) {
        const t = this.newTemp(); this.emit(`${t} = load ptr, ptr %${e.name}, align 8`);
        this.tempTypes.set(t, lt); return t;
    }

    const t = this.newTemp(); this.emit(`${t} = load ${lt}, ptr %${e.name}, align ${this.getAlignment(lt)}`);
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
    this.emit(`${t} = ${op} ${rt} ${l}, ${r}`); this.tempTypes.set(t, op.startsWith('icmp') ? 'i1' : 'i32'); return t;
  }

  private generateUnaryExpr(e: UnaryExpr): string {
    const v = this.generateExpression(e.operand), t = this.newTemp();
    if (e.operator === '-') this.emit(`${t} = sub i32 0, ${v}`);
    else this.emit(`${t} = xor i1 ${this.coerceToType(v, this.getValueType(v), 'i1')}, true`);
    return t;
  }

  private generateCallExpr(e: CallExpr): string {
    if (e.callee.kind === ASTKind.MemberExpr) return this.generateMemberCallExpr(e);
    const name = (e.callee as Identifier).name, mangled = this.resolveMangledName(name);
    const imported = this.importedSymbols.get(name);
    if (imported) return this.generateImportedCall(name, name, imported, e.args);
    const info = this.functions.get(mangled) || this.functions.get(name);
    
    // Use original name if it's an external (FFI) function
    const actualName = (info && (info as any).isExternal) ? name : mangled;
    
    const args = e.args.map((arg, i) => {
      const v = this.generateExpression(arg), t = info && info.paramTypes[i] ? info.paramTypes[i] : this.getValueType(v);
      return `${t} ${this.coerceToType(v, this.getValueType(v), t)}`;
    }).join(', ');
    const rt = info ? info.returnType : 'i32';
    if (rt === 'void') { this.emit(`call void @${actualName}(${args})`); return '0'; }
    const t = this.newTemp(); this.emit(`${t} = call ${rt} @${actualName}(${args})`); this.tempTypes.set(t, rt); return t;
  }

  private generateMemberCallExpr(e: CallExpr): string {
    const m = e.callee as MemberExpr;
    const obj = this.generateExpression(m.object);
    const objLLVMType = this.tempTypes.get(obj) || 'ptr';
    const stName = (m.object.kind === ASTKind.ThisExpr) ? this.currentClassName! : 
                   (objLLVMType.startsWith('%') ? objLLVMType.substring(1) : this.guessStructTypeByVal(obj));
    
    const dotName = `${stName}.${m.member}`, mangled = this.resolveMangledName(dotName);
    const info = this.functions.get(mangled) || this.functions.get(dotName);
    const args = e.args.map((arg, i) => {
      const v = this.generateExpression(arg), t = info && info.paramTypes[i + 1] ? info.paramTypes[i + 1] : this.getValueType(v);
      return `${t} ${this.coerceToType(v, this.getValueType(v), t)}`;
    }).join(', ');
    const rt = info ? info.returnType : 'i32';
    const aStr = [`ptr ${obj}`, ...args.length ? [args] : []].join(', ');
    if (rt === 'void') { this.emit(`call void @${mangled}(${aStr})`); return '0'; }
    const t = this.newTemp(); this.emit(`${t} = call ${rt} @${mangled}(${aStr})`); this.tempTypes.set(t, rt); return t;
  }

  private generateImportedCall(local: string, mangled: string, sym: ExportedSymbol, args: Expression[]): string {
    this.ensureExternalDeclaration(mangled, sym);
    const pts = sym.paramTypes || [], aStr = args.map((arg, i) => {
      const v = this.generateExpression(arg), t = pts[i] ?? this.getValueType(v);
      return `${t} ${this.coerceToType(v, this.getValueType(v), t)}`;
    }).join(', ');
    const rt = sym.llvmType || 'void';
    if (rt === 'void') { this.emit(`call void @${mangled}(${aStr})`); return '0'; }
    const t = this.newTemp(); this.emit(`${t} = call ${rt} @${mangled}(${aStr})`); this.tempTypes.set(t, rt); return t;
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
    const objLLVMType = this.tempTypes.get(obj) || 'ptr';
    const stName = (e.object.kind === ASTKind.ThisExpr) ? this.currentClassName! : 
                   (objLLVMType.startsWith('%') ? objLLVMType.substring(1) : this.guessStructTypeByVal(obj));
    
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

  private getLLVMType(t: TypeAnnotation): string {
    if (t.isPointer) return 'ptr'; if (t.isArray) return `[${t.arraySize || 0} x ${this.getLLVMTypeByName(t.name)}]`;
    return this.getLLVMTypeByName(t.name);
  }

  private getLLVMTypeByName(n: string): string {
    if (this.typeAliases.has(n)) return this.getLLVMType(this.typeAliases.get(n)!);
    const map: Record<string, string> = { 'i8': 'i8', 'i16': 'i16', 'i32': 'i32', 'i64': 'i64', 'u8': 'i8', 'u16': 'i16', 'u32': 'i32', 'u64': 'i64', 'bool': 'i1', 'void': 'void', 'number': 'i32', 'string': 'ptr', 'boolean': 'i1' };
    if (map[n]) return map[n];
    if (this.structs.has(n)) {
        const info = this.structs.get(n)!;
        // If it has _refCount, it's a Class (Heap object), so we refer to it as 'ptr' usually, 
        // but for 'alloca' and 'type' definitions we need the actual struct name.
        return `%${n}`;
    }
    return 'i32';
  }

  private isClassType(llvmType: string): boolean {
    const name = llvmType.startsWith('%') ? llvmType.substring(1) : llvmType;
    const st = this.structs.get(name);
    return !!(st && st.fields.length > 0 && st.fields[0].name === '_refCount');
  }

  private isStructType(llvmType: string): boolean {
    if (llvmType === 'ptr' || llvmType === 'i32' || llvmType === 'i1') return false;
    const name = llvmType.startsWith('%') ? llvmType.substring(1) : llvmType;
    const st = this.structs.get(name);
    return !!(st && (st.fields.length === 0 || st.fields[0].name !== '_refCount'));
  }

  private getAlignment(t: string): number { return t.startsWith('i64') || t === 'ptr' || t === 'double' ? 8 : 4; }
  private getValueType(v: string): string { 
    if (v.startsWith('@')) {
       // Check globals
       const gName = v.substring(1);
       const g = this.globals.get(gName);
       if (g) return g.type;
       return 'ptr';
    }
    return v.startsWith('%') ? this.tempTypes.get(v) || 'i32' : 'i32'; 
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
    if (src === dest) return v;
    if (src === 'i32' && dest === 'i8') { if (/^-?\d+$/.test(v)) return v; const t = this.newTemp(); this.emit(`${t} = trunc i32 ${v} to i8`); this.tempTypes.set(t, 'i8'); return t; }
    if (src === 'i8' && dest === 'i32') { const t = this.newTemp(); this.emit(`${t} = sext i8 ${v} to i32`); this.tempTypes.set(t, 'i32'); return t; }
    if (src === 'i32' && dest === 'i1') { const t = this.newTemp(); this.emit(`${t} = icmp ne i32 ${v}, 0`); this.tempTypes.set(t, 'i1'); return t; }
    if (src === 'i1' && dest === 'i32') { const t = this.newTemp(); this.emit(`${t} = zext i1 ${v} to i32`); this.tempTypes.set(t, 'i32'); return t; }
    return v;
  }

  private escapeString(s: string): string { return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\0A').replace(/\t/g, '\\09').replace(/"/g, '\\"'); }
  private newTemp(): string { return `%${this.tempCounter++}`; }
  private newLabel(p: string): string { return `${p}.${this.labelCounter++}`; }
  private emit(l: string): void { this.output.push('  '.repeat(this.indent) + l); }
}
