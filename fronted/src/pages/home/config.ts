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

export const dateList = [
	'2021-01',
	'2021-02',
	'2021-03',
	'2021-04',
	'2021-05',
	'2021-06',
	'2021-07',
	'2021-08',
	'2021-09',
	'2021-10',
	'2021-11',
	'2021-12',
	'2022-01',
	'2022-02',
	'2022-03',
	'2022-04',
	'2022-05',
	'2022-06',
	'2022-07',
	'2022-08',
	'2022-09',
	'2022-10',
	'2022-11',
	'2022-12',
	'2023-01',
	'2023-02',
	'2023-03',
	'2023-04',
	'2023-05',
	'2023-06',
	'2023-07',
	'2023-08',
	'2023-09',
	'2023-10',
	'2023-11',
	'2023-12',
	'2024-01',
	'2024-02',
	'2024-03',
	'2024-04',
	'2024-05',
	'2024-06',
	'2024-07',
	'2024-08',
	'2024-09',
	'2024-10',
	'2024-11',
	'2024-12',
	'2025-01',
	'2025-02',
	'2025-03',
	'2025-04',
	'2025-05',
	'2025-06',
	'2025-07',
	'2025-08',
	'2025-09',
	'2025-10'
];
