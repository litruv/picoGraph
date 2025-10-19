const fs = require('fs');
const path = require('path');

const repository = process.env.GITHUB_REPOSITORY;
const authToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

if (!repository) {
  console.error('GITHUB_REPOSITORY is not defined.');
  process.exit(1);
}

const isoDate = new Date().toISOString().slice(0, 10);

async function fetchReleases() {
  if (!authToken) {
    return [];
  }

  const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=100`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'User-Agent': 'picoGraph-release-bot'
    }
  });

  if (!response.ok) {
    const message = await response.text();
    console.error(`Failed to fetch releases: ${response.status} ${message}`);
    return [];
  }

  return response.json();
}

function determineNextVersion(releases) {
  let index = 1;

  for (const release of releases) {
    const tag = typeof release.tag_name === 'string' ? release.tag_name.replace(/^v/, '') : '';
    const match = tag.match(/^(\d{4}-\d{2}-\d{2})-(\d{2})$/);

    if (match && match[1] === isoDate) {
      index = Math.max(index, Number.parseInt(match[2], 10) + 1);
    }
  }

  return `${isoDate}-${String(index).padStart(2, '0')}`;
}

function updateJson(filePath, version) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  data.version = version;

  if (data.packages && data.packages['']) {
    data.packages[''].version = version;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

(async () => {
  try {
    const releases = await fetchReleases();
    const version = determineNextVersion(releases);
    const root = process.cwd();

    updateJson(path.join(root, 'package.json'), version);
    updateJson(path.join(root, 'package-lock.json'), version);

    console.log(version);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
