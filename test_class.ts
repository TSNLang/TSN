import { print_i32 } from "std:io";

@ffi.lib("runtime")
declare function print_i32(n: i32): void;

class Point {
    public x: i32;
    public y: i32;

    constructor(x: i32, y: i32) {
        this.x = x;
        this.y = y;
    }

    public print(): void {
        this.log(this.x);
        this.log(this.y);
    }

    private log(n: i32): void {
        print_i32(n);
    }

    public move(dx: i32, dy: i32): void {
        this.x = this.x + dx;
        this.y = this.y + dy;
    }
}

function test_arc(): void {
    let p = new Point(1, 2);
    // Khi thoát khỏi hàm này, p sẽ bị decRef và free.
}

function main(): i32 {
    test_arc();
    
    let p = new Point(10, 20);
    p.print();
    
    p.move(5, -5);
    p.print();
    
    p.x = 100;
    let val = p.x;
    print_i32(val);
    
    return 0;
}
