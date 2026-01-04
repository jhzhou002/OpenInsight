<template>
	<div class="admin-login-page">
		<div class="login-container">
			<div class="login-box">
				<div class="login-header">
					<h1>ETL管理系统</h1>
					<p>OpenDigger Top300 数据管理</p>
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
import { ref, h } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue';

const router = useRouter();
const loading = ref(false);

const loginForm = ref({
	username: '',
	password: ''
});

const handleLogin = async () => {
	try {
		loading.value = true;

		// 简单的本地验证（后续可接入真实的认证API）
		if (loginForm.value.username === 'admin' && loginForm.value.password === 'admin123') {
			// 保存登录状态
			localStorage.setItem('admin_token', 'admin_logged_in');
			localStorage.setItem('admin_username', loginForm.value.username);

			message.success('登录成功');

			// 跳转到ETL管理主页
			setTimeout(() => {
				router.push('/admin/dashboard');
			}, 500);
		} else {
			message.error('用户名或密码错误');
		}
	} catch (error) {
		message.error('登录失败');
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
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 20px;

	.login-container {
		width: 100%;
		max-width: 400px;
	}

	.login-box {
		background: white;
		border-radius: 12px;
		padding: 40px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);

		.login-header {
			text-align: center;
			margin-bottom: 40px;

			h1 {
				font-size: 28px;
				font-weight: 600;
				color: #1a202c;
				margin-bottom: 8px;
			}

			p {
				font-size: 14px;
				color: #718096;
				margin: 0;
			}
		}

		.login-form {
			:deep(.ant-input-affix-wrapper) {
				padding: 12px 15px;
			}

			:deep(.ant-btn-lg) {
				height: 48px;
				font-size: 16px;
				font-weight: 500;
			}
		}
	}
}

@media (max-width: 576px) {
	.admin-login-page {
		.login-box {
			padding: 30px 20px;

			.login-header h1 {
				font-size: 24px;
			}
		}
	}
}
</style>
