import HomeRouter from './home';

const routes = [
	{
		path: '/',
		redirect: '/home'
	},
	...HomeRouter
];

export default routes;
