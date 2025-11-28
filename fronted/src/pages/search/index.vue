<template>
	<div class="search-page">
		<div class="search-container">
			<h1>项目搜索与导入</h1>

			<div class="input-group">
				<label for="owner">项目所有者 (Owner)</label>
				<input
					id="owner"
					v-model="owner"
					type="text"
					placeholder="例如: facebook"
					@keyup.enter="checkProject"
				/>
			</div>

			<div class="input-group">
				<label for="repo">项目名称 (Repo)</label>
				<input id="repo" v-model="repo" type="text" placeholder="例如: react" @keyup.enter="checkProject" />
			</div>

			<div class="button-group">
				<button class="btn-check" @click="checkProject" :disabled="loading || !owner || !repo">
					<span v-if="checking" class="loading"></span>
					{{ checking ? '检查中...' : '检查项目' }}
				</button>

				<button class="btn-etl" @click="runETL" :disabled="loading || !canRunETL">
					<span v-if="processing" class="loading"></span>
					{{ processing ? '处理中...' : '执行ETL' }}
				</button>
			</div>

			<div v-if="result" :class="['result', result.type]">
				<h3>{{ result.title }}</h3>
				<p>{{ result.message }}</p>
				<p v-if="result.opendiggerExists !== undefined">
					OpenDigger数据:
					<span :class="['status-badge', result.opendiggerExists ? 'exists' : 'not-exists']">
						{{ result.opendiggerExists ? '存在' : '不存在' }}
					</span>
				</p>
				<p v-if="result.dbExists !== undefined">
					数据库数据:
					<span :class="['status-badge', result.dbExists ? 'exists' : 'not-exists']">
						{{ result.dbExists ? '已存在' : '未存在' }}
					</span>
				</p>
				<p v-if="result.details">{{ result.details }}</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import axios from 'axios';

const owner = ref('');
const repo = ref('');
const checking = ref(false);
const processing = ref(false);
const result = ref<any>(null);
const canRunETL = ref(false);

// 获取 API 基础 URL
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
const apiBase = `${apiBaseUrl}/etl`;

const loading = computed(() => checking.value || processing.value);

const checkProject = async () => {
	if (!owner.value || !repo.value) {
		showResult('error', '错误', '请输入项目所有者和项目名称');
		return;
	}

	checking.value = true;
	result.value = null;
	canRunETL.value = false;

	try {
		const response = await axios.get(`${apiBase}/check/${owner.value}/${repo.value}`);

		if (response.data.success) {
			canRunETL.value = response.data.opendiggerExists && !response.data.dbExists;

			result.value = {
				type: canRunETL.value ? 'success' : 'info',
				title: '检查完成',
				message: response.data.message,
				opendiggerExists: response.data.opendiggerExists,
				dbExists: response.data.dbExists
			};
		} else {
			result.value = {
				type: 'error',
				title: '检查失败',
				message: response.data.message,
				opendiggerExists: response.data.opendiggerExists,
				dbExists: response.data.dbExists
			};
		}
	} catch (error: any) {
		showResult('error', '请求失败', error.response?.data?.message || error.message);
	} finally {
		checking.value = false;
	}
};

const runETL = async () => {
	if (!canRunETL.value) return;

	processing.value = true;
	result.value = null;

	try {
		const response = await axios.post(`${apiBase}/process`, {
			owner: owner.value,
			repo: repo.value
		});

		if (response.data.success) {
			showResult('success', 'ETL成功', response.data.message);
			canRunETL.value = false;
		} else {
			showResult('error', 'ETL失败', response.data.message);
		}
	} catch (error: any) {
		showResult('error', '请求失败', error.response?.data?.message || error.message);
	} finally {
		processing.value = false;
	}
};

const showResult = (type: string, title: string, message: string, details = '') => {
	result.value = { type, title, message, details };
};
</script>

<style lang="scss" scoped>
.search-page {
	min-height: calc(100vh - 60px);
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 20px;
	background: #060c20;
}

.search-container {
	background: rgba(15, 23, 42, 0.8);
	backdrop-filter: blur(10px);
	border: 1px solid rgba(56, 189, 248, 0.2);
	border-radius: 12px;
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
	padding: 40px;
	max-width: 600px;
	width: 100%;
}

h1 {
	text-align: center;
	color: #e2e8f0;
	margin-bottom: 30px;
	font-size: 28px;
	background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
}

.input-group {
	margin-bottom: 20px;
}

label {
	display: block;
	margin-bottom: 8px;
	color: #cbd5e1;
	font-weight: 500;
}

input {
	width: 100%;
	padding: 12px 16px;
	background: rgba(30, 41, 59, 0.6);
	border: 2px solid rgba(56, 189, 248, 0.2);
	border-radius: 8px;
	font-size: 16px;
	color: #e2e8f0;
	transition: all 0.3s;
}

input:focus {
	outline: none;
	border-color: #38bdf8;
}

input::placeholder {
	color: #64748b;
}

.button-group {
	display: flex;
	gap: 12px;
	margin-top: 24px;
}

button {
	flex: 1;
	padding: 14px 24px;
	border: none;
	border-radius: 8px;
	font-size: 16px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.3s;
}

button:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-check {
	background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
	color: white;
	border: 1px solid rgba(56, 189, 248, 0.3);
}

.btn-check:hover:not(:disabled) {
	background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
	transform: translateY(-2px);
	box-shadow: 0 4px 16px rgba(56, 189, 248, 0.6);
}

.btn-etl {
	background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
	color: white;
	border: 1px solid rgba(72, 187, 120, 0.3);
}

.btn-etl:hover:not(:disabled) {
	background: linear-gradient(135deg, #38a169 0%, #2f855a 100%);
	transform: translateY(-2px);
	box-shadow: 0 4px 16px rgba(72, 187, 120, 0.6);
}

.result {
	margin-top: 24px;
	padding: 16px;
	border-radius: 8px;
	animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateY(-10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.result.success {
	background: rgba(72, 187, 120, 0.15);
	border: 2px solid #48bb78;
	color: #6ee7b7;
}

.result.error {
	background: rgba(245, 101, 101, 0.15);
	border: 2px solid #f56565;
	color: #fca5a5;
}

.result.info {
	background: rgba(56, 189, 248, 0.15);
	border: 2px solid #38bdf8;
	color: #7dd3fc;
}

.result h3 {
	margin-bottom: 8px;
	font-size: 18px;
}

.result p {
	margin: 6px 0;
	line-height: 1.6;
}

.loading {
	display: inline-block;
	width: 16px;
	height: 16px;
	border: 2px solid rgba(255, 255, 255, 0.3);
	border-top-color: white;
	border-radius: 50%;
	animation: spin 0.6s linear infinite;
	margin-right: 8px;
	vertical-align: middle;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.status-badge {
	display: inline-block;
	padding: 4px 12px;
	border-radius: 12px;
	font-size: 14px;
	font-weight: 600;
	margin-left: 8px;
}

.status-badge.exists {
	background: #d1fae5;
	color: #065f46;
}

.status-badge.not-exists {
	background: #fee2e2;
	color: #991b1b;
}
</style>
