#!/bin/bash
# build-compiler.sh - Build complete TSN compiler from modules

echo "🔨 Building TSN Compiler..."
echo ""

# Step 1: Concatenate all modules
echo "📦 Step 1: Concatenating modules..."
deno run --allow-read --allow-write compiler-ts/concat-modules.ts \
  src/TSNCompiler.tsn \
  src/FullCompiler.tsn \
  src/Lexer.tsn \
  src/Parser.tsn \
  src/Codegen.tsn

if [ $? -ne 0 ]; then
  echo "❌ Concatenation failed!"
  exit 1
fi

echo ""
echo "✅ Modules concatenated to src/TSNCompiler.tsn"
echo ""

# Step 2: Compile with TypeScript compiler
echo "🔧 Step 2: Compiling TSN → LLVM IR..."
deno run --allow-read --allow-write compiler-ts/src/main.ts \
  src/TSNCompiler.tsn \
  src/TSNCompiler.ll

if [ $? -ne 0 ]; then
  echo "❌ Compilation failed!"
  exit 1
fi

echo ""
echo "✅ Generated src/TSNCompiler.ll"
echo ""

# Step 3: Compile LLVM IR to executable
echo "🔗 Step 3: Linking to executable..."
clang src/TSNCompiler.ll -o tsnc.exe

if [ $? -ne 0 ]; then
  echo "❌ Linking failed!"
  exit 1
fi

echo ""
echo "✅ Created tsnc.exe"
echo ""
echo "🎉 Build complete!"
echo ""
echo "Usage: ./tsnc.exe input.tsn output.ll"
