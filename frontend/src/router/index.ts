import { createRouter, createWebHashHistory, RouteLocationNormalized } from 'vue-router';
import routes from './routes';

const router = createRouter({
	history: createWebHashHistory(),
	routes
});

const setTitle = (to: RouteLocationNormalized) => {
	// 设置页面标题
	document.title = (to.meta && (to.meta.title as string)) || 'OpenInsight';
};

// 路由拦截
router.beforeEach(to => {
	setTitle(to);

	// 管理员页面认证检查
	if (to.meta.requiresAuth) {
		const token = localStorage.getItem('admin_token');
		if (!token) {
			return '/admin';
		}
	}
});

export default router;
