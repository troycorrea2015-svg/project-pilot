#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const layoutPath = path.join(root, "app", "layout.js");
if (!fs.existsSync(layoutPath)) {
  console.error("Could not find app/layout.js. Run this script from the Project Pilot repository root.");
  process.exit(1);
}

let layout = fs.readFileSync(layoutPath, "utf8");
const importLine = 'import "./brand.css";';

if (!layout.includes(importLine)) {
  const lines = layout.split(/\r?\n/);
  let insertAt = 0;
  while (insertAt < lines.length && /^\s*import\s/.test(lines[insertAt])) insertAt++;
  lines.splice(insertAt, 0, importLine);
  layout = lines.join("\n");
  fs.writeFileSync(layoutPath, layout);
  console.log("Added brand.css import to app/layout.js");
} else {
  console.log("brand.css is already imported.");
}

const packagePath = path.join(root, "package.json");
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  pkg.scripts = pkg.scripts || {};
  if (!pkg.scripts["brand:verify"]) {
    pkg.scripts["brand:verify"] = "node scripts/verify-project-pilot-brand.js";
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
    console.log("Added npm run brand:verify.");
  }
}

console.log("Project Pilot 3.0C branding patch installed.");
