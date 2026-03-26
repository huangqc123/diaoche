/**
 * 京东广告弹窗组件
 * 
 * 使用方式:
 *   <jd-ad id="jdAd" mode="splash|interstitial|banner" />
 * 
 * 外部调用:
 *   this.selectComponent('#jdAd').showAd()
 * 
 * mode:
 *   - splash: 开屏广告（全屏遮罩 + 倒计时跳过）
 *   - interstitial: 插屏广告（计算完成后弹出，居中卡片）
 *   - banner: 横幅广告（嵌入页面底部的小条）
 */
const jdAd = require('../../utils/jdAd')

Component({
  properties: {
    // 广告模式
    mode: {
      type: String,
      value: 'interstitial' // splash | interstitial | banner
    }
  },

  data: {
    visible: false,
    adData: null,        // 当前广告数据
    countdown: 5,        // 开屏倒计时秒数
    canSkip: false,      // 是否可跳过
    closing: false,      // 关闭动画中
  },

  lifetimes: {
    attached() {
      // banner 模式自动展示
      if (this.properties.mode === 'banner') {
        this._loadAndShow()
      }
    },
    detached() {
      this._clearTimer()
    }
  },

  methods: {
    // ===== 对外方法：显示广告 =====
    showAd() {
      this._loadAndShow()
    },

    // 加载广告数据并展示
    _loadAndShow() {
      const ad = jdAd.getNextAd()
      if (!ad) return

      this.setData({
        adData: ad,
        visible: true,
        closing: false,
        countdown: this.properties.mode === 'splash' ? 5 : 0,
        canSkip: this.properties.mode !== 'splash'
      })

      // 开屏广告倒计时
      if (this.properties.mode === 'splash') {
        this._startCountdown()
      }

      // 记录广告展示
      jdAd.recordImpression(ad.id)
    },

    // 开屏倒计时
    _startCountdown() {
      this._clearTimer()
      this._timer = setInterval(() => {
        const cd = this.data.countdown - 1
        if (cd <= 0) {
          this._clearTimer()
          this.setData({ countdown: 0, canSkip: true })
        } else {
          this.setData({ countdown: cd })
        }
      }, 1000)
    },

    _clearTimer() {
      if (this._timer) {
        clearInterval(this._timer)
        this._timer = null
      }
    },

    // ===== 用户点击广告 =====
    onAdTap() {
      const ad = this.data.adData
      if (!ad) return

      // 记录点击
      jdAd.recordClick(ad.id)

      // 跳转京东小程序
      jdAd.navigateToJd(ad)

      // 关闭广告
      this._close()
    },

    // ===== 关闭/跳过广告 =====
    onSkip() {
      if (!this.data.canSkip && this.properties.mode === 'splash') return
      this._close()
    },

    onMaskTap() {
      // 插屏广告点击遮罩关闭
      if (this.properties.mode === 'interstitial') {
        this._close()
      }
    },

    _close() {
      this._clearTimer()
      this.setData({ closing: true })
      setTimeout(() => {
        this.setData({ visible: false, closing: false, adData: null })
        this.triggerEvent('close')
      }, 300)
    }
  }
})
