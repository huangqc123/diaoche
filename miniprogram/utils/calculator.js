/**
 * 吊装计算核心算法
 */
const { craneDatabase } = require('./craneData')
const { roCoefficients, standardDiameters } = require('./ropeData')

/**
 * 在性能表中根据幅度进行线性插值
 * @param {Array} table - 性能表
 * @param {number} radius - 目标幅度(m)
 * @returns {Object|null} { q: 起重量(t), h: 最大高度(m) }
 */
function interpolate(table, radius) {
  if (!table || table.length === 0) return null

  // 超出最小幅度范围
  if (radius <= table[0].r) {
    return { q: table[0].q, h: table[0].h }
  }

  // 超出最大幅度范围
  if (radius >= table[table.length - 1].r) {
    return { q: table[table.length - 1].q, h: table[table.length - 1].h }
  }

  // 线性插值
  for (let i = 0; i < table.length - 1; i++) {
    if (radius >= table[i].r && radius <= table[i + 1].r) {
      const t = (radius - table[i].r) / (table[i + 1].r - table[i].r)
      return {
        q: Math.round((table[i].q + t * (table[i + 1].q - table[i].q)) * 100) / 100,
        h: Math.round((table[i].h + t * (table[i + 1].h - table[i].h)) * 100) / 100
      }
    }
  }
  return null
}

/**
 * 吊车选型计算
 * @param {Object} params
 * @param {number} params.R   - 幅度(m)
 * @param {number} params.h1  - 吊物自身高度(m)
 * @param {number} params.h2  - 吊索具长度(m)
 * @param {number} params.A   - 索具夹角(°)
 * @param {number} params.h3  - 就位高度(m)
 * @param {number} params.W   - 吊物重量(t)
 * @returns {Object} 计算结果
 */
function calculateCrane(params) {
  const { R, h1, h2, A, h3, W } = params
  const g = 9.81

  // 1. 计算索具垂直分量
  const halfAngleRad = (A / 2) * Math.PI / 180
  const h2v = A > 0 ? h2 * Math.cos(halfAngleRad) : h2

  // 2. 安全距离：吊物底面距障碍物 ≥ 1m + 滑轮组高度约0.5m
  const safetyMargin = 1.5

  // 3. 所需最小起升高度
  const H_required = h3 + h1 + h2v + safetyMargin

  // 4. 所需起重量（含10%动载系数）
  const W_required = W * 1.1

  // 5. 在数据库中查找满足条件的吊车
  const results = []
  craneDatabase.forEach(crane => {
    const minR = crane.table[0].r
    const maxR = crane.table[crane.table.length - 1].r

    // 检查幅度是否在吊车范围内
    if (R < minR || R > maxR) {
      // 超出幅度范围的吊车仍然列出但标记为不在范围内
      results.push({
        name: crane.name,
        capacity: crane.capacity,
        boomLen: crane.boomLen,
        qAtR: 0,
        hAtR: 0,
        qSatisfied: false,
        hSatisfied: false,
        status: 'outOfRange',
        statusText: '幅度超出范围',
        radiusRange: minR + '~' + maxR + 'm'
      })
      return
    }

    // 插值获取该幅度下的性能
    const perf = interpolate(crane.table, R)
    if (!perf) return

    const qSatisfied = perf.q >= W_required
    const hSatisfied = perf.h >= H_required

    let status, statusText
    if (qSatisfied && hSatisfied) {
      status = 'ok'
      statusText = '满足要求'
    } else if (qSatisfied && !hSatisfied) {
      status = 'heightInsufficient'
      statusText = '高度不足'
    } else if (!qSatisfied && hSatisfied) {
      status = 'capacityInsufficient'
      statusText = '吨位不足'
    } else {
      status = 'bothInsufficient'
      statusText = '均不满足'
    }

    results.push({
      name: crane.name,
      capacity: crane.capacity,
      boomLen: crane.boomLen,
      qAtR: perf.q,
      hAtR: perf.h,
      qSatisfied,
      hSatisfied,
      status,
      statusText,
      qMargin: qSatisfied ? Math.round((perf.q / W_required - 1) * 100) : -Math.round((1 - perf.q / W_required) * 100),
      hMargin: hSatisfied ? Math.round((perf.h / H_required - 1) * 100) : -Math.round((1 - perf.h / H_required) * 100)
    })
  })

  // 排序：满足条件的在前，按额定吨位升序
  results.sort((a, b) => {
    const orderMap = { ok: 0, heightInsufficient: 1, capacityInsufficient: 2, bothInsufficient: 3, outOfRange: 4 }
    if (orderMap[a.status] !== orderMap[b.status]) return orderMap[a.status] - orderMap[b.status]
    return a.capacity - b.capacity
  })

  return {
    H_required: Math.round(H_required * 100) / 100,
    W_required: Math.round(W_required * 100) / 100,
    h2v: Math.round(h2v * 100) / 100,
    R,
    cranes: results,
    satisfiedCount: results.filter(c => c.status === 'ok').length,
    bestChoice: results.find(c => c.status === 'ok') || null
  }
}

/**
 * 钢丝绳选型计算
 * @param {Object} params
 * @param {number} params.W          - 吊物重量(t)
 * @param {number} params.n          - 钢丝绳分支数
 * @param {number} params.A          - 索具夹角(°)
 * @param {number} params.k          - 安全系数
 * @param {string} params.structure  - 钢丝绳结构 key
 * @param {number} params.strength   - 公称抗拉强度(MPa)
 * @returns {Object} 计算结果
 */
function calculateRope(params) {
  const { W, n, A, k, structure, strength } = params
  const g = 9.81

  // 1. 吊物重力 (kN)
  const F = W * g

  // 2. 计算单根钢丝绳的拉力 (kN)
  const halfAngleRad = (A / 2) * Math.PI / 180
  const cosHalf = A > 0 ? Math.cos(halfAngleRad) : 1
  const S = F / (n * cosHalf)

  // 3. 所需最小破断拉力 (kN)
  const Fb_required = S * k

  // 4. 获取Ro系数
  const Ro = roCoefficients[structure] && roCoefficients[structure][strength]
  if (!Ro) return { error: '未找到对应的钢丝绳系数' }

  // 5. 计算最小直径 (mm)
  const d_min = Math.sqrt(Fb_required / Ro)

  // 6. 选取最近标准直径（向上取整）
  let d_selected = standardDiameters[standardDiameters.length - 1]
  for (let i = 0; i < standardDiameters.length; i++) {
    if (standardDiameters[i] >= d_min) {
      d_selected = standardDiameters[i]
      break
    }
  }

  // 7. 计算选定直径的实际破断拉力
  const Fb_actual = Ro * d_selected * d_selected

  // 8. 安全裕度
  const safetyMargin = Math.round((Fb_actual / Fb_required - 1) * 100)

  // 9. 同时推荐上一级直径（如果有）
  const d_idx = standardDiameters.indexOf(d_selected)
  let d_next = null, Fb_next = null
  if (d_idx < standardDiameters.length - 1) {
    d_next = standardDiameters[d_idx + 1]
    Fb_next = Math.round(Ro * d_next * d_next * 100) / 100
  }

  return {
    F: Math.round(F * 100) / 100,
    S: Math.round(S * 100) / 100,
    Fb_required: Math.round(Fb_required * 100) / 100,
    Ro,
    d_min: Math.round(d_min * 100) / 100,
    d_selected,
    Fb_actual: Math.round(Fb_actual * 100) / 100,
    safetyMargin,
    d_next,
    Fb_next,
    angleCoefficient: Math.round(1 / cosHalf * 1000) / 1000,
    cosHalf: Math.round(cosHalf * 1000) / 1000
  }
}

module.exports = { calculateCrane, calculateRope, interpolate }
