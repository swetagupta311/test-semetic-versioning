#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

// Configuration
const branches = ['prod', 'uat'];
const outputFile = 'UNIFIED_CHANGELOG.md';

// Function to get changelog content from a branch
function getChangelogFromBranch(branch) {
  try {
    // Save current branch
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    
    // Checkout the branch
    execSync(`git checkout ${branch}`, { stdio: 'pipe' });
    
    // Read the changelog file
    let content = '';
    if (fs.existsSync('CHANGELOG.md')) {
      content = fs.readFileSync('CHANGELOG.md', 'utf8');
    }
    
    // Return to original branch
    execSync(`git checkout ${currentBranch}`, { stdio: 'pipe' });
    
    return {
      branch,
      content
    };
  } catch (error) {
    console.error(`Error processing branch ${branch}:`, error.message);
    return {
      branch,
      content: ''
    };
  }
}

// Function to parse changelog content
function parseChangelog(content) {
  const versions = [];
  let currentVersion = null;
  
  content.split('\n').forEach(line => {
    // Match version headers like "## 1.0.0 (2023-01-01)"
    const versionMatch = line.match(/^## (\d+\.\d+\.\d+)(?: \((.*?)\))?/);
    if (versionMatch) {
      currentVersion = {
        version: versionMatch[1],
        date: versionMatch[2] || '',
        content: [line]
      };
      versions.push(currentVersion);
      return;
    }
    
    // Match sub-headers like "### Features"
    const sectionMatch = line.match(/^### (.*)/);
    if (sectionMatch && currentVersion) {
      currentVersion.content.push(line);
      return;
    }
    
    if (currentVersion) {
      currentVersion.content.push(line);
    }
  });
  
  return versions;
}

// Main function to generate unified changelog
function generateUnifiedChangelog() {
  try {
    // Get changelogs from all branches
    const branchChangelogs = branches.map(branch => getChangelogFromBranch(branch));
    
    // Parse all changelogs
    const allVersions = [];
    branchChangelogs.forEach(({ branch, content }) => {
      const versions = parseChangelog(content);
      versions.forEach(v => {
        allVersions.push({
          ...v,
          branch
        });
      });
    });
    
    // Sort versions by date (newest first)
    allVersions.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });
    
    // Group versions by version number
    const versionMap = new Map();
    allVersions.forEach(version => {
      if (!versionMap.has(version.version)) {
        versionMap.set(version.version, []);
      }
      versionMap.get(version.version).push(version);
    });
    
    // Generate unified changelog
    let unifiedChangelog = '# Unified Changelog\n\n';
    unifiedChangelog += 'This document combines release notes from all branches.\n\n';
    
    // Add versions in order
    Array.from(versionMap.entries()).forEach(([version, entries]) => {
      unifiedChangelog += `## ${version}\n\n`;
      
      // Group by branch
      const branchGroups = {};
      entries.forEach(entry => {
        if (!branchGroups[entry.branch]) {
          branchGroups[entry.branch] = [];
        }
        branchGroups[entry.branch].push(entry);
      });
      
      // Add each branch's content
      Object.entries(branchGroups).forEach(([branch, versions]) => {
        unifiedChangelog += `### ${branch.toUpperCase()}\n\n`;
        versions.forEach(v => {
          // Skip the version header line (we already added it)
          v.content.slice(1).forEach(line => {
            unifiedChangelog += `${line}\n`;
          });
        });
        unifiedChangelog += '\n';
      });
    });
    
    // Write the unified changelog
    fs.writeFileSync(outputFile, unifiedChangelog, 'utf8');
    console.log(`Successfully generated ${outputFile}`);
    
  } catch (error) {
    console.error('Error generating unified changelog:', error);
  }
}

generateUnifiedChangelog();