"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * @typedef {{
 *   kind: 'class'|'method'|'function'|'arrow',
 *   name: string,
 *   line: number,
 *   className?: string,
 *   accessor?: 'get'|'set',
 *   isStatic?: boolean
 * }} OutlineEntry
 */

/**
 * Entry point for the CLI.
 */
function main() {
  const [, , inputArg, outputArg] = process.argv;
  if (!inputArg || inputArg === "--help" || inputArg === "-h") {
    printUsage(inputArg ? 0 : 1);
    return;
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  if (!fs.existsSync(inputPath) || !fs.statSync(inputPath).isFile()) {
    console.error(`Input file not found: ${inputArg}`);
    process.exit(1);
  }

  const suggestedName = `${path.basename(
    inputPath,
    path.extname(inputPath)
  )}.outline.txt`;
  const outputPath = path.resolve(process.cwd(), outputArg || suggestedName);

  const source = fs.readFileSync(inputPath, "utf8");
  const outline = collectOutline(source);
  const formatted = formatOutline(outline, inputPath);
  fs.writeFileSync(outputPath, formatted.join("\n"), "utf8");
  console.log(`Outline written to ${path.relative(process.cwd(), outputPath)}`);
}

/**
 * Prints usage details for the CLI.
 *
 * @param {number} exitCode Process exit code.
 */
function printUsage(exitCode) {
  console.log(
    "Usage: node scripts/tools/generateOutline.js <input.js> [output.txt]"
  );
  console.log("Creates a simple outline with line numbers and function names.");
  process.exit(exitCode);
}

/**
 * Builds an outline of the provided source text.
 *
 * @param {string} source Raw JavaScript source.
 * @returns {Array<OutlineEntry>} Ordered outline entries.
 */
function collectOutline(source) {
  const lines = source.split(/\r?\n/);
  /** @type {Array<OutlineEntry>} */
  const entries = [];
  /** @type {Array<{ name: string, bodyDepth: number }>} */
  const classStack = [];
  let braceDepth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const trimmed = rawLine.trim();
    const lineNumber = index + 1;

    if (!trimmed) {
      braceDepth = updateBraceDepth(braceDepth, rawLine);
      if (
        classStack.length &&
        braceDepth < classStack[classStack.length - 1].bodyDepth
      ) {
        classStack.pop();
      }
      continue;
    }

    const classMatch = trimmed.match(/^(?:export\s+)?class\s+([A-Za-z0-9_$]+)/);
    if (classMatch) {
      const className = classMatch[1];
      entries.push({ kind: "class", name: className, line: lineNumber });
      classStack.push({ name: className, bodyDepth: braceDepth + 1 });
    }

    const inClass =
      classStack.length > 0 &&
      braceDepth >= classStack[classStack.length - 1].bodyDepth;

    if (inClass) {
      const methodMatch = trimmed.match(
        /^(?:(static)\s+)?(?:async\s+)?(?:(get|set)\s+)?([A-Za-z0-9_$#]+)\s*\([^;]*\)\s*\{/
      );
      if (methodMatch && !isControlKeyword(methodMatch[3])) {
        entries.push({
          kind: "method",
          name: methodMatch[3],
          line: lineNumber,
          className: classStack[classStack.length - 1].name,
          accessor: methodMatch[2] || undefined,
          isStatic: Boolean(methodMatch[1]),
        });
      }
    }

    const functionMatch = trimmed.match(
      /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/
    );
    if (functionMatch) {
      entries.push({
        kind: "function",
        name: functionMatch[1],
        line: lineNumber,
      });
    }

    const arrowMatch = trimmed.match(
      /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s+)?\([^=]*\)\s*=>\s*\{/
    );
    if (arrowMatch) {
      entries.push({ kind: "arrow", name: arrowMatch[1], line: lineNumber });
    }

    braceDepth = updateBraceDepth(braceDepth, rawLine);
    while (
      classStack.length &&
      braceDepth < classStack[classStack.length - 1].bodyDepth
    ) {
      classStack.pop();
    }
  }

  return entries;
}

/**
 * Determines whether the supplied identifier is a control-flow keyword.
 *
 * @param {string} name Identifier candidate.
 * @returns {boolean} True when the name represents a keyword.
 */
function isControlKeyword(name) {
  return (
    name === "if" ||
    name === "for" ||
    name === "while" ||
    name === "switch" ||
    name === "catch" ||
    name === "with"
  );
}

/**
 * Updates the running brace depth for the outline traversal.
 *
 * @param {number} current Existing brace depth.
 * @param {string} line Source line.
 * @returns {number} New brace depth.
 */
function updateBraceDepth(current, line) {
  const open = countChar(line, "{");
  const close = countChar(line, "}");
  let next = current + open - close;
  if (next < 0) {
    next = 0;
  }
  return next;
}

/**
 * Counts the occurrences of a character within the provided string.
 *
 * @param {string} line Text to inspect.
 * @param {string} char Target character.
 * @returns {number} Occurrence count.
 */
function countChar(line, char) {
  let count = 0;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === char) {
      count += 1;
    }
  }
  return count;
}

/**
 * Converts outline data into printable strings.
 *
 * @param {Array<OutlineEntry>} outline Ordered outline entries.
 * @param {string} inputPath Original file path.
 * @returns {Array<string>} Lines ready for file output.
 */
function formatOutline(outline, inputPath) {
  const header = [`Outline for ${path.relative(process.cwd(), inputPath)}`, ""];
  const body = outline.map((entry) => {
    const label = buildLabel(entry);
    return `${entry.line.toString().padStart(5, " ")} : ${label}`;
  });
  return [...header, ...body];
}

/**
 * Builds a human-friendly label for an outline entry.
 *
 * @param {OutlineEntry} entry Outline entry.
 * @returns {string} Formatted label.
 */
function buildLabel(entry) {
  if (entry.kind === "class") {
    return `class ${entry.name}`;
  }
  if (entry.kind === "method" && entry.className) {
    const prefix = entry.isStatic ? "static " : "";
    const accessor = entry.accessor ? `${entry.accessor} ` : "";
    return `method ${entry.className}.${prefix}${accessor}${entry.name}`;
  }
  if (entry.kind === "function") {
    return `function ${entry.name}`;
  }
  return `arrow ${entry.name}`;
}

main();
