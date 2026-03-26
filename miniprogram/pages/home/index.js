const app = getApp()

Page({
  data: {
    features: [
      {
        id: 'crane',
        icon: '🏗️',
        title: '吊车选型计算',
        desc: '快速匹配最佳吊车型号',
        color: '#E8402F',
        bgColor: '#FFF2F0'
      },
      {
        id: 'rope',
        icon: '⛓️',
        title: '钢丝绳选型',
        desc: '根据载荷计算最优绳径',
        color: '#1890FF',
        bgColor: '#E6F7FF'
      },
      {
        id: 'angle',
        icon: '📐',
        title: '吊装角度计算',
        desc: '索具夹角与分力计算',
        color: '#722ED1',
        bgColor: '#F9F0FF'
      },
      {
        id: 'damage',
        icon: '🔍',
        title: '钢丝绳报废核算',
        desc: 'GB/T 5972报废标准判定',
        color: '#FA8C16',
        bgColor: '#FFF7E6'
      },
      {
        id: 'capacity',
        icon: '🧮',
        title: '钢丝绳承载力',
        desc: '查算单绳安全承载吨位',
        color: '#13C2C2',
        bgColor: '#E6FFFB'
      },
      {
        id: 'handbook',
        icon: '📖',
        title: '钢丝绳知识手册',
        desc: '规格参数/维护/标准速查',
        color: '#52C41A',
        bgColor: '#F6FFED'
      }
    ],
    tips: [
      '安全第一，计算结果仅供参考',
      '索具夹角不宜超过120°',
      '钢丝绳安全系数一般不低于6',
      '吊装前务必检查钢丝绳状态',
      '幅度越大，起重量越小',
      '定期检查钢丝绳断丝数量'
    ],
    currentTip: 0
  },

  onLoad() {
    this._startTipRotation()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  onUnload() {
    clearInterval(this._tipTimer)
  },

  _startTipRotation() {
    this._tipTimer = setInterval(() => {
      this.setData({
        currentTip: (this.data.currentTip + 1) % this.data.tips.length
      })
    }, 4000)
  },

  onFeatureTap(e) {
    const id = e.currentTarget.dataset.id
    const urlMap = {
      crane: '/pages/crane/index',
      rope: '/pages/rope/index',
      angle: '/pages/angle/index',
      damage: '/pages/damage/index',
      capacity: '/pages/capacity/index',
      handbook: '/pages/handbook/index'
    }
    if (urlMap[id]) {
      wx.navigateTo({ url: urlMap[id] })
    }
  },

  onShareAppMessage() {
    return {
      title: '吊装计算助手 — 吊车选型/钢丝绳计算',
      path: '/pages/home/index'
    }
  }
})
