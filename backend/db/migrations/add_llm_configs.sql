-- LLM配置管理表
CREATE TABLE IF NOT EXISTS llm_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(50) NOT NULL COMMENT 'LLM提供商: deepseek, qwen, kimi, openai, gemini',
  name VARCHAR(100) NOT NULL COMMENT '配置名称',
  api_key TEXT NOT NULL COMMENT 'API密钥',
  base_url VARCHAR(255) NOT NULL COMMENT 'API基础URL',
  model VARCHAR(100) NOT NULL COMMENT '模型名称',
  is_active BOOLEAN DEFAULT FALSE COMMENT '是否为当前激活配置',
  config_json TEXT COMMENT '额外配置JSON（如temperature等参数）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_provider (provider),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='LLM配置表';

-- 插入默认千问配置（请替换为实际API key）
INSERT INTO llm_configs (provider, name, api_key, base_url, model, is_active, config_json)
VALUES (
  'qwen',
  '通义千问-默认',
  'sk-829bda5565e04302b9bd5a088f0247c3',
  'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'qwen3-max',
  TRUE,
  '{"temperature": 0.7, "max_tokens": 4000}'
);
