/**
 * LLM服务抽象层
 * 提供统一的LLM调用接口，支持多provider
 */
const db = require('../db/promise');
const OpenAI = require('openai');

class LLMService {
    constructor() {
        this.activeConfig = null;
        this.client = null;
    }

    /**
     * 获取当前激活的LLM配置
     */
    async getActiveConfig() {
        try {
            const [configs] = await db.query(
                'SELECT * FROM llm_configs WHERE is_active = TRUE LIMIT 1'
            );

            if (configs.length === 0) {
                throw new Error('没有激活的LLM配置，请先在管理后台配置');
            }

            const config = configs[0];

            // 解析config_json
            let parsedConfig = null;
            if (config.config_json) {
                try {
                    parsedConfig = JSON.parse(config.config_json);
                } catch (e) {
                    console.warn('Failed to parse config_json:', e);
                }
            }

            return {
                ...config,
                config_json: parsedConfig
            };
        } catch (error) {
            console.error('Failed to get active LLM config:', error);
            throw error;
        }
    }

    /**
     * 初始化或刷新LLM客户端
     */
    async initClient() {
        const config = await this.getActiveConfig();

        this.activeConfig = config;
        this.client = new OpenAI({
            apiKey: config.api_key,
            baseURL: config.base_url
        });

        console.log(`LLM Service initialized with provider: ${config.provider}, model: ${config.model}`);

        return this.client;
    }

    /**
     * 确保客户端已初始化
     */
    async ensureClient() {
        if (!this.client || !this.activeConfig) {
            await this.initClient();
        }
        return this.client;
    }

    /**
     * 统一的聊天完成接口
     * @param {Array} messages - 消息数组
     * @param {Object} options - 可选配置
     */
    async chat(messages, options = {}) {
        try {
            const client = await this.ensureClient();

            // 合并默认配置和自定义配置
            const defaultConfig = this.activeConfig.config_json || {};
            const finalConfig = {
                model: this.activeConfig.model,
                messages: messages,
                temperature: options.temperature || defaultConfig.temperature || 0.7,
                max_tokens: options.max_tokens || defaultConfig.max_tokens || 4000,
                ...options
            };

            const completion = await client.chat.completions.create(finalConfig);

            return completion.choices[0]?.message?.content || '';
        } catch (error) {
            console.error('LLM chat failed:', error);
            throw new Error(`LLM调用失败: ${error.message}`);
        }
    }

    /**
     * 流式聊天完成接口
     * @param {Array} messages - 消息数组  
     * @param {Object} options - 可选配置
     */
    async streamChat(messages, options = {}) {
        try {
            const client = await this.ensureClient();

            // 合并默认配置和自定义配置
            const defaultConfig = this.activeConfig.config_json || {};
            const finalConfig = {
                model: this.activeConfig.model,
                messages: messages,
                stream: true,
                temperature: options.temperature || defaultConfig.temperature || 0.7,
                max_tokens: options.max_tokens || defaultConfig.max_tokens || 4000,
                ...options
            };

            const stream = await client.chat.completions.create(finalConfig);

            return stream;
        } catch (error) {
            console.error('LLM stream chat failed:', error);
            throw new Error(`LLM流式调用失败: ${error.message}`);
        }
    }

    /**
     * 重新加载配置（当配置更新时调用）
     */
    async reload() {
        this.activeConfig = null;
        this.client = null;
        await this.initClient();
    }
}

// 导出单例
const llmService = new LLMService();

module.exports = llmService;
