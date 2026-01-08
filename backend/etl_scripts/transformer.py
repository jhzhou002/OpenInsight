"""
数据转换模块
对应PDF文档：四节（缺失值处理）
"""
import pandas as pd
from typing import Dict
from tqdm import tqdm
from config import ETLConfig


class DataTransformer:
    """数据转换器"""

    def __init__(self, config: ETLConfig):
        self.config = config

    def align_and_fill(self, trimmed_data: Dict[str, Dict]) -> pd.DataFrame:
        """
        Time alignment and missing value handling (PDF Step 4)

        Missing value strategy:
        1. If project not published before 2021-01, fill with 0
        2. If data exists in 2021-01, fill missing months with previous month data

        Args:
            trimmed_data: Trimmed data

        Returns:
            Long format DataFrame
            columns: ['company', 'project', 'metric', 'date', 'value']
        """
        print(f"\n [Step 4] Aligning data and filling missing values...")

        rows = []

        for proj_key, metrics in tqdm(trimmed_data.items(), desc="    Processing"):
            company, project = proj_key.split('/')

            for metric_name, metric_data in metrics.items():
                # Align time series
                aligned = self._align_time_series(metric_data, metric_name)

                # Convert to row record
                for date, value in aligned.items():
                    rows.append({
                        'company': company,
                        'project': project,
                        'metric': metric_name,
                        'date': date,
                        'value': value
                    })

        df = pd.DataFrame(rows)
        print(f"     Alignment completed, total {len(df)} records")
        return df

    def _align_time_series(self, data: Dict, metric_name: str) -> Dict:
        """
        对齐单个时间序列并填充缺失值

        Args:
            data: 时间序列数据
            metric_name: 指标名称

        Returns:
            对齐后的时间序列
        """
        aligned = {}

        # 找到第一个有数据的月份
        first_data_month = None
        for month in self.config.time_range:
            if month in data and data[month] is not None:
                first_data_month = month
                break

        # 遍历所有月份
        for i, month in enumerate(self.config.time_range):
            if month in data and data[month] is not None:
                # 有数据，直接使用
                aligned[month] = float(data[month])
            else:
                # 缺失数据
                if first_data_month is None or month < first_data_month:
                    # 策略1：项目还未发布，填充0
                    aligned[month] = 0.0
                else:
                    # 策略2：项目已存在，使用前一个月数据填充
                    if i > 0:
                        prev_month = self.config.time_range[i - 1]
                        aligned[month] = aligned.get(prev_month, 0.0)
                    else:
                        aligned[month] = 0.0

        return aligned
