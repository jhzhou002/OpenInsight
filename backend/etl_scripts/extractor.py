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
        
        # 忽略系统代理配置，避免本地代理设置导致连接失败
        self.session.trust_env = False

    def fetch_top_projects(self) -> List[Dict]:
        """
        Fetch Top300 projects info (PDF Step 1)

        Returns:
            List of projects, each containing {repo_name, company, rank}
        """
        print(f"\n[Step 1] Fetching Top300 projects info...")
        print(f"    URL: {self.config.leaderboard_url}")

        try:
            response = self.session.get(self.config.leaderboard_url, timeout=30, verify=False)
            response.raise_for_status()
            data = response.json()

            projects = []
            for entry in data.get('data', []):
                item = entry.get('item', {})
                repo_name = item.get('name', '')  # Format: "company/project"
                rank = entry.get('rank', 0)

                # Split company and project from repo_name
                if repo_name and '/' in repo_name:
                    company, project = repo_name.split('/', 1)
                    projects.append({
                        'repo_name': repo_name,
                        'company': company,
                        'rank': rank
                    })

            print(f"     Successfully fetched {len(projects)} projects")
            return projects

        except Exception as e:
            print(f"     Fetch failed: {e}")
            raise

    def fetch_all_metrics(self, projects: List[Dict]) -> Dict[str, Dict]:
        """
        Fetch metrics data for all projects (PDF Step 2)

        Args:
            projects: List of projects

        Returns:
            {
                'company/project': {
                    'issues_new': {...},
                    'stars': {...},
                    ...
                }
            }
        """
        print(f"\n[Step 2] Downloading metrics data for all projects...")
        print(f"    Metrics count: {len(self.config.METRICS)}")
        print(f"    Projects count: {len(projects)}")
        print(f"    Concurrency: {self.config.max_workers}")

        all_data = {}
        total_tasks = len(projects) * len(self.config.METRICS)

        with ThreadPoolExecutor(max_workers=self.config.max_workers) as executor:
            # Submit all tasks
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

            # Use tqdm to show progress
            with tqdm(total=total_tasks, desc="    Downloading") as pbar:
                for future in as_completed(future_to_task):
                    proj_key, metric = future_to_task[future]
                    try:
                        data = future.result()
                        all_data[proj_key][metric] = data
                    except Exception as e:
                        all_data[proj_key][metric] = None
                    pbar.update(1)

        print(f"     Download completed")
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
        Trim data (PDF Step 3)
        - Category data: keep only YYYY-MM: value
        - Time data: keep only 'avg' field YYYY-MM: value

        Args:
            all_data: Raw data

        Returns:
            Trimmed data
        """
        print(f"\n[Step 3] Trimming data...")
        print(f"    Time range: {self.config.time_start} ~ {self.config.time_end}")

        trimmed_data = {}

        for proj_key, metrics in tqdm(all_data.items(), desc="    Processing"):
            trimmed_data[proj_key] = {}

            for metric_name, metric_data in metrics.items():
                if metric_data is None:
                    trimmed_data[proj_key][metric_name] = {}
                    continue

                # Category metrics
                if metric_name in self.config.CATEGORY_METRICS:
                    trimmed_data[proj_key][metric_name] = self._trim_category(metric_data)

                # Time metrics
                elif metric_name in self.config.TIME_METRICS:
                    trimmed_data[proj_key][metric_name] = self._trim_time(metric_data)

        print(f"     Trimming completed")
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
