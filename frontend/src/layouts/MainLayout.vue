<template>
	<div class="main-layout">
		<header class="nav-header">
			<div class="nav-container">
				<!-- 左侧：Logo + 平台名称 -->
				<div class="nav-left">
					<div class="nav-logo">
						<img src="https://qiniu.aihubzone.cn/openinsight_logo.jpg" alt="OpenInsight" class="logo-icon" />
						<h1 class="platform-name">OpenInsight</h1>
					</div>
				</div>

				<!-- 中间：主导航 -->
				<nav class="nav-center">
					<router-link to="/search" class="nav-link" active-class="active">
						项目搜索
					</router-link>
					<span class="nav-divider">|</span>
					<router-link to="/dashboard" class="nav-link" active-class="active">
						可视化大屏
					</router-link>
					<span class="nav-divider">|</span>
					<router-link to="/analysis" class="nav-link" active-class="active">
						项目分析
					</router-link>
				</nav>

				<!-- 右侧：图标 + 时间 -->
				<div class="nav-right">
					<div class="nav-icons">
						<a
							href="https://github.com/jhzhou002/OpenInsight"
							target="_blank"
							class="icon-link"
							title="访问 GitHub 仓库"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
							</svg>
						</a>
						<router-link
							to="/metrics-guide"
							class="icon-link"
							title="查看指标说明"
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
								<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
							</svg>
						</router-link>
					</div>
					<div class="nav-time">{{ currentTime }}</div>
				</div>
			</div>
		</header>
		<main class="main-content">
			<router-view />
		</main>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import dayjs from 'dayjs';

const currentTime = ref('');
let timer: number | null = null;

const updateTime = () => {
	currentTime.value = dayjs().format('YYYY/MM/DD dddd HH:mm:ss');
};

onMounted(() => {
	updateTime();
	timer = window.setInterval(updateTime, 1000);
});

onBeforeUnmount(() => {
	if (timer) {
		clearInterval(timer);
	}
});
</script>

<style lang="scss" scoped>
.main-layout {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100vh;
	overflow: hidden;
}

.nav-header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 1000;
	background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%);
	backdrop-filter: blur(10px);
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
	opacity: 0.95;
}

.nav-container {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	height: 64px;
	padding: 0 32px;
}

// 左侧：Logo
.nav-left {
	flex: 1;
	display: flex;
	align-items: center;
}

.nav-logo {
	display: flex;
	align-items: center;
	gap: 12px;

	.logo-icon {
		width: 32px;
		height: 32px;
		object-fit: contain;
		filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.5));
	}

	.platform-name {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		color: #e2e8f0;
		letter-spacing: 1px;
		background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}
}

// 中间：导航
.nav-center {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
}

.nav-link {
	position: relative;
	padding: 20px 24px;
	color: #e2e8f0;
	font-size: 16px;
	font-weight: 500;
	text-decoration: none;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	letter-spacing: 0.5px;

	&::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 50%;
		width: 0;
		height: 3px;
		background: #38bdf8;
		border-radius: 2px 2px 0 0;
		transform: translateX(-50%);
		transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
	}

	&:hover {
		color: #38bdf8;

		&::after {
			width: 60%;
		}
	}

	&.active {
		color: #38bdf8;
		font-weight: 600;

		&::after {
			width: 100%;
		}
	}
}

.nav-divider {
	color: rgba(226, 232, 240, 0.2);
	font-size: 14px;
	margin: 0 8px;
}

// 右侧：图标 + 时间
.nav-right {
	flex: 1;
	display: flex;
	justify-content: flex-end;
	align-items: center;
	gap: 16px;
}

.nav-icons {
	display: flex;
	gap: 12px;
	align-items: center;
}

.icon-link {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	color: #94a3b8;
	background: rgba(15, 23, 42, 0.6);
	border: 1px solid rgba(56, 189, 248, 0.2);
	border-radius: 6px;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;

	&:hover {
		color: #38bdf8;
		background: rgba(56, 189, 248, 0.1);
		border-color: #38bdf8;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3);
	}

	svg {
		width: 20px;
		height: 20px;
	}
}

.nav-time {
	padding: 8px 16px;
	color: #94a3b8;
	font-size: 14px;
	font-weight: 500;
	font-family: 'Consolas', 'Monaco', monospace;
	background: rgba(15, 23, 42, 0.6);
	border-radius: 6px;
	border: 1px solid rgba(56, 189, 248, 0.2);
	letter-spacing: 0.5px;
}

.main-content {
	margin-top: 64px;
	flex: 1;
	overflow: auto;
}

// 响应式设计
@media (max-width: 1024px) {
	.nav-container {
		padding: 0 20px;
	}

	.nav-link {
		padding: 20px 16px;
		font-size: 15px;
	}

	.platform-name {
		font-size: 18px;
	}
}

@media (max-width: 768px) {
	.nav-header {
		opacity: 1;
	}

	.nav-container {
		flex-direction: column;
		height: auto;
		padding: 12px 16px;
		gap: 12px;
	}

	.nav-left,
	.nav-right,
	.nav-center {
		flex: none;
		width: 100%;
		justify-content: center;
	}

	.nav-logo {
		.logo-icon {
			width: 28px;
			height: 28px;
		}

		.platform-name {
			font-size: 16px;
		}
	}

	.nav-center {
		gap: 0;
	}

	.nav-link {
		padding: 12px 12px;
		font-size: 14px;
	}

	.nav-divider {
		margin: 0 4px;
	}

	.nav-icons {
		gap: 8px;
	}

	.icon-link {
		width: 32px;
		height: 32px;

		svg {
			width: 18px;
			height: 18px;
		}
	}

	.nav-time {
		font-size: 12px;
		padding: 6px 12px;
	}

	.main-content {
		margin-top: 150px;
	}
}
</style>
