import * as console from "std:console";

enum Color {
    Red,
    Green = 10,
    Blue
}

function main(): void {
    let r = Color.Red;   // 0
    let g = Color.Green; // 10
    let b = Color.Blue;  // 11
    
    if (r == 0 && g == 10 && b == 11) {
        console.log("Enum support works!");
    }
}
