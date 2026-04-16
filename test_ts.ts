import * as console from "std:console";

type i32 = number;

function add(a: number, b: number): i32 {
    return a + b;
}

function main(): void {
    let result = add(10, 32);
    if (result == 42) {
        console.log("TypeScript compatibility works!");
    }
}
