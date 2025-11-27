const db = require("../db/index");
const OpenAI = require("openai");
const dayjs = require("dayjs");

// 初始化通义千问客户端
const client = new OpenAI({
  apiKey: "sk-829bda5565e04302b9bd5a088f0247c3",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

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
    const systemPrompt = `你是一位资深的开源项目分析专家,擅长分析GitHub项目的各项指标,并提供专业的洞察和建议。

# 关键指标说明

**PREI (Pull Request Efficiency Index)** 是衡量开源项目 PR 工作效率与质量的综合指数,它回答：
"一个开源项目对于 PR（Pull Request）的处理是否高效、及时、健康？"

PREI = PR 工作的效率 + 质量 + 社区协作的健康程度

它衡量一个项目：
✔ 是否对贡献者友好
✔ 是否能快速处理外部贡献
✔ 是否有足够的维护者保持 review
✔ PR 工作是否规范、有序、高效
✔ 是否存在积压 or 审查不足
✔ 社区协作是否顺畅
✔ 项目是否可持续

**OpenRank** 是综合衡量项目影响力的指标,考虑了项目的活跃度、贡献者数量和质量等因素。

# 分析报告结构

## 一、趋势总体分析
分析项目在所选时间范围内的整体趋势,包括各指标的变化情况。可使用表格展示关键数据对比。

## 二、项目健康度诊断
基于OpenRank、开发者活跃度、PREI等指标,评估项目的健康状态(优秀/良好/中等/风险)。

## 三、关键拐点检测
识别并分析数据中的关键拐点,探讨可能的原因(如版本发布、重大更新、社区事件等)。

${projectsData.length === 2 ? `## 四、项目对比分析\n横向对比两个项目在各个维度的差异和相似度,使用表格清晰展示对比结果。` : ""}

## ${projectsData.length === 2 ? "五" : "四"}、风险预警
识别潜在风险点,如活跃度下降、PREI降低(PR处理效率下降)、社区参与度减少等。

## ${projectsData.length === 2 ? "六" : "五"}、优势亮点
总结项目的优势和亮点,如PREI高(说明对贡献者友好、响应及时)、社区活跃等。

## ${projectsData.length === 2 ? "七" : "六"}、改进建议
基于数据分析,提供3-5条具体的改进建议。如PREI较低时,建议优化PR处理流程、增加维护者等。

## ${projectsData.length === 2 ? "八" : "七"}、未来趋势预测
基于历史数据,预测未来3-6个月的发展趋势。

# 输出要求

1. 使用Markdown格式,适当使用加粗、列表、表格等格式增强可读性
2. 对比数据时优先使用表格展示
3. 用专业、客观、数据驱动的语言
4. 具体分析PREI时,要从"PR处理效率、社区协作健康度"角度解读,而非简单的"代码合并"
5. 数据引用要准确,使用具体数值支撑观点`;

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

    // 调用通义千问API (流式输出)
    const stream = await client.chat.completions.create({
      model: "qwen-plus",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
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
