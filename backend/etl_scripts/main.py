"""
ETL主流程脚本
完全按照PDF文档标准流程实现
"""
import sys
import json
import time
from datetime import datetime

from config import ETLConfig
from extractor import DataExtractor
from transformer import DataTransformer
from calculator import MetricsCalculator
from loader import DataLoader


def main(time_start: str = '2021-01', time_end: str = '2025-10'):
    """
    执行完整的ETL流程

    Args:
        time_start: 数据起始月份
        time_end: 数据结束月份

    Returns:
        执行结果字典
    """
    start_time = time.time()

    print("=" * 60)
    print("OpenDigger Top300项目 全量ETL")
    print(f"时间范围: {time_start} ~ {time_end}")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    try:
        # 初始化配置
        config = ETLConfig(time_start, time_end)

        # Step 1: 获取Top300项目信息
        extractor = DataExtractor(config)
        projects = extractor.fetch_top_projects()

        if not projects:
            raise Exception("未获取到项目列表")

        # Step 2: 下载所有指标数据
        all_data = extractor.fetch_all_metrics(projects)

        # Step 3: 裁剪数据
        trimmed_data = extractor.trim_data(all_data)

        # Step 4: 数据对齐与缺失值处理
        transformer = DataTransformer(config)
        df_long = transformer.align_and_fill(trimmed_data)

        # Step 5: 计算聚合指标 & Step 6: 生成baseline
        calculator = MetricsCalculator(config)
        df_final, baseline = calculator.calculate_all_metrics(df_long)

        # Step 7: 加载到数据库
        loader = DataLoader(config)
        loader.truncate_and_load(df_final, baseline)

        # 统计信息
        elapsed_time = time.time() - start_time
        minutes = int(elapsed_time // 60)
        seconds = int(elapsed_time % 60)

        print("\n" + "=" * 60)
        print(" ETL处理完成!")
        print(f"处理项目数: {len(projects)}")
        print(f"总记录数: {len(df_final)}")
        print(f"耗时: {minutes}分{seconds}秒")
        print(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)

        return {
            'success': True,
            'message': 'ETL处理成功',
            'data': {
                'projects_count': len(projects),
                'records_count': len(df_final),
                'elapsed_time': f"{minutes}分{seconds}秒"
            }
        }

    except Exception as e:
        elapsed_time = time.time() - start_time
        minutes = int(elapsed_time // 60)
        seconds = int(elapsed_time % 60)

        print("\n" + "=" * 60)
        print(f" ETL处理失败: {e}")
        print(f"耗时: {minutes}分{seconds}秒")
        print("=" * 60)

        import traceback
        traceback.print_exc()

        return {
            'success': False,
            'message': f'ETL处理失败: {str(e)}',
            'error': str(e)
        }


if __name__ == "__main__":
    # 从命令行参数读取配置
    if len(sys.argv) >= 3:
        time_start = sys.argv[1]
        time_end = sys.argv[2]
    else:
        time_start = '2021-01'
        time_end = '2025-10'

    result = main(time_start, time_end)

    # 输出JSON结果（供Node.js读取）
    print("\n" + "=" * 60)
    print("ETL_RESULT_JSON:")
    print(json.dumps(result, ensure_ascii=False))
    print("=" * 60)

    # 设置退出码
    sys.exit(0 if result['success'] else 1)
