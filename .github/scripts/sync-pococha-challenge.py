"""Mirror the published Sites HTML without executing remote source code."""
import argparse
import hashlib
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

PROJECT = 'appgprj_6ac5d38d4a1c819198d391565430e75d'
SOURCE = 'https://pococha-challenge.freefreelife2000.chatgpt.site/github-export.json'
PUBLIC = 'https://pococha2026.github.io/pococha-answers/'
TARGET = Path('pococha-answers/index.html')
LEGACY_PUBLIC = 'https://pococha2026.github.io/pococha-challenge/'
LEGACY_TARGET = Path('pococha-challenge/index.html')
STATE = Path('.github/state/pococha-challenge-sync.json')
RELEASE = Path('.github/state/pococha-challenge-release.json')
LIMIT = 4 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def fetch(url):
    request = Request(url, headers={'User-Agent': 'PocochaChallengeSync/1.0', 'Cache-Control': 'no-cache'})
    with urlopen(request, timeout=30) as response:
        if response.status != 200 or urlparse(response.url).hostname != urlparse(url).hostname:
            raise ValueError('Expected an unredirected successful response from the configured host.')
        data = response.read(LIMIT + 1)
        if len(data) > LIMIT:
            raise ValueError('Response exceeded the maximum sync payload size.')
        return data


def validate(payload):
    if payload.get('schema') != 1 or payload.get('projectId') != PROJECT or payload.get('file') != 'index.html':
        raise ValueError('Export identity or schema is invalid.')
    content = payload.get('content')
    checksum = payload.get('sha256')
    if not isinstance(content, str) or not isinstance(checksum, str) or not re.fullmatch(r'[0-9a-f]{64}', checksum):
        raise ValueError('Missing HTML or SHA-256.')
    data = content.encode('utf-8')
    if not 1000 <= len(data) <= LIMIT or digest(data) != checksum:
        raise ValueError('Export content and SHA-256 do not match.')
    required = ['<!doctype html>', '<h1>ポコチャレ解答集</h1>', f'name="pococha-sync-project" content="{PROJECT}"',
                'id="month"', 'id="departments"', 'id="sharePage"', '</html>']
    if any(value not in content for value in required):
        raise ValueError('The export is not a complete Pococha Challenge application.')
    return data, checksum


def read_release():
    release = json.loads(RELEASE.read_text(encoding='utf-8'))
    if release.get('schema') != 1 or release.get('projectId') != PROJECT or release.get('deploymentStatus') != 'succeeded':
        raise ValueError('A successful Sites publication receipt is required.')
    for field in ('versionId', 'deploymentId'):
        if not isinstance(release.get(field), str) or not release[field].strip():
            raise ValueError(f'Missing publication receipt field: {field}')
    if not isinstance(release.get('sourceCommit'), str) or not re.fullmatch(r'[0-9a-f]{40}', release['sourceCommit']):
        raise ValueError('The publication source commit is invalid.')
    if not isinstance(release.get('sha256'), str) or not re.fullmatch(r'[0-9a-f]{64}', release['sha256']):
        raise ValueError('The publication checksum is invalid.')
    return release


def output(name, value):
    value = str(value).lower() if isinstance(value, bool) else str(value)
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as stream:
            stream.write(f'{name}={value}\n')
    print(f'{name}={value}')


def public_matches(checksum):
    try:
        return digest(fetch(f'{PUBLIC}?sync={checksum}')) == checksum
    except Exception:
        return False


def legacy_redirect():
    return ('''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ポコチャレ解答集</title>
<link rel="canonical" href="https://pococha2026.github.io/pococha-answers/">
<script>
(() => {
  try {
    const id = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('pococha_challenge_vid='))?.slice('pococha_challenge_vid='.length);
    if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      document.cookie = 'pococha_challenge_vid=' + id.toLowerCase() + '; Path=/pococha-answers/; Max-Age=31536000; SameSite=Lax; Secure';
    }
  } catch {}
  location.replace('https://pococha2026.github.io/pococha-answers/' + location.search + location.hash);
})();
</script>
<meta http-equiv="refresh" content="0;url=https://pococha2026.github.io/pococha-answers/">
</head>
<body><a href="https://pococha2026.github.io/pococha-answers/">ポコチャレ解答集へ移動</a></body>
</html>
''').encode('utf-8')


def legacy_matches():
    try:
        return digest(fetch(f'{LEGACY_PUBLIC}?sync={digest(legacy_redirect())}')) == digest(legacy_redirect())
    except Exception:
        return False


def replace_file(target, data):
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix('.html.sync-tmp')
    temporary.write_bytes(data)
    temporary.replace(target)


def sync(payload):
    data, checksum = validate(payload)
    state = json.loads(STATE.read_text(encoding='utf-8'))
    if state.get('projectId') != PROJECT:
        raise ValueError('Sync baseline belongs to a different project.')
    previous_target = state.get('target', str(LEGACY_TARGET))
    if previous_target not in (str(LEGACY_TARGET), str(TARGET)):
        raise ValueError('Sync baseline uses an unexpected destination.')
    redirect = legacy_redirect()
    legacy = LEGACY_TARGET.read_bytes() if LEGACY_TARGET.exists() else None
    current = TARGET.read_bytes() if TARGET.exists() else None
    if previous_target == str(LEGACY_TARGET):
        if legacy is None or digest(legacy) not in (state.get('sha256'), checksum):
            raise ValueError('The old GitHub page was edited independently. No files were overwritten.')
    else:
        if current is None:
            raise ValueError('The synchronized destination was removed independently. No files were overwritten.')
        if legacy is None or digest(legacy) != state.get('legacySha256'):
            raise ValueError('The old URL redirect was edited independently. No files were overwritten.')
    if current is not None and digest(current) not in (state.get('sha256'), checksum):
        raise ValueError('The new GitHub page was edited independently. No files were overwritten.')
    changed = current != data or legacy != redirect
    next_state = {
        'schema': 1, 'projectId': PROJECT, 'sha256': checksum,
        'target': str(TARGET), 'legacyTarget': str(LEGACY_TARGET),
        'legacySha256': digest(redirect),
    }
    if current != data:
        replace_file(TARGET, data)
    if legacy != redirect:
        replace_file(LEGACY_TARGET, redirect)
    state_changed = state != next_state
    if state_changed:
        STATE.write_text(json.dumps(next_state, indent=2) + '\n', encoding='utf-8')
    output('changed', changed or state_changed)
    output('sha256', checksum)
    return checksum


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--export-file', type=Path, help='Use a local export for validation or a controlled initial run.')
    parser.add_argument('--offline', action='store_true', help='Skip the public URL check during local validation.')
    parser.add_argument('--verify-public', action='store_true')
    args = parser.parse_args()
    if args.verify_public:
        checksum = digest(TARGET.read_bytes())
        for attempt in range(24):
            if public_matches(checksum) and legacy_matches():
                print('GitHub Pages serves the exact synchronized HTML and the old URL redirect.')
                return
            if attempt < 23:
                time.sleep(10)
        raise RuntimeError('The repository is synchronized, but GitHub Pages publication has not been confirmed.')
    release = read_release()
    payload = json.loads(args.export_file.read_text(encoding='utf-8') if args.export_file else fetch(f"{SOURCE}?release={release['sha256']}"))
    _, checksum = validate(payload)
    if checksum != release['sha256']:
        raise ValueError('The live Sites export does not match the notified publication; no files were overwritten.')
    checksum = sync(payload)
    output('rebuild', False if args.offline else not (public_matches(checksum) and legacy_matches()))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Sync stopped: {error}', file=sys.stderr)
        sys.exit(1)
