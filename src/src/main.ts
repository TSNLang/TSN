import { readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

import { Lexer } from './lexer.ts';
import { Parser } from './parser.ts';
import { CodeGenerator } from './codegen.ts';
import { ModuleResolver } from './module-resolver.ts';
import { Reporter } from './diagnostics.ts';

// Compile a single .tsn file, returning the LLVM IR string and exported symbols.
function compileFile(inputFile: string, outputFile: string, baseDir: string): boolean {
  try {
    console.log(`📖 Reading ${inputFile}...`);
    const source = readFileSync(inputFile, 'utf8');
    const reporter = new Reporter(source, inputFile);

    // Lexical analysis
    console.log('🔤 Lexical analysis...');
    const lexer = new Lexer(source, reporter);
    const tokens = lexer.tokenize();
    
    // Check for lexer errors
    if (reporter.hasErrors()) {
      reporter.print();
      return false;
    }
    console.log(`   ✓ ${tokens.length} tokens`);

    // Parsing
    console.log('🌳 Parsing...');
    const parser = new Parser(tokens, reporter);
    const ast = parser.parse();
    
    // Check for parser errors
    if (reporter.hasErrors()) {
      reporter.print();
      return false;
    }
    console.log(`   ✓ ${ast.declarations.length} declarations`);

    // Code generation
    console.log('⚙️  Code generation...');
    const resolver = new ModuleResolver(baseDir);
    const codegen = new CodeGenerator(resolver);
    const llvmIR = codegen.generate(ast);
    console.log(`   ✓ ${llvmIR.split('\n').length} lines of LLVM IR`);

    // Write output .ll
    console.log(`💾 Writing ${outputFile}...`);
    writeFileSync(outputFile, llvmIR, 'utf8');

    // Write .meta file (for other modules to import this)
    const metaFile = outputFile.replace(/\.ll$/, '.meta');
    const exportedSymbols = codegen.getExportedSymbols();
    if (exportedSymbols.length > 0) {
      const meta = ModuleResolver.generateMetaFile(inputFile, outputFile, exportedSymbols);
      writeFileSync(metaFile, meta, 'utf8');
      console.log(`📋 Writing ${metaFile} (${exportedSymbols.length} exports)...`);
    }

    return true;
  } catch (error) {
    console.error('❌ Compilation failed due to an unexpected error:');
    console.error(error);
    return false;
  }
}

function printUsage() {
  console.error('Usage:');
  console.error('  Single file:    tsn-compiler <input.tsn> [output.ll]');
  console.error('  Multiple files: tsn-compiler <file1.tsn> <file2.tsn> ... -o <output.ll>');
  console.error('  With linking:   tsn-compiler <file1.tsn> <file2.tsn> --link -o <output.exe>');
  console.error('');
  console.error('Examples:');
  console.error('  node src/src/main.ts hello.tsn hello.ll');
  console.error('  bun src/src/main.ts hello.tsn hello.ll');
  console.error('  deno run --allow-read --allow-write --allow-run src/src/main.ts hello.tsn hello.ll');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
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
      if (args[i].endsWith('.ll') && inputFiles.length > 0 && !outputFile) {
        outputFile = args[i];
      } else {
        inputFiles.push(args[i]);
      }
    }
  }

  if (inputFiles.length === 0) {
    printUsage();
    process.exit(1);
  }

  if (inputFiles.length === 1) {
    const inputFile = inputFiles[0];
    if (!outputFile) {
      outputFile = inputFile.replace(/\.(tsn|ts)$/, '.ll');
      if (outputFile === inputFile) outputFile += '.ll';
    }

    const baseDir = dirname(inputFile);
    const ok = compileFile(inputFile, outputFile, baseDir);

    if (ok) {
      console.log('');
      console.log('✨ Compilation successful!');
      console.log('');
      console.log('Next steps:');
      console.log(`  1. Compile to executable: clang ${outputFile} -o program.exe`);
      console.log('  2. Run: ./program.exe');
    } else {
      process.exit(1);
    }

    return;
  }

  console.log(`🔗 Multi-file compilation: ${inputFiles.length} files`);
  console.log('');

  const llFiles: string[] = [];
  let allOk = true;

  for (const inputFile of inputFiles) {
    const llFile = inputFile.replace(/\.(tsn|ts)$/, '.ll');
    llFiles.push(llFile);

    const baseDir = dirname(inputFile);

    console.log(`--- Compiling ${inputFile} ---`);
    const ok = compileFile(inputFile, llFile, baseDir);
    if (!ok) {
      allOk = false;
    }
    console.log('');
  }

  if (!allOk) {
    console.error('❌ Some files failed to compile');
    process.exit(1);
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

    const result = spawnSync('clang', [...llFiles, '-o', outputFile], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (result.status === 0) {
      console.log(`✅ Linked: ${outputFile}`);
    } else {
      console.error('❌ Linking failed:');
      console.error(result.stderr || result.error?.message || 'Unknown linker error');
      process.exit(1);
    }
  } else {
    console.log('');
    console.log('To link manually:');
    console.log(`  clang ${llFiles.join(' ')} -o program.exe`);
  }
}

main();
