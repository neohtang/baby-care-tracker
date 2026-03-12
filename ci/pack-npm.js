const ci = require('miniprogram-ci');
const { getProject } = require('./project');

async function packNpm() {
  const project = getProject();

  console.log('========================================');
  console.log('  构建 npm');
  console.log('========================================\n');

  const warning = await ci.packNpm(project, {
    ignores: [],
    reporter: (infos) => {
      console.log(infos);
    },
  });

  console.log('\n========================================');
  console.log('  npm 构建完成！');
  console.log('========================================');

  if (warning && warning.length > 0) {
    console.log('\n构建警告:');
    warning.forEach((w) => {
      console.log(`  ⚠ ${w}`);
    });
  }

  return warning;
}

packNpm().catch((err) => {
  console.error('\nnpm 构建失败:', err.message || err);
  process.exit(1);
});
