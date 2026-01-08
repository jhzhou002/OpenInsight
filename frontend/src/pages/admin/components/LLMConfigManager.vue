<template>
	<div class="llm-config-manager">
		<div class="page-header">
			<h2>LLM配置管理</h2>
			<a-button type="primary" @click="showCreateModal = true">
				<PlusOutlined />
				添加LLM配置
			</a-button>
		</div>

		<!-- LLM配置列表 -->
		<a-card :bordered="false" class="config-card">
			<a-table
				:columns="columns"
				:data-source="configs"
				:loading="loading"
				row-key="id"
				:pagination="false"
			>
				<template #bodyCell="{ column, record }">
					<template v-if="column.key === 'provider'">
						<a-tag :color="getProviderColor(record.provider)">
							{{ getProviderName(record.provider) }}
						</a-tag>
					</template>

					<template v-if="column.key === 'is_active'">
						<a-badge
							:status="record.is_active ? 'success' : 'default'"
							:text="record.is_active ? '激活中' : '未激活'"
						/>
					</template>

					<template v-if="column.key === 'api_key'">
						<span class="api-key-masked">{{ record.api_key_masked }}</span>
					</template>

					<template v-if="column.key === 'actions'">
						<a-space>
							<a-button
								v-if="!record.is_active"
								type="link"
								size="small"
								@click="handleActivate(record.id)"
							>
								激活
							</a-button>
							<a-button type="link" size="small" @click="handleEdit(record)">
								编辑
							</a-button>
							<a-button
								type="link"
								size="small"
								danger
								:disabled="record.is_active"
								@click="handleDelete(record.id)"
							>
								删除
							</a-button>
						</a-space>
					</template>
				</template>
			</a-table>
		</a-card>

		<!-- 创建/编辑配置Modal -->
		<a-modal
			v-model:visible="showCreateModal"
			:title="isEditing ? '编辑LLM配置' : '添加LLM配置'"
			@ok="handleSaveConfig"
			:confirm-loading="saving"
			width="600px"
			:destroy-on-close="true"
		>
			<a-form :model="configForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
				<a-form-item label="提供商" required>
					<a-select
						v-model:value="configForm.provider"
						placeholder="选择LLM提供商"
						@change="handleProviderChange"
					>
						<a-select-option value="deepseek">DeepSeek</a-select-option>
						<a-select-option value="qwen">通义千问 (Qwen)</a-select-option>
						<a-select-option value="kimi">Kimi (月之暗面)</a-select-option>
						<a-select-option value="openai">OpenAI</a-select-option>
						<a-select-option value="gemini">Gemini</a-select-option>
					</a-select>
				</a-form-item>

				<a-form-item label="配置名称" required>
					<a-input v-model:value="configForm.name" placeholder="例如：DeepSeek-主账号" />
				</a-form-item>

				<a-form-item label="API Key" required>
					<a-input-password
						v-model:value="configForm.api_key"
						:placeholder="isEditing ? '保持不变，或输入新的API Key' : '请输入API Key'"
						autocomplete="off"
					/>
					<div class="form-tip">
						{{ isEditing ? '当前API Key: ' + editingMaskedKey + '，留空则保持不变' : 'API Key会加密存储，不会明文显示' }}
					</div>
				</a-form-item>

				<a-form-item label="Base URL" required>
					<a-input
						v-model:value="configForm.base_url"
						placeholder="API基础URL"
					/>
				</a-form-item>

				<a-form-item label="模型" required>
					<a-input
						v-model:value="configForm.model"
						placeholder="例如：deepseek-chat"
					/>
				</a-form-item>

				<a-form-item label="Temperature">
					<a-slider
						v-model:value="configForm.temperature"
						:min="0"
						:max="2"
						:step="0.1"
						:marks="{ 0: '0', 0.7: '0.7', 1: '1', 2: '2' }"
					/>
				</a-form-item>

				<a-form-item label="Max Tokens">
					<a-input-number
						v-model:value="configForm.max_tokens"
						:min="100"
						:max="128000"
						:step="100"
						style="width: 100%"
					/>
				</a-form-item>

				<a-form-item :wrapper-col="{ offset: 6, span: 18 }">
					<a-button
						type="dashed"
						block
						@click="handleTestConnection"
						:loading="testing"
					>
						<ExperimentOutlined />
						测试连接
					</a-button>
					<div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
						<CheckCircleOutlined v-if="testResult.success" />
						<CloseCircleOutlined v-else />
						{{ testResult.message }}
						<span v-if="testResult.response_time" class="response-time">
							({{ testResult.response_time }}ms)
						</span>
					</div>
				</a-form-item>
			</a-form>
		</a-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import {
	PlusOutlined,
	ExperimentOutlined,
	CheckCircleOutlined,
	CloseCircleOutlined
} from '@ant-design/icons-vue';
import axios from 'axios';

const loading = ref(false);
const configs = ref<any[]>([]);
const showCreateModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const testing = ref(false);
const testResult = ref<any>(null);
const editingMaskedKey = ref(''); // 存储编辑时的脱敏API key

const configForm = ref({
	id: null,
	provider: '',
	name: '',
	api_key: '',
	base_url: '',
	model: '',
	temperature: 0.7,
	max_tokens: 4000
});

const columns = [
	{
		title: '提供商',
		dataIndex: 'provider',
		key: 'provider',
		width: 120
	},
	{
		title: '配置名称',
		dataIndex: 'name',
		key: 'name'
	},
	{
		title: 'API Key',
		dataIndex: 'api_key_masked',
		key: 'api_key',
		width: 150
	},
	{
		title: '模型',
		dataIndex: 'model',
		key: 'model',
		width: 150
	},
	{
		title: '状态',
		dataIndex: 'is_active',
		key: 'is_active',
		width: 100
	},
	{
		title: '操作',
		key: 'actions',
		width: 200
	}
];

// Provider配置模板
const providerTemplates: Record<string, any> = {
	deepseek: {
		base_url: 'https://api.deepseek.com/v1',
		model: 'deepseek-chat'
	},
	qwen: {
		base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
		model: 'qwen-plus'
	},
	kimi: {
		base_url: 'https://api.moonshot.cn/v1',
		model: 'moonshot-v1-8k'
	},
	openai: {
		base_url: 'https://api.openai.com/v1',
		model: 'gpt-3.5-turbo'
	},
	gemini: {
		base_url: 'https://generativelanguage.googleapis.com/v1beta',
		model: 'gemini-pro'
	}
};

const getProviderName = (provider: string) => {
	const names: Record<string, string> = {
		deepseek: 'DeepSeek',
		qwen: '通义千问',
		kimi: 'Kimi',
		openai: 'OpenAI',
		gemini: 'Gemini'
	};
	return names[provider] || provider;
};

const getProviderColor = (provider: string) => {
	const colors: Record<string, string> = {
		deepseek: 'blue',
		qwen: 'purple',
		kimi: 'cyan',
		openai: 'green',
		gemini: 'volcano'
	};
	return colors[provider] || 'default';
};

const loadConfigs = async () => {
	try {
		loading.value = true;
		const response = await axios.get('/api/llm/configs');

		if (response.data.code === 200) {
			configs.value = response.data.data;
		}
	} catch (error) {
		message.error('加载配置失败');
		console.error('Load configs error:', error);
	} finally {
		loading.value = false;
	}
};

const handleProviderChange = (provider: string) => {
	const template = providerTemplates[provider];
	if (template) {
		configForm.value.base_url = template.base_url;
		configForm.value.model = template.model;
	}
};

const handleSaveConfig = async () => {
	try {
		// 验证必填字段
		if (!configForm.value.provider || !configForm.value.name ||
		    !configForm.value.base_url || !configForm.value.model) {
			message.warning('请填写所有必填字段');
			return;
		}

		// 创建时API key必须填写
		if (!isEditing.value && !configForm.value.api_key) {
			message.warning('请输入API Key');
			return;
		}

		saving.value = true;

		const data: any = {
			provider: configForm.value.provider,
			name: configForm.value.name,
			base_url: configForm.value.base_url,
			model: configForm.value.model,
			config_json: {
				temperature: configForm.value.temperature,
				max_tokens: configForm.value.max_tokens
			}
		};

		// 只有当API key不为空时才更新（编辑模式下允许留空）
		if (configForm.value.api_key) {
			data.api_key = configForm.value.api_key;
		}

		let response;
		if (isEditing.value && configForm.value.id) {
			response = await axios.put(`/api/llm/configs/${configForm.value.id}`, data);
		} else {
			response = await axios.post('/api/llm/configs', data);
		}

		if (response.data.code === 200) {
			message.success(isEditing.value ? '更新成功' : '创建成功');
			showCreateModal.value = false;
			resetForm();
			loadConfigs();
		}
	} catch (error: any) {
		message.error(error.response?.data?.msg || '保存配置失败');
		console.error('Save config error:', error);
	} finally {
		saving.value = false;
	}
};

const handleEdit = (record: any) => {
	isEditing.value = true;
	editingMaskedKey.value = record.api_key_masked; // 保存脱敏key用于显示
	configForm.value = {
		id: record.id,
		provider: record.provider,
		name: record.name,
		api_key: '', // 编辑时默认为空，如果用户填写则更新
		base_url: record.base_url,
		model: record.model,
		temperature: record.config_json?.temperature || 0.7,
		max_tokens: record.config_json?.max_tokens || 4000
	};
	showCreateModal.value = true;
};

const handleDelete = async (id: number) => {
	try {
		const confirmed = await new Promise((resolve) => {
			const modal = (window as any).antd.Modal.confirm({
				title: '确认删除',
				content: '删除后无法恢复，确定要删除这个配置吗？',
				onOk: () => {
					modal.destroy();
					resolve(true);
				},
				onCancel: () => {
					modal.destroy();
					resolve(false);
				}
			});
		});

		if (!confirmed) return;

		const response = await axios.delete(`/api/llm/configs/${id}`);

		if (response.data.code === 200) {
			message.success('删除成功');
			loadConfigs();
		}
	} catch (error: any) {
		message.error(error.response?.data?.msg || '删除失败');
		console.error('Delete config error:', error);
	}
};

const handleActivate = async (id: number) => {
	try {
		const response = await axios.post(`/api/llm/configs/${id}/activate`);

		if (response.data.code === 200) {
			message.success('切换成功');
			loadConfigs();
		}
	} catch (error: any) {
		message.error(error.response?.data?.msg || '激活失败');
		console.error('Activate config error:', error);
	}
};

const handleTestConnection = async () => {
	try {
		// 验证必填字段
		if (!configForm.value.provider || !configForm.value.api_key ||
		    !configForm.value.base_url || !configForm.value.model) {
			message.warning('请先填写provider、API Key、Base URL和Model');
			return;
		}

		testing.value = true;
		testResult.value = null;

		const response = await axios.post('/api/llm/test', {
			provider: configForm.value.provider,
			api_key: configForm.value.api_key,
			base_url: configForm.value.base_url,
			model: configForm.value.model
		});

		if (response.data.code === 200) {
			testResult.value = {
				success: response.data.data.success,
				message: response.data.msg,
				response_time: response.data.data.response_time
			};
		} else {
			testResult.value = {
				success: false,
				message: response.data.msg
			};
		}
	} catch (error: any) {
		testResult.value = {
			success: false,
			message: error.response?.data?.msg || 'API连接失败'
		};
		console.error('Test connection error:', error);
	} finally {
		testing.value = false;
	}
};

const resetForm = () => {
	isEditing.value = false;
	testResult.value = null;
	editingMaskedKey.value = '';
	configForm.value = {
		id: null,
		provider: '',
		name: '',
		api_key: '',
		base_url: '',
		model: '',
		temperature: 0.7,
		max_tokens: 4000
	};
};

onMounted(() => {
	loadConfigs();
});
</script>

<style scoped lang="scss">
.llm-config-manager {
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

	.config-card {
		.api-key-masked {
			font-family: monospace;
			color: #666;
		}
	}

	.form-tip {
		margin-top: 4px;
		font-size: 12px;
		color: #999;
	}

	.test-result {
		margin-top: 8px;
		padding: 8px 12px;
		border-radius: 4px;
		font-size: 13px;

		&.success {
			background: #f6ffed;
			border: 1px solid #b7eb8f;
			color: #52c41a;
		}

		&.error {
			background: #fff2f0;
			border: 1px solid #ffccc7;
			color: #ff4d4f;
		}

		.anticon {
			margin-right: 8px;
		}

		.response-time {
			margin-left: 8px;
			color: #999;
		}
	}
}
</style>
