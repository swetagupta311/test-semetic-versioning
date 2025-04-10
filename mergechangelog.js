#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const branches = ['prod', 'uat', 'socket'];
const outputFile = 'UNIFIED_CHANGELOG.md';

// Function to parse a changelog file
function parseChangelog(branchName) {
  console.log(`\n========== Processing Branch: ${branchName} ==========`);
  try {
    // Save current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    console.log(`Current branch before checkout: ${currentBranch}`);
    
    // Checkout the branch to access its changelog
    console.log(`Attempting to checkout branch: ${branchName}`);
    execSync(`git checkout ${branchName}`, { stdio: 'inherit' });
    
    // Verify we're on the right branch
    const verifyBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    console.log(`Branch after checkout: ${verifyBranch}`);
    
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    console.log(`Looking for changelog at: ${changelogPath}`);
    
    if (!fs.existsSync(changelogPath)) {
      console.warn(`No CHANGELOG.md found for branch ${branchName}`);
      // Return to original branch
      console.log(`Returning to branch: ${currentBranch}`);
      execSync(`git checkout ${currentBranch}`, { stdio: 'inherit' });
      return [];
    }
    
    // Read changelog content
    console.log(`Reading changelog for branch ${branchName}...`);
    const content = fs.readFileSync(changelogPath, 'utf8');
    
    // Debug: Show the first few lines of the changelog
    const previewLines = content.split('\n').slice(0, 10).join('\n');
    console.log(`\nChangelog preview (first 10 lines):\n${previewLines}\n`);
    
    // Parse changelog with various format attempts
    const entries = [];
    console.log('Attempting to parse changelog entries...');
    
    // Try parsing with format: "1.1.19 (2025-04-10)"
    const versionRegex1 = /^(\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/;
    // Also try format with potential title or header: "## 1.1.19 (2025-04-10)"
    const versionRegex2 = /^## (\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/;
    // Another variation: "## [1.1.19](url) (2025-04-10)"
    const versionRegex3 = /^## \[(\d+\.\d+\.\d+)\].*\((\d{4}-\d{2}-\d{2})\)$/;
    
    const lines = content.split('\n');
    
    let currentVersion = null;
    let currentDate = null;
    let currentSection = null;
    let currentChanges = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Try all version regex patterns
      const versionMatch1 = line.match(versionRegex1);
      const versionMatch2 = line.match(versionRegex2);
      const versionMatch3 = line.match(versionRegex3);
      const versionMatch = versionMatch1 || versionMatch2 || versionMatch3;
      
      if (versionMatch) {
        console.log(`Found version: ${versionMatch[1]}, date: ${versionMatch[2]}`);
        
        // Save previous entry if exists
        if (currentVersion) {
          entries.push({
            branch: branchName,
            version: currentVersion,
            date: currentDate,
            sections: currentChanges
          });
          console.log(`Added entry for version ${currentVersion} with ${currentChanges.length} changes`);
        }
        
        currentVersion = versionMatch[1];
        currentDate = versionMatch[2]; // Format: YYYY-MM-DD
        currentChanges = [];
        currentSection = null;
      } 
      // Match section headers (non-indented lines that aren't version numbers)
      else if (line && !line.startsWith(' ') && !line.startsWith('\t') && 
              !versionRegex1.test(line) && !versionRegex2.test(line) && !versionRegex3.test(line)) {
        currentSection = line;
        console.log(`Found section: ${currentSection}`);
      } 
      // Match changes (indented lines)
      else if ((line.startsWith('    ') || line.startsWith('* ') || line.startsWith('- ')) && currentSection) {
        const message = line.trim().replace(/^[\*\-]\s+/, '');
        currentChanges.push({
          section: currentSection,
          message: message
        });
        console.log(`Added change under "${currentSection}": ${message}`);
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
      console.log(`Added final entry for version ${currentVersion} with ${currentChanges.length} changes`);
    }
    
    // Return to original branch
    console.log(`Returning to branch: ${currentBranch}`);
    execSync(`git checkout ${currentBranch}`, { stdio: 'inherit' });
    
    console.log(`Total entries found for ${branchName}: ${entries.length}`);
    return entries;
  } catch (error) {
    console.error(`Error processing branch ${branchName}:`, error.message);
    console.error(error.stack);
    // Try to return to original branch on error
    try {
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      console.log(`Attempting to return to branch: ${currentBranch} after error`);
      execSync(`git checkout ${currentBranch}`, { stdio: 'inherit' });
    } catch (e) {
      console.error('Failed to return to original branch:', e.message);
    }
    return [];
  }
}

// Main function
function generateUnifiedChangelog() {
  try {
    console.log('Starting to gather changelogs from branches...');
    let allEntries = [];
    
    for (const branch of branches) {
      const entries = parseChangelog(branch);
      allEntries = [...allEntries, ...entries];
    }
    
    console.log(`Total entries gathered from all branches: ${allEntries.length}`);
    if (allEntries.length === 0) {
      console.log('No entries found. Writing empty changelog.');
      fs.writeFileSync(outputFile, '# Unified Changelog\n\nNo entries found.', 'utf8');
      return;
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
    console.error(error.stack);
  }
}

// List files in directory for debugging
console.log('Files in current directory:');
try {
  const files = fs.readdirSync(process.cwd());
  console.log(files.join('\n'));
} catch (e) {
  console.error('Error listing files:', e.message);
}

// Run the script
generateUnifiedChangelog();