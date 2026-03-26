const app = getApp()

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    historyCount: 0,
    craneCount: 0,
    ropeCount: 0,
    otherCount: 0,

    // 功能快捷入口
    toolEntries: [
      { id: 'crane', icon: '🏗️', label: '吊车选型', color: '#E8402F', url: '/pages/crane/index' },
      { id: 'rope', icon: '⛓️', label: '吊绳选型', color: '#1890FF', url: '/pages/rope/index' },
      { id: 'angle', icon: '📐', label: '角度计算', color: '#722ED1', url: '/pages/angle/index' },
      { id: 'damage', icon: '🔍', label: '损坏核算', color: '#FA541C', url: '/pages/damage/index' },
      { id: 'capacity', icon: '💪', label: '承载力算', color: '#13C2C2', url: '/pages/capacity/index' },
      { id: 'handbook', icon: '📖', label: '知识手册', color: '#2F54EB', url: '/pages/handbook/index' }
    ],

    // 菜单项
    menuItems: [
      { id: 'history', icon: '📋', label: '计算历史', desc: '查看所有计算记录' },
      { id: 'help', icon: '❓', label: '使用帮助', desc: '了解各功能使用方法' },
      { id: 'params', icon: '⚙️', label: '常用参数', desc: '常用吊装参数速查', badge: 'NEW' },
      { id: 'share', icon: '🔗', label: '分享好友', desc: '分享给同事朋友' },
      { id: 'feedback', icon: '💬', label: '意见反馈', desc: '帮助我们改进' },
      { id: 'about', icon: 'ℹ️', label: '关于我们', desc: '版本信息与声明' }
    ],

    showHistoryModal: false,
    showHelpModal: false,
    showAboutModal: false,
    showParamsModal: false,
    calcHistory: []
  },

  onLoad() {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    // 更新统计
    const history = app.globalData.calcHistory || []
    const craneCount = history.filter(h => h.type === 'crane').length
    const ropeCount = history.filter(h => h.type === 'rope').length
    const otherCount = history.length - craneCount - ropeCount
    this.setData({
      historyCount: history.length,
      craneCount,
      ropeCount,
      otherCount,
      calcHistory: history.slice(0, 30)
    })
  },

  // 登录
  onLogin() {
    wx.showModal({
      title: '提示',
      content: '登录功能开发中，敬请期待！',
      showCancel: false
    })
  },

  // 工具快捷入口
  goToTool(e) {
    const url = e.currentTarget.dataset.url
    wx.navigateTo({ url })
  },

  // 菜单点击
  onMenuTap(e) {
    const id = e.currentTarget.dataset.id
    switch (id) {
      case 'history':
        this.setData({ showHistoryModal: true })
        break
      case 'help':
        this.setData({ showHelpModal: true })
        break
      case 'params':
        this.setData({ showParamsModal: true })
        break
      case 'share':
        wx.showToast({ title: '请使用右上角分享', icon: 'none' })
        break
      case 'feedback':
        wx.showModal({
          title: '意见反馈',
          content: '感谢您的使用！如有建议请通过微信联系我们。',
          showCancel: false
        })
        break
      case 'about':
        this.setData({ showAboutModal: true })
        break
    }
  },

  // 底部链接
  onShowTerms() {
    wx.navigateTo({ url: '/pages/terms/index' })
  },

  onShowPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/index' })
  },

  onShowAboutFooter() {
    this.setData({ showAboutModal: true })
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showHistoryModal: false,
      showHelpModal: false,
      showAboutModal: false,
      showParamsModal: false
    })
  },

  // 清空历史
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有计算历史吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.calcHistory = []
          wx.setStorageSync('calcHistory', [])
          this.setData({
            calcHistory: [],
            historyCount: 0,
            craneCount: 0,
            ropeCount: 0,
            otherCount: 0
          })
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '吊装计算助手 - 专业吊装工具合集',
      path: '/pages/home/index'
    }
  }
})
