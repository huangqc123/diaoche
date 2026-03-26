Component({
  data: {
    selected: 0,
    color: "#999999",
    selectedColor: "#E8402F",
    list: [
      { pagePath: "/pages/home/index", text: "首页", icon: "home" },
      { pagePath: "/pages/profile/index", text: "我的", icon: "profile" }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.switchTab({ url })
    }
  }
})
