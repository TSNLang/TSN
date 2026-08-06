# TSN Documentation

Welcome to the TSN compiler documentation!

## 📚 Current Documentation

### Getting Started
- [Main README](../README.md) - Project overview and quick start
- [CHANGELOG](../CHANGELOG.md) - Version history and changes

### Recent Achievements (Phases 33-37)
Located in project root - documents the path to fixed point self-hosting:

- **Phase 33**: Export system refinement
- **Phase 34-34.5**: Bootstrap compiler inline field parsing (8 documents)
- **Phase 35**: Gen1 compiler creation (4 documents)
- **Phase 36**: Pragmatic self-hosting (2 documents)
- **Phase 37**: Fixed point achievement (1 document)

### Comprehensive Reports
- [FINAL_VERIFICATION_REPORT.md](../FINAL_VERIFICATION_REPORT.md) - Complete test results and proof
- [PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md) - Executive summary with visualizations
- [CLEANUP_CHECKLIST.md](../CLEANUP_CHECKLIST.md) - Project organization roadmap
- [COMMIT_SUMMARY.md](../COMMIT_SUMMARY.md) - Git commit documentation

---

## 📁 Archive

### Historical Documentation
The `archive/` directory contains historical development documentation:

- **archive/phases/** - Phase 1-32 development documents (25+ files)
- **archive/** - Project evolution documents (REWRITE_STATUS, MILESTONE, etc.)

These documents provide valuable context about the compiler's development journey but are archived to keep the root directory clean.

---

## 🎯 What to Read

### For New Users:
1. Start with [../README.md](../README.md)
2. Review [FINAL_VERIFICATION_REPORT.md](../FINAL_VERIFICATION_REPORT.md) for capabilities
3. Check [CHANGELOG.md](../CHANGELOG.md) for feature history

### For Contributors:
1. Read [CONTRIBUTING.md](../CONTRIBUTING.md) (if exists)
2. Review recent Phase documents (33-37) in root
3. Check [PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md) for architecture

### For Researchers:
1. Start with [PROJECT_SUMMARY.md](../PROJECT_SUMMARY.md)
2. Read Phase 37 (fixed point achievement)
3. Explore archive/phases/ for full development history

---

## 🚀 Key Achievements

### Fixed Point Self-Hosting ✅
- **Gen2 == Gen3** (byte-for-byte identical output)
- **Timeline**: 96 days from first commit
- **Fastest documented path to self-hosting** vs GCC (5y), Rust (3y), Go (6y)

### Complete Documentation ✅
- 47+ markdown files (300+ KB)
- Every phase documented
- Mathematical proofs provided
- Industry comparisons included

---

## 📖 Documentation Structure

```
TSN/
├── README.md                          # Main entry point
├── CHANGELOG.md                       # Version history
├── CONTRIBUTING.md                    # Contribution guide (coming soon)
│
├── Phase 33-37 Documentation/         # Recent achievements (in root)
│   ├── PHASE33_STATUS.md
│   ├── PHASE34_*.md (8 files)
│   ├── PHASE35_*.md (4 files)
│   ├── PHASE36_*.md (2 files)
│   └── PHASE37_FIXED_POINT_ACHIEVED.md
│
├── Comprehensive Reports/             # Final summaries (in root)
│   ├── FINAL_VERIFICATION_REPORT.md
│   ├── PROJECT_SUMMARY.md
│   ├── CLEANUP_CHECKLIST.md
│   └── COMMIT_SUMMARY.md
│
└── docs/                              # Documentation directory
    ├── README.md (this file)
    └── archive/
        ├── phases/                    # Historical phase docs (1-32)
        └── *.md                       # Historical project docs
```

---

## 🔍 Finding Information

### By Topic:

**Self-Hosting Journey**:
- Phase 34-37 documents (root directory)
- FINAL_VERIFICATION_REPORT.md

**Compiler Architecture**:
- PROJECT_SUMMARY.md (Module distribution)
- Phase 35-36 documents (Gen1/Gen2 creation)

**Historical Context**:
- docs/archive/phases/ (Phases 1-32)
- CHANGELOG.md (Complete history)

**Development Process**:
- COMMIT_SUMMARY.md
- archive/REWRITE_STATUS.md

---

## 📊 Statistics

- **Total Documentation**: 47+ files (300+ KB)
- **Phase Documents**: 37 (1-37)
- **Archived Documents**: 27 (phases 1-32 + 4 project docs)
- **Active Documents**: 20 (phases 33-37 + reports)

---

## 🎯 Coming Soon

### Planned Documentation:
- [ ] GETTING_STARTED.md - User quickstart guide
- [ ] ARCHITECTURE.md - Compiler design deep dive
- [ ] LANGUAGE_REFERENCE.md - TSN syntax guide
- [ ] DEVELOPMENT.md - Contributor guide
- [ ] TESTING.md - Test suite documentation

---

*Last Updated: August 6, 2026*  
*Status: Documentation organized after fixed point achievement*
