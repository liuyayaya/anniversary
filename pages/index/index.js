// pages/index/index.js
const db = wx.cloud.database();

Page({
  data: {
    anniversaries: [],
    upcomingList: [], // 即将到来的纪念日
    showAddBtn: true
  },

  onShow() {
    this.loadAnniversaries();
  },

  // 加载纪念日列表
  async loadAnniversaries() {
    wx.showLoading({ title: '加载中...' });
    
    try {
      const { data } = await db.collection('anniversaries')
        .orderBy('date', 'asc')
        .get();
      
      const upcomingList = this.getUpcomingAnniversaries(data);
      
      this.setData({
        anniversaries: data,
        upcomingList
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 计算即将到来的纪念日
  getUpcomingAnniversaries(list) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return list.map(item => {
      const itemDate = new Date(item.date);
      const thisYear = new Date(today.getFullYear(), itemDate.getMonth(), itemDate.getDate());
      
      // 计算今年距离天数
      let daysDiff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24));
      
      // 如果已过，调整到明年
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
  async deleteAnniversary(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '删除后回忆和心愿清单也会被删除',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('anniversaries').doc(id).remove();
            await db.collection('memories').where({ anniversaryId: id }).remove();
            await db.collection('wishes').where({ anniversaryId: id }).remove();
            
            wx.showToast({ title: '删除成功' });
            this.loadAnniversaries();
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadAnniversaries().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});