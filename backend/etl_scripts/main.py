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


def log_json(level: str, step: str, message: str, data: dict = None):
    """
    输出结构化JSON日志供Node.js解析

    Args:
        level: 日志级别 (info/warning/error)
        step: 执行步骤
        message: 日志消息
        data: 附加数据
    """
    log_entry = {
        'type': 'LOG',
        'level': level,
        'step': step,
        'message': message,
        'data': data or {},
        'timestamp': datetime.now().isoformat()
    }
    print(json.dumps(log_entry, ensure_ascii=False))
    sys.stdout.flush()


def log_progress(step: str, current: int, total: int, message: str = ''):
    """
    输出进度信息

    Args:
        step: 执行步骤
        current: 当前进度
        total: 总数
        message: 附加消息
    """
    progress = {
        'type': 'PROGRESS',
        'step': step,
        'current': current,
        'total': total,
        'percentage': round(current / total * 100, 2) if total > 0 else 0,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }
    print(json.dumps(progress, ensure_ascii=False))
    sys.stdout.flush()


def main(time_start: str = '2021-01', time_end: str = '2025-10', task_id: int = None):
    """
    执行完整的ETL流程

    Args:
        time_start: 数据起始月份
        time_end: 数据结束月份
        task_id: 任务ID（可选）

    Returns:
        执行结果字典
    """
    start_time = time.time()

    log_json('info', 'START', f'ETL Task Started', {'task_id': task_id, 'time_range': f'{time_start} ~ {time_end}'})

    try:
        # Initialize Config
        config = ETLConfig(time_start, time_end)
        log_json('info', 'CONFIG', 'Configuration initialized', {'time_range_months': len(config.time_range)})

        # Step 1: Fetch Top300 Projects
        log_json('info', 'STEP_1', 'Fetching Top300 projects info')
        extractor = DataExtractor(config)
        projects = extractor.fetch_top_projects()

        if not projects:
            raise Exception("No projects found")

        log_json('info', 'STEP_1', f'Successfully fetched {len(projects)} projects', {'count': len(projects)})
        log_progress('STEP_1', 1, 6, f'Step 1/6: Fetched {len(projects)} projects')

        # Step 2: Download all metrics
        log_json('info', 'STEP_2', f'Downloading metrics for {len(projects)} projects')
        all_data = extractor.fetch_all_metrics(projects)
        log_json('info', 'STEP_2', 'Metrics download completed')
        log_progress('STEP_2', 2, 6, 'Step 2/6: Download completed')

        # Step 3: Trim data
        log_json('info', 'STEP_3', 'Trimming data')
        trimmed_data = extractor.trim_data(all_data)
        log_json('info', 'STEP_3', 'Data trimming completed')
        log_progress('STEP_3', 3, 6, 'Step 3/6: Trimming completed')

        # Step 4: Align and fill
        log_json('info', 'STEP_4', 'Aligning data and filling missing values')
        transformer = DataTransformer(config)
        df_long = transformer.align_and_fill(trimmed_data)
        log_json('info', 'STEP_4', f'Data alignment completed, total {len(df_long)} records', {'records': len(df_long)})
        log_progress('STEP_4', 4, 6, f'Step 4/6: Aligned {len(df_long)} records')

        # Step 5 & 6: Calculate Metrics & Baseline
        log_json('info', 'STEP_5', 'Calculating aggregate metrics')
        calculator = MetricsCalculator(config)
        df_final, baseline = calculator.calculate_all_metrics(df_long)
        log_json('info', 'STEP_5', 'Metrics calculation completed, baseline generated')
        log_progress('STEP_5', 5, 6, 'Step 5/6: Metrics calculated')

        # Step 6: Load to Database
        log_json('info', 'STEP_6', 'Loading data into database')
        loader = DataLoader(config)
        loader.truncate_and_load(df_final, baseline)
        log_json('info', 'STEP_6', 'Data loading completed')
        log_progress('STEP_6', 6, 6, 'Step 6/6: Data loaded to database')

        # Stats
        elapsed_time = time.time() - start_time
        minutes = int(elapsed_time // 60)
        seconds = int(elapsed_time % 60)

        result = {
            'success': True,
            'message': 'ETL Processing Success',
            'data': {
                'projects_count': len(projects),
                'records_count': len(df_final),
                'elapsed_time_seconds': int(elapsed_time),
                'elapsed_time': f"{minutes}m {seconds}s"
            }
        }

        log_json('info', 'SUCCESS', 'ETL task completed successfully', result['data'])
        return result

    except Exception as e:
        elapsed_time = time.time() - start_time
        minutes = int(elapsed_time // 60)
        seconds = int(elapsed_time % 60)

        import traceback
        error_trace = traceback.format_exc()

        result = {
            'success': False,
            'message': f'ETL Failed: {str(e)}',
            'error': str(e),
            'trace': error_trace
        }

        log_json('error', 'FAILED', f'ETL Task Failed: {str(e)}', {
            'error': str(e),
            'elapsed_time_seconds': int(elapsed_time)
        })

        return result


if __name__ == "__main__":
    # 从命令行参数读取配置
    # 用法: python main.py [time_start] [time_end] [task_id]
    # 例如: python main.py 2021-01 2025-10 123

    time_start = '2021-01'
    time_end = '2025-10'
    task_id = None

    if len(sys.argv) >= 2:
        time_start = sys.argv[1]
    if len(sys.argv) >= 3:
        time_end = sys.argv[2]
    if len(sys.argv) >= 4:
        try:
            task_id = int(sys.argv[3])
        except:
            pass

    result = main(time_start, time_end, task_id)

    # 输出最终结果（供Node.js读取）
    final_result = {
        'type': 'RESULT',
        'success': result['success'],
        'message': result['message'],
        'data': result.get('data', {}),
        'error': result.get('error'),
        'timestamp': datetime.now().isoformat()
    }
    print(json.dumps(final_result, ensure_ascii=False))
    sys.stdout.flush()

    # 设置退出码
    sys.exit(0 if result['success'] else 1)
