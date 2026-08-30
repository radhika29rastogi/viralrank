import { parseInstagramProfileInput, USERNAME_PARSE_EXAMPLES } from "./username";

for (const example of USERNAME_PARSE_EXAMPLES) {
  const parsed = parseInstagramProfileInput(example.input);
  const got = parsed.ok ? parsed.username : null;
  if (got !== example.username) {
    throw new Error(`parse(${JSON.stringify(example.input)}) => ${JSON.stringify(got)}, expected ${JSON.stringify(example.username)}`);
  }
}

console.log("instagram username parse tests passed");
