; Runtime stub functions for Level 7 linking
; Proper implementations for core functionality

target datalayout = "e-m:w-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64-pc-windows-msvc"

; TSN String structure: { i32 refcount, i32 length, [n x i8] bytes }
%TsnString = type { i32, i32, [0 x i8] }

; TSN Array structure: { ptr vtable, ptr data, i32 len, i32 cap }
%TsnArray = type { ptr, ptr, i32, i32 }

; Memory allocation with proper size
define ptr @_T.alloc$P.i64(i64 %size) {
entry:
  %ptr = call ptr @malloc(i64 %size)
  ; Zero initialize
  call void @llvm.memset.p0.i64(ptr %ptr, i8 0, i64 %size, i1 false)
  ret ptr %ptr
}

; Array.get - access element at index
define ptr @get(ptr %arr_ptr, i32 %index) {
entry:
  %arr = bitcast ptr %arr_ptr to ptr
  %data_ptr = getelementptr %TsnArray, ptr %arr, i32 0, i32 1
  %data = load ptr, ptr %data_ptr
  %len_ptr = getelementptr %TsnArray, ptr %arr, i32 0, i32 2
  %len = load i32, ptr %len_ptr
  
  ; Bounds check
  %valid = icmp slt i32 %index, %len
  br i1 %valid, label %valid_access, label %invalid_access

valid_access:
  %elem_ptr = getelementptr ptr, ptr %data, i32 %index
  %elem = load ptr, ptr %elem_ptr
  ret ptr %elem

invalid_access:
  ret ptr null
}

; Array.push - append element
define void @push(ptr %arr_ptr, ptr %item) {
entry:
  %arr = bitcast ptr %arr_ptr to ptr
  %data_ptr_loc = getelementptr %TsnArray, ptr %arr, i32 0, i32 1
  %len_ptr = getelementptr %TsnArray, ptr %arr, i32 0, i32 2
  %cap_ptr = getelementptr %TsnArray, ptr %arr, i32 0, i32 3
  
  %len = load i32, ptr %len_ptr
  %cap = load i32, ptr %cap_ptr
  
  ; Check if resize needed
  %needs_resize = icmp sge i32 %len, %cap
  br i1 %needs_resize, label %resize, label %no_resize

resize:
  ; Double capacity (or set to 8 if 0)
  %is_zero = icmp eq i32 %cap, 0
  %new_cap_doubled = mul i32 %cap, 2
  %new_cap = select i1 %is_zero, i32 8, i32 %new_cap_doubled
  
  ; Allocate new array
  %new_size_words = mul i32 %new_cap, 8
  %new_size = sext i32 %new_size_words to i64
  %new_data = call ptr @malloc(i64 %new_size)
  
  ; Copy old data
  %old_data = load ptr, ptr %data_ptr_loc
  %old_size_words = mul i32 %len, 8
  %old_size = sext i32 %old_size_words to i64
  call void @llvm.memcpy.p0.p0.i64(ptr %new_data, ptr %old_data, i64 %old_size, i1 false)
  
  ; Free old data (skip if null)
  %old_is_null = icmp eq ptr %old_data, null
  br i1 %old_is_null, label %skip_free, label %do_free

do_free:
  call void @free(ptr %old_data)
  br label %skip_free

skip_free:
  ; Update array with new data and capacity
  store ptr %new_data, ptr %data_ptr_loc
  store i32 %new_cap, ptr %cap_ptr
  br label %no_resize

no_resize:
  ; Add item at end
  %data = load ptr, ptr %data_ptr_loc
  %elem_ptr = getelementptr ptr, ptr %data, i32 %len
  store ptr %item, ptr %elem_ptr
  
  ; Increment length
  %new_len = add i32 %len, 1
  store i32 %new_len, ptr %len_ptr
  ret void
}

; String concat
define ptr @_T.concat$P.ptr.ptr(ptr %a, ptr %b) {
entry:
  %a_is_null = icmp eq ptr %a, null
  %b_is_null = icmp eq ptr %b, null
  
  ; If both null, return null
  %both_null = and i1 %a_is_null, %b_is_null
  br i1 %both_null, label %ret_null, label %check_a

check_a:
  ; If only a is null, return b
  br i1 %a_is_null, label %ret_b, label %check_b

check_b:
  ; If only b is null, return a
  br i1 %b_is_null, label %ret_a, label %do_concat

do_concat:
  ; Get lengths
  %a_len_ptr = getelementptr %TsnString, ptr %a, i32 0, i32 1
  %a_len = load i32, ptr %a_len_ptr
  %b_len_ptr = getelementptr %TsnString, ptr %b, i32 0, i32 1
  %b_len = load i32, ptr %b_len_ptr
  
  ; Calculate new length
  %new_len = add i32 %a_len, %b_len
  
  ; Allocate result string: header (8 bytes) + new_len + 1 (null terminator)
  %header_size = add i32 %new_len, 9
  %alloc_size = zext i32 %header_size to i64
  %result = call ptr @malloc(i64 %alloc_size)
  
  ; Set refcount and length
  %refcount_ptr = getelementptr %TsnString, ptr %result, i32 0, i32 0
  store i32 0, ptr %refcount_ptr
  %len_ptr = getelementptr %TsnString, ptr %result, i32 0, i32 1
  store i32 %new_len, ptr %len_ptr
  
  ; Copy a's bytes
  %result_bytes = getelementptr %TsnString, ptr %result, i32 0, i32 2
  %a_bytes = getelementptr %TsnString, ptr %a, i32 0, i32 2
  %a_len_64 = zext i32 %a_len to i64
  call void @llvm.memcpy.p0.p0.i64(ptr %result_bytes, ptr %a_bytes, i64 %a_len_64, i1 false)
  
  ; Copy b's bytes after a
  %result_bytes_offset = getelementptr i8, ptr %result_bytes, i32 %a_len
  %b_bytes = getelementptr %TsnString, ptr %b, i32 0, i32 2
  %b_len_64 = zext i32 %b_len to i64
  call void @llvm.memcpy.p0.p0.i64(ptr %result_bytes_offset, ptr %b_bytes, i64 %b_len_64, i1 false)
  
  ; Null terminate
  %null_term_offset = add i32 %a_len, %b_len
  %null_term_ptr = getelementptr i8, ptr %result_bytes, i32 %null_term_offset
  store i8 0, ptr %null_term_ptr
  
  ret ptr %result

ret_null:
  ret ptr null

ret_a:
  ret ptr %a

ret_b:
  ret ptr %b
}

; String slice
define ptr @slice(ptr %s, i32 %start, i32 %end) {
entry:
  %s_is_null = icmp eq ptr %s, null
  br i1 %s_is_null, label %ret_null, label %check_bounds

check_bounds:
  %len_ptr = getelementptr %TsnString, ptr %s, i32 0, i32 1
  %len = load i32, ptr %len_ptr
  
  ; Clamp start to [0, len]
  %start_neg = icmp slt i32 %start, 0
  %start_clamped_low = select i1 %start_neg, i32 0, i32 %start
  %start_over = icmp sgt i32 %start_clamped_low, %len
  %start_final = select i1 %start_over, i32 %len, i32 %start_clamped_low
  
  ; Clamp end to [start, len]
  %end_neg = icmp slt i32 %end, 0
  %end_as_len = select i1 %end_neg, i32 %len, i32 %end
  %end_over = icmp sgt i32 %end_as_len, %len
  %end_clamped = select i1 %end_over, i32 %len, i32 %end_as_len
  %end_under = icmp slt i32 %end_clamped, %start_final
  %end_final = select i1 %end_under, i32 %start_final, i32 %end_clamped
  
  ; Calculate slice length
  %slice_len = sub i32 %end_final, %start_final
  
  ; Allocate result
  %header_size = add i32 %slice_len, 9
  %alloc_size = zext i32 %header_size to i64
  %result = call ptr @malloc(i64 %alloc_size)
  
  ; Set header
  %refcount_ptr = getelementptr %TsnString, ptr %result, i32 0, i32 0
  store i32 0, ptr %refcount_ptr
  %result_len_ptr = getelementptr %TsnString, ptr %result, i32 0, i32 1
  store i32 %slice_len, ptr %result_len_ptr
  
  ; Copy bytes
  %src_bytes = getelementptr %TsnString, ptr %s, i32 0, i32 2
  %src_offset = getelementptr i8, ptr %src_bytes, i32 %start_final
  %dst_bytes = getelementptr %TsnString, ptr %result, i32 0, i32 2
  %copy_len = zext i32 %slice_len to i64
  call void @llvm.memcpy.p0.p0.i64(ptr %dst_bytes, ptr %src_offset, i64 %copy_len, i1 false)
  
  ; Null terminate
  %null_ptr = getelementptr i8, ptr %dst_bytes, i32 %slice_len
  store i8 0, ptr %null_ptr
  
  ret ptr %result

ret_null:
  ret ptr null
}

define i32 @charCodeAt(ptr %s, i32 %index) {
entry:
  %s_is_null = icmp eq ptr %s, null
  br i1 %s_is_null, label %ret_zero, label %check_bounds

check_bounds:
  %len_ptr = getelementptr %TsnString, ptr %s, i32 0, i32 1
  %len = load i32, ptr %len_ptr
  
  ; Check if index is valid
  %index_neg = icmp slt i32 %index, 0
  %index_over = icmp sge i32 %index, %len
  %invalid = or i1 %index_neg, %index_over
  br i1 %invalid, label %ret_zero, label %valid_index

valid_index:
  %bytes = getelementptr %TsnString, ptr %s, i32 0, i32 2
  %byte_ptr = getelementptr i8, ptr %bytes, i32 %index
  %byte = load i8, ptr %byte_ptr
  %code = zext i8 %byte to i32
  ret i32 %code

ret_zero:
  ret i32 0
}

define i32 @indexOf(ptr %haystack, ptr %needle) {
entry:
  %h_null = icmp eq ptr %haystack, null
  %n_null = icmp eq ptr %needle, null
  %any_null = or i1 %h_null, %n_null
  br i1 %any_null, label %ret_not_found, label %do_search

do_search:
  %h_len_ptr = getelementptr %TsnString, ptr %haystack, i32 0, i32 1
  %h_len = load i32, ptr %h_len_ptr
  %n_len_ptr = getelementptr %TsnString, ptr %needle, i32 0, i32 1
  %n_len = load i32, ptr %n_len_ptr
  
  ; If needle is empty, return 0
  %n_empty = icmp eq i32 %n_len, 0
  br i1 %n_empty, label %ret_zero, label %search_loop

search_loop:
  %i = phi i32 [ 0, %do_search ], [ %i_next, %no_match ]
  
  ; Check if we can still match
  %remaining = sub i32 %h_len, %i
  %can_match = icmp sge i32 %remaining, %n_len
  br i1 %can_match, label %check_match, label %ret_not_found

check_match:
  %h_bytes = getelementptr %TsnString, ptr %haystack, i32 0, i32 2
  %h_offset = getelementptr i8, ptr %h_bytes, i32 %i
  %n_bytes = getelementptr %TsnString, ptr %needle, i32 0, i32 2
  %n_len_64 = zext i32 %n_len to i64
  
  %match = call i32 @memcmp(ptr %h_offset, ptr %n_bytes, i64 %n_len_64)
  %is_match = icmp eq i32 %match, 0
  br i1 %is_match, label %found, label %no_match

no_match:
  %i_next = add i32 %i, 1
  br label %search_loop

found:
  ret i32 %i

ret_not_found:
  ret i32 -1

ret_zero:
  ret i32 0
}

define ptr @unknown() {
entry:
  ; Allocate "UNKNOWN" string
  %result = call ptr @malloc(i64 16)
  %refcount_ptr = getelementptr %TsnString, ptr %result, i32 0, i32 0
  store i32 0, ptr %refcount_ptr
  %len_ptr = getelementptr %TsnString, ptr %result, i32 0, i32 1
  store i32 7, ptr %len_ptr
  
  %bytes = getelementptr %TsnString, ptr %result, i32 0, i32 2
  %u = getelementptr i8, ptr %bytes, i32 0
  store i8 85, ptr %u  ; 'U'
  %n1 = getelementptr i8, ptr %bytes, i32 1
  store i8 78, ptr %n1 ; 'N'
  %k = getelementptr i8, ptr %bytes, i32 2
  store i8 75, ptr %k  ; 'K'
  %n2 = getelementptr i8, ptr %bytes, i32 3
  store i8 78, ptr %n2 ; 'N'
  %o = getelementptr i8, ptr %bytes, i32 4
  store i8 79, ptr %o  ; 'O'
  %w = getelementptr i8, ptr %bytes, i32 5
  store i8 87, ptr %w  ; 'W'
  %n3 = getelementptr i8, ptr %bytes, i32 6
  store i8 78, ptr %n3 ; 'N'
  %null = getelementptr i8, ptr %bytes, i32 7
  store i8 0, ptr %null
  
  ret ptr %result
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
; Result structure: { i32 tag, ptr value } where tag: 0=Ok, 1=Err
%Result = type { i32, ptr }

; Global to store last Result for value() workaround
@_tsn_last_result = internal global ptr null

define ptr @readText(ptr %path) {
entry:
  ; For now, always return error Result (file I/O not implemented)
  %result = call ptr @malloc(i64 16)
  %tag_ptr = getelementptr %Result, ptr %result, i32 0, i32 0
  store i32 1, ptr %tag_ptr  ; Error tag
  %value_ptr = getelementptr %Result, ptr %result, i32 0, i32 1
  store ptr null, ptr %value_ptr
  
  ; Store in global for value() to read
  store ptr %result, ptr @_tsn_last_result
  
  ret ptr %result
}

define ptr @value(ptr %obj) {
  %is_null = icmp eq ptr %obj, null
  br i1 %is_null, label %use_global, label %extract

extract:
  ; Extract value from Result parameter
  %value_ptr = getelementptr %Result, ptr %obj, i32 0, i32 1
  %val = load ptr, ptr %value_ptr
  ret ptr %val

use_global:
  ; No parameter - read from global (Level 6 bug workaround)
  %global_result = load ptr, ptr @_tsn_last_result
  %is_global_null = icmp eq ptr %global_result, null
  br i1 %is_global_null, label %ret_null, label %extract_global

extract_global:
  %global_value_ptr = getelementptr %Result, ptr %global_result, i32 0, i32 1
  %global_val = load ptr, ptr %global_value_ptr
  ret ptr %global_val

ret_null:
  ret ptr null
}

; Wrapper for value() that matches main-level7's declaration (no args)
; This is likely a codegen bug - value() should take the Result as parameter
define ptr @value_noargs() {
entry:
  ret ptr null
}

define i32 @isOk(ptr %result) {
entry:
  %is_null = icmp eq ptr %result, null
  br i1 %is_null, label %use_global, label %check_tag

check_tag:
  %tag_ptr = getelementptr %Result, ptr %result, i32 0, i32 0
  %tag = load i32, ptr %tag_ptr
  %ok = icmp eq i32 %tag, 0
  %ret = zext i1 %ok to i32
  ret i32 %ret

use_global:
  ; No parameter - read from global (Level 6 bug workaround)
  %global_result = load ptr, ptr @_tsn_last_result
  %is_global_null = icmp eq ptr %global_result, null
  br i1 %is_global_null, label %ret_false, label %check_global_tag

check_global_tag:
  %global_tag_ptr = getelementptr %Result, ptr %global_result, i32 0, i32 0
  %global_tag = load i32, ptr %global_tag_ptr
  %global_ok = icmp eq i32 %global_tag, 0
  %global_ret = zext i1 %global_ok to i32
  ret i32 %global_ret

ret_false:
  ret i32 0
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
declare void @free(ptr)
declare i32 @memcmp(ptr, ptr, i64)
declare i64 @strlen(ptr)
declare ptr @memcpy(ptr, ptr, i64)

; TSN low-level helpers are provided by tsn_runtime.c
declare i32 @tsn_get_argc()
declare ptr @tsn_get_argv(i32)
declare ptr @tsn_alloc(i64)
declare i32 @tsn_strlen(ptr)
declare void @tsn_write_i32(ptr, i32)
declare void @tsn_memcpy(ptr, ptr, i32)
declare void @debug_log_i32(i32)
declare void @debug_log_i64(i64)
declare void @debug_log_ptr(ptr)
declare void @print_i32(i32)

; Console logging functions
declare i32 @printf(ptr, ...)
declare i32 @puts(ptr)

define i32 @log(ptr %str) {
entry:
  %is_null = icmp eq ptr %str, null
  br i1 %is_null, label %done, label %print_str

print_str:
  ; Extract C string from TSN string (skip 8 byte header)
  %bytes = getelementptr %TsnString, ptr %str, i32 0, i32 2
  %result = call i32 @puts(ptr %bytes)
  ret i32 %result

done:
  ret i32 0
}

; LLVM intrinsics
declare void @llvm.memset.p0.i64(ptr nocapture writeonly, i8, i64, i1 immarg)
declare void @llvm.memcpy.p0.p0.i64(ptr nocapture writeonly, ptr nocapture readonly, i64, i1 immarg)
