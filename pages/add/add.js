// pages/add/add.js
const db = wx.cloud.database();

Page({
  data: {
    id: null, // 编辑时使用
    title: '',
    date: '',
    type: 'anniversary', // birthday | anniversary | custom
    cycle: 'yearly', // daily | weekly | monthly | yearly
    reminder: true,
    reminderDays: 3,
    types: [
      { value: 'birthday', label: '🎂 生日', icon: '🎂' },
      { value: 'anniversary', label: '💑 纪念日', icon: '💑' },
      { value: 'custom', label: '📌 自定义', icon: '📌' }
    ],
    cycles: [
      { value: 'daily', label: '每天' },
      { value: 'weekly', label: '每周' },
      { value: 'monthly', label: '每月' },
      { value: 'yearly', label: '每年' }
    ],
    reminderOptions: [1, 3, 7]
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
      this.loadAnniversary(options.id);
    }
  },

  // 加载纪念日数据（编辑用）
  async loadAnniversary(id) {
    try {
      const { data } = await db.collection('anniversaries').doc(id).get();
      this.setData({
        title: data.title,
        date: data.date,
        type: data.type,
        cycle: data.cycle,
        reminder: data.reminder,
        reminderDays: data.reminderDays || 3
      });
    } catch (err) {
      console.error(err);
    }
  },

  // 输入标题
  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  // 选择日期
  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  // 选择类型
  onTypeChange(e) {
    const type = this.data.types[e.detail.value].value;
    this.setData({ type });
  },

  // 选择循环周期
  onCycleChange(e) {
    const cycle = this.data.cycles[e.detail.value].value;
    this.setData({ cycle });
  },

  // 切换提醒
  onReminderChange(e) {
    this.setData({ reminder: e.detail.value });
  },

  // 选择提前提醒天数
  onReminderDaysChange(e) {
    const days = this.data.reminderOptions[e.detail.value];
    this.setData({ reminderDays: days });
  },

  // 保存
  async save() {
    const { title, date, type, cycle, reminder, reminderDays, id } = this.data;
    
    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const cycleText = this.data.cycles.find(c => c.value === cycle)?.label || '每年';
      
      const data = {
        title: title.trim(),
        date,
        type,
        cycle,
        cycleText,
        reminder,
        reminderDays,
        updatedAt: db.serverDate()
      };

      if (id) {
        await db.collection('anniversaries').doc(id).update({ data });
      } else {
        data.createdAt = db.serverDate();
        await db.collection('anniversaries').add({ data });
      }

      wx.showToast({ title: '保存成功' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});