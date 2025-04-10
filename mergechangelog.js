#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const branches = ['prod', 'uat', 'socket'];
const outputFile = 'UNIFIED_CHANGELOG.md';

// Function to parse a changelog file with your specific format
function parseChangelog(branchName) {
  try {
    // Save current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    // Checkout the branch to access its changelog
    execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
    
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    if (!fs.existsSync(changelogPath)) {
      console.warn(`No CHANGELOG.md found for branch ${branchName}`);
      // Return to original branch
      execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
      return [];
    }
    
    const content = fs.readFileSync(changelogPath, 'utf8');
    const entries = [];
    
    // Split content by version entries (looking for version numbers like "1.1.19 (2025-04-10)")
    const versionRegex = /^(\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/;
    const lines = content.split('\n');
    
    let currentVersion = null;
    let currentDate = null;
    let currentSection = null;
    let currentChanges = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match version line like "1.1.19 (2025-04-10)"
      const versionMatch = line.match(versionRegex);
      
      if (versionMatch) {
        // Save previous entry if exists
        if (currentVersion) {
          entries.push({
            branch: branchName,
            version: currentVersion,
            date: currentDate,
            sections: currentChanges
          });
        }
        
        currentVersion = versionMatch[1];
        currentDate = versionMatch[2]; // Format: YYYY-MM-DD
        currentChanges = [];
        currentSection = null;
      } 
      // Match section headers (non-indented lines that aren't version numbers)
      else if (line && !line.startsWith(' ') && !line.startsWith('\t') && !versionRegex.test(line)) {
        currentSection = line;
      } 
      // Match changes (indented lines)
      else if (line.startsWith('    ') && currentSection) {
        currentChanges.push({
          section: currentSection,
          message: line.trim()
        });
      }
    }
    
    // Add the last entry
    if (currentVersion) {
      entries.push({
        branch: branchName,
        version: currentVersion,
        date: currentDate,
        sections: currentChanges
      });
    }
    
    // Return to original branch
    execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
    
    return entries;
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
    // Parse changelogs from all branches
    console.log('Starting to gather changelogs from branches...');
    let allEntries = [];
    
    for (const branch of branches) {
      console.log(`Processing branch: ${branch}`);
      const entries = parseChangelog(branch);
      console.log(`Found ${entries.length} entries in ${branch}`);
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
      // Format date as is (YYYY-MM-DD)
      unifiedChangelog += `## ${date}\n\n`;
      
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
          unifiedChangelog += `#### ${entry.version}\n\n`;
          
          // Group changes by section
          const changesBySection = {};
          for (const change of entry.sections) {
            if (!changesBySection[change.section]) {
              changesBySection[change.section] = [];
            }
            changesBySection[change.section].push(change.message);
          }
          
          // Output changes by section
          for (const section in changesBySection) {
            unifiedChangelog += `**${section}**\n\n`;
            for (const message of changesBySection[section]) {
              unifiedChangelog += `- ${message}\n`;
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