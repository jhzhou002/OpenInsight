<template>
	<div class="task-manager">
		<div class="page-header">
			<h2>任务管理</h2>
			<a-space>
				<a-button @click="loadTasks">
					<ReloadOutlined />
					刷新
				</a-button>
				<a-button type="primary" @click="showCreateModal = true">
					<PlusOutlined />
					创建任务
				</a-button>
			</a-space>
		</div>

		<!-- 筛选器 -->
		<a-card :bordered="false" class="filter-card">
			<a-space>
				<a-select
					v-model:value="filterStatus"
					placeholder="任务状态"
					style="width: 150px"
					@change="loadTasks"
				>
					<a-select-option value="">全部</a-select-option>
					<a-select-option value="pending">等待中</a-select-option>
					<a-select-option value="running">运行中</a-select-option>
					<a-select-option value="success">成功</a-select-option>
					<a-select-option value="failed">失败</a-select-option>
					<a-select-option value="cancelled">已取消</a-select-option>
				</a-select>
			</a-space>
		</a-card>

		<!-- 任务列表 -->
		<a-table
			:columns="columns"
			:data-source="tasks"
			:loading="loading"
			:pagination="pagination"
			@change="handleTableChange"
			row-key="id"
		>
			<template #bodyCell="{ column, record }">
				<template v-if="column.key === 'status'">
					<a-tag :color="getStatusColor(record.status)">
						{{ getStatusText(record.status) }}
					</a-tag>
				</template>

				<template v-if="column.key === 'progress'">
					<div class="progress-cell">
						<a-progress
							:percent="
								record.total_projects > 0
									? Math.round((record.processed_projects / record.total_projects) * 100)
									: 0
							"
							:status="record.status === 'failed' ? 'exception' : 'normal'"
							size="small"
						/>
						<span class="progress-text"
							>{{ record.processed_projects }}/{{ record.total_projects }}</span
						>
					</div>
				</template>

				<template v-if="column.key === 'created_at'">
					{{ formatTime(record.created_at) }}
				</template>

				<template v-if="column.key === 'action'">
					<a-space>
						<a-button type="link" size="small" @click="viewTaskDetail(record)">详情</a-button>
						<a-button
							v-if="['pending', 'running'].includes(record.status)"
							type="link"
							size="small"
							danger
							@click="cancelTask(record.id)"
						>
							取消
						</a-button>
					</a-space>
				</template>
			</template>
		</a-table>

		<!-- 创建任务弹窗 -->
		<a-modal
			v-model:open="showCreateModal"
			title="创建ETL任务"
			@ok="handleCreateTask"
			:confirm-loading="creating"
		>
			<a-form :model="newTask" layout="vertical">
				<a-form-item label="任务名称" required>
					<a-input v-model:value="newTask.task_name" placeholder="例如: 2025年1月数据更新" />
				</a-form-item>

				<a-form-item label="任务类型">
					<a-select v-model:value="newTask.task_type" style="width: 100%">
						<a-select-option value="full">全量ETL</a-select-option>
						<a-select-option value="incremental" disabled>
							增量ETL（开发中）
						</a-select-option>
					</a-select>
				</a-form-item>

				<a-form-item label="时间范围" required>
					<a-space direction="vertical" style="width: 100%">
						<a-input
							v-model:value="newTask.time_start"
							placeholder="开始时间，例如: 2021-01"
						/>
						<a-input v-model:value="newTask.time_end" placeholder="结束时间，例如: 2025-10" />
					</a-space>
				</a-form-item>
			</a-form>
		</a-modal>

		<!-- 任务详情弹窗 -->
		<a-modal
			v-model:open="showDetailModal"
			title="任务详情"
			:footer="null"
			width="800px"
			:body-style="{ maxHeight: '70vh', overflowY: 'auto' }"
		>
			<TaskDetail v-if="selectedTask" :task-id="selectedTask.id" />
		</a-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import axios from 'axios';
import TaskDetail from './TaskDetail.vue';

const loading = ref(false);
const creating = ref(false);
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const filterStatus = ref('');
const tasks = ref([]);
const selectedTask = ref<any>(null);

const pagination = reactive({
	current: 1,
	pageSize: 10,
	total: 0
});

const newTask = reactive({
	task_name: '',
	task_type: 'full',
	time_start: '2021-01',
	time_end: '2025-10'
});

const columns = [
	{ title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
	{ title: '任务名称', dataIndex: 'task_name', key: 'task_name', ellipsis: true },
	{ title: '状态', key: 'status', width: 100 },
	{ title: '进度', key: 'progress', width: 200 },
	{ title: '当前步骤', dataIndex: 'current_step', key: 'current_step', ellipsis: true },
	{ title: '创建时间', key: 'created_at', width: 180 },
	{ title: '操作', key: 'action', width: 150 }
];

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

const formatTime = (time: string) => {
	if (!time) return '-';
	return new Date(time).toLocaleString('zh-CN');
};

const loadTasks = async () => {
	try {
		loading.value = true;
		const params: any = {
			page: pagination.current,
			limit: pagination.pageSize
		};

		if (filterStatus.value) {
			params.status = filterStatus.value;
		}

		const response = await axios.get('/api/etl/tasks', { params });

		if (response.data.code === 200) {
			tasks.value = response.data.data.tasks;
			pagination.total = response.data.data.pagination.total;
		}
	} catch (error) {
		message.error('加载任务列表失败');
		console.error('Load tasks error:', error);
	} finally {
		loading.value = false;
	}
};

const handleTableChange = (pag: any) => {
	pagination.current = pag.current;
	pagination.pageSize = pag.pageSize;
	loadTasks();
};

const handleCreateTask = async () => {
	if (!newTask.task_name || !newTask.time_start || !newTask.time_end) {
		message.warning('请填写完整信息');
		return;
	}

	try {
		creating.value = true;
		const response = await axios.post('/api/etl/tasks', newTask);

		if (response.data.code === 200) {
			message.success('任务创建成功，开始执行');
			showCreateModal.value = false;

			// 重置表单
			newTask.task_name = '';
			newTask.task_type = 'full';
			newTask.time_start = '2021-01';
			newTask.time_end = '2025-10';

			// 刷新列表
			loadTasks();
		} else {
			message.error(response.data.msg || '创建失败');
		}
	} catch (error: any) {
		message.error(error.response?.data?.msg || '创建任务失败');
		console.error('Create task error:', error);
	} finally {
		creating.value = false;
	}
};

const cancelTask = async (taskId: number) => {
	try {
		const response = await axios.delete(`/api/etl/tasks/${taskId}`);

		if (response.data.code === 200) {
			message.success('任务已取消');
			loadTasks();
		} else {
			message.error(response.data.msg || '取消失败');
		}
	} catch (error) {
		message.error('取消任务失败');
		console.error('Cancel task error:', error);
	}
};

const viewTaskDetail = (task: any) => {
	selectedTask.value = task;
	showDetailModal.value = true;
};

onMounted(() => {
	loadTasks();

	// 自动刷新运行中的任务
	setInterval(() => {
		const hasRunning = tasks.value.some((t: any) => ['pending', 'running'].includes(t.status));
		if (hasRunning) {
			loadTasks();
		}
	}, 5000);
});
</script>

<style scoped lang="scss">
.task-manager {
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

	.progress-cell {
		.progress-text {
			font-size: 12px;
			color: #666;
			margin-top: 4px;
			display: block;
		}
	}
}

@media (max-width: 768px) {
	.task-manager {
		.page-header {
			flex-direction: column;
			gap: 12px;
			align-items: flex-start;
		}
	}
}
</style>
