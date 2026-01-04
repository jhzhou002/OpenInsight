<template>
	<div class="log-viewer">
		<div class="page-header">
			<h2>日志查看</h2>
			<a-button @click="loadLogs">
				<ReloadOutlined />
				刷新
			</a-button>
		</div>

		<!-- 筛选器 -->
		<a-card :bordered="false" class="filter-card">
			<a-space>
				<a-select
					v-model:value="selectedTaskId"
					placeholder="选择任务"
					style="width: 250px"
					show-search
					:filter-option="filterTaskOption"
					@change="handleTaskChange"
				>
					<a-select-option v-for="task in tasks" :key="task.id" :value="task.id">
						#{{ task.id }} - {{ task.task_name }}
					</a-select-option>
				</a-select>

				<a-select
					v-model:value="logLevelFilter"
					placeholder="日志级别"
					style="width: 120px"
					@change="loadLogs"
				>
					<a-select-option value="">全部</a-select-option>
					<a-select-option value="info">Info</a-select-option>
					<a-select-option value="warning">Warning</a-select-option>
					<a-select-option value="error">Error</a-select-option>
				</a-select>

				<a-input
					v-model:value="searchKeyword"
					placeholder="搜索日志内容"
					style="width: 200px"
					@change="filterLogs"
				>
					<template #prefix>
						<SearchOutlined />
					</template>
				</a-input>

				<a-button type="primary" @click="exportLogs" :disabled="!selectedTaskId">
					<DownloadOutlined />
					导出日志
				</a-button>
			</a-space>
		</a-card>

		<!-- 日志列表 -->
		<a-card :bordered="false" class="logs-card">
			<a-spin :spinning="loading">
				<div class="logs-container" ref="logsContainer">
					<div
						v-for="log in filteredLogs"
						:key="log.id"
						:class="['log-item', `log-${log.log_level}`]"
					>
						<div class="log-header">
							<a-tag :color="getLogLevelColor(log.log_level)" size="small">
								{{ log.log_level?.toUpperCase() }}
							</a-tag>
							<span class="log-step">{{ log.log_step }}</span>
							<span class="log-time">{{ formatTime(log.created_at) }}</span>
						</div>
						<div class="log-message">{{ log.log_message }}</div>
						<div v-if="log.log_data" class="log-data">
							<a-typography-paragraph
								:content="formatJSON(log.log_data)"
								:copyable="true"
								style="margin: 0"
							/>
						</div>
					</div>

					<a-empty v-if="filteredLogs.length === 0 && !loading" description="暂无日志数据" />
				</div>
			</a-spin>
		</a-card>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { ReloadOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons-vue';
import axios from 'axios';

const loading = ref(false);
const tasks = ref<any[]>([]);
const logs = ref<any[]>([]);
const selectedTaskId = ref<number | undefined>(undefined);
const logLevelFilter = ref('');
const searchKeyword = ref('');
const logsContainer = ref<HTMLElement>();

const filteredLogs = computed(() => {
	let result = logs.value;

	// 按级别筛选
	if (logLevelFilter.value) {
		result = result.filter(log => log.log_level === logLevelFilter.value);
	}

	// 按关键词搜索
	if (searchKeyword.value) {
		const keyword = searchKeyword.value.toLowerCase();
		result = result.filter(
			log =>
				log.log_message?.toLowerCase().includes(keyword) ||
				log.log_step?.toLowerCase().includes(keyword)
		);
	}

	return result;
});

const getLogLevelColor = (level: string) => {
	const colorMap: any = {
		info: 'blue',
		warning: 'orange',
		error: 'red'
	};
	return colorMap[level] || 'default';
};

const formatTime = (time: string) => {
	if (!time) return '-';
	return new Date(time).toLocaleString('zh-CN');
};

const formatJSON = (data: any) => {
	try {
		if (typeof data === 'string') {
			data = JSON.parse(data);
		}
		return JSON.stringify(data, null, 2);
	} catch {
		return String(data);
	}
};

const loadTasks = async () => {
	try {
		const response = await axios.get('/api/etl/tasks', {
			params: { page: 1, limit: 100 }
		});

		if (response.data.code === 200) {
			tasks.value = response.data.data.tasks;
		}
	} catch (error) {
		console.error('Load tasks error:', error);
	}
};

const loadLogs = async () => {
	if (!selectedTaskId.value) {
		logs.value = [];
		return;
	}

	try {
		loading.value = true;
		const response = await axios.get(`/api/etl/tasks/${selectedTaskId.value}/logs`, {
			params: { limit: 500 }
		});

		if (response.data.code === 200) {
			logs.value = response.data.data;

			// 滚动到底部
			setTimeout(() => {
				if (logsContainer.value) {
					logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
				}
			}, 100);
		}
	} catch (error) {
		message.error('加载日志失败');
		console.error('Load logs error:', error);
	} finally {
		loading.value = false;
	}
};

const handleTaskChange = () => {
	loadLogs();
};

const filterLogs = () => {
	// 筛选后滚动到顶部
	if (logsContainer.value) {
		logsContainer.value.scrollTop = 0;
	}
};

const filterTaskOption = (input: string, option: any) => {
	const task = tasks.value.find(t => t.id === option.value);
	if (!task) return false;
	const searchText = `${task.id} ${task.task_name}`.toLowerCase();
	return searchText.includes(input.toLowerCase());
};

const exportLogs = () => {
	if (!selectedTaskId.value || filteredLogs.value.length === 0) {
		message.warning('没有可导出的日志');
		return;
	}

	try {
		// 生成CSV格式
		const headers = ['时间', '级别', '步骤', '消息', '数据'];
		const rows = filteredLogs.value.map(log => [
			formatTime(log.created_at),
			log.log_level,
			log.log_step || '',
			log.log_message || '',
			log.log_data ? JSON.stringify(log.log_data) : ''
		]);

		let csvContent = headers.join(',') + '\n';
		rows.forEach(row => {
			csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
		});

		// 下载文件
		const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', `task_${selectedTaskId.value}_logs_${Date.now()}.csv`);
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		message.success('日志导出成功');
	} catch (error) {
		message.error('导出日志失败');
		console.error('Export logs error:', error);
	}
};

onMounted(() => {
	loadTasks();
});
</script>

<style scoped lang="scss">
.log-viewer {
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;

		h2 {
			margin: 0;
			font-size: 24px;
			font-weight: 600;
		}
	}

	.filter-card {
		margin-bottom: 16px;
	}

	.logs-card {
		.logs-container {
			max-height: calc(100vh - 350px);
			overflow-y: auto;
			padding: 12px;
			background: #fafafa;
			border-radius: 4px;

			.log-item {
				margin-bottom: 12px;
				padding: 12px;
				background: white;
				border-radius: 4px;
				border-left: 3px solid #1890ff;

				&.log-warning {
					border-left-color: #faad14;
				}

				&.log-error {
					border-left-color: #ff4d4f;
				}

				.log-header {
					display: flex;
					align-items: center;
					gap: 8px;
					margin-bottom: 8px;

					.log-step {
						font-weight: 600;
						color: #333;
					}

					.log-time {
						margin-left: auto;
						font-size: 12px;
						color: #999;
					}
				}

				.log-message {
					color: #666;
					line-height: 1.6;
				}

				.log-data {
					margin-top: 8px;
					padding: 8px;
					background: #f5f5f5;
					border-radius: 4px;
					font-family: monospace;
					font-size: 12px;
					max-height: 200px;
					overflow-y: auto;
				}
			}
		}
	}
}

@media (max-width: 768px) {
	.log-viewer {
		.page-header {
			flex-direction: column;
			gap: 12px;
			align-items: flex-start;

			h2 {
				font-size: 20px;
			}
		}

		.filter-card {
			:deep(.ant-space) {
				flex-direction: column;
				width: 100%;

				.ant-space-item {
					width: 100%;

					.ant-select,
					.ant-input {
						width: 100% !important;
					}
				}
			}
		}
	}
}
</style>
