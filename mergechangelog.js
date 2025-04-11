#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// Config
const branches = ['prod', 'uat'];
const outputFile = 'UNIFIED_CHANGELOG.md';
const daysToInclude = 30;

function fetchAllTags() {
  console.log('Fetching all tags...');
  execSync(`git fetch --tags`, { stdio: 'inherit' });
}

function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
}

function checkoutBranch(branchName) {
  console.log(`Checking out branch: ${branchName}`);
  execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
}

function parseTags() {
  const tagsOutput = execSync(`git for-each-ref --sort=-creatordate --format '%(refname:short)|%(creatordate:short)' refs/tags`, { encoding: 'utf8' });
  const tags = tagsOutput.trim().split('\n').map(line => {
    const [tag, date] = line.split('|');
    const versionMatch = tag.match(/v(\d+\.\d+\.\d+)(-\w+)?/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    const commit = execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();

    return { tag, version, date, commit };
  });

  return tags;
}

function getVersionForCommit(commitHash, tags) {
  for (const tag of tags) {
    const isAncestor = execSync(`git merge-base --is-ancestor ${commitHash} ${tag.commit}; echo $?`, { encoding: 'utf8' }).trim() === '0';
    if (isAncestor) return { version: tag.version, date: tag.date };
  }
  return { version: 'unreleased', date: '' };
}

function getCommits(branch, tags) {
  checkoutBranch(branch);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysToInclude);
  const since = sinceDate.toISOString().split('T')[0];

  const output = execSync(`git log --since="${since}" --format="%H|%h|%ad|%s" --date=short`, { encoding: 'utf8' });

  return output.trim().split('\n').filter(Boolean).map(line => {
    const [fullHash, shortHash, date, ...msgParts] = line.split('|');
    const message = msgParts.join('|').trim();
    const conventional = message.match(/^([a-z]+)(\([^)]+\))?:\s+(.+)$/);
    const type = conventional ? conventional[1] : 'other';

    const { version, date: versionDate } = getVersionForCommit(fullHash, tags);

    return {
      branch,
      fullHash,
      hash: shortHash,
      date,
      message,
      type,
      version,
      versionDate
    };
  });
}

function generateUnifiedChangelog(commits) {
  const grouped = {};

  for (const c of commits) {
    if (!grouped[c.date]) grouped[c.date] = [];
    grouped[c.date].push(c);
  }

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
  let content = '# Unified Changelog\n\n';

  for (const date of sortedDates) {
    content += `## ${date}\n\n`;
    const byBranch = {};

    for (const c of grouped[date]) {
      if (!byBranch[c.branch]) byBranch[c.branch] = [];
      byBranch[c.branch].push(c);
    }

    for (const branch of Object.keys(byBranch)) {
      content += `### ${branch.toUpperCase()}\n\n`;

      const byVersion = {};
      for (const c of byBranch[branch]) {
        if (!byVersion[c.version]) byVersion[c.version] = [];
        byVersion[c.version].push(c);
      }

      const versions = Object.keys(byVersion).sort((a, b) => {
        const [aM, aN, aP] = a.split('.').map(Number);
        const [bM, bN, bP] = b.split('.').map(Number);
        return bM - aM || bN - aN || bP - aP;
      });

      for (const v of versions) {
        content += `#### Version ${v}\n`;
        for (const c of byVersion[v]) {
          content += `- (${c.hash}) ${c.message}\n`;
        }
        content += '\n';
      }
    }
  }

  return content;
}

// Main
(async () => {
  try {
    const originalBranch = getCurrentBranch();
    fetchAllTags();

    const tags = parseTags();
    let allCommits = [];

    for (const branch of branches) {
      const commits = getCommits(branch, tags);
      allCommits.push(...commits);
    }

    const changelog = generateUnifiedChangelog(allCommits);
    fs.writeFileSync(outputFile, changelog, 'utf8');
    console.log(`✅ ${outputFile} generated successfully.`);

    checkoutBranch(originalBranch);
  } catch (err) {
    console.error('❌ Error generating changelog:', err.message);
  }
})();
