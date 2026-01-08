<template>
	<div class="admin-login-page">
		<div class="login-container">
			<div class="login-box">
				<div class="login-header">
					<div class="logo-icon">
						<img src="/logo.png" alt="logo" />
					</div>
					<h1>OpenInsight</h1>
					<p>智能ETL数据管理平台</p>
				</div>

				<a-form :model="loginForm" @finish="handleLogin" class="login-form">
					<a-form-item name="username" :rules="[{ required: true, message: '请输入用户名' }]">
						<a-input
							v-model:value="loginForm.username"
							size="large"
							placeholder="用户名"
							:prefix="h(UserOutlined)"
						>
						</a-input>
					</a-form-item>

					<a-form-item name="password" :rules="[{ required: true, message: '请输入密码' }]">
						<a-input-password
							v-model:value="loginForm.password"
							size="large"
							placeholder="密码"
							:prefix="h(LockOutlined)"
						>
						</a-input-password>
					</a-form-item>

					<a-form-item>
						<a-button type="primary" html-type="submit" size="large" block :loading="loading">
							登录
						</a-button>
					</a-form-item>
				</a-form>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, h, computed } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { UserOutlined, LockOutlined, RocketOutlined } from '@ant-design/icons-vue';

import service from '@/service/service';

const router = useRouter();
const loading = ref(false);
const hasLogo = ref(true);

const loginForm = ref({
	username: '',
	password: ''
});

const handleLogin = async () => {
	try {
		loading.value = true;

		// 调用后端登录接口
		const res: any = await service.post('/common/login', {
			user_name: loginForm.value.username,
			pass_word: loginForm.value.password
		});

		if (res.code === 200) {
			// 保存登录状态
			localStorage.setItem('admin_token', res.data.token);
			localStorage.setItem('admin_username', loginForm.value.username);

			message.success('登录成功');

			// 跳转到ETL管理主页
			setTimeout(() => {
				router.push('/admin/dashboard');
			}, 500);
		} else {
			message.error(res.msg || '登录失败');
		}
	} catch (error: any) {
		// 拦截器已经处理了大部分错误提示，这里只需要捕获防止崩溃
		// message.error('登录失败');
		console.error('Login error:', error);
	} finally {
		loading.value = false;
	}
};
</script>

<style scoped lang="scss">
.admin-login-page {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	/* 替换紫色渐变为深蓝/科技蓝渐变 */
	background: linear-gradient(135deg, #001529 0%, #003a8c 100%);
	padding: 20px;
	position: relative;
	overflow: hidden;

	/* 添加背景纹理效果 */
	&::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image: radial-gradient(#ffffff 1px, transparent 1px);
		background-size: 30px 30px;
		opacity: 0.05;
		pointer-events: none;
	}

	.login-container {
		width: 100%;
		max-width: 420px;
		position: relative;
		z-index: 1;
	}

	.login-box {
		background: rgba(255, 255, 255, 0.98);
		border-radius: 16px;
		padding: 48px 40px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
		border: 1px solid rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(10px);

		.login-header {
			text-align: center;
			margin-bottom: 48px;

			.logo-icon {
				font-size: 64px;
				color: #1890ff;
				margin-bottom: 16px;
				display: flex;
				justify-content: center;
				align-items: center;
				
				img {
					height: 64px;
					width: auto;
				}
			}

			h1 {
				font-size: 28px;
				font-weight: 700;
				color: #1a202c;
				margin-bottom: 8px;
				letter-spacing: 0.5px;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			}

			p {
				font-size: 15px;
				color: #64748b;
				margin: 0;
				font-weight: 400;
			}
		}

		.login-form {
			:deep(.ant-input-affix-wrapper) {
				padding: 12px 15px;
				border-radius: 8px;
				border: 1px solid #e2e8f0;
				transition: all 0.3s;

				&:hover, &:focus {
					border-color: #1890ff;
					box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
				}
				
				&.ant-input-affix-wrapper-focused {
					border-color: #1890ff;
					box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
				}
			}

			:deep(.ant-input) {
				font-size: 15px;
			}

			:deep(.ant-btn-primary) {
				height: 50px;
				font-size: 16px;
				font-weight: 600;
				border-radius: 8px;
				background: linear-gradient(90deg, #1890ff 0%, #096dd9 100%);
				border: none;
				box-shadow: 0 4px 15px rgba(24, 144, 255, 0.3);
				transition: all 0.3s;

				&:hover {
					transform: translateY(-1px);
					box-shadow: 0 6px 20px rgba(24, 144, 255, 0.4);
					background: linear-gradient(90deg, #40a9ff 0%, #096dd9 100%);
				}

				&:active {
					transform: translateY(1px);
				}
			}
			
			:deep(.ant-form-item) {
				margin-bottom: 24px;
			}
		}
	}
}

@media (max-width: 576px) {
	.admin-login-page {
		.login-box {
			padding: 30px 24px;

			.login-header {
				margin-bottom: 32px;
				
				.logo-icon {
					font-size: 40px;
					margin-bottom: 12px;
				}
				
				h1 {
					font-size: 24px;
				}
			}
		}
	}
}
</style>
