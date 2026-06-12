const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;

// Find all directories and files recursively
function findFilesAndDirs(dir, fileList = [], gitDirs = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      continue;
    }
    
    if (stat.isDirectory()) {
      if (file === '.git') {
        if (dir !== rootDir) {
          gitDirs.push(filePath);
        }
      } else if (file !== 'node_modules' && file !== '.venv' && file !== 'dist') {
        findFilesAndDirs(filePath, fileList, gitDirs);
      }
    } else {
      // Find files that are environment files
      const lower = file.toLowerCase();
      if (lower === '.env' || lower.startsWith('.env.') || lower.endsWith('.env')) {
        fileList.push(filePath);
      }
    }
  }
  return { fileList, gitDirs };
}

console.log('🔍 Scanning project directories...');
const { fileList: envFiles, gitDirs: nestedGitDirs } = findFilesAndDirs(rootDir);

// 1. Handle nested Git repositories
if (nestedGitDirs.length === 0) {
  console.log('✨ No nested .git folders found in subdirectories.');
} else {
  console.log(`Found ${nestedGitDirs.length} nested .git directories:`);
  for (const gitDir of nestedGitDirs) {
    console.log(`- ${path.relative(rootDir, gitDir)}`);
    try {
      fs.rmSync(gitDir, { recursive: true, force: true });
      console.log(`   Deleted nested .git directory.`);
    } catch (e) {
      console.error(`   Failed to delete: ${e.message}`);
    }
    
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

// 2. Handle untracking of environment files
if (envFiles.length === 0) {
  console.log('✨ No environment (.env) files found.');
} else {
  console.log(`🧹 Found ${envFiles.length} environment files to untrack from Git cache:`);
  for (const envFile of envFiles) {
    const relPath = path.relative(rootDir, envFile).replace(/\\/g, '/');
    try {
      execSync(`git rm --cached "${relPath}"`, { stdio: 'ignore', cwd: rootDir });
      console.log(`   Untracked: ${relPath}`);
    } catch (e) {
      // Already untracked
      console.log(`   Already untracked/ignored: ${relPath}`);
    }
  }
}

// 3. Git Add, Commit & Push
console.log('📦 Committing and pushing changes to GitHub...');
try {
  execSync('git add .', { stdio: 'inherit', cwd: rootDir });
  
  const status = execSync('git status --porcelain', { cwd: rootDir }).toString().trim();
  if (status) {
    execSync('git commit -m "Remove nested git repositories, untrack all .env files, and track subfolders normally"', { stdio: 'inherit', cwd: rootDir });
    console.log('🚀 Pushing to GitHub...');
    execSync('git push', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ Changes successfully pushed to GitHub!');
  } else {
    console.log('✨ Git status is clean. No changes to commit.');
  }
} catch (e) {
  console.error('❌ Git push failed:', e.message);
}
