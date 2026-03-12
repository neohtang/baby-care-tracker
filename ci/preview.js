const ci = require('miniprogram-ci');
const path = require('path');
const { getProject, parseArgs } = require('./project');

async function preview() {
  const args = parseArgs();
  const pkg = require(path.resolve(__dirname, '..', 'package.json'));

  const desc = args.desc || `v${pkg.version} preview by CI`;
  const robot = parseInt(args.robot, 10) || 1;
  const qrcodeFormat = args.qrformat || 'image';
  const qrcodeOutputDest = path.resolve(__dirname, '..', 'preview.jpg');
  const pagePath = args.page || '';
  const searchQuery = args.query || '';

  const project = getProject();

  console.log('========================================');
  console.log('  小程序预览');
  console.log('========================================');
  console.log(`  描述:       ${desc}`);
  console.log(`  机器人:     CI Robot ${robot}`);
  console.log(`  二维码格式: ${qrcodeFormat}`);
  if (pagePath) {
    console.log(`  预览页面:   ${pagePath}`);
  }
  if (searchQuery) {
    console.log(`  预览参数:   ${searchQuery}`);
  }
  console.log('========================================\n');

  const previewOptions = {
    project,
    desc,
    setting: {
      es6: true,
      es7: true,
      minify: true,
      autoPrefixWXSS: true,
    },
    robot,
    qrcodeFormat,
    onProgressUpdate: console.log,
  };

  if (qrcodeFormat === 'image') {
    previewOptions.qrcodeOutputDest = qrcodeOutputDest;
  }

  if (pagePath) {
    previewOptions.pagePath = pagePath;
  }

  if (searchQuery) {
    previewOptions.searchQuery = searchQuery;
  }

  const previewResult = await ci.preview(previewOptions);

  console.log('\n========================================');
  console.log('  预览成功！');
  console.log('========================================');

  if (qrcodeFormat === 'image') {
    console.log(`  二维码已保存到: ${qrcodeOutputDest}`);
  }

  if (previewResult.subPackageInfo) {
    console.log('\n分包信息:');
    previewResult.subPackageInfo.forEach((pkg) => {
      console.log(`  ${pkg.name || '主包'}: ${(pkg.size / 1024).toFixed(2)} KB`);
    });
  }

  return previewResult;
}

preview().catch((err) => {
  console.error('\n预览失败:', err.message || err);
  process.exit(1);
});
