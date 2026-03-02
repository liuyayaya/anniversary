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
    addToCalendar: true, // 新增：添加到手机日历
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

  // 切换添加到日历
  onCalendarChange(e) {
    this.setData({ addToCalendar: e.detail.value });
  },

  // 添加到手机日历
  async addToPhoneCalendar(title, date, cycle) {
    return new Promise((resolve, reject) => {
      // 根据循环周期设置重复规则
      let recurrenceRule = '';
      let repeatInterval = 1;
      
      switch (cycle) {
        case 'daily':
          recurrenceRule = 'daily';
          break;
        case 'weekly':
          recurrenceRule = 'weekly';
          break;
        case 'monthly':
          recurrenceRule = 'monthly';
          break;
        case 'yearly':
          recurrenceRule = 'yearly';
          break;
      }

      // 解析日期
      const [year, month, day] = date.split('-').map(Number);
      
      // 计算下一次的日期（从明天开始）
      const now = new Date();
      let startDate = new Date(year, month - 1, day, 9, 0, 0);
      
      // 如果今年的日期已过，调整到明年（年度）/下月（月度）/下周（周度）
      if (startDate <= now) {
        switch (cycle) {
          case 'yearly':
            startDate.setFullYear(now.getFullYear() + 1);
            break;
          case 'monthly':
            startDate.setMonth(now.getMonth() + 1);
            break;
          case 'weekly':
            startDate.setDate(now.getDate() + 7);
            break;
        }
      }

      const startTime = startDate.getTime();
      const endTime = startTime + 60 * 60 * 1000; // 1小时

      wx.addPhoneCalendar({
        title: title,
        startTime: startTime / 1000, // 转换为秒
        endTime: endTime / 1000,
        allDay: false,
        recurrenceRule: recurrenceRule,
        success: () => resolve(),
        fail: (err) => reject(err)
      });
    });
  },

  // 保存
  async save() {
    const { title, date, type, cycle, reminder, reminderDays, addToCalendar, id } = this.data;
    
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

      // 如果开启了添加到日历
      if (addToCalendar && !id) {
        try {
          await this.addToPhoneCalendar(title, date, cycle);
          wx.showToast({ title: '已添加到日历', icon: 'success' });
        } catch (calErr) {
          // 用户拒绝权限或日历添加失败
          console.error('添加到日历失败:', calErr);
          if (calErr.errMsg.includes('auth deny')) {
            wx.showToast({ title: '已保存（日历权限被拒绝）', icon: 'none' });
          } else {
            wx.showToast({ title: '已保存', icon: 'success' });
          }
        }
      } else {
        wx.showToast({ title: '保存成功', icon: 'success' });
      }

      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});