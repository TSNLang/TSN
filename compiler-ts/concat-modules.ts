#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * concat-modules.ts - Simple module concatenation for TSN
 * 
 * Usage: deno run --allow-read --allow-write concat-modules.ts output.tsn module1.tsn module2.tsn ...
 * 
 * This tool concatenates multiple TSN modules into a single file by:
 * 1. Removing duplicate interface/const definitions
 * 2. Keeping all function definitions
 * 3. Preserving comments
 * 4. Adding module markers
 */

async function main() {
  const args = Deno.args;
  
  if (args.length < 2) {
    console.error('Usage: concat-modules.ts output.tsn module1.tsn module2.tsn ...');
    Deno.exit(1);
  }
  
  const outputFile = args[0];
  const inputFiles = args.slice(1);
  
  console.log(`📦 Concatenating ${inputFiles.length} modules...`);
  
  let output = '';
  const seenInterfaces = new Set<string>();
  const seenConstants = new Set<string>();
  
  // Header
  output += '// ============================================================================\n';
  output += '// CONCATENATED TSN MODULES\n';
  output += `// Generated: ${new Date().toISOString()}\n`;
  output += `// Modules: ${inputFiles.join(', ')}\n`;
  output += '// ============================================================================\n\n';
  
  for (const file of inputFiles) {
    console.log(`   📄 Processing ${file}...`);
    
    try {
      const content = await Deno.readTextFile(file);
      
      output += `// ============================================================================\n`;
      output += `// MODULE: ${file}\n`;
      output += `// ============================================================================\n\n`;
      
      // Parse and filter content
      const lines = content.split('\n');
      let inInterface = false;
      let interfaceName = '';
      let inComment = false;
      let skipUntilNextDeclaration = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Track multi-line comments
        if (trimmed.includes('/*')) inComment = true;
        if (trimmed.includes('*/')) {
          inComment = false;
          continue;
        }
        if (inComment) continue;
        
        // Skip single-line comments that are just separators
        if (trimmed.startsWith('//') && trimmed.includes('====')) {
          continue;
        }
        
        // Skip empty lines at module boundaries
        if (trimmed === '' && skipUntilNextDeclaration) {
          continue;
        }
        
        // Interface declaration
        if (trimmed.startsWith('interface ')) {
          const match = trimmed.match(/interface\s+(\w+)/);
          if (match) {
            interfaceName = match[1];
            if (seenInterfaces.has(interfaceName)) {
              // Skip duplicate interface
              inInterface = true;
              continue;
            }
            seenInterfaces.add(interfaceName);
            inInterface = false;
          }
        }
        
        // Skip lines inside duplicate interface
        if (inInterface) {
          if (trimmed === '}') {
            inInterface = false;
          }
          continue;
        }
        
        // Const declaration
        if (trimmed.startsWith('const ')) {
          const match = trimmed.match(/const\s+(\w+)/);
          if (match) {
            const constName = match[1];
            if (seenConstants.has(constName)) {
              // Skip duplicate constant
              continue;
            }
            seenConstants.add(constName);
          }
        }
        
        // Let declaration (global arrays) - keep first occurrence
        if (trimmed.startsWith('let ') && !trimmed.includes('function')) {
          const match = trimmed.match(/let\s+(\w+)/);
          if (match) {
            const varName = match[1];
            if (seenConstants.has(varName)) {
              // Skip duplicate variable
              continue;
            }
            seenConstants.add(varName);
          }
        }
        
        // Keep everything else (functions, comments, etc.)
        output += line + '\n';
        
        if (trimmed !== '') {
          skipUntilNextDeclaration = false;
        }
      }
      
      output += '\n';
      
    } catch (error) {
      console.error(`   ❌ Error reading ${file}:`, error.message);
      Deno.exit(1);
    }
  }
  
  // Write output
  try {
    await Deno.writeTextFile(outputFile, output);
    console.log(`\n✅ Successfully concatenated to ${outputFile}`);
    console.log(`   📊 Interfaces: ${seenInterfaces.size}`);
    console.log(`   📊 Constants: ${seenConstants.size}`);
    console.log(`   📊 Output size: ${output.length} bytes`);
  } catch (error) {
    console.error(`❌ Error writing ${outputFile}:`, error.message);
    Deno.exit(1);
  }
}

main();
