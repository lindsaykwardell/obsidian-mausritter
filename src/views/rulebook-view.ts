import { ItemView, WorkspaceLeaf, MarkdownRenderer } from "obsidian";
import srdContent from "../data/srd-content";

export const RULEBOOK_VIEW_TYPE = "mausritter-rulebook";

interface Section {
	title: string;
	level: number;
	content: string;
	lineStart: number;
}

function parseSections(markdown: string): Section[] {
	const lines = markdown.split("\n");
	const sections: Section[] = [];
	let currentTitle = "";
	let currentLevel = 0;
	let currentLines: string[] = [];
	let currentLineStart = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const headingMatch = line.match(/^(#{1,4})\s+(.+)/);

		if (headingMatch) {
			// Save previous section
			if (currentTitle || currentLines.length > 0) {
				sections.push({
					title: currentTitle,
					level: currentLevel,
					content: currentLines.join("\n").trim(),
					lineStart: currentLineStart,
				});
			}
			currentTitle = headingMatch[2];
			currentLevel = headingMatch[1].length;
			currentLines = [line];
			currentLineStart = i;
		} else {
			currentLines.push(line);
		}
	}

	// Push last section
	if (currentTitle || currentLines.length > 0) {
		sections.push({
			title: currentTitle,
			level: currentLevel,
			content: currentLines.join("\n").trim(),
			lineStart: currentLineStart,
		});
	}

	return sections;
}

export class RulebookView extends ItemView {
	private sections: Section[] = [];
	private searchQuery = "";

	getViewType(): string {
		return RULEBOOK_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Mausritter Rulebook";
	}

	getIcon(): string {
		return "book-open";
	}

	async onOpen(): Promise<void> {
		this.sections = parseSections(srdContent);
		this.renderView();
	}

	private renderView(): void {
		const container = this.contentEl;
		container.empty();
		container.addClass("mausritter-rulebook-view");

		// Search bar
		const searchBar = container.createDiv({ cls: "mausritter-rulebook-search" });
		const searchInput = searchBar.createEl("input", {
			cls: "mausritter-rulebook-search-input",
			attr: { type: "text", placeholder: "Search rulebook..." },
		});
		searchInput.value = this.searchQuery;
		searchInput.addEventListener("input", () => {
			this.searchQuery = searchInput.value;
			this.renderResults(resultsEl);
		});

		// Results
		const resultsEl = container.createDiv({ cls: "mausritter-rulebook-results" });
		this.renderResults(resultsEl);
	}

	private renderResults(container: HTMLElement): void {
		container.empty();

		const query = this.searchQuery.trim().toLowerCase();

		if (!query) {
			// Show table of contents
			this.renderTOC(container);
			return;
		}

		const matches = this.sections.filter(s =>
			s.title.toLowerCase().includes(query) ||
			s.content.toLowerCase().includes(query)
		);

		if (matches.length === 0) {
			container.createDiv({
				cls: "mausritter-rulebook-no-results",
				text: "No results found.",
			});
			return;
		}

		container.createDiv({
			cls: "mausritter-rulebook-count",
			text: `${matches.length} section${matches.length !== 1 ? "s" : ""} found`,
		});

		for (const section of matches) {
			const card = container.createDiv({ cls: "mausritter-rulebook-card" });
			const titleEl = card.createDiv({ cls: "mausritter-rulebook-card-title" });
			titleEl.textContent = section.title;

			// Show content with markdown rendering
			const contentEl = card.createDiv({ cls: "mausritter-rulebook-card-content" });

			// Highlight matching snippet
			let displayContent = section.content;
			if (!section.title.toLowerCase().includes(query)) {
				// Find the matching line and show context around it
				const lines = section.content.split("\n");
				const matchIdx = lines.findIndex(l => l.toLowerCase().includes(query));
				if (matchIdx >= 0) {
					const start = Math.max(0, matchIdx - 1);
					const end = Math.min(lines.length, matchIdx + 10);
					displayContent = lines.slice(start, end).join("\n");
				}
			} else {
				// Title match - show first 10 lines
				const lines = section.content.split("\n");
				displayContent = lines.slice(0, 12).join("\n");
				if (lines.length > 12) displayContent += "\n...";
			}

			MarkdownRenderer.render(
				this.app,
				displayContent,
				contentEl,
				"",
				this
			);

			// Collapse/expand toggle
			let expanded = false;
			titleEl.addEventListener("click", () => {
				expanded = !expanded;
				contentEl.empty();
				const text = expanded ? section.content : displayContent;
				MarkdownRenderer.render(this.app, text, contentEl, "", this);
				card.toggleClass("mausritter-rulebook-card-expanded", expanded);
			});
		}
	}

	private renderTOC(container: HTMLElement): void {
		container.createDiv({
			cls: "mausritter-rulebook-hint",
			text: "Type to search, or browse sections below.",
		});

		for (const section of this.sections) {
			if (section.level > 2) continue; // Only show h1 and h2
			const item = container.createDiv({
				cls: `mausritter-rulebook-toc-item mausritter-rulebook-toc-h${section.level}`,
			});
			item.textContent = section.title;
			item.addEventListener("click", () => {
				this.searchQuery = section.title;
				this.renderView();
			});
		}
	}
}
