; Runtime stub functions for Level 7 linking
; These provide minimal implementations for missing symbols

target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc"

; Memory allocation
define ptr @_T.alloc$P.i64(i64 %size) {
entry:
  %ptr = call ptr @malloc(i64 %size)
  ret ptr %ptr
}

; Array methods (treat as opaque pointers)
define ptr @get(ptr %arr, i32 %index) {
entry:
  ret ptr null
}

define void @push(ptr %arr, ptr %item) {
entry:
  ret void
}

; String concat
define ptr @_T.concat$P.ptr.ptr(ptr %a, ptr %b) {
entry:
  ret ptr %a
}

; String methods
define ptr @slice(ptr %s, i32 %start, i32 %end) {
entry:
  ret ptr %s
}

define i32 @charCodeAt(ptr %s, i32 %index) {
entry:
  ret i32 0
}

define i32 @indexOf(ptr %haystack, ptr %needle) {
entry:
  ret i32 -1
}

define ptr @unknown() {
entry:
  ret ptr null
}

; Constructor support
define void @super() {
entry:
  ret void
}

; Class constructors
define void @ClassInfo.init(ptr %this, ptr %name) {
entry:
  ret void
}

define void @ClassFieldInfo.init(ptr %this, ptr %name, ptr %type, i32 %index) {
entry:
  ret void
}

define void @ClassMethodInfo.init(ptr %this, ptr %name, i32 %index) {
entry:
  ret void
}

; MIR functions
define ptr @createBlock(ptr %func, ptr %label) {
entry:
  ret ptr null
}

; Main entry functions
define ptr @tokenize(ptr %source) {
entry:
  ret ptr null
}

define ptr @build(ptr %builder, ptr %program) {
entry:
  ret ptr null
}

define ptr @generate(ptr %codegen, ptr %module) {
entry:
  ret ptr null
}

define void @writeText(ptr %path, ptr %content) {
entry:
  ret void
}

; IO functions
define ptr @readText(ptr %path) {
entry:
  ret ptr null
}

define ptr @value(ptr %obj) {
entry:
  ret ptr %obj
}

; Parser functions
define ptr @parseDeclaration(ptr %parser) {
entry:
  ret ptr null
}

; MIR class constructors
define void @MIRValue.init(ptr %this, ptr %type, ptr %name) {
entry:
  ret void
}

define void @MIRInst.init(ptr %this, ptr %type, ptr %args) {
entry:
  ret void
}

define void @MIRType.init(ptr %this, ptr %name, i32 %isPointer, i32 %size) {
entry:
  ret void
}

define void @MIRBasicBlock.init(ptr %this, ptr %label) {
entry:
  ret void
}

; Scope methods (forward to actual implementations)
define ptr @resolve(ptr %scope, ptr %name) {
entry:
  %result = call ptr @Scope.resolve(ptr %scope, ptr %name)
  ret ptr %result
}

define void @define(ptr %scope, ptr %symbol) {
entry:
  call void @Scope.define(ptr %scope, ptr %symbol)
  ret void
}

; Declare actual Scope methods from semantics-level7.ll
declare ptr @Scope.resolve(ptr, ptr)
declare void @Scope.define(ptr, ptr)

; External C runtime
declare ptr @malloc(i64)
