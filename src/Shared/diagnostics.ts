import kleur from "kleur";
import { createDiagnosticWithLocation } from "Shared/util/createDiagnosticWithLocation";
import { createTextDiagnostic } from "Shared/util/createTextDiagnostic";
import ts from "typescript";

export type DiagnosticFactory<T = void> = {
	(node: ts.Node, context: T): ts.DiagnosticWithLocation;
	id: number;
};

type DiagnosticContextFormatter<T> = (ctx: T) => Array<string>;

const REPO_URL = "https://github.com/roblox-ts/roblox-ts";

function suggestion(text: string) {
	return "Suggestion: " + kleur.yellow(text);
}

function issue(id: number) {
	return "More information: " + kleur.grey(`${REPO_URL}/issues/${id}`);
}

let id = 0;

/**
 * Returns a `DiagnosticFactory` that includes a function used to generate a readable message for the diagnostic.
 * @param messages The list of messages to include in the error report.
 */
function diagnostic(category: ts.DiagnosticCategory, ...messages: Array<string>): DiagnosticFactory {
	return diagnosticWithContext<void>(category, undefined, ...messages);
}

/**
 * Returns a `DiagnosticFactory` that includes a function used to generate a readable message for the diagnostic.
 * The context is additonal data from the location where the diagnostic occurred that is used to generate dynamic
 * messages.
 * @param contextFormatter An optional function to format the context parameter for this diagnostic. The returned
 * formatted messages are displayed last in the diagnostic report.
 * @param messages The list of messages to include in the diagnostic report.
 */
function diagnosticWithContext<T>(
	category: ts.DiagnosticCategory,
	contextFormatter?: DiagnosticContextFormatter<T>,
	...messages: Array<string>
): DiagnosticFactory<T> {
	const result = (node: ts.Node, context: T) => {
		if (category === ts.DiagnosticCategory.Error) {
			debugger;
		}

		if (contextFormatter) {
			messages.push(...contextFormatter(context));
		}

		return createDiagnosticWithLocation(result.id, messages.join("\n"), category, node);
	};
	result.id = id++;
	return result;
}

function diagnosticText(category: ts.DiagnosticCategory, ...messages: Array<string>) {
	return createTextDiagnostic(messages.join("\n"), category);
}

function error(...messages: Array<string>): DiagnosticFactory {
	return diagnostic(ts.DiagnosticCategory.Error, ...messages);
}

function errorWithContext<T>(
	contextFormatter: DiagnosticContextFormatter<T>,
	...messages: Array<string>
): DiagnosticFactory<T> {
	return diagnosticWithContext(ts.DiagnosticCategory.Error, contextFormatter, ...messages);
}

function errorText(...messages: Array<string>) {
	return diagnosticText(ts.DiagnosticCategory.Error, ...messages);
}

function warning(...messages: Array<string>): DiagnosticFactory {
	return diagnostic(ts.DiagnosticCategory.Warning, ...messages);
}

function warningText(...messages: Array<string>) {
	return diagnosticText(ts.DiagnosticCategory.Warning, ...messages);
}

export function getDiagnosticId(diagnostic: ts.Diagnostic): number {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (diagnostic as any).id;
}

/**
 * Defines diagnostic error messages
 */
export const errors = {
	// reserved identifiers
	noInvalidIdentifier: error(
		"Invalid Luau identifier!",
		"Luau identifiers must start with a letter and only contain letters, numbers, and underscores.",
		"Reserved Luau keywords cannot be used as identifiers.",
	),
	noReservedIdentifier: error("Cannot use identifier reserved for compiler internal usage."),
	noReservedClassFields: error("Cannot use class field reserved for compiler internal usage."),
	noClassMetamethods: error("Metamethods cannot be used in class definitions!"),

	// banned statements
	noForInStatement: error("for-in loop statements are not supported!"),
	noLabeledStatement: error("labels are not supported!"),
	noDebuggerStatement: error("`debugger` is not supported!"),

	// banned expressions
	noNullLiteral: error("`null` is not supported!", suggestion("Use `undefined` instead.")),
	noPrivateIdentifier: error("Private identifiers are not supported!"),
	noTypeOfExpression: error(
		"`typeof` operator is not supported!",
		suggestion("Use `typeIs(value, type)` or `typeOf(value)` instead."),
	),
	noRegex: error("Regular expressions are not supported!"),
	noBigInt: error("BigInt literals are not supported!"),

	// banned features
	noAny: error("Using values of type `any` is not supported!", suggestion("Use `unknown` instead.")),
	noVar: error("`var` keyword is not supported!", suggestion("Use `let` or `const` instead.")),
	noGetterSetter: error("Getters and Setters are not supported!", issue(457)),
	noEqualsEquals: error("operator `==` is not supported!", suggestion("Use `===` instead.")),
	noExclamationEquals: error("operator `!=` is not supported!", suggestion("Use `!==` instead.")),
	noComma: error("operator `,` is not supported!"),
	noEnumMerging: error("Enum merging is not supported!"),
	noNamespaceMerging: error("Namespace merging is not supported!"),
	noSpreadDestructuring: error("Operator `...` is not supported for destructuring!"),
	noFunctionExpressionName: error("Function expression names are not supported!"),
	noPrecedingSpreadElement: error("Spread element must come last in a list of arguments!"),
	noDestructureAssignmentExpression: error(
		"Cannot destructure LuaTuple<T> expression outside of an ExpressionStatement!",
	),
	noExportAssignmentLet: error("Cannot use `export =` on a `let` variable!", suggestion("Use `const` instead.")),
	noGlobalThis: error("`globalThis` is not supported!"),
	noArguments: error("`arguments` is not supported!"),
	noPrototype: error("`prototype` is not supported!"),
	noSuperProperty: error("super properties are not supported!"),
	noNonNumberStringRelationOperator: error("Relation operators can only be used on number or string types!"),
	noInstanceMethodCollisions: error("Static methods cannot use the same name as instance methods!"),
	noStaticMethodCollisions: error("Instance methods cannot use the same name as static methods!"),
	noUnaryPlus: error("Unary `+` is not supported!", suggestion("Use `tonumber(x)` instead.")),
	noNonNumberUnaryMinus: error("Unary `-` is only supported for number types!"),
	noAwaitForOf: error("`await` is not supported in for-of loops!"),
	noAsyncGeneratorFunctions: error("Async generator functions are not supported!"),
	noNonStringModuleSpecifier: error("Module specifiers must be a string literal."),
	noIterableIteration: error("Iterating on Iterable<T> is not supported! You must use a more specific type."),
	noLuaTupleInTemplateExpression: error(
		"Can't use LuaTuple<T> in a template literal expression!",
		suggestion("Did you mean to add `[0]`?"),
	),
	noMixedTypeCall: error(
		"Attempted to call a function with mixed types! All definitions must either be a method or a callback.",
	),
	noIndexWithoutCall: error(
		"Cannot index a method without calling it!",
		suggestion("Use the form `() => a.b()` instead of `a.b`."),
	),

	// macro methods
	noOptionalMacroCall: error(
		"Macro methods can not be optionally called!",
		suggestion("Macros always exist. Use a normal call."),
	),
	noConstructorMacroWithoutNew: error("Cannot index a constructor macro without using the `new` operator!"),
	noMacroExtends: error("Cannot extend from a macro class!"),
	noMacroUnion: error("Macro cannot be applied to a union type!"),
	noMacroObjectSpread: error(
		"Macro classes cannot be used in an object spread!",
		suggestion("Did you mean to use an array spread? `[ ...exp ]`"),
	),
	noVarArgsMacroSpread: error("Macros which use variadric arguments do not support spread expressions!", issue(1149)),

	// import/export
	noNonModule: error(
		"File does not have an import or export statement!",
		suggestion("Add `export {};` as the first line."),
		issue(1043),
	),
	noModuleSpecifierFile: error("Could not find file for import. Did you forget to `npm install`?"),
	noInvalidModule: error("You can only use npm scopes that are listed in your typeRoots."),
	noUnscopedModule: error("You cannot use modules directly under node_modules."),
	noNonModuleImport: error("Cannot import a non-ModuleScript!"),
	noIsolatedImport: error("Attempted to import a file inside of an isolated container from outside!"),

	// roact jsx
	invalidJsxFactory: error("compilerOptions.jsxFactory must be `Roact.createElement`!"),
	invalidJsxFragmentFactory: error("compilerOptions.jsxFragmentFactory must be `Roact.createFragment`!"),
	noRoactInheritance: error(
		"Composition is preferred over inheritance with Roact components.",
		"More info: https://reactjs.org/docs/composition-vs-inheritance.html",
	),
	noSuperPropertyCallRoactComponent: error("`super` is not supported inside Roact components!"),
	missingSuperConstructorRoactComponent: error(
		"`super(props)` must be the first statement of the constructor in a Roact component!",
	),
	noJsxText: error("JSX text is not supported!"),

	// semantic
	expectedMethodGotFunction: error("Attempted to assign non-method where method was expected."),
	expectedFunctionGotMethod: error("Attempted to assign method where non-method was expected."),

	// files
	noRojoData: errorWithContext((path: string) => [
		`Could not find Rojo data. There is no $path in your Rojo config that covers ${path}`,
	]),
	incorrectFileName: (originalFileName: string, suggestedFileName: string, fullPath: string) =>
		errorText(
			`Incorrect file name: \`${originalFileName}\`!`,
			`Full path: ${fullPath}`,
			suggestion(`Change \`${originalFileName}\` to \`${suggestedFileName}\`.`),
		),
	rojoPathInSrc: (partitionPath: string, suggestedPath: string) =>
		errorText(
			`Invalid Rojo configuration. $path fields should be relative to out directory.`,
			suggestion(`Change the value of $path from "${partitionPath}" to "${suggestedPath}".`),
		),
};

export const warnings = {
	truthyChange: (checksStr: string) => warning(`Value will be checked against ${checksStr}`),
	stringOffsetChange: (text: string) => warning(`String macros no longer offset inputs: ${text}`),
	transformerNotFound: (name: string, err: unknown) =>
		warningText(
			`Transformer \`${name}\` was not found!`,
			"More info: " + err,
			suggestion("Did you forget to install the package?"),
		),
	runtimeLibUsedInReplicatedFirst: warning(
		"This statement would generate a call to the runtime library. The runtime library should not be used from ReplicatedFirst.",
	),
};
