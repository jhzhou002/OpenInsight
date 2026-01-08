"""
ETL配置管理
根据PDF文档标准
"""
import os
from typing import List

class ETLConfig:
    """ETL配置类"""

    # 14个核心指标（PDF文档2.1节）
    METRICS = [
        'issues_new',                           # 分类
        'issues_closed',                        # 分类
        'issue_comments',                       # 分类
        'issue_resolution_duration',            # 时间
        'change_requests',                      # 分类
        'change_requests_reviews',              # 分类
        'change_requests_accepted',             # 分类
        'change_request_response_time',         # 时间
        'change_request_resolution_duration',   # 时间
        'stars',                                # 分类
        'technical_fork',                       # 分类
        'new_contributors',                     # 分类
        'openrank',                             # 分类
        'activity'                              # 分类（用于排序）
    ]

    # 分类指标（只保留YYYY-MM: value）
    CATEGORY_METRICS = [
        'issues_new',
        'issues_closed',
        'issue_comments',
        'change_requests',
        'change_requests_reviews',
        'change_requests_accepted',
        'stars',
        'technical_fork',
        'new_contributors',
        'openrank',
        'activity'
    ]

    # 时间指标（保留avg字段，删除分位数和levels）
    TIME_METRICS = [
        'issue_resolution_duration',
        'change_request_response_time',
        'change_request_resolution_duration'
    ]

    def __init__(self, time_start: str = '2021-01', time_end: str = '2025-10'):
        """
        初始化配置

        Args:
            time_start: 数据起始月份，格式：YYYY-MM
            time_end: 数据结束月份，格式：YYYY-MM
        """
        self.time_start = time_start
        self.time_end = time_end

        # OpenDigger数据源
        self.opendigger_base = "https://oss.open-digger.cn/github"
        self.leaderboard_url = "https://oss.x-lab.info/open_leaderboard/open_rank/repo/global/2025.json"

        # 数据库配置（从环境变量读取）
        self.db_config = {
            'host': os.getenv('DB_HOST', '49.235.74.98'),
            'user': os.getenv('DB_USER', 'remote'),
            'password': os.getenv('DB_PASSWORD', 'Zhjh0704.'),
            'database': os.getenv('DB_NAME', 'opendigger'),
            'charset': 'utf8mb4'
        }

        # 并发配置
        self.max_workers = 20  # 并发下载线程数
        self.timeout = 10      # 请求超时时间（秒）

        # 生成时间范围
        self.time_range = self._generate_time_range()

    def _generate_time_range(self) -> List[str]:
        """
        生成时间范围数组

        Returns:
            时间范围列表，如 ['2021-01', '2021-02', ...]
        """
        start_year, start_month = map(int, self.time_start.split('-'))
        end_year, end_month = map(int, self.time_end.split('-'))

        time_range = []
        for year in range(start_year, end_year + 1):
            month_start = start_month if year == start_year else 1
            month_end = end_month if year == end_year else 12

            for month in range(month_start, month_end + 1):
                time_range.append(f"{year}-{month:02d}")

        return time_range

    def get_metric_url(self, company: str, project: str, metric: str) -> str:
        """
        构建指标数据URL

        Args:
            company: 公司名
            project: 项目名
            metric: 指标名

        Returns:
            完整的URL
        """
        return f"{self.opendigger_base}/{company}/{project}/{metric}.json"
