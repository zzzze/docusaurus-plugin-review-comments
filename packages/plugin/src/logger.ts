type TagFn = (strings: TemplateStringsArray, ...values: unknown[]) => void;

function createTagFn(consoleFn: (...args: unknown[]) => void): TagFn {
  return (strings: TemplateStringsArray, ...values: unknown[]) => {
    let result = "";
    strings.forEach((str, i) => {
      result += str + (i < values.length ? String(values[i]) : "");
    });
    consoleFn(result);
  };
}

interface Logger {
  info: TagFn;
  warn: TagFn;
  error: TagFn;
}

let logger: Logger;
try {
  // Use Docusaurus logger when available (colored output in Docusaurus context)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@docusaurus/logger");
  // CJS require returns the module namespace; the actual logger is the default export.
  logger = mod.default ?? mod;
} catch {
  logger = {
    info: createTagFn(console.log),
    warn: createTagFn(console.warn),
    error: createTagFn(console.error),
  };
}

export default logger;
