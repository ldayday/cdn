const fs = require('fs-extra');
const path = require('path');

// --- 配置区域: 你想搬运哪些文件 ---
const targetLibs = [
  { name: 'jquery', file: 'dist/jquery.min.js' },
  { name: 'axios', file: 'dist/axios.min.js' },
  { name: 'vue', file: 'dist/vue.global.prod.js', rename: 'vue.min.js' },
  { name: 'bootstrap', file: 'dist/css/bootstrap.min.css' },
  { name: 'bootstrap', file: 'dist/js/bootstrap.bundle.min.js' }
];
// --------------------------------

const distDir = path.join(__dirname, 'libs');

// 1. 搬运文件 (增量更新)
targetLibs.forEach(lib => {
  const pkgPath = path.join(__dirname, 'node_modules', lib.name, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const version = require(pkgPath).version;
  const srcFile = path.join(__dirname, 'node_modules', lib.name, lib.file);
  const fileName = lib.rename || path.basename(lib.file);
  
  // 存放到: libs/库名/版本/文件名
  const destFile = path.join(distDir, lib.name, version, fileName);

  if (!fs.existsSync(destFile)) {
    fs.ensureDirSync(path.dirname(destFile));
    fs.copySync(srcFile, destFile);
    console.log(`[新增] ${lib.name} v${version}`);
  }
});

// 2. 生成账本 catalog.json (供前端显示)
const catalog = [];
if (fs.existsSync(distDir)) {
    fs.readdirSync(distDir).forEach(name => {
        const libPath = path.join(distDir, name);
        if (!fs.statSync(libPath).isDirectory()) return;
        
        const versions = fs.readdirSync(libPath).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
        const libData = { name: name, versions: [] };
        
        versions.forEach(ver => {
            const verPath = path.join(libPath, ver);
            if (fs.statSync(verPath).isDirectory()) {
                libData.versions.push({
                    version: ver,
                    files: fs.readdirSync(verPath).map(f => `/libs/${name}/${ver}/${f}`)
                });
            }
        });
        catalog.push(libData);
    });
}
fs.writeJsonSync('catalog.json', catalog, { spaces: 2 });
