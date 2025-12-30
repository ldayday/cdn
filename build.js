const fs = require('fs-extra');
const path = require('path');
const { sync } = require('glob');

// --- 1. 配置区域：使用通配符抓取多个文件 ---
const targetLibs = [
  // jQuery: 抓取所有 js 文件（包含 slim, min 等）以及 map 文件
  { name: 'jquery', file: 'dist/jquery*.{js,map}' },
  
  // Axios: 抓取 min.js 和 map
  { name: 'axios', file: 'dist/axios.min.{js,map}' },
  
  // Vue: 抓取生产环境版本
  { name: 'vue', file: 'dist/vue.global.prod.js', rename: 'vue.min.js' },

  // Bootstrap: 抓取 CSS/JS 目录下的所有压缩版和地图文件
  { name: 'bootstrap', file: 'dist/css/bootstrap*.min.{css,map}' },
  { name: 'bootstrap', file: 'dist/js/bootstrap*.min.{js,map}' },

  // Bootstrap Icons: 抓取 CSS 和 整个 fonts 文件夹
  { name: 'bootstrap-icons', file: 'font/bootstrap-icons.min.css' },
  { name: 'bootstrap-icons', file: 'font/fonts' },

  // Swiper: 抓取 bundle 所有的 js 和 css
  { name: 'swiper', file: 'swiper-bundle*.{js,css}' },

  // Parallax: 抓取所有 js
  { name: 'parallax-js', file: 'dist/parallax*.js' },

  // Font Awesome: 使用 alias 改名，并抓取 CSS 和 webfonts
  { 
    name: '@fortawesome/fontawesome-free', 
    alias: 'font-awesome', 
    file: 'css/all.min.css', 
    rename: 'all.min.css' 
  },
  { 
    name: '@fortawesome/fontawesome-free', 
    alias: 'font-awesome', 
    file: 'webfonts' 
  }
];

const distDir = path.join(__dirname, 'libs');

console.log('🚀 开始全量扫描并构建资源库...');

// --- 2. 核心逻辑：搬运与归档 ---
targetLibs.forEach(lib => {
  const libDir = path.join(__dirname, 'node_modules', lib.name);
  if (!fs.existsSync(libDir)) {
    console.log(`⚠️  未找到库: ${lib.name}，请检查是否已执行 npm install`);
    return;
  }

  const version = require(path.join(libDir, 'package.json')).version;
  const outputLibName = lib.alias || lib.name;

  // 使用 glob 匹配所有符合条件的文件/文件夹
  const matchedFiles = sync(lib.file, { cwd: libDir });

  matchedFiles.forEach(relativeFile => {
    const srcPath = path.join(libDir, relativeFile);
    // 保持扁平化结构：libs/库名/版本/文件名
    // 如果是文件夹（如 webfonts），则保持文件夹名
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

// --- 3. 账本生成：扫描 libs 目录生成 catalog.json ---
console.log('📖 正在生成 catalog.json 账本...');
const catalog = [];

if (fs.existsSync(distDir)) {
  const libFolders = fs.readdirSync(distDir);

  libFolders.forEach(libName => {
    const libPath = path.join(distDir, libName);
    if (!fs.statSync(libPath).isDirectory()) return;

    // 版本号倒序排列（新版本在前）
    const versions = fs.readdirSync(libPath).sort((a, b) => 
      b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })
    );

    const libData = { name: libName, versions: [] };

    versions.forEach(ver => {
      const verPath = path.join(libPath, ver);
      if (!fs.statSync(verPath).isDirectory()) return;

      const fileEntries = [];
      // 递归扫描版本目录下所有文件
      const recursiveScan = (dir, urlPrefix) => {
        fs.readdirSync(dir).forEach(file => {
          const fullPath = path.join(dir, file);
          if (fs.statSync(fullPath).isDirectory()) {
            recursiveScan(fullPath, `${urlPrefix}/${file}`);
          } else {
            // 账本中排除 .map 文件，保持 UI 简洁
            if (!file.endsWith('.map')) {
              fileEntries.push(`${urlPrefix}/${file}`);
            }
          }
        });
      };

      recursiveScan(verPath, `/libs/${libName}/${ver}`);
      libData.versions.push({
        version: ver,
        files: fileEntries
      });
    });
    catalog.push(libData);
  });
}

fs.writeJsonSync('catalog.json', catalog, { spaces: 2 });
console.log('🎉 所有任务已完成！');
