	.def	@feat.00;
	.scl	3;
	.type	0;
	.endef
	.globl	@feat.00
@feat.00 = 0
	.file	"semantics-test.ll"
	.def	_T.testSemantics$P;
	.scl	2;
	.type	32;
	.endef
	.text
	.globl	_T.testSemantics$P              # -- Begin function _T.testSemantics$P
	.p2align	4
_T.testSemantics$P:                     # @"_T.testSemantics$P"
.seh_proc _T.testSemantics$P
# %bb.0:                                # %entry
	pushq	%r14
	.seh_pushreg %r14
	pushq	%rsi
	.seh_pushreg %rsi
	pushq	%rdi
	.seh_pushreg %rdi
	pushq	%rbx
	.seh_pushreg %rbx
	subq	$120, %rsp
	.seh_stackalloc 120
	.seh_endprologue
	movq	$0, 112(%rsp)
	movq	$0, 104(%rsp)
	movq	$0, 80(%rsp)
	movq	$0, 96(%rsp)
	movq	$0, 88(%rsp)
	movq	$0, 72(%rsp)
	movq	$0, 64(%rsp)
	movq	$0, 56(%rsp)
	xorps	%xmm0, %xmm0
	movaps	%xmm0, 48(%rsp)
	movaps	%xmm0, 64(%rsp)
	movq	$0, 80(%rsp)
	movl	$40, %ecx
	callq	class_alloc
	movq	%rax, %rsi
	leaq	.L_VTable.Semantics(%rip), %rax
	movq	%rax, 8(%rsi)
	movq	%rsi, %rcx
	callq	_T.Semantics.constructor$P
	movq	(%rsi), %rax
	movq	%rax, 48(%rsp)
	movl	$32, %ecx
	callq	class_alloc
	movq	%rax, %rsi
	leaq	.L_VTable.Type(%rip), %rbx
	movq	%rbx, 8(%rax)
	leaq	.L.str.0(%rip), %r8
	movq	%rax, %rcx
	movl	$1, %edx
	callq	_T.Type.constructor$P.i32.ptr
	movq	%rsi, 112(%rsp)
	movl	$40, %ecx
	callq	class_alloc
	movq	%rax, %rsi
	leaq	.L_VTable.Symbol(%rip), %r14
	movq	%r14, 8(%rax)
	leaq	.L.str.1(%rip), %rdx
	movb	$0, 32(%rsp)
	leaq	112(%rsp), %r8
	movq	%rax, %rcx
	movb	$1, %r9b
	callq	_T.Symbol.constructor$P.ptr.Type.bool.bool
	movq	%rsi, 104(%rsp)
	movq	64(%rsp), %rcx
	movq	8(%rcx), %rax
	leaq	104(%rsp), %rdx
	callq	*(%rax)
	leaq	.L.str.3(%rip), %rcx
	callq	_T.log$P.ptr
	movq	72(%rsp), %rcx
	movq	8(%rcx), %rax
	leaq	.L.str.4(%rip), %rdx
	callq	*16(%rax)
	movq	%rax, 80(%rsp)
	leaq	.L.str.5(%rip), %rcx
	movq	96(%rsp), %rdx
	callq	_T.concat$P.ptr.ptr
	leaq	.L.str.6(%rip), %rcx
	movq	96(%rsp), %rdx
	callq	_T.concat$P.ptr.ptr
	movq	%rax, %rcx
	callq	_T.log$P.ptr
	movq	56(%rsp), %rax
	leaq	48(%rsp), %rsi
	movq	%rsi, %rcx
	callq	*16(%rax)
	leaq	.L.str.8(%rip), %rcx
	callq	_T.log$P.ptr
	movl	$32, %ecx
	callq	class_alloc
	movq	%rax, %rdi
	movq	%rbx, 8(%rax)
	leaq	.L.str.9(%rip), %r8
	movq	%rax, %rcx
	movl	$1, %edx
	callq	_T.Type.constructor$P.i32.ptr
	movq	%rdi, 96(%rsp)
	movl	$40, %ecx
	callq	class_alloc
	movq	%rax, %rdi
	movq	%r14, 8(%rax)
	leaq	.L.str.10(%rip), %rdx
	movb	$0, 32(%rsp)
	leaq	96(%rsp), %r8
	movq	%rax, %rcx
	xorl	%r9d, %r9d
	callq	_T.Symbol.constructor$P.ptr.Type.bool.bool
	movq	%rdi, 88(%rsp)
	movq	72(%rsp), %rcx
	movq	8(%rcx), %rax
	leaq	88(%rsp), %rdx
	callq	*(%rax)
	leaq	.L.str.12(%rip), %rcx
	callq	_T.log$P.ptr
	movq	72(%rsp), %rcx
	movq	8(%rcx), %rax
	leaq	.L.str.13(%rip), %rdx
	callq	*16(%rax)
	movq	%rax, 72(%rsp)
	leaq	.L.str.14(%rip), %rcx
	movq	88(%rsp), %rdx
	callq	_T.concat$P.ptr.ptr
	leaq	.L.str.15(%rip), %rcx
	movq	88(%rsp), %rdx
	callq	_T.concat$P.ptr.ptr
	movq	%rax, %rcx
	callq	_T.log$P.ptr
	movq	72(%rsp), %rcx
	movq	8(%rcx), %rax
	leaq	.L.str.16(%rip), %rdx
	callq	*16(%rax)
	movq	%rax, 64(%rsp)
	leaq	.L.str.17(%rip), %rcx
	movq	80(%rsp), %rdx
	callq	_T.concat$P.ptr.ptr
	leaq	.L.str.18(%rip), %rcx
	movq	80(%rsp), %rdx
	callq	_T.concat$P.ptr.ptr
	movq	%rax, %rcx
	callq	_T.log$P.ptr
	movq	56(%rsp), %rax
	movq	%rsi, %rcx
	callq	*24(%rax)
	leaq	.L.str.20(%rip), %rcx
	callq	_T.log$P.ptr
	movq	72(%rsp), %rcx
	movq	8(%rcx), %rax
	leaq	.L.str.21(%rip), %rdx
	callq	*16(%rax)
	movq	%rax, 56(%rsp)
	leaq	.L.str.22(%rip), %rcx
	movq	72(%rsp), %rdx
	callq	_T.concat$P.ptr.ptr
	leaq	.L.str.23(%rip), %rcx
	movq	72(%rsp), %rdx
	callq	_T.concat$P.ptr.ptr
	movq	%rax, %rcx
	callq	_T.log$P.ptr
	movq	48(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_2
# %bb.1:                                # %cleanup.0
	callq	tsn_decRef
.LBB0_2:                                # %cleanup.done.1
	movq	112(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_4
# %bb.3:                                # %cleanup.2
	callq	tsn_decRef
.LBB0_4:                                # %cleanup.done.3
	movq	104(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_6
# %bb.5:                                # %cleanup.4
	callq	tsn_decRef
.LBB0_6:                                # %cleanup.done.5
	movq	80(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_8
# %bb.7:                                # %cleanup.6
	callq	tsn_decRef
.LBB0_8:                                # %cleanup.done.7
	movq	96(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_10
# %bb.9:                                # %cleanup.8
	callq	tsn_decRef
.LBB0_10:                               # %cleanup.done.9
	movq	88(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_12
# %bb.11:                               # %cleanup.10
	callq	tsn_decRef
.LBB0_12:                               # %cleanup.done.11
	movq	72(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_14
# %bb.13:                               # %cleanup.12
	callq	tsn_decRef
.LBB0_14:                               # %cleanup.done.13
	movq	64(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_16
# %bb.15:                               # %cleanup.14
	callq	tsn_decRef
.LBB0_16:                               # %cleanup.done.15
	movq	56(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_18
# %bb.17:                               # %cleanup.16
	callq	tsn_decRef
.LBB0_18:                               # %cleanup.done.17
	nop
	.seh_startepilogue
	addq	$120, %rsp
	popq	%rbx
	popq	%rdi
	popq	%rsi
	popq	%r14
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	main;
	.scl	2;
	.type	32;
	.endef
	.globl	main                            # -- Begin function main
	.p2align	4
main:                                   # @main
.seh_proc main
# %bb.0:                                # %entry
	subq	$40, %rsp
	.seh_stackalloc 40
	.seh_endprologue
	movl	%ecx, __tsn_argc(%rip)
	movq	%rdx, __tsn_argv(%rip)
	callq	_T.testSemantics$P
	xorl	%eax, %eax
	.seh_startepilogue
	addq	$40, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.bss
	.globl	__tsn_argc                      # @__tsn_argc
	.p2align	2, 0x0
__tsn_argc:
	.long	0                               # 0x0

	.globl	__tsn_argv                      # @__tsn_argv
	.p2align	3, 0x0
__tsn_argv:
	.quad	0

	.section	.rdata,"dr"
	.p2align	3, 0x0                          # @_VTable.Array_Symbol
.L_VTable.Array_Symbol:
	.quad	_T.Array_Symbol.push$P.Symbol
	.quad	_T.Array_Symbol.pop$P
	.quad	_T.Array_Symbol.get$P.i32
	.quad	_T.Array_Symbol.set$P.i32.Symbol
	.quad	_T.Array_Symbol.dispose$P
	.quad	_T.Array_Symbol.filter$P.fn_Symbol_bool
	.quad	_T.Array_Symbol.find$P.fn_Symbol_bool
	.quad	_T.Array_Symbol.grow$P

	.p2align	3, 0x0                          # @_VTable.Optional_Symbol
.L_VTable.Optional_Symbol:
	.quad	_T.Optional_Symbol.isSome$P
	.quad	_T.Optional_Symbol.isNone$P
	.quad	_T.Optional_Symbol.unwrap$P
	.quad	_T.Optional_Symbol.unwrapOr$P.Symbol
	.quad	_T.Optional_Symbol.filter$P.fn_Symbol_bool

	.p2align	3, 0x0                          # @_VTable.Array_Type
.L_VTable.Array_Type:
	.quad	_T.Array_Type.push$P.Type
	.quad	_T.Array_Type.pop$P
	.quad	_T.Array_Type.get$P.i32
	.quad	_T.Array_Type.set$P.i32.Type
	.quad	_T.Array_Type.dispose$P
	.quad	_T.Array_Type.filter$P.fn_Type_bool
	.quad	_T.Array_Type.find$P.fn_Type_bool
	.quad	_T.Array_Type.grow$P

	.p2align	3, 0x0                          # @_VTable.Optional_Type
.L_VTable.Optional_Type:
	.quad	_T.Optional_Type.isSome$P
	.quad	_T.Optional_Type.isNone$P
	.quad	_T.Optional_Type.unwrap$P
	.quad	_T.Optional_Type.unwrapOr$P.Type
	.quad	_T.Optional_Type.filter$P.fn_Type_bool

	.p2align	3, 0x0                          # @_VTable.Type
.L_VTable.Type:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.Symbol
.L_VTable.Symbol:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.SymbolTable
.L_VTable.SymbolTable:
	.quad	_T.SymbolTable.define$P.Symbol
	.quad	_T.SymbolTable.checkExpression$P.any
	.quad	_T.SymbolTable.lookup$P.ptr

	.p2align	3, 0x0                          # @_VTable.Semantics
.L_VTable.Semantics:
	.quad	_T.Semantics.registerBuiltinTypes$P
	.quad	_T.Semantics.resolveType$P.ptr
	.quad	_T.Semantics.enterScope$P
	.quad	_T.Semantics.exitScope$P

.L.str.0:                               # @.str.0
	.asciz	"i32"

.L.str.1:                               # @.str.1
	.asciz	"g"

.L.str.2:                               # @.str.2
	.asciz	"Defined global 'g'"

.L.str.3:                               # @.str.3
	.asciz	"Defined global 'g'"

.L.str.4:                               # @.str.4
	.asciz	"g"

.L.str.5:                               # @.str.5
	.asciz	"Lookup 'g' in global: "

.L.str.6:                               # @.str.6
	.asciz	"Lookup 'g' in global: "

.L.str.7:                               # @.str.7
	.asciz	"Entered scope"

.L.str.8:                               # @.str.8
	.asciz	"Entered scope"

.L.str.9:                               # @.str.9
	.asciz	"i32"

.L.str.10:                              # @.str.10
	.asciz	"l"

.L.str.11:                              # @.str.11
	.asciz	"Defined local 'l'"

.L.str.12:                              # @.str.12
	.asciz	"Defined local 'l'"

.L.str.13:                              # @.str.13
	.asciz	"l"

.L.str.14:                              # @.str.14
	.asciz	"Lookup 'l' in local: "

.L.str.15:                              # @.str.15
	.asciz	"Lookup 'l' in local: "

.L.str.16:                              # @.str.16
	.asciz	"g"

.L.str.17:                              # @.str.17
	.asciz	"Lookup 'g' from local: "

.L.str.18:                              # @.str.18
	.asciz	"Lookup 'g' from local: "

.L.str.19:                              # @.str.19
	.asciz	"Exited scope"

.L.str.20:                              # @.str.20
	.asciz	"Exited scope"

.L.str.21:                              # @.str.21
	.asciz	"l"

.L.str.22:                              # @.str.22
	.asciz	"Lookup 'l' after exit (should be unknown): "

.L.str.23:                              # @.str.23
	.asciz	"Lookup 'l' after exit (should be unknown): "

.L.str.console_newline:                 # @.str.console_newline
	.asciz	"\r\n"

