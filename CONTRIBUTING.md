# Contributing to TSN

First off, thank you for considering contributing to TSN! It's people like you that make TSN such a great tool.

## 🌟 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, test cases)
- **Describe the behavior you observed** and what you expected
- **Include your environment details** (OS, compiler version, LLVM version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most TSN users
- **List some examples** of how it would be used

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding style** used throughout the project
3. **Write clear commit messages** following conventional commits
4. **Add tests** if you're adding functionality
5. **Update documentation** if needed
6. **Ensure all tests pass** before submitting

## 🔧 Development Setup

### Prerequisites

- **Windows**: Visual Studio 2019+ with C++ tools, CMake 3.15+
- **Linux**: GCC/Clang, CMake 3.15+, LLVM 14+
- Git

### Setting Up Your Development Environment

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/TSN.git
cd TSN

# Add upstream remote
git remote add upstream https://github.com/TSNLang/TSN.git

# Create a branch for your feature
git checkout -b feature/my-awesome-feature

# Build in debug mode
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Debug
cmake --build .
```

### Running Tests

```bash
# Run example tests
./tsnc ../examples/hello.tsn -o hello.exe
./hello.exe

# Run all examples
cd ..
./scripts/test_all_examples.sh  # Linux/Mac
./scripts/test_all_examples.bat # Windows
```

## 📝 Coding Style

### C++ Code (Compiler)

- Use **4 spaces** for indentation (no tabs)
- Follow **camelCase** for variables and functions
- Use **PascalCase** for classes and structs
- Add comments for complex logic
- Keep functions focused and small

Example:
```cpp
struct TypeName {
    enum class Kind {
        I32,
        F64,
        Ptr
    };
    
    Kind kind = Kind::Void;
    std::unique_ptr<TypeName> pointee;
};
```

### TSN Code (Self-hosting)

- Follow **TypeScript conventions**
- Use **camelCase** for variables and functions
- Use **PascalCase** for interfaces and classes
- Add JSDoc comments for public APIs

Example:
```typescript
interface Token {
    kind: i32;
    pos: i32;
    text: string;
}

function parseToken(input: string): Token {
    // Implementation
}
```

## 🎯 Priority Areas

We especially welcome contributions in these areas:

### High Priority
- 🔥 **For loops** - Implementing `for` statement
- 🔥 **String operations** - String type and operations
- 🔥 **Const keyword** - Immutable variables
- 🔥 **Type inference** - Automatic type deduction

### Medium Priority
- 📚 **Standard library** - Expanding `std:*` modules
- 🧪 **Test suite** - More comprehensive tests
- 📖 **Documentation** - Examples and tutorials
- 🐛 **Bug fixes** - Any reported issues

### Long Term
- 🚀 **Generics** - Generic types and functions
- 🔧 **Macros** - Compile-time code generation
- 🌐 **Linux/macOS support** - Cross-platform improvements
- ⚡ **Optimizations** - Performance improvements

## 📋 Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples
```
feat(parser): Add for loop support

Implemented for loop parsing and code generation.
Supports initialization, condition, and increment.

Closes #123
```

```
fix(codegen): Fix struct member write GEP indices

The GEP instruction was using wrong indices for nested structs.
Now correctly calculates field offsets.

Fixes #456
```

## 🔍 Code Review Process

1. **Automated checks** run on all PRs (build, tests)
2. **Maintainer review** - At least one maintainer must approve
3. **Community feedback** - Other contributors may provide input
4. **Merge** - Once approved and all checks pass

## 🌍 Community

### Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas
- **Pull Requests** - Code contributions

### Getting Help

- Check the [README](README.md) and [documentation](docs/)
- Search existing [issues](https://github.com/TSNLang/TSN/issues)
- Ask in [Discussions](https://github.com/TSNLang/TSN/discussions)

## 📜 License

By contributing to TSN, you agree that your contributions will be licensed under the Apache License 2.0.

## 🙏 Recognition

Contributors will be:
- Listed in the project's contributors page
- Mentioned in release notes for significant contributions
- Given credit in the CHANGELOG

## 💡 First Time Contributors

New to open source? Here are some good first issues:

- Look for issues labeled `good first issue`
- Start with documentation improvements
- Fix typos or improve error messages
- Add more test cases

Don't be afraid to ask questions! We're here to help.

## 🎓 Learning Resources

### Understanding TSN
- Read the [ROADMAP](ROADMAP.md) to understand the project direction
- Study the [examples](examples/) to see TSN in action
- Check [SELF_HOSTING_ACHIEVED.md](SELF_HOSTING_ACHIEVED.md) for milestones

### LLVM Resources
- [LLVM Tutorial](https://llvm.org/docs/tutorial/)
- [LLVM Language Reference](https://llvm.org/docs/LangRef.html)
- [LLVM Programmer's Manual](https://llvm.org/docs/ProgrammersManual.html)

### Compiler Design
- [Crafting Interpreters](https://craftinginterpreters.com/)
- [Engineering a Compiler](https://www.elsevier.com/books/engineering-a-compiler/cooper/978-0-12-088478-0)

---

Thank you for contributing to TSN! Together, we're bringing TypeScript to systems programming. 🚀

*Made with ❤️ by the TSN community*
