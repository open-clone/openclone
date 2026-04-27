import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloneLoader } from '../dist/lib/clone-loader.js';

test('listClones can be used without lazy-fetch side effects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'openclone-root-'));
  const home = await mkdtemp(join(tmpdir(), 'openclone-home-'));
  await mkdir(join(root, 'clones', 'alice'), { recursive: true });
  await mkdir(join(root, 'scripts'), { recursive: true });
  await writeFile(join(root, 'scripts', 'fetch-clone-knowledge.sh'), '#!/usr/bin/env bash\nmkdir -p "$PWD/clones/$1/knowledge"\n');
  await writeFile(join(root, 'clones', 'alice', 'persona.md'), `---\nname: alice\ndisplay_name: Alice\ntagline: Tag\ncategories: [vc]\ncreated: 2026-01-01\nvoice_traits: [direct]\n---\n\n## Persona\nAlice\n\n## Speaking style\n- terse\n\n## Guidelines\n**Always:**\n- test\n\n**Never:**\n- fake\n\n## Background\n- built-in\n`);

  const loader = new CloneLoader({ rootDir: root, opencloneDir: home, lazyFetchBuiltInKnowledge: false });
  const clones = await loader.listClones();
  assert.equal(clones.length, 1);
  await assert.rejects(() => access(join(root, 'clones', 'alice', 'knowledge')));
});
