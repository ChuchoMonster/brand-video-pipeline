// Validation for the pipeline's file contracts. The repo is mostly a skill
// plus a HyperFrames composition, so these tests check the agreements the
// skill relies on rather than runtime code: brand.json <-> brand.css, the
// "no literal colors or fonts in template.css" rule, the layout system, and
// that the composition's timeline is registered and its scripts parse.
// No network, no rendering. Run: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const COMPOSITIONS = ["template-16x9", "brands/coldstart/render"];
const BRANDS = readdirSync(join(ROOT, "brands")).filter((d) => existsSync(join(ROOT, "brands", d, "brand.json")));

const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const norm = (v) => v.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").trim();

function cssCustomProps(css) {
  const props = {};
  for (const [, name, value] of stripCssComments(css).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) props[name] = norm(value);
  return props;
}

function inlineScripts(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
}

function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  return Object.fromEntries(
    m[1].split("\n").filter((l) => /^\w[\w-]*:/.test(l)).map((l) => {
      const i = l.indexOf(":");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
}

test("skill file has valid frontmatter", () => {
  const fm = frontmatter(read("skill/SKILL.md"));
  assert.ok(fm, "SKILL.md must start with a --- frontmatter block");
  assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, "name must be kebab-case");
  assert.ok(fm.description && fm.description.length >= 20, "description must be present");
});

test("every JSON file parses", () => {
  const files = [
    "template-16x9/hyperframes.json", "template-16x9/meta.json",
    "brands/coldstart/render/hyperframes.json", "brands/coldstart/render/meta.json",
    ...BRANDS.flatMap((b) => ["brand.json", "css-variables.json", "type-styles.json"].map((f) => `brands/${b}/${f}`)),
  ];
  for (const f of files) assert.doesNotThrow(() => JSON.parse(read(f)), f);
});

test("brand.json has the fields the skill reads", () => {
  assert.ok(BRANDS.length > 0);
  for (const slug of BRANDS) {
    const b = JSON.parse(read(`brands/${slug}/brand.json`));
    assert.equal(b.slug, slug, "slug must match the brand directory");
    assert.ok(b.name && b.source_url?.startsWith("https://"), `${slug}: name and source_url`);
    assert.ok(b.fonts?.display?.family && b.fonts?.body?.family, `${slug}: display and body fonts`);
    assert.ok(b.voice?.tone && b.voice?.audience, `${slug}: voice guide`);
    for (const key of Object.keys(b.tokens)) assert.match(key, /^--brand-[a-z0-9-]+$/, `${slug}: token ${key}`);
  }
});

test("brand.css carries the brand.json token values", () => {
  // brand.css is the integration contract: the orchestrator writes brand.json's
  // tokens into it. Any token defined in both must hold the same value.
  const tokens = JSON.parse(read("brands/coldstart/brand.json")).tokens;
  for (const comp of COMPOSITIONS) {
    const css = cssCustomProps(read(`${comp}/styles/brand.css`));
    const shared = Object.keys(tokens).filter((k) => k in css);
    assert.ok(shared.length >= 15, `${comp}: expected most tokens to be present`);
    for (const k of shared) assert.equal(css[k], norm(tokens[k]), `${comp}: ${k}`);
  }
});

test("every --brand-* variable used is defined in brand.css", () => {
  for (const comp of COMPOSITIONS) {
    const defined = cssCustomProps(read(`${comp}/styles/brand.css`));
    const used = new Set();
    for (const f of ["styles/template.css", "styles/layouts.css", "index.html"]) {
      for (const [, name] of read(`${comp}/${f}`).matchAll(/var\((--brand-[\w-]+)/g)) used.add(name);
    }
    assert.ok(used.size > 0);
    for (const name of used) assert.ok(name in defined, `${comp}: ${name} is used but not defined in brand.css`);
  }
});

test("template.css and layouts.css stay brand-agnostic", () => {
  // README/template.css rule: no literal hex colors or font families outside brand.css.
  for (const comp of COMPOSITIONS) {
    for (const f of ["styles/template.css", "styles/layouts.css"]) {
      const css = stripCssComments(read(`${comp}/${f}`));
      assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, `${comp}/${f} has a literal hex color`);
      for (const [, value] of css.matchAll(/font-family\s*:\s*([^;]+);/g)) {
        assert.match(value.trim(), /^var\(--brand-[\w-]+\)$/, `${comp}/${f}: font-family ${value}`);
      }
    }
  }
});

test("every scene layout has CSS and an avatar slot", () => {
  for (const comp of COMPOSITIONS) {
    const html = read(`${comp}/index.html`);
    const layoutsCss = read(`${comp}/styles/layouts.css`);
    const scenes = [...html.matchAll(/class="scene layout-(\d+)"\s+data-layout="(\d+)"/g)];
    assert.ok(scenes.length >= 3, `${comp}: expected several scenes`);
    const slotBlock = html.match(/LAYOUT_AVATAR_SLOTS\s*=\s*{([\s\S]*?)};/)[1];
    const slots = new Set([...slotBlock.matchAll(/^\s*(\d+)\s*:/gm)].map((m) => m[1]));
    const used = [...scenes.map((m) => m[2]), ...[...html.matchAll(/avatarTo\((\d+)/g)].map((m) => m[1])];
    for (const [, cls, data] of scenes) assert.equal(cls, data, `${comp}: class layout-${cls} vs data-layout ${data}`);
    for (const n of used) {
      assert.match(layoutsCss, new RegExp(`\\.layout-${n}\\b`), `${comp}: .layout-${n} missing from layouts.css`);
      assert.ok(slots.has(n), `${comp}: no avatar slot for layout ${n}`);
    }
  }
});

test("timeline is registered under the composition id and scripts parse", () => {
  for (const comp of COMPOSITIONS) {
    const html = read(`${comp}/index.html`);
    const id = html.match(/data-composition-id="([^"]+)"/)[1];
    const scripts = inlineScripts(html);
    assert.ok(scripts.length > 0);
    for (const s of scripts) assert.doesNotThrow(() => new vm.Script(s), `${comp}: inline script does not parse`);
    assert.ok(scripts.some((s) => s.includes(`window.__timelines["${id}"] = tl`)),
      `${comp}: timeline must be registered as window.__timelines["${id}"]`);
  }
});

test("clips fit inside the composition duration", () => {
  for (const comp of COMPOSITIONS) {
    const html = read(`${comp}/index.html`);
    const total = Number(html.match(/data-composition-id="[^"]+"[\s\S]*?data-duration="([\d.]+)"/)[1]);
    const clips = [...html.matchAll(/class="clip"[\s\S]*?data-start="([\d.]+)"\s+data-duration="([\d.]+)"/g)];
    assert.ok(clips.length >= 3, `${comp}: expected avatar, voice and music clips`);
    for (const [, start, dur] of clips) assert.ok(Number(start) + Number(dur) <= total, `${comp}: clip ends after ${total}s`);
  }
});

test("local files referenced by the compositions exist", () => {
  // The avatar video is deliberately not committed (README: regenerate it with stage 5).
  const notCommitted = new Set(["assets/avatar.webm"]);
  for (const comp of COMPOSITIONS) {
    const html = read(`${comp}/index.html`);
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https?:/.test(u));
    for (const ref of refs) {
      const isStyle = ref.startsWith("styles/");
      // The bare template ships with an empty assets/ folder; only the brand copy carries media.
      if (!isStyle && (comp === "template-16x9" || notCommitted.has(ref))) continue;
      assert.ok(existsSync(join(ROOT, comp, ref)), `${comp}: ${ref} not found`);
    }
  }
});

test("tailwind snippets parse as JavaScript", () => {
  for (const slug of BRANDS) {
    const src = read(`brands/${slug}/tailwind.snippet.js`);
    assert.doesNotThrow(() => new vm.Script(src), slug);
  }
});
