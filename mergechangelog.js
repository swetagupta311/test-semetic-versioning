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
    
    // Get all tags that match the branch pattern, sorted by date (newest first)
    const branchPattern = branchName === 'prod' ? '-prod' : '-uat';
    const tagsCommand = `git tag --sort=-creatordate | grep "${branchPattern}" || echo ""`;
    const tags = execSync(tagsCommand, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(tag => tag.trim() !== '')
      .map(tag => {
        // Get tag date and commit hash
        const tagDate = execSync(`git log -1 --format=%ad --date=short ${tag}`, { encoding: 'utf8' }).trim();
        const tagCommit = execSync(`git rev-list -n 1 ${tag}`, { encoding: 'utf8' }).trim();
        
        // Extract version from tag properly for branch-specific formats
        // For example: v1.2.3-prod or v1.2.3-uat -> 1.2.3
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
    if (tags.length > 0) {
      let currentVersionInfo = {
        version: tags[0].version,
        date: tags[0].date,
        commit: tags[0].commit
      };
      let tagIndex = 0;
      
      for (const commit of commits) {
        // Check if we need to update the version
        while (tagIndex < tags.length - 1) {
          const nextTagCommit = tags[tagIndex + 1].commit;
          
          // Check if commit is before or at the next tag
          const cmd = `git merge-base --is-ancestor ${commit.fullHash} ${nextTagCommit} && echo "true" || echo "false"`;
          const isBeforeOrAtTag = execSync(cmd, { encoding: 'utf8' }).trim() === "true";
          
          if (isBeforeOrAtTag) {
            tagIndex++;
            currentVersionInfo = {
              version: tags[tagIndex].version,
              date: tags[tagIndex].date,
              commit: tags[tagIndex].commit
            };
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
          version: currentVersionInfo.version,
          versionDate: currentVersionInfo.date
        });
      }
    } else {
      // If no tags found for this branch, mark commits as "unversioned"
      for (const commit of commits) {
        versionedCommits.push({
          branch: branchName,
          hash: commit.hash,
          date: commit.date,
          message: commit.message,
          type: commit.type,
          version: 'unversioned',
          versionDate: ''
        });
      }
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

// Create a Git hook to update the changelog automatically
function setupGitHooks() {
  const hooksDir = '.git/hooks';
  const postCommitHookPath = `${hooksDir}/post-commit`;
  
  // Create the post-commit hook script
  const hookScript = `#!/bin/bash
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Only run the script if we're on one of the monitored branches
if [[ "$current_branch" == "uat" || "$current_branch" == "prod" ]]; then
  echo "Updating unified changelog after commit to $current_branch..."
  node path/to/your/unified-changelog-script.js
  
  # If we're on UAT branch, we need to update prod branch too
  if [[ "$current_branch" == "uat" ]]; then
    # Save the changelog temporarily
    cp UNIFIED_CHANGELOG.md /tmp/UNIFIED_CHANGELOG.md
    
    # Switch to prod, update and commit
    git checkout prod
    cp /tmp/UNIFIED_CHANGELOG.md UNIFIED_CHANGELOG.md
    git add UNIFIED_CHANGELOG.md
    git commit -m "Update unified changelog from UAT [skip ci]" || echo "No changes to commit"
    
    # Return to UAT
    git checkout uat
  fi
fi
`;

  // Ensure hooks directory exists
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Create the hook file
  fs.writeFileSync(postCommitHookPath, hookScript, { mode: 0o755 });
  console.log(`Git hook created at ${postCommitHookPath}`);
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
          if (a === 'unversioned') return -1; // Unversioned always at top
          if (b === 'unversioned') return 1;
          
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
    
    // Save the changelog to the appropriate location
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    if (currentBranch === 'prod') {
      // If on prod branch, directly write the file
      fs.writeFileSync(outputFile, unifiedChangelog, 'utf8');
      
      try {
        execSync(`git add ${outputFile}`, { stdio: 'pipe' });
        execSync(`git commit -m "Update unified changelog [skip ci]"`, { stdio: 'pipe' });
        console.log('Committed updated changelog to prod branch');
      } catch (e) {
        console.log('No changes to commit or commit failed');
      }
    } else if (currentBranch === 'uat') {
      // If on UAT branch, save locally and also update on prod
      fs.writeFileSync(outputFile, unifiedChangelog, 'utf8');
      
      // Switch to prod branch, copy the file, commit, and switch back
      try {
        // Save the UAT branch position
        const uatHead = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
        
        // Create a temporary copy of the changelog
        const tempFile = '/tmp/UNIFIED_CHANGELOG.md';
        fs.copyFileSync(outputFile, tempFile);
        
        // Switch to prod branch
        execSync('git checkout prod', { stdio: 'pipe' });
        
        // Copy the file to prod
        fs.copyFileSync(tempFile, outputFile);
        
        // Commit the changes on prod
        execSync(`git add ${outputFile}`, { stdio: 'pipe' });
        execSync(`git commit -m "Update unified changelog from UAT [skip ci]"`, { stdio: 'pipe' });
        console.log('Committed updated changelog to prod branch');
        
        // Switch back to UAT branch
        execSync(`git checkout uat`, { stdio: 'pipe' });
        
        // Add changes to UAT as well
        execSync(`git add ${outputFile}`, { stdio: 'pipe' });
        try {
          execSync(`git commit -m "Update unified changelog on UAT [skip ci]"`, { stdio: 'pipe' });
        } catch (e) {
          console.log('No changes to commit on UAT or commit failed');
        }
      } catch (e) {
        console.error('Error updating prod branch:', e.message);
        
        // Try to get back to the original branch
        try {
          execSync(`git checkout ${originalBranch}`, { stdio: 'pipe' });
        } catch (e2) {
          console.error('Failed to return to original branch:', e2.message);
        }
      }
    } else {
      // If on another branch, just create the file without committing
      fs.writeFileSync(outputFile, unifiedChangelog, 'utf8');
      console.log(`Unified changelog generated at ${outputFile} (not committed)`);
    }
    
    // Set up git hooks for automatic updates
    setupGitHooks();
    
    console.log(`Unified changelog generation complete`);
    
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