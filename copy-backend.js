const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const destDir = path.join(rootDir, 'unified-backend');

// Helper to create dirs recursively
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper to copy file and replace content
function copyAndModify(src, dest, replacements = []) {
  if (!fs.existsSync(src)) {
    console.warn(`Source file missing: ${src}`);
    return;
  }
  let content = fs.readFileSync(src, 'utf8');
  for (const r of replacements) {
    content = content.replace(r.search, r.replace);
  }
  fs.writeFileSync(dest, content, 'utf8');
  console.log(`Copied and modified: ${path.relative(rootDir, dest)}`);
}

// Ensure all dirs exist
ensureDir(path.join(destDir, 'gender', 'saved_models'));
ensureDir(path.join(destDir, 'animal', 'saved_models'));
ensureDir(path.join(destDir, 'flower', 'saved_models'));
ensureDir(path.join(destDir, 'hand', 'saved_models'));

// 1. Copy Gender-AI
copyAndModify(
  path.join(rootDir, 'ai_models', 'gender-ai', 'src', 'model.py'),
  path.join(destDir, 'gender', 'model.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'gender-ai', 'src', 'preprocess.py'),
  path.join(destDir, 'gender', 'preprocess.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'gender-ai', 'src', 'predict.py'),
  path.join(destDir, 'gender', 'predict.py'),
  [
    { search: /from model import/g, replace: 'from .model import' },
    { search: /from preprocess import/g, replace: 'from .preprocess import' },
    { search: /os\.path\.dirname\(os\.path\.dirname\(__file__\)\)/g, replace: 'os.path.dirname(__file__)' }
  ]
);
if (fs.existsSync(path.join(rootDir, 'ai_models', 'gender-ai', 'saved_models', 'gender_model.pth'))) {
  fs.copyFileSync(
    path.join(rootDir, 'ai_models', 'gender-ai', 'saved_models', 'gender_model.pth'),
    path.join(destDir, 'gender', 'saved_models', 'gender_model.pth')
  );
}

// 2. Copy Animal-AI
copyAndModify(
  path.join(rootDir, 'ai_models', 'animal-ai', 'src', 'model.py'),
  path.join(destDir, 'animal', 'model.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'animal-ai', 'src', 'preprocess.py'),
  path.join(destDir, 'animal', 'preprocess.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'animal-ai', 'src', 'validator.py'),
  path.join(destDir, 'animal', 'validator.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'animal-ai', 'src', 'predict.py'),
  path.join(destDir, 'animal', 'predict.py'),
  [
    { search: /from model import/g, replace: 'from .model import' },
    { search: /from preprocess import/g, replace: 'from .preprocess import' },
    { search: /from validator import/g, replace: 'from .validator import' },
    { search: /PROJECT_ROOT/g, replace: 'SCRIPT_DIR' }
  ]
);
if (fs.existsSync(path.join(rootDir, 'ai_models', 'animal-ai', 'saved_models', 'animal_model.keras'))) {
  fs.copyFileSync(
    path.join(rootDir, 'ai_models', 'animal-ai', 'saved_models', 'animal_model.keras'),
    path.join(destDir, 'animal', 'saved_models', 'animal_model.keras')
  );
}
if (fs.existsSync(path.join(rootDir, 'ai_models', 'animal-ai', 'saved_models', 'classes.json'))) {
  fs.copyFileSync(
    path.join(rootDir, 'ai_models', 'animal-ai', 'saved_models', 'classes.json'),
    path.join(destDir, 'animal', 'saved_models', 'classes.json')
  );
}

// 3. Copy Flower-AI
copyAndModify(
  path.join(rootDir, 'ai_models', 'flower-ai', 'src', 'model.py'),
  path.join(destDir, 'flower', 'model.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'flower-ai', 'src', 'preprocess.py'),
  path.join(destDir, 'flower', 'preprocess.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'flower-ai', 'src', 'predict.py'),
  path.join(destDir, 'flower', 'predict.py'),
  [
    { search: /from model import/g, replace: 'from .model import' },
    { search: /from preprocess import/g, replace: 'from .preprocess import' },
    { search: /PROJECT_ROOT/g, replace: 'SCRIPT_DIR' }
  ]
);
if (fs.existsSync(path.join(rootDir, 'ai_models', 'flower-ai', 'saved_models', 'flower_model (1).keras'))) {
  fs.copyFileSync(
    path.join(rootDir, 'ai_models', 'flower-ai', 'saved_models', 'flower_model (1).keras'),
    path.join(destDir, 'flower', 'saved_models', 'flower_model.keras')
  );
}
if (fs.existsSync(path.join(rootDir, 'ai_models', 'flower-ai', 'saved_models', 'classes.json'))) {
  fs.copyFileSync(
    path.join(rootDir, 'ai_models', 'flower-ai', 'saved_models', 'classes.json'),
    path.join(destDir, 'flower', 'saved_models', 'classes.json')
  );
}

// 4. Copy Hand-AI
copyAndModify(
  path.join(rootDir, 'ai_models', 'hand-ai', 'src', 'model.py'),
  path.join(destDir, 'hand', 'model.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'hand-ai', 'src', 'preprocess.py'),
  path.join(destDir, 'hand', 'preprocess.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'hand-ai', 'src', 'validator.py'),
  path.join(destDir, 'hand', 'validator.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'hand-ai', 'src', 'train.py'),
  path.join(destDir, 'hand', 'train.py')
);
copyAndModify(
  path.join(rootDir, 'ai_models', 'hand-ai', 'src', 'predict.py'),
  path.join(destDir, 'hand', 'predict.py'),
  [
    { search: /from preprocess import/g, replace: 'from .preprocess import' },
    { search: /from train import/g, replace: 'from .train import' },
    { search: /PROJECT_ROOT/g, replace: 'SCRIPT_DIR' }
  ]
);
if (fs.existsSync(path.join(rootDir, 'ai_models', 'hand-ai', 'saved_models', 'hand_model.keras'))) {
  fs.copyFileSync(
    path.join(rootDir, 'ai_models', 'hand-ai', 'saved_models', 'hand_model.keras'),
    path.join(destDir, 'hand', 'saved_models', 'hand_model.keras')
  );
}
if (fs.existsSync(path.join(rootDir, 'ai_models', 'hand-ai', 'saved_models', 'classes.json'))) {
  fs.copyFileSync(
    path.join(rootDir, 'ai_models', 'hand-ai', 'saved_models', 'classes.json'),
    path.join(destDir, 'hand', 'saved_models', 'classes.json')
  );
}

console.log('✅ Unified backend files prepared successfully!');
