#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const branches = [
  { name: 'prod', tagPattern: /^v(\d+\.\d+\.\d+)-prod$/ },
  { name: 'uat', tagPattern: /^v(\d+\.\d+\.\d+)-uat$/ }
];
const outputFile = 'UNIFIED_CHANGELOG.md';
const daysToInclude = 90; // Increased to capture more history

// Function to get all tags with their dates and commits
function getAllTags() {
  const tagsCommand = `git tag --sort=-creatordate`;
  const output = execSync(tagsCommand, { encoding: 'utf8' });
  
  return output.trim().split('\n')
    .filter(tag => tag.trim() !== '')
    .map(tag => {
      try {
        const date = execSync(`git log -1 --format=%ad --date=short ${tag}`, { encoding: 'utf8' }).trim();
        const commit = execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();
        return { tag, date, commit };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
}

// Function to get commits for a specific branch
function getBranchCommits(branchName) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysToInclude);
  const sinceDateStr = sinceDate.toISOString().split('T')[0];
  
  const gitLogCommand = `git log ${branchName} --since="${sinceDateStr}" --format="%H|%h|%ad|%s" --date=short`;
  const output = execSync(gitLogCommand, { encoding: 'utf8' });
  
  return output.trim().split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      const [fullHash, shortHash, date, ...messageParts] = line.split('|');
      const message = messageParts.join('|');
      
      // Extract commit type
      let type = 'Other';
      const conventionalMatch = message.match(/^([a-z]+)(\([^)]+\))?:\s+(.+)$/);
      if (conventionalMatch) {
        type = conventionalMatch[1].charAt(0).toUpperCase() + conventionalMatch[1].slice(1);
      }
      
      return {
        fullHash,
        hash: shortHash,
        date,
        message,
        type,
        branch: branchName
      };
    });
}

// Main function to generate unified changelog
function generateUnifiedChangelog() {
  try {
    // Get all tags first
    const allTags = getAllTags();
    console.log(`Found ${allTags.length} tags total`);
    
    // Get commits from all branches
    let allCommits = [];
    for (const branch of branches) {
      console.log(`Getting commits for branch ${branch.name}`);
      const commits = getBranchCommits(branch.name);
      
      // Process each commit to find its version
      const versionedCommits = commits.map(commit => {
        // Find the most recent tag that contains this commit
        const tagInfo = allTags.find(tag => {
          try {
            return execSync(`git merge-base --is-ancestor ${tag.commit} ${commit.fullHash}`, { encoding: 'utf8' }).trim() === '';
          } catch {
            return false;
          }
        });
        
        // Try to extract version from tag
        let version = 'unreleased';
        if (tagInfo) {
          const match = tagInfo.tag.match(branch.tagPattern);
          if (match) {
            version = match[1]; // The version number
          }
        }
        
        return {
          ...commit,
          version
        };
      });
      
      allCommits = [...allCommits, ...versionedCommits];
    }
    
    console.log(`Total commits to process: ${allCommits.length}`);
    
    if (allCommits.length === 0) {
      fs.writeFileSync(outputFile, '# Unified Changelog\n\nNo commits found in the specified time range.', 'utf8');
      return;
    }
    
    // Group commits by version
    const commitsByVersion = {};
    allCommits.forEach(commit => {
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
    
    // Generate changelog content
    let changelogContent = '# Unified Changelog\n\n';
    
    sortedVersions.forEach(version => {
      changelogContent += `## ${version}\n\n`;
      
      // Group by branch
      const commitsByBranch = {};
      commitsByVersion[version].forEach(commit => {
        if (!commitsByBranch[commit.branch]) {
          commitsByBranch[commit.branch] = [];
        }
        commitsByBranch[commit.branch].push(commit);
      });
      
      // Sort branches
      const sortedBranches = Object.keys(commitsByBranch).sort();
      
      sortedBranches.forEach(branch => {
        changelogContent += `### ${branch.toUpperCase()}\n\n`;
        
        // Group by commit type
        const commitsByType = {};
        commitsByBranch[branch].forEach(commit => {
          if (!commitsByType[commit.type]) {
            commitsByType[commit.type] = [];
          }
          commitsByType[commit.type].push(commit);
        });
        
        // Sort types
        const sortedTypes = Object.keys(commitsByType).sort();
        
        sortedTypes.forEach(type => {
          changelogContent += `**${type}**\n\n`;
          commitsByType[type].forEach(commit => {
            changelogContent += `- ${commit.message} (${commit.hash}, ${commit.date})\n`;
          });
          changelogContent += '\n';
        });
      });
    });
    
    fs.writeFileSync(outputFile, changelogContent, 'utf8');
    console.log(`Successfully generated ${outputFile}`);
    
  } catch (error) {
    console.error('Error generating changelog:', error);
  }
}

generateUnifiedChangelog();