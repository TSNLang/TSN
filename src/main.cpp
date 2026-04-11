#include <cctype>
#include <cstdint>
#include <cstring>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <map>
#include <memory>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <string_view>
#include <system_error>
#include <utility>
#include <vector>
#include <algorithm>

#include <llvm/ADT/StringRef.h>
#include <llvm/ADT/SmallVector.h>
#include <llvm/IR/Constants.h>
#include <llvm/IR/DerivedTypes.h>
#include <llvm/IR/Function.h>
#include <llvm/IR/IRBuilder.h>
#include <llvm/IR/LegacyPassManager.h>
#include <llvm/IR/LLVMContext.h>
#include <llvm/IR/Module.h>
#include <llvm/IR/Type.h>
#include <llvm/MC/TargetRegistry.h>
#include <llvm/Support/raw_ostream.h>
#include <llvm/Support/TargetSelect.h>
#include <llvm/Target/TargetMachine.h>
#include <llvm/TargetParser/Host.h>
#include <llvm/Support/raw_os_ostream.h>
#include <llvm/Transforms/Utils/Cloning.h>

namespace tsn {

enum class TokenKind {
    End,
    Identifier,
    String,
    Number,
    At,
    Semicolon,
    Dot,
    Comma,
    LParen,
    RParen,
    LBrace,
    RBrace,
    LBracket,
    RBracket,
    Colon,
    Less,
    Greater,
    LessEqual,
    GreaterEqual,
    EqualEqual,
    NotEqual,
    Star,
    Slash,
    Plus,
    Minus,
    Exclaim,
    Ampersand,
    AndAnd,
    Pipe,
    PipePipe,
    Equal,
    KwFunction,
    KwDeclare,
    KwLet,
    KwConst,
    KwReturn,
    KwNull,
    KwType,
    KwIf,
    KwElse,
    KwWhile,
    KwFor,
    KwInterface,
    KwClass,
    KwImport,
    KwExport,
    KwFrom
};

struct Token {
    TokenKind kind;
    std::string text;
    size_t pos;
};

struct Diag {
    static void error(size_t pos, const std::string &msg) {
        std::cerr << "error(" << pos << "): " << msg << "\n";
    }
};

class Lexer {
public:
    explicit Lexer(std::string_view src) : src_(src), i_(0) {}

    void advance() {
        if (i_ < src_.size()) i_++;
    }

    Token next() {
        skipSpacesAndNewlines();
        size_t start = i_;
        if (i_ >= src_.size()) {
            return Token{TokenKind::End, "", i_};
        }

        char c = src_[i_];
        if (isIdentStart(c)) {
            ++i_;
            while (i_ < src_.size() && isIdentContinue(src_[i_])) {
                ++i_;
            }
            std::string text(src_.substr(start, i_ - start));
            if (text == "function") {
                return Token{TokenKind::KwFunction, std::move(text), start};
            }
            if (text == "declare") {
                return Token{TokenKind::KwDeclare, std::move(text), start};
            }
            if (text == "let") {
                return Token{TokenKind::KwLet, std::move(text), start};
            }
            if (text == "const") {
                return Token{TokenKind::KwConst, std::move(text), start};
            }
            if (text == "return") {
                return Token{TokenKind::KwReturn, std::move(text), start};
            }
            if (text == "null") {
                return Token{TokenKind::KwNull, std::move(text), start};
            }
            if (text == "type") {
                return Token{TokenKind::KwType, std::move(text), start};
            }
            if (text == "if") {
                return Token{TokenKind::KwIf, std::move(text), start};
            }
            if (text == "else") {
                return Token{TokenKind::KwElse, std::move(text), start};
            }
            if (text == "while") {
                return Token{TokenKind::KwWhile, std::move(text), start};
            }
            if (text == "for") {
                return Token{TokenKind::KwFor, std::move(text), start};
            }
            if (text == "interface") {
                return Token{TokenKind::KwInterface, std::move(text), start};
            }
            if (text == "class") {
                return Token{TokenKind::KwClass, std::move(text), start};
            }
            if (text == "import") {
                return Token{TokenKind::KwImport, std::move(text), start};
            }
            if (text == "export") {
                return Token{TokenKind::KwExport, std::move(text), start};
            }
            if (text == "from") {
                return Token{TokenKind::KwFrom, std::move(text), start};
            }
            return Token{TokenKind::Identifier, std::move(text), start};
        }

        if (c >= '0' && c <= '9') {
            bool hasDecimal = false;
            while (i_ < src_.size() && (src_[i_] >= '0' && src_[i_] <= '9')) {
                ++i_;
            }
            // Check for decimal point
            if (i_ < src_.size() && src_[i_] == '.') {
                hasDecimal = true;
                ++i_;
                while (i_ < src_.size() && (src_[i_] >= '0' && src_[i_] <= '9')) {
                    ++i_;
                }
            }
            // Check for exponent (e or E)
            if (i_ < src_.size() && (src_[i_] == 'e' || src_[i_] == 'E')) {
                hasDecimal = true;
                ++i_;
                if (i_ < src_.size() && (src_[i_] == '+' || src_[i_] == '-')) {
                    ++i_;
                }
                while (i_ < src_.size() && (src_[i_] >= '0' && src_[i_] <= '9')) {
                    ++i_;
                }
            }
            // Check for suffix (u, U, f, F)
            if (i_ < src_.size() && (src_[i_] == 'u' || src_[i_] == 'U' || src_[i_] == 'f' || src_[i_] == 'F')) {
                ++i_;
            }
            std::string num(src_.substr(start, i_ - start));
            return Token{TokenKind::Number, std::move(num), start};
        }

        if (c == '\'' || c == '"') {
            char quote = c;
            ++i_;
            std::string out;
            while (i_ < src_.size()) {
                char ch = src_[i_++];
                if (ch == quote) {
                    return Token{TokenKind::String, std::move(out), start};
                }
                if (ch == '\\') {
                    if (i_ >= src_.size()) {
                        break;
                    }
                    char esc = src_[i_++];
                    switch (esc) {
                    case 'n':
                        out.push_back('\n');
                        break;
                    case 'r':
                        out.push_back('\r');
                        break;
                    case 't':
                        out.push_back('\t');
                        break;
                    case '\\':
                        out.push_back('\\');
                        break;
                    case '\'':
                        out.push_back('\'');
                        break;
                    case '"':
                        out.push_back('"');
                        break;
                    default:
                        out.push_back(esc);
                        break;
                    }
                    continue;
                }
                out.push_back(ch);
            }
            return Token{TokenKind::String, std::move(out), start};
        }

        switch (c) {
        case '@':
            advance();
            return Token{TokenKind::At, "@", start};
        case '(':
            advance();
            return Token{TokenKind::LParen, "(", start};
        case ')':
            advance();
            return Token{TokenKind::RParen, ")", start};
        case '{':
            advance();
            return Token{TokenKind::LBrace, "{", start};
        case '}':
            advance();
            return Token{TokenKind::RBrace, "}", start};
        case '.':
            advance();
            return Token{TokenKind::Dot, ".", start};
        case ';':
            advance();
            return Token{TokenKind::Semicolon, ";", start};
        case ',':
            advance();
            return Token{TokenKind::Comma, ",", start};
        case ':':
            advance();
            return Token{TokenKind::Colon, ":", start};
        case '[':
            advance();
            return Token{TokenKind::LBracket, "[", start};
        case ']':
            advance();
            return Token{TokenKind::RBracket, "]", start};
        case '<':
            advance();
            if (i_ < src_.size() && src_[i_] == '=') {
                advance();
                return Token{TokenKind::LessEqual, "<=", start};
            }
            return Token{TokenKind::Less, "<", start};
        case '>':
            advance();
            if (i_ < src_.size() && src_[i_] == '=') {
                advance();
                return Token{TokenKind::GreaterEqual, ">=", start};
            }
            return Token{TokenKind::Greater, ">", start};
        case '!':
            advance();
            if (i_ < src_.size() && src_[i_] == '=') {
                advance();
                return Token{TokenKind::NotEqual, "!=", start};
            }
            return Token{TokenKind::Exclaim, "!", start};
        case '=':
            advance();
            if (i_ < src_.size() && src_[i_] == '=') {
                advance();
                return Token{TokenKind::EqualEqual, "==", start};
            }
            return Token{TokenKind::Equal, "=", start};
        case '*': advance(); return Token{TokenKind::Star, "*", start};
        case '/': advance(); return Token{TokenKind::Slash, "/", start};
        case '+': advance(); return Token{TokenKind::Plus, "+", start};
        case '-': advance(); return Token{TokenKind::Minus, "-", start};
        case '&':
            advance();
            if (i_ < src_.size() && src_[i_] == '&') {
                advance();
                return Token{TokenKind::AndAnd, "&&", start};
            }
            return Token{TokenKind::Ampersand, "&", start};
        case '|':
            advance();
            if (i_ < src_.size() && src_[i_] == '|') {
                advance();
                return Token{TokenKind::PipePipe, "||", start};
            }
            return Token{TokenKind::Pipe, "|", start};
        default:
            return Token{TokenKind::End, "", start};
        }
    }

private:
    void skipSpacesAndNewlines() {
        while (i_ < src_.size()) {
            char c = src_[i_];
            if (c == ' ' || c == '\t' || c == '\r' || c == '\n') {
                ++i_;
                continue;
            }
            if (c == '/' && i_ + 1 < src_.size() && src_[i_ + 1] == '/') {
                i_ += 2;
                while (i_ < src_.size() && src_[i_] != '\n') {
                    ++i_;
                }
                continue;
            }
            break;
        }
    }

    static bool isIdentStart(char c) {
        return std::isalpha(static_cast<unsigned char>(c)) != 0 || c == '_';
    }

    static bool isIdentContinue(char c) {
        return std::isalnum(static_cast<unsigned char>(c)) != 0 || c == '_';
    }

    std::string_view src_;
    size_t i_ = 0;
};

struct Stmt {
    virtual ~Stmt() = default;
};

struct TypeName {
    enum class Kind {
        I8,
        U8,
        I32,
        U32,
        I64,
        U64,
        F32,
        F64,
        Bool,
        Void,
        Ptr,
        Struct,
        Array
    };

    Kind kind = Kind::Void;
    std::unique_ptr<TypeName> pointee;
    std::string structName; // For struct types
    std::unique_ptr<TypeName> elementType; // For array types
    int arraySize = 0; // For array types

    TypeName() = default;
    TypeName(const TypeName&) = delete;
    TypeName& operator=(const TypeName&) = delete;
    TypeName(TypeName&&) noexcept = default;
    TypeName& operator=(TypeName&&) noexcept = default;

    TypeName clone() const {
        TypeName res;
        res.kind = kind;
        res.structName = structName;
        res.arraySize = arraySize;
        if (pointee) {
            res.pointee = std::make_unique<TypeName>(pointee->clone());
        }
        if (elementType) {
            res.elementType = std::make_unique<TypeName>(elementType->clone());
        }
        return res;
    }
};

struct LogStmt final : Stmt {
    std::string message;
};

struct ExprStmt final : Stmt {
    std::unique_ptr<struct Expr> expr;
};

struct LetStmt final : Stmt {
    std::string name;
    std::unique_ptr<Expr> init;
    TypeName type;
    bool hasType = false;
    bool isConst = false;  // true for const, false for let
};

struct AssignStmt final : Stmt {
    std::string name;
    std::unique_ptr<Expr> value;
};

struct IndexedAssignStmt final : Stmt {
    std::unique_ptr<Expr> target;  // The array[index] expression
    std::unique_ptr<Expr> value;
};

struct MemberAssignStmt final : Stmt {
    std::unique_ptr<Expr> object;  // The object expression
    std::string member;            // The field name
    std::unique_ptr<Expr> value;
};

struct ReturnStmt final : Stmt {
    std::unique_ptr<struct Expr> value;
};

struct Expr {
    virtual ~Expr() = default;
};

struct CallExpr final : Expr {
    std::string callee;
    std::vector<std::unique_ptr<Expr>> args;
};

struct NumberLiteral final : Expr {
    std::string value;
};

struct StringLiteral final : Expr {
    std::string value;
};

struct NullLiteral final : Expr {
    TypeName type;
};

struct Identifier final : Expr {
    std::string name;
};

struct AddressOfExpr final : Expr {
    std::unique_ptr<Expr> operand;
};

struct UnaryExpr final : Expr {
    enum class Op {
        Neg,   // -x
        Not    // !x
    };
    Op op;
    std::unique_ptr<Expr> operand;
};

struct IndexExpr final : Expr {
    std::unique_ptr<Expr> base;
    std::unique_ptr<Expr> index;
};

struct MemberExpr final : Expr {
    std::unique_ptr<Expr> object;
    std::string member;
};

struct ObjectLiteral final : Expr {
    std::string typeName;  // Type name for the struct
    std::vector<std::string> fieldNames;
    std::vector<std::unique_ptr<Expr>> fieldValues;
};

struct BinaryExpr final : Expr {
    enum class Op {
        Add, Sub, Mul, Div,
        Eq, Ne, Lt, Gt, Le, Ge,
        And, Or
    };
    Op op;
    std::unique_ptr<Expr> lhs;
    std::unique_ptr<Expr> rhs;
};

struct FunctionParam {
    std::string name;
    TypeName type;
};

struct IfStmt final : Stmt {
    std::unique_ptr<Expr> cond;
    std::vector<std::unique_ptr<Stmt>> thenBody;
    std::vector<std::unique_ptr<Stmt>> elseBody;
};

struct WhileStmt final : Stmt {
    std::unique_ptr<Expr> cond;
    std::vector<std::unique_ptr<Stmt>> body;
};

struct ForStmt final : Stmt {
    std::unique_ptr<Stmt> init;        // let i = 0
    std::unique_ptr<Expr> cond;        // i < 10
    std::unique_ptr<Stmt> increment;   // i = i + 1
    std::vector<std::unique_ptr<Stmt>> body;
};

struct FunctionDef {
    std::string name;
    std::vector<FunctionParam> params;
    TypeName result;
    std::vector<std::unique_ptr<Stmt>> body;
};

static llvm::Type *lowerType(llvm::LLVMContext &ctx, const TypeName &t, const std::map<std::string, llvm::StructType*> &structTypes = {}) {
    switch (t.kind) {
    case TypeName::Kind::I8:
        return llvm::Type::getInt8Ty(ctx);
    case TypeName::Kind::U8:
        return llvm::Type::getInt8Ty(ctx);
    case TypeName::Kind::I32:
        return llvm::Type::getInt32Ty(ctx);
    case TypeName::Kind::U32:
        return llvm::Type::getInt32Ty(ctx);
    case TypeName::Kind::I64:
        return llvm::Type::getInt64Ty(ctx);
    case TypeName::Kind::U64:
        return llvm::Type::getInt64Ty(ctx);
    case TypeName::Kind::F32:
        return llvm::Type::getFloatTy(ctx);
    case TypeName::Kind::F64:
        return llvm::Type::getDoubleTy(ctx);
    case TypeName::Kind::Bool:
        return llvm::Type::getInt1Ty(ctx);
    case TypeName::Kind::Void:
        return llvm::Type::getVoidTy(ctx);
    case TypeName::Kind::Ptr:
        return llvm::PointerType::getUnqual(ctx);
    case TypeName::Kind::Struct: {
        auto it = structTypes.find(t.structName);
        if (it != structTypes.end()) {
            return it->second;
        }
        return llvm::Type::getVoidTy(ctx);
    }
    case TypeName::Kind::Array: {
        if (t.elementType && t.arraySize > 0) {
            llvm::Type *elemTy = lowerType(ctx, *t.elementType, structTypes);
            return llvm::ArrayType::get(elemTy, t.arraySize);
        }
        return llvm::Type::getVoidTy(ctx);
    }
    default:
        return llvm::Type::getVoidTy(ctx);
    }
}

struct ExternFunctionDecl {
    std::string name;
    std::string lib;
    std::vector<TypeName> params;
    TypeName result;
};

struct StructField {
    std::string name;
    TypeName type;
};

struct StructDef {
    std::string name;
    std::vector<StructField> fields;
};

struct ImportDecl {
    enum class Kind {
        Named,      // import { foo, bar } from "..."
        Namespace,  // import * as name from "..."
        Default     // import name from "..." (future)
    };
    
    Kind kind = Kind::Named;
    std::vector<std::string> names;  // Imported names: { foo, bar }
    std::string namespaceName;       // For import * as name
    std::string modulePath;          // Module path: "./module.tsn"
};

struct Program {
    std::vector<std::unique_ptr<Stmt>> stmts;
    std::vector<ExternFunctionDecl> externFns;
    std::vector<std::unique_ptr<struct FunctionDef>> functions;
    std::vector<StructDef> structs;
    std::vector<ImportDecl> imports;
    std::map<std::string, llvm::AllocaInst*> symbolTable;
    std::map<std::string, llvm::StructType*> structTypes;
    std::map<std::string, bool> exportedFunctions;  // Track exported functions
};

class Parser {
public:
    explicit Parser(std::string_view src) : lex_(src) {
        advance();
    }

    std::optional<Program> parse() {
        Program prog;
        while (tok_.kind != TokenKind::End) {
            if (tok_.kind == TokenKind::At || tok_.kind == TokenKind::KwDeclare) {
                if (!parseExternDecl(prog)) {
                    return std::nullopt;
                }
                continue;
            }
            if (tok_.kind == TokenKind::KwFunction) {
                if (!parseFunction(prog)) {
                    return std::nullopt;
                }
                continue;
            }
            if (tok_.kind == TokenKind::KwInterface || tok_.kind == TokenKind::KwClass) {
                if (!parseStruct(prog)) {
                    return std::nullopt;
                }
                continue;
            }
            if (tok_.kind == TokenKind::KwImport) {
                if (!parseImport(prog)) {
                    return std::nullopt;
                }
                continue;
            }
            if (tok_.kind == TokenKind::KwExport) {
                advance(); // consume 'export'
                // After export, we expect function, interface, or const
                if (tok_.kind == TokenKind::KwFunction) {
                    size_t fnCountBefore = prog.functions.size();
                    if (!parseFunction(prog)) {
                        return std::nullopt;
                    }
                    // Mark the last added function as exported
                    if (prog.functions.size() > fnCountBefore) {
                        prog.exportedFunctions[prog.functions.back()->name] = true;
                    }
                    continue;
                }
                // For now, skip other export types
                Diag::error(tok_.pos, "only 'export function' is supported");
                return std::nullopt;
            }
            if (tok_.kind == TokenKind::KwType) {
                if (!parseTypeAlias()) {
                    return std::nullopt;
                }
                continue;
            }
            if (tok_.kind == TokenKind::KwConst) {
                if (!parseGlobalConst()) {
                    return std::nullopt;
                }
                continue;
            }
            Diag::error(tok_.pos, "expected 'function', 'import', 'type', 'interface' or 'const'");
            return std::nullopt;
        }
        return prog;
    }

private:
    std::map<std::string, TypeName> typeAliases_;
    std::map<std::string, std::string> globalConsts_;

    bool parseStruct(Program &prog) {
        bool isInterface = (tok_.kind == TokenKind::KwInterface);
        advance(); // consume 'interface' or 'class'
        
        if (!expect(TokenKind::Identifier, "expected struct name")) {
            return false;
        }
        
        StructDef structDef;
        structDef.name = tok_.text;
        advance();
        
        if (!consume(TokenKind::LBrace, "expected '{'")) {
            return false;
        }
        
        // Parse fields
        while (tok_.kind != TokenKind::RBrace && tok_.kind != TokenKind::End) {
            if (!expect(TokenKind::Identifier, "expected field name")) {
                return false;
            }
            
            StructField field;
            field.name = tok_.text;
            advance();
            
            if (!consume(TokenKind::Colon, "expected ':'")) {
                return false;
            }
            
            if (!parseType(field.type)) {
                return false;
            }
            
            if (!consume(TokenKind::Semicolon, "expected ';'")) {
                return false;
            }
            
            structDef.fields.push_back(std::move(field));
        }
        
        if (!consume(TokenKind::RBrace, "expected '}'")) {
            return false;
        }
        
        prog.structs.push_back(std::move(structDef));
        return true;
    }

    bool parseGlobalConst() {
        consume(TokenKind::KwConst);
        if (!expect(TokenKind::Identifier, "expected constant name")) {
            return false;
        }
        std::string name = tok_.text;
        advance();

        // Optional type annotation (ignored for now)
        if (tok_.kind == TokenKind::Colon) {
            advance();
            TypeName t;
            if (!parseType(t)) return false;
        }

        if (!consume(TokenKind::Equal, "expected '='")) {
            return false;
        }
        if (tok_.kind != TokenKind::Number) {
            Diag::error(tok_.pos, "global const must be a number literal for now");
            return false;
        }
        globalConsts_[name] = tok_.text;
        advance();
        if (!consume(TokenKind::Semicolon, "expected ';'")) {
            return false;
        }
        return true;
    }

    bool parseTypeAlias() {
        consume(TokenKind::KwType);
        if (!expect(TokenKind::Identifier, "expected type name")) {
            return false;
        }
        std::string name = tok_.text;
        advance();
        if (!consume(TokenKind::Equal, "expected '='")) {
            return false;
        }
        TypeName target;
        if (!parseType(target)) {
            return false;
        }
        if (!consume(TokenKind::Semicolon, "expected ';'")) {
            return false;
        }
        typeAliases_[name] = std::move(target);
        return true;
    }

    struct PendingDecorators {
        std::string lib;
    };

    bool parseExternDecl(Program &prog) {
        PendingDecorators dec;
        while (tok_.kind == TokenKind::At) {
            if (!parseDecorator(dec)) {
                return false;
            }
        }

        if (!consume(TokenKind::KwDeclare, "expected 'declare'")) {
            return false;
        }
        if (!consume(TokenKind::KwFunction, "expected 'function'")) {
            return false;
        }
        if (!expect(TokenKind::Identifier, "expected function name")) {
            return false;
        }

        ExternFunctionDecl fn;
        fn.name = tok_.text;
        fn.lib = std::move(dec.lib);
        advance();

        if (!consume(TokenKind::LParen, "expected '('") || !parseParamList(fn.params) ||
            !consume(TokenKind::RParen, "expected ')'") || !consume(TokenKind::Colon, "expected ':'") ||
            !parseType(fn.result) || !consume(TokenKind::Semicolon, "expected ';'")) {
            return false;
        }

        prog.externFns.push_back(std::move(fn));
        return true;
    }

    bool parseDecorator(PendingDecorators &dec) {
        if (!consume(TokenKind::At, "expected '@'")) {
            return false;
        }
        if (!expect(TokenKind::Identifier, "expected decorator namespace")) {
            return false;
        }
        std::string ns = tok_.text;
        advance();
        if (!consume(TokenKind::Dot, "expected '.'")) {
            return false;
        }
        if (!expect(TokenKind::Identifier, "expected decorator name")) {
            return false;
        }
        std::string name = tok_.text;
        advance();
        if (!consume(TokenKind::LParen, "expected '('") || !expect(TokenKind::String, "expected string literal")) {
            return false;
        }
        std::string value = tok_.text;
        advance();
        if (!consume(TokenKind::RParen, "expected ')'") ) {
            return false;
        }

        if (tok_.kind == TokenKind::Semicolon) {
            advance();
        }

        if (ns == "ffi" && name == "lib") {
            dec.lib = std::move(value);
        }
        return true;
    }

    bool parseParamList(std::vector<TypeName> &out) {
        if (tok_.kind == TokenKind::RParen) {
            return true;
        }
        while (true) {
            if (!expect(TokenKind::Identifier, "expected parameter name")) {
                return false;
            }
            advance();
            if (!consume(TokenKind::Colon, "expected ':'")) {
                return false;
            }
            TypeName t;
            if (!parseType(t)) {
                return false;
            }
            out.push_back(std::move(t));
            if (tok_.kind == TokenKind::Comma) {
                advance();
                continue;
            }
            return true;
        }
    }

    bool parseType(TypeName &out) {
        if (!expect(TokenKind::Identifier, "expected type name")) {
            return false;
        }

        std::string t = tok_.text;
        advance();

        // Parse base type
        if (t == "i8") {
            out.kind = TypeName::Kind::I8;
        } else if (t == "u8") {
            out.kind = TypeName::Kind::U8;
        } else if (t == "i32") {
            out.kind = TypeName::Kind::I32;
        } else if (t == "u32") {
            out.kind = TypeName::Kind::U32;
        } else if (t == "i64") {
            out.kind = TypeName::Kind::I64;
        } else if (t == "u64") {
            out.kind = TypeName::Kind::U64;
        } else if (t == "f32") {
            out.kind = TypeName::Kind::F32;
        } else if (t == "f64" || t == "number") {
            out.kind = TypeName::Kind::F64;
        } else if (t == "bool") {
            out.kind = TypeName::Kind::Bool;
        } else if (t == "void") {
            out.kind = TypeName::Kind::Void;
        } else if (t == "ptr") {
            if (!consume(TokenKind::Less, "expected '<'")) {
                return false;
            }
            out.kind = TypeName::Kind::Ptr;
            out.pointee = std::make_unique<TypeName>();
            if (!parseType(*out.pointee)) {
                return false;
            }
            if (!consume(TokenKind::Greater, "expected '>'")) {
                return false;
            }
            // Check for array after ptr
            if (tok_.kind == TokenKind::LBracket) {
                advance();
                if (!expect(TokenKind::Number, "expected array size")) {
                    return false;
                }
                int size = std::stoi(tok_.text);
                advance();
                if (!consume(TokenKind::RBracket, "expected ']'")) {
                    return false;
                }
                TypeName arrayType;
                arrayType.kind = TypeName::Kind::Array;
                arrayType.elementType = std::make_unique<TypeName>(std::move(out));
                arrayType.arraySize = size;
                out = std::move(arrayType);
            }
            return true;
        } else {
            // Check type aliases
            auto it = typeAliases_.find(t);
            if (it != typeAliases_.end()) {
                out = it->second.clone();
            } else {
                // Assume it's a struct type
                out.kind = TypeName::Kind::Struct;
                out.structName = t;
            }
        }

        // Check for array syntax: Type[size]
        if (tok_.kind == TokenKind::LBracket) {
            advance();
            if (!expect(TokenKind::Number, "expected array size")) {
                return false;
            }
            int size = std::stoi(tok_.text);
            advance();
            if (!consume(TokenKind::RBracket, "expected ']'")) {
                return false;
            }
            
            // Wrap current type in array
            TypeName arrayType;
            arrayType.kind = TypeName::Kind::Array;
            arrayType.elementType = std::make_unique<TypeName>(std::move(out));
            arrayType.arraySize = size;
            out = std::move(arrayType);
        }

        return true;
    }

    bool parseImport(Program &prog) {
        advance(); // consume 'import'
        
        ImportDecl import;
        
        // Check for import * as name from "..."
        if (tok_.kind == TokenKind::Star) {
            advance(); // consume '*'
            
            // Expect 'as'
            if (!expect(TokenKind::Identifier, "expected 'as'")) {
                return false;
            }
            if (tok_.text != "as") {
                Diag::error(tok_.pos, "expected 'as' keyword");
                return false;
            }
            advance();
            
            // Get namespace name
            if (!expect(TokenKind::Identifier, "expected namespace name")) {
                return false;
            }
            import.kind = ImportDecl::Kind::Namespace;
            import.namespaceName = tok_.text;
            advance();
            
            // Parse 'from'
            if (!consume(TokenKind::KwFrom, "expected 'from'")) {
                return false;
            }
            
            // Parse module path
            if (!expect(TokenKind::String, "expected module path")) {
                return false;
            }
            import.modulePath = tok_.text;
            advance();
            
            if (!consume(TokenKind::Semicolon, "expected ';'")) {
                return false;
            }
            
            prog.imports.push_back(std::move(import));
            return true;
        }
        
        // Parse: import { name1, name2 } from "path"
        if (!consume(TokenKind::LBrace, "expected '{'")) {
            return false;
        }
        
        import.kind = ImportDecl::Kind::Named;
        
        // Parse imported names
        while (tok_.kind != TokenKind::RBrace && tok_.kind != TokenKind::End) {
            if (!expect(TokenKind::Identifier, "expected import name")) {
                return false;
            }
            import.names.push_back(tok_.text);
            advance();
            
            if (tok_.kind == TokenKind::Comma) {
                advance();
            }
        }
        
        if (!consume(TokenKind::RBrace, "expected '}'")) {
            return false;
        }
        
        // Parse 'from'
        if (!consume(TokenKind::KwFrom, "expected 'from'")) {
            return false;
        }
        
        // Parse module path
        if (!expect(TokenKind::String, "expected module path")) {
            return false;
        }
        import.modulePath = tok_.text;
        advance();
        
        if (!consume(TokenKind::Semicolon, "expected ';'")) {
            return false;
        }
        
        prog.imports.push_back(std::move(import));
        return true;
    }

    bool skipImport() {
        advance();
        while (tok_.kind != TokenKind::Semicolon && tok_.kind != TokenKind::End) {
            advance();
        }
        if (tok_.kind == TokenKind::Semicolon) {
            advance();
        }
        return true;
    }

    bool parseFunction(Program &prog) {
        consume(TokenKind::KwFunction);
        if (!expect(TokenKind::Identifier, "expected function name")) {
            return false;
        }
        std::string fnName = tok_.text;
        advance();

        auto fn = std::make_unique<FunctionDef>();
        fn->name = fnName;

        // Parse parameters
        if (!consume(TokenKind::LParen, "expected '('")) {
            return false;
        }
        while (tok_.kind != TokenKind::RParen && tok_.kind != TokenKind::End) {
            if (!expect(TokenKind::Identifier, "expected parameter name")) {
                return false;
            }
            std::string paramName = tok_.text;
            advance();
            if (!consume(TokenKind::Colon, "expected ':'")) {
                return false;
            }
            TypeName paramType;
            if (!parseType(paramType)) {
                return false;
            }
            FunctionParam param;
            param.name = std::move(paramName);
            param.type = std::move(paramType);
            fn->params.push_back(std::move(param));
            if (tok_.kind == TokenKind::Comma) {
                advance();
            }
        }
        if (!consume(TokenKind::RParen, "expected ')'")) {
            return false;
        }

        // Parse return type (optional, defaults to void)
        if (tok_.kind == TokenKind::Colon) {
            advance();
            if (!parseType(fn->result)) {
                return false;
            }
        } else {
            fn->result.kind = TypeName::Kind::Void;
        }

        if (!consume(TokenKind::LBrace, "expected '{'")) {
            return false;
        }

        // Parse body
        while (tok_.kind != TokenKind::RBrace && tok_.kind != TokenKind::End) {
            auto stmt = parseStmt();
            if (!stmt.has_value()) {
                return false;
            }
            if (*stmt) {
                fn->body.push_back(std::move(*stmt));
            }
        }

        if (!consume(TokenKind::RBrace, "expected '}'")) {
            return false;
        }

        if (fnName == "main") {
            // For main, store body in prog.stmts for backward compatibility
            prog.stmts = std::move(fn->body);
        } else {
            // For other functions, store the function definition
            prog.functions.push_back(std::move(fn));
        }
        return true;
    }

    std::optional<std::unique_ptr<Stmt>> parseStmt() {
        if (tok_.kind == TokenKind::KwIf) {
            advance();
            if (!consume(TokenKind::LParen, "expected '('")) return std::nullopt;
            auto cond = parseExpr();
            if (!cond) return std::nullopt;
            if (!consume(TokenKind::RParen, "expected ')' in if")) return std::nullopt;

            auto s = std::make_unique<IfStmt>();
            s->cond = std::move(*cond);

            if (!consume(TokenKind::LBrace, "expected '{'")) return std::nullopt;
            while (tok_.kind != TokenKind::RBrace && tok_.kind != TokenKind::End) {
                auto stmt = parseStmt();
                if (!stmt) return std::nullopt;
                s->thenBody.push_back(std::move(*stmt));
            }
            if (!consume(TokenKind::RBrace, "expected '}'")) return std::nullopt;

            if (tok_.kind == TokenKind::KwElse) {
                advance();
                if (tok_.kind == TokenKind::KwIf) {
                    auto elseIf = parseStmt();
                    if (!elseIf) return std::nullopt;
                    s->elseBody.push_back(std::move(*elseIf));
                } else {
                    if (!consume(TokenKind::LBrace, "expected '{'")) return std::nullopt;
                    while (tok_.kind != TokenKind::RBrace && tok_.kind != TokenKind::End) {
                        auto stmt = parseStmt();
                        if (!stmt) return std::nullopt;
                        s->elseBody.push_back(std::move(*stmt));
                    }
                    if (!consume(TokenKind::RBrace, "expected '}'")) return std::nullopt;
                }
            }
            return std::optional<std::unique_ptr<Stmt>>(std::move(s));
        }

        if (tok_.kind == TokenKind::KwWhile) {
            advance();
            if (!consume(TokenKind::LParen, "expected '('")) return std::nullopt;
            auto cond = parseExpr();
            if (!cond) return std::nullopt;
            if (!consume(TokenKind::RParen, "expected ')'")) return std::nullopt;

            auto s = std::make_unique<WhileStmt>();
            s->cond = std::move(*cond);

            if (!consume(TokenKind::LBrace, "expected '{'")) return std::nullopt;
            while (tok_.kind != TokenKind::RBrace && tok_.kind != TokenKind::End) {
                auto stmt = parseStmt();
                if (!stmt) return std::nullopt;
                s->body.push_back(std::move(*stmt));
            }
            if (!consume(TokenKind::RBrace, "expected '}'")) return std::nullopt;

            return std::optional<std::unique_ptr<Stmt>>(std::move(s));
        }

        if (tok_.kind == TokenKind::KwFor) {
            advance();
            if (!consume(TokenKind::LParen, "expected '(' after 'for'")) return std::nullopt;
            
            // Parse initialization (let i = 0;)
            auto init = parseStmt();
            if (!init) return std::nullopt;
            
            // Parse condition (i < 10;)
            auto cond = parseExpr();
            if (!cond) return std::nullopt;
            if (!consume(TokenKind::Semicolon, "expected ';' after condition")) return std::nullopt;
            
            // Parse increment (i = i + 1) - as expression, then wrap in statement
            // We need to handle this specially because it's an expression, not a statement
            if (tok_.kind == TokenKind::Identifier) {
                std::string varName = tok_.text;
                advance();
                
                if (tok_.kind == TokenKind::Equal) {
                    advance();
                    auto val = parseExpr();
                    if (!val) return std::nullopt;
                    
                    auto assignStmt = std::make_unique<AssignStmt>();
                    assignStmt->name = varName;
                    assignStmt->value = std::move(*val);
                    
                    if (!consume(TokenKind::RParen, "expected ')' after increment")) return std::nullopt;
                    
                    auto s = std::make_unique<ForStmt>();
                    s->init = std::move(*init);
                    s->cond = std::move(*cond);
                    s->increment = std::move(assignStmt);
                    
                    if (!consume(TokenKind::LBrace, "expected '{'")) return std::nullopt;
                    while (tok_.kind != TokenKind::RBrace && tok_.kind != TokenKind::End) {
                        auto stmt = parseStmt();
                        if (!stmt) return std::nullopt;
                        s->body.push_back(std::move(*stmt));
                    }
                    if (!consume(TokenKind::RBrace, "expected '}'")) return std::nullopt;
                    
                    return std::optional<std::unique_ptr<Stmt>>(std::move(s));
                }
            }
            
            Diag::error(tok_.pos, "expected assignment in for loop increment");
            return std::nullopt;
        }

        if (tok_.kind == TokenKind::Identifier && tok_.text == "console") {
            size_t startPos = tok_.pos;
            advance();
            if (!consume(TokenKind::Dot, "expected '.'")) {
                return std::nullopt;
            }
            if (!expect(TokenKind::Identifier, "expected method name")) {
                return std::nullopt;
            }
            std::string method = tok_.text;
            advance();
            if (method != "log") {
                Diag::error(startPos, "only console.log is supported in MVP");
                return std::nullopt;
            }
            if (!consume(TokenKind::LParen, "expected '('") || !expect(TokenKind::String, "expected string literal")) {
                return std::nullopt;
            }
            std::string msg = tok_.text;
            advance();
            if (!consume(TokenKind::RParen, "expected ')'") || !consume(TokenKind::Semicolon, "expected ';'")) {
                return std::nullopt;
            }
            auto s = std::make_unique<LogStmt>();
            s->message = std::move(msg);
            return std::optional<std::unique_ptr<Stmt>>(std::move(s));
        }

        // Handle assignment or expression stmt starting with identifier
        if (tok_.kind == TokenKind::Identifier) {
            // Parse as expression first (might be arr[i] or just identifier)
            auto expr = parseExpr();
            if (!expr) return std::nullopt;
            
            // Check if it's an assignment
            if (tok_.kind == TokenKind::Equal) {
                advance(); // consume '='
                auto val = parseExpr();
                if (!val) return std::nullopt;
                if (!consume(TokenKind::Semicolon, "expected ';' after assignment")) return std::nullopt;
                
                // Check if LHS is simple identifier, indexed expression, or member expression
                if (auto *ident = dynamic_cast<Identifier*>(expr->get())) {
                    auto s = std::make_unique<AssignStmt>();
                    s->name = ident->name;
                    s->value = std::move(*val);
                    return std::optional<std::unique_ptr<Stmt>>(std::move(s));
                } else if (dynamic_cast<IndexExpr*>(expr->get())) {
                    auto s = std::make_unique<IndexedAssignStmt>();
                    s->target = std::move(*expr);
                    s->value = std::move(*val);
                    return std::optional<std::unique_ptr<Stmt>>(std::move(s));
                } else if (auto *memberExpr = dynamic_cast<MemberExpr*>(expr->get())) {
                    auto s = std::make_unique<MemberAssignStmt>();
                    s->object = std::move(memberExpr->object);
                    s->member = memberExpr->member;
                    s->value = std::move(*val);
                    return std::optional<std::unique_ptr<Stmt>>(std::move(s));
                } else {
                    Diag::error(tok_.pos, "invalid assignment target");
                    return std::nullopt;
                }
            } else {
                // It's an expression statement
                if (!consume(TokenKind::Semicolon, "expected ';'")) return std::nullopt;
                auto s = std::make_unique<ExprStmt>();
                s->expr = std::move(*expr);
                return std::optional<std::unique_ptr<Stmt>>(std::move(s));
            }
        }

        if (tok_.kind == TokenKind::KwLet || tok_.kind == TokenKind::KwConst) {
            bool isConst = (tok_.kind == TokenKind::KwConst);
            advance();
            if (!expect(TokenKind::Identifier, "expected variable name")) {
                return std::nullopt;
            }
            std::string name = tok_.text;
            advance();

            TypeName varType;
            bool hasType = false;
            
            // Optional type annotation
            if (tok_.kind == TokenKind::Colon) {
                advance();
                if (!parseType(varType)) return std::nullopt;
                hasType = true;
            }

            // Optional initialization (required for const)
            if (tok_.kind == TokenKind::Equal) {
                advance();
                auto init = parseExpr();
                if (!init) {
                    return std::nullopt;
                }
                if (!consume(TokenKind::Semicolon, "expected ';'")) {
                    return std::nullopt;
                }
                auto s = std::make_unique<LetStmt>();
                s->name = std::move(name);
                s->init = std::move(init.value());
                s->isConst = isConst;
                if (hasType) {
                    s->type = std::move(varType);
                    s->hasType = true;
                }
                return std::optional<std::unique_ptr<Stmt>>(std::move(s));
            } else {
                // Declaration without initialization
                if (isConst) {
                    Diag::error(tok_.pos, "const declaration must have an initializer");
                    return std::nullopt;
                }
                if (!consume(TokenKind::Semicolon, "expected ';'")) {
                    return std::nullopt;
                }
                auto s = std::make_unique<LetStmt>();
                s->name = std::move(name);
                s->init = nullptr;
                s->isConst = false;
                if (hasType) {
                    s->type = std::move(varType);
                    s->hasType = true;
                }
                return std::optional<std::unique_ptr<Stmt>>(std::move(s));
            }
        }

        if (tok_.kind == TokenKind::KwReturn) {
            advance();
            auto s = std::make_unique<ReturnStmt>();
            if (tok_.kind != TokenKind::Semicolon) {
                auto val = parseExpr();
                if (!val) {
                    return std::nullopt;
                }
                s->value = std::move(val.value());
            }
            if (!consume(TokenKind::Semicolon, "expected ';'")) {
                return std::nullopt;
            }
            return std::optional<std::unique_ptr<Stmt>>(std::move(s));
        }

        auto expr = parseExpr();
        if (expr) {
            if (!consume(TokenKind::Semicolon, "expected ';'")) {
                return std::nullopt;
            }
            auto s = std::make_unique<ExprStmt>();
            s->expr = std::move(expr.value());
            return std::optional<std::unique_ptr<Stmt>>(std::move(s));
        }

        Diag::error(tok_.pos, "unsupported statement in MVP");
        return std::nullopt;
    }

    std::optional<std::unique_ptr<Expr>> parseExpr() {
        return parseBinaryExpr(0);
    }

    std::optional<std::unique_ptr<Expr>> parseBinaryExpr(int minPrecedence) {
        auto lhs = parseUnaryExpr();
        if (!lhs) return std::nullopt;

        while (true) {
            int prec = getPrecedence(tok_.kind);
            if (prec == -1 || prec < minPrecedence) break;

            TokenKind opKind = tok_.kind;
            advance();
            
            // For left-associative operators, we use prec + 1
            auto rhs = parseBinaryExpr(prec + 1);
            if (!rhs) return std::nullopt;

            auto bin = std::make_unique<BinaryExpr>();
            bin->lhs = std::move(*lhs);
            bin->rhs = std::move(*rhs);
            bin->op = toBinaryOp(opKind);
            lhs = std::move(bin);
        }
        return lhs;
    }

    std::optional<std::unique_ptr<Expr>> parseUnaryExpr() {
        // Check for unary operators
        if (tok_.kind == TokenKind::Minus) {
            advance();
            auto operand = parseUnaryExpr();  // Recursive for multiple unary ops
            if (!operand) return std::nullopt;
            auto unary = std::make_unique<UnaryExpr>();
            unary->op = UnaryExpr::Op::Neg;
            unary->operand = std::move(*operand);
            return std::optional<std::unique_ptr<Expr>>(std::move(unary));
        }
        if (tok_.kind == TokenKind::Exclaim) {
            advance();
            auto operand = parseUnaryExpr();  // Recursive for multiple unary ops
            if (!operand) return std::nullopt;
            auto unary = std::make_unique<UnaryExpr>();
            unary->op = UnaryExpr::Op::Not;
            unary->operand = std::move(*operand);
            return std::optional<std::unique_ptr<Expr>>(std::move(unary));
        }
        // Not a unary operator, parse primary expression
        return parsePrimaryExpr();
    }

    int getPrecedence(TokenKind kind) {
        switch (kind) {
            case TokenKind::Star: case TokenKind::Slash: return 40;
            case TokenKind::Plus: case TokenKind::Minus: return 30;
            case TokenKind::Less: case TokenKind::LessEqual:
            case TokenKind::Greater: case TokenKind::GreaterEqual: return 20;
            case TokenKind::EqualEqual: case TokenKind::NotEqual: return 10;
            case TokenKind::AndAnd: return 5;
            case TokenKind::PipePipe: return 4;
            default: return -1;
        }
    }

    BinaryExpr::Op toBinaryOp(TokenKind kind) {
        switch (kind) {
            case TokenKind::Plus: return BinaryExpr::Op::Add;
            case TokenKind::Minus: return BinaryExpr::Op::Sub;
            case TokenKind::Star: return BinaryExpr::Op::Mul;
            case TokenKind::Slash: return BinaryExpr::Op::Div;
            case TokenKind::EqualEqual: return BinaryExpr::Op::Eq;
            case TokenKind::NotEqual: return BinaryExpr::Op::Ne;
            case TokenKind::Less: return BinaryExpr::Op::Lt;
            case TokenKind::Greater: return BinaryExpr::Op::Gt;
            case TokenKind::LessEqual: return BinaryExpr::Op::Le;
            case TokenKind::GreaterEqual: return BinaryExpr::Op::Ge;
            case TokenKind::AndAnd: return BinaryExpr::Op::And;
            case TokenKind::PipePipe: return BinaryExpr::Op::Or;
            default: throw std::runtime_error("invalid binary operator");
        }
    }

    std::optional<std::unique_ptr<Expr>> parsePrimaryExpr() {
        std::optional<std::unique_ptr<Expr>> res;
        if (tok_.kind == TokenKind::LParen) {
            advance();
            auto e = parseExpr();
            if (!e) return std::nullopt;
            if (!consume(TokenKind::RParen, "expected ')'")) return std::nullopt;
            res = std::move(*e);
        } else if (tok_.kind == TokenKind::String) {
            auto e = std::make_unique<StringLiteral>();
            e->value = tok_.text;
            advance();
            res = std::optional<std::unique_ptr<Expr>>(std::move(e));
        } else if (tok_.kind == TokenKind::Number) {
            auto e = std::make_unique<NumberLiteral>();
            e->value = tok_.text;
            advance();
            res = std::optional<std::unique_ptr<Expr>>(std::move(e));
        } else if (tok_.kind == TokenKind::KwNull) {
            advance();
            auto e = std::make_unique<NullLiteral>();
            res = std::optional<std::unique_ptr<Expr>>(std::move(e));
        } else if (tok_.kind == TokenKind::Identifier) {
            std::string name = tok_.text;

            // Check global constants
            auto it = globalConsts_.find(name);
            if (it != globalConsts_.end()) {
                auto e = std::make_unique<NumberLiteral>();
                e->value = it->second;
                advance();
                res = std::optional<std::unique_ptr<Expr>>(std::move(e));
            } else {
                advance();
                if (tok_.kind == TokenKind::LParen) {
                    // Check for builtin addressof() function
                    if (name == "addressof") {
                        advance(); // consume '('
                        auto arg = parseExpr();
                        if (!arg) {
                            return std::nullopt;
                        }
                        if (!consume(TokenKind::RParen, "expected ')' after addressof")) {
                            return std::nullopt;
                        }
                        auto e = std::make_unique<AddressOfExpr>();
                        e->operand = std::move(arg.value());
                        res = std::optional<std::unique_ptr<Expr>>(std::move(e));
                    } else {
                        // Regular function call
                        advance(); // consume '('
                        auto call = std::make_unique<CallExpr>();
                        call->callee = std::move(name);
                        while (tok_.kind != TokenKind::RParen && tok_.kind != TokenKind::End) {
                            auto arg = parseExpr();
                            if (!arg) {
                                return std::nullopt;
                            }
                            call->args.push_back(std::move(arg.value()));
                            if (tok_.kind == TokenKind::Comma) {
                                advance();
                            }
                        }
                        if (!consume(TokenKind::RParen, "expected ')'")) {
                            return std::nullopt;
                        }
                        res = std::optional<std::unique_ptr<Expr>>(std::move(call));
                    }                } else {
                    auto e = std::make_unique<Identifier>();
                    e->name = std::move(name);
                    res = std::optional<std::unique_ptr<Expr>>(std::move(e));
                }
            }
        } else if (tok_.kind == TokenKind::LBrace) {
            // Object literal: { field: value, ... }
            advance(); // consume '{'
            auto obj = std::make_unique<ObjectLiteral>();
            
            while (tok_.kind != TokenKind::RBrace && tok_.kind != TokenKind::End) {
                // Parse field name
                if (!expect(TokenKind::Identifier, "expected field name in object literal")) {
                    return std::nullopt;
                }
                std::string fieldName = tok_.text;
                advance();
                
                // Expect ':'
                if (!consume(TokenKind::Colon, "expected ':' after field name")) {
                    return std::nullopt;
                }
                
                // Parse field value
                auto value = parseExpr();
                if (!value) {
                    return std::nullopt;
                }
                
                obj->fieldNames.push_back(std::move(fieldName));
                obj->fieldValues.push_back(std::move(*value));
                
                // Check for comma
                if (tok_.kind == TokenKind::Comma) {
                    advance();
                }
            }
            
            if (!consume(TokenKind::RBrace, "expected '}' after object literal")) {
                return std::nullopt;
            }
            
            res = std::optional<std::unique_ptr<Expr>>(std::move(obj));
        } else {
            Diag::error(tok_.pos, "expected expression");
            return std::nullopt;
        }

        // Handle postfix operators (like index [index] and member access .field)
        while (tok_.kind == TokenKind::LBracket || tok_.kind == TokenKind::Dot) {
            if (tok_.kind == TokenKind::LBracket) {
                advance();
                auto index = parseExpr();
                if (!index) return std::nullopt;
                if (!consume(TokenKind::RBracket, "expected ']' after index")) return std::nullopt;
                auto e = std::make_unique<IndexExpr>();
                e->base = std::move(*res);
                e->index = std::move(*index);
                res = std::optional<std::unique_ptr<Expr>>(std::move(e));
            } else if (tok_.kind == TokenKind::Dot) {
                advance();
                if (!expect(TokenKind::Identifier, "expected member name after '.'")) {
                    return std::nullopt;
                }
                auto e = std::make_unique<MemberExpr>();
                e->object = std::move(*res);
                e->member = tok_.text;
                advance();
                res = std::optional<std::unique_ptr<Expr>>(std::move(e));
            }
        }
        return std::move(res);
    }

    bool expect(TokenKind kind, const std::string &msg) {
        if (tok_.kind != kind) {
            Diag::error(tok_.pos, msg);
            return false;
        }
        return true;
    }

    void consume(TokenKind kind) {
        if (tok_.kind == kind) {
            advance();
            return;
        }
    }

    bool consume(TokenKind kind, const std::string &msg) {
        if (tok_.kind != kind) {
            std::cerr << "Parser error: expected " << (int)kind << " but got " << (int)tok_.kind << " ('" << tok_.text << "') at " << tok_.pos << "\n";
            Diag::error(tok_.pos, msg);
            return false;
        }
        advance();
        return true;
    }

    void advance() {
        prevTok_ = tok_;
        tok_ = lex_.next();
        std::cerr << "Token: " << (int)tok_.kind << " text: '" << tok_.text << "' at " << tok_.pos << "\n";
    };

    Lexer lex_;
    Token tok_{TokenKind::End, "", 0};
    Token prevTok_{TokenKind::End, "", 0};
};

static llvm::FunctionCallee getConsoleLog(llvm::Module &m) {
    llvm::LLVMContext &ctx = m.getContext();
    llvm::Type *i8Ptr = llvm::PointerType::getUnqual(ctx);
    llvm::Type *i32Ty = llvm::Type::getInt32Ty(ctx);
    llvm::Type *voidTy = llvm::Type::getVoidTy(ctx);
    auto *fnTy = llvm::FunctionType::get(voidTy, {i8Ptr, i32Ty}, false);
    return m.getOrInsertFunction("tsn_console_log", fnTy);
}

static llvm::Constant *makeStringGlobal(llvm::Module &m, const std::string &s, const std::string &name) {
    llvm::LLVMContext &ctx = m.getContext();
    llvm::Constant *data = llvm::ConstantDataArray::getString(ctx, s, true);
    auto *gv = new llvm::GlobalVariable(
        m,
        data->getType(),
        true,
        llvm::GlobalValue::PrivateLinkage,
        data,
        name
    );
    gv->setUnnamedAddr(llvm::GlobalValue::UnnamedAddr::Global);
    gv->setAlignment(llvm::Align(1));
    return gv;
}

static bool needsConsole(const Program &p) {
    auto check = [](const std::vector<std::unique_ptr<Stmt>> &stmts) -> bool {
        for (const auto &s : stmts) {
            if (dynamic_cast<const LogStmt *>(s.get())) return true;
            if (const auto *ifStmt = dynamic_cast<const IfStmt *>(s.get())) {
                for (const auto &thenS : ifStmt->thenBody) if (dynamic_cast<const LogStmt *>(thenS.get())) return true;
                for (const auto &elseS : ifStmt->elseBody) if (dynamic_cast<const LogStmt *>(elseS.get())) return true;
            }
            if (const auto *whileStmt = dynamic_cast<const WhileStmt *>(s.get())) {
                for (const auto &bodyS : whileStmt->body) if (dynamic_cast<const LogStmt *>(bodyS.get())) return true;
            }
            if (const auto *forStmt = dynamic_cast<const ForStmt *>(s.get())) {
                for (const auto &bodyS : forStmt->body) if (dynamic_cast<const LogStmt *>(bodyS.get())) return true;
            }
        }
        return false;
    };

    if (check(p.stmts)) return true;
    for (const auto &fn : p.functions) {
        if (check(fn->body)) return true;
    }
    return false;
}

static void emitWindowsConsoleRuntime(llvm::Module &m, llvm::Function *mainFn) {
    llvm::LLVMContext &ctx = m.getContext();
    llvm::IRBuilder<> b(ctx);

    llvm::Type *i32Ty = llvm::Type::getInt32Ty(ctx);
    llvm::Type *ptrTy = llvm::PointerType::getUnqual(ctx);
    llvm::Type *voidTy = llvm::Type::getVoidTy(ctx);

    auto *getStdHandleTy = llvm::FunctionType::get(ptrTy, {i32Ty}, false);
    llvm::FunctionCallee getStdHandle = m.getOrInsertFunction("GetStdHandle", getStdHandleTy);

    auto *writeFileTy = llvm::FunctionType::get(
        i32Ty,
        {ptrTy, ptrTy, i32Ty, ptrTy, ptrTy},
        false
    );
    llvm::FunctionCallee writeFile = m.getOrInsertFunction("WriteFile", writeFileTy);

    auto *exitProcessTy = llvm::FunctionType::get(voidTy, {i32Ty}, false);
    llvm::FunctionCallee exitProcess = m.getOrInsertFunction("ExitProcess", exitProcessTy);

    llvm::Constant *newlineGv = makeStringGlobal(m, "\n", "__tsn_newline");

    llvm::Function *logFn = llvm::cast<llvm::Function>(getConsoleLog(m).getCallee());
    if (logFn->empty()) {
        auto *bb = llvm::BasicBlock::Create(ctx, "entry", logFn);
        llvm::IRBuilder<> logB(bb); // Use a separate builder for the function body

        llvm::Value *msgPtr = logFn->getArg(0);
        llvm::Value *msgLen = logFn->getArg(1);

        llvm::Value *stdOutHandle = logB.CreateCall(getStdHandle, {llvm::ConstantInt::getSigned(i32Ty, -11)});
        llvm::Value *bytesWritten = logB.CreateAlloca(i32Ty);
        logB.CreateStore(llvm::ConstantInt::get(i32Ty, 0), bytesWritten);

        llvm::Value *nullPtr = llvm::ConstantPointerNull::get(llvm::cast<llvm::PointerType>(ptrTy));

        logB.CreateCall(writeFile, {stdOutHandle, msgPtr, msgLen, bytesWritten, nullPtr});

        llvm::Value *zero = llvm::ConstantInt::get(i32Ty, 0);
        llvm::Value *nlPtr = logB.CreateInBoundsGEP(
            llvm::cast<llvm::GlobalVariable>(newlineGv)->getValueType(),
            newlineGv,
            {zero, zero}
        );
        logB.CreateCall(writeFile, {stdOutHandle, nlPtr, llvm::ConstantInt::get(i32Ty, 1), bytesWritten, nullPtr});

        logB.CreateRetVoid();
    }

    llvm::FunctionType *startTy = llvm::FunctionType::get(voidTy, {}, false);
    llvm::Function *startFn = llvm::Function::Create(startTy, llvm::Function::ExternalLinkage, "tsn_start", m);
    llvm::BasicBlock *startBB = llvm::BasicBlock::Create(ctx, "entry", startFn);
    b.SetInsertPoint(startBB);
    if (!mainFn) {
        b.CreateCall(exitProcess, {llvm::ConstantInt::get(i32Ty, 1)});
        b.CreateUnreachable();
        return;
    }

    llvm::Value *rc = b.CreateCall(mainFn, {});
    b.CreateCall(exitProcess, {rc});
    b.CreateUnreachable();
}

static bool emitLlvmIr(const Program &prog, const std::string &moduleName, llvm::raw_ostream &out) {
    llvm::LLVMContext ctx;
    llvm::Module m(moduleName, ctx);
    llvm::IRBuilder<> b(ctx);

    llvm::Type *i32Ty = llvm::Type::getInt32Ty(ctx);

    // Create struct types first
    Program &mutableProg = const_cast<Program&>(prog);
    for (const auto &structDef : prog.structs) {
        llvm::StructType *structTy = llvm::StructType::create(ctx, structDef.name);
        mutableProg.structTypes[structDef.name] = structTy;
    }

    // Define struct bodies
    for (const auto &structDef : prog.structs) {
        std::vector<llvm::Type*> fieldTypes;
        for (const auto &field : structDef.fields) {
            fieldTypes.push_back(lowerType(ctx, field.type, prog.structTypes));
        }
        mutableProg.structTypes[structDef.name]->setBody(fieldTypes);
    }

    for (const auto &fn : prog.externFns) {
        std::vector<llvm::Type *> params;
        params.reserve(fn.params.size());
        for (const auto &p : fn.params) {
            params.push_back(lowerType(ctx, p, prog.structTypes));
        }
        llvm::Type *retTy = lowerType(ctx, fn.result, prog.structTypes);
        auto *fnTy = llvm::FunctionType::get(retTy, params, false);
        m.getOrInsertFunction(fn.name, fnTy);
    }

    auto *mainTy = llvm::FunctionType::get(i32Ty, {}, false);
    llvm::Function *mainFn = llvm::Function::Create(mainTy, llvm::Function::ExternalLinkage, "main", m);
    llvm::BasicBlock *entry = llvm::BasicBlock::Create(ctx, "entry", mainFn);
    b.SetInsertPoint(entry);

    if (needsConsole(prog)) {
        emitWindowsConsoleRuntime(m, mainFn);
    }

    llvm::FunctionCallee logFn = getConsoleLog(m);

    int strIndex = 0;
    for (const auto &stmtPtr : prog.stmts) {
        const auto *logStmt = dynamic_cast<const LogStmt *>(stmtPtr.get());
        if (!logStmt) {
            continue;
        }

        std::string gvName = "__tsn_str_" + std::to_string(strIndex++);
        llvm::Constant *gv = makeStringGlobal(m, logStmt->message, gvName);

        llvm::Value *zero = llvm::ConstantInt::get(i32Ty, 0);
        llvm::Value *ptr = b.CreateInBoundsGEP(
            gv->getType(),
            gv,
            {zero, zero},
            "str_ptr"
        );
        llvm::Value *len = llvm::ConstantInt::get(i32Ty, static_cast<uint32_t>(logStmt->message.size()));
        b.CreateCall(logFn, {ptr, len});
    }

    b.CreateRet(llvm::ConstantInt::get(i32Ty, 0));

    m.print(out, nullptr);
    return true;
}

static llvm::Value *emitExpr(llvm::IRBuilder<> &b, const Expr *e, llvm::Module &m, const Program &prog) {
    if (!e) {
        return nullptr;
    }

    if (const auto *strLit = dynamic_cast<const StringLiteral *>(e)) {
        std::string gvName = "__tsn_str_lit_" + std::to_string(reinterpret_cast<uintptr_t>(e));
        llvm::Constant *gv = makeStringGlobal(m, strLit->value, gvName);
        llvm::LLVMContext &ctx = m.getContext();
        llvm::Value *zero = llvm::ConstantInt::get(llvm::Type::getInt32Ty(ctx), 0);
        llvm::Value *ptr = b.CreateInBoundsGEP(
            gv->getType(),
            gv,
            {zero, zero},
            "str_ptr"
        );
        return ptr;
    }

    if (const auto *num = dynamic_cast<const NumberLiteral *>(e)) {
        llvm::LLVMContext &ctx = m.getContext();
        std::string val = num->value;
        
        // Check if it's a floating-point number (contains . or e/E or has f/F suffix)
        bool isFloat = (val.find('.') != std::string::npos) || 
                       (val.find('e') != std::string::npos) || 
                       (val.find('E') != std::string::npos) ||
                       (val.back() == 'f' || val.back() == 'F');
        
        if (isFloat) {
            // Remove suffix if present
            if (val.back() == 'f' || val.back() == 'F') {
                val.pop_back();
                // f32
                double fval = std::stod(val);
                return llvm::ConstantFP::get(llvm::Type::getFloatTy(ctx), fval);
            } else {
                // f64 (default for floating-point)
                double fval = std::stod(val);
                return llvm::ConstantFP::get(llvm::Type::getDoubleTy(ctx), fval);
            }
        } else {
            // Integer
            // Check for unsigned suffix
            bool isUnsigned = (val.back() == 'u' || val.back() == 'U');
            if (isUnsigned) {
                val.pop_back();
            }
            
            // Parse as 32-bit integer by default
            if (isUnsigned) {
                uint32_t ival = static_cast<uint32_t>(std::stoul(val));
                return llvm::ConstantInt::get(llvm::Type::getInt32Ty(ctx), ival);
            } else {
                int32_t ival = static_cast<int32_t>(std::stol(val));
                return llvm::ConstantInt::get(llvm::Type::getInt32Ty(ctx), ival, true);
            }
        }
    }

    if (const auto *nullLit = dynamic_cast<const NullLiteral *>(e)) {
        llvm::LLVMContext &ctx = m.getContext();
        return llvm::ConstantPointerNull::get(llvm::PointerType::getUnqual(ctx));
    }

    if (const auto *ident = dynamic_cast<const Identifier *>(e)) {
        // Look up in symbol table
        auto it = prog.symbolTable.find(ident->name);
        if (it != prog.symbolTable.end()) {
            return b.CreateLoad(it->second->getAllocatedType(), it->second, ident->name);
        }
        return nullptr;
    }

    if (const auto *addrOf = dynamic_cast<const AddressOfExpr *>(e)) {
        // For MVP, only support address-of on identifiers (variables)
        if (const auto *ident = dynamic_cast<const Identifier *>(addrOf->operand.get())) {
            auto it = prog.symbolTable.find(ident->name);
            if (it != prog.symbolTable.end()) {
                return it->second;
            }
        }
        return nullptr;
    }

    if (const auto *unary = dynamic_cast<const UnaryExpr *>(e)) {
        llvm::Value *operand = emitExpr(b, unary->operand.get(), m, prog);
        if (!operand) return nullptr;

        switch (unary->op) {
            case UnaryExpr::Op::Neg: {
                // Negation: 0 - operand
                if (operand->getType()->isFloatingPointTy()) {
                    return b.CreateFNeg(operand, "fnegtmp");
                } else {
                    llvm::Value *zero = llvm::ConstantInt::get(operand->getType(), 0);
                    return b.CreateSub(zero, operand, "negtmp");
                }
            }
            case UnaryExpr::Op::Not: {
                // Logical NOT
                if (!operand->getType()->isIntegerTy(1)) {
                    // Convert to boolean first
                    operand = b.CreateICmpNE(operand, llvm::Constant::getNullValue(operand->getType()), "tobool");
                }
                return b.CreateXor(operand, llvm::ConstantInt::get(operand->getType(), 1), "nottmp");
            }
            default:
                return nullptr;
        }
    }

    if (const auto *bin = dynamic_cast<const BinaryExpr *>(e)) {
        llvm::Value *L = emitExpr(b, bin->lhs.get(), m, prog);
        llvm::Value *R = emitExpr(b, bin->rhs.get(), m, prog);
        if (!L || !R) return nullptr;

        bool isFloatOp = L->getType()->isFloatingPointTy() || R->getType()->isFloatingPointTy();

        // Type promotion: if one is float, convert both to float
        if (isFloatOp) {
            if (L->getType()->isIntegerTy()) {
                L = b.CreateSIToFP(L, llvm::Type::getDoubleTy(m.getContext()), "itofL");
            } else if (L->getType()->isFloatTy()) {
                L = b.CreateFPExt(L, llvm::Type::getDoubleTy(m.getContext()), "f32tof64L");
            }
            
            if (R->getType()->isIntegerTy()) {
                R = b.CreateSIToFP(R, llvm::Type::getDoubleTy(m.getContext()), "itofR");
            } else if (R->getType()->isFloatTy()) {
                R = b.CreateFPExt(R, llvm::Type::getDoubleTy(m.getContext()), "f32tof64R");
            }
        } else {
            // Integer operations: ensure both operands have the same type
            if (L->getType() != R->getType()) {
                if (L->getType()->getIntegerBitWidth() < R->getType()->getIntegerBitWidth()) {
                    L = b.CreateZExt(L, R->getType(), "zextL");
                } else if (R->getType()->getIntegerBitWidth() < L->getType()->getIntegerBitWidth()) {
                    R = b.CreateZExt(R, L->getType(), "zextR");
                }
            }
        }

        if (isFloatOp) {
            // Floating-point operations
            switch (bin->op) {
                case BinaryExpr::Op::Add: return b.CreateFAdd(L, R, "faddtmp");
                case BinaryExpr::Op::Sub: return b.CreateFSub(L, R, "fsubtmp");
                case BinaryExpr::Op::Mul: return b.CreateFMul(L, R, "fmultmp");
                case BinaryExpr::Op::Div: return b.CreateFDiv(L, R, "fdivtmp");
                case BinaryExpr::Op::Eq: return b.CreateFCmpOEQ(L, R, "feqtmp");
                case BinaryExpr::Op::Ne: return b.CreateFCmpONE(L, R, "fnetmp");
                case BinaryExpr::Op::Lt: return b.CreateFCmpOLT(L, R, "flttmp");
                case BinaryExpr::Op::Gt: return b.CreateFCmpOGT(L, R, "fgttmp");
                case BinaryExpr::Op::Le: return b.CreateFCmpOLE(L, R, "fletmp");
                case BinaryExpr::Op::Ge: return b.CreateFCmpOGE(L, R, "fgetmp");
                case BinaryExpr::Op::And: {
                    llvm::Value *zeroF = llvm::ConstantFP::get(L->getType(), 0.0);
                    L = b.CreateFCmpONE(L, zeroF, "andL");
                    R = b.CreateFCmpONE(R, zeroF, "andR");
                    return b.CreateAnd(L, R, "andtmp");
                }
                case BinaryExpr::Op::Or: {
                    llvm::Value *zeroF = llvm::ConstantFP::get(L->getType(), 0.0);
                    L = b.CreateFCmpONE(L, zeroF, "orL");
                    R = b.CreateFCmpONE(R, zeroF, "orR");
                    return b.CreateOr(L, R, "ortmp");
                }
                default: return nullptr;
            }
        } else {
            // Integer operations
            switch (bin->op) {
                case BinaryExpr::Op::Add: return b.CreateAdd(L, R, "addtmp");
                case BinaryExpr::Op::Sub: return b.CreateSub(L, R, "subtmp");
                case BinaryExpr::Op::Mul: return b.CreateMul(L, R, "multmp");
                case BinaryExpr::Op::Div: return b.CreateSDiv(L, R, "divtmp");
                case BinaryExpr::Op::Eq: return b.CreateICmpEQ(L, R, "eqtmp");
                case BinaryExpr::Op::Ne: return b.CreateICmpNE(L, R, "netmp");
                case BinaryExpr::Op::Lt: return b.CreateICmpSLT(L, R, "lttmp");
                case BinaryExpr::Op::Gt: return b.CreateICmpSGT(L, R, "gttmp");
                case BinaryExpr::Op::Le: return b.CreateICmpSLE(L, R, "letmp");
                case BinaryExpr::Op::Ge: return b.CreateICmpSGE(L, R, "getmp");
                case BinaryExpr::Op::And: {
                    if (!L->getType()->isIntegerTy(1)) L = b.CreateICmpNE(L, llvm::Constant::getNullValue(L->getType()), "andL");
                    if (!R->getType()->isIntegerTy(1)) R = b.CreateICmpNE(R, llvm::Constant::getNullValue(R->getType()), "andR");
                    return b.CreateAnd(L, R, "andtmp");
                }
                case BinaryExpr::Op::Or: {
                    if (!L->getType()->isIntegerTy(1)) L = b.CreateICmpNE(L, llvm::Constant::getNullValue(L->getType()), "orL");
                    if (!R->getType()->isIntegerTy(1)) R = b.CreateICmpNE(R, llvm::Constant::getNullValue(R->getType()), "orR");
                    return b.CreateOr(L, R, "ortmp");
                }
                default: return nullptr;
            }
        }
    }

    if (const auto *memberExpr = dynamic_cast<const MemberExpr *>(e)) {
        // Get the base object (should be an identifier to a struct variable)
        if (const auto *ident = dynamic_cast<const Identifier *>(memberExpr->object.get())) {
            auto it = prog.symbolTable.find(ident->name);
            if (it != prog.symbolTable.end()) {
                llvm::AllocaInst *structPtr = it->second;
                llvm::StructType *structTy = llvm::dyn_cast<llvm::StructType>(structPtr->getAllocatedType());
                
                if (structTy) {
                    // Find field index
                    std::string structName = structTy->getName().str();
                    auto structIt = std::find_if(prog.structs.begin(), prog.structs.end(),
                        [&structName](const StructDef &s) { return s.name == structName; });
                    
                    if (structIt != prog.structs.end()) {
                        int fieldIdx = -1;
                        for (size_t i = 0; i < structIt->fields.size(); ++i) {
                            if (structIt->fields[i].name == memberExpr->member) {
                                fieldIdx = static_cast<int>(i);
                                break;
                            }
                        }
                        
                        if (fieldIdx >= 0) {
                            llvm::Value *zero = llvm::ConstantInt::get(llvm::Type::getInt32Ty(m.getContext()), 0);
                            llvm::Value *idx = llvm::ConstantInt::get(llvm::Type::getInt32Ty(m.getContext()), fieldIdx);
                            llvm::Value *fieldPtr = b.CreateInBoundsGEP(structTy, structPtr, {zero, idx}, memberExpr->member + "_ptr");
                            return b.CreateLoad(structTy->getElementType(fieldIdx), fieldPtr, memberExpr->member);
                        }
                    }
                }
            }
        }
        return nullptr;
    }

    if (const auto *indexExpr = dynamic_cast<const IndexExpr *>(e)) {
        // Check if base is an identifier (array variable)
        if (const auto *baseIdent = dynamic_cast<const Identifier *>(indexExpr->base.get())) {
            auto it = prog.symbolTable.find(baseIdent->name);
            if (it != prog.symbolTable.end()) {
                llvm::AllocaInst *alloca = it->second;
                llvm::Type *allocatedType = alloca->getAllocatedType();
                
                llvm::Value *idx = emitExpr(b, indexExpr->index.get(), m, prog);
                if (!idx) return nullptr;
                
                if (allocatedType->isArrayTy()) {
                    // Array access: arr[i]
                    llvm::Value *zero = llvm::ConstantInt::get(llvm::Type::getInt32Ty(m.getContext()), 0);
                    llvm::Value *elemPtr = b.CreateInBoundsGEP(allocatedType, alloca, {zero, idx}, "elemptr");
                    llvm::Type *elemType = allocatedType->getArrayElementType();
                    return b.CreateLoad(elemType, elemPtr, "elemval");
                } else if (allocatedType->isPointerTy() || allocatedType == llvm::PointerType::getUnqual(m.getContext())) {
                    // Pointer access: ptr[i]
                    llvm::Value *base = b.CreateLoad(allocatedType, alloca, baseIdent->name);
                    llvm::Type *elemTy = llvm::Type::getInt8Ty(m.getContext());
                    llvm::Value *ptr = b.CreateInBoundsGEP(elemTy, base, idx, "idxptr");
                    return b.CreateLoad(elemTy, ptr, "idxval");
                }
            }
        }
        
        // Fallback: old behavior for pointers
        llvm::Value *base = emitExpr(b, indexExpr->base.get(), m, prog);
        llvm::Value *idx = emitExpr(b, indexExpr->index.get(), m, prog);
        if (base && idx) {
            llvm::Type *elemTy = llvm::Type::getInt8Ty(m.getContext());
            llvm::Value *ptr = b.CreateInBoundsGEP(elemTy, base, idx, "idxptr");
            return b.CreateLoad(elemTy, ptr, "idxval");
        }
        return nullptr;
    }

    if (const auto *call = dynamic_cast<const CallExpr *>(e)) {
        llvm::LLVMContext &ctx = m.getContext();
        
        // Handle builtin string functions - implement directly without C runtime
        if (call->callee == "string_length") {
            // string_length(str: ptr<i8>): i32
            // Implement strlen inline
            if (call->args.size() != 1) return nullptr;
            llvm::Value *str = emitExpr(b, call->args[0].get(), m, prog);
            if (!str) return nullptr;
            
            llvm::Type *i8Ty = llvm::Type::getInt8Ty(ctx);
            llvm::Type *i32Ty = llvm::Type::getInt32Ty(ctx);
            
            // Create strlen implementation inline
            llvm::Function *currentFn = b.GetInsertBlock()->getParent();
            llvm::BasicBlock *loopBB = llvm::BasicBlock::Create(ctx, "strlen_loop", currentFn);
            llvm::BasicBlock *doneBB = llvm::BasicBlock::Create(ctx, "strlen_done", currentFn);
            
            llvm::Value *lenVar = b.CreateAlloca(i32Ty, nullptr, "len");
            b.CreateStore(llvm::ConstantInt::get(i32Ty, 0), lenVar);
            b.CreateBr(loopBB);
            
            b.SetInsertPoint(loopBB);
            llvm::Value *len = b.CreateLoad(i32Ty, lenVar, "len_val");
            llvm::Value *ptr = b.CreateInBoundsGEP(i8Ty, str, len, "char_ptr");
            llvm::Value *ch = b.CreateLoad(i8Ty, ptr, "char");
            llvm::Value *isZero = b.CreateICmpEQ(ch, llvm::ConstantInt::get(i8Ty, 0), "is_zero");
            
            llvm::BasicBlock *incrBB = llvm::BasicBlock::Create(ctx, "strlen_incr", currentFn);
            b.CreateCondBr(isZero, doneBB, incrBB);
            
            b.SetInsertPoint(incrBB);
            llvm::Value *newLen = b.CreateAdd(len, llvm::ConstantInt::get(i32Ty, 1), "new_len");
            b.CreateStore(newLen, lenVar);
            b.CreateBr(loopBB);
            
            b.SetInsertPoint(doneBB);
            return b.CreateLoad(i32Ty, lenVar, "final_len");
        }
        
        if (call->callee == "string_char_at") {
            // string_char_at(str: ptr<i8>, index: i32): i8
            if (call->args.size() != 2) return nullptr;
            llvm::Value *str = emitExpr(b, call->args[0].get(), m, prog);
            llvm::Value *idx = emitExpr(b, call->args[1].get(), m, prog);
            if (!str || !idx) return nullptr;
            
            llvm::Type *i8Ty = llvm::Type::getInt8Ty(ctx);
            llvm::Value *ptr = b.CreateInBoundsGEP(i8Ty, str, idx, "charptr");
            return b.CreateLoad(i8Ty, ptr, "char");
        }
        
        if (call->callee == "string_equals") {
            // string_equals(s1: ptr<i8>, s2: ptr<i8>): bool
            // Implement strcmp inline - simplified version
            if (call->args.size() != 2) return nullptr;
            llvm::Value *s1 = emitExpr(b, call->args[0].get(), m, prog);
            llvm::Value *s2 = emitExpr(b, call->args[1].get(), m, prog);
            if (!s1 || !s2) return nullptr;
            
            llvm::Type *i8Ty = llvm::Type::getInt8Ty(ctx);
            llvm::Type *i32Ty = llvm::Type::getInt32Ty(ctx);
            llvm::Type *boolTy = llvm::Type::getInt1Ty(ctx);
            
            llvm::Function *currentFn = b.GetInsertBlock()->getParent();
            llvm::BasicBlock *loopBB = llvm::BasicBlock::Create(ctx, "strcmp_loop", currentFn);
            llvm::BasicBlock *notEqualBB = llvm::BasicBlock::Create(ctx, "strcmp_ne", currentFn);
            llvm::BasicBlock *equalBB = llvm::BasicBlock::Create(ctx, "strcmp_eq", currentFn);
            llvm::BasicBlock *doneBB = llvm::BasicBlock::Create(ctx, "strcmp_done", currentFn);
            
            llvm::Value *idxVar = b.CreateAlloca(i32Ty, nullptr, "idx");
            b.CreateStore(llvm::ConstantInt::get(i32Ty, 0), idxVar);
            b.CreateBr(loopBB);
            
            b.SetInsertPoint(loopBB);
            llvm::Value *idx = b.CreateLoad(i32Ty, idxVar, "idx_val");
            llvm::Value *ptr1 = b.CreateInBoundsGEP(i8Ty, s1, idx, "ptr1");
            llvm::Value *ptr2 = b.CreateInBoundsGEP(i8Ty, s2, idx, "ptr2");
            llvm::Value *ch1 = b.CreateLoad(i8Ty, ptr1, "ch1");
            llvm::Value *ch2 = b.CreateLoad(i8Ty, ptr2, "ch2");
            
            llvm::Value *charsEqual = b.CreateICmpEQ(ch1, ch2, "chars_eq");
            llvm::Value *ch1Zero = b.CreateICmpEQ(ch1, llvm::ConstantInt::get(i8Ty, 0), "ch1_zero");
            
            // If chars not equal, goto notEqualBB
            llvm::BasicBlock *checkZeroBB = llvm::BasicBlock::Create(ctx, "check_zero", currentFn);
            b.CreateCondBr(charsEqual, checkZeroBB, notEqualBB);
            
            // If ch1 is zero (end of string), strings are equal
            b.SetInsertPoint(checkZeroBB);
            llvm::BasicBlock *incrBB = llvm::BasicBlock::Create(ctx, "strcmp_incr", currentFn);
            b.CreateCondBr(ch1Zero, equalBB, incrBB);
            
            // Increment and continue
            b.SetInsertPoint(incrBB);
            llvm::Value *newIdx = b.CreateAdd(idx, llvm::ConstantInt::get(i32Ty, 1), "new_idx");
            b.CreateStore(newIdx, idxVar);
            b.CreateBr(loopBB);
            
            // Not equal path
            b.SetInsertPoint(notEqualBB);
            b.CreateBr(doneBB);
            
            // Equal path
            b.SetInsertPoint(equalBB);
            b.CreateBr(doneBB);
            
            // Done - create PHI node
            b.SetInsertPoint(doneBB);
            llvm::PHINode *result = b.CreatePHI(boolTy, 2, "strcmp_result");
            result->addIncoming(llvm::ConstantInt::getTrue(ctx), equalBB);
            result->addIncoming(llvm::ConstantInt::getFalse(ctx), notEqualBB);
            return result;
        }
        
        if (call->callee == "string_concat") {
            // string_concat(s1: ptr<i8>, s2: ptr<i8>): ptr<i8>
            // Allocate buffer and copy strings inline
            if (call->args.size() != 2) return nullptr;
            llvm::Value *s1 = emitExpr(b, call->args[0].get(), m, prog);
            llvm::Value *s2 = emitExpr(b, call->args[1].get(), m, prog);
            if (!s1 || !s2) return nullptr;
            
            llvm::Type *i8Ty = llvm::Type::getInt8Ty(ctx);
            llvm::Type *i32Ty = llvm::Type::getInt32Ty(ctx);
            
            // Allocate buffer: i8[1000]
            llvm::Type *bufferTy = llvm::ArrayType::get(i8Ty, 1000);
            llvm::Value *buffer = b.CreateAlloca(bufferTy, nullptr, "concat_buffer");
            llvm::Value *zero = llvm::ConstantInt::get(i32Ty, 0);
            llvm::Value *bufferPtr = b.CreateInBoundsGEP(bufferTy, buffer, {zero, zero}, "buffer_ptr");
            
            llvm::Function *currentFn = b.GetInsertBlock()->getParent();
            
            // Copy s1 to buffer
            llvm::BasicBlock *copy1LoopBB = llvm::BasicBlock::Create(ctx, "copy1_loop", currentFn);
            llvm::BasicBlock *copy1DoneBB = llvm::BasicBlock::Create(ctx, "copy1_done", currentFn);
            
            llvm::Value *idx1Var = b.CreateAlloca(i32Ty, nullptr, "idx1");
            b.CreateStore(zero, idx1Var);
            b.CreateBr(copy1LoopBB);
            
            b.SetInsertPoint(copy1LoopBB);
            llvm::Value *idx1 = b.CreateLoad(i32Ty, idx1Var, "idx1_val");
            llvm::Value *srcPtr1 = b.CreateInBoundsGEP(i8Ty, s1, idx1, "src1_ptr");
            llvm::Value *ch1 = b.CreateLoad(i8Ty, srcPtr1, "ch1");
            llvm::Value *dstPtr1 = b.CreateInBoundsGEP(i8Ty, bufferPtr, idx1, "dst1_ptr");
            b.CreateStore(ch1, dstPtr1);
            llvm::Value *isZero1 = b.CreateICmpEQ(ch1, llvm::ConstantInt::get(i8Ty, 0), "is_zero1");
            
            llvm::BasicBlock *incr1BB = llvm::BasicBlock::Create(ctx, "copy1_incr", currentFn);
            b.CreateCondBr(isZero1, copy1DoneBB, incr1BB);
            
            b.SetInsertPoint(incr1BB);
            llvm::Value *newIdx1 = b.CreateAdd(idx1, llvm::ConstantInt::get(i32Ty, 1), "new_idx1");
            b.CreateStore(newIdx1, idx1Var);
            b.CreateBr(copy1LoopBB);
            
            b.SetInsertPoint(copy1DoneBB);
            llvm::Value *len1 = b.CreateLoad(i32Ty, idx1Var, "len1");
            
            // Copy s2 to buffer starting at len1
            llvm::BasicBlock *copy2LoopBB = llvm::BasicBlock::Create(ctx, "copy2_loop", currentFn);
            llvm::BasicBlock *copy2DoneBB = llvm::BasicBlock::Create(ctx, "copy2_done", currentFn);
            
            llvm::Value *idx2Var = b.CreateAlloca(i32Ty, nullptr, "idx2");
            b.CreateStore(zero, idx2Var);
            b.CreateBr(copy2LoopBB);
            
            b.SetInsertPoint(copy2LoopBB);
            llvm::Value *idx2 = b.CreateLoad(i32Ty, idx2Var, "idx2_val");
            llvm::Value *srcPtr2 = b.CreateInBoundsGEP(i8Ty, s2, idx2, "src2_ptr");
            llvm::Value *ch2 = b.CreateLoad(i8Ty, srcPtr2, "ch2");
            llvm::Value *dstIdx = b.CreateAdd(len1, idx2, "dst_idx");
            llvm::Value *dstPtr2 = b.CreateInBoundsGEP(i8Ty, bufferPtr, dstIdx, "dst2_ptr");
            b.CreateStore(ch2, dstPtr2);
            llvm::Value *isZero2 = b.CreateICmpEQ(ch2, llvm::ConstantInt::get(i8Ty, 0), "is_zero2");
            
            llvm::BasicBlock *incr2BB = llvm::BasicBlock::Create(ctx, "copy2_incr", currentFn);
            b.CreateCondBr(isZero2, copy2DoneBB, incr2BB);
            
            b.SetInsertPoint(incr2BB);
            llvm::Value *newIdx2 = b.CreateAdd(idx2, llvm::ConstantInt::get(i32Ty, 1), "new_idx2");
            b.CreateStore(newIdx2, idx2Var);
            b.CreateBr(copy2LoopBB);
            
            b.SetInsertPoint(copy2DoneBB);
            return bufferPtr;
        }
        
        // Regular function call
        // Use getFunction to get already-declared functions (including extern functions)
        llvm::Function *callee = m.getFunction(call->callee);
        if (!callee) {
            // Function not found - this could be an error or missing declaration
            Diag::error(0, "function '" + call->callee + "' not found");
            return nullptr;
        }

        std::vector<llvm::Value *> args;
        for (size_t i = 0; i < call->args.size(); ++i) {
            const auto *argExpr = call->args[i].get();
            
            // Special handling for arrays: pass pointer to first element instead of loading
            if (const auto *ident = dynamic_cast<const Identifier *>(argExpr)) {
                auto it = prog.symbolTable.find(ident->name);
                if (it != prog.symbolTable.end()) {
                    llvm::AllocaInst *alloca = it->second;
                    llvm::Type *allocatedType = alloca->getAllocatedType();
                    
                    // If it's an array, pass pointer to first element
                    if (allocatedType->isArrayTy()) {
                        llvm::Value *zero = llvm::ConstantInt::get(llvm::Type::getInt32Ty(m.getContext()), 0);
                        llvm::Value *arrayPtr = b.CreateInBoundsGEP(
                            allocatedType,
                            alloca,
                            {zero, zero},
                            ident->name + "_ptr"
                        );
                        args.push_back(arrayPtr);
                        continue;
                    }
                }
            }
            
            // Normal case: emit expression and get value
            llvm::Value *argVal = emitExpr(b, argExpr, m, prog);
            if (!argVal) {
                return nullptr;
            }
            args.push_back(argVal);
        }

        return b.CreateCall(callee, args);
    }

    if (const auto *objLit = dynamic_cast<const ObjectLiteral *>(e)) {
        // Object literal initialization: { field: value, ... }
        // We need to know the type from context (from LetStmt)
        // For now, we'll create a temporary struct on stack and initialize fields
        
        // This will be handled in LetStmt codegen where we have type information
        // For now, return nullptr as object literals must be used in variable declarations
        return nullptr;
    }

    return nullptr;
}

static void emitStmt(llvm::IRBuilder<> &b, const Stmt *stmt, llvm::Module &m, const Program &prog, llvm::Function *llvmFn, int &strIndex) {
    llvm::LLVMContext &ctx = m.getContext();
    llvm::Type *i32Ty = llvm::Type::getInt32Ty(ctx);
    llvm::FunctionCallee logFn = getConsoleLog(m);
    
    // In buildModule, retTy is known. Here we might need it for return statements.
    llvm::Type *retTy = llvmFn->getReturnType();

    if (const auto *logStmt = dynamic_cast<const LogStmt *>(stmt)) {
        std::string gvName = "__tsn_str_" + std::to_string(strIndex++);
        llvm::Constant *gv = makeStringGlobal(m, logStmt->message, gvName);
        llvm::Value *zero = llvm::ConstantInt::get(i32Ty, 0);
        llvm::Value *ptr = b.CreateInBoundsGEP(gv->getType(), gv, {zero, zero}, "str_ptr");
        llvm::Value *len = llvm::ConstantInt::get(i32Ty, static_cast<uint32_t>(logStmt->message.size()));
        b.CreateCall(logFn, {ptr, len});
    } else if (const auto *exprStmt = dynamic_cast<const ExprStmt *>(stmt)) {
        emitExpr(b, exprStmt->expr.get(), m, prog);
    } else if (const auto *letStmt = dynamic_cast<const LetStmt *>(stmt)) {
        if (letStmt->init) {
            // Check if init is an object literal
            if (const auto *objLit = dynamic_cast<const ObjectLiteral *>(letStmt->init.get())) {
                // Object literal initialization: let tok: Token = { kind: 1, pos: 0 };
                if (!letStmt->hasType) {
                    // Need type annotation for object literals
                    return;
                }
                
                // Get the struct type
                llvm::Type *structType = lowerType(ctx, letStmt->type, prog.structTypes);
                if (!structType || !structType->isStructTy()) {
                    return;
                }
                
                // Create alloca for the struct
                llvm::AllocaInst *alloca = b.CreateAlloca(structType, nullptr, letStmt->name);
                const_cast<Program &>(prog).symbolTable[letStmt->name] = alloca;
                
                // Find struct definition to get field order
                const StructDef *structDef = nullptr;
                for (const auto &sd : prog.structs) {
                    if (sd.name == letStmt->type.structName) {
                        structDef = &sd;
                        break;
                    }
                }
                
                if (!structDef) {
                    return;
                }
                
                // Initialize each field
                for (size_t i = 0; i < objLit->fieldNames.size(); ++i) {
                    const std::string &fieldName = objLit->fieldNames[i];
                    
                    // Find field index in struct definition
                    int fieldIdx = -1;
                    for (size_t j = 0; j < structDef->fields.size(); ++j) {
                        if (structDef->fields[j].name == fieldName) {
                            fieldIdx = static_cast<int>(j);
                            break;
                        }
                    }
                    
                    if (fieldIdx < 0) {
                        continue; // Field not found
                    }
                    
                    // Emit the field value
                    llvm::Value *fieldVal = emitExpr(b, objLit->fieldValues[i].get(), m, prog);
                    if (!fieldVal) {
                        continue;
                    }
                    
                    // Get pointer to field using GEP
                    llvm::Value *zero = llvm::ConstantInt::get(i32Ty, 0);
                    llvm::Value *idx = llvm::ConstantInt::get(i32Ty, fieldIdx);
                    llvm::Value *fieldPtr = b.CreateInBoundsGEP(structType, alloca, {zero, idx});
                    
                    // Store the value
                    b.CreateStore(fieldVal, fieldPtr);
                }
            } else {
                // Regular initialization
                llvm::Value *initVal = emitExpr(b, letStmt->init.get(), m, prog);
                if (initVal) {
                    llvm::AllocaInst *alloca = b.CreateAlloca(initVal->getType(), nullptr, letStmt->name);
                    b.CreateStore(initVal, alloca);
                    const_cast<Program &>(prog).symbolTable[letStmt->name] = alloca;
                }
            }
        } else if (letStmt->hasType) {
            // Declaration without initialization (use type annotation)
            llvm::Type *varType = lowerType(ctx, letStmt->type, prog.structTypes);
            llvm::AllocaInst *alloca = b.CreateAlloca(varType, nullptr, letStmt->name);
            const_cast<Program &>(prog).symbolTable[letStmt->name] = alloca;
        }
    } else if (const auto *assignStmt = dynamic_cast<const AssignStmt *>(stmt)) {
        llvm::Value *val = emitExpr(b, assignStmt->value.get(), m, prog);
        if (val) {
            auto it = prog.symbolTable.find(assignStmt->name);
            if (it != prog.symbolTable.end()) {
                b.CreateStore(val, it->second);
            }
        }
    } else if (const auto *indexedAssign = dynamic_cast<const IndexedAssignStmt *>(stmt)) {
        // Handle arr[i] = value
        if (const auto *indexExpr = dynamic_cast<const IndexExpr *>(indexedAssign->target.get())) {
            if (const auto *baseIdent = dynamic_cast<const Identifier *>(indexExpr->base.get())) {
                auto it = prog.symbolTable.find(baseIdent->name);
                if (it != prog.symbolTable.end()) {
                    llvm::Value *idx = emitExpr(b, indexExpr->index.get(), m, prog);
                    llvm::Value *val = emitExpr(b, indexedAssign->value.get(), m, prog);
                    
                    if (idx && val) {
                        llvm::AllocaInst *arrayAlloca = it->second;
                        llvm::Type *arrayType = arrayAlloca->getAllocatedType();
                        
                        if (arrayType->isArrayTy()) {
                            llvm::Value *zero = llvm::ConstantInt::get(llvm::Type::getInt32Ty(ctx), 0);
                            llvm::Value *elemPtr = b.CreateInBoundsGEP(arrayType, arrayAlloca, {zero, idx}, "elemptr");
                            b.CreateStore(val, elemPtr);
                        }
                    }
                }
            }
        }
    } else if (const auto *memberAssign = dynamic_cast<const MemberAssignStmt *>(stmt)) {
        // Handle obj.field = value
        if (const auto *objIdent = dynamic_cast<const Identifier *>(memberAssign->object.get())) {
            auto it = prog.symbolTable.find(objIdent->name);
            if (it != prog.symbolTable.end()) {
                llvm::AllocaInst *structAlloca = it->second;
                llvm::Type *structType = structAlloca->getAllocatedType();
                
                if (structType->isStructTy()) {
                    // Find the struct definition to get field index
                    llvm::StructType *st = llvm::cast<llvm::StructType>(structType);
                    std::string structName = st->getName().str();
                    
                    // Find struct definition
                    const StructDef *structDef = nullptr;
                    for (const auto &sd : prog.structs) {
                        if (sd.name == structName) {
                            structDef = &sd;
                            break;
                        }
                    }
                    
                    if (structDef) {
                        // Find field index
                        int fieldIdx = -1;
                        for (size_t i = 0; i < structDef->fields.size(); ++i) {
                            if (structDef->fields[i].name == memberAssign->member) {
                                fieldIdx = static_cast<int>(i);
                                break;
                            }
                        }
                        
                        if (fieldIdx >= 0) {
                            llvm::Value *val = emitExpr(b, memberAssign->value.get(), m, prog);
                            if (val) {
                                llvm::Value *zero = llvm::ConstantInt::get(i32Ty, 0);
                                llvm::Value *idx = llvm::ConstantInt::get(i32Ty, fieldIdx);
                                llvm::Value *fieldPtr = b.CreateInBoundsGEP(structType, structAlloca, {zero, idx});
                                b.CreateStore(val, fieldPtr);
                            }
                        }
                    }
                }
            }
        }
    } else if (const auto *retStmt = dynamic_cast<const ReturnStmt *>(stmt)) {
        if (retStmt->value) {
            llvm::Value *rv = emitExpr(b, retStmt->value.get(), m, prog);
            b.CreateRet(rv ? rv : llvm::Constant::getNullValue(retTy));
        } else {
            if (retTy->isVoidTy()) b.CreateRetVoid();
            else b.CreateRet(llvm::Constant::getNullValue(retTy));
        }
    } else if (const auto *ifStmt = dynamic_cast<const IfStmt *>(stmt)) {
        llvm::Value *cond = emitExpr(b, ifStmt->cond.get(), m, prog);
        if (cond) {
            if (!cond->getType()->isIntegerTy(1)) {
                cond = b.CreateICmpNE(cond, llvm::Constant::getNullValue(cond->getType()), "ifcond");
            }
            llvm::BasicBlock *thenBB = llvm::BasicBlock::Create(ctx, "then", llvmFn);
            llvm::BasicBlock *elseBB = llvm::BasicBlock::Create(ctx, "else", llvmFn);
            llvm::BasicBlock *mergeBB = llvm::BasicBlock::Create(ctx, "ifcont", llvmFn);

            b.CreateCondBr(cond, thenBB, elseBB);

            b.SetInsertPoint(thenBB);
            for (const auto &s : ifStmt->thenBody) emitStmt(b, s.get(), m, prog, llvmFn, strIndex);
            if (!b.GetInsertBlock()->getTerminator()) b.CreateBr(mergeBB);

            b.SetInsertPoint(elseBB);
            for (const auto &s : ifStmt->elseBody) emitStmt(b, s.get(), m, prog, llvmFn, strIndex);
            if (!b.GetInsertBlock()->getTerminator()) b.CreateBr(mergeBB);

            b.SetInsertPoint(mergeBB);
        }
    } else if (const auto *whileStmt = dynamic_cast<const WhileStmt *>(stmt)) {
        llvm::BasicBlock *condBB = llvm::BasicBlock::Create(ctx, "while.cond", llvmFn);
        llvm::BasicBlock *bodyBB = llvm::BasicBlock::Create(ctx, "while.body", llvmFn);
        llvm::BasicBlock *endBB = llvm::BasicBlock::Create(ctx, "while.end", llvmFn);

        b.CreateBr(condBB);
        b.SetInsertPoint(condBB);

        llvm::Value *cond = emitExpr(b, whileStmt->cond.get(), m, prog);
        if (cond) {
            if (!cond->getType()->isIntegerTy(1)) {
                cond = b.CreateICmpNE(cond, llvm::Constant::getNullValue(cond->getType()), "whilecond");
            }
            b.CreateCondBr(cond, bodyBB, endBB);

            b.SetInsertPoint(bodyBB);
            for (const auto &s : whileStmt->body) {
                emitStmt(b, s.get(), m, prog, llvmFn, strIndex);
            }
            if (!b.GetInsertBlock()->getTerminator()) {
                b.CreateBr(condBB);
            }

            b.SetInsertPoint(endBB);
        }
    } else if (const auto *forStmt = dynamic_cast<const ForStmt *>(stmt)) {
        // For loop: for (init; cond; increment) { body }
        // Translates to:
        //   init
        //   br cond
        // cond:
        //   if (cond) br body else br end
        // body:
        //   ...body...
        //   increment
        //   br cond
        // end:
        
        // Emit initialization
        emitStmt(b, forStmt->init.get(), m, prog, llvmFn, strIndex);
        
        llvm::BasicBlock *condBB = llvm::BasicBlock::Create(ctx, "for.cond", llvmFn);
        llvm::BasicBlock *bodyBB = llvm::BasicBlock::Create(ctx, "for.body", llvmFn);
        llvm::BasicBlock *incrBB = llvm::BasicBlock::Create(ctx, "for.incr", llvmFn);
        llvm::BasicBlock *endBB = llvm::BasicBlock::Create(ctx, "for.end", llvmFn);
        
        b.CreateBr(condBB);
        b.SetInsertPoint(condBB);
        
        llvm::Value *cond = emitExpr(b, forStmt->cond.get(), m, prog);
        if (cond) {
            if (!cond->getType()->isIntegerTy(1)) {
                cond = b.CreateICmpNE(cond, llvm::Constant::getNullValue(cond->getType()), "forcond");
            }
            b.CreateCondBr(cond, bodyBB, endBB);
            
            b.SetInsertPoint(bodyBB);
            for (const auto &s : forStmt->body) {
                emitStmt(b, s.get(), m, prog, llvmFn, strIndex);
            }
            if (!b.GetInsertBlock()->getTerminator()) {
                b.CreateBr(incrBB);
            }
            
            b.SetInsertPoint(incrBB);
            emitStmt(b, forStmt->increment.get(), m, prog, llvmFn, strIndex);
            if (!b.GetInsertBlock()->getTerminator()) {
                b.CreateBr(condBB);
            }
            
            b.SetInsertPoint(endBB);
        }
    }
}

static bool buildModule(const Program &prog, const std::string &moduleName, llvm::Module &m) {
    std::cerr << "DEBUG: buildModule started\n";
    llvm::LLVMContext &ctx = m.getContext();
    llvm::IRBuilder<> b(ctx);

    llvm::Type *i32Ty = llvm::Type::getInt32Ty(ctx);
    std::cerr << "DEBUG: Basic types created\n";

    // Create struct types first
    Program &mutableProg = const_cast<Program&>(prog);
    std::cerr << "DEBUG: Creating " << prog.structs.size() << " struct types\n";
    for (const auto &structDef : prog.structs) {
        llvm::StructType *structTy = llvm::StructType::create(ctx, structDef.name);
        mutableProg.structTypes[structDef.name] = structTy;
    }
    std::cerr << "DEBUG: Struct types created\n";

    // Define struct bodies
    for (const auto &structDef : prog.structs) {
        std::vector<llvm::Type*> fieldTypes;
        for (const auto &field : structDef.fields) {
            fieldTypes.push_back(lowerType(ctx, field.type, prog.structTypes));
        }
        mutableProg.structTypes[structDef.name]->setBody(fieldTypes);
    }
    std::cerr << "DEBUG: Struct bodies defined\n";
    std::cerr << "DEBUG: Declaring " << prog.externFns.size() << " extern functions\n";

    for (const auto &fn : prog.externFns) {
        std::cerr << "DEBUG: Declaring extern function: " << fn.name << "\n";
        std::vector<llvm::Type *> params;
        params.reserve(fn.params.size());
        for (const auto &p : fn.params) {
            std::cerr << "DEBUG: Processing param type\n";
            params.push_back(lowerType(ctx, p, prog.structTypes));
        }
        std::cerr << "DEBUG: Processing return type\n";
        llvm::Type *retTy = lowerType(ctx, fn.result, prog.structTypes);
        std::cerr << "DEBUG: Creating function type\n";
        auto *fnTy = llvm::FunctionType::get(retTy, params, false);
        std::cerr << "DEBUG: Inserting function\n";
        m.getOrInsertFunction(fn.name, fnTy);
        std::cerr << "DEBUG: Extern function declared: " << fn.name << "\n";
    }
    std::cerr << "DEBUG: All extern functions declared\n";

    auto *mainTy = llvm::FunctionType::get(i32Ty, {}, false);
    std::cerr << "DEBUG: Main function type created\n";
    llvm::Function *mainFn = llvm::Function::Create(mainTy, llvm::Function::ExternalLinkage, "main", m);
    std::cerr << "DEBUG: Main function created\n";
    llvm::BasicBlock *entry = llvm::BasicBlock::Create(ctx, "entry", mainFn);
    std::cerr << "DEBUG: Entry block created\n";
    b.SetInsertPoint(entry);
    std::cerr << "DEBUG: Insert point set\n";

    if (needsConsole(prog)) {
        std::cerr << "DEBUG: Emitting console runtime\n";
        emitWindowsConsoleRuntime(m, mainFn);
        std::cerr << "DEBUG: Console runtime emitted\n";
    } else {
        std::cerr << "DEBUG: Emitting tsn_start\n";
        // Even if not using console.log, we need a tsn_start for the linker
        llvm::Type *voidTy = llvm::Type::getVoidTy(ctx);
        llvm::FunctionType *startTy = llvm::FunctionType::get(voidTy, {}, false);
        llvm::Function *startFn = llvm::Function::Create(startTy, llvm::Function::ExternalLinkage, "tsn_start", m);
        llvm::BasicBlock *startBB = llvm::BasicBlock::Create(ctx, "entry", startFn);
        llvm::IRBuilder<> startB(startBB);
        
        // Call main and then exit
        llvm::Value *rc = startB.CreateCall(mainFn);
        
        // Define ExitProcess if not already there
        llvm::FunctionCallee exitFn = m.getOrInsertFunction("ExitProcess", llvm::FunctionType::get(voidTy, {i32Ty}, false));
        startB.CreateCall(exitFn, {rc});
        startB.CreateUnreachable();
        std::cerr << "DEBUG: tsn_start emitted\n";
    }
    std::cerr << "DEBUG: Starting user function compilation\n";

    int strIndex = 0;
    std::cerr << "DEBUG: Number of user functions: " << prog.functions.size() << "\n";
    // Emit user-defined functions
    for (const auto &fnDef : prog.functions) {
        std::cerr << "DEBUG: Compiling function: " << fnDef->name << "\n";
        std::vector<llvm::Type *> paramTypes;
        for (const auto &p : fnDef->params) {
            paramTypes.push_back(lowerType(ctx, p.type, prog.structTypes));
        }
        llvm::Type *retTy = lowerType(ctx, fnDef->result, prog.structTypes);
        std::cerr << "DEBUG: Return type created\n";
        llvm::FunctionType *fnTy = llvm::FunctionType::get(retTy, paramTypes, false);
        
        // If user defined main(), rename it to __tsn_user_main to avoid collision with wrapper main
        std::string llvmFnName = (fnDef->name == "main") ? "__tsn_user_main" : fnDef->name;
        llvm::Function *llvmFn = llvm::Function::Create(fnTy, llvm::Function::ExternalLinkage, llvmFnName, m);
        std::cerr << "DEBUG: Function created: " << llvmFnName << "\n";

        llvm::BasicBlock *bb = llvm::BasicBlock::Create(ctx, "entry", llvmFn);
        llvm::IRBuilder<> fBuilder(bb);
        std::cerr << "DEBUG: Basic block created\n";

        for (size_t i = 0; i < fnDef->params.size(); ++i) {
            llvm::Argument *arg = llvmFn->getArg(static_cast<uint32_t>(i));
            llvm::AllocaInst *alloca = fBuilder.CreateAlloca(arg->getType(), nullptr, fnDef->params[i].name);
            fBuilder.CreateStore(arg, alloca);
            const_cast<Program &>(prog).symbolTable[fnDef->params[i].name] = alloca;
        }
        std::cerr << "DEBUG: Parameters set up\n";

        for (const auto &stmtPtr : fnDef->body) {
            std::cerr << "DEBUG: Emitting statement\n";
            emitStmt(fBuilder, stmtPtr.get(), m, prog, llvmFn, strIndex);
        }
        std::cerr << "DEBUG: Statements emitted\n";
        if (!fBuilder.GetInsertBlock()->getTerminator()) {
            if (fnDef->result.kind == TypeName::Kind::Void) {
                fBuilder.CreateRetVoid();
            } else if (fnDef->name == "main" && fnDef->result.kind == TypeName::Kind::Void) {
                // For main(): void, auto return 0 (like Zig, Rust, Go)
                fBuilder.CreateRetVoid();
            } else {
                fBuilder.CreateRet(llvm::Constant::getNullValue(retTy));
            }
        }
    }

    strIndex = 0;
    
    // Check if user defined a main() function
    bool hasUserMain = false;
    bool userMainReturnsVoid = false;
    for (const auto &fnDef : prog.functions) {
        if (fnDef->name == "main") {
            hasUserMain = true;
            userMainReturnsVoid = (fnDef->result.kind == TypeName::Kind::Void);
            break;
        }
    }
    
    // If user defined main(), call it from wrapper main
    if (hasUserMain) {
        llvm::Function *userMain = m.getFunction("__tsn_user_main");
        if (userMain) {
            if (userMainReturnsVoid) {
                b.CreateCall(userMain);
                b.CreateRet(llvm::ConstantInt::get(i32Ty, 0));
            } else {
                llvm::Value *rc = b.CreateCall(userMain);
                b.CreateRet(rc);
            }
        }
    } else {
        // No user main, emit top-level statements
        for (const auto &stmtPtr : prog.stmts) {
            emitStmt(b, stmtPtr.get(), m, prog, mainFn, strIndex);
        }
        
        if (!b.GetInsertBlock()->getTerminator()) {
            b.CreateRet(llvm::ConstantInt::get(i32Ty, 0));
        }
    }

    return true;
}

static std::vector<std::string> collectLinkLibs(const Program &prog) {
    std::vector<std::string> libs;
    auto add = [&](const std::string &lib) {
        if (lib.empty()) {
            return;
        }
        std::string name = lib;
        if (name.size() < 4 || name.substr(name.size() - 4) != ".lib") {
            name += ".lib";
        }
        for (const auto &x : libs) {
            if (_stricmp(x.c_str(), name.c_str()) == 0) {
                return;
            }
        }
        libs.push_back(std::move(name));
    };

    for (const auto &fn : prog.externFns) {
        add(fn.lib);
    }
    
    // Always add kernel32 and libcmt for basic runtime support on Windows
    // libcmt.lib provides C standard library functions (strlen, strcmp, etc.)
    add("kernel32");
    add("libcmt");
    
    return libs;
}

static std::optional<std::string> readWholeFile(const std::string &path) {
    std::ifstream in(path, std::ios::binary);
    if (!in) {
        return std::nullopt;
    }
    std::ostringstream ss;
    ss << in.rdbuf();
    return ss.str();
}

// Resolve module path relative to current file
static std::string resolveModulePath(const std::string &currentPath, const std::string &modulePath) {
    // For now, simple resolution: if starts with ./ or ../, resolve relative to current file
    if (modulePath.size() >= 2 && modulePath[0] == '.' && modulePath[1] == '/') {
        // Get directory of current file
        size_t lastSlash = currentPath.find_last_of("/\\");
        if (lastSlash != std::string::npos) {
            std::string dir = currentPath.substr(0, lastSlash + 1);
            return dir + modulePath.substr(2);
        }
        return modulePath.substr(2);
    }
    // Absolute or simple path
    return modulePath;
}

// Load and parse a module
static std::optional<std::unique_ptr<Program>> loadModule(
    const std::string &path, 
    std::map<std::string, std::unique_ptr<Program>> &loadedModules,
    std::set<std::string> &loadingModules  // Track modules currently being loaded
) {
    // Check if already loaded
    if (loadedModules.find(path) != loadedModules.end()) {
        return std::nullopt; // Already loaded, return null to indicate success but no new module
    }
    
    // Check for circular dependency
    if (loadingModules.find(path) != loadingModules.end()) {
        std::cerr << "error: circular dependency detected: " << path << "\n";
        std::cerr << "  Module is already being loaded in the dependency chain\n";
        return std::nullopt;
    }
    
    // Mark as currently loading
    loadingModules.insert(path);
    
    auto srcOpt = readWholeFile(path);
    if (!srcOpt.has_value()) {
        std::cerr << "error: failed to read module file: " << path << "\n";
        loadingModules.erase(path);
        return std::nullopt;
    }
    
    Parser p(*srcOpt);
    auto progOpt = p.parse();
    if (!progOpt.has_value()) {
        std::cerr << "error: failed to parse module: " << path << "\n";
        loadingModules.erase(path);
        return std::nullopt;
    }
    
    auto progPtr = std::make_unique<Program>(std::move(*progOpt));
    
    // Recursively load dependencies of this module
    for (const auto &import : progPtr->imports) {
        std::string depPath = resolveModulePath(path, import.modulePath);
        if (loadedModules.find(depPath) == loadedModules.end()) {
            auto depResult = loadModule(depPath, loadedModules, loadingModules);
            if (!depResult.has_value() && loadedModules.find(depPath) == loadedModules.end()) {
                loadingModules.erase(path);
                return std::nullopt; // Failed to load dependency
            }
        }
    }
    
    loadedModules[path] = std::move(progPtr);
    
    // Remove from loading set
    loadingModules.erase(path);
    
    return std::nullopt; // Success
}

// Merge imported functions into main program
static bool mergeImports(Program &mainProg, const std::string &mainPath, std::map<std::string, std::unique_ptr<Program>> &loadedModules) {
    std::set<std::string> loadingModules; // Track circular dependencies
    
    for (const auto &import : mainProg.imports) {
        std::string modulePath = resolveModulePath(mainPath, import.modulePath);
        
        // Load module if not already loaded
        if (loadedModules.find(modulePath) == loadedModules.end()) {
            auto result = loadModule(modulePath, loadedModules, loadingModules);
            if (!result.has_value() && loadedModules.find(modulePath) == loadedModules.end()) {
                return false; // Failed to load
            }
        }
        
        const Program &module = *loadedModules[modulePath];
        
        // For namespace imports (import * as name), we import everything
        if (import.kind == ImportDecl::Kind::Namespace) {
            // No validation needed - all exported symbols will be available
            // They will be compiled into the same LLVM module
            std::cerr << "DEBUG: Namespace import '" << import.namespaceName << "' from '" << modulePath << "'\n";
            continue;
        }
        
        // For named imports, verify that requested symbols are exported
        for (const std::string &name : import.names) {
            bool found = false;
            
            // Look for exported function
            for (const auto &fn : module.functions) {
                if (fn->name == name) {
                    // Check if it's exported
                    auto it = module.exportedFunctions.find(name);
                    if (it == module.exportedFunctions.end() || !it->second) {
                        std::cerr << "error: function '" << name << "' is not exported from module '" << modulePath << "'\n";
                        return false;
                    }
                    found = true;
                    break;
                }
            }
            
            // Look for exported struct
            if (!found) {
                for (const auto &structDef : module.structs) {
                    if (structDef.name == name) {
                        found = true;
                        break;
                    }
                }
            }
            
            if (!found) {
                std::cerr << "error: '" << name << "' not found in module '" << modulePath << "'\n";
                return false;
            }
        }
    }
    
    return true;
}

// Build LLVM module from main program and all imported modules
static bool buildModuleWithImports(const Program &mainProg, const std::string &moduleName, llvm::Module &m, const std::map<std::string, std::unique_ptr<Program>> &loadedModules) {
    std::cerr << "DEBUG: buildModuleWithImports started\n";
    llvm::LLVMContext &ctx = m.getContext();
    llvm::IRBuilder<> b(ctx);

    llvm::Type *i32Ty = llvm::Type::getInt32Ty(ctx);
    
    // Collect all struct types from all modules
    Program &mutableMainProg = const_cast<Program&>(mainProg);
    
    // Create struct types from main program
    for (const auto &structDef : mainProg.structs) {
        llvm::StructType *structTy = llvm::StructType::create(ctx, structDef.name);
        mutableMainProg.structTypes[structDef.name] = structTy;
    }
    
    // Create struct types from imported modules
    for (const auto &[path, module] : loadedModules) {
        Program &mutableModule = const_cast<Program&>(*module);
        for (const auto &structDef : module->structs) {
            if (mutableMainProg.structTypes.find(structDef.name) == mutableMainProg.structTypes.end()) {
                llvm::StructType *structTy = llvm::StructType::create(ctx, structDef.name);
                mutableMainProg.structTypes[structDef.name] = structTy;
                mutableModule.structTypes[structDef.name] = structTy;
            }
        }
    }
    
    // Define struct bodies from main program
    for (const auto &structDef : mainProg.structs) {
        std::vector<llvm::Type*> fieldTypes;
        for (const auto &field : structDef.fields) {
            fieldTypes.push_back(lowerType(ctx, field.type, mutableMainProg.structTypes));
        }
        mutableMainProg.structTypes[structDef.name]->setBody(fieldTypes);
    }
    
    // Define struct bodies from imported modules
    for (const auto &[path, module] : loadedModules) {
        for (const auto &structDef : module->structs) {
            if (!mutableMainProg.structTypes[structDef.name]->isOpaque()) {
                continue; // Already defined
            }
            std::vector<llvm::Type*> fieldTypes;
            for (const auto &field : structDef.fields) {
                fieldTypes.push_back(lowerType(ctx, field.type, mutableMainProg.structTypes));
            }
            mutableMainProg.structTypes[structDef.name]->setBody(fieldTypes);
        }
    }
    
    // Declare extern functions from main program
    for (const auto &fn : mainProg.externFns) {
        std::vector<llvm::Type *> params;
        for (const auto &p : fn.params) {
            params.push_back(lowerType(ctx, p, mutableMainProg.structTypes));
        }
        llvm::Type *retTy = lowerType(ctx, fn.result, mutableMainProg.structTypes);
        auto *fnTy = llvm::FunctionType::get(retTy, params, false);
        m.getOrInsertFunction(fn.name, fnTy);
    }
    
    // Declare extern functions from imported modules
    for (const auto &[path, module] : loadedModules) {
        for (const auto &fn : module->externFns) {
            std::vector<llvm::Type *> params;
            for (const auto &p : fn.params) {
                params.push_back(lowerType(ctx, p, mutableMainProg.structTypes));
            }
            llvm::Type *retTy = lowerType(ctx, fn.result, mutableMainProg.structTypes);
            auto *fnTy = llvm::FunctionType::get(retTy, params, false);
            m.getOrInsertFunction(fn.name, fnTy);
        }
    }
    
    // Create main function wrapper
    auto *mainTy = llvm::FunctionType::get(i32Ty, {}, false);
    llvm::Function *mainFn = llvm::Function::Create(mainTy, llvm::Function::ExternalLinkage, "main", m);
    llvm::BasicBlock *entry = llvm::BasicBlock::Create(ctx, "entry", mainFn);
    b.SetInsertPoint(entry);

    if (needsConsole(mainProg)) {
        emitWindowsConsoleRuntime(m, mainFn);
    } else {
        llvm::Type *voidTy = llvm::Type::getVoidTy(ctx);
        llvm::FunctionType *startTy = llvm::FunctionType::get(voidTy, {}, false);
        llvm::Function *startFn = llvm::Function::Create(startTy, llvm::Function::ExternalLinkage, "tsn_start", m);
        llvm::BasicBlock *startBB = llvm::BasicBlock::Create(ctx, "entry", startFn);
        llvm::IRBuilder<> startB(startBB);
        
        llvm::Value *rc = startB.CreateCall(mainFn);
        llvm::FunctionCallee exitFn = m.getOrInsertFunction("ExitProcess", llvm::FunctionType::get(voidTy, {i32Ty}, false));
        startB.CreateCall(exitFn, {rc});
        startB.CreateUnreachable();
    }
    
    int strIndex = 0;
    
    // Compile functions from imported modules FIRST
    for (const auto &[path, module] : loadedModules) {
        std::cerr << "DEBUG: Compiling module: " << path << "\n";
        Program &mutableModule = const_cast<Program&>(*module);
        
        for (const auto &fnDef : module->functions) {
            std::cerr << "DEBUG: Compiling function: " << fnDef->name << " from " << path << "\n";
            std::vector<llvm::Type *> paramTypes;
            for (const auto &p : fnDef->params) {
                paramTypes.push_back(lowerType(ctx, p.type, mutableMainProg.structTypes));
            }
            llvm::Type *retTy = lowerType(ctx, fnDef->result, mutableMainProg.structTypes);
            llvm::FunctionType *fnTy = llvm::FunctionType::get(retTy, paramTypes, false);
            
            llvm::Function *llvmFn = llvm::Function::Create(fnTy, llvm::Function::ExternalLinkage, fnDef->name, m);

            llvm::BasicBlock *bb = llvm::BasicBlock::Create(ctx, "entry", llvmFn);
            llvm::IRBuilder<> fBuilder(bb);

            for (size_t i = 0; i < fnDef->params.size(); ++i) {
                llvm::Argument *arg = llvmFn->getArg(static_cast<uint32_t>(i));
                llvm::AllocaInst *alloca = fBuilder.CreateAlloca(arg->getType(), nullptr, fnDef->params[i].name);
                fBuilder.CreateStore(arg, alloca);
                mutableModule.symbolTable[fnDef->params[i].name] = alloca;
            }

            for (const auto &stmtPtr : fnDef->body) {
                emitStmt(fBuilder, stmtPtr.get(), m, *module, llvmFn, strIndex);
            }
            
            if (!fBuilder.GetInsertBlock()->getTerminator()) {
                if (fnDef->result.kind == TypeName::Kind::Void) {
                    fBuilder.CreateRetVoid();
                } else {
                    fBuilder.CreateRet(llvm::Constant::getNullValue(retTy));
                }
            }
        }
    }
    
    // Then compile functions from main program
    std::cerr << "DEBUG: Compiling main program functions\n";
    for (const auto &fnDef : mainProg.functions) {
        std::cerr << "DEBUG: Compiling function: " << fnDef->name << "\n";
        std::vector<llvm::Type *> paramTypes;
        for (const auto &p : fnDef->params) {
            paramTypes.push_back(lowerType(ctx, p.type, mutableMainProg.structTypes));
        }
        llvm::Type *retTy = lowerType(ctx, fnDef->result, mutableMainProg.structTypes);
        llvm::FunctionType *fnTy = llvm::FunctionType::get(retTy, paramTypes, false);
        
        std::string llvmFnName = (fnDef->name == "main") ? "__tsn_user_main" : fnDef->name;
        llvm::Function *llvmFn = llvm::Function::Create(fnTy, llvm::Function::ExternalLinkage, llvmFnName, m);

        llvm::BasicBlock *bb = llvm::BasicBlock::Create(ctx, "entry", llvmFn);
        llvm::IRBuilder<> fBuilder(bb);

        for (size_t i = 0; i < fnDef->params.size(); ++i) {
            llvm::Argument *arg = llvmFn->getArg(static_cast<uint32_t>(i));
            llvm::AllocaInst *alloca = fBuilder.CreateAlloca(arg->getType(), nullptr, fnDef->params[i].name);
            fBuilder.CreateStore(arg, alloca);
            mutableMainProg.symbolTable[fnDef->params[i].name] = alloca;
        }

        for (const auto &stmtPtr : fnDef->body) {
            emitStmt(fBuilder, stmtPtr.get(), m, mainProg, llvmFn, strIndex);
        }
        
        if (!fBuilder.GetInsertBlock()->getTerminator()) {
            if (fnDef->result.kind == TypeName::Kind::Void) {
                fBuilder.CreateRetVoid();
            } else if (fnDef->name == "main" && fnDef->result.kind == TypeName::Kind::Void) {
                fBuilder.CreateRetVoid();
            } else {
                fBuilder.CreateRet(llvm::Constant::getNullValue(retTy));
            }
        }
    }
    
    // Check if user defined a main() function
    bool hasUserMain = false;
    bool userMainReturnsVoid = false;
    for (const auto &fnDef : mainProg.functions) {
        if (fnDef->name == "main") {
            hasUserMain = true;
            userMainReturnsVoid = (fnDef->result.kind == TypeName::Kind::Void);
            break;
        }
    }
    
    // If user defined main(), call it from wrapper main
    if (hasUserMain) {
        llvm::Function *userMain = m.getFunction("__tsn_user_main");
        if (userMain) {
            if (userMainReturnsVoid) {
                b.CreateCall(userMain);
                b.CreateRet(llvm::ConstantInt::get(i32Ty, 0));
            } else {
                llvm::Value *rc = b.CreateCall(userMain);
                b.CreateRet(rc);
            }
        }
    } else {
        // No user main, emit top-level statements
        for (const auto &stmtPtr : mainProg.stmts) {
            emitStmt(b, stmtPtr.get(), m, mainProg, mainFn, strIndex);
        }
        
        if (!b.GetInsertBlock()->getTerminator()) {
            b.CreateRet(llvm::ConstantInt::get(i32Ty, 0));
        }
    }

    return true;
}

struct Args {
    std::string inputPath;
    std::string outputPath;
    std::string emit = "exe";
};

static std::optional<Args> parseArgs(int argc, char **argv) {
    Args a;
    for (int i = 1; i < argc; ++i) {
        std::string cur = argv[i];
        if (cur == "-o") {
            if (i + 1 >= argc) {
                std::cerr << "error: missing value for -o\n";
                return std::nullopt;
            }
            a.outputPath = argv[++i];
            continue;
        }
        if (cur.rfind("--emit=", 0) == 0) {
            a.emit = cur.substr(std::string("--emit=").size());
            continue;
        }
        if (!cur.empty() && cur[0] == '-') {
            std::cerr << "error: unknown option: " << cur << "\n";
            return std::nullopt;
        }
        if (!a.inputPath.empty()) {
            std::cerr << "error: multiple input files\n";
            return std::nullopt;
        }
        a.inputPath = std::move(cur);
    }
    if (a.inputPath.empty()) {
        std::cerr << "usage: tsnc <file.tsn> [--emit=ll|obj|exe] [-o out]\n";
        return std::nullopt;
    }
    return a;
}

static bool writeBinaryFile(const std::string &path, const llvm::SmallVectorImpl<char> &buf) {
    std::ofstream out(path, std::ios::binary);
    if (!out) {
        return false;
    }
    out.write(buf.data(), static_cast<std::streamsize>(buf.size()));
    return static_cast<bool>(out);
}

static bool writeTextFile(const std::string &path, const std::string &text) {
    std::ofstream out(path, std::ios::binary);
    if (!out) {
        return false;
    }
    out << text;
    return static_cast<bool>(out);
}

static bool emitObject(const llvm::Module &m, const std::string &outPath, std::string &err) {
    llvm::InitializeNativeTarget();
    llvm::InitializeNativeTargetAsmPrinter();
    llvm::InitializeNativeTargetAsmParser();

    std::string tripleStr = llvm::sys::getDefaultTargetTriple();
    std::string targetErr;
    const llvm::Target *target = llvm::TargetRegistry::lookupTarget(tripleStr, targetErr);
    if (!target) {
        err = targetErr;
        return false;
    }

    llvm::TargetOptions opt;
    auto rm = std::optional<llvm::Reloc::Model>();
    std::unique_ptr<llvm::TargetMachine> tm(target->createTargetMachine(tripleStr, "", "", opt, rm));
    if (!tm) {
        err = "failed to create target machine";
        return false;
    }

    std::unique_ptr<llvm::Module> clone = llvm::CloneModule(m);
    clone->setTargetTriple(llvm::Triple(tripleStr));
    clone->setDataLayout(tm->createDataLayout());

    llvm::legacy::PassManager pm;
    llvm::SmallVector<char, 0> objBuf;
    llvm::raw_svector_ostream objOut(objBuf);
    if (tm->addPassesToEmitFile(pm, objOut, nullptr, llvm::CodeGenFileType::ObjectFile)) {
        err = "target machine cannot emit object";
        return false;
    }
    pm.run(*clone);

    if (!writeBinaryFile(outPath, objBuf)) {
        err = "failed to write object file";
        return false;
    }
    return true;
}

static int runLldLink(const std::string &objPath, const std::string &exePath, const std::vector<std::string> &libs) {
    std::ostringstream cmd;
    cmd << "lld-link.exe ";
    cmd << "/NOLOGO ";
    cmd << "/SUBSYSTEM:CONSOLE ";
    cmd << "/ENTRY:tsn_start ";
    cmd << "/OUT:\"" << exePath << "\" ";
    cmd << "\"" << objPath << "\" ";

    for (const auto &lib : libs) {
        cmd << lib << " ";
    }

    return std::system(cmd.str().c_str());
}

}

int main(int argc, char **argv) {
    auto argsOpt = tsn::parseArgs(argc, argv);
    if (!argsOpt.has_value()) {
        return 1;
    }
    tsn::Args args = std::move(*argsOpt);

    auto srcOpt = tsn::readWholeFile(args.inputPath);
    if (!srcOpt.has_value()) {
        std::cerr << "error: failed to read input file\n";
        return 1;
    }

    tsn::Parser p(*srcOpt);
    auto progOpt = p.parse();
    if (!progOpt.has_value()) {
        return 1;
    }

    tsn::Program prog = std::move(*progOpt);
    
    // Load and merge imported modules
    std::map<std::string, std::unique_ptr<tsn::Program>> loadedModules;
    if (!tsn::mergeImports(prog, args.inputPath, loadedModules)) {
        std::cerr << "error: failed to load imports\n";
        return 1;
    }

    llvm::LLVMContext ctx;
    llvm::Module m(args.inputPath, ctx);
    if (!tsn::buildModuleWithImports(prog, args.inputPath, m, loadedModules)) {
        return 1;
    }

    if (args.emit == "ll") {
        if (!args.outputPath.empty()) {
            std::string ir;
            llvm::raw_string_ostream irOut(ir);
            m.print(irOut, nullptr);
            irOut.flush();
            if (!tsn::writeTextFile(args.outputPath, ir)) {
                std::cerr << "error: failed to open output file\n";
                return 1;
            }
            return 0;
        }
        m.print(llvm::outs(), nullptr);
        return 0;
    }

    if (args.emit == "obj") {
        std::string out = args.outputPath.empty() ? "out.obj" : args.outputPath;
        std::string err;
        if (!tsn::emitObject(m, out, err)) {
            std::cerr << "error: " << err << "\n";
            return 1;
        }
        return 0;
    }

    if (args.emit == "exe") {
        std::string exeOut = args.outputPath.empty() ? "a.exe" : args.outputPath;
        std::string objOut = exeOut + ".obj";

        std::string err;
        if (!tsn::emitObject(m, objOut, err)) {
            std::cerr << "error: " << err << "\n";
            return 1;
        }

        std::vector<std::string> libs = tsn::collectLinkLibs(prog);
        int rc = tsn::runLldLink(objOut, exeOut, libs);
        if (rc != 0) {
            std::cerr << "error: lld-link failed\n";
            return 1;
        }
        return 0;
    }

    std::cerr << "error: unknown --emit mode\n";
    return 1;

}
