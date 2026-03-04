// pages/index/index.js - 本地存储版
const DB_KEY = 'anniversaries';

Page({
  data: {
    anniversaries: [],
    upcomingList: []
  },

  onShow() {
    this.loadAnniversaries();
  },

  // 加载纪念日列表
  loadAnniversaries() {
    const data = wx.getStorageSync(DB_KEY) || [];
    
    const upcomingList = this.getUpcomingAnniversaries(data);
    
    this.setData({
      anniversaries: data,
      upcomingList
    });
  },

  // 计算即将到来的纪念日
  getUpcomingAnniversaries(list) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return list.map(item => {
      const itemDate = new Date(item.date);
      const thisYear = new Date(today.getFullYear(), itemDate.getMonth(), itemDate.getDate());
      
      let daysDiff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 0) {
        if (item.cycle === 'yearly') {
          thisYear.setFullYear(thisYear.getFullYear() + 1);
          daysDiff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
        } else if (item.cycle === 'monthly') {
          thisYear.setMonth(thisYear.getMonth() + 1);
          daysDiff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
        } else if (item.cycle === 'weekly') {
          thisYear.setDate(thisYear.getDate() + 7);
          daysDiff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
        }
      }
      
      return { ...item, daysDiff };
    }).filter(item => item.daysDiff >= 0 && item.daysDiff <= 30)
      .sort((a, b) => a.daysDiff - b.daysDiff);
  },

  // 跳转到详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  // 跳转到添加
  goToAdd() {
    wx.navigateTo({ url: '/pages/add/add' });
  },

  // 删除纪念日
  deleteAnniversary(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '删除后回忆和心愿清单也会被删除',
      success: (res) => {
        if (res.confirm) {
          const list = wx.getStorageSync(DB_KEY) || [];
          const newList = list.filter(item => item._id !== id);
          wx.setStorageSync(DB_KEY, newList);
          
          // 同时删除回忆和心愿
          wx.setStorageSync('memories', (wx.getStorageSync('memories') || []).filter(m => m.anniversaryId !== id));
          wx.setStorageSync('wishes', (wx.getStorageSync('wishes') || []).filter(w => w.anniversaryId !== id));
          
          wx.showToast({ title: '删除成功' });
          this.loadAnniversaries();
        }
      }
    });
  },

  onPullDownRefresh() {
    this.loadAnniversaries();
    wx.stopPullDownRefresh();
  }
});