// app.js
App({
  onLaunch: function () {
    this.globalData = {
      userInfo: null,
      isLoggedIn: false,
      calcHistory: wx.getStorageSync('calcHistory') || []
    }
  },

  // 保存计算历史
  saveHistory(type, params, result) {
    let history = this.globalData.calcHistory
    history.unshift({
      type,
      params,
      result,
      time: new Date().toLocaleString()
    })
    if (history.length > 50) history = history.slice(0, 50)
    this.globalData.calcHistory = history
    wx.setStorageSync('calcHistory', history)
  }
})
