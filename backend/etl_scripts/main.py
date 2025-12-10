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

    log_json('info', 'START', f'ETL任务开始', {'task_id': task_id, 'time_range': f'{time_start} ~ {time_end}'})

    try:
        # 初始化配置
        config = ETLConfig(time_start, time_end)
        log_json('info', 'CONFIG', '配置初始化完成', {'time_range_months': len(config.time_range)})

        # Step 1: 获取Top300项目信息
        log_json('info', 'STEP_1', '开始获取Top300项目信息')
        extractor = DataExtractor(config)
        projects = extractor.fetch_top_projects()

        if not projects:
            raise Exception("未获取到项目列表")

        log_json('info', 'STEP_1', f'成功获取 {len(projects)} 个项目', {'count': len(projects)})
        log_progress('FETCH_PROJECTS', len(projects), len(projects), f'已获取{len(projects)}个项目')

        # Step 2: 下载所有指标数据
        log_json('info', 'STEP_2', f'开始下载 {len(projects)} 个项目的指标数据')
        all_data = extractor.fetch_all_metrics(projects)
        log_json('info', 'STEP_2', '指标数据下载完成')

        # Step 3: 裁剪数据
        log_json('info', 'STEP_3', '开始裁剪数据')
        trimmed_data = extractor.trim_data(all_data)
        log_json('info', 'STEP_3', '数据裁剪完成')

        # Step 4: 数据对齐与缺失值处理
        log_json('info', 'STEP_4', '开始数据对齐与缺失值处理')
        transformer = DataTransformer(config)
        df_long = transformer.align_and_fill(trimmed_data)
        log_json('info', 'STEP_4', f'数据对齐完成，共 {len(df_long)} 条记录', {'records': len(df_long)})

        # Step 5: 计算聚合指标 & Step 6: 生成baseline
        log_json('info', 'STEP_5', '开始计算聚合指标')
        calculator = MetricsCalculator(config)
        df_final, baseline = calculator.calculate_all_metrics(df_long)
        log_json('info', 'STEP_5', '聚合指标计算完成，baseline已生成')

        # Step 7: 加载到数据库
        log_json('info', 'STEP_7', '开始加载数据到数据库')
        loader = DataLoader(config)
        loader.truncate_and_load(df_final, baseline)
        log_json('info', 'STEP_7', '数据加载完成')

        # 统计信息
        elapsed_time = time.time() - start_time
        minutes = int(elapsed_time // 60)
        seconds = int(elapsed_time % 60)

        result = {
            'success': True,
            'message': 'ETL处理成功',
            'data': {
                'projects_count': len(projects),
                'records_count': len(df_final),
                'elapsed_time_seconds': int(elapsed_time),
                'elapsed_time': f"{minutes}分{seconds}秒"
            }
        }

        log_json('info', 'SUCCESS', 'ETL任务成功完成', result['data'])
        return result

    except Exception as e:
        elapsed_time = time.time() - start_time
        minutes = int(elapsed_time // 60)
        seconds = int(elapsed_time % 60)

        import traceback
        error_trace = traceback.format_exc()

        result = {
            'success': False,
            'message': f'ETL处理失败: {str(e)}',
            'error': str(e),
            'trace': error_trace
        }

        log_json('error', 'FAILED', f'ETL任务失败: {str(e)}', {
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
