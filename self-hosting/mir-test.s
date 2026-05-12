	.def	@feat.00;
	.scl	3;
	.type	0;
	.endef
	.globl	@feat.00
@feat.00 = 0
	.file	"mir-test.ll"
	.def	main;
	.scl	2;
	.type	32;
	.endef
	.text
	.globl	main                            # -- Begin function main
	.p2align	4
main:                                   # @main
.seh_proc main
# %bb.0:                                # %entry
	subq	$72, %rsp
	.seh_stackalloc 72
	.seh_endprologue
	movl	%ecx, __tsn_argc(%rip)
	movq	%rdx, __tsn_argv(%rip)
	movq	$0, 40(%rsp)
	movq	$0, 32(%rsp)
	movq	$0, 48(%rsp)
	leaq	.L.str.1(%rip), %rcx
	callq	_T.log$P.ptr
	callq	_T.buildSimpleMIR$P
	movq	%rax, 40(%rsp)
	leaq	.L.str.3(%rip), %rcx
	callq	_T.log$P.ptr
	movq	56(%rsp), %rcx
	callq	_T.log$P.ptr
	leaq	.L.str.5(%rip), %rcx
	callq	_T.log$P.ptr
	movq	64(%rsp), %rax
	movl	24(%rax), %eax
	movl	%eax, 68(%rsp)
	testl	%eax, %eax
	jle	.LBB0_4
# %bb.1:                                # %then.0
	leaq	.L.str.7(%rip), %rcx
	callq	_T.log$P.ptr
	movq	64(%rsp), %rcx
	movq	8(%rcx), %rax
	xorl	%edx, %edx
	callq	*16(%rax)
	movq	%rax, 32(%rsp)
	leaq	.L.str.9(%rip), %rcx
	callq	_T.log$P.ptr
	movq	48(%rsp), %rcx
	callq	_T.log$P.ptr
	leaq	.L.str.11(%rip), %rcx
	callq	_T.log$P.ptr
	movq	72(%rsp), %rax
	movl	24(%rax), %eax
	movl	%eax, 64(%rsp)
	testl	%eax, %eax
	jle	.LBB0_4
# %bb.2:                                # %then.2
	leaq	.L.str.13(%rip), %rcx
	callq	_T.log$P.ptr
	movq	72(%rsp), %rcx
	movq	8(%rcx), %rax
	xorl	%edx, %edx
	callq	*16(%rax)
	movq	%rax, 48(%rsp)
	leaq	.L.str.15(%rip), %rcx
	callq	_T.log$P.ptr
	movq	72(%rsp), %rcx
	callq	_T.log$P.ptr
	leaq	.L.str.17(%rip), %rcx
	callq	_T.log$P.ptr
	movq	80(%rsp), %rax
	movl	24(%rax), %eax
	movl	%eax, 60(%rsp)
	cmpl	$2, %eax
	jne	.LBB0_4
# %bb.3:                                # %then.4
	leaq	.L.str.19(%rip), %rcx
	callq	_T.log$P.ptr
.LBB0_4:                                # %endif.1
	leaq	.L.str.21(%rip), %rcx
	callq	_T.log$P.ptr
	movq	40(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_6
# %bb.5:                                # %cleanup.6
	callq	tsn_decRef
.LBB0_6:                                # %cleanup.done.7
	movq	32(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_8
# %bb.7:                                # %cleanup.8
	callq	tsn_decRef
.LBB0_8:                                # %cleanup.done.9
	movq	48(%rsp), %rcx
	testq	%rcx, %rcx
	je	.LBB0_10
# %bb.9:                                # %cleanup.10
	callq	tsn_decRef
.LBB0_10:                               # %cleanup.done.11
	xorl	%eax, %eax
	.seh_startepilogue
	addq	$72, %rsp
	.seh_endepilogue
	retq
	.seh_endproc
                                        # -- End function
	.section	.rdata,"dr"
	.p2align	3, 0x0                          # @_VTable.Array_MIRValue
.L_VTable.Array_MIRValue:
	.quad	_T.Array_MIRValue.push$P.MIRValue
	.quad	_T.Array_MIRValue.pop$P
	.quad	_T.Array_MIRValue.get$P.i32
	.quad	_T.Array_MIRValue.set$P.i32.MIRValue
	.quad	_T.Array_MIRValue.dispose$P
	.quad	_T.Array_MIRValue.filter$P.fn_MIRValue_bool
	.quad	_T.Array_MIRValue.find$P.fn_MIRValue_bool
	.quad	_T.Array_MIRValue.grow$P

	.p2align	3, 0x0                          # @_VTable.Optional_MIRValue
.L_VTable.Optional_MIRValue:
	.quad	_T.Optional_MIRValue.isSome$P
	.quad	_T.Optional_MIRValue.isNone$P
	.quad	_T.Optional_MIRValue.unwrap$P
	.quad	_T.Optional_MIRValue.unwrapOr$P.MIRValue
	.quad	_T.Optional_MIRValue.filter$P.fn_MIRValue_bool

	.p2align	3, 0x0                          # @_VTable.Array_MIRInst
.L_VTable.Array_MIRInst:
	.quad	_T.Array_MIRInst.push$P.MIRInst
	.quad	_T.Array_MIRInst.pop$P
	.quad	_T.Array_MIRInst.get$P.i32
	.quad	_T.Array_MIRInst.set$P.i32.MIRInst
	.quad	_T.Array_MIRInst.dispose$P
	.quad	_T.Array_MIRInst.filter$P.fn_MIRInst_bool
	.quad	_T.Array_MIRInst.find$P.fn_MIRInst_bool
	.quad	_T.Array_MIRInst.grow$P

	.p2align	3, 0x0                          # @_VTable.Optional_MIRInst
.L_VTable.Optional_MIRInst:
	.quad	_T.Optional_MIRInst.isSome$P
	.quad	_T.Optional_MIRInst.isNone$P
	.quad	_T.Optional_MIRInst.unwrap$P
	.quad	_T.Optional_MIRInst.unwrapOr$P.MIRInst
	.quad	_T.Optional_MIRInst.filter$P.fn_MIRInst_bool

	.p2align	3, 0x0                          # @_VTable.Array_MIRBasicBlock
.L_VTable.Array_MIRBasicBlock:
	.quad	_T.Array_MIRBasicBlock.push$P.MIRBasicBlock
	.quad	_T.Array_MIRBasicBlock.pop$P
	.quad	_T.Array_MIRBasicBlock.get$P.i32
	.quad	_T.Array_MIRBasicBlock.set$P.i32.MIRBasicBlock
	.quad	_T.Array_MIRBasicBlock.dispose$P
	.quad	_T.Array_MIRBasicBlock.filter$P.fn_MIRBasicBlock_bool
	.quad	_T.Array_MIRBasicBlock.find$P.fn_MIRBasicBlock_bool
	.quad	_T.Array_MIRBasicBlock.grow$P

	.p2align	3, 0x0                          # @_VTable.Optional_MIRBasicBlock
.L_VTable.Optional_MIRBasicBlock:
	.quad	_T.Optional_MIRBasicBlock.isSome$P
	.quad	_T.Optional_MIRBasicBlock.isNone$P
	.quad	_T.Optional_MIRBasicBlock.unwrap$P
	.quad	_T.Optional_MIRBasicBlock.unwrapOr$P.MIRBasicBlock
	.quad	_T.Optional_MIRBasicBlock.filter$P.fn_MIRBasicBlock_bool

	.p2align	3, 0x0                          # @_VTable.Array_MIRFunction
.L_VTable.Array_MIRFunction:
	.quad	_T.Array_MIRFunction.push$P.MIRFunction
	.quad	_T.Array_MIRFunction.pop$P
	.quad	_T.Array_MIRFunction.get$P.i32
	.quad	_T.Array_MIRFunction.set$P.i32.MIRFunction
	.quad	_T.Array_MIRFunction.dispose$P
	.quad	_T.Array_MIRFunction.filter$P.fn_MIRFunction_bool
	.quad	_T.Array_MIRFunction.find$P.fn_MIRFunction_bool
	.quad	_T.Array_MIRFunction.grow$P

	.p2align	3, 0x0                          # @_VTable.Optional_MIRFunction
.L_VTable.Optional_MIRFunction:
	.quad	_T.Optional_MIRFunction.isSome$P
	.quad	_T.Optional_MIRFunction.isNone$P
	.quad	_T.Optional_MIRFunction.unwrap$P
	.quad	_T.Optional_MIRFunction.unwrapOr$P.MIRFunction
	.quad	_T.Optional_MIRFunction.filter$P.fn_MIRFunction_bool

	.p2align	3, 0x0                          # @_VTable.Array_MIRGlobal
.L_VTable.Array_MIRGlobal:
	.quad	_T.Array_MIRGlobal.push$P.MIRGlobal
	.quad	_T.Array_MIRGlobal.pop$P
	.quad	_T.Array_MIRGlobal.get$P.i32
	.quad	_T.Array_MIRGlobal.set$P.i32.MIRGlobal
	.quad	_T.Array_MIRGlobal.dispose$P
	.quad	_T.Array_MIRGlobal.filter$P.fn_MIRGlobal_bool
	.quad	_T.Array_MIRGlobal.find$P.fn_MIRGlobal_bool
	.quad	_T.Array_MIRGlobal.grow$P

	.p2align	3, 0x0                          # @_VTable.Optional_MIRGlobal
.L_VTable.Optional_MIRGlobal:
	.quad	_T.Optional_MIRGlobal.isSome$P
	.quad	_T.Optional_MIRGlobal.isNone$P
	.quad	_T.Optional_MIRGlobal.unwrap$P
	.quad	_T.Optional_MIRGlobal.unwrapOr$P.MIRGlobal
	.quad	_T.Optional_MIRGlobal.filter$P.fn_MIRGlobal_bool

	.p2align	3, 0x0                          # @_VTable.MIRBuilder
.L_VTable.MIRBuilder:
	.quad	_T.MIRBuilder.getModule$P
	.quad	_T.MIRBuilder.createFunction$P.ptr.MIRType
	.quad	_T.MIRBuilder.createBasicBlock$P.ptr
	.quad	_T.MIRBuilder.setInsertPoint$P.i32
	.quad	_T.MIRBuilder.createBinary$P.ptr.MIRValue.MIRValue
	.quad	_T.MIRBuilder.createLoad$P.MIRValue
	.quad	_T.MIRBuilder.createStore$P.MIRValue.MIRValue
	.quad	_T.MIRBuilder.createCall$P.ptr.Array_MIRValue.MIRType
	.quad	_T.MIRBuilder.createReturn$P.MIRValue
	.quad	_T.MIRBuilder.createBranch$P.MIRValue.i32.i32
	.quad	_T.MIRBuilder.createJump$P.i32
	.quad	_T.MIRBuilder.createAlloca$P.MIRType
	.quad	_T.MIRBuilder.createGetElementPtr$P.MIRValue.MIRValue
	.quad	_T.MIRBuilder.createConstant$P.ptr.MIRType
	.quad	_T.MIRBuilder.createGlobal$P.ptr.MIRType
	.quad	_T.MIRBuilder.getCurrentBlock$P

	.p2align	3, 0x0                          # @_VTable.MIRType
.L_VTable.MIRType:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRValue
.L_VTable.MIRValue:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRConstant
.L_VTable.MIRConstant:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRRegister
.L_VTable.MIRRegister:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRGlobal
.L_VTable.MIRGlobal:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRInst
.L_VTable.MIRInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRBinaryInst
.L_VTable.MIRBinaryInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRLoadInst
.L_VTable.MIRLoadInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRStoreInst
.L_VTable.MIRStoreInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRCallInst
.L_VTable.MIRCallInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRReturnInst
.L_VTable.MIRReturnInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRBranchInst
.L_VTable.MIRBranchInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRJumpInst
.L_VTable.MIRJumpInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRAllocaInst
.L_VTable.MIRAllocaInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRGetElementPtrInst
.L_VTable.MIRGetElementPtrInst:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRBasicBlock
.L_VTable.MIRBasicBlock:
	.zero	8

	.p2align	3, 0x0                          # @_VTable.MIRFunction
.L_VTable.MIRFunction:
	.quad	_T.MIRFunction.createBlock$P.ptr
	.quad	_T.MIRFunction.createRegister$P.MIRType

	.p2align	3, 0x0                          # @_VTable.MIRModule
.L_VTable.MIRModule:
	.zero	8

.L.str.0:                               # @.str.0
	.asciz	"Building simple MIR..."

.L.str.1:                               # @.str.1
	.asciz	"Building simple MIR..."

.L.str.2:                               # @.str.2
	.asciz	"Module name: "

.L.str.3:                               # @.str.3
	.asciz	"Module name: "

.L.str.4:                               # @.str.4
	.asciz	"Number of functions: "

.L.str.5:                               # @.str.5
	.asciz	"Number of functions: "

.L.str.6:                               # @.str.6
	.asciz	"1"

.L.str.7:                               # @.str.7
	.asciz	"1"

.L.str.8:                               # @.str.8
	.asciz	"Function name: "

.L.str.9:                               # @.str.9
	.asciz	"Function name: "

.L.str.10:                              # @.str.10
	.asciz	"Number of blocks: "

.L.str.11:                              # @.str.11
	.asciz	"Number of blocks: "

.L.str.12:                              # @.str.12
	.asciz	"1"

.L.str.13:                              # @.str.13
	.asciz	"1"

.L.str.14:                              # @.str.14
	.asciz	"Block label: "

.L.str.15:                              # @.str.15
	.asciz	"Block label: "

.L.str.16:                              # @.str.16
	.asciz	"Number of instructions: "

.L.str.17:                              # @.str.17
	.asciz	"Number of instructions: "

.L.str.18:                              # @.str.18
	.asciz	"2"

.L.str.19:                              # @.str.19
	.asciz	"2"

.L.str.20:                              # @.str.20
	.asciz	"MIR test completed!"

.L.str.21:                              # @.str.21
	.asciz	"MIR test completed!"

.L.str.console_newline:                 # @.str.console_newline
	.asciz	"\r\n"

