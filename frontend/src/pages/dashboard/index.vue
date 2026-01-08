<template>
	<div class="home">
		<transition-loading :isShow="loadShow" />
		<floating-menu />

		<div class="chart-list">
			<home-header />
			<div style="padding: 0 8px" class="chart-content">
				<!-- 整体布局 左 中 右 -->
				<a-row :gutter="[8, 8]" class="chart-content-row">
					<!-- 左侧 -->
					<a-col v-bind="leftRightCol" class="chart-content-col">
						<a-row class="chart-content-left">
							<a-col class="chart-content-left-item" :span="24">
								<ModuleItem title="OpenRank项目榜" :loading="initLoading">
									<OpenRankTable />
								</ModuleItem>
							</a-col>
							<a-col class="chart-content-left-item" :span="24">
								<ModuleItem title="PREI" :loading="initLoading">
									<div :ref="preiChart.container" class="chart-container" />
								</ModuleItem>
							</a-col>
						</a-row>
					</a-col>
					<!-- 中间 -->
					<a-col v-bind="centerCol" class="chart-content-col">
						<a-row class="chart-content-center">
							<a-col class="chart-content-center-item" :span="24">
								<ModuleItem :loading="initLoading">
									<div class="index-data">
										<index-num :initData="initData" />
										<radar-list :radarFirst="radarFirst" />
									</div>
								</ModuleItem>
							</a-col>
							<a-col class="chart-content-center-item" :span="24">
								<ModuleItem title="Github指数" :loading="github.loading">
									<div class="virtual-list-content">
										<list-header :titleList="titleList" />
										<virtual-list
											:data-source="github.dataSource"
											:loading="github.loading"
											:estimated-height="30"
											@scroll-end="github.addData"
											class="virtual-list"
										>
											<template #item="{ item }">
												<a-tooltip placement="top" color="rgba(73, 146, 255, 0.8)">
													<template #title>
														<span>项目名：{{ item.name }}</span>
													</template>
													<div class="virtual-list-item" @click="handleListClick(item)">
														<span class="virtual-list-item-col">{{ item.name }}</span>
														<span class="virtual-list-item-col">{{ item.influence }}</span>
														<span class="virtual-list-item-col">{{ item.trend }}</span>
														<span class="virtual-list-item-col">{{ item.response }}</span>
														<span class="virtual-list-item-col">{{ item.activity }}</span>
														<span class="virtual-list-item-col">{{ item.github }}</span>
													</div>
												</a-tooltip>
											</template>
										</virtual-list>
									</div>
								</ModuleItem>
							</a-col>
						</a-row>
					</a-col>
					<!-- 右侧 -->
					<a-col v-bind="leftRightCol" class="chart-content-col">
						<a-row class="chart-content-right">
							<a-col class="chart-content-right-item" :span="24">
								<ModuleItem title="关注度" :loading="initLoading">
									<div :ref="attentChart.container" class="chart-container"></div>
								</ModuleItem>
							</a-col>
							<a-col class="chart-content-right-item" :span="24">
								<ModuleItem title="开发者活跃度" :loading="initLoading">
									<div :ref="deverChart.container" class="chart-container"></div>
								</ModuleItem>
							</a-col>
							<a-col class="chart-content-right-item" :span="24">
								<ModuleItem title="项目活跃度" :loading="initLoading">
									<div :ref="projectChart.container" class="chart-container"></div>
								</ModuleItem>
							</a-col>
						</a-row>
					</a-col>
				</a-row>
				<!-- 背景地球 -->
				<earth-bg />
			</div>
		</div>
	</div>
	<!-- 弹窗 -->
	<chart-modal
		v-model:visible="chartModalData.visible"
		:type="chartModalData.type"
		:defaultValue="chartModalData.selectValue"
		@update:selectValue="handleModalSelectUpdate"
	/>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { debounce } from 'lodash';
import axios from 'axios';

import indexImg from '@/assets/images/index-bg.png';
import centerImg from '@/assets/images/center.png';
import headerImg from '@/assets/images/home-header.png';
import mapImg from '@/assets/images/map.png';
import lbxImg from '@/assets/images/lbx.png';
import jtImg from '@/assets/images/jt.png';

import HomeHeader from './components/home-header/index.vue';
import EarthBg from './components/earth-bg/index.vue';
import ChartModal from './components/chart-modal/index.vue';
import ListHeader from './components/list-header/index.vue';
import IndexNum from './components/index-num/index.vue';
import RadarList from './components/radar-list/index.vue';
import FloatingMenu from '@/components/FloatingMenu.vue';
import OpenRankTable from './components/openrank-table/index.vue';

import useOpenRank from './composables/use-open-rank';
import useReviewEfficient from './composables/use-review-efficient';
import useChartModal from './composables/use-chart-modal';
import useGithub from './composables/use-github';
import useRadar from './composables/use-radar';

import useOptionStore from '@/store/option';
import useInitData from '@/store/initData';

import { titleList, leftRightCol, centerCol, generateDateList } from './config';

import { getInit, getOptions } from './service';

const chartModalData = useChartModal();
const linkedSelectedProjects = ref<number[]>([38, 41, 68]); // 共享的选中项目
const linkedTypes = [1, 3, 4, 5]; // 需要联动的图表类型 (PREI, Developer Activity, Attention, Project Activity)

// 包装 changeVisible 以实现联动逻辑
const showHandlerWrapper = (originalHandler: any) => {
	return (visible: boolean, type: number, selectValue: any) => {
		// 如果是联动类型的图表，使用共享的 selectedProjects
		if (linkedTypes.includes(type)) {
			originalHandler(visible, type, linkedSelectedProjects.value);
		} else {
			originalHandler(visible, type, selectValue);
		}
	};
};

const handleModalSelectUpdate = (newVal: number[]) => {
	// 如果当前打开的弹窗是联动类型的，更新共享状态
	if (linkedTypes.includes(chartModalData.type)) {
		linkedSelectedProjects.value = newVal;
	}
};

const preiChart = useReviewEfficient({ showHandler: showHandlerWrapper(chartModalData.changeVisible), type: 1 });
const openRankChart = useOpenRank({ showHandler: showHandlerWrapper(chartModalData.changeVisible), type: 2 });
const deverChart = useOpenRank({ showHandler: showHandlerWrapper(chartModalData.changeVisible), type: 3 });
const attentChart = useOpenRank({ showHandler: showHandlerWrapper(chartModalData.changeVisible), type: 4 });
const projectChart = useOpenRank({ showHandler: showHandlerWrapper(chartModalData.changeVisible), type: 5 });
const github = useGithub();
const radarFirst = useRadar({
	onRemove: (name: string) => {
		const project = initDataStore.list.find((p: any) => p.name === name);
		if (project) {
			linkedSelectedProjects.value = linkedSelectedProjects.value.filter(id => id !== project.project_id);
		}
	}
});

const optionStore = useOptionStore();
const initDataStore = useInitData();

// 监听联动选中值的变化，更新首页的小图表
import { watch } from 'vue';
import { message } from 'ant-design-vue';

// 处理列表点击联动
const handleListClick = async (item: any) => {
	// 如果已经选中了，就不重复添加
	if (linkedSelectedProjects.value.includes(item.project_id)) {
		return message.warning('该项目已在图表中');
	}
	if (linkedSelectedProjects.value.length >= 5) {
		return message.warning('最多只能选择5个项目');
	}

	// 1. 确保拥有完整数据 (传入 item existing data 以复用雷达评分)
	await initDataStore.fetchFullProjectData(item.project_id, item.name, item);

	// 2. 更新共享选中状态 -> 触发 watcher
	linkedSelectedProjects.value = [...linkedSelectedProjects.value, item.project_id];
};

watch(linkedSelectedProjects, (newVal) => {
	// 更新图表内部选中的值
	preiChart.chart.selectValue = newVal;
	deverChart.chart.selectValue = newVal;
	attentChart.chart.selectValue = newVal;
	projectChart.chart.selectValue = newVal;

	// 重新渲染图表
	if (initDataStore.list && initDataStore.list.length) {
		preiChart.chart.initChart(initDataStore.list); // PREI不需要传type
		deverChart.chart.initChart(initDataStore.list, 'developer_activity');
		attentChart.chart.initChart(initDataStore.list, 'project_attention');
		projectChart.chart.initChart(initDataStore.list, 'project_activity');
		
		// 同步雷达图
		radarFirst.chart.updateFromIds(newVal, initDataStore.list);
	}
});

/**
 * @description 处理全部图表的缩放
 */
const chartResize = debounce(() => {
	preiChart.chart.resizeChart();
	openRankChart.chart.resizeChart();
	radarFirst.chart.resizeChart();
	deverChart.chart.resizeChart();
	attentChart.chart.resizeChart();
	projectChart.chart.resizeChart();
}, 500);

const loadShow = ref<boolean>(true);
const imgCount = 6;
let curCount = 0;
const addImgCount = () => {
	curCount++;
	if (curCount === imgCount) {
		loadShow.value = false;
	}
};

const loadImg = () => {
	const imgArr = [indexImg, centerImg, headerImg, mapImg, lbxImg, jtImg];
	imgArr.forEach(item => {
		const newImage = new Image();
		newImage.src = item;
		newImage.onload = () => {
			addImgCount();
		};
	});
};

const getOptionsData = async () => {
	const res = await getOptions();
	if (res.code === 200) {
		optionStore.option = res.data || [];
	}
};

// 从ETL配置获取时间范围并更新全局dateList
const updateTimeRange = async () => {
	try {
		const response = await axios.get('/api/etl/config');
		if (response.data.code === 200) {
			const timeRangeConfig = response.data.data.find((item: any) => item.config_key === 'time_range');
			if (timeRangeConfig && timeRangeConfig.config_value) {
				const { start, end } = timeRangeConfig.config_value;
				if (start && end) {
					// 动态更新dateList
					const newDateList = generateDateList(start, end);
					// 更新到 optionStore 或其他全局状态中
					optionStore.dateList = newDateList;
					console.log('Updated dateList from ETL config:', start, 'to', end);
				}
			}
		}
	} catch (error) {
		console.error('Failed to fetch time range from ETL config:', error);
	}
};

const initData = reactive({
	openRank: 0,
	gitHub: 0
});

const initLoading = ref<boolean>(false);
const getInitData = async () => {
	initLoading.value = true;
	const res = await getInit();
	if (res.code === 200) {
		nextTick(() => {
			initDataStore.list = res.data.list || [];
			preiChart.chart.initChart(res.data.list);
			openRankChart.chart.initChart(res.data.list, 'openrank');
			deverChart.chart.initChart(res.data.list, 'developer_activity');
			attentChart.chart.initChart(res.data.list, 'project_attention');
			projectChart.chart.initChart(res.data.list, 'project_activity');
			radarFirst.chart.initChart(res.data.list);
		});
		initData.openRank = res.data.other.openrankAverage;
		initData.gitHub = res.data.other.githubAverage;
	}
	initLoading.value = false;
};

onMounted(async () => {
	loadImg();
	// 先更新时间范围配置
	await updateTimeRange();
	// 然后加载其他数据
	getOptionsData();
	getInitData();
	github.addData();
	window.addEventListener('resize', chartResize);
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', chartResize);
});
</script>

<style lang="scss" scoped>
.home {
	position: relative;
	width: 100%;
	height: 100%;
	background: url('@/assets/images/index-bg.png') no-repeat;
	background-size: 100% 100%;

	.chart-list {
		height: 100%;

		.chart-content {
			height: calc(100% - 77px);
			margin-top: 12px;

			.chart-content-row,
			.chart-content-col {
				height: 100%;
			}

			.chart-container {
				width: 100%;
				height: 100%;
			}

			.virtual-list-content {
				display: flex;
				flex-direction: column;
				height: 98%;
				padding: 0 8px;

				.virtual-list-item {
					display: flex;
					gap: 8px;
					align-items: center;
					padding: 4px;
					color: rgb(255 255 255);
					cursor: pointer;

					&:hover {
						color: #68d8ff;
						background: rgb(255 255 255 / 10%);
					}

					&-col {
						width: 16%;
						overflow: hidden;
						text-align: center;
						text-overflow: ellipsis;
						white-space: nowrap;
					}

					&-col:nth-child(1) {
						width: 19.5%;
						text-align: left;
					}
				}
			}

			&-left {
				flex-direction: column;
				row-gap: 8px !important;
				height: 100%;

				&-item:nth-child(1) {
					flex: 2;
				}

				&-item:nth-child(2) {
					flex: 1;
				}
			}

			&-center {
				flex-direction: column;
				row-gap: 8px !important;
				height: 100%;

				&-item:nth-child(1) {
					flex: 2;

					.index-data {
						display: flex;
						flex-direction: column;
						height: 100%;
						margin: 0 16px;
					}
				}

				&-item:nth-child(2) {
					flex: 1;
				}
			}

			&-right {
				flex-direction: column;
				row-gap: 8px !important;
				height: 100%;

				&-item {
					flex: 1;
				}
			}
		}
	}
}

// 小屏幕下的样式
@media (max-width: 576px) {
	.home {
		height: unset;
		background: #060c20;

		.chart-content {
			.chart-content-col:first-child {
				height: 1000px !important;
			}

			&-left,
			&-center {
				&-item {
					flex: 1 !important;
				}
			}

			.chart-content-col:nth-child(2) {
				height: 1500px !important;
			}

			.chart-content-col:nth-child(3) {
				height: 1500px !important;
			}
		}
	}
}
</style>

<style lang="scss">
.ant-tooltip-inner {
	min-height: unset;
}

.tooltip-review {
	// width: 80%;
	overflow: hidden;

	.tooltip-title {
		width: 180px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tooltip-btn {
		width: max-content;
		padding: 2px 5px;
		margin: 5px 5px 0 0;
		color: #ffffff;
		cursor: pointer;
		background-color: #ff6e76;
		border-radius: 4px;
	}

	.tooltip-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
	}

	.tooltip-label-icon {
		display: flex;
		align-items: center;
		margin-right: 5px;
		overflow: hidden;

		.tooltip-label {
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.tooltip-icon {
			width: 6px;
			height: 6px;
			margin-right: 5px;
			border-radius: 50%;
		}
	}

	.tooltip-value {
		flex: 1;
		flex-shrink: 0;
		font-size: 15px;
		font-weight: bold;
		color: #666666;
	}
}
</style>
