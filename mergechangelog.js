#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const branches = ['prod', 'uat'];
const outputFile = 'UNIFIED_CHANGELOG.md';

// Function to parse a changelog file
function parseChangelog(branchName) {
  try {
    // Checkout the branch to access its changelog
    execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
    
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) {
      console.warn(`No CHANGELOG.md found for branch ${branchName}`);
      return [];
    }
    
    const content = fs.readFileSync(changelogPath, 'utf8');
    const entries = [];
    
    // Skip the title line
    const lines = content.split('\n').slice(1);
    
    let currentVersion = null;
    let currentDate = null;
    let currentEntry = null;
    let collectingChanges = false;
    let changes = [];
    
    for (const line of lines) {
      // Match version headers like "## [1.0.0](https://github.com/...) (2023-03-20)"
      const versionMatch = line.match(/^## \[(.*?)\].*\((.*?)\)/);
      
      if (versionMatch) {
        // Save previous entry if exists
        if (currentEntry) {
          currentEntry.changes = changes;
          entries.push(currentEntry);
          changes = [];
        }
        
        currentVersion = versionMatch[1];
        currentDate = versionMatch[2]; // Format: YYYY-MM-DD
        
        currentEntry = {
          branch: branchName,
          version: currentVersion,
          date: currentDate,
          changes: []
        };
        
        collectingChanges = false;
      } else if (line.startsWith('### ')) {
        // Section header like "### Features"
        collectingChanges = true;
      } else if (collectingChanges && line.trim().startsWith('* ')) {
        // Collect bullet points for changes
        changes.push(line.trim().substring(2));
      }
    }
    
    // Add the last entry
    if (currentEntry) {
      currentEntry.changes = changes;
      entries.push(currentEntry);
    }
    
    return entries;
  } catch (error) {
    console.error(`Error processing branch ${branchName}:`, error.message);
    return [];
  }
}

// Main function
async function generateUnifiedChangelog() {
  // Store current branch to return to it later
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  
  try {
    // Parse changelogs from all branches
    let allEntries = [];
    
    for (const branch of branches) {
      const entries = parseChangelog(branch);
      allEntries = [...allEntries, ...entries];
    }
    
    // Sort entries by date (newest first)
    allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Group entries by date
    const entriesByDate = {};
    
    for (const entry of allEntries) {
      if (!entriesByDate[entry.date]) {
        entriesByDate[entry.date] = [];
      }
      entriesByDate[entry.date].push(entry);
    }
    
    // Generate the unified changelog
    let unifiedChangelog = '# Unified Changelog\n\n';
    
    for (const date in entriesByDate) {
      // Format date for display (YYYY-MM-DD to Month DD, YYYY)
      const formattedDate = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      unifiedChangelog += `## ${formattedDate}\n\n`;
      
      // Group entries by branch
      const entriesByBranch = {};
      
      for (const entry of entriesByDate[date]) {
        if (!entriesByBranch[entry.branch]) {
          entriesByBranch[entry.branch] = [];
        }
        entriesByBranch[entry.branch].push(entry);
      }
      
      // Add entries grouped by branch
      for (const branch in entriesByBranch) {
        unifiedChangelog += `### ${branch.toUpperCase()}\n\n`;
        
        for (const entry of entriesByBranch[branch]) {
          unifiedChangelog += `**Version ${entry.version}**\n\n`;
          
          if (entry.changes.length > 0) {
            for (const change of entry.changes) {
              unifiedChangelog += `- ${change}\n`;
            }
          } else {
            unifiedChangelog += `- No changes documented\n`;
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
  } finally {
    // Return to the original branch
    execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
  }
}

// Run the script
generateUnifiedChangelog();