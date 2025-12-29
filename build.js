const fs = require('fs-extra');
const path = require('path');

// --- 配置区域: 定义要从 node_modules 搬运哪些文件 ---
const targetLibs = [
  // 1. jQuery & Axios & Vue (基础库)
  { name: 'jquery', file: 'dist/jquery.min.js' },
  { name: 'axios', file: 'dist/axios.min.js' },
  { name: 'vue', file: 'dist/vue.global.prod.js', rename: 'vue.min.js' },

  // 2. Bootstrap 5 (CSS 和 JS Bundle)
  { name: 'bootstrap', file: 'dist/css/bootstrap.min.css' },
  { name: 'bootstrap', file: 'dist/js/bootstrap.bundle.min.js' },

  // 3. Bootstrap Icons (关键：需要 CSS 和 字体文件夹)
  { name: 'bootstrap-icons', file: 'font/bootstrap-icons.min.css' },
  // ⚠️ 注意：这里复制的是整个文件夹，因为 CSS 里面引用了这些字体
  { name: 'bootstrap-icons', file: 'font/fonts' },

  // 4. Swiper 8 (CSS 和 JS)
  // Swiper 8 的 bundle 文件通常在根目录下
  { name: 'swiper', file: 'swiper-bundle.min.css' },
  { name: 'swiper', file: 'swiper-bundle.min.js' },

  // 5. Parallax.js (JS)
  { name: 'parallax-js', file: 'dist/parallax.min.js' },

  // 6. Font Awesome (关键：CSS 和 Webfonts 文件夹)
  { name: '@fortawesome/fontawesome-free', file: 'css/all.min.css', rename: 'fontawesome.min.css' },
  // ⚠️ 必须搬运 webfonts 文件夹，否则图标不显示
  { name: '@fortawesome/fontawesome-free', file: 'webfonts' }
];
// ----------------------------------------------------

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
