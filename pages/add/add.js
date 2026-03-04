// pages/add/add.js - 本地存储版
const DB_KEY = 'anniversaries';

Page({
  data: {
    id: null,
    title: '',
    date: '',
    type: 'anniversary',
    cycle: 'yearly',
    reminder: true,
    reminderDays: 3,
    addToCalendar: true,
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
  loadAnniversary(id) {
    const list = wx.getStorageSync(DB_KEY) || [];
    const item = list.find(i => i._id === id);
    if (item) {
      this.setData({
        title: item.title,
        date: item.date,
        type: item.type,
        cycle: item.cycle,
        reminder: item.reminder,
        reminderDays: item.reminderDays || 3
      });
    }
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onDateChange(e) { this.setData({ date: e.detail.value }); },
  onTypeChange(e) { this.setData({ type: this.data.types[e.detail.value].value }); },
  onCycleChange(e) { this.setData({ cycle: this.data.cycles[e.detail.value].value }); },
  onReminderChange(e) { this.setData({ reminder: e.detail.value }); },
  onReminderDaysChange(e) { this.setData({ reminderDays: this.data.reminderOptions[e.detail.value] }); },
  onCalendarChange(e) { this.setData({ addToCalendar: e.detail.value }); },

  // 生成日历文件
  generateICS(title, date, cycle) {
    const [year, month, day] = date.split('-').map(Number);
    
    const freqMap = { 'daily': 'DAILY', 'weekly': 'WEEKLY', 'monthly': 'MONTHLY', 'yearly': 'YEARLY' };
    const freq = freqMap[cycle] || 'YEARLY';
    
    const formatDT = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}${m}${dd}T${h}${min}00`;
    };
    
    const now = new Date();
    let eventDate = new Date(year, month - 1, day, 9, 0, 0);
    if (eventDate <= now) {
      if (cycle === 'yearly') eventDate.setFullYear(now.getFullYear() + 1);
      else if (cycle === 'monthly') eventDate.setMonth(now.getMonth() + 1);
      else if (cycle === 'weekly') eventDate.setDate(now.getDate() + 7);
    }
    
    const startDT = formatDT(eventDate);
    const endDT = formatDT(new Date(eventDate.getTime() + 60 * 60 * 1000));
    const uid = `anniversary-${Date.now()}@anniversary`;
    
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Anniversary//EN',
      'BEGIN:VEVENT',
      `DTSTART;TZID=Asia/Shanghai:${startDT}`,
      `DTEND;TZID=Asia/Shanghai:${endDT}`,
      `RRULE:FREQ=${freq}`,
      `SUMMARY:${title}`,
      `UID:${uid}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:30分钟后提醒',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  },

  // 保存
  save() {
    const { title, date, type, cycle, reminder, reminderDays, addToCalendar, id } = this.data;
    
    if (!title.trim()) { wx.showToast({ title: '请输入标题', icon: 'none' }); return; }
    if (!date) { wx.showToast({ title: '请选择日期', icon: 'none' }); return; }

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
        updatedAt: new Date().toISOString()
      };

      const list = wx.getStorageSync(DB_KEY) || [];
      
      if (id) {
        // 编辑
        const index = list.findIndex(i => i._id === id);
        if (index !== -1) {
          list[index] = { ...list[index], ...data };
        }
      } else {
        // 新增
        data._id = Date.now().toString();
        data.createdAt = new Date().toISOString();
        list.push(data);
      }
      
      wx.setStorageSync(DB_KEY, list);

      // 添加到日历
      if (addToCalendar && !id) {
        const icsContent = this.generateICS(title, date, cycle);
        const fileName = `${title.replace(/[^\w]/g, '')}-${Date.now()}.ics`;
        const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        
        const fs = wx.getFileSystemManager();
        fs.writeFileSync(filePath, icsContent, 'utf8');
        
        wx.openDocument({
          filePath: filePath,
          fileType: 'ics',
          success: () => {
            wx.showToast({ title: '打开后分享到日历', icon: 'none', duration: 4000 });
          },
          fail: () => {
            wx.showToast({ title: '已保存', icon: 'success' });
          }
        });
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