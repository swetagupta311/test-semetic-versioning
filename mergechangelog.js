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
    const tagsCommand = `git tag --sort=-creatordate`;
    const tags = execSync(tagsCommand, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(tag => tag.trim() !== '')
      .map(tag => {
        // Get tag date and commit hash
        const tagDate = execSync(`git log -1 --format=%ad --date=short ${tag}`, { encoding: 'utf8' }).trim();
        const tagCommit = execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();
        
        // Extract version from tag properly for different branch formats
        // For example: v1.2.3-prod or v1.2.3-uat -> 1.2.3
        const versionMatch = tag.match(/v(\d+\.\d+\.\d+)(-\w+)?/);
        const version = versionMatch ? versionMatch[1] : 'unknown';
        
        return {
          tag,
          date: tagDate,
          commit: tagCommit,
          version,
          branch: branchName // Store the branch info with the tag
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
    
    // Associate commits with versions based on tags specific to this branch
    const branchSpecificTags = tags.filter(tag => tag.branch === branchName);
    
    const versionedCommits = [];
    let currentVersion = branchSpecificTags.length > 0 ? branchSpecificTags[0].version : 'latest';
    let currentVersionDate = branchSpecificTags.length > 0 ? branchSpecificTags[0].date : new Date().toISOString().split('T')[0];
    let tagIndex = 0;
    
    for (const commit of commits) {
      // Check if this commit is at or before the next tag
      while (tagIndex < branchSpecificTags.length - 1) {
        // If commit is older than current tag, move to the next tag
        const commitHash = commit.fullHash;
        const isBeforeTag = execSync(`git merge-base --is-ancestor ${commitHash} ${branchSpecificTags[tagIndex+1].commit}; echo $?`, { encoding: 'utf8' }).trim() === '0';
        
        if (isBeforeTag) {
          tagIndex++;
          currentVersion = branchSpecificTags[tagIndex].version;
          currentVersionDate = branchSpecificTags[tagIndex].date;
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
    const originalBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
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
      // Avoid duplicates (same commit hash across branches)
      if (!commitsByDate[commit.date].some(c => c.hash === commit.hash)) {
        commitsByDate[commit.date].push(commit);
      }
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
    
    // Always save the changelog to the prod branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    if (currentBranch !== 'prod') {
      // Save the changelog content temporarily
      const tempFile = 'temp_changelog.md';
      fs.writeFileSync(tempFile, unifiedChangelog, 'utf8');
      
      // Switch to prod branch and update the changelog
      execSync(`git checkout prod`, { stdio: 'pipe' });
      fs.copyFileSync(tempFile, outputFile);
      fs.unlinkSync(tempFile);
      
      // Commit the changes to prod branch
      try {
        execSync(`git add ${outputFile}`, { stdio: 'pipe' });
        execSync(`git commit -m "Update unified changelog [skip ci]"`, { stdio: 'pipe' });
        console.log('Committed updated changelog to prod branch');
      } catch (e) {
        console.log('No changes to commit or commit failed');
      }
      
      // Return to the original branch
      execSync(`git checkout ${originalBranch}`, { stdio: 'pipe' });
    } else {
      // Already on prod branch, just write the file
      fs.writeFileSync(outputFile, unifiedChangelog, 'utf8');
      
      // Commit the changes
      try {
        execSync(`git add ${outputFile}`, { stdio: 'pipe' });
        execSync(`git commit -m "Update unified changelog [skip ci]"`, { stdio: 'pipe' });
        console.log('Committed updated changelog to prod branch');
      } catch (e) {
        console.log('No changes to commit or commit failed');
      }
    }
    
    console.log(`Unified changelog generated at ${outputFile} on the prod branch`);
    
  } catch (error) {
    console.error('Error generating unified changelog:', error);
    // Try to return to original branch on error
    try {
      const originalBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      execSync(`git checkout ${originalBranch}`, { stdio: 'pipe' });
    } catch (e) {
      console.error('Failed to return to original branch:', e.message);
    }
  }
}

// Run the script
generateUnifiedChangelog();