const express = require('express');
const router = express.Router();

const llmHandler = require('../router_handler/llm_config');

// LLM配置管理
router.get('/configs', llmHandler.getLLMConfigs);              // 获取所有配置
router.post('/configs', llmHandler.createLLMConfig);           // 创建新配置
router.put('/configs/:id', llmHandler.updateLLMConfig);        // 更新配置
router.delete('/configs/:id', llmHandler.deleteLLMConfig);     // 删除配置
router.post('/configs/:id/activate', llmHandler.setActiveLLM); // 激活配置

// API key测试
router.post('/test', llmHandler.testLLMConnection);            // 测试连接

module.exports = router;
