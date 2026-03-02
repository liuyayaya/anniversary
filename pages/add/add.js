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
    addToCalendar: true, // 添加到手机日历
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

  // 生成日历文件 (.ics)
  generateICS(title, date, cycle) {
    const [year, month, day] = date.split('-').map(Number);
    
    // 循环规则映射
    const freqMap = {
      'daily': 'DAILY',
      'weekly': 'WEEKLY', 
      'monthly': 'MONTHLY',
      'yearly': 'YEARLY'
    };
    
    const freq = freqMap[cycle] || 'YEARLY';
    
    // 格式化日期时间 (YYYYMMDDTHHMMSS)
    const formatDateTime = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      return `${y}${m}${dd}T${h}${min}${s}`;
    };
    
    // 计算明年的日期（避免已过去的日期）
    const now = new Date();
    let eventDate = new Date(year, month - 1, day, 9, 0, 0);
    
    if (eventDate <= now) {
      if (cycle === 'yearly') {
        eventDate.setFullYear(now.getFullYear() + 1);
      } else if (cycle === 'monthly') {
        eventDate.setMonth(now.getMonth() + 1);
      } else if (cycle === 'weekly') {
        eventDate.setDate(now.getDate() + 7);
      }
    }
    
    const startDT = formatDateTime(eventDate);
    const endDT = formatDateTime(new Date(eventDate.getTime() + 60 * 60 * 1000));
    
    // 生成唯一ID
    const uid = `anniversary-${Date.now()}@anniversary-miniprogram`;
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Anniversary Reminder//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:纪念日提醒',
      'BEGIN:VEVENT',
      `DTSTART;TZID=Asia/Shanghai:${startDT}`,
      `DTEND;TZID=Asia/Shanghai:${endDT}`,
      `RRULE:FREQ=${freq}`,
      `SUMMARY:${title}`,
      `UID:${uid}`,
      'SEQUENCE:0',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:30分钟后提醒',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    
    return icsContent;
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
          // 生成 .ics 文件内容
          const icsContent = this.generateICS(title, date, cycle);
          
          // 保存到本地文件
          const filePath = `${wx.env.USER_DATA_PATH}/${title}-${Date.now()}.ics`;
          const fs = wx.getFileSystemManager();
          fs.writeFileSync(filePath, icsContent, 'utf8');
          
          // 分享文件给用户
          wx.showModal({
            title: '添加到手机日历',
            content: '点击"确定"后，在新页面点击右上角分享，选择"保存到文件"或用其他应用打开',
            confirmText: '确定',
            success: (res) => {
              if (res.confirm) {
                wx.openDocument({
                  filePath: filePath,
                  fileType: 'ics',
                  showMenu: true,
                  success: () => {
                    console.log('打开成功');
                  },
                  fail: (err) => {
                    console.error('打开失败:', err);
                    wx.showToast({ title: '请用其他方式打开', icon: 'none' });
                  }
                });
              }
            }
          });
        } catch (calErr) {
          console.error('生成日历文件失败:', calErr);
          wx.showToast({ title: '已保存', icon: 'success' });
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