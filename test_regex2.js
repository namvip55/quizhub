const inlineOptionsRegex = /(\*?\s*[A-Da-d1-4](?:\s*[\[\.\/\)]|\s+))/g;
const text = "A boy is eating an apple. A. True B. False";

console.log("Matches:", text.match(inlineOptionsRegex));
console.log("Parts:", text.split(inlineOptionsRegex));
