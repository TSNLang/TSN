import { Program, Declaration, Statement, Expression, FunctionDecl, InterfaceDecl, VarDecl, Assignment, ReturnStmt, IfStmt, WhileStmt, ForStmt, ExprStmt, BreakStmt, ContinueStmt, BinaryExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr, Identifier, NumberLiteral, StringLiteral, BoolLiteral, NullLiteral, AddressofExpr, ASTKind, TypeAnnotation, ImportDecl, ExportDecl } from './types.ts';
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
  private stringLiterals: Map<string, string> = new Map();
  private loopStack: LoopContext[] = [];
  private currentFunctionParams: Set<string> = new Set();
  private currentFunctionParamTypes: Map<string, string> = new Map();
  private currentFunctionReturnType: string = 'void';
  private tempTypes: Map<string, string> = new Map(); // Track temp variable types
  private moduleResolver: ModuleResolver;
  // Set of variable names whose alloca has already been hoisted to entry
  private hoistedVars: Set<string> = new Set();
  // Track LLVM types of local variables (name -> llvmType)
  private localVarTypes: Map<string, string> = new Map();
  // Maps local alias -> ExportedSymbol (for imported functions)
  private importedSymbols: Map<string, ExportedSymbol> = new Map();
  // Tracks external declarations to be emitted at top of file
  private externalDecls: string[] = [];
  // Tracks exported symbols in this module (for .meta generation)
  private exportedSymbols: ExportedSymbol[] = [];

  constructor(moduleResolver?: ModuleResolver) {
    this.moduleResolver = moduleResolver ?? new ModuleResolver('.');
  }

  // Returns exported symbols (for .meta file generation)
  getExportedSymbols(): ExportedSymbol[] {
    return this.exportedSymbols;
  }

  generate(program: Program): string {
    // Process imports first - collect imported symbol signatures
    for (const decl of program.declarations) {
      if (decl.kind === ASTKind.ImportDecl) {
        this.processImport(decl as ImportDecl);
      }
    }

    // Generate struct definitions (from both direct and exported interfaces)
    for (const decl of program.declarations) {
      if (decl.kind === ASTKind.InterfaceDecl) {
        this.generateInterface(decl);
      }
      if (decl.kind === ASTKind.ExportDecl) {
        const exportDecl = decl as ExportDecl;
        if (exportDecl.declaration.kind === ASTKind.InterfaceDecl) {
          this.generateInterface(exportDecl.declaration as InterfaceDecl);
        }
      }
    }

    // Generate global constants (from both direct and exported vars)
    for (const decl of program.declarations) {
      if (decl.kind === ASTKind.VarDecl) {
        this.generateGlobalConst(decl);
      }
      if (decl.kind === ASTKind.ExportDecl) {
        const exportDecl = decl as ExportDecl;
        if (exportDecl.declaration.kind === ASTKind.VarDecl) {
          this.generateGlobalConst(exportDecl.declaration as VarDecl);
          // Track exported var
          const varDecl = exportDecl.declaration as VarDecl;
          const llvmType = varDecl.type ? this.getLLVMType(varDecl.type) : 'i32';
          this.exportedSymbols.push({
            name: varDecl.name,
            kind: varDecl.isConst ? 'const' : 'let',
            varType: llvmType,
          });
        }
      }
    }

    // Mark where string literals will go (actual strings collected during function generation)
    const stringLiteralMarkerIdx = this.output.length;
    this.emit('; String literals -- PLACEHOLDER');
    this.emit('');

    // Generate function declarations and definitions (direct + exported)
    for (const decl of program.declarations) {
      if (decl.kind === ASTKind.FunctionDecl) {
        this.generateFunction(decl);
      }
      if (decl.kind === ASTKind.ExportDecl) {
        const exportDecl = decl as ExportDecl;
        if (exportDecl.declaration.kind === ASTKind.FunctionDecl) {
          const fnDecl = exportDecl.declaration as FunctionDecl;
          this.generateFunction(fnDecl);
          // Track exported function
          const returnType = this.getLLVMType(fnDecl.returnType);
          const paramTypes = fnDecl.params.map(p => this.getLLVMType(p.type));
          this.exportedSymbols.push({
            name: fnDecl.name,
            kind: 'function',
            llvmType: returnType,
            paramTypes,
          });
        }
      }
    }

    // Now emit all string literals collected during function generation
    const strLines: string[] = ['; String literals'];
    for (const [globalName, value] of this.stringLiterals) {
      const escaped = this.escapeString(value);
      const len = value.length + 1;
      strLines.push(`${globalName} = private unnamed_addr constant [${len} x i8] c"${escaped}\\00", align 1`);
    }
    // Replace the placeholder with actual string literals
    this.output.splice(stringLiteralMarkerIdx, 2, ...strLines, '');

    // Prepend external declarations (from imports) at very top
    if (this.externalDecls.length > 0) {
      this.output.unshift(...this.externalDecls, '');
    }

    return this.output.join('\n');
  }

  // Process import declaration: resolve module and track imported symbols
  private processImport(decl: ImportDecl): void {
    const moduleExports = this.moduleResolver.resolveModule(decl.source);

    if (!moduleExports) {
      // Unknown module - emit a comment but don't fail
      this.emit(`; Warning: Could not resolve module "${decl.source}"`);
      return;
    }

    const imported = this.moduleResolver.getImportedSymbols(decl, moduleExports);

    // Register imported symbols - so when we see a call like console.log(...)
    // we know it's an imported function with known signature
    for (const [localName, sym] of imported) {
      this.importedSymbols.set(localName, sym);
    }
  }

  // Emit external declaration for an imported symbol on first use
  private ensureExternalDeclaration(mangledName: string, sym: ExportedSymbol): void {
    // Check already declared (by name in externalDecls)
    if (this.externalDecls.some(l => l.includes(`@${mangledName}(`))) return;

    if (sym.kind === 'function') {
      const params = (sym.paramTypes || []).join(', ');
      this.externalDecls.push(`declare ${sym.llvmType} @${mangledName}(${params})`);
    }
  }

  private generateGlobalConst(decl: VarDecl): void {
    const llvmType = decl.type ? this.getLLVMType(decl.type) : 'i32';
    
    // Handle arrays (no initializer needed - use zeroinitializer)
    if (decl.type?.isArray) {
      const size = decl.type.arraySize || 0;
      const elementType = this.getLLVMType({ name: decl.type.name, isPointer: false, isArray: false, arraySize: undefined });
      
      // Store in globals map
      this.globals.set(decl.name, { name: decl.name, type: `[${size} x ${elementType}]`, isConst: decl.isConst });
      
      // Emit global array with zero initialization
      if (decl.isConst) {
        this.emit(`@${decl.name} = constant [${size} x ${elementType}] zeroinitializer, align 4`);
      } else {
        this.emit(`@${decl.name} = global [${size} x ${elementType}] zeroinitializer, align 4`);
      }
      return;
    }
    
    // Handle pointer types with 0 initializer -> use null
    if (decl.type?.isPointer && decl.init?.kind === ASTKind.NumberLiteral && (decl.init as NumberLiteral).value === 0) {
      this.globals.set(decl.name, { name: decl.name, type: llvmType, isConst: decl.isConst });
      
      if (decl.isConst) {
        this.emit(`@${decl.name} = constant ${llvmType} null, align ${this.getAlignment(llvmType)}`);
      } else {
        this.emit(`@${decl.name} = global ${llvmType} null, align ${this.getAlignment(llvmType)}`);
      }
      return;
    }
    
    // Handle number literals (existing code)
    if (!decl.init || decl.init.kind !== ASTKind.NumberLiteral) {
      console.error(`Global ${decl.isConst ? 'const' : 'let'} ${decl.name} must have a number literal initializer`);
      return;
    }

    const value = (decl.init as NumberLiteral).value;
    
    // Store in globals map for later reference
    this.globals.set(decl.name, { name: decl.name, type: llvmType, isConst: decl.isConst });
    
    // Emit global constant or variable
    if (decl.isConst) {
      this.emit(`@${decl.name} = constant ${llvmType} ${value}, align ${this.getAlignment(llvmType)}`);
    } else {
      this.emit(`@${decl.name} = global ${llvmType} ${value}, align ${this.getAlignment(llvmType)}`);
    }
  }

  private generateInterface(decl: InterfaceDecl): void {
    const fields: { name: string; type: string }[] = [];
    const llvmFields: string[] = [];

    for (const field of decl.fields) {
      const llvmType = this.getLLVMType(field.type);
      fields.push({ name: field.name, type: llvmType });
      llvmFields.push(llvmType);
    }

    this.structs.set(decl.name, { name: decl.name, fields });
    this.emit(`%${decl.name} = type { ${llvmFields.join(', ')} }`);
  }

  // ============================================================================
  // ALLOCA HOISTING: Collect all variable declarations from a function body
  // (including inside if/while/for blocks) so we can emit all allocas in the
  // entry block, satisfying LLVM IR's requirement.
  // ============================================================================

  private collectVarDecls(stmts: Statement[]): { name: string; llvmType: string }[] {
    const vars: { name: string; llvmType: string }[] = [];
    for (const stmt of stmts) {
      this.collectVarDeclsFromStmt(stmt, vars);
    }
    return vars;
  }

  private collectVarDeclsFromStmt(
    stmt: Statement,
    out: { name: string; llvmType: string }[]
  ): void {
    switch (stmt.kind) {
      case ASTKind.VarDecl: {
        const v = stmt as VarDecl;
        const llvmType = v.type ? this.getLLVMType(v.type) : 'i32';
        out.push({ name: v.name, llvmType });
        break;
      }
      case ASTKind.IfStmt: {
        const s = stmt as IfStmt;
        for (const child of s.thenBranch) this.collectVarDeclsFromStmt(child, out);
        if (s.elseBranch) for (const child of s.elseBranch) this.collectVarDeclsFromStmt(child, out);
        break;
      }
      case ASTKind.WhileStmt: {
        const s = stmt as WhileStmt;
        for (const child of s.body) this.collectVarDeclsFromStmt(child, out);
        break;
      }
      case ASTKind.ForStmt: {
        const s = stmt as ForStmt;
        if (s.init) this.collectVarDeclsFromStmt(s.init, out);
        for (const child of s.body) this.collectVarDeclsFromStmt(child, out);
        break;
      }
      // Other statement kinds don't declare local variables
    }
  }

  private generateFunction(decl: FunctionDecl): void {
    const returnType = this.getLLVMType(decl.returnType);
    const params = decl.params.map(p => `${this.getLLVMType(p.type)} %${p.name}`).join(', ');
    const paramTypes = decl.params.map(p => this.getLLVMType(p.type));

    // Register function info
    this.functions.set(decl.name, {
      name: decl.name,
      returnType: returnType,
      paramTypes: paramTypes
    });

    if (decl.isDeclare) {
      // Forward declaration (FFI or forward reference)
      this.emit(`declare ${returnType} @${decl.name}(${params})`);
      this.emit('');
      return;
    }

    // Track parameters and return type for this function
    this.currentFunctionParams.clear();
    this.currentFunctionParamTypes.clear();
    this.currentFunctionReturnType = returnType;
    this.hoistedVars.clear();
    this.localVarTypes.clear();

    for (const param of decl.params) {
      this.currentFunctionParams.add(param.name);
      this.currentFunctionParamTypes.set(param.name, this.getLLVMType(param.type));
    }

    // Function definition header
    this.emit(`define ${returnType} @${decl.name}(${params}) {`);
    this.emit('entry:');
    this.indent++;

    // ── ALLOCA HOISTING ────────────────────────────────────────────────────
    // 1. Allocate space for parameters (to make them mutable)
    for (const param of decl.params) {
      const llvmType = this.getLLVMType(param.type);
      this.emit(`%${param.name}.addr = alloca ${llvmType}, align ${this.getAlignment(llvmType)}`);
      this.emit(`store ${llvmType} %${param.name}, ptr %${param.name}.addr, align ${this.getAlignment(llvmType)}`);
      // Track param type in localVarTypes (but use .addr key for params, identifier lookup uses currentFunctionParamTypes)
    }

    // 2. Collect ALL local variable declarations from the entire body (recursive)
    //    and emit their alloca at the entry block NOW, before any code.
    const localVars = this.collectVarDecls(decl.body);
    // Deduplicate by name (same name in if/else branches)
    const seen = new Set<string>();
    for (const { name, llvmType } of localVars) {
      if (!seen.has(name)) {
        seen.add(name);
        this.emit(`%${name} = alloca ${llvmType}, align ${this.getAlignment(llvmType)}`);
        this.hoistedVars.add(name);
        this.localVarTypes.set(name, llvmType);
      }
    }
    // ── END ALLOCA HOISTING ────────────────────────────────────────────────

    // Generate function body (generateVarDecl will now only emit store, not alloca)
    for (const stmt of decl.body) {
      this.generateStatement(stmt);
    }

    // Add default return if needed
    if (decl.body.length === 0 || decl.body[decl.body.length - 1].kind !== ASTKind.ReturnStmt) {
      if (returnType === 'void') {
        this.emit('ret void');
      } else {
        this.emit(`ret ${returnType} 0`);
      }
    }

    this.indent--;
    this.emit('}');
    this.emit('');

    // Clear function state
    this.currentFunctionParams.clear();
    this.currentFunctionParamTypes.clear();
    this.hoistedVars.clear();
    this.localVarTypes.clear();
  }

  private generateStatement(stmt: Statement): void {
    switch (stmt.kind) {
      case ASTKind.VarDecl:
        this.generateVarDecl(stmt);
        break;
      case ASTKind.Assignment:
        this.generateAssignment(stmt);
        break;
      case ASTKind.ReturnStmt:
        this.generateReturn(stmt);
        break;
      case ASTKind.IfStmt:
        this.generateIf(stmt);
        break;
      case ASTKind.WhileStmt:
        this.generateWhile(stmt);
        break;
      case ASTKind.ForStmt:
        this.generateFor(stmt);
        break;
      case ASTKind.BreakStmt:
        this.generateBreak();
        break;
      case ASTKind.ContinueStmt:
        this.generateContinue();
        break;
      case ASTKind.ExprStmt:
        this.generateExpression(stmt.expr);
        break;
    }
  }

  private generateVarDecl(stmt: VarDecl): void {
    const llvmType = stmt.type ? this.getLLVMType(stmt.type) : 'i32';

    // If this variable was already hoisted to entry, skip alloca
    if (!this.hoistedVars.has(stmt.name)) {
      // Fallback: emit alloca here (top-level or missed by collector)
      this.emit(`%${stmt.name} = alloca ${llvmType}, align ${this.getAlignment(llvmType)}`);
    }

    if (stmt.init) {
      // For array types, skip zero-initialization (already zeroed by alloca on most platforms)
      // or use store for simple non-zero scalar inits
      if (llvmType.startsWith('[')) {
        // Array type: only handle NumberLiteral 0 (zeroinitializer - skip, alloca gives undef but fine)
        // Skip zero initializer for arrays - it's not a valid LLVM IR store
        if (stmt.init.kind === ASTKind.NumberLiteral && (stmt.init as NumberLiteral).value === 0) {
          // Zero init: skip (alloca leaves undef, but globals/explicit zeroinit handle this)
          return;
        }
        // Non-zero array init: not supported, skip
        return;
      }
      
      const initValue = this.generateExpression(stmt.init);
      this.emit(`store ${llvmType} ${initValue}, ptr %${stmt.name}, align ${this.getAlignment(llvmType)}`);
    }
  }

  private generateAssignment(stmt: Assignment): void {
    // This is the CRITICAL part that fixes the C++ compiler bug!
    // We need to handle: nodes[idx].kind = value
    
    const value = this.generateExpression(stmt.value);
    
    // Check if target is a member expression (e.g., obj.field or arr[i].field)
    if (stmt.target.kind === ASTKind.MemberExpr) {
      const memberExpr = stmt.target as MemberExpr;
      
      // Check if the object is an index expression (e.g., arr[i])
      if (memberExpr.object.kind === ASTKind.IndexExpr) {
        const indexExpr = memberExpr.object as IndexExpr;
        
        if (indexExpr.base.kind === ASTKind.Identifier) {
          const baseIdent = indexExpr.base as Identifier;
          const index = this.generateExpression(indexExpr.index);
          
          // Get the struct type from the base identifier
          const structType = this.guessStructType(baseIdent.name);
          
          // Check if base is global array
          const global = this.globals.get(baseIdent.name);
          const basePtr = global && global.type.startsWith('[') ? `@${baseIdent.name}` : `%${baseIdent.name}`;
          
          // For array of structs: arr[i].field
          // First GEP to get pointer to arr[i]
          const elemPtrTemp = this.newTemp();
          this.emit(`${elemPtrTemp} = getelementptr inbounds %${structType}, ptr ${basePtr}, i32 ${index}`);
          
          // Get field index
          const fieldIndex = this.getFieldIndex(structType, memberExpr.member);
          
          // Second GEP to get pointer to field
          const fieldPtrTemp = this.newTemp();
          this.emit(`${fieldPtrTemp} = getelementptr inbounds %${structType}, ptr ${elemPtrTemp}, i32 0, i32 ${fieldIndex}`);
          
          const valueType = this.getValueType(value);
          this.emit(`store ${valueType} ${value}, ptr ${fieldPtrTemp}, align 4`);
          return;
        }
      }
      
      // Simple member access: obj.field
      if (memberExpr.object.kind === ASTKind.Identifier) {
        const objIdent = memberExpr.object as Identifier;
        const structType = this.guessStructType(objIdent.name);
        const fieldIndex = this.getFieldIndex(structType, memberExpr.member);
        
        const fieldPtrTemp = this.newTemp();
        this.emit(`${fieldPtrTemp} = getelementptr inbounds %${structType}, ptr %${objIdent.name}, i32 0, i32 ${fieldIndex}`);
        
        const valueType = this.getValueType(value);
        this.emit(`store ${valueType} ${value}, ptr ${fieldPtrTemp}, align 4`);
        return;
      }
    }
    
    // Check if target is an index expression (e.g., arr[i])
    if (stmt.target.kind === ASTKind.IndexExpr) {
      const indexExpr = stmt.target as IndexExpr;
      
      if (indexExpr.base.kind === ASTKind.Identifier) {
        const baseIdent = indexExpr.base as Identifier;
        const index = this.generateExpression(indexExpr.index);
        
        // Check if base is global array
        const global = this.globals.get(baseIdent.name);
        const elemPtrTemp = this.newTemp();
        
        if (global && global.type.startsWith('[')) {
          // Global array: use @name and full array type
          this.emit(`${elemPtrTemp} = getelementptr inbounds ${global.type}, ptr @${baseIdent.name}, i32 0, i32 ${index}`);
          // Get element type for proper store
          const gMatch = global.type.match(/\[.*? x (.*?)\]/);
          const gElemType = gMatch ? gMatch[1] : 'i32';
          const gStoreValue = this.coerceToType(value, this.getValueType(value), gElemType);
          this.emit(`store ${gElemType} ${gStoreValue}, ptr ${elemPtrTemp}, align ${this.getAlignment(gElemType)}`);
          return;
        } else if (global && global.type === 'ptr') {
          // Global pointer: load pointer then GEP with 1 index
          const ptrVal = this.newTemp();
          this.emit(`${ptrVal} = load ptr, ptr @${baseIdent.name}, align 8`);
          this.emit(`${elemPtrTemp} = getelementptr inbounds i8, ptr ${ptrVal}, i32 ${index}`);
          const valueType = this.getValueType(value);
          this.emit(`store ${valueType} ${value}, ptr ${elemPtrTemp}, align 1`);
          return;
        } else {
          // Local array: use %name with proper type GEP
          const localType = this.localVarTypes.get(baseIdent.name);
          if (localType && localType.startsWith('[')) {
            this.emit(`${elemPtrTemp} = getelementptr inbounds ${localType}, ptr %${baseIdent.name}, i32 0, i32 ${index}`);
            // Get element type for proper store
            const match = localType.match(/\[.*? x (.*?)\]/);
            const elementType = match ? match[1] : 'i32';
            const storeValue = this.coerceToType(value, this.getValueType(value), elementType);
            this.emit(`store ${elementType} ${storeValue}, ptr ${elemPtrTemp}, align ${this.getAlignment(elementType)}`);
            return;
          } else {
            this.emit(`${elemPtrTemp} = getelementptr inbounds i32, ptr %${baseIdent.name}, i32 ${index}`);
          }
        }
        
        const valueType = this.getValueType(value);
        this.emit(`store ${valueType} ${value}, ptr ${elemPtrTemp}, align 4`);
        return;
      }
    }
    
    // Simple identifier assignment
    if (stmt.target.kind === ASTKind.Identifier) {
      const ident = stmt.target as Identifier;
      const valueType = this.getValueType(value);
      
      // Check if it's a global variable
      const global = this.globals.get(ident.name);
      if (global) {
        // Global variable: use @name
        this.emit(`store ${valueType} ${value}, ptr @${ident.name}, align 4`);
      } else {
        // Local variable or parameter: use %name
        this.emit(`store ${valueType} ${value}, ptr %${ident.name}, align 4`);
      }
      return;
    }
  }

  private generateReturn(stmt: ReturnStmt): void {
    if (stmt.value) {
      const value = this.generateExpression(stmt.value);
      const valueType = this.getValueType(value);
      
      // Check if we need type conversion
      if (valueType !== this.currentFunctionReturnType) {
        // Convert i1 to i32
        if (valueType === 'i1' && this.currentFunctionReturnType === 'i32') {
          const temp = this.newTemp();
          this.emit(`${temp} = zext i1 ${value} to i32`);
          this.emit(`ret i32 ${temp}`);
          return;
        }
      }
      
      // Use tracked function return type
      this.emit(`ret ${this.currentFunctionReturnType} ${value}`);
    } else {
      this.emit('ret void');
    }
  }

  private generateIf(stmt: IfStmt): void {
    const conditionValue = this.generateExpression(stmt.condition);
    
    // Check if condition is already i1 (from comparison) or needs conversion
    let condition = conditionValue;
    // If it's a temp variable from comparison, it's already i1
    // If it's a number or identifier, convert to i1
    if (!conditionValue.startsWith('%') || this.needsI1Conversion(stmt.condition)) {
      const temp = this.newTemp();
      this.emit(`${temp} = icmp ne i32 ${conditionValue}, 0`);
      condition = temp;
    }
    
    const thenLabel = this.newLabel('then');
    const endLabel = this.newLabel('endif');

    if (stmt.elseBranch) {
      // Has else branch
      const elseLabel = this.newLabel('else');
      this.emit(`br i1 ${condition}, label %${thenLabel}, label %${elseLabel}`);
      
      // Then branch
      this.emit('');
      this.emit(`${thenLabel}:`);
      this.indent++;
      let thenHasTerminator = false;
      for (const s of stmt.thenBranch) {
        this.generateStatement(s);
        if (s.kind === ASTKind.ReturnStmt || s.kind === ASTKind.BreakStmt || s.kind === ASTKind.ContinueStmt) {
          thenHasTerminator = true;
        }
      }
      if (!thenHasTerminator) {
        this.emit(`br label %${endLabel}`);
      }
      this.indent--;

      // Else branch
      this.emit('');
      this.emit(`${elseLabel}:`);
      this.indent++;
      let elseHasTerminator = false;
      for (const s of stmt.elseBranch) {
        this.generateStatement(s);
        if (s.kind === ASTKind.ReturnStmt || s.kind === ASTKind.BreakStmt || s.kind === ASTKind.ContinueStmt) {
          elseHasTerminator = true;
        }
      }
      if (!elseHasTerminator) {
        this.emit(`br label %${endLabel}`);
      }
      this.indent--;
    } else {
      // No else branch - branch directly to end
      this.emit(`br i1 ${condition}, label %${thenLabel}, label %${endLabel}`);
      
      // Then branch
      this.emit('');
      this.emit(`${thenLabel}:`);
      this.indent++;
      let thenHasTerminator = false;
      for (const s of stmt.thenBranch) {
        this.generateStatement(s);
        if (s.kind === ASTKind.ReturnStmt || s.kind === ASTKind.BreakStmt || s.kind === ASTKind.ContinueStmt) {
          thenHasTerminator = true;
        }
      }
      if (!thenHasTerminator) {
        this.emit(`br label %${endLabel}`);
      }
      this.indent--;
    }

    // End
    this.emit('');
    this.emit(`${endLabel}:`);
  }

  private needsI1Conversion(expr: Expression): boolean {
    // Binary expressions with comparison operators already return i1
    if (expr.kind === ASTKind.BinaryExpr) {
      const binExpr = expr as BinaryExpr;
      const compOps = ['==', '!=', '<', '<=', '>', '>='];
      if (compOps.includes(binExpr.operator)) {
        return false; // Already i1
      }
    }
    // Everything else needs conversion
    return true;
  }

  private generateWhile(stmt: WhileStmt): void {
    const condLabel = this.newLabel('while.cond');
    const bodyLabel = this.newLabel('while.body');
    const endLabel = this.newLabel('while.end');

    this.loopStack.push({ breakLabel: endLabel, continueLabel: condLabel });

    this.emit(`br label %${condLabel}`);
    
    // Condition
    this.emit('');
    this.emit(`${condLabel}:`);
    this.indent++;
    const conditionValue = this.generateExpression(stmt.condition);
    
    // Check if condition is already i1 or needs conversion
    let condition = conditionValue;
    if (!conditionValue.startsWith('%') || this.needsI1Conversion(stmt.condition)) {
      const temp = this.newTemp();
      this.emit(`${temp} = icmp ne i32 ${conditionValue}, 0`);
      condition = temp;
    }
    
    this.emit(`br i1 ${condition}, label %${bodyLabel}, label %${endLabel}`);
    this.indent--;

    // Body
    this.emit('');
    this.emit(`${bodyLabel}:`);
    this.indent++;
    for (const s of stmt.body) {
      this.generateStatement(s);
    }
    this.emit(`br label %${condLabel}`);
    this.indent--;

    // End
    this.emit('');
    this.emit(`${endLabel}:`);

    this.loopStack.pop();
  }

  private generateFor(stmt: ForStmt): void {
    const condLabel = this.newLabel('for.cond');
    const bodyLabel = this.newLabel('for.body');
    const updateLabel = this.newLabel('for.update');
    const endLabel = this.newLabel('for.end');

    this.loopStack.push({ breakLabel: endLabel, continueLabel: updateLabel });

    // Init
    if (stmt.init) {
      this.generateStatement(stmt.init);
    }

    this.emit(`br label %${condLabel}`);
    
    // Condition
    this.emit('');
    this.emit(`${condLabel}:`);
    this.indent++;
    if (stmt.condition) {
      const conditionValue = this.generateExpression(stmt.condition);
      
      // Check if condition is already i1 or needs conversion
      let condition = conditionValue;
      if (!conditionValue.startsWith('%') || this.needsI1Conversion(stmt.condition)) {
        const temp = this.newTemp();
        this.emit(`${temp} = icmp ne i32 ${conditionValue}, 0`);
        condition = temp;
      }
      
      this.emit(`br i1 ${condition}, label %${bodyLabel}, label %${endLabel}`);
    } else {
      this.emit(`br label %${bodyLabel}`);
    }
    this.indent--;

    // Body
    this.emit('');
    this.emit(`${bodyLabel}:`);
    this.indent++;
    for (const s of stmt.body) {
      this.generateStatement(s);
    }
    this.emit(`br label %${updateLabel}`);
    this.indent--;

    // Update
    this.emit('');
    this.emit(`${updateLabel}:`);
    this.indent++;
    if (stmt.update) {
      this.generateStatement(stmt.update);
    }
    this.emit(`br label %${condLabel}`);
    this.indent--;

    // End
    this.emit('');
    this.emit(`${endLabel}:`);

    this.loopStack.pop();
  }

  private generateBreak(): void {
    if (this.loopStack.length === 0) {
      throw new Error('break statement outside of loop');
    }
    const loop = this.loopStack[this.loopStack.length - 1];
    this.emit(`br label %${loop.breakLabel}`);
  }

  private generateContinue(): void {
    if (this.loopStack.length === 0) {
      throw new Error('continue statement outside of loop');
    }
    const loop = this.loopStack[this.loopStack.length - 1];
    this.emit(`br label %${loop.continueLabel}`);
  }

  private generateExpression(expr: Expression): string {
    switch (expr.kind) {
      case ASTKind.NumberLiteral:
        return (expr as NumberLiteral).value.toString();
      
      case ASTKind.StringLiteral:
        return this.generateStringLiteral(expr as StringLiteral);
      
      case ASTKind.BoolLiteral:
        return (expr as BoolLiteral).value ? '1' : '0';
      
      case ASTKind.NullLiteral:
        return 'null';
      
      case ASTKind.Identifier:
        return this.generateIdentifier(expr as Identifier);
      
      case ASTKind.BinaryExpr:
        return this.generateBinaryExpr(expr as BinaryExpr);
      
      case ASTKind.UnaryExpr:
        return this.generateUnaryExpr(expr as UnaryExpr);
      
      case ASTKind.CallExpr:
        return this.generateCallExpr(expr as CallExpr);
      
      case ASTKind.IndexExpr:
        return this.generateIndexExpr(expr as IndexExpr);
      
      case ASTKind.MemberExpr:
        return this.generateMemberExpr(expr as MemberExpr);
      
      case ASTKind.AddressofExpr:
        return this.generateAddressof(expr as AddressofExpr);
      
      default:
        return '0';
    }
  }

  private generateStringLiteral(expr: StringLiteral): string {
    const globalName = `@.str.${this.stringCounter++}`;
    this.stringLiterals.set(globalName, expr.value);
    
    const temp = this.newTemp();
    const len = expr.value.length + 1;
    this.emit(`${temp} = getelementptr inbounds [${len} x i8], ptr ${globalName}, i32 0, i32 0`);
    return temp;
  }

  private generateIdentifier(expr: Identifier): string {
    // Check if it's a global constant
    const global = this.globals.get(expr.name);
    if (global) {
      // If it's an array type, return pointer directly (don't load)
      if (global.type.startsWith('[')) {
        // Array type - return pointer to array
        return `@${expr.name}`;
      }
      
      // Regular global - load value
      const temp = this.newTemp();
      this.emit(`${temp} = load ${global.type}, ptr @${expr.name}, align ${this.getAlignment(global.type)}`);
      this.tempTypes.set(temp, global.type);
      return temp;
    }
    
    // Check if it's a parameter (has .addr version)
    if (this.currentFunctionParams.has(expr.name)) {
      const paramType = this.currentFunctionParamTypes.get(expr.name) || 'i32';
      const temp = this.newTemp();
      this.emit(`${temp} = load ${paramType}, ptr %${expr.name}.addr, align ${this.getAlignment(paramType)}`);
      this.tempTypes.set(temp, paramType);
      return temp;
    }
    
    // Otherwise it's a local variable
    const temp = this.newTemp();
    // Use tracked local var type if available, otherwise default to i32
    const localType = this.localVarTypes.get(expr.name) || 'i32';
    // For array types, return pointer (don't load)
    if (localType.startsWith('[')) {
      // Local array: return pointer directly (hoisted alloca)
      this.tempTypes.set(`%${expr.name}`, localType);
      return `%${expr.name}`;
    }
    this.emit(`${temp} = load ${localType}, ptr %${expr.name}, align ${this.getAlignment(localType)}`);
    this.tempTypes.set(temp, localType);
    return temp;
  }

  private generateBinaryExpr(expr: BinaryExpr): string {
    const left = this.generateExpression(expr.left);
    const right = this.generateExpression(expr.right);
    const temp = this.newTemp();

    const opMap: Record<string, string> = {
      '+': 'add',
      '-': 'sub',
      '*': 'mul',
      '/': 'sdiv',
      '%': 'srem',
      '==': 'icmp eq',
      '!=': 'icmp ne',
      '<': 'icmp slt',
      '<=': 'icmp sle',
      '>': 'icmp sgt',
      '>=': 'icmp sge',
      '&&': 'and',
      '||': 'or',
    };

    const op = opMap[expr.operator] || 'add';
    const isComparison = op.startsWith('icmp');
    const resultType = isComparison ? 'i1' : 'i32';

    // Determine operand type - use tracked type of left operand if available
    const leftType = this.getValueType(left);
    const operandType = (leftType === 'ptr' || right === 'null') ? 'ptr' : 'i32';

    this.emit(`${temp} = ${op} ${operandType} ${left}, ${right}`);
    this.tempTypes.set(temp, resultType);
    
    return temp;
  }

  private generateUnaryExpr(expr: UnaryExpr): string {
    const operand = this.generateExpression(expr.operand);
    const temp = this.newTemp();

    if (expr.operator === '-') {
      this.emit(`${temp} = sub i32 0, ${operand}`);
    } else if (expr.operator === '!') {
      this.emit(`${temp} = xor i1 ${operand}, true`);
    }

    return temp;
  }

  private generateCallExpr(expr: CallExpr): string {
    // Handle member expression calls: console.log(...), fs.read(...)
    if (expr.callee.kind === ASTKind.MemberExpr) {
      return this.generateMemberCallExpr(expr);
    }

    const callee = (expr.callee as Identifier).name;
    
    // Handle built-in functions
    if (callee === 'string_length') {
      return this.generateStringLength(expr.args[0]);
    }
    
    if (callee === 'string_char_at') {
      return this.generateStringCharAt(expr.args[0], expr.args[1]);
    }

    // Check if it's an imported symbol (direct import: import { add } from "math")
    const importedSym = this.importedSymbols.get(callee);
    if (importedSym) {
      return this.generateImportedCall(callee, callee, importedSym, expr.args);
    }
    
    // Regular function call
    const args = expr.args.map((arg, i) => {
      const value = this.generateExpression(arg);
      // Use known param type if available (for proper type matching)
      const funcInfoForArgs = this.functions.get(callee);
      const paramType = funcInfoForArgs && funcInfoForArgs.paramTypes[i]
        ? funcInfoForArgs.paramTypes[i]
        : this.getValueType(value);
      return `${paramType} ${value}`;
    }).join(', ');

    // Look up function return type
    const funcInfo = this.functions.get(callee);
    const returnType = funcInfo ? funcInfo.returnType : 'i32';

    if (returnType === 'void') {
      this.emit(`call void @${callee}(${args})`);
      return '0';
    }

    const temp = this.newTemp();
    this.emit(`${temp} = call ${returnType} @${callee}(${args})`);
    this.tempTypes.set(temp, returnType);
    return temp;
  }

  // Handle calls like: console.log("hello"), fs.readFile(path)
  private generateMemberCallExpr(expr: CallExpr): string {
    const memberExpr = expr.callee as MemberExpr;
    
    // Get namespace (e.g. "console")
    let namespaceName = '';
    if (memberExpr.object.kind === ASTKind.Identifier) {
      namespaceName = (memberExpr.object as Identifier).name;
    } else {
      // Fallback
      return this.generateExpression(expr.callee);
    }
    
    const methodName = memberExpr.member;           // e.g. "log"
    const dotName = `${namespaceName}.${methodName}`; // e.g. "console.log"
    const mangledName = `${namespaceName}_${methodName}`; // e.g. "console_log"

    // Look up the imported symbol
    const importedSym = this.importedSymbols.get(dotName);
    if (importedSym) {
      return this.generateImportedCall(dotName, mangledName, importedSym, expr.args);
    }

    // Check if it might be a method on a known type - fall back to direct call
    const args = expr.args.map((arg, i) => {
      const value = this.generateExpression(arg);
      const funcInfoForArgs = this.functions.get(mangledName);
      const paramType = funcInfoForArgs && funcInfoForArgs.paramTypes[i]
        ? funcInfoForArgs.paramTypes[i]
        : this.getValueType(value);
      return `${paramType} ${value}`;
    }).join(', ');

    const funcInfo = this.functions.get(mangledName);
    const returnType = funcInfo ? funcInfo.returnType : 'i32';

    if (returnType === 'void') {
      this.emit(`call void @${mangledName}(${args})`);
      return '0';
    }

    const temp = this.newTemp();
    this.emit(`${temp} = call ${returnType} @${mangledName}(${args})`);
    this.tempTypes.set(temp, returnType);
    return temp;
  }

  // Generate call to an imported function, emitting external decl if needed
  private generateImportedCall(
    localName: string,
    mangledName: string,
    sym: ExportedSymbol,
    argExprs: Expression[]
  ): string {
    // Ensure external declaration is emitted
    this.ensureExternalDeclaration(mangledName, sym);
    
    // Generate argument list using known param types
    const paramTypes = sym.paramTypes || [];
    const args = argExprs.map((arg, i) => {
      const value = this.generateExpression(arg);
      const type = paramTypes[i] ?? this.getValueType(value);
      return `${type} ${value}`;
    }).join(', ');

    const returnType = sym.llvmType || 'void';
    
    if (returnType === 'void') {
      this.emit(`call void @${mangledName}(${args})`);
      return '0';
    }

    const temp = this.newTemp();
    this.emit(`${temp} = call ${returnType} @${mangledName}(${args})`);
    this.tempTypes.set(temp, returnType);
    return temp;
  }

  private generateStringLength(strExpr: Expression): string {
    // string_length(str) - count characters until null terminator
    const str = this.generateExpression(strExpr);
    
    const lenVar = this.newTemp();
    const loopLabel = this.newLabel('strlen.loop');
    const doneLabel = this.newLabel('strlen.done');
    
    // Initialize length to 0
    this.emit(`${lenVar} = alloca i32, align 4`);
    this.emit(`store i32 0, ptr ${lenVar}, align 4`);
    this.emit(`br label %${loopLabel}`);
    
    // Loop
    this.emit('');
    this.emit(`${loopLabel}:`);
    this.indent++;
    const lenVal = this.newTemp();
    this.emit(`${lenVal} = load i32, ptr ${lenVar}, align 4`);
    
    const charPtr = this.newTemp();
    this.emit(`${charPtr} = getelementptr inbounds i8, ptr ${str}, i32 ${lenVal}`);
    
    const charVal = this.newTemp();
    this.emit(`${charVal} = load i8, ptr ${charPtr}, align 1`);
    
    const isZero = this.newTemp();
    this.emit(`${isZero} = icmp eq i8 ${charVal}, 0`);
    this.emit(`br i1 ${isZero}, label %${doneLabel}, label %${loopLabel}.incr`);
    this.indent--;
    
    // Increment
    this.emit('');
    this.emit(`${loopLabel}.incr:`);
    this.indent++;
    const newLen = this.newTemp();
    this.emit(`${newLen} = add i32 ${lenVal}, 1`);
    this.emit(`store i32 ${newLen}, ptr ${lenVar}, align 4`);
    this.emit(`br label %${loopLabel}`);
    this.indent--;
    
    // Done
    this.emit('');
    this.emit(`${doneLabel}:`);
    this.indent++;
    const result = this.newTemp();
    this.emit(`${result} = load i32, ptr ${lenVar}, align 4`);
    this.indent--;
    
    return result;
  }

  private generateStringCharAt(strExpr: Expression, indexExpr: Expression): string {
    // string_char_at(str, index) - get character at index
    const str = this.generateExpression(strExpr);
    const index = this.generateExpression(indexExpr);
    
    const charPtr = this.newTemp();
    this.emit(`${charPtr} = getelementptr inbounds i8, ptr ${str}, i32 ${index}`);
    
    const charVal = this.newTemp();
    this.emit(`${charVal} = load i8, ptr ${charPtr}, align 1`);
    
    // Extend i8 to i32
    const result = this.newTemp();
    this.emit(`${result} = sext i8 ${charVal} to i32`);
    
    return result;
  }

  private generateIndexExpr(expr: IndexExpr): string {
    const base = (expr.base as Identifier).name;
    const index = this.generateExpression(expr.index);
    
    // Check if it's a global array
    const global = this.globals.get(base);
    if (global && global.type.startsWith('[')) {
      // Global array: @name
      // Extract element type from array type: [100 x %Token] -> %Token
      const match = global.type.match(/\[.*? x (.*?)\]/);
      const elementType = match ? match[1] : 'i32';
      
      const elemPtrTemp = this.newTemp();
      this.emit(`${elemPtrTemp} = getelementptr inbounds ${global.type}, ptr @${base}, i32 0, i32 ${index}`);
      
      const temp = this.newTemp();
      this.emit(`${temp} = load ${elementType}, ptr ${elemPtrTemp}, align 4`);
      
      // Track the type of this temp variable
      this.tempTypes.set(temp, elementType);
      
      return temp;
    }
    
    // Global pointer type (e.g. ptr<i8> source = 0) - load pointer then GEP
    if (global && global.type === 'ptr') {
      // Load the pointer value first
      const ptrTemp = this.newTemp();
      this.emit(`${ptrTemp} = load ptr, ptr @${base}, align 8`);
      
      // GEP with single index into the pointed-to data
      const elemPtrTemp = this.newTemp();
      this.emit(`${elemPtrTemp} = getelementptr inbounds i8, ptr ${ptrTemp}, i32 ${index}`);
      
      const temp = this.newTemp();
      this.emit(`${temp} = load i8, ptr ${elemPtrTemp}, align 1`);
      
      // Extend i8 to i32 for use in expressions
      const extTemp = this.newTemp();
      this.emit(`${extTemp} = sext i8 ${temp} to i32`);
      this.tempTypes.set(extTemp, 'i32');
      return extTemp;
    }
    
    // Local array: %name - use proper element type GEP
    const localType = this.localVarTypes.get(base);
    const elemPtrTemp = this.newTemp();
    
    if (localType && localType.startsWith('[')) {
      // Local array with known type: [N x T]
      const match = localType.match(/\[.*? x (.*?)\]/);
      const elementType = match ? match[1] : 'i32';
      this.emit(`${elemPtrTemp} = getelementptr inbounds ${localType}, ptr %${base}, i32 0, i32 ${index}`);
      const temp = this.newTemp();
      this.emit(`${temp} = load ${elementType}, ptr ${elemPtrTemp}, align ${this.getAlignment(elementType)}`);
      this.tempTypes.set(temp, elementType);
      return temp;
    }
    
    // Fallback: treat as i32 array
    this.emit(`${elemPtrTemp} = getelementptr inbounds i32, ptr %${base}, i32 ${index}`);
    const temp = this.newTemp();
    this.emit(`${temp} = load i32, ptr ${elemPtrTemp}, align 4`);
    
    // Track type
    this.tempTypes.set(temp, 'i32');
    
    return temp;
  }

  private generateMemberExpr(expr: MemberExpr): string {
    // Handle obj.field or arr[i].field
    if (expr.object.kind === ASTKind.IndexExpr) {
      const indexExpr = expr.object as IndexExpr;
      const base = (indexExpr.base as Identifier).name;
      const index = this.generateExpression(indexExpr.index);
      
      const structType = this.guessStructType(base);
      const fieldIndex = this.getFieldIndex(structType, expr.member);
      
      // Check if base is global array
      const global = this.globals.get(base);
      const basePtr = global && global.type.startsWith('[') ? `@${base}` : `%${base}`;
      
      // For array of structs: arr[i].field
      const elemPtrTemp = this.newTemp();
      this.emit(`${elemPtrTemp} = getelementptr inbounds %${structType}, ptr ${basePtr}, i32 ${index}`);
      
      const fieldPtrTemp = this.newTemp();
      this.emit(`${fieldPtrTemp} = getelementptr inbounds %${structType}, ptr ${elemPtrTemp}, i32 0, i32 ${fieldIndex}`);
      
      const temp = this.newTemp();
      this.emit(`${temp} = load i32, ptr ${fieldPtrTemp}, align 4`);
      return temp;
    }
    
    // Simple obj.field
    if (expr.object.kind === ASTKind.Identifier) {
      const obj = (expr.object as Identifier).name;
      const structType = this.guessStructType(obj);
      const fieldIndex = this.getFieldIndex(structType, expr.member);
      
      const fieldPtrTemp = this.newTemp();
      this.emit(`${fieldPtrTemp} = getelementptr inbounds %${structType}, ptr %${obj}, i32 0, i32 ${fieldIndex}`);
      
      const temp = this.newTemp();
      this.emit(`${temp} = load i32, ptr ${fieldPtrTemp}, align 4`);
      return temp;
    }
    
    return '0';
  }

  private generateAddressof(expr: AddressofExpr): string {
    // addressof(variable) returns pointer to variable
    if (expr.operand.kind === ASTKind.Identifier) {
      const ident = expr.operand as Identifier;
      // Check if it's a global variable
      const global = this.globals.get(ident.name);
      if (global) {
        return `@${ident.name}`;
      }
      // Check if it's a parameter
      if (this.currentFunctionParams.has(ident.name)) {
        return `%${ident.name}.addr`;
      }
      // Local variable: the %variable is already a pointer from alloca
      return `%${ident.name}`;
    }
    
    // addressof(arr[index]) - return pointer to array element
    if (expr.operand.kind === ASTKind.IndexExpr) {
      const indexExpr = expr.operand as IndexExpr;
      if (indexExpr.base.kind === ASTKind.Identifier) {
        const base = (indexExpr.base as Identifier).name;
        const index = this.generateExpression(indexExpr.index);
        
        const global = this.globals.get(base);
        const elemPtrTemp = this.newTemp();
        
        if (global && global.type.startsWith('[')) {
          // Global array
          this.emit(`${elemPtrTemp} = getelementptr inbounds ${global.type}, ptr @${base}, i32 0, i32 ${index}`);
        } else if (global && global.type === 'ptr') {
          // Global pointer: load then GEP
          const ptrVal = this.newTemp();
          this.emit(`${ptrVal} = load ptr, ptr @${base}, align 8`);
          this.emit(`${elemPtrTemp} = getelementptr inbounds i8, ptr ${ptrVal}, i32 ${index}`);
        } else {
          // Local array: use type from localVarTypes
          const localType = this.localVarTypes.get(base);
          if (localType && localType.startsWith('[')) {
            this.emit(`${elemPtrTemp} = getelementptr inbounds ${localType}, ptr %${base}, i32 0, i32 ${index}`);
          } else {
            this.emit(`${elemPtrTemp} = getelementptr inbounds i8, ptr %${base}, i32 ${index}`);
          }
        }
        
        this.tempTypes.set(elemPtrTemp, 'ptr');
        return elemPtrTemp;
      }
    }
    
    return 'null';
  }

  // Helper methods
  private getLLVMType(type: TypeAnnotation): string {
    if (type.isPointer) {
      return 'ptr';
    }
    
    if (type.isArray) {
      const elemType = this.getLLVMTypeByName(type.name);
      return `[${type.arraySize || 0} x ${elemType}]`;
    }
    
    return this.getLLVMTypeByName(type.name);
  }

  private getLLVMTypeByName(name: string): string {
    const typeMap: Record<string, string> = {
      'i8': 'i8',
      'i16': 'i16',
      'i32': 'i32',
      'i64': 'i64',
      'u8': 'i8',
      'u16': 'i16',
      'u32': 'i32',
      'u64': 'i64',
      'f32': 'float',
      'f64': 'double',
      'bool': 'i1',
      'void': 'void',
    };

    if (typeMap[name]) {
      return typeMap[name];
    }

    // Check if it's a struct type
    if (this.structs.has(name)) {
      return `%${name}`;
    }

    return 'i32'; // default
  }

  private getAlignment(type: string): number {
    if (type.startsWith('i8')) return 1;
    if (type.startsWith('i16')) return 2;
    if (type.startsWith('i32')) return 4;
    if (type.startsWith('i64')) return 8;
    if (type === 'float') return 4;
    if (type === 'double') return 8;
    if (type === 'ptr') return 8;
    return 4;
  }

  private getValueType(value: string): string {
    // Check if we have tracked type for this temp variable
    if (value.startsWith('%')) {
      const trackedType = this.tempTypes.get(value);
      if (trackedType) {
        return trackedType;
      }
      // Default to i32 for untracked temps
      return 'i32';
    }
    
    // Numbers are i32
    if (/^\d+$/.test(value)) {
      return 'i32';
    }
    
    // Default
    return 'i32';
  }

  private getFieldIndex(structName: string, fieldName: string): number {
    const structInfo = this.structs.get(structName);
    if (!structInfo) return 0;
    
    const index = structInfo.fields.findIndex(f => f.name === fieldName);
    return index >= 0 ? index : 0;
  }

  private guessStructType(varName: string): string {
    // Simple heuristic: if variable name contains a struct name, use it
    // In a real compiler, we'd track variable types properly
    for (const structName of this.structs.keys()) {
      if (varName.toLowerCase().includes(structName.toLowerCase())) {
        return structName;
      }
    }
    
    // Default to first struct if available
    const firstStruct = Array.from(this.structs.keys())[0];
    return firstStruct || 'Unknown';
  }

  // Coerce a value from srcType to destType, emitting conversion instructions as needed
  // Returns the new value (possibly a new temp)
  private coerceToType(value: string, srcType: string, destType: string): string {
    if (srcType === destType) return value;
    // i32 -> i8: truncate
    if (srcType === 'i32' && destType === 'i8') {
      // If value is a numeric literal, just return truncated constant
      if (/^-?\d+$/.test(value)) {
        return value; // LLVM will accept i8 immediate literals written as i32 values in trunc
      }
      const temp = this.newTemp();
      this.emit(`${temp} = trunc i32 ${value} to i8`);
      this.tempTypes.set(temp, 'i8');
      return temp;
    }
    // i8 -> i32: sign extend
    if (srcType === 'i8' && destType === 'i32') {
      const temp = this.newTemp();
      this.emit(`${temp} = sext i8 ${value} to i32`);
      this.tempTypes.set(temp, 'i32');
      return temp;
    }
    return value;
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\0A')
      .replace(/\t/g, '\\09')
      .replace(/"/g, '\\"');
  }

  private newTemp(): string {
    return `%${this.tempCounter++}`;
  }

  private newLabel(prefix: string): string {
    return `${prefix}.${this.labelCounter++}`;
  }

  private emit(line: string): void {
    const indentation = '  '.repeat(this.indent);
    this.output.push(indentation + line);
  }
}
