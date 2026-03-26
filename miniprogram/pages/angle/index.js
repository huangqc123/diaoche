const app = getApp()

Page({
  data: {
    // 模式: 'dimToAngle' = 尺寸算角度, 'angleToForce' = 角度查分力
    mode: 'dimToAngle',

    // 尺寸→角度 输入
    slingLen: '',   // 吊索长度 L (m)
    spread: '',     // 吊点间距 D (m)
    branches: '2',  // 分支数

    // 角度→分力 输入
    inputAngle: '',
    inputWeight: '',
    inputN: '2',

    showResult: false,
    result: null,

    // 角度参照表
    angleRefTable: [
      { angle: 0,   factor: 1.000, note: '垂直吊装' },
      { angle: 15,  factor: 1.009, note: '' },
      { angle: 30,  factor: 1.035, note: '推荐范围' },
      { angle: 45,  factor: 1.082, note: '推荐范围' },
      { angle: 60,  factor: 1.155, note: '常用上限' },
      { angle: 75,  factor: 1.260, note: '' },
      { angle: 90,  factor: 1.414, note: '注意安全' },
      { angle: 100, factor: 1.556, note: '' },
      { angle: 110, factor: 1.743, note: '' },
      { angle: 120, factor: 2.000, note: '⚠ 极限' }
    ]
  },

  onLoad() {},

  // 切换模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ mode, showResult: false, result: null })
  },

  // 模式1输入
  onInputSlingLen(e) { this.setData({ slingLen: e.detail.value, showResult: false }) },
  onInputSpread(e) { this.setData({ spread: e.detail.value, showResult: false }) },
  onInputBranches(e) { this.setData({ branches: e.detail.value, showResult: false }) },

  // 模式2输入
  onInputAngle(e) { this.setData({ inputAngle: e.detail.value, showResult: false }) },
  onInputWeight(e) { this.setData({ inputWeight: e.detail.value, showResult: false }) },
  onInputN(e) { this.setData({ inputN: e.detail.value, showResult: false }) },

  // 模式1计算：尺寸→角度
  calcDimToAngle() {
    const L = parseFloat(this.data.slingLen)
    const D = parseFloat(this.data.spread)
    const n = parseInt(this.data.branches) || 2

    if (!L || L <= 0 || !D || D <= 0) {
      wx.showToast({ title: '请输入有效的正数', icon: 'none' }); return
    }

    const halfD = D / 2
    if (halfD >= L) {
      wx.showToast({ title: '吊点间距不能 ≥ 2倍索长', icon: 'none' }); return
    }

    // sin(A/2) = (D/2) / L → A = 2 × arcsin(D/(2L))
    const sinHalf = halfD / L
    const halfAngleRad = Math.asin(sinHalf)
    const A = 2 * halfAngleRad * 180 / Math.PI
    const cosHalf = Math.cos(halfAngleRad)
    const factor = 1 / cosHalf

    // 垂直高度
    const H = L * cosHalf

    // 安全等级
    let safety, safetyColor
    if (A <= 60) { safety = '安全'; safetyColor = '#52C41A' }
    else if (A <= 90) { safety = '需注意'; safetyColor = '#FAAD14' }
    else if (A <= 120) { safety = '危险'; safetyColor = '#FF4D4F' }
    else { safety = '禁止使用'; safetyColor = '#FF4D4F' }

    this.setData({
      showResult: true,
      result: {
        type: 'dimToAngle',
        A: Math.round(A * 100) / 100,
        factor: Math.round(factor * 1000) / 1000,
        cosHalf: Math.round(cosHalf * 1000) / 1000,
        H: Math.round(H * 100) / 100,
        L, D, n,
        safety,
        safetyColor
      }
    })

    app.saveHistory('angle', { L, D, n }, { A: Math.round(A * 100) / 100, factor: Math.round(factor * 1000) / 1000 })
  },

  // 模式2计算：角度→分力
  calcAngleToForce() {
    const A = parseFloat(this.data.inputAngle)
    const W = parseFloat(this.data.inputWeight)
    const n = parseInt(this.data.inputN) || 2

    if (isNaN(A) || A < 0 || A > 180) {
      wx.showToast({ title: '角度范围: 0~180°', icon: 'none' }); return
    }
    if (!W || W <= 0) {
      wx.showToast({ title: '请输入有效重量', icon: 'none' }); return
    }

    const g = 9.81
    const F = W * g  // kN
    const halfAngleRad = (A / 2) * Math.PI / 180
    const cosHalf = Math.cos(halfAngleRad)
    const factor = 1 / cosHalf
    const S = F / (n * cosHalf) // 每根绳拉力 kN
    const S_t = S / g           // 每根绳拉力 (等效吨)

    let safety, safetyColor
    if (A <= 60) { safety = '安全'; safetyColor = '#52C41A' }
    else if (A <= 90) { safety = '需注意'; safetyColor = '#FAAD14' }
    else if (A <= 120) { safety = '危险'; safetyColor = '#FF4D4F' }
    else { safety = '禁止使用'; safetyColor = '#FF4D4F' }

    this.setData({
      showResult: true,
      result: {
        type: 'angleToForce',
        A, W, n,
        F: Math.round(F * 100) / 100,
        factor: Math.round(factor * 1000) / 1000,
        S: Math.round(S * 100) / 100,
        S_t: Math.round(S_t * 100) / 100,
        safety,
        safetyColor
      }
    })
  },

  onReset() {
    this.setData({
      slingLen: '', spread: '', branches: '2',
      inputAngle: '', inputWeight: '', inputN: '2',
      showResult: false, result: null
    })
  }
})
