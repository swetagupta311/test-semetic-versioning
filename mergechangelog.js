const fs = require("fs");
const { execSync } = require("child_process");
const outputFile = "UNIFIED_CHANGELOG.md";

function runCommand(cmd) {
  return execSync(cmd, { stdio: "inherit" });
}

function checkoutBranch(branch) {
  console.log(`Checking out branch: ${branch}`);
  runCommand(`git checkout ${branch}`);
}

function generateUnifiedChangelog() {
  console.log("Fetching all tags...");
  runCommand("git fetch --all");

  const originalBranch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();

  // Checkout prod and uat in correct order
  checkoutBranch("prod");
  checkoutBranch("uat");

  const changelogContent = `# UNIFIED CHANGELOG\n\nGenerated on ${new Date().toISOString()}\n`;
  fs.writeFileSync(outputFile, changelogContent);
  console.log(`✅ ${outputFile} generated successfully.`);

  // Commit the changelog on uat
  runCommand(`git add ${outputFile}`);
  runCommand(`git commit -m "chore: update unified changelog [skip ci]" || echo "No changes to commit"`);
  runCommand(`git push origin uat`);

  // Cleanup (optional): remove changelog so prod doesn't error on checkout
  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
  }

  // Return to original branch
  checkoutBranch(originalBranch);
}

try {
  generateUnifiedChangelog();
} catch (err) {
  console.error("❌ Error generating changelog:", err.message);
  process.exit(1);
}
