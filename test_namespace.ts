import * as console from "std:console";

namespace MySpace {
    export function add(a: i32, b: i32): i32 {
        return a + b;
    }

    namespace Inner {
        export function test(): void {
            console.log("Nested namespace works!");
        }
    }

    export function run(): void {
        Inner.test();
    }
}

function main(): void {
    let res = MySpace.add(10, 32);
    if (res == 42) {
        console.log("Namespace and Mangling works!");
        MySpace.run();
    }
}
