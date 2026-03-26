/**
 * 京东联盟(京粉) 广告管理工具
 * 
 * 功能：管理广告数据、展示频控、跳转京东小程序（带推广参数）
 * 
 * ============ 使用说明 ============
 * 1. 在京东联盟 https://union.jd.com 注册，创建应用和推广位
 * 2. 填写下方 CONFIG 中的 appKey、pid 等
 * 3. 在 AD_POOL 中配置你要推广的商品/活动
 * 4. 用户点击广告 → 跳转京东购物小程序（带你的推广PID）
 *    → 用户下单 → 你拿佣金返利
 */

// ============ 请在此处填写你的京东联盟配置 ============
const CONFIG = {
  pid: '',             // TODO: 填写你的推广位 PID（如：1000xxxxxx_xxxxxxxx_xxxxxxxxxx）
  unionId: '',         // TODO: 填写你的联盟 ID
  appKey: '',          // TODO: 填写你的 appKey（云函数动态拉取商品时使用）
  subUnionId: '',      // TODO: 选填，子渠道ID（用于区分流量来源）
}

// 京东购物小程序 AppID（固定值，不要改）
const JD_MINI_APP_ID = 'wx91d27dbf599dff74'

// ============ 广告素材池 ============
// 你可以在京东联盟后台挑选高佣金商品/活动，把链接和素材填在这里
// imageUrl: 商品主图链接（从京东复制）
// jdUrl: 京东商品链接或活动链接（会通过你的PID跳转，佣金归你）
// miniPath: 京东购物小程序内路径（可选，有的话更精准）
const AD_POOL = [
  {
    id: 'ad_001',
    title: '限时秒杀 爆款好物',
    desc: '京东精选 · 低价抢购',
    icon: '🔥',
    imageUrl: '',        // TODO: 填写商品图片URL
    price: '9.9',
    originalPrice: '49.9',
    tag: '限时秒杀',
    jdUrl: 'https://pro.m.jd.com/mall/active/秒杀活动ID/index.html',  // TODO: 填写真实活动链接
    miniPath: '',        // TODO: 选填，京东小程序内路径
    weight: 10,          // 展示权重（越大越常出现）
  },
  {
    id: 'ad_002',
    title: '工具好物推荐',
    desc: '施工必备 · 五金工具特惠',
    icon: '🔧',
    imageUrl: '',        // TODO: 填写商品图片URL
    price: '29.9',
    originalPrice: '89.0',
    tag: '工具特惠',
    jdUrl: 'https://item.jd.com/商品ID.html',  // TODO: 填写真实商品链接
    miniPath: '',
    weight: 8,
  },
  {
    id: 'ad_003',
    title: '劳保防护装备',
    desc: '安全帽 · 手套 · 防护服',
    icon: '⛑️',
    imageUrl: '',        // TODO: 填写商品图片URL
    price: '15.8',
    originalPrice: '39.9',
    tag: '安全必备',
    jdUrl: 'https://item.jd.com/商品ID.html',  // TODO: 填写真实商品链接
    miniPath: '',
    weight: 8,
  },
  {
    id: 'ad_004',
    title: '京东超值购',
    desc: '每日精选 · 大牌低价',
    icon: '🛒',
    imageUrl: '',        // TODO: 填写商品图片URL
    price: '',
    originalPrice: '',
    tag: '超值购',
    jdUrl: 'https://pro.m.jd.com/mall/active/活动ID/index.html',  // TODO: 填写真实活动链接
    miniPath: '',
    weight: 6,
  },
]

// ============ 频控策略 ============
const FREQ_CONFIG = {
  // 开屏广告：每天最多展示几次
  splashMaxPerDay: 3,
  // 插屏广告（计算后）：连续计算几次后弹一次
  interstitialEveryN: 2,
  // 两次插屏广告之间的最小间隔（毫秒）
  interstitialMinInterval: 60 * 1000,  // 1分钟
  // 同一用户每天最多看到几次插屏
  interstitialMaxPerDay: 10,
}

// ============ 内部状态（运行时，不持久化太多）============
const _state = {
  calcCount: 0,             // 本次打开app的计算次数
  lastInterstitialTime: 0,  // 上次插屏时间戳
}

/**
 * 按权重随机选一条广告
 */
function getNextAd() {
  if (AD_POOL.length === 0) return null

  const totalWeight = AD_POOL.reduce((sum, ad) => sum + (ad.weight || 1), 0)
  let rand = Math.random() * totalWeight
  for (const ad of AD_POOL) {
    rand -= (ad.weight || 1)
    if (rand <= 0) return { ...ad }
  }
  return { ...AD_POOL[0] }
}

/**
 * 判断是否应该展示开屏广告
 */
function shouldShowSplash() {
  const today = new Date().toDateString()
  const key = 'jd_splash_' + today
  const count = wx.getStorageSync(key) || 0
  return count < FREQ_CONFIG.splashMaxPerDay
}

/**
 * 判断是否应该展示插屏广告（在计算完成后调用）
 */
function shouldShowInterstitial() {
  _state.calcCount++

  // 每N次计算弹一次
  if (_state.calcCount % FREQ_CONFIG.interstitialEveryN !== 0) {
    return false
  }

  // 检查时间间隔
  const now = Date.now()
  if (now - _state.lastInterstitialTime < FREQ_CONFIG.interstitialMinInterval) {
    return false
  }

  // 检查每日上限
  const today = new Date().toDateString()
  const key = 'jd_interstitial_' + today
  const count = wx.getStorageSync(key) || 0
  if (count >= FREQ_CONFIG.interstitialMaxPerDay) {
    return false
  }

  return true
}

/**
 * 记录广告展示
 */
function recordImpression(adId) {
  const today = new Date().toDateString()

  // 根据最近调用的场景记录
  // 开屏
  const splashKey = 'jd_splash_' + today
  const interstitialKey = 'jd_interstitial_' + today

  // 通用：记录展示次数
  console.log('[JD广告] 展示:', adId)
}

/**
 * 记录开屏展示次数
 */
function recordSplashShown() {
  const today = new Date().toDateString()
  const key = 'jd_splash_' + today
  const count = wx.getStorageSync(key) || 0
  wx.setStorageSync(key, count + 1)
}

/**
 * 记录插屏展示次数
 */
function recordInterstitialShown() {
  const today = new Date().toDateString()
  const key = 'jd_interstitial_' + today
  const count = wx.getStorageSync(key) || 0
  wx.setStorageSync(key, count + 1)
  _state.lastInterstitialTime = Date.now()
}

/**
 * 记录广告点击（可用于统计转化率）
 */
function recordClick(adId) {
  const today = new Date().toDateString()
  const key = 'jd_clicks_' + today
  const clicks = wx.getStorageSync(key) || []
  clicks.push({ adId, time: Date.now() })
  wx.setStorageSync(key, clicks)
  console.log('[JD广告] 点击:', adId)
}

/**
 * 跳转到京东购物小程序（带推广参数，佣金归你）
 */
function navigateToJd(adData) {
  // 优先使用小程序路径
  let path = ''
  if (adData.miniPath) {
    // 拼接推广参数
    const sep = adData.miniPath.includes('?') ? '&' : '?'
    path = `${adData.miniPath}${sep}spread=${CONFIG.pid}`
  }

  wx.navigateToMiniProgram({
    appId: JD_MINI_APP_ID,
    path: path,
    extraData: {
      unionId: CONFIG.unionId,
      pid: CONFIG.pid,
      subUnionId: CONFIG.subUnionId,
    },
    envVersion: 'release',
    success() {
      console.log('[JD广告] 跳转京东小程序成功')
    },
    fail(err) {
      console.warn('[JD广告] 跳转失败，尝试复制链接', err)
      // 备用方案：复制商品链接
      if (adData.jdUrl) {
        // 拼接联盟推广参数
        const url = adData.jdUrl.includes('?')
          ? `${adData.jdUrl}&unionId=${CONFIG.unionId}&pid=${CONFIG.pid}`
          : `${adData.jdUrl}?unionId=${CONFIG.unionId}&pid=${CONFIG.pid}`

        wx.setClipboardData({
          data: url,
          success() {
            wx.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none', duration: 2500 })
          }
        })
      }
    }
  })
}

module.exports = {
  CONFIG,
  AD_POOL,
  FREQ_CONFIG,
  getNextAd,
  shouldShowSplash,
  shouldShowInterstitial,
  recordImpression,
  recordSplashShown,
  recordInterstitialShown,
  recordClick,
  navigateToJd,
}
