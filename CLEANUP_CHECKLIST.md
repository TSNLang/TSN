# TSN Project Cleanup Checklist

**Date**: August 6, 2026  
**Purpose**: Organize project for v1.0 release after fixed point achievement

---

## 🎯 Cleanup Goals

1. Remove temporary/debug files
2. Organize documentation
3. Consolidate test files
4. Clean up build artifacts
5. Prepare for public release

---

## 📁 Files to Review/Remove

### Temporary Test Files (Root Directory):
```
[ ] bootstrap-ast-compare.ll
[ ] bootstrap-test-simple.ll
[ ] ca.ll, ca3.ll, ca4.ll, ca5.ll
[ ] cc.ll, cc3.ll, cc4.ll, cc5.ll
[ ] cl.ll, cl3.ll, cl4.ll, cl5.ll
[ ] cm.ll, cm2.ll, cm3.ll, cm4.ll, cm5.ll
[ ] compare-ast-boot.ll
[ ] self-parser.ll
[ ] test-lexer.ll
[ ] test-lexer-features.tsn
[ ] ca-gen2-final.ll
[ ] ca-gen3-final.ll
```

**Recommendation**: Move to `archive/temp-files/` or delete

---

## 📚 Documentation Consolidation

### Phase Documentation Files (44 files):
Current state: Many PHASE*.md files in root directory

**Options**:

#### Option A: Archive Old Phases
Move Phase 1-33 to `docs/archive/phases/`:
```
[ ] PHASE9_STATUS.md → docs/archive/phases/
[ ] PHASE10_STATUS.md → docs/archive/phases/
[ ] PHASE11_STATUS.md → docs/archive/phases/
... (keep Phase 34-37 in root as they document self-hosting)
```

#### Option B: Create Consolidated Document
Create `docs/DEVELOPMENT_HISTORY.md` merging all phases:
```
[ ] Merge all PHASE*.md into single timeline
[ ] Keep only final achievements visible
[ ] Archive original files
```

#### Option C: Keep Current Structure
```
[x] Keep all phase docs (good for research/reference)
[ ] Just add README.md explaining structure
```

**Recommendation**: Option C + add `docs/README.md` guide

---

## 🗂️ Suggested Directory Structure

### Current Issues:
- Too many files in root directory (44+ md files)
- Temporary .ll files mixed with sources
- Multiple generation directories (gen1, gen2, gen2-test, gen3-test)

### Proposed Structure:

```
TSN/
├── README.md                          (keep - main entry point)
├── CHANGELOG.md                       (keep - version history)
├── LICENSE                            (keep - Apache 2.0)
├── CONTRIBUTING.md                    (keep - contributor guide)
│
├── docs/                              (create - organize documentation)
│   ├── README.md                      (create - doc guide)
│   ├── GETTING_STARTED.md             (create - user guide)
│   ├── ARCHITECTURE.md                (create - compiler design)
│   ├── SELF_HOSTING.md                (keep - merge Phase 34-37)
│   └── archive/
│       └── phases/                    (move - old phase docs)
│
├── compiler/                          (keep - current compiler)
│   ├── src/                          (keep - TSN sources)
│   ├── runtime/                      (keep - runtime.c)
│   ├── tests/                        (create - move test-*.tsn here)
│   └── tsnc.exe                      (keep - latest compiler)
│
├── bootstrap/                         (keep - Python bootstrap)
│   ├── compiler.py                   (keep)
│   ├── *.ll                          (keep - generated IR)
│   ├── tests/                        (create - move test-*.ll here)
│   └── runtime.o                     (keep)
│
├── generations/                       (create - consolidate gens)
│   ├── gen1/
│   │   └── tsnc-gen1.exe
│   ├── gen2/
│   │   └── tsnc-gen2.exe
│   └── gen3/
│       └── tsnc-gen3.exe
│
├── scripts/                           (create - build scripts)
│   ├── build-compiler.ps1
│   ├── build-gen2.ps1
│   ├── build-generations.ps1
│   └── rm.ps1
│
└── archive/                           (create - old/temp files)
    ├── temp-files/                   (ca*.ll, cc*.ll, etc.)
    └── old-builds/
```

---

## 🧹 Specific Cleanup Tasks

### 1. Root Directory Files:

#### Keep (Essential):
- [x] README.md
- [x] CHANGELOG.md
- [x] LICENSE
- [x] CONTRIBUTING.md
- [x] FINAL_VERIFICATION_REPORT.md (just created)
- [x] CLEANUP_CHECKLIST.md (this file)

#### Keep (Important - Recent):
- [x] PHASE34_5_COMPLETE.md
- [x] PHASE35_GEN1_SUCCESS.md
- [x] PHASE36_GEN2_VALIDATION.md
- [x] PHASE37_FIXED_POINT_ACHIEVED.md
- [x] ROADMAP_TO_TRUE_SELF_HOSTING.md

#### Move to `docs/archive/phases/`:
- [ ] PHASE9_STATUS.md through PHASE33_STATUS.md (25 files)
- [ ] MILESTONE_PHASE11.md
- [ ] REWRITE_STATUS.md
- [ ] SELF_COMPILATION_STATUS.md

#### Remove (Temporary):
- [ ] All ca*.ll, cc*.ll, cl*.ll, cm*.ll files (15+ files)
- [ ] bootstrap-ast-compare.ll
- [ ] bootstrap-test-simple.ll
- [ ] compare-ast-boot.ll
- [ ] self-parser.ll
- [ ] test-lexer.ll

### 2. Build Scripts:

#### Current Location: Root
```
build-compiler.ps1
build-gen2.ps1
build-generations.ps1
rm.ps1
```

#### Action:
- [ ] Move to `scripts/` directory
- [ ] Update paths in scripts
- [ ] Create `scripts/README.md` with usage

### 3. Test Files:

#### Compiler Tests (26 files in compiler/):
```
test-arithmetic-simple.tsn
test-ast-simple.tsn
test-class-only.tsn
... (23 more)
```

#### Action:
- [ ] Move to `compiler/tests/`
- [ ] Group by category (arithmetic, class, control-flow, etc.)
- [ ] Update build scripts

#### Bootstrap Tests (10 files in bootstrap/):
```
test-arith.ll
test-arithmetic.ll
test-ast.ll
... (7 more)
```

#### Action:
- [ ] Move to `bootstrap/tests/`
- [ ] Keep generated .ll files with tests

### 4. Generation Directories:

#### Current:
```
gen1/
gen2/
gen2-test/
gen3-test/
```

#### Action:
- [ ] Consolidate to `generations/`
- [ ] Keep one copy of each (remove duplicates)
- [ ] Add README explaining each generation

### 5. Compiler Directory:

#### Current Issues:
- Test files mixed with sources
- No clear separation

#### Action:
- [ ] Keep `src/` clean (only compiler sources)
- [ ] Move test files to `tests/`
- [ ] Keep `runtime/` separate

---

## 📝 Documentation to Create

### High Priority:
- [ ] `docs/GETTING_STARTED.md` - How to use TSN compiler
- [ ] `docs/ARCHITECTURE.md` - Compiler design overview
- [ ] `docs/README.md` - Documentation guide
- [ ] `scripts/README.md` - Build script usage
- [ ] `generations/README.md` - Generation explanation

### Medium Priority:
- [ ] `docs/LANGUAGE_REFERENCE.md` - TSN syntax guide
- [ ] `docs/DEVELOPMENT.md` - How to contribute
- [ ] `docs/TESTING.md` - Test suite guide

### Low Priority:
- [ ] `docs/HISTORY.md` - Consolidated development history
- [ ] `docs/LESSONS_LEARNED.md` - Technical insights

---

## 🔧 Build System Updates

### Tasks:
- [ ] Update all build scripts with new paths
- [ ] Create master build script (build-all.ps1)
- [ ] Add clean script (clean.ps1)
- [ ] Test all builds after reorganization
- [ ] Document build process in README

---

## ✅ Verification After Cleanup

### Checklist:
- [ ] All build scripts work with new structure
- [ ] Gen2 and Gen3 still compile correctly
- [ ] Documentation is accessible and clear
- [ ] No broken links in markdown files
- [ ] Git history preserved
- [ ] .gitignore updated for new structure

---

## 🎯 Priority Levels

### Phase 1: Critical (Do First)
1. Remove temporary .ll files from root (ca*.ll, etc.)
2. Move old phase docs to archive
3. Update README with current status
4. Create docs/README.md guide

### Phase 2: Important (Do Soon)
1. Reorganize test files
2. Consolidate generation directories
3. Move build scripts
4. Create GETTING_STARTED.md

### Phase 3: Polish (Nice to Have)
1. Create comprehensive docs
2. Write language reference
3. Add code examples
4. Create tutorial

---

## 📊 Estimated Impact

### Before Cleanup:
- Root directory: 60+ files
- Documentation: Scattered across root
- Tests: Mixed with sources
- Structure: Confusing for new users

### After Cleanup:
- Root directory: ~10 essential files
- Documentation: Organized in `docs/`
- Tests: Organized by module
- Structure: Clear and professional

---

## 🚀 Post-Cleanup Tasks

### v1.0 Preparation:
1. [ ] Tag fixed point commit as v0.9.0
2. [ ] Create v1.0 milestone
3. [ ] Plan v1.0 features (CLI, error messages, etc.)
4. [ ] Write v1.0 release notes

### Community Preparation:
1. [ ] Create CONTRIBUTORS.md
2. [ ] Set up GitHub Issues templates
3. [ ] Create PR template
4. [ ] Write CODE_OF_CONDUCT.md

---

## 💡 Recommendations

### Short-term (This Week):
- Execute Phase 1 cleanup (remove temp files, organize docs)
- Create essential documentation (GETTING_STARTED, ARCHITECTURE)
- Update README with current status

### Medium-term (This Month):
- Complete Phase 2 cleanup (reorganize tests, scripts)
- Write comprehensive documentation
- Prepare for v1.0 release

### Long-term (Next Quarter):
- Build community resources
- Create tutorials and examples
- Plan ecosystem (package manager, IDE support)

---

## ⚠️ Important Notes

### Before Cleanup:
1. **Create backup branch**: `git checkout -b pre-cleanup-backup`
2. **Commit current state**: `git commit -am "Checkpoint before cleanup"`
3. **Test everything works**: Run all build scripts and tests

### During Cleanup:
1. **Do in small commits**: One logical change per commit
2. **Test after each step**: Ensure builds still work
3. **Update docs immediately**: Keep documentation in sync

### After Cleanup:
1. **Full system test**: Build Gen2, Gen3, verify fixed point
2. **Documentation review**: Check all links and references
3. **Tag release**: `git tag v0.9.0-cleanup`

---

## 📅 Suggested Timeline

### Day 1 (Today):
- [x] Create FINAL_VERIFICATION_REPORT.md
- [x] Create CLEANUP_CHECKLIST.md
- [ ] Remove temporary .ll files
- [ ] Create docs/ directory structure

### Day 2:
- [ ] Move old phase docs to archive
- [ ] Create docs/README.md
- [ ] Create docs/GETTING_STARTED.md
- [ ] Update main README.md

### Day 3:
- [ ] Reorganize test files
- [ ] Move build scripts
- [ ] Update all build scripts

### Day 4:
- [ ] Create comprehensive documentation
- [ ] Test everything
- [ ] Commit and tag

---

**Current Status**: Ready for cleanup  
**Estimated Time**: 4 days  
**Risk Level**: Low (fixed point already proven)  
**Benefit**: Professional project structure for v1.0

---

*Created: August 6, 2026*  
*Purpose: Guide cleanup after fixed point achievement*  
*Next: Execute Phase 1 cleanup tasks*
