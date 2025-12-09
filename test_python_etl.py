"""
测试Python ETL脚本
验证各模块是否正常工作
"""
import sys
sys.path.insert(0, 'backend/etl_scripts')

from config import ETLConfig

def test_config():
    """测试配置模块"""
    print("🧪 测试配置模块...")
    config = ETLConfig('2021-01', '2025-10')

    print(f"  ✅ 时间范围: {config.time_start} ~ {config.time_end}")
    print(f"  ✅ 月份数量: {len(config.time_range)}")
    print(f"  ✅ 指标数量: {len(config.METRICS)}")
    print(f"  ✅ 分类指标: {len(config.CATEGORY_METRICS)}")
    print(f"  ✅ 时间指标: {len(config.TIME_METRICS)}")

    # 验证时间范围生成
    assert config.time_range[0] == '2021-01'
    assert config.time_range[-1] == '2025-10'
    assert len(config.time_range) == 58  # 2021-01到2025-10共58个月

    print("  ✅ 配置模块测试通过\n")

def test_extractor():
    """测试数据提取模块"""
    print("🧪 测试数据提取模块...")
    from extractor import DataExtractor

    config = ETLConfig('2021-01', '2025-10')
    extractor = DataExtractor(config)

    print(f"  ✅ OpenDigger Base URL: {config.opendigger_base}")
    print(f"  ✅ Leaderboard URL: {config.leaderboard_url}")

    # 测试URL构建
    url = config.get_metric_url('facebook', 'react', 'stars')
    expected = "https://oss.open-digger.cn/github/facebook/react/stars.json"
    assert url == expected, f"URL不匹配: {url}"

    print(f"  ✅ URL构建正确: {url}")
    print("  ✅ 数据提取模块测试通过\n")

def test_transformer():
    """测试数据转换模块"""
    print("🧪 测试数据转换模块...")
    from transformer import DataTransformer

    config = ETLConfig('2021-01', '2025-10')
    transformer = DataTransformer(config)

    # 测试时间对齐
    test_data = {
        '2021-03': 100,
        '2021-05': 200,
        '2021-08': 300
    }

    aligned = transformer._align_time_series(test_data, 'stars')

    # 验证填充
    assert aligned['2021-01'] == 0  # 项目未发布,填充0
    assert aligned['2021-02'] == 0
    assert aligned['2021-03'] == 100  # 有数据
    assert aligned['2021-04'] == 100  # 前向填充
    assert aligned['2021-05'] == 200  # 有数据

    print(f"  ✅ 时间对齐测试通过")
    print(f"  ✅ 缺失值填充正确")
    print("  ✅ 数据转换模块测试通过\n")

def test_calculator():
    """测试指标计算模块"""
    print("🧪 测试指标计算模块...")
    from calculator import MetricsCalculator
    import pandas as pd
    import numpy as np

    config = ETLConfig('2021-01', '2025-10')
    calculator = MetricsCalculator(config)

    # 测试归一化
    series = pd.Series([10, 20, 30, 40, 50])
    normalized = calculator._min_max_norm(series)
    assert normalized.min() == 0.0
    assert normalized.max() == 1.0

    print(f"  ✅ Min-Max归一化正确")

    # 测试反向评分
    reversed_score = calculator._reverse_score(series)
    assert reversed_score.iloc[0] == 1.0  # 最小值 → 1
    assert reversed_score.iloc[-1] == 0.0  # 最大值 → 0

    print(f"  ✅ 反向评分正确")
    print("  ✅ 指标计算模块测试通过\n")

def main():
    """运行所有测试"""
    print("=" * 60)
    print("Python ETL脚本 - 模块测试")
    print("=" * 60 + "\n")

    try:
        test_config()
        test_extractor()
        test_transformer()
        test_calculator()

        print("=" * 60)
        print("✅ 所有模块测试通过!")
        print("=" * 60)
        print("\n📝 下一步:")
        print("  1. 安装依赖: pip install -r backend/etl_scripts/requirements.txt")
        print("  2. 运行ETL: python backend/etl_scripts/main.py")

        return 0

    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ 测试失败: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
