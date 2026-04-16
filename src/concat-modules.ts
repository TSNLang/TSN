import { readFile, writeFile } from 'node:fs/promises';

/**
 * concat-modules.ts - Simple module concatenation for TSN
 *
 * Usage: node src/concat-modules.ts output.tsn module1.tsn module2.tsn ...
 *
 * This tool concatenates multiple TSN modules into a single file by:
 * 1. Removing duplicate interface/const definitions
 * 2. Keeping all function definitions
 * 3. Preserving comments
 * 4. Adding module markers
 */

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: concat-modules.ts output.tsn module1.tsn module2.tsn ...');
    process.exit(1);
  }

  const outputFile = args[0];
  const inputFiles = args.slice(1);

  console.log(`📦 Concatenating ${inputFiles.length} modules...`);

  let output = '';
  const seenInterfaces = new Set<string>();
  const seenConstants = new Set<string>();

  output += '// ============================================================================\n';
  output += '// CONCATENATED TSN MODULES\n';
  output += `// Generated: ${new Date().toISOString()}\n`;
  output += `// Modules: ${inputFiles.join(', ')}\n`;
  output += '// ============================================================================\n\n';

  for (const file of inputFiles) {
    console.log(`   📄 Processing ${file}...`);

    try {
      const content = await readFile(file, 'utf8');

      output += '// ============================================================================\n';
      output += `// MODULE: ${file}\n`;
      output += '// ============================================================================\n\n';

      const lines = content.split('\n');
      let inInterface = false;
      let interfaceName = '';
      let inComment = false;
      let skipUntilNextDeclaration = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.includes('/*')) inComment = true;
        if (trimmed.includes('*/')) {
          inComment = false;
          continue;
        }
        if (inComment) continue;

        if (trimmed.startsWith('//') && trimmed.includes('====')) {
          continue;
        }

        if (trimmed === '' && skipUntilNextDeclaration) {
          continue;
        }

        if (trimmed.startsWith('interface ')) {
          const match = trimmed.match(/interface\s+(\w+)/);
          if (match) {
            interfaceName = match[1];
            if (seenInterfaces.has(interfaceName)) {
              inInterface = true;
              continue;
            }
            seenInterfaces.add(interfaceName);
            inInterface = false;
          }
        }

        if (inInterface) {
          if (trimmed === '}') {
            inInterface = false;
          }
          continue;
        }

        if (trimmed.startsWith('const ')) {
          const match = trimmed.match(/const\s+(\w+)/);
          if (match) {
            const constName = match[1];
            if (seenConstants.has(constName)) {
              continue;
            }
            seenConstants.add(constName);
          }
        }

        if (trimmed.startsWith('let ') && !trimmed.includes('function')) {
          const match = trimmed.match(/let\s+(\w+)/);
          if (match) {
            const varName = match[1];
            if (seenConstants.has(varName)) {
              continue;
            }
            seenConstants.add(varName);
          }
        }

        output += line + '\n';

        if (trimmed !== '') {
          skipUntilNextDeclaration = false;
        }
      }

      output += '\n';
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Error reading ${file}:`, message);
      process.exit(1);
    }
  }

  try {
    await writeFile(outputFile, output, 'utf8');
    console.log(`\n✅ Successfully concatenated to ${outputFile}`);
    console.log(`   📊 Interfaces: ${seenInterfaces.size}`);
    console.log(`   📊 Constants: ${seenConstants.size}`);
    console.log(`   📊 Output size: ${output.length} bytes`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error writing ${outputFile}:`, message);
    process.exit(1);
  }
}

main();
