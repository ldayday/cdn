const fs = require('fs-extra');
const path = require('path');

// --- 1. 配置区域：定义要搬运哪些库 ---
const targetLibs = [
  // 基础库
  { name: 'jquery', file: 'dist/jquery.min.js' },
  { name: 'axios', file: 'dist/axios.min.js' },
  { name: 'vue', file: 'dist/vue.global.prod.js', rename: 'vue.min.js' },

  // Bootstrap 5
  { name: 'bootstrap', file: 'dist/css/bootstrap.min.css' },
  { name: 'bootstrap', file: 'dist/js/bootstrap.bundle.min.js' },

  // Bootstrap Icons (CSS + 字体)
  { name: 'bootstrap-icons', file: 'font/bootstrap-icons.min.css' },
  { name: 'bootstrap-icons', file: 'font/fonts' },

  // Swiper 8
  { name: 'swiper', file: 'swiper-bundle.min.css' },
  { name: 'swiper', file: 'swiper-bundle.min.js' },

  // Parallax
  { name: 'parallax-js', file: 'dist/parallax.min.js' },

  // --- Font Awesome 专用配置 (兼容 v5 和 v6) ---
  // 1. 核心 CSS
  { name: '@fortawesome/fontawesome-free', file: 'css/all.min.css', rename: 'fontawesome.min.css' },
  // 2. 字体文件夹 (必须搬运，否则图标不显示)
  { name: '@fortawesome/fontawesome-free', file: 'webfonts' }
];

// --- 2. 核心逻辑区域 ---
const distDir = path.join(__dirname, 'libs');

console.log('🚀 开始构建...');

// A. 搬运文件
targetLibs.forEach(lib => {
  // 拼接 node_modules 里的路径
  const libDir = path.join(__dirname, 'node_modules', lib.name);
  const pkgPath = path.join(libDir, 'package.json');

  // 如果没下载到这个库，就跳过
  if (!fs.existsSync(pkgPath)) {
      console.log(`⚠️ 跳过 ${lib.name}: 未找到 package.json`);
      return;
  }

  const version = require(pkgPath).version;
  const srcFile = path.join(libDir, lib.file);
  const fileName = lib.rename || path.basename(lib.file);
  
  // 目标路径: libs/库名/版本号/文件名
  const destFile = path.join(distDir, lib.name, version, fileName);

  // 如果目标文件不存在，才复制 (增量更新)
  if (!fs.existsSync(destFile)) {
    // 确保目录存在
    fs.ensureDirSync(path.dirname(destFile));
    
    // 如果是复制文件还是文件夹？
    if (fs.statSync(srcFile).isDirectory()) {
        fs.copySync(srcFile, destFile); // 复制整个文件夹(比如 webfonts)
    } else {
        fs.copySync(srcFile, destFile); // 复制单个文件
    }
    
    console.log(`✅ [新增] ${lib.name} v${version} -> ${fileName}`);
  }
});

// B. 生成 catalog.json 账本 (给前端 UI 用)
console.log('📖 生成资源目录...');
const catalog = [];
if (fs.existsSync(distDir)) {
    fs.readdirSync(distDir).forEach(name => {
        const libPath = path.join(distDir, name);
        if (!fs.statSync(libPath).isDirectory()) return;
        
        // 读取版本号并倒序排列 (新版本在前)
        const versions = fs.readdirSync(libPath).sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
        const libData = { name: name, versions: [] };
        
        versions.forEach(ver => {
            const verPath = path.join(libPath, ver);
            if (fs.statSync(verPath).isDirectory()) {
                // 扫描该版本下的所有文件
                const files = [];
                // 递归扫描函数 (处理 webfonts 文件夹里的文件)
                const scanDir = (dir, rootUrl) => {
                    fs.readdirSync(dir).forEach(f => {
                        const fullPath = path.join(dir, f);
                        if(fs.statSync(fullPath).isDirectory()) {
                             scanDir(fullPath, `${rootUrl}/${f}`);
                        } else {
                             files.push(`${rootUrl}/${f}`);
                        }
                    });
                };
                scanDir(verPath, `/libs/${name}/${ver}`);
                
                libData.versions.push({
                    version: ver,
                    files: files.filter(f => !f.endsWith('.map') && !f.includes('webfonts/')) // 过滤掉 .map 和字体文件，只让前端显示 js/css，保持清爽
                });
            }
        });
        catalog.push(libData);
    });
}
fs.writeJsonSync('catalog.json', catalog, { spaces: 2 });
console.log('🎉 完成！');
