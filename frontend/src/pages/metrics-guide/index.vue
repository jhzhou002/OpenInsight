<template>
	<div class="metrics-guide-page">
		<div class="guide-container">
			<h1 class="page-title">OpenInsight 指标说明</h1>
			<p class="page-subtitle">全面了解 OpenInsight 平台使用的各项开源项目评估指标</p>

			<div class="metrics-section">
				<h2 class="section-title">📊 GitHub 指数 (GitHub Index)</h2>
				<div class="metric-card">
					<h3>指数构成</h3>
					<p>GitHub 指数 = 0.3 * 影响力 + 0.2 * 社区反应 + 0.2 * 开发活跃度 + 0.3 * 发展趋势</p>
					<ul class="metric-list">
						<li>
							<strong>影响力 (Influence):</strong>
							<code>0.25 * stars_sum + 0.25 * technical_fork_sum + 0.3 * issues_new_sum + 0.2 * change_requests_sum</code>
							<p class="metric-desc">衡量项目在开源社区的影响范围和受欢迎程度。</p>
						</li>
						<li>
							<strong>社区反应 (Reaction):</strong>
							<code>0.5 * issues_closed_sum + 0.2 * change_requests_accepted_sum + 0.2 * (1 - min_max_norm(issue_resolution_duration_sum)) + 0.1 * (1 - min_max_norm(change_request_resolution_duration_sum))</code>
							<p class="metric-desc">衡量社区对项目问题和贡献的响应效率(结合解决时长反向评分)。</p>
						</li>
						<li>
							<strong>开发活跃度 (Developer Activity):</strong>
							<code>0.4 * issues_new_sum + 0.3 * change_requests_sum + 0.3 * new_contributors_sum</code>
							<p class="metric-desc">评估项目吸引新贡献者的能力和开发团队的活跃程度。</p>
						</li>
						<li>
							<strong>发展趋势 (Trend):</strong>
							<code>0.4 * Issue增长率 + 0.4 * PR增长率 + 0.2 * 新增贡献者增长率</code>
							<p class="metric-desc">三个增长率均按月度环比变化率平均值计算，反映项目的发展动力。</p>
						</li>
					</ul>
				</div>
				<div class="metric-card">
					<h3>数据处理流程</h3>
					<ol class="numbered-list">
						<li>对四个维度的原始项目级指标做 Min–Max 归一化（项目间 0~1 统一尺度）。</li>
						<li>对归一化后的四个维度做平方根平滑（降低极端值影响）。</li>
						<li>使用平滑后的四个维度按权重计算综合得分 Github_raw（理论上在 0~1 内，但实际区间较窄）。</li>
						<li>在所有项目上对 Github_raw 再做一次 Min–Max 归一化，得到 Github_norm，并做功效系数：<code>GitHub_Index = 60 + 40 × Github_norm</code>（最终范围 60~100）。</li>
						<li>为了展示效果，对四个维度的平滑结果分别再做一次 Min–Max 归一化，并做功效系数：<code>Dimension_Index = 60 + 40 × Min–Max(平滑维度值)</code>，仅用于展示，不影响第 3–4 步的综合得分计算逻辑。</li>
					</ol>
				</div>
			</div>

			<div class="metrics-section">
				<h2 class="section-title">⚡ PREI 指数 (PR & Issue Efficiency Index)</h2>
				<div class="metric-card">
					<h3>PREI 计算公式</h3>
					<code style="display:block; margin-bottom:10px; background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; color:#6ee7b7; font-family:'Consolas', 'Monaco', monospace;">PREI_raw = 0.35*R_resp + 0.35*R_res + 0.15*R_review + 0.15*R_accept</code>
					<p style="margin-top: 10px">最终得分: <code>PREI = 60 + 40 * MinMaxNorm(PREI_raw)</code></p>
					
					<h3 style="margin-top: 20px">维度分解</h3>
					<ul class="metric-list">
						<li>
							<strong>响应效率 (Response Efficiency):</strong>
							<code>R_resp = MinMaxNorm(StdNorm(1 - log(1 + T_resp)))</code>
							<p class="metric-desc">基于首次响应时间 (issue_response_time + pr_response_time)。</p>
						</li>
						<li>
							<strong>处理效率 (Resolution Efficiency):</strong>
							<code>R_res = MinMaxNorm(StdNorm(1 - log(1 + T_res)))</code>
							<p class="metric-desc">基于解决时长 (issue_resolution_duration + change_request_resolution_duration)。</p>
						</li>
						<li>
							<strong>审阅充分度 (Review Intensity):</strong>
							<code>R_review = MinMaxNorm(StdNorm(PR_Reviews / PR_Count))</code>
							<p class="metric-desc">平均每个 PR 收到的 Review 数量。</p>
						</li>
						<li>
							<strong>PR 接受率 (PR Acceptance Rate):</strong>
							<code>R_accept = MinMaxNorm(StdNorm(PR_Accepted / PR_Count))</code>
							<p class="metric-desc">Pull Request 的合并成功率。</p>
						</li>
					</ul>
				</div>
			</div>

			<div class="metrics-section">
				<h2 class="section-title">📊 基础聚合指标 (Aggregated Metrics)</h2>
				
				<div class="metric-card">
					<h3>项目活跃度 (Project Activity)</h3>
					<p style="margin-bottom:10px; color:#cbd5e1">项目活跃度 = 创造活动 + 参与活动</p>
					<div style="background:rgba(30, 41, 59, 0.4); padding:16px; border-radius:8px; border-left:3px solid #38bdf8; margin-bottom:20px;">
						<p style="color:#cbd5e1; margin:0"><strong>计算公式:</strong></p>
						<code style="display:block; background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:6px; margin-top:8px; color:#6ee7b7; font-family:Consolas, monospace;">0.4 * issues_new + 0.4 * change_requests + 0.1 * issue_comments + 0.1 * change_requests_reviews</code>
					</div>
				</div>
				
				<div class="metric-card">
					<h3>开发者活跃度 (Developer Activity)</h3>
					<p style="margin-bottom:10px; color:#cbd5e1">侧重于人的维度，包含新贡献者、互动参与和内容创建。</p>
					<div style="background:rgba(30, 41, 59, 0.4); padding:16px; border-radius:8px; border-left:3px solid #38bdf8; margin-bottom:20px;">
						<p style="color:#cbd5e1; margin:0"><strong>计算公式:</strong></p>
						<code style="display:block; background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:6px; margin-top:8px; color:#6ee7b7; font-family:Consolas, monospace;">0.5 * new_contributors + 0.3 * (issue_comments + change_requests_reviews) + 0.2 * (issues_new + change_requests)</code>
					</div>
				</div>

				<div class="metric-card">
					<h3>关注度 (Attention)</h3>
					<p style="margin-bottom:10px; color:#cbd5e1">基于 Stars 和 Technical Forks 计算的社区关注程度。</p>
					<div style="background:rgba(30, 41, 59, 0.4); padding:16px; border-radius:8px; border-left:3px solid #38bdf8; margin-bottom:20px;">
						<p style="color:#cbd5e1; margin:0"><strong>计算公式:</strong></p>
						<code style="display:block; background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:6px; margin-top:8px; color:#6ee7b7; font-family:Consolas, monospace;">0.4 * stars + 0.6 * technical_fork</code>
					</div>
				</div>
			</div>
			
			<div class="metrics-section">
				<h2 class="section-title">📈 OpenRank</h2>
				<div class="metric-card">
					<h3>指标说明</h3>
					<p>
						OpenRank 是基于开源协作网络的影响力评估算法,类似于 Google PageRank。
						它不仅考虑贡献者的数量,更重视贡献者之间的协作关系和影响力传递。
					</p>
				</div>
			</div>

			<div class="metrics-section">
				<h2 class="section-title">🔄 数据来源与更新</h2>
				<div class="metric-card">
					<h3>数据来源</h3>
					<p>所有指标数据均来自 <a href="https://github.com/X-lab2017/open-digger" target="_blank" class="link">X-lab OpenDigger</a> 项目,该项目提供了丰富的开源项目元数据和分析指标。</p>
				</div>

				<div class="metric-card">
					<h3>更新频率</h3>
					<ul class="metric-list">
						<li><strong>Top300 项目:</strong> 每月自动更新一次</li>
						<li><strong>Baseline 数据:</strong> 随 Top300 数据更新而重新计算</li>
						<li><strong>新导入项目:</strong> 实时计算指标并复用总体计算的 Baseline (不重新计算)</li>
					</ul>
				</div>
			</div>

			<div class="metrics-section">
				<h2 class="section-title">💡 使用建议</h2>
				<div class="metric-card">
					<ul class="metric-list">
						<li>
							<strong>综合评估:</strong>
							<p class="metric-desc">不要只看单一指标,应综合 GitHub 指数、PREI 指数和 OpenRank 进行评估</p>
						</li>
						<li>
							<strong>趋势观察:</strong>
							<p class="metric-desc">关注项目的历史趋势,而不仅是当前的绝对值</p>
						</li>
						<li>
							<strong>同类对比:</strong>
							<p class="metric-desc">在相似类型或规模的项目间进行对比更有意义</p>
						</li>
						<li>
							<strong>结合实际:</strong>
							<p class="metric-desc">指标是参考工具,最终决策还需结合项目实际情况和业务需求</p>
						</li>
					</ul>
				</div>
			</div>

			<div class="back-btn-container">
				<button class="back-btn" @click="goBack">返回</button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
	router.back();
};
</script>

<style lang="scss" scoped>
.metrics-guide-page {
	min-height: calc(100vh - 64px);
	background: #060c20;
	padding: 40px 20px;
	overflow-y: auto;
}

.guide-container {
	max-width: 1200px;
	margin: 0 auto;
}

.page-title {
	text-align: center;
	font-size: 36px;
	font-weight: 700;
	margin-bottom: 12px;
	background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	background-clip: text;
}

.page-subtitle {
	text-align: center;
	color: #94a3b8;
	font-size: 16px;
	margin-bottom: 48px;
}

.metrics-section {
	margin-bottom: 48px;
}

.section-title {
	font-size: 28px;
	font-weight: 600;
	color: #e2e8f0;
	margin-bottom: 24px;
	padding-bottom: 12px;
	border-bottom: 2px solid rgba(56, 189, 248, 0.3);
}

.metric-card {
	background: rgba(15, 23, 42, 0.6);
	backdrop-filter: blur(10px);
	border: 1px solid rgba(56, 189, 248, 0.2);
	border-radius: 12px;
	padding: 24px;
	margin-bottom: 20px;

	h3 {
		font-size: 20px;
		font-weight: 600;
		color: #38bdf8;
		margin-bottom: 16px;
	}

	p {
		color: #cbd5e1;
		line-height: 1.8;
		margin-bottom: 12px;
	}
}

.metric-list {
	list-style: none;
	padding: 0;

	li {
		margin-bottom: 20px;
		padding: 16px;
		background: rgba(30, 41, 59, 0.4);
		border-radius: 8px;
		border-left: 3px solid #38bdf8;
		color: #cbd5e1;

		strong {
			color: #38bdf8;
			font-size: 16px;
			display: block;
			margin-bottom: 8px;
		}

		code {
			display: block;
			background: rgba(0, 0, 0, 0.3);
			padding: 8px 12px;
			border-radius: 6px;
			font-family: 'Consolas', 'Monaco', monospace;
			font-size: 13px;
			color: #6ee7b7;
			margin: 8px 0;
			overflow-x: auto;
		}

		.metric-desc {
			color: #94a3b8;
			font-size: 14px;
			margin: 8px 0 0 0;
		}
	}
}

.numbered-list {
	padding-left: 20px;

	li {
		color: #cbd5e1;
		line-height: 1.8;
		margin-bottom: 12px;

		code {
			display: inline-block;
			background: rgba(0, 0, 0, 0.3);
			padding: 2px 8px;
			border-radius: 4px;
			font-family: 'Consolas', 'Monaco', monospace;
			font-size: 13px;
			color: #6ee7b7;
		}
	}
}

.link {
	color: #38bdf8;
	text-decoration: none;
	border-bottom: 1px solid transparent;
	transition: border-color 0.3s;

	&:hover {
		border-bottom-color: #38bdf8;
	}
}

.back-btn-container {
	text-align: center;
	margin-top: 48px;
	padding-bottom: 20px;
}

.back-btn {
	padding: 12px 32px;
	background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
	border: 1px solid rgba(56, 189, 248, 0.3);
	border-radius: 8px;
	color: white;
	font-size: 16px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.3s;

	&:hover {
		background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(56, 189, 248, 0.6);
	}
}

@media (max-width: 768px) {
	.page-title {
		font-size: 28px;
	}

	.page-subtitle {
		font-size: 14px;
	}

	.section-title {
		font-size: 22px;
	}

	.metric-card {
		padding: 16px;

		h3 {
			font-size: 18px;
		}
	}

	.metric-list li {
		padding: 12px;

		strong {
			font-size: 15px;
		}

		code {
			font-size: 12px;
		}
	}
}
</style>
