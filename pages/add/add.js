// pages/add/add.js
const db = wx.cloud.database();

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
    
    // 计算下次日期
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
  async save() {
    const { title, date, type, cycle, reminder, reminderDays, addToCalendar, id } = this.data;
    
    if (!title.trim()) { wx.showToast({ title: '请输入标题', icon: 'none' }); return; }
    if (!date) { wx.showToast({ title: '请选择日期', icon: 'none' }); return; }

    wx.showLoading({ title: '保存中...' });

    try {
      const cycleText = this.data.cycles.find(c => c.value === cycle)?.label || '每年';
      const data = {
        title: title.trim(), date, type, cycle, cycleText, reminder, reminderDays,
        updatedAt: db.serverDate()
      };

      if (id) {
        await db.collection('anniversaries').doc(id).update({ data });
      } else {
        data.createdAt = db.serverDate();
        await db.collection('anniversaries').add({ data });
      }

      // 添加到日历
      if (addToCalendar && !id) {
        const icsContent = this.generateICS(title, date, cycle);
        const fileName = `${title.replace(/[^\w]/g, '')}-${Date.now()}.ics`;
        const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        
        const fs = wx.getFileSystemManager();
        fs.writeFileSync(filePath, icsContent, 'utf8');
        
        // 直接打开，让 iOS 自动识别 .ics
        wx.openDocument({
          filePath: filePath,
          fileType: 'ics',
          success: () => {
            wx.showToast({ title: '打开后点右上角分享→添加到日历', icon: 'none', duration: 4000 });
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