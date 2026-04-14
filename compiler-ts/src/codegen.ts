import { Program, Declaration, Statement, Expression, FunctionDecl, InterfaceDecl, VarDecl, Assignment, ReturnStmt, IfStmt, WhileStmt, ForStmt, ExprStmt, BreakStmt, ContinueStmt, BinaryExpr, UnaryExpr, CallExpr, IndexExpr, MemberExpr, Identifier, NumberLiteral, StringLiteral, BoolLiteral, NullLiteral, AddressofExpr, ASTKind, TypeAnnotation } from './types.ts';

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

export class CodeGenerator {
  private output: string[] = [];
  private indent: number = 0;
  private tempCounter: number = 0;
  private labelCounter: number = 0;
  private stringCounter: number = 0;
  private structs: Map<string, StructInfo> = new Map();
  private globals: Map<string, GlobalInfo> = new Map();
  private stringLiterals: Map<string, string> = new Map();
  private loopStack: LoopContext[] = [];
  private currentFunctionParams: Set<string> = new Set();

  generate(program: Program): string {
    // Generate struct definitions first
    for (const decl of program.declarations) {
      if (decl.kind === ASTKind.InterfaceDecl) {
        this.generateInterface(decl);
      }
    }

    // Generate global constants
    for (const decl of program.declarations) {
      if (decl.kind === ASTKind.VarDecl) {
        this.generateGlobalConst(decl);
      }
    }

    // Generate string literals
    this.emit('; String literals');
    for (const [globalName, value] of this.stringLiterals) {
      const escaped = this.escapeString(value);
      const len = value.length + 1; // +1 for null terminator
      this.emit(`${globalName} = private unnamed_addr constant [${len} x i8] c"${escaped}\\00", align 1`);
    }
    this.emit('');

    // Generate function declarations and definitions
    for (const decl of program.declarations) {
      if (decl.kind === ASTKind.FunctionDecl) {
        this.generateFunction(decl);
      }
    }

    return this.output.join('\n');
  }

  private generateGlobalConst(decl: VarDecl): void {
    if (!decl.init || decl.init.kind !== ASTKind.NumberLiteral) {
      console.error(`Global ${decl.isConst ? 'const' : 'let'} ${decl.name} must have a number literal initializer`);
      return;
    }

    const llvmType = decl.type ? this.getLLVMType(decl.type) : 'i32';
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

  private generateFunction(decl: FunctionDecl): void {
    const returnType = this.getLLVMType(decl.returnType);
    const params = decl.params.map(p => `${this.getLLVMType(p.type)} %${p.name}`).join(', ');

    if (decl.isDeclare) {
      // Forward declaration (FFI or forward reference)
      this.emit(`declare ${returnType} @${decl.name}(${params})`);
      this.emit('');
      return;
    }

    // Track parameters for this function
    this.currentFunctionParams.clear();
    for (const param of decl.params) {
      this.currentFunctionParams.add(param.name);
    }

    // Function definition
    this.emit(`define ${returnType} @${decl.name}(${params}) {`);
    this.emit('entry:');
    this.indent++;

    // Allocate space for parameters (to make them mutable)
    for (const param of decl.params) {
      const llvmType = this.getLLVMType(param.type);
      this.emit(`%${param.name}.addr = alloca ${llvmType}, align ${this.getAlignment(llvmType)}`);
      this.emit(`store ${llvmType} %${param.name}, ptr %${param.name}.addr, align ${this.getAlignment(llvmType)}`);
    }

    // Generate function body
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
    
    // Clear parameters after function
    this.currentFunctionParams.clear();
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
    this.emit(`%${stmt.name} = alloca ${llvmType}, align ${this.getAlignment(llvmType)}`);

    if (stmt.init) {
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
          
          // For array of structs: arr[i].field
          // First GEP to get pointer to arr[i]
          const elemPtrTemp = this.newTemp();
          this.emit(`${elemPtrTemp} = getelementptr inbounds %${structType}, ptr %${baseIdent.name}, i32 ${index}`);
          
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
        
        const elemPtrTemp = this.newTemp();
        this.emit(`${elemPtrTemp} = getelementptr inbounds i32, ptr %${baseIdent.name}, i32 0, i32 ${index}`);
        
        const valueType = this.getValueType(value);
        this.emit(`store ${valueType} ${value}, ptr ${elemPtrTemp}, align 4`);
        return;
      }
    }
    
    // Simple identifier assignment
    if (stmt.target.kind === ASTKind.Identifier) {
      const ident = stmt.target as Identifier;
      const valueType = this.getValueType(value);
      this.emit(`store ${valueType} ${value}, ptr %${ident.name}, align 4`);
      return;
    }
  }

  private generateReturn(stmt: ReturnStmt): void {
    if (stmt.value) {
      const value = this.generateExpression(stmt.value);
      const valueType = this.getValueType(value);
      this.emit(`ret ${valueType} ${value}`);
    } else {
      this.emit('ret void');
    }
  }

  private generateIf(stmt: IfStmt): void {
    const condition = this.generateExpression(stmt.condition);
    const thenLabel = this.newLabel('then');
    const elseLabel = stmt.elseBranch ? this.newLabel('else') : this.newLabel('endif');
    const endLabel = this.newLabel('endif');

    this.emit(`br i1 ${condition}, label %${thenLabel}, label %${elseLabel}`);
    
    // Then branch
    this.emit('');
    this.emit(`${thenLabel}:`);
    this.indent++;
    for (const s of stmt.thenBranch) {
      this.generateStatement(s);
    }
    this.emit(`br label %${endLabel}`);
    this.indent--;

    // Else branch
    if (stmt.elseBranch) {
      this.emit('');
      this.emit(`${elseLabel}:`);
      this.indent++;
      for (const s of stmt.elseBranch) {
        this.generateStatement(s);
      }
      this.emit(`br label %${endLabel}`);
      this.indent--;
    }

    // End
    this.emit('');
    this.emit(`${endLabel}:`);
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
    const condition = this.generateExpression(stmt.condition);
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
      const condition = this.generateExpression(stmt.condition);
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
      const temp = this.newTemp();
      this.emit(`${temp} = load ${global.type}, ptr @${expr.name}, align ${this.getAlignment(global.type)}`);
      return temp;
    }
    
    // Check if it's a parameter (has .addr version)
    if (this.currentFunctionParams.has(expr.name)) {
      const temp = this.newTemp();
      this.emit(`${temp} = load i32, ptr %${expr.name}.addr, align 4`);
      return temp;
    }
    
    // Otherwise it's a local variable
    const temp = this.newTemp();
    this.emit(`${temp} = load i32, ptr %${expr.name}, align 4`);
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

    this.emit(`${temp} = ${op} i32 ${left}, ${right}`);
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
    const callee = (expr.callee as Identifier).name;
    
    // Handle built-in functions
    if (callee === 'string_length') {
      return this.generateStringLength(expr.args[0]);
    }
    
    if (callee === 'string_char_at') {
      return this.generateStringCharAt(expr.args[0], expr.args[1]);
    }
    
    // Regular function call
    const args = expr.args.map(arg => {
      const value = this.generateExpression(arg);
      const type = this.getValueType(value);
      return `${type} ${value}`;
    }).join(', ');

    const temp = this.newTemp();
    this.emit(`${temp} = call i32 @${callee}(${args})`);
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
    
    const elemPtrTemp = this.newTemp();
    this.emit(`${elemPtrTemp} = getelementptr inbounds i32, ptr %${base}, i32 0, i32 ${index}`);
    
    const temp = this.newTemp();
    this.emit(`${temp} = load i32, ptr ${elemPtrTemp}, align 4`);
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
      
      // For array of structs: arr[i].field
      const elemPtrTemp = this.newTemp();
      this.emit(`${elemPtrTemp} = getelementptr inbounds %${structType}, ptr %${base}, i32 ${index}`);
      
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
      // Return the address directly (the %variable is already a pointer from alloca)
      return `%${ident.name}`;
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
    // Simple heuristic: if it starts with %, it's a temp variable (i32)
    // if it's a number, it's i32
    if (value.startsWith('%') || /^\d+$/.test(value)) {
      return 'i32';
    }
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
