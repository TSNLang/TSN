# TSN Documentation Archive

This directory contains historical documentation from the TSN compiler development journey.

---

## 📁 Contents

### `phases/` Directory
Contains phase-by-phase development documentation (Phases 1-32):

**Phase Categories**:
- **Phases 1-10**: Basic compiler infrastructure (lexer, parser, AST)
- **Phases 11-20**: Type system, classes, generics
- **Phases 21-30**: Self-compilation preparation, exports, modules
- **Phases 31-32**: Bootstrap compiler refinement

**Total**: 23 phase documents

### Root Archive Files
Historical project status documents:

- `REWRITE_STATUS.md` - Project rewrite tracking
- `SELF_COMPILATION_STATUS.md` - Early self-hosting attempts
- `ROADMAP_TO_TRUE_SELF_HOSTING.md` - Strategic planning
- `MILESTONE_PHASE11.md` - Phase 11 milestone documentation

---

## 🎯 Purpose

These documents are **archived** (not deleted) because:

1. **Historical Value**: Show the complete development journey
2. **Reference Material**: Useful for understanding design decisions
3. **Research Resource**: Valuable for compiler development research
4. **Context**: Explains why certain approaches were taken

---

## 📊 Development Timeline

### Early Phases (1-10): April-May 2026
**Focus**: Basic compiler infrastructure

Key achievements:
- Lexer implementation
- Parser foundation
- AST node types
- Basic code generation

### Middle Phases (11-20): May-June 2026
**Focus**: Type system and OOP features

Key achievements:
- Generic types
- Class system
- Method calls
- Type inference

### Later Phases (21-30): June-July 2026
**Focus**: Self-compilation preparation

Key achievements:
- Export system
- Module imports
- Bootstrap refinement
- Self-compilation tests

### Final Phases (31-32): July 2026
**Focus**: Bootstrap polish before self-hosting push

Key achievements:
- Field parsing improvements
- Constructor handling
- Method resolution

---

## 🔍 Finding Information

### By Phase Number:
All phase documents follow the pattern: `PHASE{number}_{description}.md`

Example:
- `PHASE10_STATUS.md` - Phase 10 status
- `PHASE16_STATUS.md` - Phase 16 status
- `PHASE23_STATUS.md` - Phase 23 status

### By Topic:

**Type System**:
- phases/PHASE11_STATUS.md (generics)
- phases/PHASE14_STATUS.md (type inference)

**Classes & OOP**:
- phases/PHASE13_STATUS.md (classes)
- phases/PHASE15_STATUS.md (methods)

**Self-Compilation**:
- SELF_COMPILATION_STATUS.md
- ROADMAP_TO_TRUE_SELF_HOSTING.md
- phases/PHASE24_SELF_COMPILATION.md

**Bootstrap**:
- phases/PHASE31_STATUS.md
- phases/PHASE32_STATUS.md

---

## 📈 Phase Statistics

### Total Phases: 32 (archived) + 5 (active) = 37 total

**Archived** (Phases 1-32):
- Documents: 23 in phases/ + 4 project docs = 27 files
- Time span: April 8 - July 14, 2026 (~96 days)
- Commits: ~260 (of 303 total)

**Active** (Phases 33-37):
- Documents: 16 phase docs + 4 reports = 20 files
- Time span: July 14 - August 6, 2026 (~23 days)
- Key achievement: Fixed point self-hosting

---

## 🎯 Active Documentation

For current project status, see:

### Root Directory (Active):
- Phase 33-37 documents (recent achievements)
- FINAL_VERIFICATION_REPORT.md
- PROJECT_SUMMARY.md
- CHANGELOG.md

### Why Not Archived?
Phases 33-37 document the **self-hosting achievement** (April-August 2026), which is the project's current major milestone and frequently referenced.

---

## 📚 Recommended Reading Order

### For Full History:
1. Start with Phase 1 documents
2. Progress through phases sequentially
3. Read milestone documents (PHASE11, PHASE24, etc.)
4. Finish with ROADMAP_TO_TRUE_SELF_HOSTING.md
5. Move to active Phase 33-37 docs in root

### For Quick Overview:
1. REWRITE_STATUS.md - Project evolution
2. MILESTONE_PHASE11.md - Key milestone
3. ROADMAP_TO_TRUE_SELF_HOSTING.md - Strategic planning
4. Then read Phase 33-37 in root for completion

---

## 🔧 Technical Phases Overview

### Foundation (Phases 1-10):
- ✅ Lexer with token types
- ✅ Recursive descent parser
- ✅ AST node definitions
- ✅ Basic LLVM IR codegen

### Type System (Phases 11-20):
- ✅ Generic type parameters
- ✅ Generic instantiation
- ✅ Class definitions
- ✅ Method resolution
- ✅ Type inference

### Modules (Phases 21-30):
- ✅ Export declarations
- ✅ Import statements
- ✅ Module resolution
- ✅ Cross-module compilation

### Bootstrap (Phases 31-32):
- ✅ Field parsing
- ✅ Constructor bodies
- ✅ Method calls
- ✅ Self-compilation preparation

---

## 🎊 What Came After

**Phases 33-37** (in root directory):
- Phase 33: Export system refinement
- Phase 34-34.5: Inline field parsing (breakthrough!)
- Phase 35: Gen1 compiler creation
- Phase 36: Pragmatic self-hosting
- Phase 37: **Fixed point achievement!** 🎉

**Result**: TSN became self-hosting with mathematical proof of fixed point in record time (96 days total, fastest documented path).

---

## 📊 Documentation Quality

### Coverage:
- Every major phase documented
- Design decisions explained
- Problems and solutions recorded
- Test results included

### Format:
- Markdown for readability
- Consistent structure
- Code examples
- Performance metrics

---

## 💡 Why Keep Archives?

### Educational Value:
- Shows real compiler development process
- Documents dead ends and pivots
- Explains architecture decisions

### Historical Record:
- Complete project timeline
- Evolution of design
- Problem-solving approaches

### Research Value:
- Case study in rapid compiler development
- Bootstrap strategies
- Self-hosting techniques

---

## 🔮 Future Plans

This archive will remain as:
1. Historical reference
2. Research material
3. Educational resource
4. Complete development record

No plans to delete or further reorganize these documents.

---

*Archived: August 6, 2026*  
*Covers: April 8 - July 14, 2026*  
*Status: Complete and stable*
