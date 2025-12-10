<template>
	<div class="task-detail">
		<a-spin :spinning="loading">
			<!-- 任务基本信息 -->
			<a-descriptions :column="2" bordered size="small">
				<a-descriptions-item label="任务ID">{{ task?.id }}</a-descriptions-item>
				<a-descriptions-item label="任务名称">{{ task?.task_name }}</a-descriptions-item>
				<a-descriptions-item label="任务类型">
					{{ task?.task_type === 'full' ? '全量ETL' : '增量ETL' }}
				</a-descriptions-item>
				<a-descriptions-item label="状态">
					<a-tag :color="getStatusColor(task?.status)">
						{{ getStatusText(task?.status) }}
					</a-tag>
				</a-descriptions-item>
				<a-descriptions-item label="时间范围">
					{{ task?.time_start }} ~ {{ task?.time_end }}
				</a-descriptions-item>
				<a-descriptions-item label="进度">
					{{ task?.processed_projects }}/{{ task?.total_projects }}
					({{
						task?.total_projects > 0
							? Math.round((task.processed_projects / task.total_projects) * 100)
							: 0
					}}%)
				</a-descriptions-item>
				<a-descriptions-item label="创建时间" :span="2">
					{{ formatTime(task?.created_at) }}
				</a-descriptions-item>
				<a-descriptions-item label="开始时间">
					{{ formatTime(task?.started_at) }}
				</a-descriptions-item>
				<a-descriptions-item label="结束时间">
					{{ formatTime(task?.finished_at) }}
				</a-descriptions-item>
				<a-descriptions-item v-if="task?.error_message" label="错误信息" :span="2">
					<a-typography-paragraph
						:content="task?.error_message"
						:ellipsis="{ rows: 3, expandable: true }"
						style="margin: 0"
					/>
				</a-descriptions-item>
			</a-descriptions>

			<!-- 实时进度 (运行中任务) -->
			<div v-if="['pending', 'running'].includes(task?.status)" class="progress-section">
				<h3>实时进度</h3>
				<a-progress
					:percent="progressPercent"
					:status="progressStatus"
					:show-info="true"
					stroke-color="#1890ff"
				/>
				<div class="progress-info">
					<span>当前步骤: {{ currentStep || '等待中...' }}</span>
					<span>{{ progressMessage }}</span>
				</div>
			</div>

			<!-- 日志列表 -->
			<div class="logs-section">
				<div class="logs-header">
					<h3>执行日志</h3>
					<a-space>
						<a-select
							v-model:value="logLevelFilter"
							style="width: 120px"
							size="small"
							@change="filterLogs"
						>
							<a-select-option value="">全部</a-select-option>
							<a-select-option value="info">Info</a-select-option>
							<a-select-option value="warning">Warning</a-select-option>
							<a-select-option value="error">Error</a-select-option>
						</a-select>
						<a-button size="small" @click="loadLogs">
							<ReloadOutlined />
							刷新
						</a-button>
					</a-space>
				</div>

				<div class="logs-list" ref="logsContainer">
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

					<a-empty v-if="filteredLogs.length === 0" description="暂无日志" />
				</div>
			</div>
		</a-spin>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { message } from 'ant-design-vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import axios from 'axios';

const props = defineProps<{
	taskId: number;
}>();

const loading = ref(false);
const task = ref<any>(null);
const logs = ref<any[]>([]);
const logLevelFilter = ref('');
const logsContainer = ref<HTMLElement>();

// SSE 相关
let eventSource: EventSource | null = null;
const progressPercent = ref(0);
const progressStatus = ref<any>('active');
const currentStep = ref('');
const progressMessage = ref('');

const filteredLogs = computed(() => {
	if (!logLevelFilter.value) return logs.value;
	return logs.value.filter(log => log.log_level === logLevelFilter.value);
});

const getStatusColor = (status: string) => {
	const colorMap: any = {
		pending: 'blue',
		running: 'processing',
		success: 'success',
		failed: 'error',
		cancelled: 'default'
	};
	return colorMap[status] || 'default';
};

const getStatusText = (status: string) => {
	const textMap: any = {
		pending: '等待中',
		running: '运行中',
		success: '成功',
		failed: '失败',
		cancelled: '已取消'
	};
	return textMap[status] || status;
};

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

const loadTaskDetail = async () => {
	try {
		loading.value = true;
		const response = await axios.get(`/api/etl/tasks/${props.taskId}`);

		if (response.data.code === 200) {
			task.value = response.data.data;
			currentStep.value = task.value.current_step || '';
		}
	} catch (error) {
		message.error('加载任务详情失败');
		console.error('Load task detail error:', error);
	} finally {
		loading.value = false;
	}
};

const loadLogs = async () => {
	try {
		const response = await axios.get(`/api/etl/tasks/${props.taskId}/logs`, {
			params: { limit: 200 }
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
		console.error('Load logs error:', error);
	}
};

const filterLogs = () => {
	// 筛选后滚动到顶部
	if (logsContainer.value) {
		logsContainer.value.scrollTop = 0;
	}
};

// SSE 连接 - 实时进度
const connectSSE = () => {
	if (!['pending', 'running'].includes(task.value?.status)) {
		return;
	}

	try {
		eventSource = new EventSource(`/api/etl/tasks/${props.taskId}/progress`);

		eventSource.onmessage = event => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === 'status') {
					// 初始状态
					if (data.progress) {
						progressPercent.value = data.progress.percentage || 0;
					}
				} else if (data.type === 'progress') {
					// 进度更新
					progressPercent.value = data.percentage || 0;
					progressMessage.value = data.message || '';
					currentStep.value = data.step || '';
				} else if (data.type === 'complete') {
					// 任务完成
					progressPercent.value = 100;
					progressStatus.value = data.success ? 'success' : 'exception';
					message[data.success ? 'success' : 'error'](data.message);

					// 重新加载任务详情和日志
					loadTaskDetail();
					loadLogs();

					// 关闭SSE连接
					if (eventSource) {
						eventSource.close();
						eventSource = null;
					}
				} else if (data.type === 'error') {
					// 错误
					progressStatus.value = 'exception';
					message.error(data.message);

					loadTaskDetail();
					loadLogs();

					if (eventSource) {
						eventSource.close();
						eventSource = null;
					}
				}
			} catch (error) {
				console.error('Parse SSE data error:', error);
			}
		};

		eventSource.onerror = error => {
			console.error('SSE error:', error);
			if (eventSource) {
				eventSource.close();
				eventSource = null;
			}
		};
	} catch (error) {
		console.error('Connect SSE error:', error);
	}
};

onMounted(async () => {
	await loadTaskDetail();
	await loadLogs();

	// 连接SSE实时进度
	connectSSE();

	// 定时刷新日志（运行中任务）
	const logInterval = setInterval(() => {
		if (task.value && ['pending', 'running'].includes(task.value.status)) {
			loadLogs();
		} else {
			clearInterval(logInterval);
		}
	}, 10000);
});

onUnmounted(() => {
	if (eventSource) {
		eventSource.close();
		eventSource = null;
	}
});
</script>

<style scoped lang="scss">
.task-detail {
	.progress-section {
		margin-top: 24px;
		padding: 16px;
		background: #f5f5f5;
		border-radius: 8px;

		h3 {
			margin-bottom: 16px;
			font-size: 16px;
			font-weight: 600;
		}

		.progress-info {
			display: flex;
			justify-content: space-between;
			margin-top: 8px;
			font-size: 14px;
			color: #666;
		}
	}

	.logs-section {
		margin-top: 24px;

		.logs-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 16px;

			h3 {
				margin: 0;
				font-size: 16px;
				font-weight: 600;
			}
		}

		.logs-list {
			max-height: 400px;
			overflow-y: auto;
			border: 1px solid #d9d9d9;
			border-radius: 4px;
			padding: 12px;
			background: #fafafa;

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
				}
			}
		}
	}
}
</style>
