#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const branches = ['prod', 'uat'];
const outputFile = 'UNIFIED_CHANGELOG.md';
// How many days of history to include
const daysToInclude = 30;

// Function to get commit history with version information for a branch
function getVersionedCommitHistory(branchName) {
  try {
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
      .map(tag => {
        // Get tag date and commit hash
        const tagDate = execSync(`git log -1 --format=%ad --date=short ${tag}`, { encoding: 'utf8' }).trim();
        const tagCommit = execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();
        // Extract version from tag (e.g., v1.2.3-prod -> 1.2.3)
        const versionMatch = tag.match(/v(\d+\.\d+\.\d+)(-\w+)?/);
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
    let currentVersion = tags.length > 0 ? tags[0].version : 'latest';
    let currentVersionDate = tags.length > 0 ? tags[0].date : new Date().toISOString().split('T')[0];
    let tagIndex = 0;
    
    for (const commit of commits) {
      // Check if this commit is at or before the next tag
      while (tagIndex < tags.length - 1) {
        // If commit is older than current tag, move to the next tag
        const commitHash = commit.fullHash;
        const isBeforeTag = execSync(`git merge-base --is-ancestor ${commitHash} ${tags[tagIndex+1].commit}; echo $?`, { encoding: 'utf8' }).trim() === '0';
        
        if (isBeforeTag) {
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
    console.error(`Error processing branch ${branchName}:`, error.message);
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
    
    // Group commits by date
    const commitsByDate = {};
    
    for (const commit of allCommits) {
      if (!commitsByDate[commit.date]) {
        commitsByDate[commit.date] = [];
      }
      commitsByDate[commit.date].push(commit);
    }
    
    // Sort dates (newest first)
    const sortedDates = Object.keys(commitsByDate).sort((a, b) => new Date(b) - new Date(a));
    
    // Generate the unified changelog
    let unifiedChangelog = '# Unified Changelog\n\n';
    
    for (const date of sortedDates) {
      unifiedChangelog += `## ${date}\n\n`;
      
      // Group commits by branch
      const commitsByBranch = {};
      
      for (const commit of commitsByDate[date]) {
        if (!commitsByBranch[commit.branch]) {
          commitsByBranch[commit.branch] = [];
        }
        commitsByBranch[commit.branch].push(commit);
      }
      
      // Add entries grouped by branch
      for (const branch in commitsByBranch) {
        unifiedChangelog += `### ${branch.toUpperCase()}\n\n`;
        
        // Group commits by version
        const commitsByVersion = {};
        
        for (const commit of commitsByBranch[branch]) {
          if (!commitsByVersion[commit.version]) {
            commitsByVersion[commit.version] = [];
          }
          commitsByVersion[commit.version].push(commit);
        }
        
        // Sort versions (newest first by semantic versioning)
        const sortedVersions = Object.keys(commitsByVersion).sort((a, b) => {
          const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
          const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
          
          if (aMajor !== bMajor) return bMajor - aMajor;
          if (aMinor !== bMinor) return bMinor - aMinor;
          return bPatch - aPatch;
        });
        
        // Add commits grouped by version
        for (const version of sortedVersions) {
          unifiedChangelog += `#### ${version}\n\n`;
          
          // Group commits by type
          const commitsByType = {};
          
          for (const commit of commitsByVersion[version]) {
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
              unifiedChangelog += `- ${commit.message} (${commit.hash})\n`;
            }
            
            unifiedChangelog += '\n';
          }
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