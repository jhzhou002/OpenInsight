"""
数据加载模块
对应PDF文档：导入数据库
"""
import pymysql
import json
from typing import Dict
import pandas as pd
from config import ETLConfig


class DataLoader:
    """数据加载器"""

    def __init__(self, config: ETLConfig):
        self.config = config
        self.connection = None

    def connect(self):
        """连接数据库"""
        self.connection = pymysql.connect(**self.config.db_config)
        self.connection.autocommit = False

    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()

    def truncate_and_load(self, df: pd.DataFrame, baseline: Dict):
        """
        Clear and load data (Step 7)
        Includes backup mechanism for rollback support.

        Args:
            df: DataFrame containing all calculation results
            baseline: baseline configuration dictionary
        """
        print(f"\n [Step 7] Loading data into database...")

        try:
            self.connect()
            cursor = self.connection.cursor()

            # 1. Backup github table
            print(f"    Backing up github table...")
            cursor.execute("DROP TABLE IF EXISTS github_backup")
            cursor.execute("CREATE TABLE github_backup LIKE github")
            cursor.execute("INSERT INTO github_backup SELECT * FROM github")

            # 2. Clear github table
            print(f"    Clearing github table...")
            cursor.execute("TRUNCATE TABLE github")

            # 3. Update baseline config
            print(f"    Updating baseline config...")
            cursor.execute(
                "UPDATE baseline_config SET baseline = %s WHERE id = 1",
                (json.dumps(baseline),)
            )

            # 4. Batch insert data
            print(f"    Batch inserting project data...")
            self._batch_insert(cursor, df)

            # 5. Commit transaction
            self.connection.commit()
            print(f"     Data loading completed")

        except Exception as e:
            if self.connection:
                self.connection.rollback()
            print(f"     Loading failed: {e}")
            raise
        finally:
            self.close()

    def rollback(self):
        """
        Rollback data from backup table
        """
        print(f"\n [Rollback] Restoring data from backup...")
        try:
            self.connect()
            cursor = self.connection.cursor()

            # Check if backup exists
            cursor.execute("SHOW TABLES LIKE 'github_backup'")
            if not cursor.fetchone():
                print("    No backup found!")
                return False

            # Restore data
            print(f"    Restoring data...")
            cursor.execute("TRUNCATE TABLE github")
            cursor.execute("INSERT INTO github SELECT * FROM github_backup")
            
            self.connection.commit()
            print(f"    Rollback completed successfully")
            return True

        except Exception as e:
            if self.connection:
                self.connection.rollback()
            print(f"    Rollback failed: {e}")
            return False
        finally:
            self.close()

    def _batch_insert(self, cursor, df: pd.DataFrame):
        """
        批量插入数据

        Args:
            cursor: 数据库游标
            df: 数据框
        """
        # 按项目分组
        grouped = df.groupby(['company', 'project'])

        insert_sql = """
            INSERT INTO github (
                company_name, project_name,
                openrank_avg,
                github, influence, response, activity, trend,
                prei_response_index, prei_merge_index, prei_review_index,
                prei_accept_index, prei,
                openrank, project_activity, developer_activity, project_attention
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """

        batch_data = []
        batch_size = 100

        for (company, project), group in grouped:
            # 计算openrank平均值
            openrank_avg = group['openrank'].mean()

            # GitHub指数（项目级，只有一个值）
            github_index = group['github_index'].iloc[0] if 'github_index' in group.columns else 0
            influence = group['influence_index'].iloc[0] if 'influence_index' in group.columns else 0
            reaction = group['reaction_index'].iloc[0] if 'reaction_index' in group.columns else 0
            developer = group['developer_index'].iloc[0] if 'developer_index' in group.columns else 0
            trend = group['trend_index'].iloc[0] if 'trend_index' in group.columns else 0

            # 月度指标（时间序列）
            prei_response = self._to_json(group, 'pr_response_score')
            prei_merge = self._to_json(group, 'pr_resolution_score')
            prei_review = self._to_json(group, 'pr_review_score')
            prei_accept = self._to_json(group, 'pr_accept_score')
            prei = self._to_json(group, 'pr_efficiency_index')
            openrank = self._to_json(group, 'openrank')
            project_activity = self._to_json(group, 'project_activity_index')
            developer_activity = self._to_json(group, 'developer_activity_index')
            project_attention = self._to_json(group, 'attention_index')

            batch_data.append((
                company,
                project,
                f"{openrank_avg:.2f}",
                f"{github_index:.2f}",
                f"{influence:.2f}",
                f"{reaction:.2f}",
                f"{developer:.2f}",
                f"{trend:.2f}",
                prei_response,
                prei_merge,
                prei_review,
                prei_accept,
                prei,
                openrank,
                project_activity,
                developer_activity,
                project_attention
            ))

            # 批量提交
            if len(batch_data) >= batch_size:
                cursor.executemany(insert_sql, batch_data)
                batch_data = []

        # 提交剩余数据
        if batch_data:
            cursor.executemany(insert_sql, batch_data)

    def _to_json(self, group: pd.DataFrame, column: str) -> str:
        """
        将时间序列转换为JSON字符串

        Args:
            group: 项目分组数据
            column: 列名

        Returns:
            JSON字符串 {"2021-01": 123.45, ...}
        """
        if column not in group.columns:
            return json.dumps({})

        time_series = {}
        for _, row in group.iterrows():
            date = row['date']
            value = row[column]
            if pd.notna(value):
                time_series[date] = round(float(value), 2)

        return json.dumps(time_series, ensure_ascii=False)
