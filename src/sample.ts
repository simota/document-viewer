export const SAMPLE_MARKDOWN = `# Markdown Viewer

A beautiful **Markdown viewer** with _Mermaid diagram_ support.

---

## Features

- Live preview as you type
- Mermaid diagram rendering
- Syntax highlighting for code blocks
- Dark / Light theme toggle
- File open support

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

### Pie Chart

\`\`\`mermaid
pie title Tech Stack
    "TypeScript" : 40
    "CSS" : 30
    "HTML" : 15
    "Mermaid" : 15
\`\`\`

## Table

| Feature | Status | Notes |
|---------|--------|-------|
| Markdown rendering | ✅ | Full GFM support |
| Mermaid diagrams | ✅ | All diagram types |
| Syntax highlighting | ✅ | 190+ languages |
| Theme toggle | ✅ | Dark & Light |
| File open | ✅ | .md, .txt |

## Blockquote

> "The best way to predict the future is to invent it."
> — Alan Kay

## Task List

- [x] Set up project
- [x] Implement Markdown parser
- [x] Add Mermaid support
- [x] Style the interface
- [ ] Add more features

## Math-like Rendering

The formula for the area of a circle is \\\`A = πr²\\\`.

---

*Built with markdown-it, Mermaid, and highlight.js*
`;
