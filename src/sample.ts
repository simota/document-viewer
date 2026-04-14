export const SAMPLE_MARKDOWN = `# Markdown Viewer

A beautiful **Markdown viewer** with _Mermaid diagram_ support and ==extended syntax==.

---

## Features

- Live preview as you type
- Mermaid diagram rendering
- Syntax highlighting for code blocks
- Dark / Light theme toggle
- :rocket: Extended Markdown support

## GitHub Alerts

> [!NOTE]
> This viewer supports GitHub-style alerts — a widely adopted format for callouts.

> [!TIP]
> Use the sidebar to browse local Markdown files, and they will auto-reload on save.

> [!WARNING]
> Very large files may take a moment to render due to Mermaid diagram processing.

> [!IMPORTANT]
> All extended syntax features are built on the official markdown-it plugin ecosystem.

> [!CAUTION]
> Don't forget to save your work — the editor content is not persisted automatically.

## Custom Containers

:::tip Pro Tip
You can use custom containers for structured callouts in documentation.
:::

:::warning Attention
Containers support \`tip\`, \`warning\`, \`danger\`, \`info\`, and \`details\` types.
:::

:::details Click to expand
This content is hidden by default inside a \`<details>\` element.

You can put **any Markdown** here, including code:
\\\`\\\`\\\`js
console.log('Hello from details!');
\\\`\\\`\\\`
:::

## Math / LaTeX

Inline math: The famous equation $E = mc^2$ changed physics forever.

Display math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

The quadratic formula:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

## Footnotes

Markdown Viewer uses markdown-it[^1] as its core parser, with Mermaid[^2] for diagrams and KaTeX[^3] for math rendering.

[^1]: [markdown-it](https://github.com/markdown-it/markdown-it) — a fast and extensible Markdown parser.
[^2]: [Mermaid](https://mermaid.js.org/) — JavaScript-based diagramming tool.
[^3]: [KaTeX](https://katex.org/) — fast math typesetting library.

## Text Formatting

| Syntax | Result |
|--------|--------|
| \`==highlighted==\` | ==highlighted text== |
| \`H~2~O\` | H~2~O |
| \`x^2^\` | x^2^ |
| \`:smile:\` | :smile: |
| \`:tada:\` | :tada: |
| \`**bold**\` | **bold** |
| \`*italic*\` | *italic* |
| \`~~strikethrough~~\` | ~~strikethrough~~ |

## Definition List

Markdown
: A lightweight markup language for creating formatted text using a plain-text editor.

Mermaid
: A JavaScript-based tool for generating diagrams and charts from text definitions.

KaTeX
: A fast, easy-to-use library for rendering TeX math on the web.

## Code Example

\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

async function fetchUser(id: number): Promise<User> {
  const response = await fetch(\\\`/api/users/\\\${id}\\\`);
  if (!response.ok) {
    throw new Error(\\\`User \\\${id} not found\\\`);
  }
  return response.json();
}
\`\`\`

## Mermaid Diagrams

### Flowchart

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[Ship it! 🚀]
\`\`\`

### Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant App
    participant Server

    User->>App: Write Markdown
    App->>App: Parse & Render
    App->>User: Show Preview
    User->>App: Add Mermaid Block
    App->>Server: Render Diagram
    Server-->>App: SVG Output
    App->>User: Display Diagram
\`\`\`

## Table

| Feature | Status | Notes |
|---------|--------|-------|
| Markdown rendering | :white_check_mark: | Full GFM support |
| Mermaid diagrams | :white_check_mark: | All diagram types |
| Math / KaTeX | :white_check_mark: | Inline & display |
| GitHub Alerts | :white_check_mark: | 5 alert types |
| Footnotes | :white_check_mark: | Clickable refs |
| Highlight / Sub / Sup | :white_check_mark: | Extended formatting |
| Emoji shortcodes | :white_check_mark: | :tada: |
| Custom containers | :white_check_mark: | 5 container types |
| Heading anchors | :white_check_mark: | Hover to see # |

## Blockquote

> "The best way to predict the future is to invent it."
> — Alan Kay

## Task List

- [x] Core Markdown rendering
- [x] Mermaid diagrams
- [x] Math / KaTeX support
- [x] GitHub Alerts
- [x] Footnotes & extended formatting
- [x] Custom containers
- [x] Local file server with auto-reload
- [ ] Even more features coming...

---

*Built with markdown-it, Mermaid, KaTeX, and highlight.js*
`;
