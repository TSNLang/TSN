	.def	@feat.00;
	.scl	3;
	.type	0;
	.endef
	.globl	@feat.00
@feat.00 = 0
	.file	"generic-method-advanced"
	.def	_T4Util12identity_i32E_i32;
	.scl	2;
	.type	32;
	.endef
	.text
	.globl	_T4Util12identity_i32E_i32      # -- Begin function _T4Util12identity_i32E_i32
	.p2align	4
_T4Util12identity_i32E_i32:             # @_T4Util12identity_i32E_i32
.seh_proc _T4Util12identity_i32E_i32
# %bb.0:                                # %entry
	subq	$16, %rsp
	.seh_stackalloc 16
	.seh_endprologue
	movl	%edx, %eax
	movq	%rcx, 8(%rsp)
	movl	%edx, 4(%rsp)
	.seh_startepilogue
	addq	$16, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T3logE_string;
	.scl	2;
	.type	32;
	.endef
	.globl	_T3logE_string                  # -- Begin function _T3logE_string
	.p2align	4
_T3logE_string:                         # @_T3logE_string
.seh_proc _T3logE_string
# %bb.0:                                # %entry
	pushq	%rsi
	.seh_pushreg %rsi
	pushq	%rdi
	.seh_pushreg %rdi
	pushq	%rbx
	.seh_pushreg %rbx
	subq	$64, %rsp
	.seh_stackalloc 64
	.seh_endprologue
	movq	%rcx, 56(%rsp)
	movl	$-11, %ecx
	callq	GetStdHandle
	movq	%rax, %rsi
	movq	%rax, 48(%rsp)
	movl	$0, 44(%rsp)
	movq	56(%rsp), %rdi
	movq	%rdi, %rcx
	callq	string_byteLength
	movq	$0, 32(%rsp)
	leaq	44(%rsp), %rbx
	movq	%rsi, %rcx
	movq	%rdi, %rdx
	movl	%eax, %r8d
	movq	%rbx, %r9
	callq	WriteFile
	movq	48(%rsp), %rcx
	leaq	.L.str.0(%rip), %rdx
	movq	$0, 32(%rsp)
	movl	$1, %r8d
	movq	%rbx, %r9
	callq	WriteFile
	nop
	.seh_startepilogue
	addq	$64, %rsp
	popq	%rbx
	popq	%rdi
	popq	%rsi
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T4warnE_string;
	.scl	2;
	.type	32;
	.endef
	.globl	_T4warnE_string                 # -- Begin function _T4warnE_string
	.p2align	4
_T4warnE_string:                        # @_T4warnE_string
.seh_proc _T4warnE_string
# %bb.0:                                # %entry
	pushq	%rsi
	.seh_pushreg %rsi
	pushq	%rdi
	.seh_pushreg %rdi
	pushq	%rbx
	.seh_pushreg %rbx
	subq	$64, %rsp
	.seh_stackalloc 64
	.seh_endprologue
	movq	%rcx, 56(%rsp)
	movl	$-11, %ecx
	callq	GetStdHandle
	movq	%rax, %rsi
	movq	%rax, 48(%rsp)
	movl	$0, 44(%rsp)
	movq	56(%rsp), %rdi
	movq	%rdi, %rcx
	callq	string_byteLength
	movq	$0, 32(%rsp)
	leaq	44(%rsp), %rbx
	movq	%rsi, %rcx
	movq	%rdi, %rdx
	movl	%eax, %r8d
	movq	%rbx, %r9
	callq	WriteFile
	movq	48(%rsp), %rcx
	leaq	.L.str.1(%rip), %rdx
	movq	$0, 32(%rsp)
	movl	$1, %r8d
	movq	%rbx, %r9
	callq	WriteFile
	nop
	.seh_startepilogue
	addq	$64, %rsp
	popq	%rbx
	popq	%rdi
	popq	%rsi
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T5errorE_string;
	.scl	2;
	.type	32;
	.endef
	.globl	_T5errorE_string                # -- Begin function _T5errorE_string
	.p2align	4
_T5errorE_string:                       # @_T5errorE_string
.seh_proc _T5errorE_string
# %bb.0:                                # %entry
	pushq	%rsi
	.seh_pushreg %rsi
	pushq	%rdi
	.seh_pushreg %rdi
	pushq	%rbx
	.seh_pushreg %rbx
	subq	$64, %rsp
	.seh_stackalloc 64
	.seh_endprologue
	movq	%rcx, 56(%rsp)
	movl	$-12, %ecx
	callq	GetStdHandle
	movq	%rax, %rsi
	movq	%rax, 48(%rsp)
	movl	$0, 44(%rsp)
	movq	56(%rsp), %rdi
	movq	%rdi, %rcx
	callq	string_byteLength
	movq	$0, 32(%rsp)
	leaq	44(%rsp), %rbx
	movq	%rsi, %rcx
	movq	%rdi, %rdx
	movl	%eax, %r8d
	movq	%rbx, %r9
	callq	WriteFile
	movq	48(%rsp), %rcx
	leaq	.L.str.2(%rip), %rdx
	movq	$0, 32(%rsp)
	movl	$1, %r8d
	movq	%rbx, %r9
	callq	WriteFile
	nop
	.seh_startepilogue
	addq	$64, %rsp
	popq	%rbx
	popq	%rdi
	popq	%rsi
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T5allocE_i64;
	.scl	2;
	.type	32;
	.endef
	.globl	_T5allocE_i64                   # -- Begin function _T5allocE_i64
	.p2align	4
_T5allocE_i64:                          # @_T5allocE_i64
.seh_proc _T5allocE_i64
# %bb.0:                                # %entry
	subq	$40, %rsp
	.seh_stackalloc 40
	.seh_endprologue
	movq	%rcx, 32(%rsp)
	callq	GetProcessHeap
	movl	HEAP_ZERO_MEMORY(%rip), %edx
	movq	32(%rsp), %r8
	movq	%rax, %rcx
	callq	HeapAlloc
	nop
	.seh_startepilogue
	addq	$40, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T4freeE_rawPtrvoid;
	.scl	2;
	.type	32;
	.endef
	.globl	_T4freeE_rawPtrvoid             # -- Begin function _T4freeE_rawPtrvoid
	.p2align	4
_T4freeE_rawPtrvoid:                    # @_T4freeE_rawPtrvoid
.seh_proc _T4freeE_rawPtrvoid
# %bb.0:                                # %entry
	subq	$40, %rsp
	.seh_stackalloc 40
	.seh_endprologue
	movq	%rcx, 32(%rsp)
	testq	%rcx, %rcx
	je	.LBB5_2
# %bb.1:                                # %endif.1
	callq	GetProcessHeap
	movq	32(%rsp), %r8
	movq	%rax, %rcx
	xorl	%edx, %edx
	callq	HeapFree
.LBB5_2:                                # %then.0
	nop
	.seh_startepilogue
	addq	$40, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T7reallocE_rawPtrvoidi64;
	.scl	2;
	.type	32;
	.endef
	.globl	_T7reallocE_rawPtrvoidi64       # -- Begin function _T7reallocE_rawPtrvoidi64
	.p2align	4
_T7reallocE_rawPtrvoidi64:              # @_T7reallocE_rawPtrvoidi64
.seh_proc _T7reallocE_rawPtrvoidi64
# %bb.0:                                # %entry
	subq	$56, %rsp
	.seh_stackalloc 56
	.seh_endprologue
	movq	%rcx, 48(%rsp)
	movq	%rdx, 40(%rsp)
	testq	%rcx, %rcx
	je	.LBB6_1
# %bb.3:                                # %endif.3
	callq	GetProcessHeap
	movl	HEAP_ZERO_MEMORY(%rip), %edx
	movq	48(%rsp), %r8
	movq	40(%rsp), %r9
	movq	%rax, %rcx
	callq	HeapReAlloc
	nop
	.seh_startepilogue
	addq	$56, %rsp
	.seh_endepilogue
	retq
.LBB6_1:                                # %then.2
	movq	40(%rsp), %rcx
	callq	_T5allocE_i64
	nop
	.seh_startepilogue
	addq	$56, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T4copyE_rawPtrvoidrawPtrvoidi64;
	.scl	2;
	.type	32;
	.endef
	.globl	_T4copyE_rawPtrvoidrawPtrvoidi64 # -- Begin function _T4copyE_rawPtrvoidrawPtrvoidi64
	.p2align	4
_T4copyE_rawPtrvoidrawPtrvoidi64:       # @_T4copyE_rawPtrvoidrawPtrvoidi64
.seh_proc _T4copyE_rawPtrvoidrawPtrvoidi64
# %bb.0:                                # %entry
	subq	$56, %rsp
	.seh_stackalloc 56
	.seh_endprologue
	movq	%rcx, 48(%rsp)
	movq	%rdx, 40(%rsp)
	movq	%r8, 32(%rsp)
	callq	RtlMoveMemory
	nop
	.seh_startepilogue
	addq	$56, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T4fillE_rawPtrvoidi8i64;
	.scl	2;
	.type	32;
	.endef
	.globl	_T4fillE_rawPtrvoidi8i64        # -- Begin function _T4fillE_rawPtrvoidi8i64
	.p2align	4
_T4fillE_rawPtrvoidi8i64:               # @_T4fillE_rawPtrvoidi8i64
.seh_proc _T4fillE_rawPtrvoidi8i64
# %bb.0:                                # %entry
	subq	$56, %rsp
	.seh_stackalloc 56
	.seh_endprologue
	movl	%edx, %eax
	movq	%rcx, 48(%rsp)
	movb	%dl, 36(%rsp)
	movq	%r8, 40(%rsp)
	movq	%r8, %rdx
	movl	%eax, %r8d
	callq	RtlFillMemory
	nop
	.seh_startepilogue
	addq	$56, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T6offsetE_rawPtrvoidi64;
	.scl	2;
	.type	32;
	.endef
	.globl	_T6offsetE_rawPtrvoidi64        # -- Begin function _T6offsetE_rawPtrvoidi64
	.p2align	4
_T6offsetE_rawPtrvoidi64:               # @_T6offsetE_rawPtrvoidi64
.seh_proc _T6offsetE_rawPtrvoidi64
# %bb.0:                                # %entry
	subq	$40, %rsp
	.seh_stackalloc 40
	.seh_endprologue
	movq	%rcx, 32(%rsp)
	movq	%rdx, 24(%rsp)
	movq	%rcx, 16(%rsp)
	leaq	(%rcx,%rdx), %rax
	movq	%rax, 8(%rsp)
	movq	%rax, (%rsp)
	.seh_startepilogue
	addq	$40, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T7getByteE_rawPtrvoidi64;
	.scl	2;
	.type	32;
	.endef
	.globl	_T7getByteE_rawPtrvoidi64       # -- Begin function _T7getByteE_rawPtrvoidi64
	.p2align	4
_T7getByteE_rawPtrvoidi64:              # @_T7getByteE_rawPtrvoidi64
.seh_proc _T7getByteE_rawPtrvoidi64
# %bb.0:                                # %entry
	subq	$72, %rsp
	.seh_stackalloc 72
	.seh_endprologue
	movq	%rcx, 64(%rsp)
	movq	%rdx, 56(%rsp)
	callq	_T6offsetE_rawPtrvoidi64
	movq	%rax, 48(%rsp)
	movq	%rax, 40(%rsp)
	movzbl	(%rax), %eax
	.seh_startepilogue
	addq	$72, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T7setByteE_rawPtrvoidi64i8;
	.scl	2;
	.type	32;
	.endef
	.globl	_T7setByteE_rawPtrvoidi64i8     # -- Begin function _T7setByteE_rawPtrvoidi64i8
	.p2align	4
_T7setByteE_rawPtrvoidi64i8:            # @_T7setByteE_rawPtrvoidi64i8
.seh_proc _T7setByteE_rawPtrvoidi64i8
# %bb.0:                                # %entry
	subq	$72, %rsp
	.seh_stackalloc 72
	.seh_endprologue
	movq	%rcx, 64(%rsp)
	movq	%rdx, 56(%rsp)
	movb	%r8b, 36(%rsp)
	callq	_T6offsetE_rawPtrvoidi64
	movq	%rax, 48(%rsp)
	movq	%rax, 40(%rsp)
	movzbl	36(%rsp), %ecx
	movb	%cl, (%rax)
	.seh_startepilogue
	addq	$72, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T10getPointerE_rawPtrvoidi64;
	.scl	2;
	.type	32;
	.endef
	.globl	_T10getPointerE_rawPtrvoidi64   # -- Begin function _T10getPointerE_rawPtrvoidi64
	.p2align	4
_T10getPointerE_rawPtrvoidi64:          # @_T10getPointerE_rawPtrvoidi64
.seh_proc _T10getPointerE_rawPtrvoidi64
# %bb.0:                                # %entry
	subq	$88, %rsp
	.seh_stackalloc 88
	.seh_endprologue
	movq	%rcx, 80(%rsp)
	movq	%rdx, 72(%rsp)
	callq	_T6offsetE_rawPtrvoidi64
	movq	%rax, 64(%rsp)
	movq	%rax, 56(%rsp)
	movq	(%rax), %rax
	movq	%rax, 48(%rsp)
	movq	%rax, 40(%rsp)
	.seh_startepilogue
	addq	$88, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T10byteLengthE_string;
	.scl	2;
	.type	32;
	.endef
	.globl	_T10byteLengthE_string          # -- Begin function _T10byteLengthE_string
	.p2align	4
_T10byteLengthE_string:                 # @_T10byteLengthE_string
.seh_proc _T10byteLengthE_string
# %bb.0:                                # %entry
	subq	$56, %rsp
	.seh_stackalloc 56
	.seh_endprologue
	movq	%rcx, 48(%rsp)
	testq	%rcx, %rcx
	je	.LBB13_5
# %bb.1:                                # %endif.5
	movq	48(%rsp), %rax
	movq	%rax, 40(%rsp)
	movl	$0, 36(%rsp)
	.p2align	4
.LBB13_2:                               # %while.cond.6
                                        # =>This Inner Loop Header: Depth=1
	movq	40(%rsp), %rcx
	movslq	36(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	testb	%al, %al
	je	.LBB13_4
# %bb.3:                                # %while.body.7
                                        #   in Loop: Header=BB13_2 Depth=1
	incl	36(%rsp)
	jmp	.LBB13_2
.LBB13_4:                               # %while.end.8
	movl	36(%rsp), %eax
	.seh_startepilogue
	addq	$56, %rsp
	.seh_endepilogue
	retq
.LBB13_5:                               # %then.4
	xorl	%eax, %eax
	.seh_startepilogue
	addq	$56, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T6lengthE_string;
	.scl	2;
	.type	32;
	.endef
	.globl	_T6lengthE_string               # -- Begin function _T6lengthE_string
	.p2align	4
_T6lengthE_string:                      # @_T6lengthE_string
.seh_proc _T6lengthE_string
# %bb.0:                                # %entry
	pushq	%rbx
	.seh_pushreg %rbx
	subq	$64, %rsp
	.seh_stackalloc 64
	.seh_endprologue
	movq	%rcx, 48(%rsp)
	testq	%rcx, %rcx
	je	.LBB14_1
# %bb.3:                                # %endif.10
	movq	48(%rsp), %rcx
	callq	_T10byteLengthE_string
	movl	%eax, 44(%rsp)
	movl	$0, 40(%rsp)
	movq	48(%rsp), %rax
	movq	%rax, 56(%rsp)
	movl	$0, 36(%rsp)
	movb	$1, %bl
	jmp	.LBB14_4
	.p2align	4
.LBB14_7:                               # %endif.16
                                        #   in Loop: Header=BB14_4 Depth=1
	incl	36(%rsp)
.LBB14_4:                               # %for.cond.11
                                        # =>This Inner Loop Header: Depth=1
	movl	36(%rsp), %eax
	cmpl	44(%rsp), %eax
	jge	.LBB14_8
# %bb.5:                                # %for.body.12
                                        #   in Loop: Header=BB14_4 Depth=1
	movq	56(%rsp), %rcx
	movslq	36(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	movb	%al, 32(%rsp)
	testb	%bl, %bl
	jne	.LBB14_7
# %bb.6:                                # %then.15
                                        #   in Loop: Header=BB14_4 Depth=1
	incl	40(%rsp)
	jmp	.LBB14_7
.LBB14_8:                               # %for.end.14
	movl	40(%rsp), %eax
	jmp	.LBB14_2
.LBB14_1:                               # %then.9
	xorl	%eax, %eax
.LBB14_2:                               # %then.9
	.seh_startepilogue
	addq	$64, %rsp
	popq	%rbx
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T10charCodeAtE_stringi32;
	.scl	2;
	.type	32;
	.endef
	.globl	_T10charCodeAtE_stringi32       # -- Begin function _T10charCodeAtE_stringi32
	.p2align	4
_T10charCodeAtE_stringi32:              # @_T10charCodeAtE_stringi32
.seh_proc _T10charCodeAtE_stringi32
# %bb.0:                                # %entry
	subq	$56, %rsp
	.seh_stackalloc 56
	.seh_endprologue
	movq	%rcx, 40(%rsp)
	movl	%edx, 36(%rsp)
	testq	%rcx, %rcx
	je	.LBB15_1
# %bb.3:                                # %endif.18
	movq	40(%rsp), %rcx
	movq	%rcx, 48(%rsp)
	movslq	36(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	movsbl	%al, %eax
	.seh_startepilogue
	addq	$56, %rsp
	.seh_endepilogue
	retq
.LBB15_1:                               # %then.17
	xorl	%eax, %eax
	.seh_startepilogue
	addq	$56, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T6concatE_stringstring;
	.scl	2;
	.type	32;
	.endef
	.globl	_T6concatE_stringstring         # -- Begin function _T6concatE_stringstring
	.p2align	4
_T6concatE_stringstring:                # @_T6concatE_stringstring
.seh_proc _T6concatE_stringstring
# %bb.0:                                # %entry
	subq	$88, %rsp
	.seh_stackalloc 88
	.seh_endprologue
	movq	%rcx, 72(%rsp)
	movq	%rdx, 64(%rsp)
	callq	_T10byteLengthE_string
	movl	%eax, 40(%rsp)
	movq	64(%rsp), %rcx
	callq	_T10byteLengthE_string
                                        # kill: def $eax killed $eax def $rax
	movl	%eax, 44(%rsp)
	movl	40(%rsp), %ecx
	leal	(%rcx,%rax), %edx
	movl	%edx, 60(%rsp)
	leal	1(%rcx,%rax), %eax
	movslq	%eax, %rcx
	callq	_T5allocE_i64
	movq	%rax, 48(%rsp)
	testq	%rax, %rax
	je	.LBB16_6
# %bb.1:                                # %endif.20
	cmpl	$0, 40(%rsp)
	jle	.LBB16_3
# %bb.2:                                # %then.21
	movq	48(%rsp), %rcx
	movq	72(%rsp), %rdx
	movslq	40(%rsp), %r8
	callq	_T4copyE_rawPtrvoidrawPtrvoidi64
.LBB16_3:                               # %endif.22
	cmpl	$0, 44(%rsp)
	jle	.LBB16_5
# %bb.4:                                # %then.23
	movq	48(%rsp), %rcx
	movslq	40(%rsp), %rdx
	callq	_T6offsetE_rawPtrvoidi64
	movq	64(%rsp), %rdx
	movslq	44(%rsp), %r8
	movq	%rax, %rcx
	callq	_T4copyE_rawPtrvoidrawPtrvoidi64
.LBB16_5:                               # %endif.24
	movq	48(%rsp), %rcx
	movslq	60(%rsp), %rdx
	xorl	%r8d, %r8d
	callq	_T7setByteE_rawPtrvoidi64i8
	movq	48(%rsp), %rax
	movq	%rax, 80(%rsp)
	.seh_startepilogue
	addq	$88, %rsp
	.seh_endepilogue
	retq
.LBB16_6:                               # %then.19
	leaq	.L.str.3(%rip), %rax
	.seh_startepilogue
	addq	$88, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T7compareE_stringstring;
	.scl	2;
	.type	32;
	.endef
	.globl	_T7compareE_stringstring        # -- Begin function _T7compareE_stringstring
	.p2align	4
_T7compareE_stringstring:               # @_T7compareE_stringstring
.seh_proc _T7compareE_stringstring
# %bb.0:                                # %entry
	pushq	%rsi
	.seh_pushreg %rsi
	subq	$80, %rsp
	.seh_stackalloc 80
	.seh_endprologue
	movq	%rcx, 72(%rsp)
	movq	%rdx, 64(%rsp)
	movq	%rcx, 56(%rsp)
	movq	%rdx, 48(%rsp)
	movl	$0, 44(%rsp)
	xorl	%esi, %esi
	testb	%sil, %sil
	jne	.LBB17_5
	.p2align	4
.LBB17_2:                               # %while.body.26
                                        # =>This Inner Loop Header: Depth=1
	movq	56(%rsp), %rcx
	movslq	44(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	movb	%al, 36(%rsp)
	movq	48(%rsp), %rcx
	movslq	44(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	movb	%al, 40(%rsp)
	cmpb	%al, 36(%rsp)
	jne	.LBB17_3
# %bb.4:                                # %endif.29
                                        #   in Loop: Header=BB17_2 Depth=1
	cmpb	$0, 36(%rsp)
	je	.LBB17_5
# %bb.7:                                # %endif.31
                                        #   in Loop: Header=BB17_2 Depth=1
	incl	44(%rsp)
	testb	%sil, %sil
	je	.LBB17_2
.LBB17_5:                               # %then.30
	xorl	%eax, %eax
	jmp	.LBB17_6
.LBB17_3:                               # %then.28
	movzbl	36(%rsp), %eax
	subb	40(%rsp), %al
	movsbl	%al, %eax
.LBB17_6:                               # %then.30
	.seh_startepilogue
	addq	$80, %rsp
	popq	%rsi
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T6substrE_stringi32i32;
	.scl	2;
	.type	32;
	.endef
	.globl	_T6substrE_stringi32i32         # -- Begin function _T6substrE_stringi32i32
	.p2align	4
_T6substrE_stringi32i32:                # @_T6substrE_stringi32i32
.seh_proc _T6substrE_stringi32i32
# %bb.0:                                # %entry
	pushq	%rsi
	.seh_pushreg %rsi
	subq	$80, %rsp
	.seh_stackalloc 80
	.seh_endprologue
	movq	%rcx, 64(%rsp)
	movl	%edx, 60(%rsp)
	movl	%r8d, 44(%rsp)
	testq	%rcx, %rcx
	je	.LBB18_1
# %bb.3:                                # %endif.33
	movl	44(%rsp), %eax
	incl	%eax
	movslq	%eax, %rcx
	callq	_T5allocE_i64
	movq	%rax, 48(%rsp)
	testq	%rax, %rax
	je	.LBB18_4
# %bb.5:                                # %endif.35
	movq	48(%rsp), %rsi
	movq	64(%rsp), %rcx
	movslq	60(%rsp), %rdx
	callq	_T6offsetE_rawPtrvoidi64
	movslq	44(%rsp), %r8
	movq	%rsi, %rcx
	movq	%rax, %rdx
	callq	_T4copyE_rawPtrvoidrawPtrvoidi64
	movq	48(%rsp), %rcx
	movslq	44(%rsp), %rdx
	xorl	%r8d, %r8d
	callq	_T7setByteE_rawPtrvoidi64i8
	movq	48(%rsp), %rax
	movq	%rax, 72(%rsp)
	jmp	.LBB18_2
.LBB18_1:                               # %then.32
	leaq	.L.str.4(%rip), %rax
	jmp	.LBB18_2
.LBB18_4:                               # %then.34
	leaq	.L.str.5(%rip), %rax
.LBB18_2:                               # %then.32
	.seh_startepilogue
	addq	$80, %rsp
	popq	%rsi
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T10startsWithE_stringstring;
	.scl	2;
	.type	32;
	.endef
	.globl	_T10startsWithE_stringstring    # -- Begin function _T10startsWithE_stringstring
	.p2align	4
_T10startsWithE_stringstring:           # @_T10startsWithE_stringstring
.seh_proc _T10startsWithE_stringstring
# %bb.0:                                # %entry
	pushq	%rbx
	.seh_pushreg %rbx
	subq	$64, %rsp
	.seh_stackalloc 64
	.seh_endprologue
	movq	%rcx, 56(%rsp)
	movq	%rdx, 48(%rsp)
	callq	_T10byteLengthE_string
	movl	%eax, 44(%rsp)
	movq	48(%rsp), %rcx
	callq	_T10byteLengthE_string
	movl	%eax, 40(%rsp)
	cmpl	44(%rsp), %eax
	jle	.LBB19_3
.LBB19_1:                               # %then.36
	xorl	%eax, %eax
	jmp	.LBB19_2
.LBB19_3:                               # %endif.37
	movl	$0, 36(%rsp)
	.p2align	4
.LBB19_4:                               # %for.cond.38
                                        # =>This Inner Loop Header: Depth=1
	movl	36(%rsp), %eax
	cmpl	40(%rsp), %eax
	jge	.LBB19_7
# %bb.5:                                # %for.body.39
                                        #   in Loop: Header=BB19_4 Depth=1
	movq	56(%rsp), %rcx
	movslq	36(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	movl	%eax, %ebx
	movq	48(%rsp), %rcx
	movslq	36(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	cmpb	%al, %bl
	jne	.LBB19_1
# %bb.6:                                # %endif.43
                                        #   in Loop: Header=BB19_4 Depth=1
	incl	36(%rsp)
	jmp	.LBB19_4
.LBB19_7:                               # %for.end.41
	movb	$1, %al
.LBB19_2:                               # %then.36
	.seh_startepilogue
	addq	$64, %rsp
	popq	%rbx
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T8endsWithE_stringstring;
	.scl	2;
	.type	32;
	.endef
	.globl	_T8endsWithE_stringstring       # -- Begin function _T8endsWithE_stringstring
	.p2align	4
_T8endsWithE_stringstring:              # @_T8endsWithE_stringstring
.seh_proc _T8endsWithE_stringstring
# %bb.0:                                # %entry
	pushq	%rbx
	.seh_pushreg %rbx
	subq	$64, %rsp
	.seh_stackalloc 64
	.seh_endprologue
	movq	%rcx, 56(%rsp)
	movq	%rdx, 48(%rsp)
	callq	_T10byteLengthE_string
	movl	%eax, 40(%rsp)
	movq	48(%rsp), %rcx
	callq	_T10byteLengthE_string
	movl	%eax, 36(%rsp)
	cmpl	40(%rsp), %eax
	jle	.LBB20_3
.LBB20_1:                               # %then.44
	xorl	%eax, %eax
	jmp	.LBB20_2
.LBB20_3:                               # %endif.45
	movl	40(%rsp), %eax
	subl	36(%rsp), %eax
	movl	%eax, 44(%rsp)
	movl	$0, 32(%rsp)
	.p2align	4
.LBB20_4:                               # %for.cond.46
                                        # =>This Inner Loop Header: Depth=1
	movl	32(%rsp), %eax
	cmpl	36(%rsp), %eax
	jge	.LBB20_7
# %bb.5:                                # %for.body.47
                                        #   in Loop: Header=BB20_4 Depth=1
	movq	56(%rsp), %rcx
	movl	44(%rsp), %eax
	addl	32(%rsp), %eax
	movslq	%eax, %rdx
	callq	_T7getByteE_rawPtrvoidi64
	movl	%eax, %ebx
	movq	48(%rsp), %rcx
	movslq	32(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	cmpb	%al, %bl
	jne	.LBB20_1
# %bb.6:                                # %endif.51
                                        #   in Loop: Header=BB20_4 Depth=1
	incl	32(%rsp)
	jmp	.LBB20_4
.LBB20_7:                               # %for.end.49
	movb	$1, %al
.LBB20_2:                               # %then.44
	.seh_startepilogue
	addq	$64, %rsp
	popq	%rbx
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T7indexOfE_stringstring;
	.scl	2;
	.type	32;
	.endef
	.globl	_T7indexOfE_stringstring        # -- Begin function _T7indexOfE_stringstring
	.p2align	4
_T7indexOfE_stringstring:               # @_T7indexOfE_stringstring
.seh_proc _T7indexOfE_stringstring
# %bb.0:                                # %entry
	pushq	%rbx
	.seh_pushreg %rbx
	subq	$80, %rsp
	.seh_stackalloc 80
	.seh_endprologue
	movq	%rcx, 72(%rsp)
	movq	%rdx, 64(%rsp)
	callq	_T10byteLengthE_string
	movl	%eax, 60(%rsp)
	movq	64(%rsp), %rcx
	callq	_T10byteLengthE_string
	movl	%eax, 52(%rsp)
	testl	%eax, %eax
	je	.LBB21_1
# %bb.3:                                # %endif.53
	movl	52(%rsp), %eax
	cmpl	60(%rsp), %eax
	jle	.LBB21_5
.LBB21_4:                               # %then.54
	movl	$-1, %eax
	jmp	.LBB21_2
.LBB21_1:                               # %then.52
	xorl	%eax, %eax
	jmp	.LBB21_2
.LBB21_5:                               # %endif.55
	movl	$0, 48(%rsp)
	.p2align	4
.LBB21_6:                               # %for.cond.56
                                        # =>This Loop Header: Depth=1
                                        #     Child Loop BB21_8 Depth 2
	movl	60(%rsp), %eax
	subl	52(%rsp), %eax
	cmpl	%eax, 48(%rsp)
	jg	.LBB21_4
# %bb.7:                                # %for.body.57
                                        #   in Loop: Header=BB21_6 Depth=1
	movl	$1, 56(%rsp)
	movl	$0, 44(%rsp)
	.p2align	4
.LBB21_8:                               # %for.cond.60
                                        #   Parent Loop BB21_6 Depth=1
                                        # =>  This Inner Loop Header: Depth=2
	movl	44(%rsp), %eax
	cmpl	52(%rsp), %eax
	jge	.LBB21_11
# %bb.9:                                # %for.body.61
                                        #   in Loop: Header=BB21_8 Depth=2
	movq	72(%rsp), %rcx
	movl	48(%rsp), %eax
	addl	44(%rsp), %eax
	movslq	%eax, %rdx
	callq	_T7getByteE_rawPtrvoidi64
	movl	%eax, %ebx
	movq	64(%rsp), %rcx
	movslq	44(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	cmpb	%al, %bl
	jne	.LBB21_10
# %bb.14:                               # %endif.65
                                        #   in Loop: Header=BB21_8 Depth=2
	incl	44(%rsp)
	jmp	.LBB21_8
	.p2align	4
.LBB21_10:                              # %then.64
                                        #   in Loop: Header=BB21_6 Depth=1
	movl	$0, 56(%rsp)
.LBB21_11:                              # %for.end.63
                                        #   in Loop: Header=BB21_6 Depth=1
	testb	$1, 56(%rsp)
	jne	.LBB21_12
# %bb.13:                               # %endif.67
                                        #   in Loop: Header=BB21_6 Depth=1
	incl	48(%rsp)
	jmp	.LBB21_6
.LBB21_12:                              # %then.66
	movl	48(%rsp), %eax
.LBB21_2:                               # %then.52
	.seh_startepilogue
	addq	$80, %rsp
	popq	%rbx
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T8includesE_stringstring;
	.scl	2;
	.type	32;
	.endef
	.globl	_T8includesE_stringstring       # -- Begin function _T8includesE_stringstring
	.p2align	4
_T8includesE_stringstring:              # @_T8includesE_stringstring
.seh_proc _T8includesE_stringstring
# %bb.0:                                # %entry
	subq	$56, %rsp
	.seh_stackalloc 56
	.seh_endprologue
	movq	%rcx, 48(%rsp)
	movq	%rdx, 40(%rsp)
	callq	_T7indexOfE_stringstring
	cmpl	$-1, %eax
	setne	%al
	.seh_startepilogue
	addq	$56, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.def	_T7fromIntE_i64;
	.scl	2;
	.type	32;
	.endef
	.globl	_T7fromIntE_i64                 # -- Begin function _T7fromIntE_i64
	.p2align	4
_T7fromIntE_i64:                        # @_T7fromIntE_i64
.seh_proc _T7fromIntE_i64
# %bb.0:                                # %entry
	pushq	%rsi
	.seh_pushreg %rsi
	pushq	%rdi
	.seh_pushreg %rdi
	subq	$104, %rsp
	.seh_stackalloc 104
	.seh_endprologue
	movq	%rcx, 88(%rsp)
	testq	%rcx, %rcx
	je	.LBB23_1
# %bb.3:                                # %endif.69
	movl	$0, 76(%rsp)
	movq	88(%rsp), %rax
	movq	%rax, 64(%rsp)
	testq	%rax, %rax
	jns	.LBB23_5
# %bb.4:                                # %then.70
	movl	$1, 76(%rsp)
	negq	64(%rsp)
.LBB23_5:                               # %endif.71
	movl	$32, %ecx
	callq	_T5allocE_i64
	movq	%rax, 56(%rsp)
	movl	$0, 44(%rsp)
	movabsq	$7378697629483820647, %rsi      # imm = 0x6666666666666667
	cmpq	$0, 64(%rsp)
	jle	.LBB23_8
	.p2align	4
.LBB23_7:                               # %while.body.73
                                        # =>This Inner Loop Header: Depth=1
	movq	64(%rsp), %r8
	movq	%r8, %rax
	imulq	%rsi
	movq	%rdx, %rax
	shrq	$63, %rax
	sarq	$2, %rdx
	addq	%rax, %rdx
	addq	%rdx, %rdx
	leaq	(%rdx,%rdx,4), %rax
	subq	%rax, %r8
	movl	%r8d, 100(%rsp)
	movq	56(%rsp), %rcx
	movslq	44(%rsp), %rdx
	addb	$48, %r8b
                                        # kill: def $r8b killed $r8b killed $r8
	callq	_T7setByteE_rawPtrvoidi64i8
	movq	%rsi, %rax
	imulq	64(%rsp)
	movq	%rdx, %rax
	shrq	$63, %rax
	sarq	$2, %rdx
	addq	%rax, %rdx
	movq	%rdx, 64(%rsp)
	incl	44(%rsp)
	cmpq	$0, 64(%rsp)
	jg	.LBB23_7
.LBB23_8:                               # %while.end.74
	testb	$1, 76(%rsp)
	je	.LBB23_10
# %bb.9:                                # %then.75
	movq	56(%rsp), %rcx
	movslq	44(%rsp), %rdx
	movb	$45, %r8b
	callq	_T7setByteE_rawPtrvoidi64i8
	incl	44(%rsp)
.LBB23_10:                              # %endif.76
	movq	56(%rsp), %rcx
	movslq	44(%rsp), %rdx
	xorl	%r8d, %r8d
	callq	_T7setByteE_rawPtrvoidi64i8
	movq	56(%rsp), %rax
	movq	%rax, 80(%rsp)
	movl	$0, 52(%rsp)
	movl	44(%rsp), %eax
	decl	%eax
	movl	%eax, 48(%rsp)
	.p2align	4
.LBB23_11:                              # %while.cond.77
                                        # =>This Inner Loop Header: Depth=1
	movl	52(%rsp), %eax
	cmpl	48(%rsp), %eax
	jge	.LBB23_13
# %bb.12:                               # %while.body.78
                                        #   in Loop: Header=BB23_11 Depth=1
	movq	56(%rsp), %rcx
	movslq	52(%rsp), %rdx
	callq	_T7getByteE_rawPtrvoidi64
	movb	%al, 40(%rsp)
	movq	56(%rsp), %rsi
	movslq	52(%rsp), %rdi
	movslq	48(%rsp), %rdx
	movq	%rsi, %rcx
	callq	_T7getByteE_rawPtrvoidi64
	movq	%rsi, %rcx
	movq	%rdi, %rdx
	movl	%eax, %r8d
	callq	_T7setByteE_rawPtrvoidi64i8
	movq	56(%rsp), %rcx
	movslq	48(%rsp), %rdx
	movzbl	40(%rsp), %r8d
	callq	_T7setByteE_rawPtrvoidi64i8
	incl	52(%rsp)
	decl	48(%rsp)
	jmp	.LBB23_11
.LBB23_13:                              # %while.end.79
	movq	80(%rsp), %rax
	jmp	.LBB23_2
.LBB23_1:                               # %then.68
	leaq	.L.str.6(%rip), %rax
.LBB23_2:                               # %then.68
	.seh_startepilogue
	addq	$104, %rsp
	popq	%rdi
	popq	%rsi
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
	subq	$56, %rsp
	.seh_stackalloc 56
	.seh_endprologue
	movl	%ecx, __tsn_argc(%rip)
	movq	%rdx, __tsn_argv(%rip)
	movq	$0, 40(%rsp)
	movl	$16, %ecx
	callq	class_alloc
	leaq	.L_VTable.Util(%rip), %rcx
	movq	%rcx, 8(%rax)
	movq	%rax, 40(%rsp)
	movq	%rax, %rcx
	movl	$100, %edx
	callq	_T4Util12identity_i32E_i32
	movl	%eax, 52(%rsp)
	movslq	%eax, %rcx
	callq	_T7fromIntE_i64
	movq	%rax, %rcx
	callq	_T3logE_string
	movq	40(%rsp), %rcx
	movl	$200, %edx
	callq	_T4Util12identity_i32E_i32
	movl	%eax, 48(%rsp)
	movslq	%eax, %rcx
	callq	_T7fromIntE_i64
	movq	%rax, %rcx
	callq	_T3logE_string
	movq	40(%rsp), %rcx
	callq	tsn_decRef
	xorl	%eax, %eax
	.seh_startepilogue
	addq	$56, %rsp
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
	.globl	HEAP_ZERO_MEMORY                # @HEAP_ZERO_MEMORY
	.p2align	2, 0x0
HEAP_ZERO_MEMORY:
	.long	8                               # 0x8

	.p2align	3, 0x0                          # @_VTable.Util
.L_VTable.Util:
	.zero	8

.L.str.0:                               # @.str.0
	.asciz	"\n"

.L.str.1:                               # @.str.1
	.asciz	"\n"

.L.str.2:                               # @.str.2
	.asciz	"\n"

.L.str.3:                               # @.str.3
	.zero	1

.L.str.4:                               # @.str.4
	.zero	1

.L.str.5:                               # @.str.5
	.zero	1

.L.str.6:                               # @.str.6
	.asciz	"0"

.L.str.console_newline:                 # @.str.console_newline
	.asciz	"\r\n"

