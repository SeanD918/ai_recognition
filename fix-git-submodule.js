const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;

// Find all directories recursively
function findNestedGitDirs(dir, list = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      continue; // Skip broken symlinks or inaccessible files
    }
    
    if (stat.isDirectory()) {
      if (file === '.git') {
        // Exclude the root .git directory
        if (dir !== rootDir) {
          list.push(filePath);
        }
      } else if (file !== 'node_modules' && file !== '.venv' && file !== 'dist') {
        findNestedGitDirs(filePath, list);
      }
    }
  }
  return list;
}

console.log('🔍 Searching for nested .git directories...');
const nestedGitDirs = findNestedGitDirs(rootDir);

if (nestedGitDirs.length === 0) {
  console.log('✨ No nested .git folders found in subdirectories.');
} else {
  console.log(`Found ${nestedGitDirs.length} nested .git directories:`);
  for (const gitDir of nestedGitDirs) {
    console.log(`- ${path.relative(rootDir, gitDir)}`);
    
    // 1. Delete the nested .git directory
    try {
      fs.rmSync(gitDir, { recursive: true, force: true });
      console.log(`   Deleted nested .git directory.`);
    } catch (e) {
      console.error(`   Failed to delete: ${e.message}`);
    }
    
    // 2. Clear Git cache for this subfolder
    const parentDir = path.dirname(gitDir);
    const subfolderName = path.relative(rootDir, parentDir).replace(/\\/g, '/');
    try {
      console.log(`   Clearing Git cache for submodule: ${subfolderName}`);
      execSync(`git rm --cached "${subfolderName}"`, { stdio: 'inherit', cwd: rootDir });
    } catch (e) {
      console.log(`   Note: Subfolder was not registered as a submodule or cache already clear.`);
    }
  }
}

// 3. Clear Git cache for .env if it was tracked
console.log('🧹 Checking if .env is tracked in git cache...');
try {
  execSync('git rm --cached .env', { stdio: 'ignore', cwd: rootDir });
  console.log('   Removed .env from git cache (now ignored by .gitignore).');
} catch (e) {
  console.log('   .env was already untracked / ignored correctly.');
}

// 4. Git Add, Commit & Push
console.log('📦 Committing and pushing changes to GitHub...');
try {
  execSync('git add .', { stdio: 'inherit', cwd: rootDir });
  
  // Check if there are any changes to commit
  const status = execSync('git status --porcelain', { cwd: rootDir }).toString().trim();
  if (status) {
    execSync('git commit -m "Remove nested git repositories, untrack .env, and track subfolders normally"', { stdio: 'inherit', cwd: rootDir });
    console.log('🚀 Pushing to GitHub...');
    execSync('git push', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ Changes successfully pushed to GitHub!');
  } else {
    console.log('✨ Git status is clean. No changes to commit.');
  }
} catch (e) {
  console.error('❌ Git push failed:', e.message);
}
