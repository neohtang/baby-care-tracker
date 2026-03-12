const ci = require('miniprogram-ci');
const path = require('path');

const APP_ID = 'wx1f1bc8e6ff2be61d';
const PROJECT_PATH = path.resolve(__dirname, '..');
const DEFAULT_PRIVATE_KEY_PATH = '/Users/tanghan/Downloads/private.wx1f1bc8e6ff2be61d.key';

/**
 * 获取 miniprogram-ci Project 实例
 * 密钥路径优先从环境变量 MINI_PROGRAM_PRIVATE_KEY 读取，否则使用默认路径
 */
function getProject() {
  const privateKeyPath = process.env.MINI_PROGRAM_PRIVATE_KEY || DEFAULT_PRIVATE_KEY_PATH;

  return new ci.Project({
    appid: APP_ID,
    type: 'miniProgram',
    projectPath: PROJECT_PATH,
    privateKeyPath: privateKeyPath,
    ignores: ['node_modules/**/*'],
  });
}

/**
 * 解析命令行参数，支持 --key value 和 --key=value 两种格式
 * @returns {Object} 解析后的参数键值对
 */
function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const equalIndex = arg.indexOf('=');
      if (equalIndex !== -1) {
        // --key=value 格式
        const key = arg.substring(2, equalIndex);
        args[key] = arg.substring(equalIndex + 1);
      } else {
        // --key value 格式
        const key = arg.substring(2);
        const nextArg = argv[i + 1];
        if (nextArg && !nextArg.startsWith('--')) {
          args[key] = nextArg;
          i++;
        } else {
          args[key] = true;
        }
      }
    }
  }

  return args;
}

module.exports = { getProject, parseArgs, APP_ID, PROJECT_PATH };
