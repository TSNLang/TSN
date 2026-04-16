@ffi.lib("runtime")
declare function print_i32(n: i32): void;

// Struct: Value Semantic (Copy)
struct Point {
    x: i32;
    y: i32;
}

// Class: Ownership Semantic (Move)
class Player {
    id: i32;
    score: i32;
    
    constructor(id: i32) {
        this.id = id;
        this.score = 0;
    }
}

function main(): i32 {
    // Test Struct (Copy)
    let p1: Point;
    p1.x = 10;
    p1.y = 20;
    
    let p2 = p1; // p2 is a COPY of p1
    p2.x = 100;
    
    let x1 = p1.x;
    let x2 = p2.x;
    print_i32(x1); // Should be 10 (p1 is unchanged)
    print_i32(x2); // Should be 100
    
    // Test Class (Move)
    let s1 = new Player(1);
    let s2 = s1; // OWNERSHIP MOVES from s1 to s2
    
    let sid = s2.id;
    print_i32(sid); // Valid
    
    return 0;
}
