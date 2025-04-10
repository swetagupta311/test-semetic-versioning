#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

const branches = ['prod', 'uat'];
const outputFile = 'UNIFIED_CHANGELOG.md';
const daysToInclude = 30;

function getCommitHistory(branchName) {
  try {
    console.log(`Getting commit history for branch: ${branchName}`);
    
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
    
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysToInclude);
    const sinceDateStr = sinceDate.toISOString().split('T')[0];
    
    const gitLogCommand = `git log --since="${sinceDateStr}" --format="%h|%ad|%s" --date=short`;
    const output = execSync(gitLogCommand, { encoding: 'utf8' });
    
    // Parse the output
    const commits = output.trim().split('\n').filter(line => line.trim() !== '').map(line => {
      const [hash, date, ...messageParts] = line.split('|');
      const message = messageParts.join('|'); // In case message contains |
      
      // Try to extract commit type from conventional commit format (e.g., "feat: message" -> "feat")
      let type = 'Other';
      const conventionalMatch = message.match(/^([a-z]+)(\([^)]+\))?:\s+(.+)$/);
      if (conventionalMatch) {
        type = conventionalMatch[1].charAt(0).toUpperCase() + conventionalMatch[1].slice(1);
      }
      
      return {
        branch: branchName,
        hash: hash.trim(),
        date: date.trim(),
        message: message.trim(),
        type: type
      };
    });
    
    // Return to original branch
    execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
    
    console.log(`Found ${commits.length} commits in ${branchName}`);
    return commits;
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

// Function to get the latest tag/version for a branch
function getLatestVersion(branchName) {
  try {
    // Get the latest tag for the branch
    const tags = execSync(`git tag -l "v*" --sort=-v:refname`, { encoding: 'utf8' })
      .trim().split('\n').filter(tag => tag.trim() !== '');
    
    if (tags.length > 0) {
      // Extract version from tag (v1.2.3 -> 1.2.3)
      const versionMatch = tags[0].match(/v(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : 'unknown';
    }
    
    return 'unknown';
  } catch (error) {
    console.error(`Error getting latest version for ${branchName}:`, error.message);
    return 'unknown';
  }
}

// Main function
function generateUnifiedChangelog() {
  try {
    console.log('Starting to gather commit history from branches...');
    let allCommits = [];
    
    for (const branch of branches) {
      const commits = getCommitHistory(branch);
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
        
        // Get latest version for the branch
        const latestVersion = getLatestVersion(branch);
        unifiedChangelog += `#### ${latestVersion}\n\n`;
        
        // Group commits by type
        const commitsByType = {};
        
        for (const commit of commitsByBranch[branch]) {
          if (!commitsByType[commit.type]) {
            commitsByType[commit.type] = [];
          }
          commitsByType[commit.type].push(commit);
        }
        
        // Add commits grouped by type
        for (const type in commitsByType) {
          unifiedChangelog += `**${type}**\n\n`;
          
          for (const commit of commitsByType[type]) {
            unifiedChangelog += `- ${commit.message} (${commit.hash})\n`;
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