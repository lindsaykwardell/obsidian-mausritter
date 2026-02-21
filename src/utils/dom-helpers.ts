export function el<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	attrs?: Record<string, string>,
	children?: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tag);
	if (attrs) {
		for (const [key, value] of Object.entries(attrs)) {
			if (key === "class") {
				element.className = value;
			} else {
				element.setAttribute(key, value);
			}
		}
	}
	if (children) {
		for (const child of children) {
			if (typeof child === "string") {
				element.appendChild(document.createTextNode(child));
			} else {
				element.appendChild(child);
			}
		}
	}
	return element;
}

export function button(
	text: string,
	onClick: () => void,
	cls?: string
): HTMLButtonElement {
	const btn = el("button", cls ? { class: cls } : undefined, [text]);
	btn.addEventListener("click", onClick);
	return btn;
}

export function div(
	cls: string,
	children?: (HTMLElement | string)[]
): HTMLDivElement {
	return el("div", { class: cls }, children);
}

export function span(
	cls: string,
	text?: string
): HTMLSpanElement {
	return el("span", { class: cls }, text ? [text] : undefined);
}
