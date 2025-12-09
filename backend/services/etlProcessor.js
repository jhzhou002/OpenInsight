const DataExtractor = require('./dataExtractor');
const db = require('../db/promise');

/**
 * ETL处理器 - 基于 get data.ipynb 完整流程
 * 使用内存临时数据，不生成文件
 */
class ETLProcessor {
  constructor(owner, repo) {
    this.owner = owner;
    this.repo = repo;
    this.extractor = new DataExtractor(owner, repo);
    this.baseline = null;

    // 时间范围 2021-01 到 2025-10
    this.timeRange = this.generateTimeRange('2021-01', '2025-10');
  }

  /**
   * 生成时间范围数组 ['2021-01', '2021-02', ...]
   */
  generateTimeRange(start, end) {
    const [startYear, startMonth] = start.split('-').map(Number);
    const [endYear, endMonth] = end.split('-').map(Number);
    const range = [];

    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;

      for (let month = monthStart; month <= monthEnd; month++) {
        range.push(`${year}-${String(month).padStart(2, '0')}`);
      }
    }
    return range;
  }

  /**
   * 初始化 - 获取baseline配置
   */
  async initialize() {
    const [rows] = await db.query('SELECT baseline FROM baseline_config LIMIT 1');
    if (rows.length === 0) {
      throw new Error('baseline_config表中没有数据');
    }
    this.baseline = rows[0].baseline;
    console.log('✅ Baseline配置加载成功');
  }

  /**
   * 检查项目是否已存在数据库
   */
  async checkProjectExists() {
    const [rows] = await db.query(
      'SELECT project_id FROM github WHERE company_name = ? AND project_name = ?',
      [this.owner, this.repo]
    );
    return rows.length > 0;
  }

  /**
   * 执行完整的ETL流程
   */
  async process() {
    try {
      console.log(`\n========== 开始ETL处理: ${this.owner}/${this.repo} ==========`);

      // 1. 初始化baseline
      await this.initialize();

      // 2. 检查OpenDigger是否有数据
      const checkResult = await this.extractor.checkExists();
      if (!checkResult.exists) {
        return {
          success: false,
          message: checkResult.message
        };
      }

      // 3. 检查数据库是否已有该项目
      const existsInDb = await this.checkProjectExists();
      if (existsInDb) {
        return {
          success: false,
          message: '该项目已存在于数据库中'
        };
      }

      // 4. Extract - 提取所有指标数据
      console.log('📥 [Extract] 开始提取数据...');
      const rawData = await this.extractor.fetchAllMetrics();
      console.log('✅ [Extract] 数据提取完成');

      // 5. Transform - 数据转换（内存处理）
      console.log('🔄 [Transform] 开始转换数据...');
      const transformedData = await this.transformData(rawData);
      console.log('✅ [Transform] 数据转换完成');

      // 6. Load - 加载到数据库
      console.log('💾 [Load] 开始加载到数据库...');
      await this.loadToDatabase(transformedData);
      console.log('✅ [Load] 数据加载完成');

      console.log(`========== ETL处理成功: ${this.owner}/${this.repo} ==========\n`);

      return {
        success: true,
        message: 'ETL处理完成',
        data: {
          owner: this.owner,
          repo: this.repo
        }
      };
    } catch (error) {
      console.error('❌ ETL处理失败:', error);
      return {
        success: false,
        message: `ETL处理失败: ${error.message}`
      };
    }
  }

  /**
   * 数据转换逻辑 - 完全基于notebook的流程
   */
  async transformData(rawData) {
    const result = {
      company: this.owner,
      project: this.repo
    };

    // ===== Step 1: 时间对齐 (对应notebook步骤7-8) =====
    console.log('  - 时间对齐与缺失值处理');
    const aligned = this.alignAllMetrics(rawData);

    // ===== Step 2: 计算聚合指标 (对应notebook步骤17) =====
    console.log('  - 计算项目活跃度、开发者活跃度、关注度');
    result.project_activity_index = this.formatTimeSeries(this.calculateProjectActivity(aligned));
    result.developer_activity_index = this.formatTimeSeries(this.calculateDeveloperActivity(aligned));
    result.attention_index = this.formatTimeSeries(this.calculateAttention(aligned));

    // ===== Step 3: 计算PREI及其四个维度 (对应notebook步骤17) =====
    console.log('  - 计算PREI及四个维度');
    const preiResult = this.calculatePREI(aligned);
    result.pr_response_score = this.formatTimeSeries(preiResult.pr_response_score);
    result.pr_resolution_score = this.formatTimeSeries(preiResult.pr_resolution_score);
    result.pr_review_score = this.formatTimeSeries(preiResult.pr_review_score);
    result.pr_accept_score = this.formatTimeSeries(preiResult.pr_accept_score);
    result.pr_efficiency_index = this.formatTimeSeries(preiResult.pr_efficiency_index);

    // ===== Step 4: 计算GitHub指数及其四个维度 (对应notebook步骤18) =====
    console.log('  - 计算GitHub指数及四个维度');
    const githubResult = this.calculateGithubIndex(aligned);
    result.github_index = this.round2(githubResult.github_index);
    result.influence_index = this.round2(githubResult.influence_index);
    result.reaction_index = this.round2(githubResult.reaction_index);
    result.developer_index = this.round2(githubResult.developer_index);
    result.trend_index = this.round2(githubResult.trend_index);

    // ===== Step 5: 计算平均值 =====
    result.openrank_avg = this.round2(this.calculateAverage(aligned.openrank));

    // ===== Step 6: 保存openrank时间序列 =====
    result.openrank = this.formatTimeSeries(aligned.openrank);

    return result;
  }

  /**
   * 时间对齐所有指标
   */
  alignAllMetrics(rawData) {
    return {
      openrank: this.alignTimeSeries(rawData.openrank, 'forward'),
      stars: this.alignTimeSeries(rawData.stars, 'zero'),
      technical_fork: this.alignTimeSeries(rawData.technical_fork, 'zero'),
      issues_new: this.alignTimeSeries(rawData.issues_new, 'zero'),
      issues_closed: this.alignTimeSeries(rawData.issues_closed, 'zero'),
      issue_comments: this.alignTimeSeries(rawData.issue_comments, 'zero'),
      change_requests: this.alignTimeSeries(rawData.change_requests, 'zero'),
      change_requests_accepted: this.alignTimeSeries(rawData.change_requests_accepted, 'zero'),
      change_requests_reviews: this.alignTimeSeries(rawData.change_requests_reviews, 'zero'),
      change_request_response_time: this.extractAvg(rawData.change_request_response_time),
      change_request_resolution_duration: this.extractAvg(rawData.change_request_resolution_duration),
      new_contributors: this.alignTimeSeries(rawData.new_contributors, 'zero'),
      issue_response_time: this.extractAvg(rawData.issue_response_time),
      issue_resolution_duration: this.extractAvg(rawData.issue_resolution_duration),
    };
  }

  /**
   * 提取特殊指标的avg字段并对齐
   */
  extractAvg(data) {
    if (!data || !data.avg) return this.createEmptyTimeSeries();
    return this.alignTimeSeries(data.avg, 'null');
  }

  /**
   * 创建空时间序列
   */
  createEmptyTimeSeries() {
    const series = {};
    this.timeRange.forEach(month => {
      series[month] = 0;
    });
    return series;
  }

  /**
   * 对齐时间轴并填充缺失值
   */
  alignTimeSeries(data, fillStrategy = 'zero') {
    const aligned = {};

    this.timeRange.forEach(month => {
      if (data && data[month] !== undefined && data[month] !== null) {
        aligned[month] = parseFloat(data[month]) || 0;
      } else {
        if (fillStrategy === 'zero') {
          aligned[month] = 0;
        } else if (fillStrategy === 'forward') {
          // 向前填充
          const prevMonths = this.timeRange.slice(0, this.timeRange.indexOf(month));
          let lastValue = 0;
          for (let i = prevMonths.length - 1; i >= 0; i--) {
            if (aligned[prevMonths[i]] !== undefined && aligned[prevMonths[i]] !== null) {
              lastValue = aligned[prevMonths[i]];
              break;
            }
          }
          aligned[month] = lastValue;
        } else if (fillStrategy === 'null') {
          aligned[month] = 0; // 对于计算，null用0代替
        }
      }
    });

    return aligned;
  }

  /**
   * 计算项目活跃度
   */
  calculateProjectActivity(data) {
    const result = {};
    this.timeRange.forEach(month => {
      result[month] =
        0.4 * (data.issues_new[month] || 0) +
        0.4 * (data.change_requests[month] || 0) +
        0.1 * (data.issue_comments[month] || 0) +
        0.1 * (data.change_requests_reviews[month] || 0);
    });
    return result;
  }

  /**
   * 计算开发者活跃度
   */
  calculateDeveloperActivity(data) {
    const result = {};
    this.timeRange.forEach(month => {
      result[month] =
        0.5 * (data.new_contributors[month] || 0) +
        0.3 * ((data.issue_comments[month] || 0) + (data.change_requests_reviews[month] || 0)) +
        0.2 * ((data.issues_new[month] || 0) + (data.change_requests[month] || 0));
    });
    return result;
  }

  /**
   * 计算关注度
   */
  calculateAttention(data) {
    const result = {};
    this.timeRange.forEach(month => {
      result[month] =
        0.4 * (data.stars[month] || 0) +
        0.6 * (data.technical_fork[month] || 0);
    });
    return result;
  }

  /**
   * 计算PREI - 完全按照PDF文档标准流程
   */
  calculatePREI(data) {
    const result = {
      pr_response_score: {},
      pr_resolution_score: {},
      pr_review_score: {},
      pr_accept_score: {},
      pr_efficiency_index: {}
    };

    // 1. 响应效率（log 压缩 → 反向评分 → 二次归一 → ×100）
    const respLog = this.logCompress(data.change_request_response_time);
    const respRaw = this.reverseScore(respLog);
    const respNorm = this.stdNorm(respRaw);
    this.timeRange.forEach(month => {
      result.pr_response_score[month] = (respNorm[month] || 0) * 100;
    });

    // 2. 处理效率
    const resLog = this.logCompress(data.change_request_resolution_duration);
    const resRaw = this.reverseScore(resLog);
    const resNorm = this.stdNorm(resRaw);
    this.timeRange.forEach(month => {
      result.pr_resolution_score[month] = (resNorm[month] || 0) * 100;
    });

    // 3. 审阅充分度
    const reviewIntensity = {};
    this.timeRange.forEach(month => {
      const reviews = data.change_requests_reviews[month] || 0;
      const prs = data.change_requests[month] || 0;
      reviewIntensity[month] = prs > 0 ? reviews / prs : 0;
    });
    const reviewNorm = this.stdNorm(reviewIntensity);
    this.timeRange.forEach(month => {
      result.pr_review_score[month] = (reviewNorm[month] || 0) * 100;
    });

    // 4. 接受率
    const acceptRate = {};
    this.timeRange.forEach(month => {
      const accepted = data.change_requests_accepted[month] || 0;
      const prs = data.change_requests[month] || 0;
      acceptRate[month] = prs > 0 ? accepted / prs : 0;
    });
    const acceptNorm = this.stdNorm(acceptRate);
    this.timeRange.forEach(month => {
      result.pr_accept_score[month] = (acceptNorm[month] || 0) * 100;
    });

    // 5. PREI综合指数 - 使用baseline归一化后做功效系数（PDF标准）
    this.timeRange.forEach(month => {
      // 计算四个维度的加权平均（0~1范围）
      const preiRaw =
        0.35 * (result.pr_response_score[month] / 100) +
        0.35 * (result.pr_resolution_score[month] / 100) +
        0.15 * (result.pr_review_score[month] / 100) +
        0.15 * (result.pr_accept_score[month] / 100);

      // 使用baseline归一化
      const preiNorm = this.normalizeWithBaseline(preiRaw, 'prei_raw', 'prei_raw_baseline');

      // 功效系数：60~100
      result.pr_efficiency_index[month] = 60 + 40 * preiNorm;
    });

    return result;
  }

  /**
   * 计算GitHub指数 - 项目级聚合（PDF标准）
   */
  calculateGithubIndex(data) {
    // 聚合数据（总和）
    const starsSum = this.sum(data.stars);
    const forkSum = this.sum(data.technical_fork);
    const issueNewSum = this.sum(data.issues_new);
    const changeRequestsSum = this.sum(data.change_requests);
    const issuesClosedSum = this.sum(data.issues_closed);
    const changeRequestsAcceptedSum = this.sum(data.change_requests_accepted);
    const newContributorsSum = this.sum(data.new_contributors);

    // 计算时间指标的总和（PDF标准：需要加入社区反应维度）
    const issueResDurationSum = this.sum(data.issue_resolution_duration);
    const prResDurationSum = this.sum(data.change_request_resolution_duration);

    // 计算趋势（平均增长率）
    const trendIssue = this.calculateGrowthRate(data.issues_new);
    const trendPr = this.calculateGrowthRate(data.change_requests);
    const trendDev = this.calculateGrowthRate(data.new_contributors);
    const trendRaw = 0.4 * trendIssue + 0.4 * trendPr + 0.2 * trendDev;

    // 计算四个维度原始值
    const influenceRaw =
      0.25 * starsSum +
      0.25 * forkSum +
      0.30 * issueNewSum +
      0.20 * changeRequestsSum;

    // 社区反应 - 完整计算（PDF标准）
    // 先归一化时间指标
    const issueResNorm = this.normalizeWithBaseline(issueResDurationSum, 'issue_resolution_duration_sum');
    const prResNorm = this.normalizeWithBaseline(prResDurationSum, 'change_request_resolution_duration_sum');

    const reactionRaw =
      0.5 * issuesClosedSum +
      0.2 * changeRequestsAcceptedSum +
      0.2 * (1 - issueResNorm) +  // 反向评分：越小越好
      0.1 * (1 - prResNorm);       // 反向评分：越小越好

    const developerRaw =
      0.4 * issueNewSum +
      0.3 * changeRequestsSum +
      0.3 * newContributorsSum;

    // 使用baseline归一化
    const infNorm = this.normalizeWithBaseline(influenceRaw, 'influence_raw');
    const reactNorm = this.normalizeWithBaseline(reactionRaw, 'reaction_raw');
    const devNorm = this.normalizeWithBaseline(developerRaw, 'developer_raw');
    const trendNorm = this.normalizeWithBaseline(trendRaw, 'trend_raw');

    // 平方根平滑
    const infSmooth = Math.sqrt(Math.max(0, infNorm));
    const reactSmooth = Math.sqrt(Math.max(0, reactNorm));
    const devSmooth = Math.sqrt(Math.max(0, devNorm));
    const trendSmooth = Math.sqrt(Math.max(0, trendNorm));

    // 加权合成
    const combined =
      0.3 * infSmooth +
      0.2 * reactSmooth +
      0.2 * devSmooth +
      0.3 * trendSmooth;

    return {
      github_index: 60 + 40 * combined,
      influence_index: infSmooth * 100,
      reaction_index: reactSmooth * 100,
      developer_index: devSmooth * 100,
      trend_index: trendSmooth * 100
    };
  }

  /**
   * 工具函数：保留两位小数
   */
  round2(value) {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Math.round(value * 100) / 100;
  }

  /**
   * 工具函数：格式化时间序列对象（所有值保留两位小数）
   */
  formatTimeSeries(series) {
    const formatted = {};
    Object.keys(series).forEach(key => {
      formatted[key] = this.round2(series[key]);
    });
    return formatted;
  }

  /**
   * 工具函数：求和
   */
  sum(series) {
    return Object.values(series).reduce((a, b) => a + b, 0);
  }

  /**
   * 工具函数：平均值
   */
  calculateAverage(series) {
    const values = Object.values(series).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * 工具函数：计算增长率
   */
  calculateGrowthRate(series) {
    const growthRates = [];
    for (let i = 1; i < this.timeRange.length; i++) {
      const prev = series[this.timeRange[i - 1]];
      const curr = series[this.timeRange[i]];
      if (prev !== null && prev !== 0 && curr !== null) {
        growthRates.push((curr - prev) / prev);
      }
    }
    return growthRates.length > 0
      ? growthRates.reduce((a, b) => a + b, 0) / growthRates.length
      : 0;
  }

  /**
   * Log压缩
   */
  logCompress(series) {
    const result = {};
    Object.keys(series).forEach(key => {
      const val = series[key];
      result[key] = val !== null && !isNaN(val) ? Math.log1p(val) : 0;
    });
    return result;
  }

  /**
   * 反向评分（越小越好的指标）
   */
  reverseScore(series) {
    const normalized = this.minMaxNormSeries(series);
    const reversed = {};
    Object.keys(normalized).forEach(key => {
      reversed[key] = 1 - normalized[key];
    });
    return reversed;
  }

  /**
   * Min-Max归一化（对时间序列）
   */
  minMaxNormSeries(series) {
    const values = Object.values(series).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) {
      const result = {};
      Object.keys(series).forEach(key => result[key] = 0);
      return result;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    const normalized = {};
    Object.keys(series).forEach(key => {
      if (series[key] !== null && !isNaN(series[key])) {
        normalized[key] = max === min ? 0 : (series[key] - min) / (max - min);
      } else {
        normalized[key] = 0;
      }
    });

    return normalized;
  }

  /**
   * 标准化归一化（z-score + min-max）
   */
  stdNorm(series) {
    const values = Object.values(series).filter(v => v !== null && !isNaN(v));
    if (values.length === 0) {
      const result = {};
      Object.keys(series).forEach(key => result[key] = 0);
      return result;
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);

    const zScores = {};
    Object.keys(series).forEach(key => {
      if (series[key] !== null && !isNaN(series[key])) {
        zScores[key] = std !== 0 ? (series[key] - mean) / std : 0;
      } else {
        zScores[key] = 0;
      }
    });

    // 再做一次min-max
    return this.minMaxNormSeries(zScores);
  }

  /**
   * 使用baseline归一化 - 支持不同的baseline类型
   * @param {number} value - 要归一化的值
   * @param {string} dimension - 维度名称
   * @param {string} baselineType - baseline类型 ('github_raw_baseline' 或 'prei_raw_baseline')
   */
  normalizeWithBaseline(value, dimension, baselineType = 'github_raw_baseline') {
    const baseline = this.baseline[baselineType]?.[dimension];
    if (!baseline) {
      console.warn(`⚠️ Baseline未找到: ${baselineType}.${dimension}`);
      return 0;
    }

    const { min, max } = baseline;
    if (max === min) return 0;

    const normalized = (value - min) / (max - min);
    return Math.max(0, Math.min(1, normalized)); // 限制在0-1之间
  }

  /**
   * 加载到数据库 - 匹配实际表结构
   */
  async loadToDatabase(data) {
    const sql = `
      INSERT INTO github (
        company_name, project_name,
        openrank_avg,
        github, influence, response, activity, trend,
        prei_response_index, prei_merge_index, prei_review_index, prei_accept_index, prei,
        openrank, project_activity, developer_activity, project_attention
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      data.company,
      data.project,
      data.openrank_avg.toString(),
      data.github_index.toString(),
      data.influence_index.toString(),
      data.reaction_index.toString(),
      data.developer_index.toString(),
      data.trend_index.toString(),
      JSON.stringify(data.pr_response_score),
      JSON.stringify(data.pr_resolution_score),
      JSON.stringify(data.pr_review_score),
      JSON.stringify(data.pr_accept_score),
      JSON.stringify(data.pr_efficiency_index),
      JSON.stringify(data.openrank),
      JSON.stringify(data.project_activity_index),
      JSON.stringify(data.developer_activity_index),
      JSON.stringify(data.attention_index)
    ]);

    console.log('✅ 数据已成功插入数据库');
  }
}

module.exports = ETLProcessor;
