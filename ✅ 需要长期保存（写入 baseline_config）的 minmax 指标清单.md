# ✅ **需要长期保存（写入 baseline_config）的 min/max 指标清单**

这些 min/max 是为了 **新增项目做 ETL 时保持评分尺度一致**，也就是必须复用 Top300 预计算得到的归一化区间。

文档中涉及两类归一化：

------

# 🎯 **一类：Github 指数维度归一化所需的 min/max（必存）**

Github 指数有 **4 个维度**，每个维度都在做 Min-Max 归一化之前需要 min/max。

注意：
 维度归一化是发生在“维度原始指标 → 加权前”，是在 **项目间统一尺度**。

对应需要存储：

------

## **① 影响力维度（Influence）**

影响力原始值：

```
Influence_raw = 
0.25 * stars_sum +
0.25 * technical_fork_sum +
0.30 * issues_new_sum +
0.20 * change_requests_sum
```

👉 **需要保存：**

| 名称              | 说明                               |
| ----------------- | ---------------------------------- |
| influence_raw_min | Influence_raw 在 Top300 中的最小值 |
| influence_raw_max | Influence_raw 在 Top300 中的最大值 |

------

## **② 社区反应维度（Reaction）**

```
Reaction_raw =
0.5 * issues_closed_sum +
0.2 * change_requests_accepted_sum +
0.2 * (1 - norm(issue_resolution)) +
0.1 * (1 - norm(pr_resolution))
```

其中时间类指标本身也先做 Min-Max：

### 🟢 时间指标本身需要 min/max：

| 名称                 | 用途                                                |
| -------------------- | --------------------------------------------------- |
| issue_resolution_min | 对 issue_resolution 做 MinMaxNorm                   |
| issue_resolution_max | 同上                                                |
| pr_resolution_min    | 对 change_request_resolution_duration 做 MinMaxNorm |
| pr_resolution_max    | 同上                                                |

然后 Reaction_raw 再聚合得到，需要的：

| 名称             | 说明                              |
| ---------------- | --------------------------------- |
| reaction_raw_min | Reaction_raw 在 Top300 中的最小值 |
| reaction_raw_max | Reaction_raw 在 Top300 中的最大值 |

------

## **③ 开发者活跃度维度（Developer Activity）**

```
Developer_raw =
0.4 * issues_new_sum +
0.3 * change_requests_sum +
0.3 * new_contributors_sum
```

👉 需要保存：

| 名称              | 说明                   |
| ----------------- | ---------------------- |
| developer_raw_min | Developer_raw 的最小值 |
| developer_raw_max | Developer_raw 的最大值 |

------

## **④ 发展趋势维度（Trend）**

```
Trend_raw =
0.4 * IssueTrend +
0.4 * PRTrend +
0.2 * DevTrend
```

这些 trend 值来自 pct_change 的平均值。

👉 需要保存：

| 名称          | 说明             |
| ------------- | ---------------- |
| trend_raw_min | Trend_raw 最小值 |
| trend_raw_max | Trend_raw 最大值 |

------

## 🔵 Github 综合指数归一化（Github_raw）

Github_raw 在做功效系数前还需要一次 Min-Max：

```
Github_norm = MinMaxNorm(Github_raw)
```

👉 需要保存：

| 名称           | 说明              |
| -------------- | ----------------- |
| github_raw_min | Github_raw 最小值 |
| github_raw_max | Github_raw 最大值 |

------

# 🎯 **第二类：PREI（PR 处理效率）所需的 min/max（必存）**

你 PREI 的计算里有多重归一化步骤：

------

## **① PREI 四个维度内部的 MinMaxNorm（StdNorm 已包含 MinMaxNorm）**

由于你的 `std_norm()` 实现：

```
z-score → MinMaxNorm 到 0~1
```

因此 **需要保存每个维度标准化后 MinMaxNorm 的 min/max？**

❌ **不需要**
 因为 std_norm 内部的 min/max 是对所有项目一次性算出的，只依赖当时数据分布，对新增项目无法复现。

正确做法是：

👉 **对 PREI 的四个维度，你不应该保存内部 MinMaxNorm 的 min/max。**
 👉 **对新增项目应该重新使用 Top300 的 mean/std 来进行 z-score**（如果有需要）。

因此这里只保存 PREI_raw 的 min/max。

------

## **② PREI_raw 的 MinMaxNorm（用于功效系数前）**

```
PREI_norm = MinMaxNorm(PREI_raw)
```

👉 必须保存：

| 名称         | 说明            |
| ------------ | --------------- |
| prei_raw_min | PREI_raw 最小值 |
| prei_raw_max | PREI_raw 最大值 |

------

# 🎯 **最终需要保存哪些 min/max？全部列在下面即可写入 baseline_config**

## ✅ **Github 指数相关（共 12 组）**

| 类别                  | min                  | max                  |
| --------------------- | -------------------- | -------------------- |
| Influence_raw         | influence_raw_min    | influence_raw_max    |
| Reaction_raw          | reaction_raw_min     | reaction_raw_max     |
| Developer_raw         | developer_raw_min    | developer_raw_max    |
| Trend_raw             | trend_raw_min        | trend_raw_max        |
| Github_raw（综合）    | github_raw_min       | github_raw_max       |
| issue_resolution_time | issue_resolution_min | issue_resolution_max |
| pr_resolution_time    | pr_resolution_min    | pr_resolution_max    |

------

## ✅ **PREI 相关（共 3 组）**

| 类别     | min          | max          |
| -------- | ------------ | ------------ |
| PREI_raw | prei_raw_min | prei_raw_max |

（PREI 四个子维度不需要保存 min/max，因为 std_norm 内的 MinMaxNorm 是基于 Top300 全局的，是不可复现的。你的当前设计也不要求新增项目复现 std_norm 内部的 MinMax。）

------

# 🧩 **最终 baseline_config 内容结构示例（推荐）**

```json
{
  "github": {
    "influence_raw_min": ...,
    "influence_raw_max": ...,
    "reaction_raw_min": ...,
    "reaction_raw_max": ...,
    "developer_raw_min": ...,
    "developer_raw_max": ...,
    "trend_raw_min": ...,
    "trend_raw_max": ...,
    "github_raw_min": ...,
    "github_raw_max": ...,

    "issue_resolution_min": ...,
    "issue_resolution_max": ...,
    "pr_resolution_min": ...,
    "pr_resolution_max": ...
  },

  "prei": {
    "prei_raw_min": ...,
    "prei_raw_max": ...
  }
}
```

