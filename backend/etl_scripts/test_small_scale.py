"""
小规模ETL测试脚本
测试Top10项目，验证完整流程
"""
import sys
import json
from datetime import datetime

from config import ETLConfig
from extractor import DataExtractor
from transformer import DataTransformer
from calculator import MetricsCalculator
from verify_baseline import verify_baseline_structure, print_baseline_json


def test_small_scale(top_n: int = 10):
    """
    小规模ETL测试

    Args:
        top_n: 测试前N个项目（默认10）
    """
    print("=" * 70)
    print(f"OpenDigger 小规模ETL测试 (Top {top_n})")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    try:
        # 初始化配置
        config = ETLConfig('2021-01', '2025-10')

        # Step 1: 获取Top300项目
        print("\n[Step 1] 获取Top300项目信息...")
        extractor = DataExtractor(config)
        all_projects = extractor.fetch_top_projects()

        # 只取前N个项目
        projects = all_projects[:top_n]
        print(f"     测试项目数: {len(projects)}")
        print(f"    测试项目列表:")
        for i, proj in enumerate(projects, 1):
            print(f"      {i}. {proj['repo_name']} (Rank: {proj['rank']})")

        # Step 2: 下载指标数据
        print(f"\n[Step 2] 下载 {len(projects)} 个项目的指标数据...")
        all_data = extractor.fetch_all_metrics(projects)

        # Step 3: 裁剪数据
        print("\n[Step 3] 裁剪数据...")
        trimmed_data = extractor.trim_data(all_data)

        # Step 4: 数据对齐与缺失值处理
        print("\n[Step 4] 数据对齐与缺失值处理...")
        transformer = DataTransformer(config)
        df_long = transformer.align_and_fill(trimmed_data)
        print(f"     长表记录数: {len(df_long)}")

        # Step 5-6: 计算聚合指标 & 生成baseline
        print("\n[Step 5-6] 计算聚合指标 & 生成baseline...")
        calculator = MetricsCalculator(config)
        df_final, baseline = calculator.calculate_all_metrics(df_long)

        print(f"     最终数据行数: {len(df_final)}")
        print(f"     baseline已生成")

        # 验证baseline结构
        print("\n[验证] 检查baseline完整性...")
        baseline_valid = verify_baseline_structure(baseline)

        if not baseline_valid:
            print("      警告: baseline结构不完整")
            return False

        # 显示baseline详情
        print_baseline_json(baseline)

        # ========== 导出数据到本地文件 ==========
        print("\n" + "=" * 70)
        print("导出数据到本地文件")
        print("=" * 70)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # 1. 导出完整数据到CSV
        output_file_full = f'test_result_full_{timestamp}.csv'
        df_final.to_csv(output_file_full, index=False, encoding='utf-8-sig')
        print(f"  1. 完整数据: {output_file_full} ({len(df_final)} 条记录)")

        # 2. 导出月度数据样本（按项目-日期）
        output_file_monthly = f'test_result_monthly_{timestamp}.csv'
        monthly_cols = ['company', 'project', 'date',
                        'project_activity_index', 'pr_efficiency_index',
                        'github_index', 'openrank']
        if all(col in df_final.columns for col in monthly_cols):
            df_final[monthly_cols].to_csv(output_file_monthly, index=False, encoding='utf-8-sig')
            print(f"  2. 月度数据: {output_file_monthly}")

        # 3. 导出GitHub指数汇总（去重，每个项目一条记录）
        output_file_github = f'test_result_github_{timestamp}.csv'
        github_cols = ['company', 'project', 'github_index',
                       'influence_index', 'reaction_index',
                       'developer_index', 'trend_index']
        github_df = df_final[github_cols].drop_duplicates(subset=['company', 'project']).sort_values('github_index', ascending=False)
        github_df.to_csv(output_file_github, index=False, encoding='utf-8-sig')
        print(f"  3. GitHub指数: {output_file_github} ({len(github_df)} 个项目)")

        # 4. 导出baseline到JSON
        output_file_baseline = f'test_baseline_{timestamp}.json'
        with open(output_file_baseline, 'w', encoding='utf-8') as f:
            json.dump(baseline, f, ensure_ascii=False, indent=2)
        print(f"  4. Baseline: {output_file_baseline}")

        print("\n  所有文件已保存到当前目录！")

        # 显示部分数据样本
        print("\n" + "=" * 70)
        print("数据样本（前5条）")
        print("=" * 70)
        sample_cols = ['company', 'project', 'date',
                       'project_activity_index', 'pr_efficiency_index']
        if all(col in df_final.columns for col in sample_cols):
            print(df_final[sample_cols].head(5).to_string())
        else:
            print(df_final.head(5).to_string())

        # 显示GitHub指数样本
        print("\n" + "=" * 70)
        print("GitHub指数样本（按分数排序）")
        print("=" * 70)
        print(github_df.to_string())

        # 统计信息
        print("\n" + "=" * 70)
        print("统计信息")
        print("=" * 70)
        print(f"处理项目数: {len(projects)}")
        print(f"总记录数: {len(df_final)}")
        print(f"时间范围: {config.time_start} ~ {config.time_end}")
        print(f"月份数: {len(config.time_range)}")

        print("\n" + "=" * 70)
        print(" 小规模测试完成!")
        print("=" * 70)

        print("\n 测试结论:")
        print("  1.  数据提取正常")
        print("  2.  数据转换正常")
        print("  3.  指标计算正常")
        print("  4.  baseline生成正常")
        print("  5.  baseline结构完整")

        print("\n 下一步:")
        print("  1. 如果测试结果正确，可以运行完整ETL（Top300）:")
        print("     python main.py")
        print("  2. 完整ETL会清空github表并重新导入数据")
        print("  3. 完整ETL约需3-5分钟")

        return True

    except Exception as e:
        print("\n" + "=" * 70)
        print(f" 测试失败: {e}")
        print("=" * 70)
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    # 从命令行参数读取测试项目数
    top_n = 10
    if len(sys.argv) >= 2:
        try:
            top_n = int(sys.argv[1])
        except:
            print("  参数错误，使用默认值 top_n=10")

    success = test_small_scale(top_n)
    sys.exit(0 if success else 1)
