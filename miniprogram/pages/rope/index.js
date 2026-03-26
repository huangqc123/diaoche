const { calculateRope } = require('../../utils/calculator')
const { ropeStructures, tensileStrengths, safetyFactors, angleOptions, branchOptions } = require('../../utils/ropeData')

const app = getApp()

Page({
  data: {
    // 输入参数
    W: '',            // 吊物重量
    weightUnit: 't',  // 重量单位: 't'(吨) 或 'kg'(千克)

    // Picker 数据
    branchOptions: branchOptions,
    branchLabels: branchOptions.map(b => b + '根'),
    branchIndex: 1,
    n: 2,

    angleOptions: angleOptions,
    angleIndex: 0,
    A: 0,

    safetyFactors: safetyFactors,
    safetyIndex: 3,
    k: 6,

    structureLabels: ropeStructures.map(s => s.label),
    structureIndex: 0,
    structure: ropeStructures[0].key,

    strengthLabels: tensileStrengths.map(s => s.label),
    strengthIndex: 2,
    strength: tensileStrengths[2].value,

    // 结果
    showResult: false,
    result: null
  },

  onLoad() {},

  onShow() {},

  // 输入处理
  onInputW(e) {
    this.setData({ W: e.detail.value, showResult: false })
  },

  // 切换重量单位
  switchUnit(e) {
    const unit = e.currentTarget.dataset.unit
    this.setData({ weightUnit: unit, showResult: false })
  },

  // Picker 变更
  onBranchChange(e) {
    const idx = e.detail.value
    this.setData({
      branchIndex: idx,
      n: branchOptions[idx],
      showResult: false
    })
  },

  onAngleChange(e) {
    const idx = e.detail.value
    this.setData({
      angleIndex: idx,
      A: angleOptions[idx],
      showResult: false
    })
  },

  onSafetyChange(e) {
    const idx = e.detail.value
    this.setData({
      safetyIndex: idx,
      k: safetyFactors[idx],
      showResult: false
    })
  },

  onStructureChange(e) {
    const idx = e.detail.value
    this.setData({
      structureIndex: idx,
      structure: ropeStructures[idx].key,
      showResult: false
    })
  },

  onStrengthChange(e) {
    const idx = e.detail.value
    this.setData({
      strengthIndex: idx,
      strength: tensileStrengths[idx].value,
      showResult: false
    })
  },

  // 验证
  validateForm() {
    const { W } = this.data
    if (!W) {
      wx.showToast({ title: '请输入吊物重量', icon: 'none' })
      return false
    }
    const val = parseFloat(W)
    if (isNaN(val) || val <= 0) {
      wx.showToast({ title: '请输入有效正数', icon: 'none' })
      return false
    }
    return true
  },

  // 计算
  onCalculate() {
    if (!this.validateForm()) return

    wx.showLoading({ title: '计算中...' })

    let W_tonnes = parseFloat(this.data.W)
    if (this.data.weightUnit === 'kg') {
      W_tonnes = W_tonnes / 1000
    }

    const params = {
      W: W_tonnes,
      n: this.data.n,
      A: this.data.A,
      k: this.data.k,
      structure: this.data.structure,
      strength: this.data.strength
    }

    const result = calculateRope(params)

    setTimeout(() => {
      wx.hideLoading()
      if (result.error) {
        wx.showToast({ title: result.error, icon: 'none' })
        return
      }
      this.setData({ result, showResult: true })

      // 保存历史
      app.saveHistory('rope', {
        ...params,
        weightUnit: this.data.weightUnit,
        W_display: this.data.W
      }, {
        d_selected: result.d_selected,
        Fb_actual: result.Fb_actual
      })
    }, 300)
  },

  // 重置
  onReset() {
    this.setData({
      W: '',
      weightUnit: 't',
      branchIndex: 1, n: 2,
      angleIndex: 0, A: 0,
      safetyIndex: 3, k: 6,
      structureIndex: 0, structure: ropeStructures[0].key,
      strengthIndex: 2, strength: tensileStrengths[2].value,
      showResult: false, result: null
    })
  },

  // 示例数据
  onFillExample() {
    this.setData({
      W: '10',
      weightUnit: 't',
      branchIndex: 1, n: 2,
      angleIndex: 6, A: 30,
      safetyIndex: 3, k: 6,
      structureIndex: 0, structure: ropeStructures[0].key,
      strengthIndex: 2, strength: tensileStrengths[2].value,
      showResult: false
    })
    wx.showToast({ title: '已填入示例数据', icon: 'success' })
  }
})
