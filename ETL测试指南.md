# ETL测试指南

## 📋 测试前准备

### 1. 安装Python依赖

```bash
cd backend/etl_scripts
pip install -r requirements.txt
```

**所需依赖**:
- pandas >= 2.0.0
- numpy >= 1.24.0
- requests >= 2.31.0
- pymysql >= 1.1.0
- tqdm >= 4.66.0

### 2. 检查数据库连接

确保可以连接到数据库：

```bash
cd backend/etl_scripts
python -c "import pymysql; conn = pymysql.connect(host='49.235.74.98', user='remote', password='Zhjh0704.', database='opendigger'); print('数据库连接成功'); conn.close()"
```

### 3. 检查网络连接

确保可以访问OpenDigger API：

```bash
curl -I https://oss.x-lab.info/open_leaderboard/open_rank/repo/global/2025.json
curl -I https://oss.open-digger.cn/github/facebook/react/stars.json
```

---

## 🧪 测试步骤

### 阶段1: 模块单元测试

#### 测试配置模块
```bash
cd backend/etl_scripts
python -c "from config import ETLConfig; c = ETLConfig(); print(f'✅ 时间范围: {len(c.time_range)} 个月'); print(f'✅ 指标数量: {len(c.METRICS)}'); print(f'✅ 分类指标: {len(c.CATEGORY_METRICS)}'); print(f'✅ 时间指标: {len(c.TIME_METRICS)}')"
```

**预期输出**:
```
✅ 时间范围: 58 个月
✅ 指标数量: 14
✅ 分类指标: 11
✅ 时间指标: 3
```

#### 验证baseline结构
```bash
cd backend/etl_scripts
python verify_baseline.py
```

**预期输出**:
```
============================================================
验证baseline结构
============================================================

1. 检查顶层结构...
  ✅ github_raw_baseline
  ✅ prei_raw_baseline

2. 检查github_raw_baseline...
  ✅ influence_raw: min=1111.55, max=856491.80
  ✅ reaction_raw: min=43.80, max=856491.80
  ✅ developer_raw: min=1988.70, max=603686.50
  ✅ trend_raw: min=-0.02, max=1.64
  ✅ issue_resolution_duration_sum: min=0.00, max=100000.00
  ✅ change_request_resolution_duration_sum: min=0.00, max=100000.00

3. 检查prei_raw_baseline...
  ✅ prei_raw: min=0.00, max=1.00

============================================================
✅ baseline结构验证通过!
所有单个项目ETL所需的字段都已包含
============================================================
```

---

### 阶段2: 小规模ETL测试（推荐）

#### 测试Top10项目

```bash
cd backend/etl_scripts
python test_small_scale.py 10
```

**说明**:
- 只处理前10个项目
- 不会写入数据库
- 用于验证完整流程
- 耗时约30-60秒

**预期输出**:
```
======================================================================
OpenDigger 小规模ETL测试 (Top 10)
开始时间: 2025-12-10 15:30:00
======================================================================

[Step 1] 获取Top300项目信息...
    ✅ 测试项目数: 10
    测试项目列表:
      1. microsoft/vscode (Rank: 1)
      2. home-assistant/core (Rank: 2)
      ...

[Step 2] 下载 10 个项目的指标数据...
    下载进度: 100%|████████████| 140/140 [00:15<00:00]
    ✅ 数据下载完成

[Step 3] 裁剪数据...
    处理项目: 100%|████████████| 10/10 [00:01<00:00]
    ✅ 裁剪完成

[Step 4] 数据对齐与缺失值处理...
    处理项目: 100%|████████████| 10/10 [00:02<00:00]
    ✅ 对齐完成，共 8120 条记录
    ✅ 长表记录数: 8120

[Step 5-6] 计算聚合指标 & 生成baseline...
    计算月度指标...
    计算GitHub指数...
    计算PREI baseline...
    ✅ 指标计算完成
    ✅ 最终数据行数: 8120
    ✅ baseline已生成

[验证] 检查baseline完整性...
    ... (显示baseline验证结果)

======================================================================
数据样本（前5条）
======================================================================
    ... (显示数据样本)

======================================================================
GitHub指数样本
======================================================================
         company            project  github_index  influence_index  ...
0      microsoft             vscode         85.32            92.45  ...
1  home-assistant               core         78.91            65.23  ...
...

======================================================================
统计信息
======================================================================
处理项目数: 10
总记录数: 8120
时间范围: 2021-01 ~ 2025-10
月份数: 58

======================================================================
✅ 小规模测试完成!
======================================================================

📝 测试结论:
  1. ✅ 数据提取正常
  2. ✅ 数据转换正常
  3. ✅ 指标计算正常
  4. ✅ baseline生成正常
  5. ✅ baseline结构完整
```

#### 测试不同规模

```bash
# 测试Top5
python test_small_scale.py 5

# 测试Top20
python test_small_scale.py 20

# 测试Top50
python test_small_scale.py 50
```

---

### 阶段3: 完整ETL测试

⚠️ **警告**: 此操作会清空`github`表并重新导入所有数据！

#### 在测试环境运行

如果有测试数据库，先在测试环境运行：

```bash
# 修改 config.py 中的数据库配置为测试库
# 然后运行
cd backend/etl_scripts
python main.py
```

#### 在生产环境运行

确认小规模测试通过后，再在生产环境运行：

```bash
cd backend/etl_scripts
python main.py 2021-01 2025-10
```

**预期输出**:
```
============================================================
OpenDigger Top300项目 全量ETL
时间范围: 2021-01 ~ 2025-10
开始时间: 2025-12-10 16:00:00
============================================================

📥 [Step 1] 获取Top300项目信息...
    ✅ 成功获取 282 个项目

📥 [Step 2] 下载所有项目的指标数据...
    下载进度: 100%|████████████| 3948/3948 [02:15<00:00]
    ✅ 数据下载完成

✂️  [Step 3] 裁剪数据...
    处理项目: 100%|████████████| 282/282 [00:05<00:00]
    ✅ 裁剪完成

🔄 [Step 4] 数据对齐与缺失值处理...
    处理项目: 100%|████████████| 282/282 [00:10<00:00]
    ✅ 对齐完成，共 234576 条记录

📊 [Step 5] 计算聚合指标...
    计算月度指标...
    计算GitHub指数...
    计算PREI baseline...
    ✅ 指标计算完成

💾 [Step 7] 加载数据到数据库...
    清空github表...
    更新baseline配置...
    批量插入项目数据...
    ✅ 数据加载完成

============================================================
✅ ETL处理完成!
处理项目数: 282
总记录数: 234576
耗时: 3分45秒
结束时间: 2025-12-10 16:03:45
============================================================
```

---

## 🔍 验证结果

### 1. 检查数据库

```sql
-- 检查github表记录数
SELECT COUNT(*) FROM github;
-- 预期: 约282条

-- 检查baseline配置
SELECT baseline FROM baseline_config LIMIT 1;

-- 查看部分项目数据
SELECT company_name, project_name, github, openrank_avg
FROM github
ORDER BY github DESC
LIMIT 10;
```

### 2. 验证baseline完整性

```bash
cd backend
node -e "
const db = require('./db/promise');
(async () => {
  const [rows] = await db.query('SELECT baseline FROM baseline_config LIMIT 1');
  const baseline = rows[0].baseline;

  console.log('✅ github_raw_baseline:');
  console.log('  - influence_raw:', baseline.github_raw_baseline.influence_raw);
  console.log('  - reaction_raw:', baseline.github_raw_baseline.reaction_raw);
  console.log('  - developer_raw:', baseline.github_raw_baseline.developer_raw);
  console.log('  - trend_raw:', baseline.github_raw_baseline.trend_raw);
  console.log('  - issue_resolution_duration_sum:', baseline.github_raw_baseline.issue_resolution_duration_sum);
  console.log('  - change_request_resolution_duration_sum:', baseline.github_raw_baseline.change_request_resolution_duration_sum);

  console.log('\\n✅ prei_raw_baseline:');
  console.log('  - prei_raw:', baseline.prei_raw_baseline.prei_raw);

  await db.end();
})();
"
```

### 3. 测试单个项目ETL

在完整ETL运行后，测试添加一个新项目：

```javascript
// 使用Node.js单个项目ETL
const ETLProcessor = require('./backend/services/etlProcessor');

(async () => {
  const processor = new ETLProcessor('facebook', 'react');
  const result = await processor.process();
  console.log(result);
})();
```

---

## ⚠️ 常见问题

### 1. 网络请求超时

**现象**: 下载指标数据时出现大量超时

**解决方案**:
- 检查网络连接
- 增加`config.py`中的`timeout`值
- 减少`max_workers`并发数

### 2. 内存不足

**现象**: 处理大量数据时内存溢出

**解决方案**:
- 增加系统内存
- 分批处理项目
- 优化数据结构

### 3. 数据库连接失败

**现象**: 无法连接数据库

**解决方案**:
- 检查数据库服务是否运行
- 验证连接信息是否正确
- 检查防火墙设置

### 4. baseline字段缺失

**现象**: 单个项目ETL报错"Baseline未找到"

**解决方案**:
- 运行`verify_baseline.py`检查结构
- 重新运行完整ETL生成正确的baseline
- 检查`calculator.py`中的baseline生成逻辑

---

## 📊 性能基准

| 测试规模 | 项目数 | 请求数 | 预计时间 | 内存占用 |
|----------|--------|--------|----------|----------|
| 微型 | 5 | 70 | ~20秒 | ~100MB |
| 小型 | 10 | 140 | ~40秒 | ~200MB |
| 中型 | 50 | 700 | ~3分钟 | ~500MB |
| 大型 | 100 | 1400 | ~5分钟 | ~1GB |
| 完整 | 282 | 3948 | ~3-5分钟 | ~2GB |

---

## ✅ 测试检查清单

在运行完整ETL前，确保：

- [ ] Python依赖已安装
- [ ] 数据库连接正常
- [ ] 网络连接畅通
- [ ] 配置模块测试通过
- [ ] baseline验证通过
- [ ] 小规模测试(Top10)通过
- [ ] 数据样本检查正确
- [ ] 已备份现有数据库数据
- [ ] 了解完整ETL会清空github表
- [ ] 预留足够的执行时间(5-10分钟)

---

## 📝 测试报告模板

```
ETL测试报告

测试时间: 2025-12-10 15:30:00
测试人员: XXX
测试类型: [小规模/完整]

测试环境:
- Python版本: 3.x
- 数据库: MySQL 8.0
- 网络: 正常

测试结果:
- [ ] 配置模块: 通过/失败
- [ ] baseline验证: 通过/失败
- [ ] 数据提取: 通过/失败
- [ ] 数据转换: 通过/失败
- [ ] 指标计算: 通过/失败
- [ ] 数据库导入: 通过/失败

处理统计:
- 项目数: XXX
- 总记录数: XXX
- 耗时: X分X秒

发现问题:
1. ...
2. ...

结论: 通过/失败
建议: ...
```

---

## 🎯 下一步

小规模测试通过后：

1. ✅ 运行完整ETL（Top300）
2. ✅ 验证数据库数据
3. ✅ 测试单个项目ETL
4. ✅ 验证前端大屏展示
5. ✅ 制定定期更新计划
