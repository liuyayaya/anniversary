// pages/wish/wish.js - 本地存储版
const WISHES_KEY = 'wishes';

Page({
  data: {
    wishes: [],
    filter: 'all',
    showModal: false,
    wishTitle: '',
    wishPrice: '',
    wishSendTo: '',
    editingWish: null
  },

  onShow() {
    this.loadWishes();
  },

  loadWishes() {
    let data = wx.getStorageSync(WISHES_KEY) || [];
    
    // 按时间排序
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    let filtered = data;
    if (this.data.filter !== 'all') {
      filtered = data.filter(w => w.status === this.data.filter);
    }
    
    this.setData({ wishes: filtered });
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter });
    this.loadWishes();
  },

  openModal(e) {
    const wish = e.currentTarget.dataset.wish;
    if (wish) {
      this.setData({
        showModal: true,
        editingWish: wish._id,
        wishTitle: wish.title,
        wishPrice: wish.price ? String(wish.price) : '',
        wishSendTo: wish.sendTo || ''
      });
    } else {
      this.setData({
        showModal: true,
        editingWish: null,
        wishTitle: '',
        wishPrice: '',
        wishSendTo: ''
      });
    }
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  onTitleInput(e) { this.setData({ wishTitle: e.detail.value }); },
  onPriceInput(e) { this.setData({ wishPrice: e.detail.value }); },
  onSendToInput(e) { this.setData({ wishSendTo: e.detail.value }); },

  save() {
    if (!this.data.wishTitle.trim()) {
      wx.showToast({ title: '请输入心愿', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const allWishes = wx.getStorageSync(WISHES_KEY) || [];
      
      const data = {
        title: this.data.wishTitle.trim(),
        price: this.data.wishPrice ? parseFloat(this.data.wishPrice) : 0,
        sendTo: this.data.wishSendTo.trim(),
        updatedAt: new Date().toISOString()
      };

      if (this.data.editingWish) {
        const index = allWishes.findIndex(w => w._id === this.data.editingWish);
        if (index !== -1) {
          allWishes[index] = { ...allWishes[index], ...data };
        }
      } else {
        data._id = Date.now().toString();
        data.status = 'pending';
        data.createdAt = new Date().toISOString();
        allWishes.push(data);
      }

      wx.setStorageSync(WISHES_KEY, allWishes);
      this.closeModal();
      this.loadWishes();
      wx.showToast({ title: '保存成功' });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  toggleStatus(e) {
    const wish = e.currentTarget.dataset.wish;
    const allWishes = wx.getStorageSync(WISHES_KEY) || [];
    const index = allWishes.findIndex(w => w._id === wish._id);
    
    if (index !== -1) {
      allWishes[index].status = wish.status === 'pending' ? 'done' : 'pending';
      wx.setStorageSync(WISHES_KEY, allWishes);
      this.loadWishes();
    }
  },

  deleteWish(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这个心愿吗？',
      success: (res) => {
        if (res.confirm) {
          const allWishes = wx.getStorageSync(WISHES_KEY) || [];
          const newList = allWishes.filter(w => w._id !== id);
          wx.setStorageSync(WISHES_KEY, newList);
          this.loadWishes();
          wx.showToast({ title: '已删除' });
        }
      }
    });
  }
});