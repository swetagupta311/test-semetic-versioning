#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const branches = [
  { name: 'prod', tagPattern: /^v(\d+\.\d+\.\d+)-prod$/ },
  { name: 'uat', tagPattern: /^v(\d+\.\d+\.\d+)-uat$/ }
];
const outputFile = 'UNIFIED_CHANGELOG.md';

// Function to get all tags with their versions
function getAllTags() {
  const tags = execSync('git tag --sort=-creatordate', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(tag => tag.trim() !== '');

  return tags.map(tag => {
    // Find which branch pattern this tag matches
    const branchInfo = branches.find(b => b.tagPattern.test(tag));
    if (!branchInfo) return null;

    const match = tag.match(branchInfo.tagPattern);
    return {
      tag,
      version: match[1],
      branch: branchInfo.name,
      commit: execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim(),
      date: execSync(`git log -1 --format=%ad --date=short ${tag}`, { encoding: 'utf8' }).trim()
    };
  }).filter(Boolean);
}

// Function to get all commits with their version info
function getAllCommits() {
  const allTags = getAllTags();
  console.log(`Found ${allTags.length} version tags`);

  // Get all commits from both branches
  const allCommits = [];
  const branchCommits = {};

  for (const branch of branches) {
    const commits = execSync(`git log ${branch.name} --format="%H|%h|%ad|%s" --date=short`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const [hash, shortHash, date, ...messageParts] = line.split('|');
        const message = messageParts.join('|');
        return { hash, shortHash, date, message, branch: branch.name };
      });

    branchCommits[branch.name] = commits;
    allCommits.push(...commits);
  }

  // Sort all commits by date (newest first)
  allCommits.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Assign versions to commits
  const versionedCommits = allCommits.map(commit => {
    // Find the most recent tag that is an ancestor of this commit
    const versionTag = allTags.find(tag => {
      if (tag.branch !== commit.branch) return false;
      try {
        return execSync(`git merge-base --is-ancestor ${tag.commit} ${commit.hash}`, { stdio: 'pipe' }) === '';
      } catch {
        return false;
      }
    });

    return {
      ...commit,
      version: versionTag ? versionTag.version : 'unreleased',
      versionDate: versionTag ? versionTag.date : ''
    };
  });

  return versionedCommits;
}

// Main function to generate the unified changelog
function generateUnifiedChangelog() {
  try {
    const commits = getAllCommits();
    console.log(`Processing ${commits.length} commits`);

    // Group commits by version
    const commitsByVersion = {};
    commits.forEach(commit => {
      if (!commitsByVersion[commit.version]) {
        commitsByVersion[commit.version] = [];
      }
      commitsByVersion[commit.version].push(commit);
    });

    // Sort versions (newest first)
    const sortedVersions = Object.keys(commitsByVersion).sort((a, b) => {
      if (a === 'unreleased') return 1;
      if (b === 'unreleased') return -1;
      
      const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
      const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
      
      if (aMajor !== bMajor) return bMajor - aMajor;
      if (aMinor !== bMinor) return bMinor - aMinor;
      return bPatch - aPatch;
    });

    // Generate the changelog content
    let changelogContent = '# Unified Changelog\n\n';
    changelogContent += 'Combined release history from all branches\n\n';

    sortedVersions.forEach(version => {
      const versionCommits = commitsByVersion[version];
      const versionDate = versionCommits[0].versionDate || 'unreleased';

      changelogContent += `## ${version}${versionDate ? ` (${versionDate})` : ''}\n\n`;

      // Group by branch
      const commitsByBranch = {};
      versionCommits.forEach(commit => {
        if (!commitsByBranch[commit.branch]) {
          commitsByBranch[commit.branch] = [];
        }
        commitsByBranch[commit.branch].push(commit);
      });

      // Add commits for each branch
      Object.entries(commitsByBranch).forEach(([branch, branchCommits]) => {
        changelogContent += `### ${branch.toUpperCase()}\n\n`;

        // Group by commit type
        const commitsByType = {};
        branchCommits.forEach(commit => {
          const type = commit.message.match(/^(\w+)(?:\([^)]*\))?:/)?.[1] || 'Other';
          if (!commitsByType[type]) {
            commitsByType[type] = [];
          }
          commitsByType[type].push(commit);
        });

        // Add commits by type
        Object.entries(commitsByType).forEach(([type, typeCommits]) => {
          changelogContent += `**${type.charAt(0).toUpperCase() + type.slice(1)}**\n\n`;
          typeCommits.forEach(commit => {
            changelogContent += `- ${commit.message} (${commit.shortHash}, ${commit.date})\n`;
          });
          changelogContent += '\n';
        });
      });
    });

    fs.writeFileSync(outputFile, changelogContent, 'utf8');
    console.log(`Successfully generated ${outputFile}`);

  } catch (error) {
    console.error('Error generating unified changelog:', error);
  }
}

generateUnifiedChangelog();