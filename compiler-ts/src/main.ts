#!/usr/bin/env -S deno run --allow-read --allow-write

function main() {
  const args = Deno.args;
  
  if (args.length === 0) {
    console.error('Usage: deno run --allow-read --allow-write src/main.ts <input.tsn> [-o output.ll]');
    Deno.exit(1);
  }

  const inputFile = args[0];
  let outputFile = inputFile.replace(/\.tsn$/, '.ll');

  // Parse command line arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '-o' && i + 1 < args.length) {
      outputFile = args[i + 1];
      i++;
    }
  }

  try {
    // Read source file
    console.log(`📖 Reading ${inputFile}...`);
    const source = Deno.readTextFileSync(inputFile);

    // Lexical analysis
    console.log('🔤 Lexical analysis...');
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    console.log(`   ✓ ${tokens.length} tokens`);

    // Parsing
    console.log('🌳 Parsing...');
    const parser = new Parser(tokens);
    const ast = parser.parse();
    console.log(`   ✓ ${ast.declarations.length} declarations`);

    // Code generation
    console.log('⚙️  Code generation...');
    const codegen = new CodeGenerator();
    const llvmIR = codegen.generate(ast);
    console.log(`   ✓ ${llvmIR.split('\n').length} lines of LLVM IR`);

    // Write output
    console.log(`💾 Writing ${outputFile}...`);
    Deno.writeTextFileSync(outputFile, llvmIR);

    console.log('');
    console.log('✨ Compilation successful!');
    console.log('');
    console.log('Next steps:');
    console.log(`  1. Compile to executable: clang ${outputFile} -o program.exe`);
    console.log(`  2. Run: ./program.exe`);
    
  } catch (error) {
    console.error('❌ Compilation failed:');
    console.error(error);
    Deno.exit(1);
  }
}

// Import after function definition to avoid hoisting issues
import { Lexer } from './lexer.ts';
import { Parser } from './parser.ts';
import { CodeGenerator } from './codegen.ts';

main();
