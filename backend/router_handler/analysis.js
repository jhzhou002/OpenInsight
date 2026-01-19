const db = require("../db/index");
const llmService = require("../services/llmService");
const dayjs = require("dayjs");

/**
 * 过滤时间序列数据,只保留指定时间范围内的数据
 */
const filterTimeSeriesData = (data, timeRange) => {
  if (!data || typeof data !== "object") return {};

  if (timeRange === "all") {
    return data;
  }

  // 找到数据中最新的时间作为基准点
  const dates = Object.keys(data).sort();
  if (dates.length === 0) return {};

  const latestDate = dayjs(dates[dates.length - 1], "YYYY-MM");
  let startDate;

  switch (timeRange) {
    case "3months":
      startDate = latestDate.subtract(3, "month");
      break;
    case "6months":
      startDate = latestDate.subtract(6, "month");
      break;
    case "12months":
      startDate = latestDate.subtract(12, "month");
      break;
    default:
      return data;
  }

  const filtered = {};
  Object.keys(data).forEach((key) => {
    const date = dayjs(key, "YYYY-MM");
    if (date.isAfter(startDate) || date.isSame(startDate, "month")) {
      filtered[key] = data[key];
    }
  });

  return filtered;
};

/**
 * 计算统计信息
 */
const calculateStats = (data) => {
  if (!data || typeof data !== "object") {
    return { min: 0, max: 0, avg: 0, trend: 0 };
  }

  const values = Object.values(data).filter((v) => v !== null && v !== undefined);
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, trend: 0 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

  // 计算趋势 (最后一个值 vs 第一个值)
  const trend = values.length > 1 ? ((values[values.length - 1] - values[0]) / values[0]) * 100 : 0;

  return {
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    avg: parseFloat(avg.toFixed(2)),
    trend: parseFloat(trend.toFixed(2)),
  };
};

/**
 * 检测拐点
 */
const detectTurningPoints = (data) => {
  if (!data || typeof data !== "object") return [];

  const entries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
  const turningPoints = [];

  for (let i = 1; i < entries.length - 1; i++) {
    const prev = entries[i - 1][1];
    const curr = entries[i][1];
    const next = entries[i + 1][1];

    if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
      const changeRate = Math.abs(((curr - prev) / prev) * 100);
      if (changeRate > 10) {
        // 变化超过10%才算拐点
        turningPoints.push({
          date: entries[i][0],
          value: curr,
          type: curr > prev ? "peak" : "valley",
          changeRate: parseFloat(changeRate.toFixed(2)),
        });
      }
    }
  }

  return turningPoints;
};

/**
 * 获取项目分析数据
 */
exports.getAnalysisData = (req, res) => {
  const { projectIds, metrics, timeRange } = req.body;

  if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
    return res.cc("请选择至少一个项目");
  }

  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    return res.cc("请选择至少一个指标");
  }

  if (projectIds.length > 2) {
    return res.cc("最多支持2个项目的对比分析");
  }

  // 构建SQL查询
  const placeholders = projectIds.map(() => "?").join(",");
  const sql = `SELECT project_id, company_name, project_name, ${metrics.join(", ")} FROM github WHERE project_id IN (${placeholders})`;

  db.query(sql, projectIds, (err, results) => {
    if (err) return res.cc(err);

    if (results.length === 0) {
      return res.cc("未找到项目数据");
    }

    // 处理数据
    const projectsData = results.map((project) => {
      const processedProject = {
        project_id: project.project_id,
        project_name: `${project.company_name}/${project.project_name}`,
        metrics: {},
      };

      metrics.forEach((metric) => {
        let metricData = project[metric];

        // 解析JSON字符串
        if (typeof metricData === "string") {
          try {
            metricData = JSON.parse(metricData);
          } catch (e) {
            metricData = {};
          }
        }

        // 过滤时间范围
        const filteredData = filterTimeSeriesData(metricData, timeRange);

        // 计算统计信息
        const stats = calculateStats(filteredData);

        // 检测拐点
        const turningPoints = detectTurningPoints(filteredData);

        processedProject.metrics[metric] = {
          timeSeries: filteredData,
          stats,
          turningPoints,
        };
      });

      return processedProject;
    });

    return res.send({
      msg: "操作成功",
      data: projectsData,
      code: 200,
    });
  });
};

/**
 * 生成AI分析报告
 */
exports.generateAIAnalysis = async (req, res) => {
  const { projectsData, metrics, timeRange } = req.body;

  if (!projectsData || !Array.isArray(projectsData)) {
    return res.cc("缺少项目数据");
  }

  try {
    // 构建AI提示词
    const systemPrompt = `你是一位资深的开源项目分析专家，具有10年以上开源生态研究经验，擅长从多维度数据中提炼深刻洞察。

# 核心指标体系

## OpenRank（影响力指数）
- **定义**：基于协作网络的PageRank算法，综合评估项目在开源生态中的影响力
- **评价标准**：
  * 优秀：> 200（头部项目）
  * 良好：100-200（活跃项目）
  * 中等：50-100（成长中）
  * 较低：< 50（早期/小众）
- **关注点**：影响力变化趋势、在生态中的位置、核心贡献者质量

## PREI（PR效率指数）
- **定义**：衡量项目处理Pull Request的效率与质量的综合指标
- **核心维度**：
  * PR响应速度（首次回复时间）
  * PR合并效率（从提交到合并的时间）
  * PR质量（讨论深度、代码审查质量）
  * 贡献者友好度（新贡献者接纳率）
- **健康标准**：
  * 优秀：> 0.8（快速响应、高质量审查）
  * 良好：0.6-0.8（正常运转）
  * 待改进：0.4-0.6（存在延迟）
  * 风险：< 0.4（严重积压或缺乏维护）
- **解读要点**：从协作效率、社区健康度、可持续性角度分析

## 项目活跃度（Activity Score）
- **定义**：综合评估项目的开发活跃程度
- **构成要素**：提交频率、Issue处理、代码变更量、Release节奏
- **分析维度**：
  * 活跃峰值对应的里程碑事件
  * 活跃度下降的潜在风险
  * 季节性波动规律

## 开发者活跃度（Developer Activity）
- **定义**：核心开发者和贡献者的参与度指标
- **关键信号**：
  * 持续增长：社区生态健康
  * 波动较大：可能存在人员流动
  * 持续下降：需警惕维护者流失

## 项目关注度（Attention Score）
- **定义**：Star、Fork、Watch等社区关注指标
- **意义**：反映项目的影响力扩散和用户增长

# 专业分析框架

## 数据深度解读
1. **趋势分析**：不仅描述涨跌，更要分析增长率、加速度、可持续性
2. **拐点洞察**：结合时间点推理外部事件（版本发布、技术突破、竞品动态、社区事件）
3. **相关性分析**：多指标联动解读（如OpenRank上升通常伴随活跃度增长）
4. **对比视角**：与同类项目、行业均值、历史最优对比

## 风险识别能力
- **早期预警**：识别负面趋势苗头（连续3个月下滑、拐点密集等）
- **结构性问题**：发现深层隐患（PREI低+活跃度高=维护者不足）
- **外部威胁**：竞品挤压、技术栈过时、社区分裂

## 战略建议层次
- **战术层**：具体可执行的改进措施（招募维护者、优化CI流程）
- **战略层**：长期方向建议（技术路线、生态建设、商业化路径）
- **标杆参考**：引用优秀案例作为对比

# 报告结构规范

## 一、核心洞察摘要（Executive Summary）
**用1-2段话概括最关键的发现**，包括：
- 项目当前状态评级（A/B/C/D）
- 最显著的趋势或问题
- 核心建议（1-2条最重要的）

## 二、多维度趋势分析
**必须使用表格**展示核心指标对比，格式示例：
| 指标 | 最小值 | 最大值 | 平均值 | 趋势 | 健康度评级 |
|------|--------|--------|--------|------|------------|
| OpenRank | ... | ... | ... | ↗ XX% | 优秀 |

**深度解读**：
- 各指标变化背后的驱动因素
- 指标间的相互作用关系
- 与历史数据的纵向对比

## 三、关键拐点深度剖析
**必须结合时间点推理事件**，格式要求：
- 📍 **YYYY-MM**：[峰值/谷值]，变化率XX%
  - **可能原因**：（需合理推测，如版本发布、重大功能上线）
  - **后续影响**：分析该拐点的持续影响

## 四、健康度诊断矩阵
使用**四象限分析**：
- **高影响力+高活跃度**：明星项目
- **高影响力+低活跃度**：成熟稳定/进入维护期
- **低影响力+高活跃度**：成长潜力/待突破
- **低影响力+低活跃度**：风险预警

${projectsData.length === 2 ? `
## 五、项目对比分析
**必须使用对比表格**，至少包含：
- 核心指标横向对比
- 优劣势对比矩阵
- 适用场景/技术选型建议
- 发展阶段判断
` : ""}

## ${projectsData.length === 2 ? "六" : "五"}、风险预警系统
**分级预警机制**：
- 🔴 **高风险**（需立即关注）
- 🟡 **中风险**（需持续观察）
- 🟢 **低风险**（正常波动）

每个风险点需说明：
1. 风险表现（数据支撑）
2. 可能后果
3. 应对建议

## ${projectsData.length === 2 ? "七" : "六"}、竞争力优势分析
**SWOT框架**：
- **Strengths**（优势）：基于数据的客观优势
- **Opportunities**（机会）：可把握的增长点
- **数据亮点**：具体数值+解读

## ${projectsData.length === 2 ? "八" : "七"}、战略改进路线图
**优先级排序**（P0/P1/P2）：
- **P0（必须做）**：立即影响项目生存的关键事项
- **P1（应该做）**：3个月内显著提升的改进点
- **P2（可以做）**：长期优化方向

每条建议需包含：
- 问题诊断（数据支撑）
- 改进措施（具体可执行）
- 预期效果

## ${projectsData.length === 2 ? "九" : "八"}、未来趋势预测
**基于数据建模**：
- 短期预测（1-3个月）：基于当前趋势延续
- 中期预测（3-6个月）：考虑季节性因素
- 关键假设：说明预测的前提条件
- 不确定性因素：列出可能影响预测的外部变量

# 输出质量标准

## 专业性要求
1. **数据驱动**：每个结论必须有数据支撑，引用具体数值
2. **客观中立**：避免主观臆断，承认数据局限性
3. **深度洞察**：不止于表面描述，挖掘数据背后的规律
4. **可执行性**：建议具体、可落地，非空泛建议

## 格式规范
1. **Markdown**：充分利用标题、加粗、列表、表格、引用
2. **表格优先**：对比数据必用表格，提升可读性
3. **视觉层次**：合理使用emoji（📊📈📉⚠️💡✅）增强视觉效果
4. **数据可视化建议**：适当提示"建议查看配套图表"

## 语言风格
1. **专业术语**：准确使用OpenRank、PREI等术语
2. **简洁有力**：避免冗长，每段核心观点突出
3. **逻辑严密**：因果关系清晰，推理过程合理
4. **直接开始**：报告开头直接是标题，不要开场白

## 特别注意
- PREI解读必须从**协作效率、社区健康、可持续性**角度，而非简单的"合并代码"
- 拐点分析必须**推测可能事件**，体现专业性
- 对比分析需**多维度、深层次**，避免流于表面
- 风险预警要**分级、具体、可操作**`

    // 准备项目数据摘要
    const projectsSummary = projectsData.map((project) => {
      const summary = {
        项目名称: project.project_name,
        指标分析: {},
      };

      Object.entries(project.metrics).forEach(([metricName, metricData]) => {
        summary.指标分析[metricName] = {
          最小值: metricData.stats.min,
          最大值: metricData.stats.max,
          平均值: metricData.stats.avg,
          趋势: `${metricData.stats.trend > 0 ? "↗" : "↘"} ${Math.abs(metricData.stats.trend)}%`,
          拐点数量: (metricData.turningPoints || []).length,
          关键拐点: (metricData.turningPoints || []).slice(0, 3).map((tp) => ({
            时间: tp.date,
            类型: tp.type === "peak" ? "峰值" : "谷值",
            变化率: `${tp.changeRate}%`,
          })),
        };
      });

      return summary;
    });

    // 获取实际的时间范围
    const getActualTimeRange = () => {
      let allDates = [];
      projectsData.forEach((project) => {
        Object.values(project.metrics).forEach((metricData) => {
          if (metricData.timeSeries) {
            allDates = allDates.concat(Object.keys(metricData.timeSeries));
          }
        });
      });

      if (allDates.length === 0) return "无数据";

      const sortedDates = Array.from(new Set(allDates)).sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      return `${startDate} - ${endDate}`;
    };

    const actualTimeRange = getActualTimeRange();

    const userPrompt = `请分析以下开源项目数据:

**时间范围**: 最近${timeRange === "3months" ? "3" : timeRange === "6months" ? "6" : timeRange === "12months" ? "12" : "全部"}个月 (${actualTimeRange})

**分析指标**: ${metrics.map((m) => {
      const metricNames = {
        openrank: "OpenRank",
        prei: "PR效率指数(PREI)",
        project_activity: "项目活跃度",
        developer_activity: "开发者活跃度",
        project_attention: "项目关注度",
      };
      return metricNames[m] || m;
    }).join("、")}

**项目数据**:
${JSON.stringify(projectsSummary, null, 2)}

请根据以上数据生成完整的分析报告。`;

    // 设置响应头为流式传输
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 调用LLM API (流式输出)
    const stream = await llmService.streamChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], {
      temperature: 0.7
    });

    // 流式返回数据
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("AI分析失败:", error);
    return res.cc(error.message || "AI分析失败");
  }
};
