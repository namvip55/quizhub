const inlineOptionsRegex = /(\*?\s*[A-Da-d1-4](?:\s*[\[\.\/\)]|\s+))/g;
const text = "Testing is one set of _____ for verifying software. A. sciences B. arts C. concepts *D. techniques";

console.log("Matches:", text.match(inlineOptionsRegex));
console.log("Parts:", text.split(inlineOptionsRegex));
