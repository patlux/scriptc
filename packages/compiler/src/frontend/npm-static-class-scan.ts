/* Text-only scan for the narrow npm-static transitive concrete-class lane.
 * This is a parser island: TypeScript 5 parses shipped JS, and only strings
 * cross back to the TS7 program world. */
import ts from "typescript5";

export interface StaticClassScan {
  relativeDeps: string[];
  demandedImports: { spec: string; exportName: string }[];
}

export interface StaticClassExport {
  exportName: string;
  localName: string;
}

export interface StaticClassDeclarations {
  classDeclarations: string[];
  classExpressions: string[];
}

export function scanStaticClassDeclarations(
  file: string,
  source: string,
  localNames: ReadonlySet<string>,
): StaticClassDeclarations {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const classDeclarations: string[] = [];
  const classExpressions: string[] = [];
  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name !== undefined && localNames.has(stmt.name.text)) {
      classDeclarations.push(stmt.name.text);
      continue;
    }
    if (!ts.isVariableStatement(stmt) || stmt.declarationList.declarations.length !== 1) continue;
    const decl = stmt.declarationList.declarations[0]!;
    if (
      ts.isIdentifier(decl.name) && decl.initializer !== undefined &&
      ts.isClassExpression(decl.initializer) && localNames.has(decl.name.text)
    ) {
      classExpressions.push(decl.name.text);
    }
  }
  return { classDeclarations, classExpressions };
}

export function scanStaticClassExports(file: string, source: string): StaticClassExport[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const exports: StaticClassExport[] = [];
  for (const stmt of sf.statements) {
    if (
      !ts.isExportDeclaration(stmt) || stmt.exportClause === undefined ||
      !ts.isNamedExports(stmt.exportClause) || stmt.moduleSpecifier !== undefined
    ) {
      continue;
    }
    for (const element of stmt.exportClause.elements) {
      exports.push({
        exportName: element.name.text,
        localName: element.propertyName?.text ?? element.name.text,
      });
    }
  }
  return exports;
}

export function scanStaticClassImports(file: string, source: string): StaticClassScan {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const relativeDeps: string[] = [];
  const imports = new Map<string, { spec: string; exportName: string }>();
  for (const stmt of sf.statements) {
    if ((ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt)) && stmt.moduleSpecifier && ts.isStringLiteralLike(stmt.moduleSpecifier)) {
      const spec = stmt.moduleSpecifier.text;
      if (spec.startsWith("./") || spec.startsWith("../")) relativeDeps.push(spec);
      if (ts.isImportDeclaration(stmt) && stmt.importClause) {
        if (stmt.importClause.name) imports.set(stmt.importClause.name.text, { spec, exportName: "default" });
        const named = stmt.importClause.namedBindings;
        if (named && ts.isNamedImports(named)) {
          for (const element of named.elements) {
            imports.set(element.name.text, { spec, exportName: element.propertyName?.text ?? element.name.text });
          }
        }
      }
    }
  }
  const demanded = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isClassLike(node)) {
      for (const clause of node.heritageClauses ?? []) {
        if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
        const base = clause.types[0]?.expression;
        if (base && ts.isIdentifier(base)) {
          const imported = imports.get(base.text);
          if (imported !== undefined) demanded.add(`${imported.spec}\u0000${imported.exportName}`);
        }
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
      const imported = imports.get(node.expression.text);
      if (imported !== undefined) demanded.add(`${imported.spec}\u0000${imported.exportName}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return {
    relativeDeps,
    demandedImports: [...demanded].map((entry) => {
      const at = entry.indexOf("\u0000");
      return { spec: entry.slice(0, at), exportName: entry.slice(at + 1) };
    }),
  };
}
