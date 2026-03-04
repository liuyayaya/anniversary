// pages/timeline/timeline.js - 本地存储版
const DB_KEY = 'anniversaries';
const MEMORIES_KEY = 'memories';

Page({
  data: {
    timeline: [],
    years: [],
    selectedYear: null
  },

  onShow() {
    this.loadTimeline();
  },

  loadTimeline() {
    // 获取所有纪念日
    const anniversaries = wx.getStorageSync(DB_KEY) || [];
    const sortedAnniversaries = [...anniversaries].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 获取所有回忆
    const memories = wx.getStorageSync(MEMORIES_KEY) || [];
    const sortedMemories = [...memories].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 合并数据构建时间线
    const timeline = [];
    
    // 添加纪念日到时间线
    sortedAnniversaries.forEach(item => {
      timeline.push({
        type: 'anniversary',
        date: item.date,
        title: item.title,
        subtitle: item.cycleText,
        data: item
      });
    });
    
    // 添加回忆到时间线
    sortedMemories.forEach(item => {
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
  },

  onYearChange(e) {
    const index = e.detail.value;
    this.setData({ selectedYear: this.data.years[index] });
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