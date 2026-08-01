#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const checks = [
  ["app/brand.css", "Brand stylesheet"],
  ["public/project-pilot-mark.svg", "Official logo mark"],
  ["public/project-pilot-wordmark.svg", "Official wordmark"],
  ["public/favicon.svg", "Favicon"],
  ["app/layout.js", "Next.js root layout"]
];

let failed = false;
for (const [relative, label] of checks) {
  const exists = fs.existsSync(path.join(process.cwd(), relative));
  console.log(`${exists ? "✓" : "✗"} ${label}: ${relative}`);
  if (!exists) failed = true;
}

const layoutPath = path.join(process.cwd(), "app/layout.js");
if (fs.existsSync(layoutPath)) {
  const layout = fs.readFileSync(layoutPath, "utf8");
  const imported = layout.includes('import "./brand.css";');
  console.log(`${imported ? "✓" : "✗"} brand.css imported by app/layout.js`);
  if (!imported) failed = true;
}

if (failed) process.exit(1);
console.log("Brand installation verified.");
