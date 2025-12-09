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
        时间对齐和缺失值处理（PDF步骤4）

        缺失值处理策略：
        1. 如果项目2021-01之后才发布，前面月份用0填充
        2. 如果2021-01有数据，中间缺失月份用前一个月数据填充

        Args:
            trimmed_data: 裁剪后的数据

        Returns:
            长表格式的DataFrame
            columns: ['company', 'project', 'metric', 'date', 'value']
        """
        print(f"\n [Step 4] 数据对齐与缺失值处理...")

        rows = []

        for proj_key, metrics in tqdm(trimmed_data.items(), desc="    处理项目"):
            company, project = proj_key.split('/')

            for metric_name, metric_data in metrics.items():
                # 对齐时间轴
                aligned = self._align_time_series(metric_data, metric_name)

                # 转换为行记录
                for date, value in aligned.items():
                    rows.append({
                        'company': company,
                        'project': project,
                        'metric': metric_name,
                        'date': date,
                        'value': value
                    })

        df = pd.DataFrame(rows)
        print(f"     对齐完成，共 {len(df)} 条记录")
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
