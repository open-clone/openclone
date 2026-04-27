import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloneLoader } from '../dist/lib/clone-loader.js';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'openclone-root-'));
  const home = await mkdtemp(join(tmpdir(), 'openclone-home-'));
  await mkdir(join(root, 'clones', 'alice', 'knowledge'), { recursive: true });
  await mkdir(join(home, 'clones', 'alice', 'knowledge'), { recursive: true });
  await writeFile(join(root, 'clones', 'alice', 'persona.md'), `---\nname: alice\ndisplay_name: Builtin Alice\ntagline: Builtin tag\ncategories: [vc, founder]\ncreated: 2026-01-01\nvoice_traits: [direct]\n---\n\n## Persona\nBuiltin\n\n## Speaking style\n- terse\n\n## Guidelines\n**Always:**\n- test\n\n**Never:**\n- fake\n\n## Background\n- built-in\n`);
  await writeFile(join(root, 'clones', 'alice', 'knowledge', '2026-01-01-built.md'), `---\ntopic: built\nsource_type: text\nfetched: 2026-01-01\n---\n\nBuilt in knowledge`);
  await writeFile(join(home, 'clones', 'alice', 'persona.md'), `---\nname: alice\ndisplay_name: User Alice\ntagline: User tag\ncategories: [expert]\ncreated: 2026-01-02\nvoice_traits:\n  - careful\n---\n\n## Persona\nUser\n\n## Speaking style\n- clear\n\n## Guidelines\n**Always:**\n- test\n\n**Never:**\n- fake\n\n## Background\n- user\n`);
  await writeFile(join(home, 'clones', 'alice', 'knowledge', '2026-02-01-user.md'), `---\ntopic: user\nsource_type: text\nfetched: 2026-02-01\n---\n\nUser knowledge`);
  return { root, home };
}

test('user persona shadows built-in while knowledge is additive', async () => {
  const { root, home } = await fixture();
  const loader = new CloneLoader({ rootDir: root, opencloneDir: home, lazyFetchBuiltInKnowledge: false });
  const clone = await loader.loadClone('alice');
  assert.equal(clone.origin, 'user');
  assert.equal(clone.displayName, 'User Alice');
  assert.deepEqual(clone.categories, ['expert']);
  assert.equal(clone.knowledge.length, 2);
  assert.deepEqual(clone.knowledge.map((k) => k.origin).sort(), ['built-in', 'user']);
});

test('invalid slugs are rejected', async () => {
  const { root, home } = await fixture();
  const loader = new CloneLoader({ rootDir: root, opencloneDir: home, lazyFetchBuiltInKnowledge: false });
  await assert.rejects(() => loader.loadClone('../alice'), /Invalid clone slug/);
});
