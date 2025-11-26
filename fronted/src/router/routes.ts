import MainLayout from '@/layouts/MainLayout.vue';
import Dashboard from '@/pages/dashboard/index.vue';
import Search from '@/pages/search/index.vue';
import Analysis from '@/pages/analysis/index.vue';

const routes = [
	{
		path: '/',
		redirect: '/dashboard'
	},
	// 可视化大屏 - 独立页面，不使用导航栏
	{
		path: '/dashboard',
		name: 'Dashboard',
		component: Dashboard,
		meta: {
			title: '开源数据发展趋势-可视化大屏'
		}
	},
	// 其他页面使用 MainLayout
	{
		path: '/',
		component: MainLayout,
		children: [
			{
				path: 'search',
				name: 'Search',
				component: Search,
				meta: {
					title: '开源数据发展趋势-项目搜索'
				}
			},
			{
				path: 'analysis',
				name: 'Analysis',
				component: Analysis,
				meta: {
					title: '开源数据发展趋势-项目分析'
				}
			}
		]
	},
	// 兼容旧路由
	{
		path: '/home',
		redirect: '/dashboard'
	}
];

export default routes;
