#!/usr/bin/env -S deno run --allow-read --allow-write

import { Lexer } from './lexer.ts';
import { Parser } from './parser.ts';
import { CodeGenerator } from './codegen.ts';
import { ModuleResolver } from './module-resolver.ts';

// Compile a single .tsn file, returning the LLVM IR string and exported symbols
function compileFile(inputFile: string, outputFile: string, baseDir: string): boolean {
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
    const resolver = new ModuleResolver(baseDir);
    const codegen = new CodeGenerator(resolver);
    const llvmIR = codegen.generate(ast);
    console.log(`   ✓ ${llvmIR.split('\n').length} lines of LLVM IR`);

    // Write output .ll
    console.log(`💾 Writing ${outputFile}...`);
    Deno.writeTextFileSync(outputFile, llvmIR);

    // Write .meta file (for other modules to import this)
    const metaFile = outputFile.replace(/\.ll$/, '.meta');
    const exportedSymbols = codegen.getExportedSymbols();
    if (exportedSymbols.length > 0) {
      const meta = ModuleResolver.generateMetaFile(inputFile, outputFile, exportedSymbols);
      Deno.writeTextFileSync(metaFile, meta);
      console.log(`📋 Writing ${metaFile} (${exportedSymbols.length} exports)...`);
    }

    return true;
  } catch (error) {
    console.error('❌ Compilation failed:');
    console.error(error);
    return false;
  }
}

function printUsage() {
  console.error('Usage:');
  console.error('  Single file:    deno run --allow-read --allow-write src/main.ts <input.tsn> [output.ll]');
  console.error('  Multiple files: deno run --allow-read --allow-write src/main.ts <file1.tsn> <file2.tsn> ... -o <output.ll>');
  console.error('  With linking:   deno run --allow-read --allow-write src/main.ts <file1.tsn> <file2.tsn> --link -o <output.exe>');
}

function main() {
  const args = Deno.args;

  if (args.length === 0) {
    printUsage();
    Deno.exit(1);
  }

  const inputFiles: string[] = [];
  let outputFile = '';
  let doLink = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-o' && i + 1 < args.length) {
      outputFile = args[i + 1];
      i++;
    } else if (args[i] === '--link') {
      doLink = true;
    } else if (!args[i].startsWith('-')) {
      // If it's a .ll file and no -o was given, treat as output file
      if (args[i].endsWith('.ll') && inputFiles.length > 0 && !outputFile) {
        outputFile = args[i];
      } else {
        inputFiles.push(args[i]);
      }
    }
  }

  if (inputFiles.length === 0) {
    printUsage();
    Deno.exit(1);
  }

  // Single file mode (original behavior)
  if (inputFiles.length === 1) {
    const inputFile = inputFiles[0];
    if (!outputFile) {
      outputFile = inputFile.replace(/\.tsn$/, '.ll');
    }

    // Determine base directory for module resolution
    const baseDir = inputFile.includes('/') || inputFile.includes('\\')
      ? inputFile.replace(/[/\\][^/\\]+$/, '')
      : '.';

    const ok = compileFile(inputFile, outputFile, baseDir);

    if (ok) {
      console.log('');
      console.log('✨ Compilation successful!');
      console.log('');
      console.log('Next steps:');
      console.log(`  1. Compile to executable: clang ${outputFile} -o program.exe`);
      console.log(`  2. Run: ./program.exe`);
    } else {
      Deno.exit(1);
    }

    return;
  }

  // Multi-file mode
  console.log(`🔗 Multi-file compilation: ${inputFiles.length} files`);
  console.log('');

  const llFiles: string[] = [];
  let allOk = true;

  for (const inputFile of inputFiles) {
    const llFile = inputFile.replace(/\.tsn$/, '.ll');
    llFiles.push(llFile);

    const baseDir = inputFile.includes('/') || inputFile.includes('\\')
      ? inputFile.replace(/[/\\][^/\\]+$/, '')
      : '.';

    console.log(`--- Compiling ${inputFile} ---`);
    const ok = compileFile(inputFile, llFile, baseDir);
    if (!ok) {
      allOk = false;
    }
    console.log('');
  }

  if (!allOk) {
    console.error('❌ Some files failed to compile');
    Deno.exit(1);
  }

  console.log('✅ All files compiled successfully!');
  console.log('');
  console.log('Generated LLVM IR files:');
  for (const llFile of llFiles) {
    console.log(`  ${llFile}`);
  }

  if (doLink) {
    if (!outputFile) {
      outputFile = 'output.exe';
    }
    console.log('');
    console.log(`🔧 Linking: clang ${llFiles.join(' ')} -o ${outputFile}`);

    // Use Deno command to run clang
    const cmd = new Deno.Command('clang', {
      args: [...llFiles, '-o', outputFile],
      stdout: 'piped',
      stderr: 'piped',
    });

    const result = cmd.outputSync();
    if (result.code === 0) {
      console.log(`✅ Linked: ${outputFile}`);
    } else {
      const stderr = new TextDecoder().decode(result.stderr);
      console.error('❌ Linking failed:');
      console.error(stderr);
      Deno.exit(1);
    }
  } else {
    console.log('');
    console.log('To link manually:');
    console.log(`  clang ${llFiles.join(' ')} -o program.exe`);
  }
}

main();
