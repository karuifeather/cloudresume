import { loadContent } from "./load-content";

const data = loadContent(new URL("../content", import.meta.url).pathname);

console.log(
  `Content valid: ${Object.values(data)
    .filter(Array.isArray)
    .reduce((n, items) => n + items.length, 0)} records.`,
);
