const wrapStringInArray = (value: string): [string] => [value];

const wrapNumberInArray = (value: number): [number] => [value];

const wrapRandomTypeInArray = <T>(value: T): [T] => [value];

console.log(wrapNumberInArray(5));
console.log(wrapStringInArray("hello"));
console.log(wrapRandomTypeInArray(true));
