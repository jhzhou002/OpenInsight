import { POST } from '@/service/api';

export const getAnalysisData = (params: {
	projectIds: number[];
	metrics: string[];
	timeRange: string;
}) => {
	return POST('/home/getAnalysisData', params);
};

/**
 * 生成AI分析报告 (流式接收)
 */
export const generateAIAnalysis = async (
	params: {
		projectsData: any[];
		metrics: string[];
		timeRange: string;
	},
	onChunk: (chunk: string) => void
): Promise<void> => {
	const response = await fetch('http://127.0.0.1:8081/home/generateAIAnalysis', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params)
	});

	if (!response.ok) {
		throw new Error('网络请求失败');
	}

	const reader = response.body?.getReader();
	const decoder = new TextDecoder();

	if (!reader) {
		throw new Error('无法读取响应流');
	}

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				break;
			}

			const chunk = decoder.decode(value, { stream: true });
			const lines = chunk.split('\n');

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.substring(6);

					if (data === '[DONE]') {
						return;
					}

					try {
						const parsed = JSON.parse(data);
						if (parsed.content) {
							onChunk(parsed.content);
						}
					} catch (e) {
						// 忽略JSON解析错误
					}
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
};
