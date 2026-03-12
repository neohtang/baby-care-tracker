const ci = require('miniprogram-ci');
const path = require('path');
const { getProject, parseArgs } = require('./project');

async function upload() {
  const args = parseArgs();
  const pkg = require(path.resolve(__dirname, '..', 'package.json'));

  const version = args.ver || pkg.version;
  const desc = args.desc || `v${version} uploaded by CI`;
  const robot = parseInt(args.robot, 10) || 1;

  const project = getProject();

  console.log('========================================');
  console.log('  小程序代码上传');
  console.log('========================================');
  console.log(`  版本号:   ${version}`);
  console.log(`  描述:     ${desc}`);
  console.log(`  机器人:   CI Robot ${robot}`);
  console.log('========================================\n');

  const uploadResult = await ci.upload({
    project,
    version,
    desc,
    setting: {
      es6: true,
      es7: true,
      minify: true,
      autoPrefixWXSS: true,
    },
    robot,
    onProgressUpdate: console.log,
  });

  console.log('\n========================================');
  console.log('  上传成功！');
  console.log('========================================');

  if (uploadResult.subPackageInfo) {
    console.log('\n分包信息:');
    uploadResult.subPackageInfo.forEach((pkg) => {
      console.log(`  ${pkg.name || '主包'}: ${(pkg.size / 1024).toFixed(2)} KB`);
    });
  }

  return uploadResult;
}

upload().catch((err) => {
  console.error('\n上传失败:', err.message || err);
  process.exit(1);
});
