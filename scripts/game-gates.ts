import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import catalog from '../catalog.json' with { type: 'json' };
import gates from '../docs/game-gates.json' with { type: 'json' };

/**
 * Computes which gate a game is actually at, from the artifacts on disk.
 *
 * progress.md is a claim; this is the check. The two disagreeing is the most
 * useful thing this script prints, because it means a session ended without
 * updating the log — the failure docs/game-process.md exists to prevent.
 *
 *   pnpm game:status [slug]    where every game really is
 *   pnpm game:check  <slug>    a verdict on advancing past the current gate
 *
 * Deliberately advisory. It reports and exits 0 for a game that is merely
 * unfinished; a non-zero exit means a rule in docs/building-a-game.md §3 is
 * actually broken, which is a different thing from work not being done yet.
 */

const root = fileURLToPath(new URL('..', import.meta.url));

interface Check {
  id: string;
  label: string;
  path?: string;
  must?: string;
  mustNot?: string;
  note?: string;
  check?: string;
}
interface Gate {
  id: string;
  label: string;
  summary: string;
  checks: Check[];
}
interface Invariant {
  id: string;
  label: string;
  grep: string;
  in: string;
  expect: string;
  why: string;
  except?: string[];
}

type Result = { ok: boolean; detail: string };

const GATES = gates.gates as Gate[];
const INVARIANTS = gates.invariants as Invariant[];

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.html']);

function read(rel: string): string | null {
  const full = path.join(root, rel);
  if (!existsSync(full) || !statSync(full).isFile()) return null;
  return readFileSync(full, 'utf8');
}

function walk(rel: string): string[] {
  const full = path.join(root, rel);
  if (!existsSync(full)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) out.push(...walk(child));
    else if (SOURCE_EXT.has(path.extname(entry.name))) out.push(child);
  }
  return out;
}

/** Every game we know about: the catalog, plus folders, plus not-yet-migrated specs. */
function knownSlugs(): string[] {
  const slugs = new Set<string>(catalog.games.map((g) => g.slug));
  const gamesDir = path.join(root, 'games');
  if (existsSync(gamesDir)) {
    for (const e of readdirSync(gamesDir, { withFileTypes: true })) {
      if (e.isDirectory()) slugs.add(e.name);
    }
  }
  // A pre-process brief still at docs/game-<slug>.md counts, but only for a
  // slug the platform actually knows about — docs/game-process.md is a process
  // document, not a game named "process".
  const demo = read('apps/shell/src/demo/demoData.ts') ?? '';
  const docsDir = path.join(root, 'docs');
  for (const f of readdirSync(docsDir)) {
    const slug = /^game-([a-z0-9-]+)\.md$/.exec(f)?.[1];
    if (slug && (slugs.has(slug) || new RegExp(`slug:\\s*'${slug}'`).test(demo))) slugs.add(slug);
  }
  return [...slugs].sort();
}

function runCheck(check: Check, slug: string): Result {
  if (check.check === 'catalog-entry') {
    const found = catalog.games.some((g) => g.slug === slug);
    return { ok: found, detail: found ? 'in catalog.json' : 'no entry in catalog.json' };
  }
  if (check.check === 'demo-placeholder-removed') {
    const demo = read('apps/shell/src/demo/demoData.ts');
    if (demo === null) return { ok: true, detail: 'demoData.ts not found — nothing to remove' };
    const still = new RegExp(`slug:\\s*'${slug}'`).test(demo);
    return { ok: !still, detail: still ? 'placeholder still in demoData.ts — the hub ships two cards' : 'placeholder removed' };
  }

  const rel = (check.path ?? '').replace('<slug>', slug);
  const full = path.join(root, rel);
  if (!existsSync(full)) return { ok: false, detail: `missing ${rel}` };
  if (!check.must && !check.mustNot) return { ok: true, detail: rel };

  const body = statSync(full).isFile() ? readFileSync(full, 'utf8') : '';
  if (check.must && !new RegExp(check.must, 'm').test(body)) {
    return { ok: false, detail: check.note ?? `${rel} does not match ${check.must}` };
  }
  if (check.mustNot && new RegExp(check.mustNot, 'm').test(body)) {
    return { ok: false, detail: check.note ?? `${rel} still matches ${check.mustNot}` };
  }
  return { ok: true, detail: rel };
}

function runInvariant(inv: Invariant, slug: string): Result {
  const dir = inv.in.replace('<slug>', slug);
  const exempt = (inv.except ?? []).map((e) => path.join('games', slug, e));
  const files = walk(dir).filter((f) => !exempt.includes(f));
  const re = new RegExp(inv.grep);
  const hits = files.filter((f) => re.test(readFileSync(path.join(root, f), 'utf8')));

  if (inv.expect === 'none') {
    return hits.length === 0
      ? { ok: true, detail: 'clean' }
      : { ok: false, detail: `${hits.length} file(s): ${hits.map((f) => path.basename(f)).join(', ')}` };
  }
  if (inv.expect.startsWith('only:')) {
    const allowed = inv.expect.slice('only:'.length);
    const strays = hits.filter((f) => path.basename(f) !== allowed);
    return strays.length === 0
      ? { ok: true, detail: hits.length ? `only ${allowed}` : 'no imports yet' }
      : { ok: false, detail: `also in ${strays.map((f) => path.basename(f)).join(', ')}` };
  }
  return { ok: true, detail: `unknown expectation "${inv.expect}"` };
}

/** What progress.md says about itself, so we can compare it with reality. */
function claimed(slug: string): { status: string | null; updated: string | null } {
  const body = read(`games/${slug}/docs/progress.md`);
  if (body === null) return { status: null, updated: null };
  const status = /\|\s*Status\s*\|\s*\*?\*?([^|*]+?)\*?\*?\s*\|/.exec(body)?.[1]?.trim() ?? null;
  const updated = /\|\s*Last updated\s*\|\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*\|/.exec(body)?.[1] ?? null;
  return { status, updated };
}

function lastCommitDate(rel: string): string | null {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], { cwd: root, encoding: 'utf8' });
    return out.trim() || null;
  } catch {
    return null;
  }
}

interface Report {
  slug: string;
  gateIndex: number;
  gate: Gate | null;
  failures: { gate: Gate; check: Check; result: Result }[];
  violations: { inv: Invariant; result: Result }[];
  divergences: string[];
}

function inspect(slug: string): Report {
  const failures: Report['failures'] = [];
  let gateIndex = GATES.length;

  for (const [i, gate] of GATES.entries()) {
    const failed = gate.checks
      .map((check) => ({ gate, check, result: runCheck(check, slug) }))
      .filter((r) => !r.result.ok);
    if (failed.length > 0) {
      failures.push(...failed);
      gateIndex = i;
      break;
    }
  }

  const violations = INVARIANTS.map((inv) => ({ inv, result: runInvariant(inv, slug) })).filter((v) => !v.result.ok);

  const divergences: string[] = [];
  const { status, updated } = claimed(slug);
  const reached = gateIndex === 0 ? null : GATES[gateIndex - 1];

  if (status !== null) {
    const shipped = status.toLowerCase().startsWith('shipped');
    if (shipped && gateIndex < GATES.length) {
      divergences.push(`progress.md says "${status}" but ${GATES[gateIndex]?.id} is not passed`);
    }
    if (!shipped && gateIndex === GATES.length) {
      divergences.push(`every gate passes but progress.md still says "${status}"`);
    }
  }

  const srcCommit = lastCommitDate(`games/${slug}/src`);
  if (srcCommit && updated && updated < srcCommit) {
    divergences.push(`src/ last committed ${srcCommit}, progress.md last updated ${updated} — the log was not updated after work landed`);
  }
  if (existsSync(path.join(root, 'games', slug, 'src')) && !existsSync(path.join(root, 'games', slug, 'docs'))) {
    divergences.push('has src/ but no docs/ — built outside the process');
  }
  if (existsSync(path.join(root, 'docs', `game-${slug}.md`))) {
    divergences.push(`brief still at docs/game-${slug}.md — move it to games/${slug}/docs/brief.md (§0 Step 3)`);
  }

  return { slug, gateIndex, gate: reached ?? null, failures, violations, divergences };
}

function label(report: Report): string {
  if (report.gateIndex === GATES.length) return 'Shipped — all gates passed';
  const next = GATES[report.gateIndex];
  const done = report.gateIndex === 0 ? 'nothing passed yet' : `through ${report.gate?.id}`;
  return `at ${next?.id} (${next?.label}) — ${done}`;
}

function printStatus(slugs: string[]): number {
  const reports = slugs.map(inspect);
  const width = Math.max(...reports.map((r) => r.slug.length), 4);

  console.log('');
  for (const r of reports) console.log(`  ${r.slug.padEnd(width)}  ${label(r)}`);
  console.log('');

  for (const r of reports) {
    if (r.failures.length === 0 && r.violations.length === 0 && r.divergences.length === 0) continue;
    console.log(`${r.slug}`);
    for (const f of r.failures) console.log(`  x  ${f.gate.id} ${f.check.label}: ${f.result.detail}`);
    for (const v of r.violations) console.log(`  !  ${v.inv.label}: ${v.result.detail}`);
    for (const d of r.divergences) console.log(`  ?  ${d}`);
    console.log('');
  }

  const broken = reports.filter((r) => r.violations.length > 0);
  if (broken.length > 0) {
    console.log('  !  = a rule in docs/building-a-game.md §3 is broken, not just unfinished.');
    return 1;
  }
  return 0;
}

function printCheck(slug: string): number {
  const r = inspect(slug);
  const next = GATES[r.gateIndex];

  console.log('');
  if (!next) {
    console.log(`${slug}: PASS — every gate passes.`);
  } else if (r.failures.length > 0) {
    console.log(`${slug}: FAIL — ${next.id} (${next.label}) is not met.`);
    console.log(`  ${next.summary}`);
    for (const f of r.failures) console.log(`  - ${f.check.label}: ${f.result.detail}`);
  } else {
    console.log(`${slug}: PASS — ${next.id} met.`);
  }

  if (r.violations.length > 0) {
    console.log('');
    console.log(`  CONCERNS — platform rules broken regardless of the gate:`);
    for (const v of r.violations) console.log(`  - ${v.inv.label}: ${v.result.detail}\n      ${v.inv.why}`);
  }
  if (r.divergences.length > 0) {
    console.log('');
    console.log('  CONCERNS — the documents disagree with the repo:');
    for (const d of r.divergences) console.log(`  - ${d}`);
  }
  console.log('');
  console.log('  Advisory. You decide whether to advance — see docs/game-process.md.');
  console.log('');
  return r.violations.length > 0 ? 1 : 0;
}

const [mode, slug] = process.argv.slice(2);

if (mode === 'check') {
  if (!slug) {
    console.error('usage: pnpm game:check <slug>');
    process.exit(2);
  }
  process.exit(printCheck(slug));
} else if (mode === 'status' || mode === undefined) {
  process.exit(printStatus(slug ? [slug] : knownSlugs()));
} else {
  console.error(`unknown mode "${mode}" — use status or check`);
  process.exit(2);
}
