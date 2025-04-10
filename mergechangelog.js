#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const branches = ['prod', 'uat', 'socket'];
const outputFile = 'UNIFIED_CHANGELOG.md';

// Function to parse a changelog file
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
    
    // Split content into lines
    const lines = content.split('\n');
    
    let currentVersion = null;
    let currentDate = null;
    let currentSection = null;
    let currentChanges = [];
    
    // This regex matches version headers like "1.1.19 (2025-04-10)"
    const versionRegex = /^(\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if line is a version header
      const versionMatch = line.match(versionRegex);
      
      if (versionMatch) {
        // Save previous entry if exists
        if (currentVersion) {
          entries.push({
            branch: branchName,
            version: currentVersion,
            date: currentDate,
            sections: [...currentChanges] // Copy the array
          });
          currentChanges = []; // Reset changes
        }
        
        currentVersion = versionMatch[1]; // e.g., "1.1.19"
        currentDate = versionMatch[2];    // e.g., "2025-04-10"
        currentSection = null;
      } 
      // Check if line is a section header (not indented and not a version line)
      else if (!line.startsWith(' ') && !line.startsWith('\t') && !versionRegex.test(line)) {
        currentSection = line;
      } 
      // Check if line is an indented change entry
      else if (line.startsWith('    ') && currentSection && currentVersion) {
        // Extract the commit message
        const message = line.trim();
        
        currentChanges.push({
          section: currentSection,
          message: message
        });
      }
    }
    
    // Add the last entry
    if (currentVersion) {
      entries.push({
        branch: branchName,
        version: currentVersion,
        date: currentDate,
        sections: [...currentChanges]
      });
    }
    
    // Return to original branch
    execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
    
    console.log(`Found ${entries.length} entries in ${branchName}`);
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
      allEntries = [...allEntries, ...entries];
    }
    
    console.log(`Total entries from all branches: ${allEntries.length}`);
    
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
      // Use date as heading
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