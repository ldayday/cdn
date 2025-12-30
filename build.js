const fs = require('fs-extra');
const path = require('path');

// 兼容性引用 glob
let glob;
try {
  glob = require('glob');
} catch (e) {
  console.error('❌ 缺少 glob 模块，请确保 package.json 中已添加 "glob": "^10.3.10"');
  process.exit(1);
}

// --- 1. 配置区域 ---
const targetLibs = [
  { name: 'jquery', file: 'dist/jquery*.{js,map}' },
  { name: 'axios', file: 'dist/axios.min.{js,map}' },
  { name: 'vue', file: 'dist/vue.global.prod.js', rename: 'vue.min.js' },
  { name: 'bootstrap', file: 'dist/css/bootstrap*.min.{css,map}' },
  { name: 'bootstrap', file: 'dist/js/bootstrap*.min.{js,map}' },
  { name: 'bootstrap-icons', file: 'font/bootstrap-icons.min.css' },
  { name: 'bootstrap-icons', file: 'font/fonts' },
  { name: 'swiper', file: 'swiper-bundle*.{js,css,map}' }, // 增加 map 抓取
  { name: 'parallax-js', file: 'dist/parallax*.js' },
  { 
    name: '@fortawesome/fontawesome-free', 
    alias: 'font-awesome', 
    file: 'css/all.min.css', 
    rename: 'all.min.css' 
  },
  { name: '@fortawesome/fontawesome-free', alias: 'font-awesome', file: 'webfonts' }
];

const distDir = path.join(__dirname, 'libs');
console.log('🚀 开始构建...');

// --- 2. 搬运逻辑 ---
targetLibs.forEach(lib => {
  const libDir = path.join(__dirname, 'node_modules', lib.name);
  if (!fs.existsSync(libDir)) return;

  const version = require(path.join(libDir, 'package.json')).version;
  const outputLibName = lib.alias || lib.name;

  const matchedFiles = glob.sync(lib.file, { cwd: libDir, windowsPathsNoEscape: true });

  matchedFiles.forEach(relativeFile => {
    const srcPath = path.join(libDir, relativeFile);
    const baseName = lib.rename && !fs.statSync(srcPath).isDirectory() 
                     ? lib.rename 
                     : path.basename(relativeFile);
                     
    const destPath = path.join(distDir, outputLibName, version, baseName);

    if (!fs.existsSync(destPath)) {
      fs.ensureDirSync(path.dirname(destPath));
      fs.copySync(srcPath, destPath);
      console.log(`✅ [归档] ${outputLibName} v${version}: ${baseName}`);
    }
  });
});

// --- 3. 生成账本 (不进行 .map 过滤) ---
const catalog = [];
if (fs.existsSync(distDir)) {
  fs.readdirSync(distDir).forEach(libName => {
    const libPath = path.join(distDir, libName);
    if (!fs.statSync(libPath).isDirectory()) return;

    const versions = fs.readdirSync(libPath).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
    const libData = { name: libName, versions: [] };

    versions.forEach(ver => {
      const verPath = path.join(libPath, ver);
      if (!fs.statSync(verPath).isDirectory()) return;

      const fileEntries = [];
      const recursiveScan = (dir, urlPrefix) => {
        fs.readdirSync(dir).forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            recursiveScan(fullPath, `${urlPrefix}/${file}`);
          } else {
            // 关键修改：不再过滤 .map，全部写入账本
            fileEntries.push(`${urlPrefix}/${file}`);
          }
        });
      };

      recursiveScan(verPath, `/libs/${libName}/${ver}`);
      libData.versions.push({ version: ver, files: fileEntries });
    });
    catalog.push(libData);
  });
}

fs.writeJsonSync('catalog.json', catalog, { spaces: 2 });
console.log('🎉 构建成功！账本已包含 .map 文件');
