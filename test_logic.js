const text = "Testing is one set of _____ for verifying software. A. sciences B. arts C. concepts *D. techniques";
const inlineOptionsRegex = /(\*?\s*[A-Da-d1-4](?:\s*[\[\.\/\)]|\s+))/g;

function tryParseInlineOptions(text) {
  const matches = text.match(inlineOptionsRegex);
  if (!matches || matches.length < 2) return false;

  const parts = text.split(inlineOptionsRegex);
  let extracted = [];
  for (let i = 1; i < parts.length; i += 2) {
    const marker = parts[i] || "";
    const content = (parts[i + 1] || "").trim();
    const isAst = marker.trim().startsWith("*");
    const labelMatch = marker.match(/([A-Da-d1-4])/);
    if (labelMatch) {
      extracted.push({ label: labelMatch[1].toUpperCase(), content, isAsterisk: isAst });
    }
  }

  if (extracted.length < 2) return false;

  for (let i = 0; i < extracted.length; i++) {
    const lbl = extracted[i].label;
    const expectedLetter = String.fromCharCode(65 + i);
    const expectedNum = String(i + 1);
    if (lbl !== expectedLetter && lbl !== expectedNum) return false;
  }
  return true;
}

console.log("tryParseInlineOptions:", tryParseInlineOptions(text));
