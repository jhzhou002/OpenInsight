"""
指标计算模块
对应PDF文档：五节（聚合指标计算）
"""
import pandas as pd
import numpy as np
from typing import Dict, Tuple
from config import ETLConfig


class MetricsCalculator:
    """指标计算器"""

    def __init__(self, config: ETLConfig):
        self.config = config

    def calculate_all_metrics(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """
        计算所有聚合指标（PDF步骤5）

        Args:
            df: 长表格式的数据

        Returns:
            (final_df, baseline)
            - final_df: 包含所有计算结果的DataFrame
            - baseline: baseline配置字典
        """
        print(f"\n [Step 5] 计算聚合指标...")

        # 转为宽表
        df_wide = df.pivot_table(
            index=['company', 'project', 'date'],
            columns='metric',
            values='value',
            aggfunc='first'
        ).reset_index()

        print(f"    计算月度指标...")
        # 5.1-5.4 月度指标
        df_wide = self._calculate_monthly_metrics(df_wide)

        print(f"    计算GitHub指数...")
        # 5.5 GitHub指数（项目级）
        github_df, github_baseline = self._calculate_github_index(df_wide)

        print(f"    计算PREI baseline...")
        # 计算PREI baseline
        prei_baseline = self._calculate_prei_baseline(df_wide)

        # 合并数据
        final_df = df_wide.merge(
            github_df,
            on=['company', 'project'],
            how='left'
        )

        # 构建baseline
        baseline = {
            'github_raw_baseline': github_baseline,
            'prei_raw_baseline': prei_baseline
        }

        print(f"     指标计算完成")
        return final_df, baseline

    def _calculate_monthly_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """计算月度指标"""

        # 5.1 项目活跃度
        df['project_activity_index'] = (
            0.4 * df['issues_new'].fillna(0) +
            0.4 * df['change_requests'].fillna(0) +
            0.1 * df['issue_comments'].fillna(0) +
            0.1 * df['change_requests_reviews'].fillna(0)
        )

        # 5.2 开发者活跃度
        df['developer_activity_index'] = (
            0.5 * df['new_contributors'].fillna(0) +
            0.3 * (df['issue_comments'].fillna(0) + df['change_requests_reviews'].fillna(0)) +
            0.2 * (df['issues_new'].fillna(0) + df['change_requests'].fillna(0))
        )

        # 5.3 关注度
        df['attention_index'] = (
            0.4 * df['stars'].fillna(0) +
            0.6 * df['technical_fork'].fillna(0)
        )

        # 5.4 PREI及四个维度
        df = self._calculate_prei(df)

        return df

    def _calculate_prei(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        计算PREI及四个维度（PDF 5.4节）
        """
        # 1. 响应效率
        resp_time = df['change_request_response_time'].fillna(0)
        resp_log = np.log1p(resp_time)
        resp_raw = self._reverse_score(resp_log)
        df['pr_response_score'] = self._std_norm(resp_raw) * 100

        # 2. 处理效率
        res_time = df['change_request_resolution_duration'].fillna(0)
        res_log = np.log1p(res_time)
        res_raw = self._reverse_score(res_log)
        df['pr_resolution_score'] = self._std_norm(res_raw) * 100

        # 3. 审阅充分度
        review_intensity = df['change_requests_reviews'].fillna(0) / df['change_requests'].replace(0, np.nan).fillna(1)
        df['pr_review_score'] = self._std_norm(review_intensity) * 100

        # 4. 接受率
        accept_rate = df['change_requests_accepted'].fillna(0) / df['change_requests'].replace(0, np.nan).fillna(1)
        df['pr_accept_score'] = self._std_norm(accept_rate) * 100

        # 5. PREI综合指数（先不归一化，等后面统一处理）
        prei_raw = (
            0.35 * (df['pr_response_score'] / 100) +
            0.35 * (df['pr_resolution_score'] / 100) +
            0.15 * (df['pr_review_score'] / 100) +
            0.15 * (df['pr_accept_score'] / 100)
        )

        # 归一化PREI_raw
        prei_norm = self._min_max_norm(prei_raw)

        # 功效系数
        df['pr_efficiency_index'] = 60 + 40 * prei_norm

        return df

    def _calculate_github_index(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """
        计算GitHub指数及四个维度（PDF 5.5节）
        完整版：包含时间指标的社区反应维度

        Returns:
            (github_df, baseline)
        """
        # 按项目聚合
        grouped = df.groupby(['company', 'project'])

        results = []
        time_sums = {
            'issue_resolution_duration_sum': [],
            'change_request_resolution_duration_sum': []
        }

        # 第一遍：计算所有维度的原始值
        for (company, project), group in grouped:
            influence_raw = self._calc_influence(group)
            reaction_base, issue_res_sum, pr_res_sum = self._calc_reaction(group)
            developer_raw = self._calc_developer(group)
            trend_raw = self._calc_trend(group)

            results.append({
                'company': company,
                'project': project,
                'influence_raw': influence_raw,
                'reaction_base': reaction_base,
                'issue_res_sum': issue_res_sum,
                'pr_res_sum': pr_res_sum,
                'developer_raw': developer_raw,
                'trend_raw': trend_raw
            })

            time_sums['issue_resolution_duration_sum'].append(issue_res_sum)
            time_sums['change_request_resolution_duration_sum'].append(pr_res_sum)

        result_df = pd.DataFrame(results)

        # 第二遍：归一化时间指标
        issue_res_norm = self._min_max_norm(result_df['issue_res_sum'])
        pr_res_norm = self._min_max_norm(result_df['pr_res_sum'])

        # 完整的社区反应维度（PDF标准）
        result_df['reaction_raw'] = (
            result_df['reaction_base'] +
            0.2 * (1 - issue_res_norm) +  # 反向评分：越小越好
            0.1 * (1 - pr_res_norm)        # 反向评分：越小越好
        )

        # 生成baseline（记录所有维度的min/max，共14个字段）
        baseline = {
            'influence_raw': {
                'min': float(result_df['influence_raw'].min()),
                'max': float(result_df['influence_raw'].max())
            },
            'reaction_raw': {
                'min': float(result_df['reaction_raw'].min()),
                'max': float(result_df['reaction_raw'].max())
            },
            'developer_raw': {
                'min': float(result_df['developer_raw'].min()),
                'max': float(result_df['developer_raw'].max())
            },
            'trend_raw': {
                'min': float(result_df['trend_raw'].min()),
                'max': float(result_df['trend_raw'].max())
            },
            # 时间指标的baseline（用于单个项目计算，使用简短命名）
            'issue_resolution': {
                'min': float(result_df['issue_res_sum'].min()),
                'max': float(result_df['issue_res_sum'].max())
            },
            'pr_resolution': {
                'min': float(result_df['pr_res_sum'].min()),
                'max': float(result_df['pr_res_sum'].max())
            }
        }

        # 归一化四个维度
        for dim in ['influence_raw', 'reaction_raw', 'developer_raw', 'trend_raw']:
            result_df[f'{dim}_norm'] = self._min_max_norm(result_df[dim])

        # 平方根平滑
        result_df['influence_smooth'] = np.sqrt(result_df['influence_raw_norm'].clip(0, 1))
        result_df['reaction_smooth'] = np.sqrt(result_df['reaction_raw_norm'].clip(0, 1))
        result_df['developer_smooth'] = np.sqrt(result_df['developer_raw_norm'].clip(0, 1))
        result_df['trend_smooth'] = np.sqrt(result_df['trend_raw_norm'].clip(0, 1))

        # 步骤3: 用平滑值加权计算综合得分 Github_raw（PDF步骤3）
        result_df['github_raw'] = (
            0.3 * result_df['influence_smooth'] +
            0.2 * result_df['reaction_smooth'] +
            0.2 * result_df['developer_smooth'] +
            0.3 * result_df['trend_smooth']
        )

        # 添加 github_raw 到 baseline（PDF要求）
        baseline['github_raw'] = {
            'min': float(result_df['github_raw'].min()),
            'max': float(result_df['github_raw'].max())
        }

        # 步骤4: 对 Github_raw 再做一次 Min-Max 归一化，然后做功效系数（PDF步骤4）
        github_norm = self._min_max_norm(result_df['github_raw'])
        result_df['github_index'] = 60 + 40 * github_norm

        # 步骤5: 为展示效果，对四个维度的平滑结果再归一化并做功效系数（PDF步骤5）
        # 这仅用于展示，不影响综合得分计算
        influence_display_norm = self._min_max_norm(result_df['influence_smooth'])
        reaction_display_norm = self._min_max_norm(result_df['reaction_smooth'])
        developer_display_norm = self._min_max_norm(result_df['developer_smooth'])
        trend_display_norm = self._min_max_norm(result_df['trend_smooth'])

        result_df['influence_index'] = 60 + 40 * influence_display_norm
        result_df['reaction_index'] = 60 + 40 * reaction_display_norm
        result_df['developer_index'] = 60 + 40 * developer_display_norm
        result_df['trend_index'] = 60 + 40 * trend_display_norm

        # 保留需要的列
        github_df = result_df[[
            'company', 'project',
            'github_index', 'influence_index', 'reaction_index',
            'developer_index', 'trend_index'
        ]].copy()

        return github_df, baseline

    def _calc_influence(self, group: pd.DataFrame) -> float:
        """计算影响力维度"""
        return (
            0.25 * group['stars'].sum() +
            0.25 * group['technical_fork'].sum() +
            0.30 * group['issues_new'].sum() +
            0.20 * group['change_requests'].sum()
        )

    def _calc_reaction(self, group: pd.DataFrame) -> Tuple[float, float, float]:
        """
        计算社区反应维度（完整版，包含时间指标）

        Returns:
            (reaction_raw, issue_res_sum, pr_res_sum)
            返回原始值和两个时间指标总和，用于后续归一化
        """
        issues_closed_sum = group['issues_closed'].sum()
        pr_accepted_sum = group['change_requests_accepted'].sum()

        # 时间指标总和（用于归一化）
        issue_res_sum = group['issue_resolution_duration'].sum()
        pr_res_sum = group['change_request_resolution_duration'].sum()

        # 先返回基础部分，时间指标部分在归一化后加入
        reaction_base = 0.5 * issues_closed_sum + 0.2 * pr_accepted_sum

        return reaction_base, issue_res_sum, pr_res_sum

    def _calc_developer(self, group: pd.DataFrame) -> float:
        """计算开发活跃度维度"""
        return (
            0.4 * group['issues_new'].sum() +
            0.3 * group['change_requests'].sum() +
            0.3 * group['new_contributors'].sum()
        )

    def _calc_trend(self, group: pd.DataFrame) -> float:
        """计算发展趋势维度"""
        issue_trend = self._calc_growth_rate(group['issues_new'])
        pr_trend = self._calc_growth_rate(group['change_requests'])
        dev_trend = self._calc_growth_rate(group['new_contributors'])

        return 0.4 * issue_trend + 0.4 * pr_trend + 0.2 * dev_trend

    def _calc_growth_rate(self, series: pd.Series) -> float:
        """计算增长率"""
        values = series.values
        if len(values) < 2:
            return 0.0

        growth_rates = []
        for i in range(1, len(values)):
            if values[i - 1] != 0:
                rate = (values[i] - values[i - 1]) / values[i - 1]
                if not np.isnan(rate) and not np.isinf(rate):
                    growth_rates.append(rate)

        return np.mean(growth_rates) if growth_rates else 0.0

    def _calculate_prei_baseline(self, df: pd.DataFrame) -> Dict:
        """
        计算PREI baseline（用于新项目归一化）
        """
        prei_raw = (
            0.35 * (df['pr_response_score'] / 100) +
            0.35 * (df['pr_resolution_score'] / 100) +
            0.15 * (df['pr_review_score'] / 100) +
            0.15 * (df['pr_accept_score'] / 100)
        )

        return {
            'prei_raw': {
                'min': float(prei_raw.min()),
                'max': float(prei_raw.max())
            }
        }

    # ========== 工具函数 ==========

    def _min_max_norm(self, series: pd.Series) -> pd.Series:
        """Min-Max归一化"""
        min_val = series.min()
        max_val = series.max()
        if max_val == min_val:
            return pd.Series(0, index=series.index)
        return (series - min_val) / (max_val - min_val)

    def _reverse_score(self, series: pd.Series) -> pd.Series:
        """反向评分（越小越好）"""
        normalized = self._min_max_norm(series)
        return 1 - normalized

    def _std_norm(self, series: pd.Series) -> pd.Series:
        """标准化归一化（z-score + min-max）"""
        if len(series) == 0:
            return series

        mean = series.mean()
        std = series.std()

        if std == 0:
            return pd.Series(0, index=series.index)

        z_scores = (series - mean) / std
        return self._min_max_norm(z_scores)
