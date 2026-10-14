import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { addSecurityManagement, COLLECTOR_ORIGIN, TRACKER_ID } from './security-tools.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  ['index.html', 'catalog'],
  ['yell-log.html', 'record'],
  ['yell-log-share.html', 'record'],
  ['profile-search/index.html', 'profile']
];
for (const [path, toolId] of pages) {
  const absolute = resolve(root, path);
  const html = await readFile(absolute, 'utf8');
  let input = html.replace(/<meta\b[^>]*\bid=["']pococha-script-security-policy["'][^>]*>\s*/gi, '');
  // Seal the original executable scripts by their exact bytes. Event listeners
  // set through JavaScript remain supported; HTML event attributes are blocked.
  // Fonts, images, inline styles, local storage and print files retain their
  // existing behavior because those resource types receive no new restrictions.
  if (!/<meta\b[^>]*http-equiv=["']Content-Security-Policy["']/i.test(input)) {
    const appScripts = [...input.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)]
      .filter(match => !/\bsrc\s*=/i.test(match[1]))
      .filter(match => !/\btype\s*=\s*["'](?:application\/(?:json|ld\+json)|text\/plain)["']/i.test(match[1]))
      .filter(match => !new RegExp(`\\bid=["']${TRACKER_ID}["']`).test(match[1]));
    const hashes = [...new Set(appScripts.map(match => `'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`))];
    const policy = [
      `script-src 'self' ${hashes.join(' ')}`,
      "script-src-attr 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      `connect-src 'self' ${COLLECTOR_ORIGIN}`
    ].join('; ');
    const tag = `<meta id="pococha-script-security-policy" http-equiv="Content-Security-Policy" content="${policy}">\n`;
    if (!/<meta\b[^>]*\bcharset\s*=[^>]*>/i.test(input)) throw new Error('Charset must precede the generated CSP.');
    input = input.replace(/(<meta\b[^>]*\bcharset\s*=[^>]*>)[\t\r\n ]*/i, `$1\n${tag}`);
  }
  const prepared = addSecurityManagement(input, toolId, { track: true, admin: true });
  if (html !== prepared) await writeFile(absolute, prepared);
  console.log(JSON.stringify({ path, toolId, changed: html !== prepared }));
}

// The offline app uses the same source. Its tracker only accepts the public
// canonical HTTP locations, so opening this ZIP's file never records a visit.
// Preserve every ZIP entry's metadata and all bytes other than index.html.
const zipResult = execFileSync('python3', ['-c', String.raw`
import json, pathlib, tempfile, zipfile
root = pathlib.Path(__import__('sys').argv[1])
archive = root / 'pococha-yell-log-offline.zip'
html = (root / 'yell-log.html').read_bytes()
with zipfile.ZipFile(archive) as original:
    entries = [(entry, original.read(entry.filename)) for entry in original.infolist()]
    comment = original.comment
if sum(entry.filename == 'index.html' for entry, data in entries) != 1:
    raise ValueError('Offline archive must contain exactly one index.html.')
if next(data for entry, data in entries if entry.filename == 'index.html') == html:
    print(json.dumps({'path': archive.name, 'changed': False}))
else:
    with tempfile.NamedTemporaryFile(dir=root, suffix='.zip', delete=False) as target:
        temporary = pathlib.Path(target.name)
    try:
        with zipfile.ZipFile(temporary, 'w') as updated:
            updated.comment = comment
            for entry, data in entries:
                updated.writestr(entry, html if entry.filename == 'index.html' else data)
        with zipfile.ZipFile(temporary) as check:
            if check.testzip() is not None or check.read('index.html') != html:
                raise ValueError('Offline archive verification failed.')
            for entry, data in entries:
                new_entry = check.getinfo(entry.filename)
                attributes = ['filename', 'date_time', 'compress_type', 'comment', 'extra',
                              'create_system', 'create_version', 'extract_version',
                              'internal_attr', 'external_attr']
                if any(getattr(entry, key) != getattr(new_entry, key) for key in attributes):
                    raise ValueError('Offline entry metadata changed.')
                if entry.filename != 'index.html' and check.read(entry.filename) != data:
                    raise ValueError('Unrelated offline entry bytes changed.')
        temporary.replace(archive)
    finally:
        temporary.unlink(missing_ok=True)
    print(json.dumps({'path': archive.name, 'changed': True}))
`, root], { encoding: 'utf8' });
process.stdout.write(zipResult);
