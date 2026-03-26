/**
 * 钢丝绳报废核算
 * 依据 GB/T 5972-2016《起重机 钢丝绳 保养、维护、检验和报废》
 * 以及 GB 6067.1-2010《起重机械安全规程》
 */

Page({
  data: {
    // ===== 检查项 =====
    // 1. 断丝检查
    ropeDiameter: '',       // 钢丝绳公称直径 mm
    ropeStructure: 0,       // 结构选择 index
    structureOptions: ['6×19(含6×19S)', '6×37(含6×37S)', '6×61', '8×19', '18×7', '其他'],
    brokenWires6d: '',      // 6d长度内可见断丝数
    brokenWires30d: '',     // 30d长度内可见断丝数
    valleyBroken: '',       // 谷部断丝数

    // 2. 磨损检查
    originalDiameter: '',   // 原始直径 mm
    currentDiameter: '',    // 当前直径 mm

    // 3. 腐蚀等级
    corrosionLevel: 0,
    corrosionOptions: ['无腐蚀', '轻微表面锈蚀', '中度锈蚀(有锈坑)', '严重锈蚀(松动)'],

    // 4. 变形检查
    deformChecks: [
      { id: 'birdcage', label: '灯笼状变形（鸟笼）', checked: false },
      { id: 'kink', label: '扭结/打结', checked: false },
      { id: 'crush', label: '压扁/挤压变形', checked: false },
      { id: 'wave', label: '波浪形变形', checked: false },
      { id: 'coreProtrude', label: '绳芯挤出', checked: false },
      { id: 'looseStrand', label: '股松散/外层钢丝松弛', checked: false }
    ],

    // 5. 热损伤
    heatDamage: false,

    showResult: false,
    result: null
  },

  onLoad() {},

  // 输入处理
  onInputDiameter(e) { this.setData({ ropeDiameter: e.detail.value, showResult: false }) },
  onStructureChange(e) { this.setData({ ropeStructure: e.detail.value, showResult: false }) },
  onInputBroken6d(e) { this.setData({ brokenWires6d: e.detail.value, showResult: false }) },
  onInputBroken30d(e) { this.setData({ brokenWires30d: e.detail.value, showResult: false }) },
  onInputValleyBroken(e) { this.setData({ valleyBroken: e.detail.value, showResult: false }) },
  onInputOrigDia(e) { this.setData({ originalDiameter: e.detail.value, showResult: false }) },
  onInputCurrDia(e) { this.setData({ currentDiameter: e.detail.value, showResult: false }) },
  onCorrosionChange(e) { this.setData({ corrosionLevel: e.detail.value, showResult: false }) },

  onDeformCheck(e) {
    const idx = e.currentTarget.dataset.index
    const key = `deformChecks[${idx}].checked`
    this.setData({ [key]: !this.data.deformChecks[idx].checked, showResult: false })
  },

  onHeatToggle() {
    this.setData({ heatDamage: !this.data.heatDamage, showResult: false })
  },

  // ===== 核心判定逻辑 =====
  onEvaluate() {
    const issues = []
    const warnings = []
    let scrapRequired = false

    // --- 1. 断丝判定 ---
    // GB/T 5972 表3 6×19结构 安全系数6时 6d内允许断丝数:5, 30d内:10
    // 这里使用简化的通用规则
    const structIdx = parseInt(this.data.ropeStructure)
    const structName = this.data.structureOptions[structIdx]

    // 每种结构对应的最大允许断丝数 (交互捻, 安全系数≥6)
    const allowTable = {
      0: { d6: 5,  d30: 10 },  // 6×19
      1: { d6: 10, d30: 19 },  // 6×37
      2: { d6: 16, d30: 30 },  // 6×61
      3: { d6: 5,  d30: 10 },  // 8×19
      4: { d6: 5,  d30: 10 },  // 18×7
      5: { d6: 5,  d30: 10 }   // 其他(保守)
    }

    const allow = allowTable[structIdx]
    const b6d = parseInt(this.data.brokenWires6d) || 0
    const b30d = parseInt(this.data.brokenWires30d) || 0
    const valley = parseInt(this.data.valleyBroken) || 0

    if (b6d > 0 || b30d > 0) {
      if (b6d >= allow.d6) {
        scrapRequired = true
        issues.push({
          title: '断丝超限(6d)',
          detail: `6d长度内断丝 ${b6d} 根，${structName} 允许上限 ${allow.d6} 根`,
          level: 'danger'
        })
      } else if (b6d >= allow.d6 * 0.7) {
        warnings.push({
          title: '断丝接近上限(6d)',
          detail: `6d内断丝 ${b6d} 根，已达允许值的 ${Math.round(b6d/allow.d6*100)}%`,
          level: 'warning'
        })
      }

      if (b30d >= allow.d30) {
        scrapRequired = true
        issues.push({
          title: '断丝超限(30d)',
          detail: `30d长度内断丝 ${b30d} 根，${structName} 允许上限 ${allow.d30} 根`,
          level: 'danger'
        })
      } else if (b30d >= allow.d30 * 0.7) {
        warnings.push({
          title: '断丝接近上限(30d)',
          detail: `30d内断丝 ${b30d} 根，已达允许值的 ${Math.round(b30d/allow.d30*100)}%`,
          level: 'warning'
        })
      }
    }

    // 谷部断丝（谷部1根断丝≈外部5根）
    if (valley >= 1) {
      scrapRequired = true
      issues.push({
        title: '谷部断丝',
        detail: `发现谷部断丝 ${valley} 根，谷部断丝危害性极大，应立即报废`,
        level: 'danger'
      })
    }

    // --- 2. 磨损直径减小 ---
    const origD = parseFloat(this.data.originalDiameter) || 0
    const currD = parseFloat(this.data.currentDiameter) || 0
    if (origD > 0 && currD > 0) {
      const wearPercent = (origD - currD) / origD * 100
      if (wearPercent >= 10) {
        scrapRequired = true
        issues.push({
          title: '直径磨损超限',
          detail: `直径减小 ${wearPercent.toFixed(1)}%（原${origD}mm → 现${currD}mm），超过10%报废标准`,
          level: 'danger'
        })
      } else if (wearPercent >= 7) {
        warnings.push({
          title: '直径磨损较大',
          detail: `直径减小 ${wearPercent.toFixed(1)}%，接近10%报废线`,
          level: 'warning'
        })
      }
    }

    // --- 3. 腐蚀判定 ---
    const corr = parseInt(this.data.corrosionLevel)
    if (corr >= 3) {
      scrapRequired = true
      issues.push({
        title: '严重腐蚀',
        detail: '钢丝绳发生严重锈蚀松动，内部钢丝可能已断裂，应报废',
        level: 'danger'
      })
    } else if (corr >= 2) {
      warnings.push({
        title: '中度腐蚀',
        detail: '出现锈坑，需加强检查频次并考虑降级使用',
        level: 'warning'
      })
    }

    // --- 4. 变形判定 ---
    const deformIssues = this.data.deformChecks.filter(c => c.checked)
    if (deformIssues.length > 0) {
      const names = deformIssues.map(c => c.label).join('、')
      // 扭结、灯笼变形、绳芯挤出 必须报废
      const criticalIds = ['kink', 'birdcage', 'coreProtrude']
      const hasCritical = deformIssues.some(c => criticalIds.includes(c.id))
      if (hasCritical) {
        scrapRequired = true
        issues.push({
          title: '严重变形',
          detail: `发现：${names}，属于不可逆变形，应报废`,
          level: 'danger'
        })
      } else {
        warnings.push({
          title: '存在变形',
          detail: `发现：${names}，需进一步评估`,
          level: 'warning'
        })
      }
    }

    // --- 5. 热损伤 ---
    if (this.data.heatDamage) {
      scrapRequired = true
      issues.push({
        title: '热损伤/电弧灼伤',
        detail: '钢丝绳经受过高温或电弧作用，强度已不可靠，应报废',
        level: 'danger'
      })
    }

    // 没有输入任何检查数据
    if (issues.length === 0 && warnings.length === 0 &&
        b6d === 0 && b30d === 0 && valley === 0 &&
        origD === 0 && currD === 0 && corr === 0 &&
        deformIssues.length === 0 && !this.data.heatDamage) {
      wx.showToast({ title: '请至少填写一项检查数据', icon: 'none' })
      return
    }

    this.setData({
      showResult: true,
      result: {
        scrapRequired,
        issues,
        warnings,
        totalIssues: issues.length,
        totalWarnings: warnings.length,
        verdict: scrapRequired ? '建议报废' : (warnings.length > 0 ? '需关注/降级使用' : '状态良好')
      }
    })
  },

  onReset() {
    const resetDeforms = this.data.deformChecks.map(c => ({ ...c, checked: false }))
    this.setData({
      ropeDiameter: '', ropeStructure: 0,
      brokenWires6d: '', brokenWires30d: '', valleyBroken: '',
      originalDiameter: '', currentDiameter: '',
      corrosionLevel: 0, deformChecks: resetDeforms,
      heatDamage: false, showResult: false, result: null
    })
  }
})
