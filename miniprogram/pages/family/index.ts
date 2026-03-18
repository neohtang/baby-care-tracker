// pages/family/index.ts
// 家庭成员协作页面 (Phase 3.2)

import { familyService, ROLE_CONFIG } from '../../services/family';
import type { FamilyGroup, FamilyMember, FamilyRole, OperationRecord } from '../../services/family';
import { store } from '../../store/index';

Page({
  data: {
    pageStyle: '',
    hasFamily: false,

    // 家庭组信息
    familyName: '',
    members: [] as (FamilyMember & { roleName: string })[],
    memberCount: 0,

    // 邀请
    inviteCode: '',
    inviteExpiry: '',

    // 操作日志
    recentOps: [] as OperationRecord[],

    // 权限
    isAdmin: false,
    canEdit: false,

    // 弹窗
    showCreatePopup: false,
    showInvitePopup: false,
    showJoinPopup: false,

    // 创建表单
    createFamilyName: '',
    createNickname: '',
    createRelationship: '妈妈',
    relationshipOptions: ['妈妈', '爸爸', '爷爷', '奶奶', '外公', '外婆', '保姆', '其他'],
    relationshipIndex: 0,

    // 加入表单
    joinInviteCode: '',
    joinNickname: '',
    joinRelationship: '爸爸',
    joinRelationshipIndex: 1,
  },

  _storeDisconnect: null as (() => void) | null,

  onLoad(options: Record<string, string | undefined>) {
    this._storeDisconnect = store.connect(this as any, {
      pageStyle: true,
    });

    // 如果从分享链接进入，自动填充邀请码并弹出加入弹窗
    if (options.inviteCode) {
      this.setData({
        joinInviteCode: options.inviteCode.toUpperCase(),
        showJoinPopup: true,
      });
    }
  },

  onShow() {
    this._loadFamilyData();

    // 如果本地没有家庭组，尝试从云端拉取（跨设备场景）
    if (!familyService.getFamilyGroup()) {
      familyService.pullFamilyFromCloud().then((family) => {
        if (family) {
          this._loadFamilyData();
        }
      });
    }
  },

  onUnload() {
    if (this._storeDisconnect) {
      this._storeDisconnect();
      this._storeDisconnect = null;
    }
  },

  // ============ 数据加载 ============

  _loadFamilyData() {
    const family = familyService.getFamilyGroup();

    if (!family) {
      this.setData({ hasFamily: false });
      return;
    }

    const members = family.members.map((m) => ({
      ...m,
      roleName: ROLE_CONFIG[m.role].name,
    }));

    const currentMember = familyService.getCurrentMember();
    const isAdmin = currentMember?.role === 'admin';

    const recentOps = familyService.getOperationLog(20);

    this.setData({
      hasFamily: true,
      familyName: family.name,
      members,
      memberCount: members.length,
      inviteCode: family.inviteCode,
      inviteExpiry: family.inviteCodeExpiry.substring(0, 10),
      isAdmin,
      canEdit: familyService.canEdit(),
      recentOps,
    });
  },

  // ============ 创建家庭组 ============

  showCreateFamily() {
    this.setData({ showCreatePopup: true });
  },

  closeCreatePopup() {
    this.setData({ showCreatePopup: false });
  },

  onCreateNameInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ createFamilyName: e.detail.value });
  },

  onCreateNicknameInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ createNickname: e.detail.value });
  },

  onCreateRelationshipChange(e: WechatMiniprogram.CustomEvent) {
    const idx = Number(e.detail.value);
    this.setData({
      relationshipIndex: idx,
      createRelationship: this.data.relationshipOptions[idx],
    });
  },

  createFamily() {
    const { createFamilyName, createNickname, createRelationship } = this.data;
    if (!createFamilyName.trim()) {
      wx.showToast({ title: '请输入家庭名称', icon: 'none' });
      return;
    }
    if (!createNickname.trim()) {
      wx.showToast({ title: '请输入你的昵称', icon: 'none' });
      return;
    }

    familyService.createFamily(createFamilyName.trim(), {
      nickname: createNickname.trim(),
      avatarUrl: '',
      relationship: createRelationship,
    });

    wx.showToast({ title: '创建成功', icon: 'success' });
    this.closeCreatePopup();
    this._loadFamilyData();
  },

  // ============ 邀请 ============

  showInvite() {
    this.setData({ showInvitePopup: true });
  },

  closeInvitePopup() {
    this.setData({ showInvitePopup: false });
  },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  refreshInviteCode() {
    const code = familyService.refreshInviteCode();
    if (code) {
      const family = familyService.getFamilyGroup();
      this.setData({
        inviteCode: code,
        inviteExpiry: family?.inviteCodeExpiry.substring(0, 10) || '',
      });
      wx.showToast({ title: '已刷新', icon: 'success' });
    }
  },

  // ============ 加入家庭 ============

  showJoinFamily() {
    this.setData({ showJoinPopup: true });
  },

  closeJoinPopup() {
    this.setData({ showJoinPopup: false });
  },

  onJoinCodeInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ joinInviteCode: e.detail.value.toUpperCase() });
  },

  onJoinNicknameInput(e: WechatMiniprogram.CustomEvent) {
    this.setData({ joinNickname: e.detail.value });
  },

  onJoinRelationshipChange(e: WechatMiniprogram.CustomEvent) {
    const idx = Number(e.detail.value);
    this.setData({
      joinRelationshipIndex: idx,
      joinRelationship: this.data.relationshipOptions[idx],
    });
  },

  async joinFamily() {
    const { joinInviteCode, joinNickname, joinRelationship } = this.data;
    if (!joinInviteCode.trim()) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    if (!joinNickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加入中...' });
    try {
      const success = await familyService.joinFamily(joinInviteCode.trim(), {
        nickname: joinNickname.trim(),
        avatarUrl: '',
        relationship: joinRelationship,
      });

      wx.hideLoading();
      if (success) {
        wx.showToast({ title: '加入成功', icon: 'success' });
        this.closeJoinPopup();
        this._loadFamilyData();
      }
    } catch {
      wx.hideLoading();
      wx.showToast({ title: '加入失败，请重试', icon: 'none' });
    }
  },

  // ============ 成员管理 ============

  onMemberTap(e: WechatMiniprogram.CustomEvent) {
    if (!this.data.isAdmin) return;

    const memberId = e.currentTarget.dataset.id;
    const member = this.data.members.find((m) => m.id === memberId);
    if (!member) return;

    const currentMember = familyService.getCurrentMember();
    if (member.openId === currentMember?.openId) return; // 不能操作自己

    wx.showActionSheet({
      itemList: ['设为管理员', '设为记录者', '设为查看者', '移除成员'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            familyService.updateMemberRole(memberId, 'admin');
            break;
          case 1:
            familyService.updateMemberRole(memberId, 'editor');
            break;
          case 2:
            familyService.updateMemberRole(memberId, 'viewer');
            break;
          case 3:
            wx.showModal({
              title: '确认移除',
              content: `确定要移除${member.nickname}吗？`,
              confirmColor: '#E8736C',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  familyService.removeMember(memberId);
                  this._loadFamilyData();
                }
              },
            });
            return;
        }
        this._loadFamilyData();
      },
    });
  },

  // ============ 解散家庭组 ============

  deleteFamily() {
    wx.showModal({
      title: '解散家庭组',
      content: '解散后所有成员将退出协作，数据将恢复为本地模式。确定要解散吗？',
      confirmColor: '#E8736C',
      confirmText: '确认解散',
      success: (res) => {
        if (res.confirm) {
          familyService.deleteFamily();
          wx.showToast({ title: '已解散', icon: 'success' });
          this._loadFamilyData();
        }
      },
    });
  },

  // ============ 分享 ============

  onShareAppMessage() {
    const info = familyService.getInviteInfo();
    if (info) {
      return {
        title: `${info.inviterName}邀请你加入"${info.familyName}"一起记录宝宝成长`,
        path: `/pages/family/index?inviteCode=${info.inviteCode}`,
      };
    }
    return {
      title: '一起记录宝宝的成长',
      path: '/pages/family/index',
    };
  },
});
