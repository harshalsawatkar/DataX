import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = path.resolve(sourceRoot, '..');
const viteConfigPath = path.join(projectRoot, 'vite.config.js');

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return /\.(?:js|jsx|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe('frontend secret lock', () => {
  it('exposes only VITE-prefixed variables through Vite', () => {
    const config = readFileSync(viteConfigPath, 'utf8');
    expect(config).toMatch(/envPrefix:\s*\[\s*['"]VITE_['"]\s*\]/);
  });

  it('keeps local environment files out of version control and templates blank', () => {
    const ignore = readFileSync(path.join(projectRoot, '.gitignore'), 'utf8');
    const example = readFileSync(path.join(projectRoot, '.env.example'), 'utf8');
    const trackedEnv = execFileSync('git', ['ls-files', '--', '.env'], {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();

    expect(ignore).toMatch(/^\.env$/m);
    expect(ignore).toMatch(/^!\.env\.example$/m);
    expect(trackedEnv).toBe('');
    for (const key of ['DATAX_MASTER_KEY', 'POSTGRES_PASSWORD', 'DATAX_JWT_SECRET', 'AZURE_OPENAI_API_KEY']) {
      expect(example).toMatch(new RegExp(`^${key}=$`, 'm'));
    }
  });

  it('reads only public VITE variables in browser code', () => {
    const invalidReads = [];
    for (const file of sourceFiles(sourceRoot)) {
      const source = readFileSync(file, 'utf8');
      const propertyAccess = /import\.meta\.env(?:\?\.)?\.([A-Za-z_$][\w$]*)/g;
      const bracketAccess = /import\.meta\.env\s*\[\s*['"]([^'"]+)['"]\s*\]/g;
      for (const match of source.matchAll(propertyAccess)) {
        if (!match[1].startsWith('VITE_')) invalidReads.push(`${file}: ${match[1]}`);
      }
      for (const match of source.matchAll(bracketAccess)) {
        if (!match[1].startsWith('VITE_')) invalidReads.push(`${file}: ${match[1]}`);
      }
    }
    expect(invalidReads).toEqual([]);
  });

  it('contains no credential-bearing static literals in frontend source', () => {
    const forbiddenLiterals = [
      /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
      /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
      /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
      /\b(?:pcsk_|sk-(?:live|proj|ant)-)[A-Za-z0-9_-]{20,}\b/,
      /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
      /['"][A-Za-z][A-Za-z0-9+.-]*:\/\/[^'"\s/:@]+:[^'"\s/@]+@/,
      /jdbc:sap:\/\/[A-Za-z0-9.-]+:\d+\?[^'"\s]*user=[A-Za-z0-9_]+/i,
    ];
    const findings = [];
    for (const file of sourceFiles(sourceRoot)) {
      const source = readFileSync(file, 'utf8');
      if (forbiddenLiterals.some((pattern) => pattern.test(source))) findings.push(file);
    }
    expect(findings).toEqual([]);
  });

  it('uses an explicitly offline SAP sandbox instead of preset live credentials', () => {
    const connectSource = readFileSync(path.join(sourceRoot, 'pages', 'ConnectSourcePage.jsx'), 'utf8');
    expect(connectSource).not.toMatch(/setPassword\(\s*['"][^'"]{8,}['"]\s*\)/);
    expect(connectSource).toContain('Load Certified SAP Sandbox Dataset');
    expect(connectSource).toContain('Offline preview only');
  });
});
