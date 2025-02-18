import luau from "LuauAST";
import { Lazy } from "Shared/classes/Lazy";
import { assert } from "Shared/util/assert";
import { TransformState } from "TSTransformer";
import { transformVariable } from "TSTransformer/nodes/statements/transformVariableStatement";
import { cleanModuleName } from "TSTransformer/util/cleanModuleName";
import { createImportExpression } from "TSTransformer/util/createImportExpression";
import { getSourceFileFromModuleSpecifier } from "TSTransformer/util/getSourceFileFromModuleSpecifier";
import { isSymbolOfValue } from "TSTransformer/util/isSymbolOfValue";
import ts from "typescript";

function countImportExpUses(state: TransformState, importClause: ts.ImportClause) {
	let uses = 0;

	if (importClause.name) {
		const symbol = state.getOriginalSymbol(importClause.name);
		if (state.resolver.isReferencedAliasDeclaration(importClause) && (!symbol || isSymbolOfValue(symbol))) {
			uses++;
		}
	}

	if (importClause.namedBindings) {
		if (ts.isNamespaceImport(importClause.namedBindings)) {
			uses++;
		} else {
			for (const element of importClause.namedBindings.elements) {
				const symbol = state.getOriginalSymbol(element.name);
				if (state.resolver.isReferencedAliasDeclaration(element) && (!symbol || isSymbolOfValue(symbol))) {
					uses++;
				}
			}
		}
	}

	return uses;
}

export function transformImportDeclaration(state: TransformState, node: ts.ImportDeclaration) {
	// no emit for type only
	const importClause = node.importClause;
	if (importClause && importClause.isTypeOnly) return luau.list.make<luau.Statement>();

	const statements = luau.list.make<luau.Statement>();

	assert(ts.isStringLiteral(node.moduleSpecifier));
	const importExp = new Lazy<luau.IndexableExpression>(() =>
		createImportExpression(state, node.getSourceFile(), node.moduleSpecifier),
	);

	if (importClause) {
		// detect if we need to push to a new var or not
		const uses = countImportExpUses(state, importClause);
		if (uses > 1) {
			const moduleName = node.moduleSpecifier.text.split("/");
			const id = luau.tempId(cleanModuleName(moduleName[moduleName.length - 1]));
			luau.list.push(
				statements,
				luau.create(luau.SyntaxKind.VariableDeclaration, {
					left: id,
					right: importExp.get(),
				}),
			);
			importExp.set(id);
		}

		// default import logic
		if (importClause.name) {
			const symbol = state.getOriginalSymbol(importClause.name);
			if (state.resolver.isReferencedAliasDeclaration(importClause) && (!symbol || isSymbolOfValue(symbol))) {
				const moduleFile = getSourceFileFromModuleSpecifier(state.typeChecker, node.moduleSpecifier);
				const moduleSymbol = moduleFile && state.typeChecker.getSymbolAtLocation(moduleFile);
				if (moduleSymbol && state.getModuleExports(moduleSymbol).some(v => v.name === "default")) {
					luau.list.pushList(
						statements,
						transformVariable(state, importClause.name, luau.property(importExp.get(), "default"))[1],
					);
				} else {
					luau.list.pushList(statements, transformVariable(state, importClause.name, importExp.get())[1]);
				}
			}
		}

		if (importClause.namedBindings) {
			// namespace import logic
			if (ts.isNamespaceImport(importClause.namedBindings)) {
				luau.list.pushList(
					statements,
					transformVariable(state, importClause.namedBindings.name, importExp.get())[1],
				);
			} else {
				// named elements import logic
				for (const element of importClause.namedBindings.elements) {
					const symbol = state.getOriginalSymbol(element.name);
					if (state.resolver.isReferencedAliasDeclaration(element) && (!symbol || isSymbolOfValue(symbol))) {
						luau.list.pushList(
							statements,
							transformVariable(
								state,
								element.name,
								luau.property(importExp.get(), (element.propertyName ?? element.name).text),
							)[1],
						);
					}
				}
			}
		}
	}

	// ensure we emit something
	if (
		!importClause ||
		(state.compilerOptions.importsNotUsedAsValues === ts.ImportsNotUsedAsValues.Preserve &&
			luau.list.isEmpty(statements))
	) {
		const expression = importExp.get();
		if (luau.isCallExpression(expression)) {
			luau.list.push(statements, luau.create(luau.SyntaxKind.CallStatement, { expression }));
		}
	}

	return statements;
}
