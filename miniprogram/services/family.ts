/**
 * FamilyService - 家庭成员协作服务 (Phase 3.2)
 *
 * 功能：
 * 1. 家庭组创建与管理
 * 2. 成员邀请（生成邀请码/二维码）
 * 3. 多角色权限控制（管理员/记录者/查看者）
 * 4. 操作记录归属（谁在什么时间记录了什么）
 * 5. 云端同步（通过 wx.cloud 实现跨设备协作）
 *
 * 依赖：
 * - wx.cloud 微信原生云开发 API
 * - 离线优先：所有操作先写本地，异步同步到云端
 *
 * 当前状态：
 * - ✅ 家庭组数据模型 + 本地管理
 * - ✅ 成员角色权限体系
 * - ✅ 邀请码生成与验证（云端 + 本地降级）
 * - ✅ 操作归属记录
 * - ✅ 云端数据桥接（family_groups / family_operations 集合）
 * - ⬜ 实时数据同步（CloudBase watch，后续迭代）
 */

import { generateId, nowISO } from './storage';
import { babyService } from './baby';

// ============ 类型定义 ============

/** 成员角色 */
export type FamilyRole = 'admin' | 'editor' | 'viewer';

/** 角色权限描述 */
export const ROLE_CONFIG: Record<
  FamilyRole,
  { name: string; desc: string; permissions: string[] }
> = {
  admin: {
    name: '管理员',
    desc: '可管理家庭组、添加/删除成员、编辑所有记录',
    permissions: [
      'manage_family',
      'invite_member',
      'remove_member',
      'create_record',
      'edit_record',
      'delete_record',
      'view_record',
    ],
  },
  editor: {
    name: '记录者',
    desc: '可以添加和编辑记录，不能管理家庭组成员',
    permissions: ['create_record', 'edit_record', 'view_record'],
  },
  viewer: {
    name: '查看者',
    desc: '只能查看记录，不能编辑',
    permissions: ['view_record'],
  },
};

/** 家庭成员 */
export interface FamilyMember {
  id: string;
  /** 微信用户 openId */
  openId: string;
  /** 昵称 */
  nickname: string;
  /** 头像 URL */
  avatarUrl: string;
  /** 角色 */
  role: FamilyRole;
  /** 与宝宝的关系（爸爸/妈妈/爷爷/奶奶等） */
  relationship: string;
  /** 加入时间 */
  joinedAt: string;
  /** 最后活跃时间 */
  lastActiveAt: string;
}

/** 家庭组 */
export interface FamilyGroup {
  id: string;
  /** 家庭名称 */
  name: string;
  /** 关联宝宝 ID 列表 */
  babyIds: string[];
  /** 家庭成员 */
  members: FamilyMember[];
  /** 创建者 openId */
  creatorId: string;
  /** 邀请码 */
  inviteCode: string;
  /** 邀请码过期时间 */
  inviteCodeExpiry: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/** 操作记录归属 */
export interface OperationRecord {
  id: string;
  /** 操作人 */
  memberId: string;
  memberName: string;
  memberRole: FamilyRole;
  /** 操作类型 */
  action: 'create' | 'update' | 'delete';
  /** 操作模块 */
  module: string;
  /** 操作描述 */
  description: string;
  /** 关联记录 ID */
  recordId: string;
  /** 操作时间 */
  timestamp: string;
}

/** 邀请信息 */
export interface InviteInfo {
  familyId: string;
  familyName: string;
  inviterName: string;
  inviteCode: string;
  expiresAt: string;
  isExpired: boolean;
}

// ============ 存储 key ============

const FAMILY_STORAGE_KEY = 'family_group';
const OPERATION_LOG_KEY = 'family_operation_log';
const CURRENT_MEMBER_KEY = 'family_current_member';

/** 云端集合名 */
const CLOUD_FAMILY_COLLECTION = 'family_groups';
const CLOUD_OPERATIONS_COLLECTION = 'family_operations';

// ============ 服务主体 ============

class FamilyService {
  // ============ 云端能力 ============

  /**
   * 获取微信云开发数据库实例（离线时返回 null）
   */
  private _getCloudDatabase(): any {
    try {
      const app = getApp<any>();
      if (app?.globalData?.cloudReady && wx.cloud) {
        return wx.cloud.database();
      }
    } catch {
      // wx.cloud 未就绪
    }
    return null;
  }

  /**
   * 检查云端是否可用
   */
  private _isCloudReady(): boolean {
    return !!this._getCloudDatabase();
  }

  /**
   * 将家庭组数据同步到云端（异步，不阻塞本地操作）
   */
  private async _syncFamilyToCloud(family: FamilyGroup): Promise<void> {
    const db = this._getCloudDatabase();
    if (!db) return;

    try {
      const userId = this._getCurrentOpenId();
      // 尝试更新已有记录
      const updateRes = await db
        .collection(CLOUD_FAMILY_COLLECTION)
        .where({ localId: family.id })
        .update({
          name: family.name,
          babyIds: family.babyIds,
          members: family.members,
          creatorId: family.creatorId,
          inviteCode: family.inviteCode,
          inviteCodeExpiry: family.inviteCodeExpiry,
          updatedAt: family.updatedAt,
          userId,
        });

      if (updateRes.updated === 0) {
        // 云端没有该记录，创建新记录
        await db.collection(CLOUD_FAMILY_COLLECTION).add({
          localId: family.id,
          name: family.name,
          babyIds: family.babyIds,
          members: family.members,
          creatorId: family.creatorId,
          inviteCode: family.inviteCode,
          inviteCodeExpiry: family.inviteCodeExpiry,
          createdAt: family.createdAt,
          updatedAt: family.updatedAt,
          userId,
        });
      }
    } catch (err) {
      console.warn('[FamilyService] 云端同步失败（不影响本地）:', err);
    }
  }

  /**
   * 从云端删除家庭组
   */
  private async _deleteFamilyFromCloud(familyId: string): Promise<void> {
    const db = this._getCloudDatabase();
    if (!db) return;

    try {
      await db.collection(CLOUD_FAMILY_COLLECTION).where({ localId: familyId }).update({
        deletedAt: nowISO(),
        updatedAt: nowISO(),
      });
    } catch (err) {
      console.warn('[FamilyService] 云端删除失败:', err);
    }
  }

  /**
   * 从云端通过邀请码查询家庭组
   */
  private async _findFamilyByInviteCodeFromCloud(inviteCode: string): Promise<FamilyGroup | null> {
    const db = this._getCloudDatabase();
    if (!db) return null;

    try {
      const res = await db
        .collection(CLOUD_FAMILY_COLLECTION)
        .where({
          inviteCode,
          deletedAt: db.command.exists(false),
        })
        .limit(1)
        .get();

      if (res.data && res.data.length > 0) {
        const doc = res.data[0];
        // 将云端数据转换为本地 FamilyGroup 格式
        return {
          id: doc.localId || doc._id,
          name: doc.name,
          babyIds: doc.babyIds || [],
          members: doc.members || [],
          creatorId: doc.creatorId,
          inviteCode: doc.inviteCode,
          inviteCodeExpiry: doc.inviteCodeExpiry,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };
      }
    } catch (err) {
      console.warn('[FamilyService] 云端查询邀请码失败:', err);
    }
    return null;
  }

  /**
   * 将操作记录同步到云端
   */
  private async _syncOperationToCloud(record: OperationRecord, familyId: string): Promise<void> {
    const db = this._getCloudDatabase();
    if (!db) return;

    try {
      await db.collection(CLOUD_OPERATIONS_COLLECTION).add({
        ...record,
        familyId,
        userId: this._getCurrentOpenId(),
      });
    } catch (err) {
      console.warn('[FamilyService] 操作记录云端同步失败:', err);
    }
  }

  /**
   * 从云端拉取家庭组最新数据（覆盖本地）
   */
  async pullFamilyFromCloud(): Promise<FamilyGroup | null> {
    const db = this._getCloudDatabase();
    if (!db) return null;

    const userId = this._getCurrentOpenId();
    if (!userId || userId.startsWith('local_')) return null;

    try {
      // 查找包含当前用户的家庭组
      const res = await db
        .collection(CLOUD_FAMILY_COLLECTION)
        .where({
          'members.openId': userId,
          deletedAt: db.command.exists(false),
        })
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get();

      if (res.data && res.data.length > 0) {
        const doc = res.data[0];
        const family: FamilyGroup = {
          id: doc.localId || doc._id,
          name: doc.name,
          babyIds: doc.babyIds || [],
          members: doc.members || [],
          creatorId: doc.creatorId,
          inviteCode: doc.inviteCode,
          inviteCodeExpiry: doc.inviteCodeExpiry,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        };

        // 写入本地
        this._saveFamily(family);

        // 恢复当前成员信息
        const currentMember = family.members.find((m) => m.openId === userId);
        if (currentMember) {
          this._saveCurrentMember(currentMember);
        }

        return family;
      }
    } catch (err) {
      console.warn('[FamilyService] 从云端拉取家庭组失败:', err);
    }

    return null;
  }

  // ============ 家庭组管理 ============

  /**
   * 获取当前家庭组
   */
  getFamilyGroup(): FamilyGroup | null {
    try {
      const raw = wx.getStorageSync(FAMILY_STORAGE_KEY);
      return raw || null;
    } catch {
      return null;
    }
  }

  /**
   * 创建家庭组
   */
  createFamily(
    name: string,
    creatorInfo: { nickname: string; avatarUrl: string; relationship: string },
  ): FamilyGroup {
    const familyId = generateId();
    const creatorMember: FamilyMember = {
      id: generateId(),
      openId: this._getCurrentOpenId(),
      nickname: creatorInfo.nickname,
      avatarUrl: creatorInfo.avatarUrl,
      role: 'admin',
      relationship: creatorInfo.relationship,
      joinedAt: nowISO(),
      lastActiveAt: nowISO(),
    };

    // 关联当前宝宝
    const currentBaby = babyService.getCurrentBaby();
    const babyIds = currentBaby ? [currentBaby.id] : [];

    const family: FamilyGroup = {
      id: familyId,
      name,
      babyIds,
      members: [creatorMember],
      creatorId: creatorMember.openId,
      inviteCode: this._generateInviteCode(),
      inviteCodeExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天有效
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };

    // 本地保存（即时生效）
    this._saveFamily(family);
    this._saveCurrentMember(creatorMember);

    // 异步同步到云端
    this._syncFamilyToCloud(family);

    return family;
  }

  /**
   * 更新家庭名称
   */
  updateFamilyName(name: string): boolean {
    const family = this.getFamilyGroup();
    if (!family) return false;

    if (!this.hasPermission('manage_family')) {
      wx.showToast({ title: '没有管理权限', icon: 'none' });
      return false;
    }

    family.name = name;
    family.updatedAt = nowISO();
    this._saveFamily(family);

    // 异步同步到云端
    this._syncFamilyToCloud(family);

    return true;
  }

  /**
   * 删除家庭组
   */
  deleteFamily(): boolean {
    const family = this.getFamilyGroup();
    if (!family) return false;

    if (!this.hasPermission('manage_family')) {
      wx.showToast({ title: '只有管理员可以解散家庭组', icon: 'none' });
      return false;
    }

    try {
      // 本地清除
      wx.removeStorageSync(FAMILY_STORAGE_KEY);
      wx.removeStorageSync(OPERATION_LOG_KEY);
      wx.removeStorageSync(CURRENT_MEMBER_KEY);

      // 异步云端软删除
      this._deleteFamilyFromCloud(family.id);

      return true;
    } catch {
      return false;
    }
  }

  // ============ 成员管理 ============

  /**
   * 获取当前登录用户的成员信息
   */
  getCurrentMember(): FamilyMember | null {
    try {
      return wx.getStorageSync(CURRENT_MEMBER_KEY) || null;
    } catch {
      return null;
    }
  }

  /**
   * 获取所有成员列表
   */
  getMembers(): FamilyMember[] {
    const family = this.getFamilyGroup();
    return family?.members || [];
  }

  /**
   * 添加成员（通过邀请码加入）
   * 优先从云端查询家庭组，本地降级
   */
  async joinFamily(
    inviteCode: string,
    memberInfo: { nickname: string; avatarUrl: string; relationship: string },
  ): Promise<boolean> {
    // 优先从云端查询
    let family = await this._findFamilyByInviteCodeFromCloud(inviteCode);
    let isCloudFamily = !!family;

    // 云端没有则尝试本地
    if (!family) {
      family = this.getFamilyGroup();
      isCloudFamily = false;
    }

    if (!family) {
      wx.showToast({ title: '家庭组不存在', icon: 'none' });
      return false;
    }

    // 验证邀请码
    if (family.inviteCode !== inviteCode) {
      wx.showToast({ title: '邀请码无效', icon: 'none' });
      return false;
    }

    // 验证是否过期
    if (new Date(family.inviteCodeExpiry) < new Date()) {
      wx.showToast({ title: '邀请码已过期', icon: 'none' });
      return false;
    }

    // 检查是否已是成员
    const openId = this._getCurrentOpenId();
    if (family.members.some((m) => m.openId === openId)) {
      wx.showToast({ title: '你已经是家庭成员了', icon: 'none' });
      return false;
    }

    // 添加为记录者角色
    const newMember: FamilyMember = {
      id: generateId(),
      openId,
      nickname: memberInfo.nickname,
      avatarUrl: memberInfo.avatarUrl,
      role: 'editor',
      relationship: memberInfo.relationship,
      joinedAt: nowISO(),
      lastActiveAt: nowISO(),
    };

    family.members.push(newMember);
    family.updatedAt = nowISO();

    // 本地保存
    this._saveFamily(family);
    this._saveCurrentMember(newMember);

    this.logOperation('create', 'family', `${memberInfo.nickname}加入了家庭组`, newMember.id);

    // 同步到云端（关键：确保其他设备也能看到新成员）
    this._syncFamilyToCloud(family);

    return true;
  }

  /**
   * 移除成员
   */
  removeMember(memberId: string): boolean {
    const family = this.getFamilyGroup();
    if (!family) return false;

    if (!this.hasPermission('remove_member')) {
      wx.showToast({ title: '没有移除权限', icon: 'none' });
      return false;
    }

    // 不能移除创建者
    const member = family.members.find((m) => m.id === memberId);
    if (member && member.openId === family.creatorId) {
      wx.showToast({ title: '不能移除创建者', icon: 'none' });
      return false;
    }

    family.members = family.members.filter((m) => m.id !== memberId);
    family.updatedAt = nowISO();
    this._saveFamily(family);

    if (member) {
      this.logOperation('delete', 'family', `${member.nickname}被移出了家庭组`, memberId);
    }

    // 异步同步到云端
    this._syncFamilyToCloud(family);

    return true;
  }

  /**
   * 更新成员角色
   */
  updateMemberRole(memberId: string, newRole: FamilyRole): boolean {
    const family = this.getFamilyGroup();
    if (!family) return false;

    if (!this.hasPermission('manage_family')) {
      wx.showToast({ title: '没有管理权限', icon: 'none' });
      return false;
    }

    const member = family.members.find((m) => m.id === memberId);
    if (!member) return false;

    member.role = newRole;
    family.updatedAt = nowISO();
    this._saveFamily(family);

    this.logOperation(
      'update',
      'family',
      `${member.nickname}的角色变更为${ROLE_CONFIG[newRole].name}`,
      memberId,
    );

    // 异步同步到云端
    this._syncFamilyToCloud(family);

    return true;
  }

  // ============ 邀请码 ============

  /**
   * 生成新的邀请码
   */
  refreshInviteCode(): string | null {
    const family = this.getFamilyGroup();
    if (!family) return null;

    if (!this.hasPermission('invite_member')) {
      wx.showToast({ title: '没有邀请权限', icon: 'none' });
      return null;
    }

    family.inviteCode = this._generateInviteCode();
    family.inviteCodeExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    family.updatedAt = nowISO();
    this._saveFamily(family);

    // 异步同步到云端（确保新邀请码在云端可查）
    this._syncFamilyToCloud(family);

    return family.inviteCode;
  }

  /**
   * 获取邀请信息（用于分享）
   */
  getInviteInfo(): InviteInfo | null {
    const family = this.getFamilyGroup();
    const currentMember = this.getCurrentMember();
    if (!family || !currentMember) return null;

    return {
      familyId: family.id,
      familyName: family.name,
      inviterName: currentMember.nickname,
      inviteCode: family.inviteCode,
      expiresAt: family.inviteCodeExpiry,
      isExpired: new Date(family.inviteCodeExpiry) < new Date(),
    };
  }

  // ============ 权限检查 ============

  /**
   * 检查当前用户是否有指定权限
   */
  hasPermission(permission: string): boolean {
    const member = this.getCurrentMember();
    if (!member) return false;

    const roleConfig = ROLE_CONFIG[member.role];
    return roleConfig.permissions.includes(permission);
  }

  /**
   * 检查是否可以编辑记录
   */
  canEdit(): boolean {
    const family = this.getFamilyGroup();
    // 没有家庭组时，单人模式，允许所有操作
    if (!family) return true;
    return this.hasPermission('edit_record');
  }

  /**
   * 检查是否可以删除记录
   */
  canDelete(): boolean {
    const family = this.getFamilyGroup();
    if (!family) return true;
    return this.hasPermission('delete_record');
  }

  // ============ 操作记录归属 ============

  /**
   * 记录操作
   */
  logOperation(
    action: 'create' | 'update' | 'delete',
    module: string,
    description: string,
    recordId: string,
  ): void {
    const member = this.getCurrentMember();
    if (!member) return;

    const record: OperationRecord = {
      id: generateId(),
      memberId: member.id,
      memberName: member.nickname,
      memberRole: member.role,
      action,
      module,
      description,
      recordId,
      timestamp: nowISO(),
    };

    const log = this._getOperationLog();
    log.unshift(record);

    // 保留最近 500 条
    if (log.length > 500) {
      log.splice(500);
    }

    this._saveOperationLog(log);

    // 异步同步到云端
    const family = this.getFamilyGroup();
    if (family) {
      this._syncOperationToCloud(record, family.id);
    }
  }

  /**
   * 获取操作历史
   */
  getOperationLog(limit: number = 50): OperationRecord[] {
    return this._getOperationLog().slice(0, limit);
  }

  /**
   * 获取指定成员的操作历史
   */
  getMemberOperations(memberId: string, limit: number = 20): OperationRecord[] {
    return this._getOperationLog()
      .filter((r) => r.memberId === memberId)
      .slice(0, limit);
  }

  // ============ 内部方法 ============

  private _getCurrentOpenId(): string {
    // 优先使用已缓存的用户ID（由 app.ts 初始化时通过云函数获取并缓存）
    try {
      const cached = wx.getStorageSync('user_openid');
      if (cached) return cached;
    } catch {
      // ignore
    }

    // 降级：生成本地唯一标识
    try {
      const localId = `local_${generateId()}`;
      wx.setStorageSync('user_openid', localId);
      return localId;
    } catch {
      return `local_${Date.now()}`;
    }
  }

  private _generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private _saveFamily(family: FamilyGroup): void {
    try {
      wx.setStorageSync(FAMILY_STORAGE_KEY, family);
    } catch (err) {
      console.error('[FamilyService] 保存家庭组失败:', err);
    }
  }

  private _saveCurrentMember(member: FamilyMember): void {
    try {
      wx.setStorageSync(CURRENT_MEMBER_KEY, member);
    } catch (err) {
      console.error('[FamilyService] 保存当前成员失败:', err);
    }
  }

  private _getOperationLog(): OperationRecord[] {
    try {
      const raw = wx.getStorageSync(OPERATION_LOG_KEY);
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  private _saveOperationLog(log: OperationRecord[]): void {
    try {
      wx.setStorageSync(OPERATION_LOG_KEY, log);
    } catch (err) {
      console.error('[FamilyService] 保存操作日志失败:', err);
    }
  }
}

export const familyService = new FamilyService();
export default familyService;
