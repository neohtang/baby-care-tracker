#!/usr/bin/env node
/**
 * 自动创建 CloudBase 数据库集合 + 索引 + 安全规则 + 匿名登录
 * 使用 @cloudbase/manager-node SDK
 */
const CloudBase = require("@cloudbase/manager-node");
const fs = require("fs");
const path = require("path");

// 读取配置
const configPath = path.resolve(__dirname, "../cloudbaserc.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const authPath = path.join(process.env.HOME, ".config/.cloudbase/auth.json");
const auth = JSON.parse(fs.readFileSync(authPath, "utf-8"));

const envId = config.envId;
const collections = config.framework.plugins.database.inputs.collections;

async function main() {
  console.log(`🔧 目标环境: ${envId}`);
  console.log(`📋 待创建集合: ${collections.length} 个\n`);

  const app = new CloudBase({
    secretId: auth.credential.tmpSecretId,
    secretKey: auth.credential.tmpSecretKey,
    token: auth.credential.tmpToken,
    envId: envId,
  });

  const { database, env } = app;
  const common = app.commonService();

  // ========== 1. 创建集合 ==========
  for (const col of collections) {
    const name = col.collectionName;
    try {
      console.log(`📦 创建集合: ${name}`);
      await database.createCollectionIfNotExists(name);
      console.log(`   ✅ 集合 ${name} 就绪`);
    } catch (e) {
      console.log(`   ⚠️  ${e.message}`);
    }
  }
  console.log("");

  // ========== 2. 逐个集合设置安全规则（使用 ModifySafeRule） ==========
  console.log("🔒 设置安全规则...");
  for (const col of collections) {
    const rule = col.aclRule || {
      read: "auth.uid != null",
      write: "auth.uid != null",
    };
    try {
      await common.call({
        Action: "ModifySafeRule",
        Param: {
          EnvId: envId,
          CollectionName: col.collectionName,
          AclTag: "CUSTOM",
          Rule: JSON.stringify(rule),
        },
      });
      console.log(`   ✅ ${col.collectionName} 安全规则已设置`);
    } catch (e) {
      console.log(`   ⚠️  ${col.collectionName}: ${e.message}`);
    }
  }
  console.log("");

  // ========== 3. 开启匿名登录 ==========
  console.log("🔑 配置匿名登录...");
  try {
    // 通过 CommonService 调用 TCB API 开启匿名登录
    await common.call({
      Action: "CreateLoginConfig",
      Param: {
        EnvId: envId,
        Platform: "ANONYMOUS",
        PlatformId: "anonymous",
        Status: "ENABLE",
      },
    });
    console.log("   ✅ 匿名登录已开启");
  } catch (e) {
    // 如果已存在则尝试修改
    try {
      await common.call({
        Action: "ModifyLoginConfig",
        Param: {
          EnvId: envId,
          Platform: "ANONYMOUS",
          PlatformId: "anonymous",
          Status: "ENABLE",
        },
      });
      console.log("   ✅ 匿名登录已开启（ModifyLoginConfig）");
    } catch (e2) {
      console.log(`   ⚠️  匿名登录自动配置失败: ${e2.message}`);
      console.log("   ℹ️  请在控制台手动开启: 环境设置 → 登录授权 → 匿名登录");
      console.log(`   📌 控制台: https://tcb.cloud.tencent.com/dev?envId=${envId}#/env/login`);
    }
  }
  console.log("");

  // ========== 4. 验证结果 ==========
  console.log("📊 验证部署结果...");
  try {
    const listResult = await database.listCollections({
      MgoOffset: 0,
      MgoLimit: 20,
    });
    if (listResult && listResult.Collections) {
      console.log(`   已有 ${listResult.Collections.length} 个集合:`);
      listResult.Collections.forEach((c) => {
        console.log(`   - ${c.CollectionName}`);
      });
    }
  } catch (e) {
    console.log(`   ⚠️  列表查询: ${e.message}`);
  }

  console.log("\n🎉 数据库部署完成！");
  console.log(
    `📌 控制台: https://tcb.cloud.tencent.com/dev?envId=${envId}#/database`
  );
}

main().catch((e) => {
  console.error("❌ 部署失败:", e);
  process.exit(1);
});
