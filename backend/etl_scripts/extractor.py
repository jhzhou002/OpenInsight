"""
数据提取模块
对应PDF文档：一、二、三节
"""
import requests
import re
from typing import Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
from config import ETLConfig


class DataExtractor:
    """数据提取器"""

    def __init__(self, config: ETLConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        # 禁用SSL警告
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    def fetch_top_projects(self) -> List[Dict]:
        """
        获取Top300项目信息（PDF步骤1）

        Returns:
            项目列表，每个项目包含 {repo_name, company, rank}
        """
        print(f"\n[Step 1] 获取Top300项目信息...")
        print(f"    URL: {self.config.leaderboard_url}")

        try:
            response = self.session.get(self.config.leaderboard_url, timeout=30, verify=False)
            response.raise_for_status()
            data = response.json()

            projects = []
            for entry in data.get('data', []):
                item = entry.get('item', {})
                repo_name = item.get('name', '')  # 格式: "company/project"
                rank = entry.get('rank', 0)

                # 从repo_name中拆分company和project
                if repo_name and '/' in repo_name:
                    company, project = repo_name.split('/', 1)
                    projects.append({
                        'repo_name': repo_name,
                        'company': company,
                        'rank': rank
                    })

            print(f"     成功获取 {len(projects)} 个项目")
            return projects

        except Exception as e:
            print(f"     获取失败: {e}")
            raise

    def fetch_all_metrics(self, projects: List[Dict]) -> Dict[str, Dict]:
        """
        获取所有项目的指标数据（PDF步骤2）

        Args:
            projects: 项目列表

        Returns:
            {
                'company/project': {
                    'issues_new': {...},
                    'stars': {...},
                    ...
                }
            }
        """
        print(f"\n[Step 2] 下载所有项目的指标数据...")
        print(f"    指标数量: {len(self.config.METRICS)}")
        print(f"    项目数量: {len(projects)}")
        print(f"    并发数: {self.config.max_workers}")

        all_data = {}
        total_tasks = len(projects) * len(self.config.METRICS)

        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            # 提交所有任务
            future_to_task = {}
            for proj in projects:
                company = proj['company']
                project = proj['repo_name'].split('/')[-1]
                proj_key = f"{company}/{project}"
                all_data[proj_key] = {}

                for metric in self.config.METRICS:
                    future = executor.submit(
                        self._fetch_single_metric,
                        company, project, metric
                    )
                    future_to_task[future] = (proj_key, metric)

            # 使用tqdm显示进度
            with tqdm(total=total_tasks, desc="    下载进度") as pbar:
                for future in as_completed(future_to_task):
                    proj_key, metric = future_to_task[future]
                    try:
                        data = future.result()
                        all_data[proj_key][metric] = data
                    except Exception as e:
                        all_data[proj_key][metric] = None
                    pbar.update(1)

        print(f"     数据下载完成")
        return all_data

    def _fetch_single_metric(self, company: str, project: str, metric: str) -> Dict:
        """
        获取单个指标数据

        Args:
            company: 公司名
            project: 项目名
            metric: 指标名

        Returns:
            指标数据JSON
        """
        url = self.config.get_metric_url(company, project, metric)

        try:
            response = self.session.get(url, timeout=self.config.timeout, verify=False)
            response.raise_for_status()
            return response.json()
        except:
            return None

    def trim_data(self, all_data: Dict[str, Dict]) -> Dict[str, Dict]:
        """
        裁剪数据（PDF步骤3）
        - 分类数据：只保留YYYY-MM: value
        - 时间数据：只保留avg字段的YYYY-MM: value

        Args:
            all_data: 原始数据

        Returns:
            裁剪后的数据
        """
        print(f"\n[Step 3] 裁剪数据...")
        print(f"    时间范围: {self.config.time_start} ~ {self.config.time_end}")

        trimmed_data = {}

        for proj_key, metrics in tqdm(all_data.items(), desc="    处理项目"):
            trimmed_data[proj_key] = {}

            for metric_name, metric_data in metrics.items():
                if metric_data is None:
                    trimmed_data[proj_key][metric_name] = {}
                    continue

                # 分类指标
                if metric_name in self.config.CATEGORY_METRICS:
                    trimmed_data[proj_key][metric_name] = self._trim_category(metric_data)

                # 时间指标
                elif metric_name in self.config.TIME_METRICS:
                    trimmed_data[proj_key][metric_name] = self._trim_time(metric_data)

        print(f"     裁剪完成")
        return trimmed_data

    def _trim_category(self, data: Dict) -> Dict:
        """
        裁剪分类指标
        只保留YYYY-MM格式，且在时间范围内

        Args:
            data: 原始数据

        Returns:
            裁剪后的数据
        """
        trimmed = {}
        pattern = re.compile(r'^\d{4}-\d{2}$')

        for key, value in data.items():
            if pattern.match(key) and key in self.config.time_range:
                trimmed[key] = value

        return trimmed

    def _trim_time(self, data: Dict) -> Dict:
        """
        裁剪时间指标
        只保留avg字段的YYYY-MM数据

        Args:
            data: 原始数据（包含avg, quantile_0等字段）

        Returns:
            裁剪后的avg数据
        """
        if not isinstance(data, dict):
            return {}

        avg_data = data.get('avg', {})
        if not isinstance(avg_data, dict):
            return {}

        trimmed = {}
        pattern = re.compile(r'^\d{4}-\d{2}$')

        for key, value in avg_data.items():
            if pattern.match(key) and key in self.config.time_range:
                trimmed[key] = value

        return trimmed
