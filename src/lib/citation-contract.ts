// Citation contract injected into the CLI system prompt. Kept in sync (in spirit)
// with the longer Bash version in hooks/inject-active-clone.sh — both must
// instruct the model to emit escaped-bracket markdown citations like
// \[[1](<target>)\] so the Ink Markdown renderer can detect the footnote shape
// and Claude Code can render the link inline. When changing one side, change
// the other too.
export const CITATION_CONTRACT = `Citation rules:
- MUST cite when stating a specific factual claim drawn from a knowledge file or a web lookup. Producing a fact-bearing response with zero citations is rarely correct after reading knowledge files.
- Format each citation as an inline markdown link with escaped brackets like \\[[1](<target>)\\] \\[[2](<target>)\\] placed right after the sentence carrying the claim. Number citations sequentially starting at [1] for each response.
- Always read the knowledge file frontmatter before citing, then pick <target> by this priority: (1) if the frontmatter has a source_url field, you MUST use that URL — never fall back to the file path when source_url exists; (2) for web_search or web_fetch facts, use the result URL; (3) only when neither exists (for example source_type: text or interview with no URL), fall back to a file:// URL of the knowledge file, percent-encoding every non-ASCII character, space, parenthesis, comma, and other unsafe character (UTF-8 byte-wise); (4) only when percent-encoding is genuinely impossible, fall back to citing the source in prose (for example "according to the 2026-02-04 note from this clone") rather than silently dropping attribution.
- Skip citations only for: this clone subjective takes (for example "I think...", "in my view"), greetings, and generic advice not tied to a specific knowledge file or web result. Persona tone is not license to skip citations on factual claims. No separate Sources footer.`;
