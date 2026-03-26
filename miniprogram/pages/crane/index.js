const { calculateCrane } = require('../../utils/calculator')
const { angleOptions } = require('../../utils/ropeData')

const app = getApp()

Page({
  data: {
    // 输入参数
    R: '',     // 幅度(m)
    h1: '',    // 吊物高度(m)
    h2: '',    // 吊索具长度(m)
    A: 0,      // 索具夹角(°)
    h3: '',    // 就位高度(m)
    W: '',     // 吊物重量(t)

    // Picker
    angleOptions: angleOptions,
    angleIndex: 0,

    // 结果
    showResult: false,
    result: null,

    // 动态系数
    dynamicFactor: 1.1,
    safetyHeight: 1.5
  },

  onLoad() {},

  onShow() {},

  // 输入处理
  onInputR(e) { this.setData({ R: e.detail.value, showResult: false }) },
  onInputH1(e) { this.setData({ h1: e.detail.value, showResult: false }) },
  onInputH2(e) { this.setData({ h2: e.detail.value, showResult: false }) },
  onInputH3(e) { this.setData({ h3: e.detail.value, showResult: false }) },
  onInputW(e) { this.setData({ W: e.detail.value, showResult: false }) },

  onAngleChange(e) {
    const index = e.detail.value
    this.setData({
      angleIndex: index,
      A: angleOptions[index],
      showResult: false
    })
  },

  // 表单验证
  validateForm() {
    const { R, h1, h2, h3, W } = this.data
    if (!R || !h1 || !h2 || !h3 || !W) {
      wx.showToast({ title: '请填写所有参数', icon: 'none' })
      return false
    }
    const fields = { '幅度R': R, '吊物高度h1': h1, '索具长度h2': h2, '就位高度h3': h3, '吊物重量W': W }
    for (let name in fields) {
      const val = parseFloat(fields[name])
      if (isNaN(val) || val < 0) {
        wx.showToast({ title: name + '请输入有效正数', icon: 'none' })
        return false
      }
    }
    return true
  },

  // 执行计算
  onCalculate() {
    if (!this.validateForm()) return

    wx.showLoading({ title: '计算中...' })

    const params = {
      R: parseFloat(this.data.R),
      h1: parseFloat(this.data.h1),
      h2: parseFloat(this.data.h2),
      A: this.data.A,
      h3: parseFloat(this.data.h3),
      W: parseFloat(this.data.W)
    }

    const result = calculateCrane(params)

    setTimeout(() => {
      wx.hideLoading()
      this.setData({ result, showResult: true })

      // 保存历史
      app.saveHistory('crane', params, {
        H_required: result.H_required,
        W_required: result.W_required,
        bestChoice: result.bestChoice ? result.bestChoice.name : '无'
      })
    }, 300)
  },

  // 重置
  onReset() {
    this.setData({
      R: '', h1: '', h2: '', h3: '', W: '',
      A: 0, angleIndex: 0,
      showResult: false, result: null
    })
  },

  // 快速填入示例
  onFillExample() {
    this.setData({
      R: '12', h1: '2', h2: '3', h3: '8', W: '5',
      A: 30, angleIndex: 6,
      showResult: false
    })
    wx.showToast({ title: '已填入示例数据', icon: 'success' })
  }
})
