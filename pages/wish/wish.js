// pages/wish/wish.js
const db = wx.cloud.database();

Page({
  data: {
    wishes: [],
    filter: 'all', // all | pending | done
    editingWish: null,
    showModal: false,
    wishTitle: '',
    wishPrice: '',
    wishSendTo: ''
  },

  onShow() {
    this.loadWishes();
  },

  async loadWishes() {
    wx.showLoading({ title: '加载中...' });
    try {
      let query = db.collection('wishes').orderBy('createdAt', 'desc');
      
      const { data } = await query.get();
      
      let filtered = data;
      if (this.data.filter !== 'all') {
        filtered = data.filter(w => w.status === this.data.filter);
      }
      
      this.setData({ wishes: filtered });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 切换筛选
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter });
    this.loadWishes();
  },

  // 打开弹窗
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

  // 关闭弹窗
  closeModal() {
    this.setData({ showModal: false });
  },

  // 输入
  onTitleInput(e) { this.setData({ wishTitle: e.detail.value }); },
  onPriceInput(e) { this.setData({ wishPrice: e.detail.value }); },
  onSendToInput(e) { this.setData({ wishSendTo: e.detail.value }); },

  // 保存
  async save() {
    if (!this.data.wishTitle.trim()) {
      wx.showToast({ title: '请输入心愿', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const data = {
        title: this.data.wishTitle.trim(),
        price: this.data.wishPrice ? parseFloat(this.data.wishPrice) : 0,
        sendTo: this.data.wishSendTo.trim(),
        updatedAt: db.serverDate()
      };

      if (this.data.editingWish) {
        await db.collection('wishes').doc(this.data.editingWish).update({ data });
      } else {
        data.status = 'pending';
        data.createdAt = db.serverDate();
        await db.collection('wishes').add({ data });
      }

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

  // 切换状态
  async toggleStatus(e) {
    const wish = e.currentTarget.dataset.wish;
    const newStatus = wish.status === 'pending' ? 'done' : 'pending';
    await db.collection('wishes').doc(wish._id).update({
      data: { status: newStatus }
    });
    this.loadWishes();
  },

  // 删除
  async delete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这个心愿吗？',
      success: async (res) => {
        if (res.confirm) {
          await db.collection('wishes').doc(id).remove();
          this.loadWishes();
          wx.showToast({ title: '已删除' });
        }
      }
    });
  }
});