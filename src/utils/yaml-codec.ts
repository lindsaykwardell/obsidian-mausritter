import * as yaml from "js-yaml";
import { MarkdownView, TFile, Vault } from "obsidian";

export function parseYaml<T>(source: string): T | null {
	try {
		const trimmed = source.trim();
		if (!trimmed) return null;
		return yaml.load(trimmed) as T;
	} catch {
		return null;
	}
}

export function serializeYaml<T>(data: T): string {
	return yaml.dump(data, {
		indent: 2,
		lineWidth: -1,
		noRefs: true,
		sortKeys: false,
	});
}

export function updateCodeBlock(
	view: MarkdownView,
	sectionInfo: { lineStart: number; lineEnd: number },
	newContent: string
): void {
	const editor = view.editor;
	// lineStart is the ``` fence line, lineEnd is the closing ``` fence line
	// We replace everything between them (exclusive of the fences themselves)
	const from = { line: sectionInfo.lineStart + 1, ch: 0 };
	const to = { line: sectionInfo.lineEnd, ch: 0 };
	editor.replaceRange(newContent, from, to);
}

/** Detect if a code block source is a cross-file reference */
export function getSourceReference(source: string): string | null {
	const data = parseYaml<{ source?: string }>(source);
	if (data && typeof data.source === "string" && Object.keys(data).length === 1) {
		return data.source;
	}
	return null;
}

/** Extract the content of a specific code block type from file text */
export function extractCodeBlockContent(fileText: string, blockType: string): string | null {
	const regex = new RegExp("```" + blockType + "\\s*\\n([\\s\\S]*?)\\n```", "m");
	const match = fileText.match(regex);
	return match ? match[1] : null;
}

/** Replace the content of a specific code block type in file text */
export function replaceCodeBlockContent(fileText: string, blockType: string, newContent: string): string {
	const regex = new RegExp("(```" + blockType + "\\s*\\n)[\\s\\S]*?(\\n```)", "m");
	return fileText.replace(regex, `$1${newContent}$2`);
}
