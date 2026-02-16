const fs = require('fs');
const path = require('path');

function rmrf(p) {
  return new Promise((resolve) => {
    fs.rm(p, { recursive: true, force: true }, () => resolve());
  });
}

(async () => {
  const root = __dirname;
  const targetDir = path.resolve(root, '..', 'target', 'release', 'bundle');
  await rmrf(targetDir);
  process.exit(0);
})();
