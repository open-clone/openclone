import test from 'node:test';
import assert from 'node:assert/strict';
import { renderActiveClonePrompt } from '../dist/lib/prompt-renderer.js';

test('renderer includes persona and caps selected knowledge', () => {
  const clone = {
    slug: 'alice',
    origin: 'built-in',
    personaPath: '/repo/clones/alice/persona.md',
    userKnowledgeDir: '/home/.openclone/clones/alice/knowledge',
    builtinKnowledgeDir: '/repo/clones/alice/knowledge',
    raw: '---\nname: alice\ndisplay_name: Alice\ntagline: Tag\ncategories: [vc]\n---\n\n## Persona\nAlice persona',
    frontmatter: {},
    body: '## Persona\nAlice persona',
    displayName: 'Alice',
    tagline: 'Tag',
    categories: ['vc'],
    primaryCategory: 'vc',
    knowledge: [
      { path: '/a/2026-01-01-old.md', origin: 'built-in', raw: '', frontmatter: {}, body: 'old apples', topic: 'old', dateKey: '2026-01-01' },
      { path: '/a/2026-02-01-new.md', origin: 'user', raw: '', frontmatter: {}, body: 'new bananas', topic: 'new', dateKey: '2026-02-01' },
    ],
  };
  const rendered = renderActiveClonePrompt(clone, { question: 'bananas', maxKnowledgeFiles: 1 });
  assert.match(rendered.system, /Alice persona/);
  assert.equal(rendered.knowledge.length, 1);
  assert.equal(rendered.knowledge[0].dateKey, '2026-02-01');
});
