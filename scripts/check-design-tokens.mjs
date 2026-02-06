import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');

const TARGET_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);

const FILE_ALLOWLIST = new Set([
  'src/app/globals.css',
  'src/features/auth/lib/email-templates.ts',
  'src/features/auth/components/google-sign-in-button.tsx',
  'src/features/shared/components/common/auth-modal.tsx',
]);

const FORBIDDEN_PATTERNS = [
  {
    name: '硬编码十六进制颜色',
    regex: /#[0-9a-fA-F]{3,8}\b/g,
  },
  {
    name: '硬编码 rgb/rgba 颜色',
    regex: /\brgba?\s*\((?!\s*var\(--)/g,
  },
  {
    name: '硬编码 oklch 颜色',
    regex: /\boklch\s*\(/g,
  },
  {
    name: '颜色色阶类（slate/gray/...）',
    regex: /\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-[0-9]{2,3})?(?:\/[0-9]{1,3})?\b/g,
  },
  {
    name: '黑白透明色类',
    regex: /\b(?:bg|text|border|ring|fill|stroke)-(?:white|black)(?:\/[0-9]{1,3})?\b/g,
  },
];

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    if (!TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    files.push(fullPath);
  }
  return files;
}

function toRelative(fullPath) {
  return path.relative(projectRoot, fullPath).replace(/\\/g, '/');
}

function checkFile(relativePath) {
  if (FILE_ALLOWLIST.has(relativePath)) {
    return [];
  }

  const fullPath = path.join(projectRoot, relativePath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const violations = [];

  const lines = content.split('\n');
  lines.forEach((line, index) => {
    FORBIDDEN_PATTERNS.forEach(({ name, regex }) => {
      regex.lastIndex = 0;
      if (!regex.test(line)) {
        return;
      }

      violations.push({
        file: relativePath,
        line: index + 1,
        rule: name,
        snippet: line.trim().slice(0, 180),
      });
    });
  });

  return violations;
}

const allFiles = walk(srcRoot).map(toRelative).sort();
const violations = allFiles.flatMap((file) => checkFile(file));

if (violations.length > 0) {
  console.error(`发现 ${violations.length} 处设计令牌违规：`);
  violations.forEach((item) => {
    console.error(`- ${item.file}:${item.line} [${item.rule}] ${item.snippet}`);
  });
  process.exit(1);
}

console.log(`设计令牌检查通过，共扫描 ${allFiles.length} 个文件。`);
