// pages/timeline/timeline.js
const db = wx.cloud.database();

Page({
  data: {
    timeline: [],
    years: [],
    selectedYear: null
  },

  onShow() {
    this.loadTimeline();
  },

  async loadTimeline() {
    wx.showLoading({ title: '加载中...' });
    try {
      // 获取所有纪念日
      const { data: anniversaries } = await db.collection('anniversaries')
        .orderBy('date', 'desc')
        .get();
      
      // 获取所有回忆
      const { data: memories } = await db.collection('memories')
        .orderBy('createdAt', 'desc')
        .get();
      
      // 合并数据构建时间线
      const timeline = [];
      
      // 添加纪念日到时间线
      anniversaries.forEach(item => {
        timeline.push({
          type: 'anniversary',
          date: item.date,
          title: item.title,
          subtitle: item.cycleText,
          data: item
        });
      });
      
      // 添加回忆到时间线
      memories.forEach(item => {
        const anniversary = anniversaries.find(a => a._id === item.anniversaryId);
        timeline.push({
          type: 'memory',
          date: item.createdAt,
          title: anniversary ? anniversary.title : '回忆',
          content: item.content,
          images: item.images,
          data: item
        });
      });
      
      // 按日期排序
      timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // 提取年份
      const yearSet = new Set(timeline.map(t => new Date(t.date).getFullYear()));
      const years = Array.from(yearSet).sort((a, b) => b - a);
      
      this.setData({ 
        timeline, 
        years,
        selectedYear: years[0] || null
      });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 切换年份
  onYearChange(e) {
    const index = e.detail.value;
    this.setData({ selectedYear: this.data.years[index] });
  },

  // 筛选当前年份的数据
  getFilteredTimeline() {
    if (!this.data.selectedYear) return [];
    return this.data.timeline.filter(item => {
      const year = new Date(item.date).getFullYear();
      return year === this.data.selectedYear;
    });
  },

  // 预览图片
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({ current: url, urls: urls || [url] });
  },

  // 跳转到详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  }
});