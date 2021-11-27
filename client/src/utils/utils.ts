export const isEmail = (email: string): boolean => {
  const regExp = /^[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_.]?[0-9a-zA-Z])*.[a-zA-Z]{2,3}$/i;
  return regExp.test(email);
};

export const isNickname = (nickname: string): boolean => {
  const regExp = /^(?=.*[a-zA-Z가-힣])[-a-zA-Z가-힣0-9_.]{2,10}$/;
  return regExp.test(nickname);
};

export const isPassword = (password: string): boolean => {
  const regExp = /^(?=.*\d)(?=.*[a-zA-Z])[0-9a-zA-Z!@#$%^&*]{8,20}$/;
  return regExp.test(password);
};

export const adminOptions = new Array(9).fill(0).map((_, i) => ({ value: i + 1, label: i + 1 }));

const getPrevYear = (now: Date, number: number): Date => {
  const tomorrow = new Date(now.setDate(now.getDate() + 1));
  const prevYear = new Date(tomorrow.setFullYear(tomorrow.getFullYear() - number));
  return prevYear;
};

const dateToString = (date: Date): string => date.toISOString().split('T')[0];

const getDateListFromStartToLast = (startDate: string, lastDate: string): string[] => {
  const dataList = [];
  const start = new Date(startDate);
  const last = new Date(lastDate);
  while (start <= last) {
    dataList.push(dateToString(start));
    start.setDate(start.getDate() + 1);
  }
  return dataList;
};

export const getGrassDateList = (date: Date, year: number): string[] => {
  const currentDate = dateToString(date);
  const prevOneYearDate = dateToString(getPrevYear(date, year));
  const grassDateList = getDateListFromStartToLast(prevOneYearDate, currentDate);
  return grassDateList;
};

export const chatTimeFormatting = (time?: string): string => {
  if (time) {
    const timeString = time.match(/\d{2}:\d{2}:\d{2}/);
    return Array.isArray(timeString) ? timeString[0] : '';
  }
  return '';
};

export const getWidths = (line: any) => {
  return Array.from({ length: 12 }, (_, i) => {
    if (i === 0) return 0;
    return (line.width / 12) * i;
  });
};
export const getHeights = (months: any, maxMonths: any, line: any) => {
  return Array.from({ length: 12 }, (_, i) => {
    if (months[i + 1]) return (months[i + 1] / maxMonths) * line.height * 0.8;
    return 0;
  });
};

export const drawLineChartYaxis = (ctx: any, line: any) => {
  ctx.fillStyle = '#888888';
  for (let i = 2; i <= 24; i++) {
    ctx.moveTo(line.width - i * (line.width / 24) + 40, 0);
    ctx.lineTo(line.width - i * (line.width / 24) + 40, line.height - 30);
    ctx.stroke();
    if (i % 2 === 0) ctx.fillText(13 - i / 2, line.width - i * (line.width / 24) + 40, line.height);
  }
};

export const drawLineChartXaxis = (ctx: any, line: any) => {
  ctx.strokeStyle = '#f5f5f5';
  ctx.font = '12px Noto Sans KR';
  ctx.textAlign = 'center';
  for (let i = 1; i <= 15; i++) {
    ctx.moveTo(40, line.height - i * (line.height / 10) + 10);
    ctx.lineTo(line.width - 40, line.height - i * (line.height / 10) + 8);
    ctx.stroke();
  }
};
