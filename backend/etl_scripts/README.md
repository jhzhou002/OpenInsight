# OpenDigger ETL Scripts

完全基于PDF文档标准的Python ETL脚本，用于处理OpenDigger Top300项目数据。

## 📁 文件结构

```
etl_scripts/
├── __init__.py              # 包初始化
├── config.py                # ETL配置管理
├── extractor.py             # 数据提取（PDF步骤1-3）
├── transformer.py           # 数据转换（PDF步骤4）
├── calculator.py            # 指标计算（PDF步骤5-6）
├── loader.py                # 数据加载（PDF步骤7）
├── main.py                  # 主流程入口
├── requirements.txt         # Python依赖
└── README.md                # 本文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
cd backend/etl_scripts
pip install -r requirements.txt
```

### 2. 配置数据库

确保数据库连接信息正确（在`config.py`中配置）：

```python
self.db_config = {
    'host': '49.235.74.98',
    'user': 'remote',
    'password': 'Zhjh0704.',
    'database': 'opendigger',
    'charset': 'utf8mb4'
}
```

### 3. 运行ETL

#### 方式1：使用默认配置（2021-01至2025-10）

```bash
python main.py
```

#### 方式2：指定时间范围

```bash
python main.py 2021-01 2025-11
```

## 📊 处理流程

完全遵循PDF文档标准：

### Step 1: 获取Top300项目信息
- 从OpenDigger排行榜获取项目列表
- 包含：repo_name, company, rank

### Step 2: 下载指标数据
- 并发下载14个核心指标
- 指标列表：
  ```
  issues_new, issues_closed, issue_comments,
  issue_resolution_duration,
  change_requests, change_requests_reviews,
  change_requests_accepted,
  change_request_response_time,
  change_request_resolution_duration,
  stars, technical_fork, new_contributors,
  openrank, activity
  ```

### Step 3: 裁剪数据
- **分类指标**：只保留`YYYY-MM: value`
- **时间指标**：只保留`avg`字段的`YYYY-MM: value`

### Step 4: 缺失值处理
- 项目发布前：填充0
- 项目发布后：前向填充

### Step 5: 计算聚合指标
- **项目活跃度**
- **开发者活跃度**
- **关注度**
- **PREI及四个维度**
- **GitHub指数及四个维度**

### Step 6: 生成baseline
- 记录所有维度的min/max值
- 用于后续单个项目归一化

### Step 7: 导入数据库
- 清空`github`表
- 更新`baseline_config`表
- 批量插入新数据

## 🔧 配置说明

### 核心配置项（config.py）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| time_start | 2021-01 | 数据起始月份 |
| time_end | 2025-10 | 数据结束月份 |
| max_workers | 20 | 并发下载线程数 |
| timeout | 10 | 请求超时时间（秒） |

### 环境变量（可选）

```bash
export DB_HOST=49.235.74.98
export DB_USER=remote
export DB_PASSWORD=Zhjh0704.
export DB_NAME=opendigger
```

## 📈 性能优化

1. **并发下载**：使用ThreadPoolExecutor，默认20个并发
2. **批量插入**：数据库批量提交，每批100条
3. **进度显示**：使用tqdm显示实时进度

## ⚠️ 注意事项

1. **执行时间**：完整ETL约需3-5分钟
2. **网络要求**：需要访问OpenDigger API
3. **数据库权限**：需要TRUNCATE和INSERT权限
4. **Python版本**：需要Python 3.8+

## 🐛 错误处理

脚本会自动处理以下情况：
- 网络请求失败：单个指标失败不影响整体
- 数据缺失：自动填充0或前向填充
- 数据库错误：自动回滚事务

## 📝 输出示例

```
============================================================
OpenDigger Top300项目 全量ETL
时间范围: 2021-01 ~ 2025-10
开始时间: 2025-12-10 10:30:00
============================================================

📥 [Step 1] 获取Top300项目信息...
    URL: https://oss.x-lab.info/open_leaderboard/...
    ✅ 成功获取 282 个项目

📥 [Step 2] 下载所有项目的指标数据...
    指标数量: 14
    项目数量: 282
    并发数: 20
    下载进度: 100%|████████████| 3948/3948 [02:15<00:00]
    ✅ 数据下载完成

✂️  [Step 3] 裁剪数据...
    时间范围: 2021-01 ~ 2025-10
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
结束时间: 2025-12-10 10:33:45
============================================================
```

## 🔗 与Node.js集成

Node.js可以通过以下方式调用ETL脚本：

```javascript
const { spawn } = require('child_process');

const python = spawn('python', [
  'backend/etl_scripts/main.py',
  '2021-01',
  '2025-10'
]);

python.stdout.on('data', (data) => {
  console.log(data.toString());
});

python.on('close', (code) => {
  if (code === 0) {
    console.log('ETL成功');
  } else {
    console.log('ETL失败');
  }
});
```

## 📚 参考文档

- PDF文档：`OpenDigger Top300项目数据获取.pdf`
- 单个项目ETL：`backend/services/etlProcessor.js`
- 数据库表结构：`backend/sql/*.sql`
