<template>
	<div class="analysis-page">
		<div class="analysis-container">
			<!-- 标题 -->
			<div class="page-header">
				<h1 class="page-title">🔍 AI项目深度分析</h1>
				<p class="page-subtitle">基于OpenRank、PREI等多维度指标,生成专业的项目分析报告</p>
			</div>

			<!-- 第一步: 项目选择器 -->
			<a-card class="selection-card" title="1️⃣ 选择项目" :bordered="false">
				<a-select
					v-model:value="selectedProjects"
					mode="multiple"
					placeholder="请选择1-2个项目进行分析"
					:options="projectOptions"
					:max-tag-count="2"
					:filter-option="filterOption"
					show-search
					style="width: 100%"
					:disabled="analyzing"
				>
					<template #maxTagPlaceholder="omittedValues">
						<span>+{{ omittedValues.length }}个项目</span>
					</template>
				</a-select>
				<div class="selection-hint">
					<InfoCircleOutlined />
					<span>最多支持2个项目同时分析,单个项目可获得完整分析,两个项目可进行对比分析</span>
				</div>
			</a-card>

			<!-- 第二步: 指标和时间选择 -->
			<a-card class="selection-card" title="2️⃣ 选择分析维度" :bordered="false">
				<div class="selection-group">
					<div class="selection-section">
						<h4>分析指标</h4>
						<a-checkbox-group v-model:value="selectedMetrics" :disabled="analyzing">
							<a-checkbox
								v-for="metric in availableMetrics"
								:key="metric.value"
								:value="metric.value"
								class="metric-checkbox"
							>
								{{ metric.label }}
								<a-tooltip :title="metric.description">
									<QuestionCircleOutlined class="metric-help-icon" />
								</a-tooltip>
							</a-checkbox>
						</a-checkbox-group>
					</div>

					<a-divider type="vertical" style="height: 120px" />

					<div class="selection-section">
						<h4>时间范围</h4>
						<a-radio-group v-model:value="timeRange" button-style="solid" :disabled="analyzing">
							<a-radio-button value="3months">最近3个月</a-radio-button>
							<a-radio-button value="6months">最近6个月</a-radio-button>
							<a-radio-button value="12months">最近12个月</a-radio-button>
							<a-radio-button value="all">全部时间</a-radio-button>
						</a-radio-group>
					</div>
				</div>
			</a-card>

			<!-- 分析按钮 -->
			<div class="action-section">
				<a-button
					type="primary"
					size="large"
					:loading="analyzing"
					:disabled="!canStartAnalysis"
					@click="startAnalysis"
					class="analyze-button"
				>
					<template #icon>
						<RocketOutlined v-if="!analyzing" />
					</template>
					{{ analyzing ? '分析中...' : '开始AI分析' }}
				</a-button>
				<span v-if="!canStartAnalysis" class="action-hint">请至少选择1个项目和1个指标</span>
			</div>

			<!-- 第三步: AI分析结果 -->
			<a-card
				v-if="analysisResult || analyzing"
				ref="resultCardRef"
				class="result-card"
				title="3️⃣ AI分析报告"
				:bordered="false"
			>
				<!-- 加载状态 -->
				<div v-if="analyzing" class="analyzing-status">
					<a-spin size="large">
						<template #indicator>
							<LoadingOutlined style="font-size: 48px" spin />
						</template>
					</a-spin>
					<div class="analyzing-steps">
						<a-steps :current="analyzingStep" size="small">
							<a-step title="数据加载" />
							<a-step title="趋势计算" />
							<a-step title="AI分析" />
							<a-step title="报告生成" />
						</a-steps>
					</div>
					<p class="analyzing-text">AI正在深度分析项目数据,请稍候...</p>
				</div>

				<!-- 分析结果 -->
				<div v-else class="analysis-result">
					<div class="result-header">
						<a-tag color="success">分析完成</a-tag>
						<span class="result-time">生成时间: {{ analysisTime }}</span>
						<a-button type="primary" @click="exportToPDF" :loading="exporting">
							<template #icon>
								<DownloadOutlined />
							</template>
							导出PDF报告
						</a-button>
					</div>

					<!-- Markdown渲染区域 -->
					<div class="markdown-body" v-html="renderedMarkdown"></div>
				</div>
			</a-card>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
	InfoCircleOutlined,
	QuestionCircleOutlined,
	RocketOutlined,
	LoadingOutlined,
	DownloadOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { marked } from 'marked';
import dayjs from 'dayjs';
import html2pdf from 'html2pdf.js';
import { getOptions } from '../dashboard/service';
import { getAnalysisData, generateAIAnalysis } from './service';

// 项目选项
const projectOptions = ref<Array<{ value: number; label: string }>>([]);
const selectedProjects = ref<number[]>([]);

// 可用指标
const availableMetrics = [
	{
		value: 'openrank',
		label: 'OpenRank',
		description: '综合衡量项目影响力的指标,考虑了项目的活跃度、贡献者数量和质量等因素'
	},
	{
		value: 'prei',
		label: 'PR效率指数(PREI)',
		description: '衡量项目处理Pull Request的效率,反映项目的响应速度和维护质量'
	},
	{
		value: 'project_activity',
		label: '项目活跃度',
		description: '反映项目的整体活跃程度,包括提交频率、Issue处理等'
	},
	{
		value: 'developer_activity',
		label: '开发者活跃度',
		description: '衡量项目开发者的活跃程度和参与度'
	},
	{
		value: 'project_attention',
		label: '项目关注度',
		description: '反映项目受到的关注程度,包括Star、Fork、Watch等指标'
	}
];

const selectedMetrics = ref<string[]>(['openrank', 'prei', 'project_activity']);
const timeRange = ref<string>('12months');

// 分析状态
const analyzing = ref(false);
const analyzingStep = ref(0);
const analysisResult = ref('');
const analysisTime = ref('');
const exporting = ref(false);
const resultCardRef = ref<any>(null);

// 计算是否可以开始分析
const canStartAnalysis = computed(() => {
	return selectedProjects.value.length > 0 && selectedMetrics.value.length > 0;
});

// Markdown渲染
const renderedMarkdown = computed(() => {
	if (!analysisResult.value) return '';
	return marked(analysisResult.value);
});

// 过滤选项
const filterOption = (input: string, option: any) => {
	return option.label.toLowerCase().includes(input.toLowerCase());
};

// 加载项目选项
const loadProjectOptions = async () => {
	try {
		const res = await getOptions();
		if (res.code === 200) {
			projectOptions.value = res.data || [];
		}
	} catch (error) {
		message.error('加载项目列表失败');
	}
};

// 开始分析
const startAnalysis = async () => {
	if (selectedProjects.value.length > 2) {
		message.warning('最多支持2个项目的对比分析');
		return;
	}

	analyzing.value = true;
	analyzingStep.value = 0;
	analysisResult.value = '';

	// 等待 DOM 更新后滚动到结果卡片
	await new Promise(resolve => setTimeout(resolve, 100));
	if (resultCardRef.value) {
		resultCardRef.value.$el.scrollIntoView({
			behavior: 'smooth',
			block: 'start'
		});
	}

	try {
		// 步骤1: 获取分析数据
		analyzingStep.value = 0;
		const dataRes = await getAnalysisData({
			projectIds: selectedProjects.value,
			metrics: selectedMetrics.value,
			timeRange: timeRange.value
		});

		if (dataRes.code !== 200) {
			throw new Error(dataRes.msg || '获取数据失败');
		}

		// 步骤2: 趋势计算 (后端已完成)
		analyzingStep.value = 1;
		await new Promise(resolve => setTimeout(resolve, 500));

		// 步骤3: AI分析
		analyzingStep.value = 2;

		// 使用流式读取AI分析结果
		let fullContent = '';
		await generateAIAnalysis(
			{
				projectsData: dataRes.data,
				metrics: selectedMetrics.value,
				timeRange: timeRange.value
			},
			(chunk: string) => {
				fullContent += chunk;
				analysisResult.value = fullContent;
			}
		);

		// 步骤4: 报告生成完成
		analyzingStep.value = 3;
		analysisTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss');
		message.success('AI分析完成!');
	} catch (error: any) {
		console.error('分析失败:', error);
		message.error(error.message || '分析失败,请重试');
		analysisResult.value = '';
	} finally {
		analyzing.value = false;
	}
};

// 导出PDF
const exportToPDF = async () => {
	exporting.value = true;
	try {
		// 获取项目名称用于文件名
		const projectNames = selectedProjects.value
			.map(id => {
				const option = projectOptions.value.find(opt => opt.value === id);
				return option ? option.label.replace(/\//g, '-') : '';
			})
			.filter(Boolean)
			.join('_');

		const fileName = `OpenInsight_分析报告_${projectNames}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`;

		// 创建PDF专用的HTML内容
		const pdfContent = createPDFContent();

		// 配置html2pdf选项
		const opt = {
			margin: [15, 15, 15, 15] as [number, number, number, number],
			filename: fileName,
			image: { type: 'jpeg' as const, quality: 0.98 },
			html2canvas: {
				scale: 2,
				useCORS: true,
				letterRendering: true
			},
			jsPDF: {
				unit: 'mm',
				format: 'a4',
				orientation: 'portrait' as const
			},
			pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
		};

		// 生成PDF
		await html2pdf().set(opt).from(pdfContent).save();

		message.success('PDF导出成功！');
	} catch (error) {
		console.error('PDF导出失败:', error);
		message.error('PDF导出失败，请重试');
	} finally {
		exporting.value = false;
	}
};

// 创建PDF专用的HTML内容
const createPDFContent = () => {
	const projectInfo = selectedProjects.value
		.map(id => {
			const option = projectOptions.value.find(opt => opt.value === id);
			return option ? option.label : '';
		})
		.filter(Boolean)
		.join(' vs ');

	const metricsInfo = selectedMetrics.value
		.map(m => {
			const metricNames: Record<string, string> = {
				openrank: 'OpenRank',
				prei: 'PR效率指数(PREI)',
				project_activity: '项目活跃度',
				developer_activity: '开发者活跃度',
				project_attention: '项目关注度'
			};
			return metricNames[m] || m;
		})
		.join('、');

	// 将Markdown转换为HTML
	const contentHTML = marked(analysisResult.value);

	return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
			line-height: 1.8;
			color: #333;
			background: white;
			padding: 20px;
		}

		.pdf-header {
			text-align: center;
			margin-bottom: 30px;
			padding-bottom: 20px;
			border-bottom: 3px solid #1890ff;
		}

		.pdf-title {
			font-size: 28px;
			font-weight: bold;
			color: #1890ff;
			margin-bottom: 15px;
		}

		.pdf-meta {
			font-size: 13px;
			color: #666;
			line-height: 1.8;
		}

		.pdf-meta-item {
			margin: 5px 0;
		}

		.pdf-content {
			color: #333;
		}

		h1 {
			font-size: 22px;
			color: #1890ff;
			margin-top: 25px;
			margin-bottom: 15px;
			padding-bottom: 8px;
			border-bottom: 2px solid #e8e8e8;
			page-break-after: avoid;
		}

		h2 {
			font-size: 18px;
			color: #1890ff;
			margin-top: 20px;
			margin-bottom: 12px;
			padding-bottom: 6px;
			border-bottom: 1px solid #f0f0f0;
			page-break-after: avoid;
		}

		h3 {
			font-size: 16px;
			color: #333;
			margin-top: 15px;
			margin-bottom: 10px;
			page-break-after: avoid;
		}

		p {
			margin-bottom: 12px;
			text-align: justify;
		}

		ul, ol {
			margin: 10px 0 15px 25px;
		}

		li {
			margin-bottom: 6px;
		}

		strong {
			color: #d46b08;
			font-weight: 600;
		}

		code {
			background: #f5f5f5;
			padding: 2px 6px;
			border-radius: 3px;
			font-family: "Consolas", "Monaco", monospace;
			font-size: 13px;
			color: #d46b08;
		}

		blockquote {
			border-left: 4px solid #1890ff;
			padding-left: 15px;
			margin: 15px 0;
			color: #666;
			font-style: italic;
		}

		table {
			width: 100%;
			border-collapse: collapse;
			margin: 20px 0;
			page-break-inside: avoid;
		}

		th {
			background: #f0f5ff;
			color: #1890ff;
			font-weight: 600;
			padding: 12px;
			text-align: left;
			border: 1px solid #d9d9d9;
		}

		td {
			padding: 10px 12px;
			border: 1px solid #d9d9d9;
		}

		tr:nth-child(even) {
			background: #fafafa;
		}

		.pdf-footer {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #e8e8e8;
			text-align: center;
			font-size: 12px;
			color: #999;
		}
	</style>
</head>
<body>
	<div class="pdf-header">
		<div class="pdf-title">OpenInsight 开源项目AI分析报告</div>
		<div class="pdf-meta">
			<div class="pdf-meta-item"><strong>分析项目：</strong>${projectInfo}</div>
			<div class="pdf-meta-item"><strong>分析指标：</strong>${metricsInfo}</div>
			<div class="pdf-meta-item"><strong>时间范围：</strong>${
				timeRange.value === '3months'
					? '最近3个月'
					: timeRange.value === '6months'
					? '最近6个月'
					: timeRange.value === '12months'
					? '最近12个月'
					: '全部时间'
			}</div>
			<div class="pdf-meta-item"><strong>生成时间：</strong>${analysisTime.value}</div>
		</div>
	</div>

	<div class="pdf-content">
		${contentHTML}
	</div>

	<div class="pdf-footer">
		<p>本报告由 OpenInsight 平台自动生成</p>
		<p>Powered by AI · 基于OpenRank、PREI等多维度指标深度分析</p>
	</div>
</body>
</html>
	`;
};

onMounted(() => {
	loadProjectOptions();
});
</script>

<style lang="scss" scoped>
.analysis-page {
	min-height: 100vh;
	background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
	padding: 24px;
	position: relative;
}

.analysis-container {
	max-width: 1400px;
	margin: 0 auto;
}

.page-header {
	text-align: center;
	margin-bottom: 40px;
	padding-top: 20px;

	.page-title {
		font-size: 42px;
		font-weight: 700;
		background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		margin-bottom: 12px;
	}

	.page-subtitle {
		font-size: 16px;
		color: #94a3b8;
		margin: 0;
	}
}

.selection-card {
	margin-bottom: 24px;
	background: rgba(15, 23, 42, 0.6);
	backdrop-filter: blur(10px);
	border: 1px solid rgba(56, 189, 248, 0.2);
	border-radius: 12px;

	:deep(.ant-card-head) {
		border-bottom: 1px solid rgba(56, 189, 248, 0.2);
		color: #38bdf8;
		font-size: 18px;
		font-weight: 600;
	}

	:deep(.ant-card-body) {
		padding: 24px;
	}
}

.selection-hint {
	margin-top: 12px;
	color: #64748b;
	font-size: 13px;
	display: flex;
	align-items: center;
	gap: 8px;
}

// 项目选择器样式
:deep(.ant-select) {
	.ant-select-selector {
		background: rgba(15, 23, 42, 0.6) !important;
		border-color: rgba(56, 189, 248, 0.3) !important;
		color: #e2e8f0 !important;

		&:hover {
			border-color: rgba(56, 189, 248, 0.6) !important;
		}
	}

	.ant-select-selection-placeholder {
		color: #64748b !important;
	}

	.ant-select-selection-item {
		background: rgba(56, 189, 248, 0.15) !important;
		border-color: rgba(56, 189, 248, 0.4) !important;
		color: #38bdf8 !important;
	}

	.ant-select-selection-item-remove {
		color: #94a3b8 !important;

		&:hover {
			color: #38bdf8 !important;
		}
	}

	.ant-select-arrow {
		color: #94a3b8 !important;
	}

	.ant-select-clear {
		background: rgba(15, 23, 42, 0.8) !important;
		color: #94a3b8 !important;

		&:hover {
			color: #38bdf8 !important;
		}
	}
}

// 下拉列表样式
:deep(.ant-select-dropdown) {
	background: rgba(15, 23, 42, 0.95) !important;
	backdrop-filter: blur(10px);
	border: 1px solid rgba(56, 189, 248, 0.2);

	.ant-select-item {
		color: #cbd5e1 !important;

		&:hover {
			background: rgba(56, 189, 248, 0.1) !important;
		}
	}

	.ant-select-item-option-selected {
		background: rgba(56, 189, 248, 0.2) !important;
		color: #38bdf8 !important;
		font-weight: 600;
	}

	.ant-select-item-option-active {
		background: rgba(56, 189, 248, 0.15) !important;
	}
}

.selection-group {
	display: flex;
	gap: 32px;
	align-items: flex-start;
}

.selection-section {
	flex: 1;

	h4 {
		color: #e2e8f0;
		font-size: 15px;
		font-weight: 600;
		margin-bottom: 16px;
	}

	:deep(.ant-checkbox-group) {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	:deep(.ant-checkbox-wrapper) {
		color: #cbd5e1;
		font-size: 14px;

		&:hover {
			color: #38bdf8;
		}

		.ant-checkbox-checked .ant-checkbox-inner {
			background-color: #38bdf8;
			border-color: #38bdf8;
		}

		.ant-checkbox-inner {
			border-color: rgba(56, 189, 248, 0.4);
		}
	}

	.metric-checkbox {
		color: #cbd5e1;
		font-size: 14px;

		&:hover {
			color: #38bdf8;
		}
	}

	.metric-help-icon {
		margin-left: 6px;
		color: #64748b;
		cursor: help;

		&:hover {
			color: #38bdf8;
		}
	}

	:deep(.ant-radio-group) {
		display: flex;
		flex-direction: column;
		gap: 12px;

		.ant-radio-button-wrapper {
			background: rgba(15, 23, 42, 0.6);
			border-color: rgba(56, 189, 248, 0.3);
			color: #94a3b8;
			text-align: center;

			&:hover {
				color: #38bdf8;
			}

			&.ant-radio-button-wrapper-checked {
				background: rgba(56, 189, 248, 0.2);
				border-color: #38bdf8;
				color: #38bdf8;
			}
		}
	}
}

.action-section {
	text-align: center;
	margin: 40px 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;

	.analyze-button {
		height: 50px;
		padding: 0 48px;
		font-size: 16px;
		font-weight: 600;
		background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
		border: none;
		box-shadow: 0 4px 16px rgba(56, 189, 248, 0.3);

		&:hover:not(:disabled) {
			transform: translateY(-2px);
			box-shadow: 0 6px 20px rgba(56, 189, 248, 0.4);
		}

		&:disabled {
			background: #334155;
			color: #64748b;
		}
	}

	.action-hint {
		color: #f59e0b;
		font-size: 13px;
	}
}

.result-card {
	background: rgba(15, 23, 42, 0.6);
	backdrop-filter: blur(10px);
	border: 1px solid rgba(56, 189, 248, 0.2);
	border-radius: 12px;

	:deep(.ant-card-head) {
		border-bottom: 1px solid rgba(56, 189, 248, 0.2);
		color: #38bdf8;
		font-size: 18px;
		font-weight: 600;
	}

	:deep(.ant-card-body) {
		padding: 32px;
		min-height: 400px;
	}
}

.analyzing-status {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 60px 20px;

	:deep(.ant-spin) {
		.ant-spin-dot-item {
			background-color: #38bdf8;
		}
	}

	.analyzing-steps {
		margin: 32px 0;
		width: 100%;
		max-width: 600px;

		:deep(.ant-steps-item-title) {
			color: #cbd5e1 !important;
			font-size: 14px;
		}

		:deep(.ant-steps-item-process .ant-steps-item-title) {
			color: #38bdf8 !important;
			font-weight: 600;
		}

		:deep(.ant-steps-item-finish .ant-steps-item-title) {
			color: #10b981 !important;
		}

		:deep(.ant-steps-item-wait .ant-steps-item-title) {
			color: #64748b !important;
		}

		:deep(.ant-steps-item-icon) {
			border-color: rgba(56, 189, 248, 0.4);
			background: rgba(15, 23, 42, 0.6);

			.ant-steps-icon {
				color: #cbd5e1;
			}
		}

		:deep(.ant-steps-item-finish .ant-steps-item-icon) {
			border-color: #10b981;
			background: rgba(16, 185, 129, 0.1);

			.ant-steps-icon {
				color: #10b981;
			}
		}

		:deep(.ant-steps-item-process .ant-steps-item-icon) {
			border-color: #38bdf8;
			background: rgba(56, 189, 248, 0.15);

			.ant-steps-icon {
				color: #38bdf8;
			}
		}
	}

	.analyzing-text {
		color: #cbd5e1;
		font-size: 16px;
		margin-top: 16px;
		font-weight: 500;
	}
}

.analysis-result {
	.result-header {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 32px;
		padding-bottom: 16px;
		border-bottom: 1px solid rgba(56, 189, 248, 0.2);

		.result-time {
			color: #94a3b8;
			font-size: 13px;
			flex: 1;
		}
	}

	.markdown-body {
		color: #e2e8f0;
		line-height: 1.8;
		font-size: 15px;

		:deep(h1) {
			color: #60a5fa;
			font-size: 28px;
			font-weight: 700;
			margin-top: 24px;
			margin-bottom: 20px;
			padding-bottom: 12px;
			border-bottom: 3px solid rgba(96, 165, 250, 0.3);
		}

		:deep(h2) {
			color: #38bdf8;
			font-size: 24px;
			font-weight: 600;
			margin-top: 32px;
			margin-bottom: 16px;
			padding-bottom: 8px;
			border-bottom: 2px solid rgba(56, 189, 248, 0.3);
		}

		:deep(h3) {
			color: #818cf8;
			font-size: 18px;
			font-weight: 600;
			margin-top: 24px;
			margin-bottom: 12px;
		}

		:deep(p) {
			margin-bottom: 16px;
			color: #cbd5e1;
		}

		:deep(ul),
		:deep(ol) {
			margin-bottom: 16px;
			padding-left: 24px;

			li {
				margin-bottom: 8px;
				color: #cbd5e1;
			}
		}

		:deep(strong) {
			color: #f59e0b;
			font-weight: 600;
		}

		:deep(code) {
			background: rgba(56, 189, 248, 0.1);
			padding: 2px 6px;
			border-radius: 4px;
			font-family: 'Consolas', 'Monaco', monospace;
			color: #38bdf8;
		}

		:deep(blockquote) {
			border-left: 4px solid #38bdf8;
			padding-left: 16px;
			margin: 16px 0;
			color: #94a3b8;
			font-style: italic;
		}

		:deep(table) {
			border-collapse: collapse;
			width: 100%;
			margin: 20px 0;
			background: rgba(15, 23, 42, 0.4);
			border: 1px solid rgba(56, 189, 248, 0.2);
			border-radius: 8px;
			overflow: hidden;
		}

		:deep(thead) {
			background: rgba(56, 189, 248, 0.1);
		}

		:deep(th) {
			padding: 12px 16px;
			text-align: left;
			font-weight: 600;
			color: #38bdf8;
			border-bottom: 2px solid rgba(56, 189, 248, 0.3);
		}

		:deep(td) {
			padding: 12px 16px;
			color: #cbd5e1;
			border-bottom: 1px solid rgba(56, 189, 248, 0.1);
		}

		:deep(tbody tr) {
			transition: background 0.2s;

			&:hover {
				background: rgba(56, 189, 248, 0.05);
			}

			&:last-child td {
				border-bottom: none;
			}
		}
	}
}

// 响应式设计
@media (max-width: 768px) {
	.selection-group {
		flex-direction: column;

		:deep(.ant-divider-vertical) {
			display: none;
		}
	}

	.page-header .page-title {
		font-size: 32px;
	}
}
</style>

<style lang="scss">
// 全局样式：项目选择器下拉列表（Portal渲染到body下，需要全局样式）
.ant-select-dropdown {
	background: rgba(15, 23, 42, 0.98) !important;
	backdrop-filter: blur(12px);
	border: 1px solid rgba(56, 189, 248, 0.3) !important;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;

	.rc-virtual-list {
		.rc-virtual-list-holder {
			.rc-virtual-list-holder-inner {
				.ant-select-item {
					color: #cbd5e1 !important;
					background: transparent !important;

					&:hover {
						background: rgba(56, 189, 248, 0.1) !important;
					}
				}

				.ant-select-item-option-selected {
					background: rgba(56, 189, 248, 0.2) !important;
					color: #38bdf8 !important;
					font-weight: 600;

					.ant-select-item-option-state {
						color: #38bdf8 !important;
					}
				}

				.ant-select-item-option-active:not(.ant-select-item-option-selected) {
					background: rgba(56, 189, 248, 0.15) !important;
				}
			}
		}
	}
}
</style>
