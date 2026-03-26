/**
 * 京东联盟(京粉) API 云函数
 * 
 * 部署前请先填写下方 JD_CONFIG 中的 appKey 和 appSecret
 * 然后在微信开发者工具中右键此云函数 -> 上传并部署（云端安装依赖）
 */

const cloud = require('wx-server-sdk')
const crypto = require('crypto-js')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ============ 请在此处填写京东联盟配置 ============
const JD_CONFIG = {
  appKey: '',       // TODO: 填写你的京东联盟 appKey
  appSecret: '',    // TODO: 填写你的京东联盟 appSecret
  apiUrl: 'https://api.jd.com/routerjson',
}

/**
 * 生成京东API签名
 */
function generateSign(params, secret) {
  // 按参数名排序
  const sortedKeys = Object.keys(params).sort()
  let signStr = secret
  sortedKeys.forEach(key => {
    signStr += key + params[key]
  })
  signStr += secret

  // MD5 加密并转大写
  return crypto.MD5(signStr).toString().toUpperCase()
}

/**
 * 获取当前时间字符串 (yyyy-MM-dd HH:mm:ss)
 */
function getTimestamp() {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/**
 * 调用京东联盟API
 */
async function callJdApi(method, paramJson) {
  const { appKey, appSecret, apiUrl } = JD_CONFIG

  if (!appKey || !appSecret) {
    throw new Error('请先配置京东联盟 appKey 和 appSecret')
  }

  const sysParams = {
    method,
    app_key: appKey,
    timestamp: getTimestamp(),
    format: 'json',
    v: '1.0',
    sign_method: 'md5',
    param_json: JSON.stringify(paramJson),
  }

  sysParams.sign = generateSign(sysParams, appSecret)

  // 构建请求URL
  const queryStr = Object.keys(sysParams)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(sysParams[k])}`)
    .join('&')

  const url = `${apiUrl}?${queryStr}`

  // 发起HTTP请求
  const rp = require('request-promise') || null

  // 使用云函数内置的 http 请求
  const https = require('https')
  const http = require('http')

  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url)
    const reqModule = fullUrl.protocol === 'https:' ? https : http

    const req = reqModule.get(url, { timeout: 10000 }, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          reject(new Error('京东API返回数据解析失败: ' + data.substring(0, 200)))
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('京东API请求超时'))
    })
  })
}

/**
 * 京粉精选商品查询
 */
async function jingfenQuery(params) {
  const paramJson = {
    goodsReq: {
      eliteId: params.eliteId || 1,
      pageIndex: params.pageIndex || 1,
      pageSize: params.pageSize || 20,
      sortName: 'inOrderCount30Days',
      sort: 'desc',
      pid: params.pid || '',
      siteId: params.siteId || '',
      positionId: params.positionId || '',
    }
  }

  const result = await callJdApi('jd.union.open.goods.jingfen.query', paramJson)

  // 解析返回数据
  const respKey = 'jd_union_open_goods_jingfen_query_response'
  if (result[respKey] && result[respKey].result) {
    const parsed = JSON.parse(result[respKey].result)
    if (parsed.code === 200 && parsed.data) {
      return parsed.data
    }
    throw new Error(parsed.message || '京粉查询失败')
  }
  throw new Error('京粉API返回格式异常')
}

/**
 * 商品搜索
 */
async function goodsSearch(params) {
  const paramJson = {
    goodsReqDTO: {
      keyword: params.keyword || '',
      pageIndex: params.pageIndex || 1,
      pageSize: params.pageSize || 20,
      sortName: 'inOrderCount30Days',
      sort: 'desc',
      pid: params.pid || '',
      siteId: params.siteId || '',
      positionId: params.positionId || '',
    }
  }

  const result = await callJdApi('jd.union.open.goods.query', paramJson)

  const respKey = 'jd_union_open_goods_query_response'
  if (result[respKey] && result[respKey].result) {
    const parsed = JSON.parse(result[respKey].result)
    if (parsed.code === 200 && parsed.data) {
      return parsed.data
    }
    throw new Error(parsed.message || '商品搜索失败')
  }
  throw new Error('搜索API返回格式异常')
}

/**
 * 获取推广链接
 */
async function getPromotionLink(params) {
  const paramJson = {
    promotionCodeReq: {
      materialUrl: params.materialUrl || '',
      unionId: params.unionId || '',
      pid: params.pid || '',
      siteId: params.siteId || '',
      positionId: params.positionId || '',
    }
  }

  const result = await callJdApi('jd.union.open.promotion.common.get', paramJson)

  const respKey = 'jd_union_open_promotion_common_get_response'
  if (result[respKey] && result[respKey].result) {
    const parsed = JSON.parse(result[respKey].result)
    if (parsed.code === 200 && parsed.data) {
      return parsed.data
    }
    throw new Error(parsed.message || '获取推广链接失败')
  }
  throw new Error('推广链接API返回格式异常')
}

// ========== 云函数入口 ==========
exports.main = async (event, context) => {
  const { action, params } = event

  try {
    let data
    switch (action) {
      case 'jingfenQuery':
        data = await jingfenQuery(params)
        break
      case 'goodsSearch':
        data = await goodsSearch(params)
        break
      case 'getPromotionLink':
        data = await getPromotionLink(params)
        break
      default:
        return { code: -1, message: `未知操作: ${action}` }
    }

    return { code: 0, data }
  } catch (err) {
    console.error('[jdUnion] 错误:', err)
    return {
      code: -1,
      message: err.message || '请求失败',
    }
  }
}
