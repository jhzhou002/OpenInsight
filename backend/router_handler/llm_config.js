/**
 * LLM配置管理 - 路由处理器
 */
const db = require('../db/promise');
const OpenAI = require('openai');

/**
 * 获取所有LLM配置
 * GET /api/llm/configs
 */
exports.getLLMConfigs = async (req, res) => {
    try {
        const [configs] = await db.query(
            'SELECT id, provider, name, base_url, model, is_active, config_json, created_at, updated_at FROM llm_configs ORDER BY is_active DESC, created_at DESC'
        );

        // 脱敏API key（只显示前4位和后4位）
        const maskedConfigs = configs.map(config => ({
            ...config,
            api_key_masked: maskApiKey(config.api_key),
            config_json: config.config_json ? JSON.parse(config.config_json) : null
        }));

        // 移除api_key字段（不返回给前端）
        const { api_key, ...safeConfigs } = maskedConfigs;

        res.json({
            code: 200,
            msg: '获取配置成功',
            data: configs.map(c => {
                const { config_json, ...rest } = c;
                return {
                    ...rest,
                    api_key_masked: maskApiKey(c.api_key || ''),
                    config_json: config_json ? JSON.parse(config_json) : null
                };
            })
        });
    } catch (error) {
        console.error('获取LLM配置失败:', error);
        res.status(500).json({
            code: 500,
            msg: '获取配置失败',
            error: error.message
        });
    }
};

/**
 * 创建LLM配置
 * POST /api/llm/configs
 */
exports.createLLMConfig = async (req, res) => {
    try {
        const { provider, name, api_key, base_url, model, config_json } = req.body;

        // 参数校验
        if (!provider || !name || !api_key || !base_url || !model) {
            return res.status(400).json({
                code: 400,
                msg: '缺少必填参数'
            });
        }

        // 验证provider是否支持
        const supportedProviders = ['deepseek', 'qwen', 'kimi', 'openai', 'gemini'];
        if (!supportedProviders.includes(provider)) {
            return res.status(400).json({
                code: 400,
                msg: `不支持的provider: ${provider}，支持的provider有: ${supportedProviders.join(', ')}`
            });
        }

        const configJsonStr = config_json ? JSON.stringify(config_json) : null;

        const [result] = await db.query(
            'INSERT INTO llm_configs (provider, name, api_key, base_url, model, config_json) VALUES (?, ?, ?, ?, ?, ?)',
            [provider, name, api_key, base_url, model, configJsonStr]
        );

        res.json({
            code: 200,
            msg: '创建配置成功',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('创建LLM配置失败:', error);
        res.status(500).json({
            code: 500,
            msg: '创建配置失败',
            error: error.message
        });
    }
};

/**
 * 更新LLM配置
 * PUT /api/llm/configs/:id
 */
exports.updateLLMConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { provider, name, api_key, base_url, model, config_json } = req.body;

        // 检查配置是否存在
        const [existing] = await db.query('SELECT * FROM llm_configs WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({
                code: 404,
                msg: '配置不存在'
            });
        }

        // 构建更新SQL
        const updates = [];
        const values = [];

        if (provider !== undefined) {
            updates.push('provider = ?');
            values.push(provider);
        }
        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (api_key !== undefined) {
            updates.push('api_key = ?');
            values.push(api_key);
        }
        if (base_url !== undefined) {
            updates.push('base_url = ?');
            values.push(base_url);
        }
        if (model !== undefined) {
            updates.push('model = ?');
            values.push(model);
        }
        if (config_json !== undefined) {
            updates.push('config_json = ?');
            values.push(config_json ? JSON.stringify(config_json) : null);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                code: 400,
                msg: '没有需要更新的字段'
            });
        }

        values.push(id);

        await db.query(
            `UPDATE llm_configs SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({
            code: 200,
            msg: '更新配置成功'
        });
    } catch (error) {
        console.error('更新LLM配置失败:', error);
        res.status(500).json({
            code: 500,
            msg: '更新配置失败',
            error: error.message
        });
    }
};

/**
 * 删除LLM配置
 * DELETE /api/llm/configs/:id
 */
exports.deleteLLMConfig = async (req, res) => {
    try {
        const { id } = req.params;

        // 检查是否为激活配置
        const [config] = await db.query('SELECT is_active FROM llm_configs WHERE id = ?', [id]);
        if (config.length === 0) {
            return res.status(404).json({
                code: 404,
                msg: '配置不存在'
            });
        }

        if (config[0].is_active) {
            return res.status(400).json({
                code: 400,
                msg: '无法删除激活中的配置，请先切换到其他配置'
            });
        }

        await db.query('DELETE FROM llm_configs WHERE id = ?', [id]);

        res.json({
            code: 200,
            msg: '删除配置成功'
        });
    } catch (error) {
        console.error('删除LLM配置失败:', error);
        res.status(500).json({
            code: 500,
            msg: '删除配置失败',
            error: error.message
        });
    }
};

/**
 * 设置激活的LLM配置
 * POST /api/llm/configs/:id/activate
 */
exports.setActiveLLM = async (req, res) => {
    try {
        const { id } = req.params;

        // 检查配置是否存在
        const [config] = await db.query('SELECT * FROM llm_configs WHERE id = ?', [id]);
        if (config.length === 0) {
            return res.status(404).json({
                code: 404,
                msg: '配置不存在'
            });
        }

        // 使用事务确保原子性
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 取消所有配置的激活状态
            await connection.query('UPDATE llm_configs SET is_active = FALSE');

            // 激活指定配置
            await connection.query('UPDATE llm_configs SET is_active = TRUE WHERE id = ?', [id]);

            await connection.commit();

            res.json({
                code: 200,
                msg: '切换激活配置成功'
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('设置激活LLM失败:', error);
        res.status(500).json({
            code: 500,
            msg: '设置激活配置失败',
            error: error.message
        });
    }
};

/**
 * 测试LLM连接
 * POST /api/llm/test
 */
exports.testLLMConnection = async (req, res) => {
    try {
        const { provider, api_key, base_url, model } = req.body;

        if (!provider || !api_key || !base_url || !model) {
            return res.status(400).json({
                code: 400,
                msg: '缺少必填参数'
            });
        }

        // 创建临时客户端
        const client = new OpenAI({
            apiKey: api_key,
            baseURL: base_url
        });

        // 发送测试请求（简单的聊天完成）
        const testMessage = '你好，请回复"连接成功"';

        const startTime = Date.now();
        const completion = await client.chat.completions.create({
            model: model,
            messages: [{ role: 'user', content: testMessage }],
            max_tokens: 50,
            temperature: 0.1
        });
        const responseTime = Date.now() - startTime;

        const responseContent = completion.choices[0]?.message?.content || '';

        res.json({
            code: 200,
            msg: 'API连接测试成功',
            data: {
                success: true,
                response_time: responseTime,
                response_preview: responseContent.substring(0, 100),
                model_used: completion.model
            }
        });
    } catch (error) {
        console.error('LLM连接测试失败:', error);

        // 根据错误类型返回更详细的信息
        let errorMsg = 'API连接失败';
        if (error.status === 401) {
            errorMsg = 'API Key无效或未授权';
        } else if (error.status === 404) {
            errorMsg = '模型不存在或API地址错误';
        } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            errorMsg = '无法连接到API服务器，请检查网络和base_url';
        }

        res.json({
            code: 500,
            msg: errorMsg,
            data: {
                success: false,
                error: error.message,
                error_code: error.status || error.code
            }
        });
    }
};

/**
 * 工具函数：脱敏API key
 */
function maskApiKey(apiKey) {
    if (!apiKey || apiKey.length < 8) {
        return '****';
    }
    const prefix = apiKey.substring(0, 4);
    const suffix = apiKey.substring(apiKey.length - 4);
    return `${prefix}****${suffix}`;
}
