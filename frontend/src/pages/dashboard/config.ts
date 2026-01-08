import ThemeColor from '@/themeColor';
import { TitltListItem } from './data';

// 三栏布局响应式
export const leftRightCol = {
	sm: {
		span: 7
	},
	xs: {
		span: 24,
		order: 2
	}
};

export const centerCol = {
	sm: {
		span: 10,
		order: 2
	},
	xs: {
		span: 24,
		order: 1
	}
};

export const colorList = [
	ThemeColor.lineBlue,
	ThemeColor.lineGreen,
	ThemeColor.lineYellow,
	ThemeColor.linePink,
	ThemeColor.lineRed,
	ThemeColor.lineOrange
];

export const titleList: TitltListItem[] = [
	{
		label: '项目名',
		width: '20%'
	},
	{
		label: '影响力',
		width: '16%'
	},
	{
		label: '发展趋势',
		width: '16%'
	},
	{
		label: '社区反应',
		width: '16%'
	},
	{
		label: '开发活跃度',
		width: '16%'
	},
	{
		label: 'Github指数',
		width: '16%'
	}
];

// 生成日期列表的函数，根据起始和结束时间动态生成
export function generateDateList(startDate: string, endDate: string): string[] {
	const result: string[] = [];

	// 解析开始和结束日期
	const [startYear, startMonth] = startDate.split('-').map(Number);
	const [endYear, endMonth] = endDate.split('-').map(Number);

	let year = startYear;
	let month = startMonth;

	// 生成从开始到结束的所有月份
	while (year < endYear || (year === endYear && month <= endMonth)) {
		const monthStr = month < 10 ? `0${month}` : `${month}`;
		result.push(`${year}-${monthStr}`);

		month++;
		if (month > 12) {
			month = 1;
			year++;
		}
	}

	return result;
}

// 默认的静态日期列表(作为fallback)
export const dateList = generateDateList('2021-01', '2025-10');

