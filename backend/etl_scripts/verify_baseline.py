"""
验证baseline结构是否完整
确保包含单个项目ETL所需的所有字段
"""
import json

def verify_baseline_structure(baseline: dict) -> bool:
    """
    验证baseline结构

    Args:
        baseline: baseline字典

    Returns:
        是否验证通过
    """
    print("\n" + "=" * 60)
    print("验证baseline结构")
    print("=" * 60)

    all_passed = True

    # ========== 检查顶层结构 ==========
    required_top_keys = ['github_raw_baseline', 'prei_raw_baseline']

    print("\n1. 检查顶层结构...")
    for key in required_top_keys:
        if key in baseline:
            print(f"   {key}")
        else:
            print(f"   缺少: {key}")
            all_passed = False

    # ========== 检查GitHub baseline ==========
    print("\n2. 检查github_raw_baseline...")
    github_baseline = baseline.get('github_raw_baseline', {})

    # PDF要求：14个字段（7组min/max）
    required_github_keys = [
        'influence_raw',           # 影响力维度
        'reaction_raw',            # 社区反应维度
        'developer_raw',           # 开发者活跃度维度
        'trend_raw',               # 发展趋势维度
        'github_raw',              # GitHub综合得分（新增，PDF步骤4）
        'issue_resolution',        # 时间指标1（简短命名）
        'pr_resolution'            # 时间指标2（简短命名）
    ]

    for key in required_github_keys:
        if key in github_baseline:
            item = github_baseline[key]
            if 'min' in item and 'max' in item:
                print(f"   {key}: min={item['min']:.2f}, max={item['max']:.2f}")
            else:
                print(f"   {key} 缺少min或max")
                all_passed = False
        else:
            print(f"   缺少: {key}")
            all_passed = False

    # ========== 检查PREI baseline ==========
    print("\n3. 检查prei_raw_baseline...")
    prei_baseline = baseline.get('prei_raw_baseline', {})

    if 'prei_raw' in prei_baseline:
        item = prei_baseline['prei_raw']
        if 'min' in item and 'max' in item:
            print(f"   prei_raw: min={item['min']:.2f}, max={item['max']:.2f}")
        else:
            print(f"   prei_raw 缺少min或max")
            all_passed = False
    else:
        print(f"   缺少: prei_raw")
        all_passed = False

    # ========== 总结 ==========
    print("\n" + "=" * 60)
    if all_passed:
        print(" baseline结构验证通过!")
        print("所有单个项目ETL所需的字段都已包含")
    else:
        print(" baseline结构验证失败!")
        print("缺少部分字段，单个项目ETL可能无法正常工作")
    print("=" * 60)

    return all_passed


def print_baseline_json(baseline: dict):
    """打印baseline的完整JSON结构"""
    print("\n" + "=" * 60)
    print("完整baseline结构")
    print("=" * 60)
    print(json.dumps(baseline, indent=2, ensure_ascii=False))
    print("=" * 60)


if __name__ == "__main__":
    # 示例：验证一个完整的baseline（14个字段）
    sample_baseline = {
        "github_raw_baseline": {
            "influence_raw": {"min": 1111.55, "max": 856491.8},
            "reaction_raw": {"min": 43.8, "max": 856491.8},
            "developer_raw": {"min": 1988.7, "max": 603686.5},
            "trend_raw": {"min": -0.02, "max": 1.64},
            "github_raw": {"min": 0.0, "max": 1.0},  # 新增
            "issue_resolution": {"min": 0.0, "max": 100000.0},  # 改名
            "pr_resolution": {"min": 0.0, "max": 100000.0}  # 改名
        },
        "prei_raw_baseline": {
            "prei_raw": {"min": 0.0, "max": 1.0}
        }
    }

    verify_baseline_structure(sample_baseline)
    print_baseline_json(sample_baseline)
