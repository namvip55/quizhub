const text = "Testing is one set of a dog for verifying software. A. sciences B. arts C. concepts *D techniques";
const inlineOptionsRegex = /((?:\*\s*[A-Da-d1-4](?:\s*[\[\.\/\)]|\s+))|(?:(?:^|\s+)[A-Da-d1-4]\s*[\[\.\/\)]))/g;

console.log("Matches:", text.match(inlineOptionsRegex));
console.log("Parts:", text.split(inlineOptionsRegex));
