import { defineStore } from 'pinia';

const useInitData = defineStore('initData', {
	state: () => ({
		list: [] as any[]
	}),
	actions: {
		/**
		 * 获取并合并项目的完整数据（包含图表趋势数据和雷达图评分数据）
		 * @param project_id 项目ID
		 * @param name 项目名称
		 * @param initialData 可选的初始数据（如从列表点击带来的 partial data）
		 */
		async fetchFullProjectData(project_id: number, name: string, initialData: any = {}) {
			const { getProjectData } = await import('@/pages/dashboard/service');

			// 1. 检查 Store 中是否存在该项目
			let existingItem = this.list.find((item: any) => item.project_id === project_id);

			// 需要获取的趋势指标 (用于折线图/柱状图)
			const trendTypes = ['prei', 'openrank', 'developer_activity', 'project_attention', 'project_activity'];
			// 需要获取的评分指标 (用于雷达图) - 对应数据库字段名
			const scoreTypes = ['influence', 'response', 'activity', 'trend', 'github'];

			// 2. 确定需要获取哪些数据
			const tasks: Promise<any>[] = [];
			const taskTypes: string[] = [];

			// 辅助函数：添加请求任务
			const addTasks = (types: string[]) => {
				types.forEach(type => {
					// 如果 store 中没有该字段，且 initialData 中也没有，则请求
					if ((!existingItem || !existingItem[type]) && !initialData[type]) {
						tasks.push(getProjectData({ type, project_id }));
						taskTypes.push(type);
					}
				});
			};

			addTasks(trendTypes);
			addTasks(scoreTypes);

			// 3. 如果没任务，直接返回
			if (tasks.length === 0) {
				// 即使没有请求任务，如果传入了 initialData 且 store 中没有，也需要合并 initialData
				if (!existingItem) {
					this.list.push({ project_id, name, ...initialData });
				}
				return;
			}

			// 4. 并行请求
			try {
				const responses = await Promise.all(tasks);

				// 5. 组装数据
				// 如果是新项目
				if (!existingItem) {
					existingItem = { project_id, name, ...initialData };
					this.list.push(existingItem);
				} else {
					// 合并 initialData 到现有项目 (以防万一)
					Object.assign(existingItem, initialData);
				}

				responses.forEach((res, index) => {
					if (res.code === 200) {
						const type = taskTypes[index];
						// 趋势数据通常是 JSON 对象或数组，评分数据是数字/字符串
						// 这里的 getProjectData 可能会返回 "2.5" 这种字符串 (对于评分)，或者 JSON 对象 (对于趋势)
						existingItem[type] = res.data;
					}
				});

			} catch (error) {
				console.error('Fetch full project data error:', error);
			}
		}
	}
});

export default useInitData;
