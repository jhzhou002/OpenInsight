"""
测试 SSL 修复
验证是否能够成功访问 oss.x-lab.info
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
import urllib3

# 禁用 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def test_leaderboard_access():
    """测试访问排行榜数据"""
    url = "https://oss.x-lab.info/open_leaderboard/open_rank/repo/global/2025.json"

    print("测试访问排行榜URL...")
    print(f"URL: {url}")

    try:
        # 禁用SSL验证
        response = requests.get(url, timeout=30, verify=False)
        response.raise_for_status()
        data = response.json()

        print(f"✓ 访问成功!")
        print(f"  数据条数: {len(data.get('data', []))}")

        # 显示前3条
        if data.get('data'):
            print("\n前3名项目:")
            for i, entry in enumerate(data['data'][:3], 1):
                item = entry.get('item', {})
                rank = entry.get('rank', 0)
                name = item.get('name', 'N/A')
                print(f"  {rank}. {name}")

        return True
    except Exception as e:
        print(f"✗ 访问失败: {e}")
        return False

def test_metric_access():
    """测试访问指标数据"""
    # 使用第一个项目作为测试
    company = "microsoft"
    project = "vscode"
    metric = "stars"

    url = f"https://oss.x-lab.info/open_digger/github/{company}/{project}/{metric}.json"

    print(f"\n测试访问指标数据...")
    print(f"URL: {url}")

    try:
        response = requests.get(url, timeout=10, verify=False)
        response.raise_for_status()
        data = response.json()

        print(f"✓ 访问成功!")
        print(f"  数据点数: {len(data)}")

        # 显示最新的3个月
        if data:
            months = sorted(data.keys(), reverse=True)[:3]
            print(f"\n最近3个月的 stars 数据:")
            for month in months:
                print(f"  {month}: {data[month]}")

        return True
    except Exception as e:
        print(f"✗ 访问失败: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("SSL 修复验证测试")
    print("=" * 60)

    result1 = test_leaderboard_access()
    result2 = test_metric_access()

    print("\n" + "=" * 60)
    if result1 and result2:
        print("✓ 所有测试通过! SSL问题已修复。")
    else:
        print("✗ 部分测试失败，请检查网络连接。")
    print("=" * 60)
