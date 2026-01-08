<template>
	<div class="schedule-manager">
		<div class="page-header">
			<h2>定时任务</h2>
			<a-space>
				<a-button @click="loadSchedules">
					<ReloadOutlined />
					刷新
				</a-button>
				<a-button type="primary" @click="handleCreateClick">
					<PlusOutlined />
					创建定时任务
				</a-button>
			</a-space>
		</div>

		<!-- 定时任务列表 -->
		<a-table
			:columns="columns"
			:data-source="schedules"
			:loading="loading"
			:pagination="false"
			row-key="id"
		>
			<template #bodyCell="{ column, record }">
				<template v-if="column.key === 'is_enabled'">
					<a-switch
						:checked="record.is_enabled === 1"
						@change="checked => toggleSchedule(record.id, checked)"
					/>
				</template>

				<template v-if="column.key === 'next_run'">
					<span v-if="record.is_enabled === 1">{{ getNextRunTime(record.cron_expression) }}</span>
					<span v-else style="color: #999">已禁用</span>
				</template>

				<template v-if="column.key === 'action'">
					<a-space>
						<a-button type="link" size="small" @click="editSchedule(record)">编辑</a-button>
						<a-button type="link" size="small" @click="triggerSchedule(record.id)">
							立即执行
						</a-button>
						<a-popconfirm
							title="确定要删除这个定时任务吗？"
							ok-text="确定"
							cancel-text="取消"
							@confirm="deleteSchedule(record.id)"
						>
							<a-button type="link" size="small" danger>删除</a-button>
						</a-popconfirm>
					</a-space>
				</template>
			</template>
		</a-table>

		<!-- 创建/编辑定时任务弹窗 -->
		<a-modal
			v-model:visible="showCreateModal"
			:title="isEditing ? '编辑定时任务' : '创建定时任务'"
			@ok="handleSaveSchedule"
			:confirm-loading="saving"
			width="600px"
		>
			<a-form :model="scheduleForm" layout="vertical">
				<a-form-item label="任务名称" required>
					<a-input v-model:value="scheduleForm.schedule_name" placeholder="例如: 每月数据更新" />
				</a-form-item>

				<a-form-item label="Cron表达式" required>
					<a-input
						v-model:value="scheduleForm.cron_expression"
						placeholder="例如: 0 2 1 * * (每月1号凌晨2点)"
					/>
					<div class="form-hint">
						格式: 秒 分 时 日 月 星期<br />
						示例:<br />
						- 每月1号凌晨2点: 0 2 1 * *<br />
						- 每天凌晨3点: 0 3 * * *<br />
						- 每周日凌晨1点: 0 1 * * 0
					</div>
				</a-form-item>

				<a-form-item label="快捷选择">
					<a-select
						v-model:value="quickCron"
						placeholder="选择常用时间"
						style="width: 100%"
						@change="handleQuickCronSelect"
					>
						<a-select-option value="">自定义</a-select-option>
						<a-select-option value="0 2 1 * *">每月1号凌晨2点</a-select-option>
						<a-select-option value="0 3 * * *">每天凌晨3点</a-select-option>
						<a-select-option value="0 1 * * 0">每周日凌晨1点</a-select-option>
						<a-select-option value="0 0 * * *">每天凌晨0点</a-select-option>
						<a-select-option value="0 */6 * * *">每6小时</a-select-option>
					</a-select>
				</a-form-item>

				<a-form-item label="任务配置">
					<a-space direction="vertical" style="width: 100%">
						<a-input
							v-model:value="scheduleForm.task_config.time_start"
							placeholder="开始时间，例如: 2021-01"
						>
							<template #addonBefore>开始时间</template>
						</a-input>
						<a-input
							v-model:value="scheduleForm.task_config.time_end"
							placeholder="结束时间，例如: 2025-10"
						>
							<template #addonBefore>结束时间</template>
						</a-input>
					</a-space>
				</a-form-item>

				<a-form-item label="启用">
					<a-switch v-model:checked="scheduleForm.is_enabled" />
				</a-form-item>
			</a-form>
		</a-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import axios from 'axios';
import parser from 'cron-parser';

const loading = ref(false);
const saving = ref(false);
const showCreateModal = ref(false);
const isEditing = ref(false);
const schedules = ref([]);
const quickCron = ref('');

const scheduleForm = reactive({
	id: undefined as number | undefined,
	schedule_name: '',
	cron_expression: '0 2 1 * *',
	task_config: {
		time_start: '2021-01',
		time_end: '2025-10'
	},
	is_enabled: true
});

const columns = [
	{ title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
	{ title: '任务名称', dataIndex: 'schedule_name', key: 'schedule_name' },
	{ title: 'Cron表达式', dataIndex: 'cron_expression', key: 'cron_expression', width: 180 },
	{ title: '下次执行', key: 'next_run', width: 180 },
	{ title: '启用状态', key: 'is_enabled', width: 100 },
	{ title: '操作', key: 'action', width: 240 }
];

const loadSchedules = async () => {
	try {
		loading.value = true;
		const response = await axios.get('/api/etl/schedules');

		if (response.data.code === 200) {
			schedules.value = response.data.data;
		}
	} catch (error) {
		message.error('加载定时任务失败');
		console.error('Load schedules error:', error);
	} finally {
		loading.value = false;
	}
};

const handleSaveSchedule = async () => {
	if (!scheduleForm.schedule_name || !scheduleForm.cron_expression) {
		message.warning('请填写完整信息');
		return;
	}

	// 验证Cron表达式
	try {
		parser.parseExpression(scheduleForm.cron_expression);
	} catch (error) {
		message.error('Cron表达式格式错误');
		return;
	}

	try {
		saving.value = true;

		const data = {
			schedule_name: scheduleForm.schedule_name,
			cron_expression: scheduleForm.cron_expression,
			task_config: scheduleForm.task_config,
			is_enabled: scheduleForm.is_enabled ? 1 : 0
		};

		let response;
		if (isEditing.value && scheduleForm.id) {
			// 更新
			response = await axios.put(`/api/etl/schedules/${scheduleForm.id}`, data);
		} else {
			// 创建
			response = await axios.post('/api/etl/schedules', data);
		}

		if (response.data.code === 200) {
			message.success(isEditing.value ? '定时任务更新成功' : '定时任务创建成功');
			showCreateModal.value = false;
			resetForm();
			loadSchedules();
		} else {
			message.error(response.data.msg || '操作失败');
		}
	} catch (error: any) {
		message.error(error.response?.data?.msg || '操作失败');
		console.error('Save schedule error:', error);
	} finally {
		saving.value = false;
	}
};

const editSchedule = (record: any) => {
	isEditing.value = true;
	scheduleForm.id = record.id;
	scheduleForm.schedule_name = record.schedule_name;
	scheduleForm.cron_expression = record.cron_expression;

	// 解析task_config
	const defaultConfig = { time_start: '2021-01', time_end: '2025-10' };
	try {
		if (record.task_config) {
			const config =
				typeof record.task_config === 'string'
					? JSON.parse(record.task_config)
					: record.task_config;
			scheduleForm.task_config =
				config && typeof config === 'object' ? { ...defaultConfig, ...config } : defaultConfig;
		} else {
			scheduleForm.task_config = defaultConfig;
		}
	} catch (error) {
		console.warn('Failed to parse task_config:', error);
		scheduleForm.task_config = defaultConfig;
	}

	scheduleForm.is_enabled = record.is_enabled === 1;
	showCreateModal.value = true;
};

const deleteSchedule = async (id: number) => {
	try {
		const response = await axios.delete(`/api/etl/schedules/${id}`);

		if (response.data.code === 200) {
			message.success('定时任务已删除');
			loadSchedules();
		} else {
			message.error(response.data.msg || '删除失败');
		}
	} catch (error) {
		message.error('删除定时任务失败');
		console.error('Delete schedule error:', error);
	}
};

const toggleSchedule = async (id: number, enabled: boolean) => {
	try {
		const response = await axios.put(`/api/etl/schedules/${id}`, {
			is_enabled: enabled ? 1 : 0
		});

		if (response.data.code === 200) {
			message.success(enabled ? '定时任务已启用' : '定时任务已禁用');
			loadSchedules();
		} else {
			message.error(response.data.msg || '操作失败');
		}
	} catch (error) {
		message.error('操作失败');
		console.error('Toggle schedule error:', error);
	}
};

const triggerSchedule = async (id: number) => {
	try {
		const schedule = schedules.value.find((s: any) => s.id === id);
		if (!schedule) return;

		// 解析task_config
		let taskConfig = { time_start: '2021-01', time_end: '2025-10' };
		try {
			if (schedule.task_config) {
				const parsed =
					typeof schedule.task_config === 'string'
						? JSON.parse(schedule.task_config)
						: schedule.task_config;
				if (parsed && typeof parsed === 'object') {
					taskConfig = { ...taskConfig, ...parsed };
				}
			}
		} catch (error) {
			console.warn('Failed to parse task_config:', error);
		}

		// 创建一个新任务
		const response = await axios.post('/api/etl/tasks', {
			task_name: `手动触发: ${schedule.schedule_name}`,
			task_type: 'full',
			time_start: taskConfig.time_start,
			time_end: taskConfig.time_end
		});

		if (response.data.code === 200) {
			message.success('任务已创建并开始执行');
		} else {
			message.error(response.data.msg || '创建任务失败');
		}
	} catch (error: any) {
		message.error(error.response?.data?.msg || '触发任务失败');
		console.error('Trigger schedule error:', error);
	}
};

const getNextRunTime = (cronExpression: string) => {
	try {
		const interval = parser.parseExpression(cronExpression, {
			tz: 'Asia/Shanghai'
		});
		const next = interval.next().toDate();
		return next.toLocaleString('zh-CN');
	} catch (error) {
		return '-';
	}
};

const handleQuickCronSelect = (value: string) => {
	if (value) {
		scheduleForm.cron_expression = value;
	}
};

const handleCreateClick = () => {
	console.log('Create button clicked');
	showCreateModal.value = true;
	console.log('showCreateModal set to:', showCreateModal.value);
};

const resetForm = () => {
	isEditing.value = false;
	scheduleForm.id = undefined;
	scheduleForm.schedule_name = '';
	scheduleForm.cron_expression = '0 2 1 * *';
	scheduleForm.task_config = { time_start: '2021-01', time_end: '2025-10' };
	scheduleForm.is_enabled = true;
	quickCron.value = '';
};

onMounted(() => {
	loadSchedules();

	// 自动刷新下次执行时间（每分钟）
	setInterval(() => {
		loadSchedules();
	}, 60000);
});
</script>

<style scoped lang="scss">
.schedule-manager {
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

	.form-hint {
		font-size: 12px;
		color: #999;
		margin-top: 4px;
		line-height: 1.6;
	}
}

@media (max-width: 768px) {
	.schedule-manager {
		.page-header {
			flex-direction: column;
			gap: 12px;
			align-items: flex-start;

			h2 {
				font-size: 20px;
			}
		}
	}
}
</style>
