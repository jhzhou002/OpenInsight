import MainLayout from '@/layouts/MainLayout.vue';
import Dashboard from '@/pages/dashboard/index.vue';
import Search from '@/pages/search/index.vue';
import Analysis from '@/pages/analysis/index.vue';
import MetricsGuide from '@/pages/metrics-guide/index.vue';
import AdminLogin from '@/pages/admin/Login.vue';
import AdminDashboard from '@/pages/admin/Dashboard.vue';

const routes = [
	{
		path: '/',
		redirect: '/search'
	},
	// 洞察大屏 - 独立页面，不使用导航栏
	{
		path: '/dashboard',
		name: 'Dashboard',
		component: Dashboard,
		meta: {
			title: 'OpenInsight - 洞察大屏'
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
					title: 'OpenInsight - 项目搜索'
				}
			},
			{
				path: 'analysis',
				name: 'Analysis',
				component: Analysis,
				meta: {
					title: 'OpenInsight - 项目分析'
				}
			},
			{
				path: 'metrics-guide',
				name: 'MetricsGuide',
				component: MetricsGuide,
				meta: {
					title: 'OpenInsight - 指标说明'
				}
			}
		]
	},
	// 兼容旧路由
	{
		path: '/home',
		redirect: '/search'
	},
	// 管理员页面
	{
		path: '/admin',
		name: 'AdminLogin',
		component: AdminLogin,
		meta: {
			title: 'OpenInsight - 管理员登录'
		}
	},
	{
		path: '/admin/dashboard',
		name: 'AdminDashboard',
		component: AdminDashboard,
		meta: {
			title: 'OpenInsight - ETL管理',
			requiresAuth: true
		}
	}
];

export default routes;
