// pages/detail/detail.js - 本地存储版
const DB_KEY = 'anniversaries';
const MEMORIES_KEY = 'memories';
const WISHES_KEY = 'wishes';

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

  loadData() {
    // 加载纪念日
    const list = wx.getStorageSync(DB_KEY) || [];
    const anniversary = list.find(i => i._id === this.data.id);
    
    // 加载回忆
    const memories = (wx.getStorageSync(MEMORIES_KEY) || [])
      .filter(m => m.anniversaryId === this.data.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 加载心愿
    const wishes = (wx.getStorageSync(WISHES_KEY) || [])
      .filter(w => w.anniversaryId === this.data.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    this.setData({ anniversary, memories, wishes });
  },

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

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.memoryImages.filter((_, i) => i !== index);
    this.setData({ memoryImages: images });
  },

  // 保存回忆
  saveMemory() {
    if (!this.data.memoryContent.trim() && this.data.memoryImages.length === 0) {
      wx.showToast({ title: '内容不能为空', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const allMemories = wx.getStorageSync(MEMORIES_KEY) || [];
      
      const data = {
        anniversaryId: this.data.id,
        content: this.data.memoryContent.trim(),
        images: this.data.memoryImages,
        updatedAt: new Date().toISOString()
      };

      if (this.data.editingMemory) {
        // 编辑
        const index = allMemories.findIndex(m => m._id === this.data.editingMemory);
        if (index !== -1) {
          allMemories[index] = { ...allMemories[index], ...data };
        }
      } else {
        // 新增
        data._id = Date.now().toString();
        data.createdAt = new Date().toISOString();
        allMemories.push(data);
      }

      wx.setStorageSync(MEMORIES_KEY, allMemories);
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
  deleteMemory(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条回忆吗？',
      success: (res) => {
        if (res.confirm) {
          const allMemories = wx.getStorageSync(MEMORIES_KEY) || [];
          const newList = allMemories.filter(m => m._id !== id);
          wx.setStorageSync(MEMORIES_KEY, newList);
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

  onWishTitleInput(e) { this.setData({ wishTitle: e.detail.value }); },
  onWishPriceInput(e) { this.setData({ wishPrice: e.detail.value }); },
  onWishSendToInput(e) { this.setData({ wishSendTo: e.detail.value }); },

  // 保存心愿
  saveWish() {
    if (!this.data.wishTitle.trim()) {
      wx.showToast({ title: '请输入心愿', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const allWishes = wx.getStorageSync(WISHES_KEY) || [];
      
      const data = {
        anniversaryId: this.data.id,
        title: this.data.wishTitle.trim(),
        price: this.data.wishPrice ? parseFloat(this.data.wishPrice) : 0,
        sendTo: this.data.wishSendTo.trim(),
        status: 'pending',
        updatedAt: new Date().toISOString()
      };

      if (this.data.editingWish) {
        const index = allWishes.findIndex(w => w._id === this.data.editingWish);
        if (index !== -1) {
          allWishes[index] = { ...allWishes[index], ...data };
        }
      } else {
        data._id = Date.now().toString();
        data.createdAt = new Date().toISOString();
        allWishes.push(data);
      }

      wx.setStorageSync(WISHES_KEY, allWishes);
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

  // 切换心愿状态
  toggleWishStatus(e) {
    const wish = e.currentTarget.dataset.wish;
    const allWishes = wx.getStorageSync(WISHES_KEY) || [];
    const index = allWishes.findIndex(w => w._id === wish._id);
    
    if (index !== -1) {
      allWishes[index].status = wish.status === 'pending' ? 'done' : 'pending';
      wx.setStorageSync(WISHES_KEY, allWishes);
      this.loadData();
    }
  },

  // 删除心愿
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
          this.loadData();
          wx.showToast({ title: '已删除' });
        }
      }
    });
  }
});