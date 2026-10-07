#!/usr/bin/env node
// Validates the Cursor plugin: manifests, version sync, rule and skill front matter.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const fail = (message) => errors.push(message);
const NAME = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

function readJson(path) {
    try {
        return JSON.parse(readFileSync(join(root, path), "utf8"));
    } catch (error) {
        fail(`${path}: ${error.message}`);
        return {};
    }
}

/** Minimal YAML front matter reader: `key: value`, folded `>-` blocks and one nested level. */
function frontMatter(path) {
    const text = readFileSync(path, "utf8");
    const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (!match) {
        fail(`${path}: missing front matter`);
        return { data: {}, body: text };
    }
    const data = {};
    let key = null;
    let parent = null;
    for (const line of match[1].split("\n")) {
        const nested = /^  (\w[\w-]*):\s*(.*)$/.exec(line);
        const top = /^(\w[\w-]*):\s*(.*)$/.exec(line);
        if (top) {
            key = top[1];
            parent = null;
            const value = top[2].trim();
            if (value === "") {
                data[key] = {};
                parent = key;
            } else {
                data[key] = value === ">-" || value === ">" ? "" : value;
            }
        } else if (nested && parent) {
            data[parent][nested[1]] = nested[2].trim();
        } else if (key && line.startsWith("  ") && typeof data[key] === "string") {
            data[key] = `${data[key]} ${line.trim()}`.trim();
        }
    }
    return { data, body: text.slice(match[0].length) };
}

const pkg = readJson("package.json");
const version = pkg.version;
const market = readJson(".cursor-plugin/marketplace.json");

if (!NAME.test(market.name ?? "")) fail(`marketplace.json: bad name "${market.name}"`);
if (market.metadata?.version !== version) {
    fail(`marketplace.json: metadata.version ${market.metadata?.version} != package.json ${version}`);
}
const changelog = existsSync(join(root, "CHANGELOG.md")) ? readFileSync(join(root, "CHANGELOG.md"), "utf8") : "";
if (!changelog.includes(`## ${version}`)) fail(`CHANGELOG.md: no "## ${version}" section`);

for (const entry of market.plugins ?? []) {
    const source = entry.source ?? "";
    if (source.includes("..") || !source.startsWith("./")) fail(`marketplace.json: unsafe source "${source}"`);
    const dir = join(root, source);
    const manifestPath = join(source, ".cursor-plugin/plugin.json");
    if (!existsSync(join(root, manifestPath))) {
        fail(`${manifestPath}: missing`);
        continue;
    }
    const manifest = readJson(manifestPath);
    if (manifest.name !== entry.name) fail(`${manifestPath}: name "${manifest.name}" != marketplace "${entry.name}"`);
    if (!NAME.test(manifest.name ?? "")) fail(`${manifestPath}: bad name`);
    if (manifest.version !== version) fail(`${manifestPath}: version ${manifest.version} != ${version}`);
    for (const field of ["description", "license"]) {
        if (!manifest[field]) fail(`${manifestPath}: missing ${field}`);
    }

    const rulesDir = join(dir, "rules");
    const rules = existsSync(rulesDir) ? readdirSync(rulesDir).filter((file) => file.endsWith(".mdc")) : [];
    if (rules.length === 0) fail(`${source}: no rules`);
    for (const file of rules) {
        const path = join(rulesDir, file);
        const { data, body } = frontMatter(path);
        if (!data.description) fail(`${file}: missing description`);
        if (/\]\((?!https?:|#)[^)]+\)/.test(body)) fail(`${file}: relative links do not resolve inside .mdc`);
    }

    const skillsDir = join(dir, "skills");
    const skills = existsSync(skillsDir) ? readdirSync(skillsDir) : [];
    if (skills.length === 0) fail(`${source}: no skills`);
    for (const name of skills) {
        const path = join(skillsDir, name, "SKILL.md");
        if (!existsSync(path)) {
            fail(`skills/${name}: missing SKILL.md`);
            continue;
        }
        const { data, body } = frontMatter(path);
        if (data.name !== name) fail(`skills/${name}: front matter name "${data.name}" != directory`);
        const description = data.description ?? "";
        if (!description) fail(`skills/${name}: missing description`);
        if (description.length > 1024) fail(`skills/${name}: description is ${description.length} chars (max 1024)`);
        if (!/Use when/.test(description)) fail(`skills/${name}: description has no "Use when" trigger`);
        if (!data.license) fail(`skills/${name}: missing license`);
        if (data.metadata?.version !== version) {
            fail(`skills/${name}: metadata.version ${data.metadata?.version} != ${version}`);
        }
        if (body.split("\n").length > 500) fail(`skills/${name}: body over 500 lines`);
    }
}

if (errors.length > 0) {
    console.error(`Plugin validation failed:\n- ${errors.join("\n- ")}`);
    process.exit(1);
}
console.log(`Plugin OK (version ${version})`);
