<template>
	<div class="config-manager">
		<div class="page-header">
			<h2>ETL配置管理</h2>
			<a-button type="primary" @click="handleSave" :loading="saving">
				<SaveOutlined />
				保存配置
			</a-button>
		</div>

		<a-spin :spinning="loading">
			<a-row :gutter="[16, 16]">
				<!-- 时间范围配置 -->
				<a-col :xs="24" :lg="12">
					<a-card title="时间范围配置" :bordered="false">
						<a-form layout="vertical">
							<a-form-item label="开始时间">
								<a-input
									v-model:value="configs.time_range.start"
									placeholder="例如: 2021-01"
								/>
							</a-form-item>
							<a-form-item label="结束时间">
								<a-input v-model:value="configs.time_range.end" placeholder="例如: 2025-10" />
							</a-form-item>
						</a-form>
					</a-card>
				</a-col>

				<!-- 执行配置 -->
				<a-col :xs="24" :lg="12">
					<a-card title="执行配置" :bordered="false">
						<a-form layout="vertical">
							<a-form-item label="最大并发数">
								<a-input-number
									v-model:value="configs.max_workers.value"
									:min="1"
									:max="16"
									style="width: 100%"
								/>
								<div class="form-hint">同时处理的项目数量</div>
							</a-form-item>
							<a-form-item label="超时时间(秒)">
								<a-input-number
									v-model:value="configs.timeout.value"
									:min="60"
									:max="3600"
									style="width: 100%"
								/>
								<div class="form-hint">单个项目处理超时时间</div>
							</a-form-item>
						</a-form>
					</a-card>
				</a-col>

				<!-- Python路径配置 -->
				<a-col :xs="24" :lg="12">
					<a-card title="Python环境配置" :bordered="false">
						<a-form layout="vertical">
							<a-form-item label="Python可执行文件路径">
								<a-input
									v-model:value="configs.python_path.value"
									placeholder="例如: python 或 /usr/bin/python3"
								/>
								<div class="form-hint">留空使用系统默认python</div>
							</a-form-item>
						</a-form>
					</a-card>
				</a-col>

				<!-- 脚本路径配置 -->
				<a-col :xs="24" :lg="12">
					<a-card title="脚本路径配置" :bordered="false">
						<a-form layout="vertical">
							<a-form-item label="ETL脚本目录">
								<a-input
									v-model:value="configs.script_path.value"
									placeholder="例如: /path/to/etl_scripts"
								/>
								<div class="form-hint">Python ETL脚本所在目录</div>
							</a-form-item>
						</a-form>
					</a-card>
				</a-col>
			</a-row>
		</a-spin>
	</div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { SaveOutlined } from '@ant-design/icons-vue';
import axios from 'axios';

const loading = ref(false);
const saving = ref(false);

const configs = reactive({
	time_range: {
		start: '2021-01',
		end: '2025-10'
	},
	max_workers: {
		value: 4
	},
	timeout: {
		value: 300
	},
	python_path: {
		value: 'python'
	},
	script_path: {
		value: './etl_scripts'
	}
});

const loadConfigs = async () => {
	try {
		loading.value = true;
		const response = await axios.get('/api/etl/config');

		if (response.data.code === 200) {
			response.data.data.forEach((item: any) => {
				if (configs[item.config_key as keyof typeof configs]) {
					(configs as any)[item.config_key] = item.config_value;
				}
			});
		}
	} catch (error) {
		message.error('加载配置失败');
		console.error('Load configs error:', error);
	} finally {
		loading.value = false;
	}
};

const handleSave = async () => {
	try {
		saving.value = true;

		const response = await axios.post('/api/etl/config/batch', {
			configs: configs
		});

		if (response.data.code === 200) {
			message.success('配置保存成功');
		} else {
			message.error(response.data.msg || '保存失败');
		}
	} catch (error) {
		message.error('保存配置失败');
		console.error('Save configs error:', error);
	} finally {
		saving.value = false;
	}
};

onMounted(() => {
	loadConfigs();
});
</script>

<style scoped lang="scss">
.config-manager {
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
	}

	:deep(.ant-card) {
		height: 100%;

		.ant-card-head-title {
			font-weight: 600;
		}
	}
}

@media (max-width: 768px) {
	.config-manager {
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
