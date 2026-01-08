<template>
	<div class="admin-dashboard">
		<a-layout class="admin-layout">
			<!-- 侧边栏 -->
			<a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible class="admin-sider">
				<div class="logo">
					<img src="/logo.png" alt="logo" class="logo-img" />
					<h2 v-if="!collapsed">OpenInsight</h2>
				</div>

				<a-menu
					v-model:selectedKeys="selectedKeys"
					theme="dark"
					mode="inline"
					@select="handleMenuSelect"
				>
					<a-menu-item key="tasks">
						<UnorderedListOutlined />
						<span>任务管理</span>
					</a-menu-item>
					<a-menu-item key="config">
						<SettingOutlined />
						<span>配置管理</span>
					</a-menu-item>
					<a-menu-item key="schedules">
						<ClockCircleOutlined />
						<span>定时任务</span>
					</a-menu-item>
					<a-menu-item key="logs">
						<FileTextOutlined />
						<span>日志查看</span>
					</a-menu-item>
					<a-menu-item key="llm">
						<RobotOutlined />
						<span>LLM配置</span>
					</a-menu-item>
				</a-menu>
			</a-layout-sider>

			<!-- 主内容区 -->
			<a-layout>
				<!-- 顶部导航 -->
				<a-layout-header class="admin-header">
					<MenuUnfoldOutlined
						v-if="collapsed"
						class="trigger"
						@click="() => (collapsed = !collapsed)"
					/>
					<MenuFoldOutlined v-else class="trigger" @click="() => (collapsed = !collapsed)" />

					<div class="header-right">
						<span class="username">{{ username }}</span>
						<a-button type="text" @click="handleLogout">
							<LogoutOutlined />
							退出
						</a-button>
					</div>
				</a-layout-header>

				<!-- 内容区 -->
				<!-- 内容区 -->
				<a-layout-content class="admin-content">
					<div class="content-wrapper">
						<!-- 任务管理 -->
						<TaskManager v-if="currentView === 'tasks'" />

						<!-- 配置管理 -->
						<ConfigManager v-if="currentView === 'config'" />

						<!-- 定时任务 -->
						<ScheduleManager v-if="currentView === 'schedules'" />

						<!-- 日志查看 -->
						<LogViewer v-if="currentView === 'logs'" />

						<!-- LLM配置 -->
						<LLMConfigManager v-if="currentView === 'llm'" />
					</div>
				</a-layout-content>
			</a-layout>
		</a-layout>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
	MenuUnfoldOutlined,
	MenuFoldOutlined,
	UnorderedListOutlined,
	SettingOutlined,
	ClockCircleOutlined,
	FileTextOutlined,
	LogoutOutlined,
	RobotOutlined
} from '@ant-design/icons-vue';

import TaskManager from './components/TaskManager.vue';
import ConfigManager from './components/ConfigManager.vue';
import ScheduleManager from './components/ScheduleManager.vue';
import LogViewer from './components/LogViewer.vue';
import LLMConfigManager from './components/LLMConfigManager.vue';

const router = useRouter();
const collapsed = ref(false);
const selectedKeys = ref(['tasks']);
const currentView = ref('tasks');
const username = ref('');

onMounted(() => {
	// 检查登录状态
	const token = localStorage.getItem('admin_token');
	if (!token) {
		message.warning('请先登录');
		router.push('/admin');
		return;
	}

	username.value = localStorage.getItem('admin_username') || 'Admin';
});

const handleMenuSelect = ({ key }: { key: string | number }) => {
	currentView.value = String(key);
};

const handleLogout = () => {
	localStorage.removeItem('admin_token');
	localStorage.removeItem('admin_username');
	message.success('已退出登录');
	router.push('/admin');
};
</script>

<style scoped lang="scss">
.admin-dashboard {
	height: 100vh;
	background: #f0f2f5;
    overflow: hidden;

	.admin-layout {
		height: 100vh;
        overflow: hidden;
	}

	.admin-sider {
		background: #001529;
        overflow-y: auto;

		.logo {
			height: 64px;
			display: flex;
			align-items: center;
			padding-left: 24px;
			background: #002140;
			overflow: hidden;
			transition: all 0.3s;

			.logo-img {
				width: 32px;
				height: 32px;
				margin-right: 12px;
				transition: all 0.3s;
			}

			h2 {
				color: white;
				margin: 0;
				font-size: 18px;
				font-weight: 600;
				white-space: nowrap;
				opacity: 1;
				transition: all 0.3s;
			}
		}

		&.ant-layout-sider-collapsed .logo {
			padding-left: 24px;
			justify-content: flex-start;

			h2 {
				opacity: 0;
				width: 0;
			}

            .logo-img {
                margin-right: 0;
            }
		}
	}

	.admin-header {
		background: white;
		padding: 0 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

		.trigger {
			font-size: 18px;
			cursor: pointer;
			transition: color 0.3s;

			&:hover {
				color: #1890ff;
			}
		}

		.header-right {
			display: flex;
			align-items: center;
			gap: 16px;

			.username {
				color: #333;
				font-weight: 500;
			}
		}
	}

	.admin-content {
		padding: 24px;
        margin: 0;
		background: transparent;
        overflow-y: auto;
		height: calc(100vh - 64px);

		.content-wrapper {
			max-width: 1400px;
			margin: 0 auto;
            background: white;
            padding: 24px;
            border-radius: 8px;
            min-height: 100%;
		}
	}
}

@media (max-width: 768px) {
	.admin-dashboard {
		.admin-content {
			margin: 12px;
			padding: 16px;
		}
	}
}
</style>
