import ts from "typescript";

const LANGUAGE_ALIASES = new Map([
  ["js", "javascript"], ["mjs", "javascript"], ["cjs", "javascript"],
  ["ts", "typescript"], ["tsx", "tsx"], ["jsx", "jsx"],
  ["json", "json"]
]);

const MAX_CODE_CHARACTERS = 200_000;

export function validateCode(language, code) {
  if (typeof code !== "string") {
    return { status: 400, success: false, error: "El código debe enviarse como texto." };
  }

  if (code.length > MAX_CODE_CHARACTERS) {
    return { status: 413, success: false, error: `El archivo supera el límite de ${MAX_CODE_CHARACTERS} caracteres.` };
  }

  const requested = String(language || "").trim().toLowerCase().replace(/^\./, "");
  const normalized = LANGUAGE_ALIASES.get(requested) || requested;

  if (normalized === "json") {
    try {
      JSON.parse(code);
      return { status: 200, success: true, valid: true, language: normalized, diagnostics: [], note: "JSON válido; no se ejecutó ningún código." };
    } catch (error) {
      return {
        status: 200,
        success: true,
        valid: false,
        language: normalized,
        diagnostics: [{ message: error.message, line: null, column: null }],
        note: "Solo se comprobó la sintaxis JSON."
      };
    }
  }

  if (!["javascript", "typescript", "jsx", "tsx"].includes(normalized)) {
    return {
      status: 400,
      success: false,
      error: "Validador disponible para JavaScript, TypeScript, JSX, TSX y JSON. No se ejecutó el archivo."
    };
  }

  const extension = normalized === "javascript" ? "js" : normalized;
  const fileName = `darkia-check.${extension}`;
  const output = ts.transpileModule(code, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      isolatedModules: true,
      noEmit: true
    }
  });

  const diagnostics = (output.diagnostics || [])
    .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
    .map(diagnostic => {
      const position = diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        : null;

      return {
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        line: position ? position.line + 1 : null,
        column: position ? position.character + 1 : null
      };
    });

  return {
    status: 200,
    success: true,
    valid: diagnostics.length === 0,
    language: normalized,
    diagnostics,
    note: "Comprobación sintáctica solamente; no ejecuta el código ni reemplaza un type-check del proyecto."
  };
}
