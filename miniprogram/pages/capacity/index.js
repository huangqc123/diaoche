/**
 * 钢丝绳承载力计算
 * 输入：规格型号、直径、抗拉强度
 * 输出：破断拉力、4/6/8倍安全系数下的单根可承受吨位
 * 以及一段完整的文字说明
 */
const { ropeStructures, tensileStrengths, roCoefficients, standardDiameters } = require('../../utils/ropeData')

Page({
  data: {
    structureLabels: ropeStructures.map(s => s.label),
    structureIndex: -1,
    structureKey: '',
    structureDisplay: '请选择规格型号',

    diameter: '',

    strengthLabels: tensileStrengths.map(s => s.label),
    strengthIndex: -1,
    strengthValue: null,
    strengthDisplay: '请选择抗拉强度',

    result: {
      capacities: [4, 6, 8].map(k => ({
        k,
        label: `${k}倍安全系数`,
        load_kN: 0,
        load_t: 0,
        load_kN_text: '0.00',
        load_t_text: '0.00000000'
      })),
      desc: '当选择结构为(未选择规格型号)，直径为(未填写直径)，强度为(未选择抗拉强度)的钢丝绳时，若考虑4倍安全系数，则单根可受力0.00000000吨，若考虑6倍安全系数，则单根可受力0.00000000吨，若考虑8倍安全系数，则单根可受力0.00000000吨。',
      unsupportedText: ''
    },
    showFullTable: false,
    fullTable: []
  },

  onLoad() {
    this.refreshResult()
  },

  getCurrentSelection() {
    const structure = this.data.structureIndex >= 0 ? ropeStructures[this.data.structureIndex] : null
    const strength = this.data.strengthIndex >= 0 ? tensileStrengths[this.data.strengthIndex] : null
    const rawDiameter = String(this.data.diameter || '').trim()
    const parsedDiameter = parseFloat(rawDiameter)
    const hasValidDiameter = rawDiameter !== '' && !Number.isNaN(parsedDiameter) && parsedDiameter > 0
    const diameter = hasValidDiameter ? parsedDiameter : 0

    return {
      structure,
      strength,
      rawDiameter,
      diameter,
      hasValidDiameter,
      structureLabel: structure ? structure.label : '未选择规格型号',
      strengthLabel: strength ? `${strength.value}MPa` : '未选择抗拉强度',
      diameterLabel: hasValidDiameter ? `${diameter}mm` : '未填写直径'
    }
  },

  buildResult() {
    const selection = this.getCurrentSelection()
    const g = 9.81
    const factors = [4, 6, 8]
    const Ro = selection.structure && selection.strength
      ? roCoefficients[selection.structure.key] && roCoefficients[selection.structure.key][selection.strength.value]
      : 0
    const hasValidRo = !!Ro
    const Fb = selection.hasValidDiameter && hasValidRo ? Ro * selection.diameter * selection.diameter : 0
    const FbTon = Fb / g
    const capacities = factors.map(k => {
      const load_kN = Fb / k
      const load_t = load_kN / g
      return {
        k,
        label: `${k}倍安全系数`,
        load_kN,
        load_t,
        load_kN_text: load_kN.toFixed(2),
        load_t_text: load_t.toFixed(8)
      }
    })

    const unsupportedText = selection.structure && selection.strength && !hasValidRo
      ? '当前结构与强度组合暂无标准系数，请重新选择。'
      : ''

    const desc = `当选择结构为(${selection.structureLabel})，直径为(${selection.diameterLabel})，强度为(${selection.strengthLabel})的钢丝绳时，` +
      `若考虑4倍安全系数，则单根可受力${capacities[0].load_t_text}吨，若考虑6倍安全系数，则单根可受力${capacities[1].load_t_text}吨，若考虑8倍安全系数，则单根可受力${capacities[2].load_t_text}吨。` +
      (unsupportedText ? ` ${unsupportedText}` : '')

    return {
      d: selection.hasValidDiameter ? selection.diameter : '',
      Ro: hasValidRo ? Ro : 0,
      Fb,
      Fb_t: FbTon,
      Fb_text: Fb.toFixed(2),
      Fb_t_text: FbTon.toFixed(2),
      structLabel: selection.structureLabel,
      strengthLabel: selection.strengthLabel,
      diameterLabel: selection.diameterLabel,
      capacities,
      desc,
      isValid: selection.hasValidDiameter && hasValidRo,
      unsupportedText
    }
  },

  refreshResult(callback) {
    this.setData({ result: this.buildResult() }, callback)
  },

  onStructureChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      structureIndex: idx,
      structureKey: ropeStructures[idx].key,
      structureDisplay: ropeStructures[idx].label
    }, () => this.refreshResult())
  },

  onInputDiameter(e) {
    this.setData({ diameter: e.detail.value }, () => this.refreshResult())
  },

  onStrengthChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      strengthIndex: idx,
      strengthValue: tensileStrengths[idx].value,
      strengthDisplay: tensileStrengths[idx].label
    }, () => this.refreshResult())
  },

  onCalculate() {
    const selection = this.getCurrentSelection()
    this.refreshResult(() => {
      if (!selection.structure) {
        wx.showToast({ title: '请选择规格型号', icon: 'none' })
        return
      }
      if (!selection.hasValidDiameter) {
        wx.showToast({ title: '请输入有效直径', icon: 'none' })
        return
      }
      if (!selection.strength) {
        wx.showToast({ title: '请选择抗拉强度', icon: 'none' })
        return
      }
      if (this.data.result && this.data.result.unsupportedText) {
        wx.showToast({ title: '当前组合暂无标准系数', icon: 'none' })
      }
    })
  },

  onShowFullTable() {
    const Ro = roCoefficients[this.data.structureKey] && roCoefficients[this.data.structureKey][this.data.strengthValue]
    if (!Ro) {
      wx.showToast({ title: '请先选择规格和强度', icon: 'none' }); return
    }
    const g = 9.81
    const table = standardDiameters.filter(d => d >= 8 && d <= 60).map(d => {
      const Fb = Ro * d * d
      return {
        d,
        Fb: Math.round(Fb * 100) / 100,
        t6: Math.round(Fb / 6 / g * 100) / 100
      }
    })
    this.setData({ fullTable: table, showFullTable: true })
  },

  onCloseTable() {
    this.setData({ showFullTable: false })
  },

  onReset() {
    this.setData({
      diameter: '',
      structureIndex: -1,
      structureKey: '',
      structureDisplay: '请选择规格型号',
      strengthIndex: -1,
      strengthValue: null,
      strengthDisplay: '请选择抗拉强度',
      showFullTable: false,
      fullTable: []
    }, () => this.refreshResult())
  }
})
