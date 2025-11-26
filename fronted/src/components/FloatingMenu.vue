<template>
	<div class="floating-menu">
		<!-- 菜单按钮 -->
		<div class="menu-button" @click="toggleMenu" :class="{ active: isMenuOpen }">
			<div class="menu-icon">
				<span></span>
				<span></span>
				<span></span>
			</div>
		</div>

		<!-- 下拉菜单 -->
		<transition name="menu-fade">
			<div v-if="isMenuOpen" class="menu-dropdown">
				<router-link to="/search" class="menu-item" @click="closeMenu">
					<span class="menu-icon-wrapper">
						<svg viewBox="0 0 24 24" class="menu-svg">
							<path
								d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
							/>
						</svg>
					</span>
					<span class="menu-text">项目搜索</span>
				</router-link>

				<router-link to="/dashboard" class="menu-item" @click="closeMenu">
					<span class="menu-icon-wrapper">
						<svg viewBox="0 0 24 24" class="menu-svg">
							<path
								d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
							/>
						</svg>
					</span>
					<span class="menu-text">可视化大屏</span>
				</router-link>

				<router-link to="/analysis" class="menu-item" @click="closeMenu">
					<span class="menu-icon-wrapper">
						<svg viewBox="0 0 24 24" class="menu-svg">
							<path
								d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
							/>
						</svg>
					</span>
					<span class="menu-text">项目分析</span>
				</router-link>
			</div>
		</transition>

		<!-- 遮罩层 -->
		<transition name="mask-fade">
			<div v-if="isMenuOpen" class="menu-mask" @click="closeMenu"></div>
		</transition>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isMenuOpen = ref(false);

const toggleMenu = () => {
	isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
	isMenuOpen.value = false;
};
</script>

<style lang="scss" scoped>
.floating-menu {
	position: fixed;
	top: 20px;
	right: 20px;
	z-index: 9999;
}

// 菜单按钮
.menu-button {
	width: 36px;
	height: 36px;
	background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%);
	backdrop-filter: blur(10px);
	border: 1px solid rgba(56, 189, 248, 0.3);
	border-radius: 10px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

	&:hover {
		border-color: rgba(56, 189, 248, 0.6);
		box-shadow: 0 6px 20px rgba(56, 189, 248, 0.4);
		transform: translateY(-2px);
	}

	&.active {
		border-color: #38bdf8;
		box-shadow: 0 6px 20px rgba(56, 189, 248, 0.6);

		.menu-icon span:nth-child(1) {
			transform: translateY(8px) rotate(45deg);
		}

		.menu-icon span:nth-child(2) {
			opacity: 0;
		}

		.menu-icon span:nth-child(3) {
			transform: translateY(-8px) rotate(-45deg);
		}
	}
}

// 汉堡图标
.menu-icon {
	width: 18px;
	height: 12px;
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: space-between;

	span {
		display: block;
		width: 100%;
		height: 2px;
		background: #38bdf8;
		border-radius: 2px;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
}

// 下拉菜单
.menu-dropdown {
	position: absolute;
	top: 60px;
	right: 0;
	width: 200px;
	background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);
	backdrop-filter: blur(10px);
	border: 1px solid rgba(56, 189, 248, 0.3);
	border-radius: 12px;
	padding: 8px;
	box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.menu-item {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	color: #e2e8f0;
	text-decoration: none;
	border-radius: 8px;
	transition: all 0.2s;
	font-size: 14px;
	font-weight: 500;

	&:hover {
		background: rgba(56, 189, 248, 0.1);
		color: #38bdf8;

		.menu-svg {
			fill: #38bdf8;
		}
	}

	&.router-link-active {
		background: rgba(56, 189, 248, 0.15);
		color: #38bdf8;

		.menu-svg {
			fill: #38bdf8;
		}
	}
}

.menu-icon-wrapper {
	width: 20px;
	height: 20px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.menu-svg {
	width: 20px;
	height: 20px;
	fill: #94a3b8;
	transition: fill 0.2s;
}

.menu-text {
	flex: 1;
}

// 遮罩层
.menu-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.2);
	z-index: -1;
}

// 动画
.menu-fade-enter-active,
.menu-fade-leave-active {
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-fade-enter-from {
	opacity: 0;
	transform: translateY(-10px);
}

.menu-fade-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}

.mask-fade-enter-active,
.mask-fade-leave-active {
	transition: opacity 0.3s;
}

.mask-fade-enter-from,
.mask-fade-leave-to {
	opacity: 0;
}

// 响应式设计
@media (max-width: 768px) {
	.floating-menu {
		top: 16px;
		right: 16px;
	}

	.menu-button {
		width: 32px;
		height: 32px;
	}

	.menu-icon {
		width: 16px;
		height: 10px;
	}

	.menu-dropdown {
		width: 180px;
	}
}
</style>
