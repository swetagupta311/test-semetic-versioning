#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const branches = [
  { name: 'prod', tagPrefix: 'v', tagSuffix: '-prod' },
  { name: 'uat', tagPrefix: 'v', tagSuffix: '-uat' }
];
const outputFile = 'UNIFIED_CHANGELOG.md';
const daysToInclude = 30;

// Function to get commit history with version information for a branch
function getVersionedCommitHistory(branchConfig) {
  try {
    const { name: branchName, tagPrefix, tagSuffix } = branchConfig;
    console.log(`Getting versioned commit history for branch: ${branchName}`);
    
    // Save current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    // Checkout the branch
    execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
    
    // Get all tags in the branch, sorted by date (newest first)
    const tagsCommand = `git tag --merged ${branchName} --sort=-creatordate`;
    const tags = execSync(tagsCommand, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(tag => tag.trim() !== '')
      .filter(tag => tag.startsWith(tagPrefix) && tag.endsWith(tagSuffix))
      .map(tag => {
        // Get tag date and commit hash
        const tagDate = execSync(`git log -1 --format=%ad --date=short ${tag}`, { encoding: 'utf8' }).trim();
        const tagCommit = execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();
        // Extract version from tag (e.g., v1.2.3-prod -> 1.2.3)
        const versionMatch = tag.match(new RegExp(`${tagPrefix}(\\d+\\.\\d+\\.\\d+)${tagSuffix}`));
        const version = versionMatch ? versionMatch[1] : 'unknown';
        
        return {
          tag,
          date: tagDate,
          commit: tagCommit,
          version
        };
      });
    
    console.log(`Found ${tags.length} tags for ${branchName}`);
    
    // Get commits from the last X days
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysToInclude);
    const sinceDateStr = sinceDate.toISOString().split('T')[0];
    
    const gitLogCommand = `git log --since="${sinceDateStr}" --format="%H|%h|%ad|%s" --date=short`;
    const output = execSync(gitLogCommand, { encoding: 'utf8' });
    
    // Parse the output
    const commits = output.trim().split('\n').filter(line => line.trim() !== '').map(line => {
      const [fullHash, shortHash, date, ...messageParts] = line.split('|');
      const message = messageParts.join('|'); // In case message contains |
      
      // Try to extract commit type from conventional commit format
      let type = 'Other';
      const conventionalMatch = message.match(/^([a-z]+)(\([^)]+\))?:\s+(.+)$/);
      if (conventionalMatch) {
        type = conventionalMatch[1].charAt(0).toUpperCase() + conventionalMatch[1].slice(1);
      }
      
      return {
        fullHash: fullHash.trim(),
        hash: shortHash.trim(),
        date: date.trim(),
        message: message.trim(),
        type: type
      };
    });
    
    // Associate commits with versions based on tags
    const versionedCommits = [];
    let currentVersion = tags.length > 0 ? tags[0].version : 'unreleased';
    let currentVersionDate = tags.length > 0 ? tags[0].date : new Date().toISOString().split('T')[0];
    let tagIndex = 0;
    
    for (const commit of commits) {
      // Check if we need to move to a newer tag
      while (tagIndex < tags.length - 1) {
        const nextTag = tags[tagIndex + 1];
        // Check if commit is between current tag and next tag
        const isAfterNextTag = execSync(`git merge-base --is-ancestor ${nextTag.commit} ${commit.fullHash}; echo $?`, { encoding: 'utf8' }).trim() === '0';
        
        if (isAfterNextTag) {
          tagIndex++;
          currentVersion = tags[tagIndex].version;
          currentVersionDate = tags[tagIndex].date;
        } else {
          break;
        }
      }
      
      versionedCommits.push({
        branch: branchName,
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        type: commit.type,
        version: currentVersion,
        versionDate: currentVersionDate
      });
    }
    
    // Return to original branch
    execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
    
    console.log(`Found ${versionedCommits.length} versioned commits in ${branchName}`);
    return versionedCommits;
  } catch (error) {
    console.error(`Error processing branch ${branchConfig.name}:`, error.message);
    // Try to return to original branch on error
    try {
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
    } catch (e) {
      console.error('Failed to return to original branch:', e.message);
    }
    return [];
  }
}

// Main function
function generateUnifiedChangelog() {
  try {
    console.log('Starting to gather versioned commit history from branches...');
    let allCommits = [];
    
    for (const branch of branches) {
      const commits = getVersionedCommitHistory(branch);
      allCommits = [...allCommits, ...commits];
    }
    
    console.log(`Total commits gathered from all branches: ${allCommits.length}`);
    
    if (allCommits.length === 0) {
      console.log('No commits found in the specified time range.');
      fs.writeFileSync(outputFile, '# Unified Changelog\n\nNo commits found in the specified time range.', 'utf8');
      return;
    }
    
    // Group commits by version
    const commitsByVersion = {};
    
    for (const commit of allCommits) {
      const versionKey = `${commit.version}`;
      if (!commitsByVersion[versionKey]) {
        commitsByVersion[versionKey] = [];
      }
      commitsByVersion[versionKey].push(commit);
    }
    
    // Sort versions (newest first by semantic versioning)
    const sortedVersions = Object.keys(commitsByVersion).sort((a, b) => {
      if (a === 'unreleased') return 1;
      if (b === 'unreleased') return -1;
      
      const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
      const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
      
      if (aMajor !== bMajor) return bMajor - aMajor;
      if (aMinor !== bMinor) return bMinor - aMinor;
      return bPatch - aPatch;
    });
    
    // Generate the unified changelog
    let unifiedChangelog = '# Unified Changelog\n\n';
    
    for (const version of sortedVersions) {
      const versionCommits = commitsByVersion[version];
      
      // Get the earliest date for this version across all branches
      const versionDate = versionCommits.reduce((earliest, commit) => {
        return commit.versionDate < earliest ? commit.versionDate : earliest;
      }, versionCommits[0].versionDate);
      
      unifiedChangelog += `## ${version} (${versionDate})\n\n`;
      
      // Group commits by branch
      const commitsByBranch = {};
      
      for (const commit of versionCommits) {
        if (!commitsByBranch[commit.branch]) {
          commitsByBranch[commit.branch] = [];
        }
        commitsByBranch[commit.branch].push(commit);
      }
      
      // Add entries grouped by branch (sorted alphabetically)
      const sortedBranches = Object.keys(commitsByBranch).sort();
      
      for (const branch of sortedBranches) {
        unifiedChangelog += `### ${branch.toUpperCase()}\n\n`;
        
        // Group commits by type
        const commitsByType = {};
        
        for (const commit of commitsByBranch[branch]) {
          if (!commitsByType[commit.type]) {
            commitsByType[commit.type] = [];
          }
          commitsByType[commit.type].push(commit);
        }
        
        // Sort commit types alphabetically
        const sortedTypes = Object.keys(commitsByType).sort();
        
        // Add commits grouped by type
        for (const type of sortedTypes) {
          unifiedChangelog += `**${type}**\n\n`;
          
          for (const commit of commitsByType[type]) {
            unifiedChangelog += `- ${commit.message} (${commit.hash}, ${commit.date})\n`;
          }
          
          unifiedChangelog += '\n';
        }
      }
    }
    
    // Write the unified changelog to file
    fs.writeFileSync(outputFile, unifiedChangelog, 'utf8');
    console.log(`Unified changelog generated at ${outputFile}`);
    
  } catch (error) {
    console.error('Error generating unified changelog:', error);
  }
}

// Run the script
generateUnifiedChangelog();