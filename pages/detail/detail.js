// pages/detail/detail.js
const db = wx.cloud.database();

Page({
  data: {
    id: '',
    anniversary: null,
    memories: [],
    wishes: [],
    showMemoryModal: false,
    showWishModal: false,
    memoryContent: '',
    memoryImages: [],
    wishTitle: '',
    wishPrice: '',
    wishSendTo: '',
    editingMemory: null,
    editingWish: null
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadData();
    }
  },

  async loadData() {
    wx.showLoading({ title: '加载中...' });
    try {
      // 加载纪念日
      const { data: anniversary } = await db.collection('anniversaries').doc(this.data.id).get();
      
      // 加载回忆
      const { data: memories } = await db.collection('memories')
        .where({ anniversaryId: this.data.id })
        .orderBy('createdAt', 'desc')
        .get();
      
      // 加载心愿
      const { data: wishes } = await db.collection('wishes')
        .where({ anniversaryId: this.data.id })
        .orderBy('createdAt', 'desc')
        .get();

      this.setData({ anniversary, memories, wishes });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 编辑纪念日
  goToEdit() {
    wx.navigateTo({ url: `/pages/add/add?id=${this.data.id}` });
  },

  // ==================== 回忆相关 ====================
  openMemoryModal() {
    this.setData({ 
      showMemoryModal: true, 
      memoryContent: '', 
      memoryImages: [],
      editingMemory: null 
    });
  },

  closeMemoryModal() {
    this.setData({ showMemoryModal: false });
  },

  onMemoryInput(e) {
    this.setData({ memoryContent: e.detail.value });
  },

  // 选择图片
  async chooseImage() {
    const res = await wx.chooseMedia({
      count: 9 - this.data.memoryImages.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera']
    });
    
    const newImages = res.tempFiles.map(f => f.tempFilePath);
    this.setData({
      memoryImages: [...this.data.memoryImages, ...newImages].slice(0, 9)
    });
  },

  // 删除图片
  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.memoryImages.filter((_, i) => i !== index);
    this.setData({ memoryImages: images });
  },

  // 保存回忆
  async saveMemory() {
    if (!this.data.memoryContent.trim() && this.data.memoryImages.length === 0) {
      wx.showToast({ title: '内容不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      // 上传图片到云存储
      const imageUrls = await this.uploadImages(this.data.memoryImages);
      
      const data = {
        anniversaryId: this.data.id,
        content: this.data.memoryContent.trim(),
        images: imageUrls,
        updatedAt: db.serverDate()
      };

      if (this.data.editingMemory) {
        await db.collection('memories').doc(this.data.editingMemory).update({ data });
      } else {
        data.createdAt = db.serverDate();
        await db.collection('memories').add({ data });
      }

      this.closeMemoryModal();
      this.loadData();
      wx.showToast({ title: '保存成功' });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 上传图片
  async uploadImages(paths) {
    const urls = [];
    for (const path of paths) {
      const cloudPath = `memories/${Date.now()}-${Math.random()}.${path.split('.').pop()}`;
      const upload = await wx.cloud.uploadFile({
        cloudPath,
        filePath: path
      });
      urls.push(upload.fileID);
    }
    return urls;
  },

  // 编辑回忆
  editMemory(e) {
    const memory = e.currentTarget.dataset.memory;
    this.setData({
      showMemoryModal: true,
      memoryContent: memory.content,
      memoryImages: memory.images || [],
      editingMemory: memory._id
    });
  },

  // 删除回忆
  async deleteMemory(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条回忆吗？',
      success: async (res) => {
        if (res.confirm) {
          await db.collection('memories').doc(id).remove();
          this.loadData();
          wx.showToast({ title: '已删除' });
        }
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({ current: url, urls: urls || [url] });
  },

  // ==================== 心愿相关 ====================
  openWishModal() {
    this.setData({ 
      showWishModal: true, 
      wishTitle: '', 
      wishPrice: '',
      wishSendTo: '',
      editingWish: null 
    });
  },

  closeWishModal() {
    this.setData({ showWishModal: false });
  },

  onWishTitleInput(e) {
    this.setData({ wishTitle: e.detail.value });
  },

  onWishPriceInput(e) {
    this.setData({ wishPrice: e.detail.value });
  },

  onWishSendToInput(e) {
    this.setData({ wishSendTo: e.detail.value });
  },

  // 保存心愿
  async saveWish() {
    if (!this.data.wishTitle.trim()) {
      wx.showToast({ title: '请输入心愿', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const data = {
        anniversaryId: this.data.id,
        title: this.data.wishTitle.trim(),
        price: this.data.wishPrice ? parseFloat(this.data.wishPrice) : 0,
        sendTo: this.data.wishSendTo.trim(),
        status: 'pending',
        updatedAt: db.serverDate()
      };

      if (this.data.editingWish) {
        await db.collection('wishes').doc(this.data.editingWish).update({ data });
      } else {
        data.createdAt = db.serverDate();
        await db.collection('wishes').add({ data });
      }

      this.closeWishModal();
      this.loadData();
      wx.showToast({ title: '保存成功' });
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 编辑心愿
  editWish(e) {
    const wish = e.currentTarget.dataset.wish;
    this.setData({
      showWishModal: true,
      wishTitle: wish.title,
      wishPrice: wish.price ? String(wish.price) : '',
      wishSendTo: wish.sendTo || '',
      editingWish: wish._id
    });
  },

  // 标记心愿完成
  async toggleWishStatus(e) {
    const wish = e.currentTarget.dataset.wish;
    const newStatus = wish.status === 'pending' ? 'done' : 'pending';
    await db.collection('wishes').doc(wish._id).update({
      data: { status: newStatus }
    });
    this.loadData();
  },

  // 删除心愿
  async deleteWish(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这个心愿吗？',
      success: async (res) => {
        if (res.confirm) {
          await db.collection('wishes').doc(id).remove();
          this.loadData();
          wx.showToast({ title: '已删除' });
        }
      }
    });
  }
});