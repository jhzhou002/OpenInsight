<template>
	<div class="openrank-table" ref="tableWrapperRef" :style="tableStyle">
		<!-- 绛涢€夊櫒 -->
		<div class="table-filters" ref="tableFiltersRef">
			<a-space :size="8">
				<!-- 鎺掑悕妯″紡鍒囨崲 -->
				<a-radio-group v-model:value="rankMode" button-style="solid" size="small" class="rank-mode-group">
					<a-radio-button value="month">月度</a-radio-button>
					<a-radio-button value="year">年度</a-radio-button>
				</a-radio-group>

				<!-- 骞翠唤閫夋嫨 -->
				<a-date-picker
					v-model:value="selectedYear"
					picker="year"
					placeholder="年份"
					size="small"
					class="year-picker"
					:disabled-date="disabledYear"
					:allow-clear="false"
					@change="onYearChange"
				/>

				<!-- 鏈堜唤閫夋嫨锛堜粎鏈堝害妯″紡鏄剧ず锛?-->
				<a-date-picker
					v-if="rankMode === 'month'"
					v-model:value="selectedMonth"
					picker="month"
					placeholder="月份"
					size="small"
					class="month-picker"
					format="M月"
					:disabled-date="disabledMonth"
					:allow-clear="false"
					@change="onMonthChange"
				/>
			</a-space>
		</div>

		<!-- 琛ㄦ牸 -->
		<div class="openrank-table-content" ref="tableContentRef">
			<a-table
				:columns="columns"
				:data-source="tableData"
				:pagination="false"
				:loading="loading"
				size="small"
				class="openrank-table-core"
			>
				<template #bodyCell="{ column, record, index }">
					<template v-if="column.key === 'rank'">
						<div class="rank-cell" :class="`rank-${index + 1}`">
							{{ index + 1 }}
						</div>
					</template>
					<template v-if="column.key === 'project'">
						<div class="project-cell" :title="record.project">
							{{ record.project }}
						</div>
					</template>
					<template v-if="column.key === 'openrank'">
						<div class="openrank-cell">
							{{ record.openrank }}
						</div>
					</template>
				</template>
			</a-table>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, onBeforeUnmount } from 'vue';
import dayjs, { Dayjs } from 'dayjs';
import { getOpenRankData } from '../../service';

// 鎵€鏈夐」鐩殑OpenRank鏁版嵁
const allProjectsData = ref<Array<any>>([]);

// 鎺掑悕妯″紡锛歮onth鎴杫ear
const rankMode = ref<'month' | 'year'>('month');

// 閫変腑鐨勫勾浠藉拰鏈堜唤
const selectedYear = ref<Dayjs>();
const selectedMonth = ref<Dayjs>();

const loading = ref(false);

// 灏哄 & 鑷€傚簲鐩稿叧
const tableWrapperRef = ref<HTMLElement | null>(null);
const tableFiltersRef = ref<HTMLElement | null>(null);
const tableContentRef = ref<HTMLElement | null>(null);
const rowHeight = ref(44);
const bodyHeight = ref(440);
const fontSize = ref(13);
const BODY_GAP = 8;

const tableStyle = computed(() => ({
	'--openrank-row-height': `${rowHeight.value}px`,
	'--openrank-body-height': `${bodyHeight.value}px`,
	'--openrank-font-size': `${fontSize.value}px`
}));

// 琛ㄦ牸鍒楀畾涔?
const columns = [
	{
		title: '序号',
		key: 'rank',
		width: 80,
		align: 'center'
	},
	{
		title: '项目',
		key: 'project',
		ellipsis: true,
		align: 'center'
	},
	{
		title: 'OpenRank',
		key: 'openrank',
		width: 120,
		align: 'center'
	}
];

// 琛ㄦ牸鏁版嵁
const tableData = ref<Array<{ project: string; openrank: string }>>([]);

/**
 * 鑾峰彇鎵€鏈夊彲鐢ㄧ殑鏃ユ湡
 */
const getAvailableDates = () => {
	const dates = new Set<string>();
	allProjectsData.value.forEach((project: any) => {
		if (project.openrank) {
			const openrankData = project.openrank;
			Object.keys(openrankData).forEach(date => {
				if (openrankData[date] !== null && openrankData[date] !== undefined) {
					dates.add(date);
				}
			});
		}
	});
	return Array.from(dates).sort().reverse(); // 闄嶅簭鎺掑垪锛屾渶鏂扮殑鍦ㄥ墠
};

/**
 * 鍒濆鍖栭粯璁ら€夋嫨鏈€鏂版湀浠?
 */
const initDefaultDate = () => {
	const availableDates = getAvailableDates();
	if (availableDates.length > 0) {
		const latestDate = availableDates[0]; // 濡? "2025-10"
		selectedMonth.value = dayjs(latestDate, 'YYYY-MM');
		selectedYear.value = dayjs(latestDate, 'YYYY-MM');
	} else {
		// 濡傛灉娌℃湁鏁版嵁锛岄粯璁ゅ綋鍓嶆湀
		selectedMonth.value = dayjs();
		selectedYear.value = dayjs();
	}
};

/**
 * 璁＄畻鏈堝害鎺掑悕鏁版嵁
 */
const calculateMonthlyRank = (yearMonth: string) => {
	const rankings: Array<{ project: string; openrank: number }> = [];

	allProjectsData.value.forEach((project: any) => {
		if (project.openrank) {
			const openrankData = project.openrank;
			const value = openrankData[yearMonth];
			if (value !== null && value !== undefined) {
				rankings.push({
					project: `${project.company_name}/${project.project_name}`,
					openrank: parseFloat(value)
				});
			}
		}
	});

	// 鎺掑簭骞跺彇鍓?0
	rankings.sort((a, b) => b.openrank - a.openrank);
	return rankings.slice(0, 10).map(item => ({
		project: item.project,
		openrank: item.openrank.toFixed(2)
	}));
};

/**
 * 璁＄畻骞村害鎺掑悕鏁版嵁锛堟€诲拰锛?
 */
const calculateYearlyRank = (year: string) => {
	const rankings: Array<{ project: string; openrank: number }> = [];

	allProjectsData.value.forEach((project: any) => {
		if (project.openrank) {
			const openrankData = project.openrank;
			let yearTotal = 0;
			let hasData = false;

			// 閬嶅巻璇ュ勾鐨勬墍鏈夋湀浠?
			Object.keys(openrankData).forEach(date => {
				if (date.startsWith(year)) {
					const value = openrankData[date];
					if (value !== null && value !== undefined) {
						yearTotal += parseFloat(value);
						hasData = true;
					}
				}
			});

			if (hasData) {
				rankings.push({
					project: `${project.company_name}/${project.project_name}`,
					openrank: yearTotal
				});
			}
		}
	});

	// 鎺掑簭骞跺彇鍓?0
	rankings.sort((a, b) => b.openrank - a.openrank);
	return rankings.slice(0, 10).map(item => ({
		project: item.project,
		openrank: item.openrank.toFixed(2)
	}));
};

/**
 * 鏇存柊琛ㄦ牸鏁版嵁
 */
const updateTableData = () => {
	loading.value = true;

	setTimeout(() => {
		if (rankMode.value === 'month' && selectedMonth.value) {
			const yearMonth = selectedMonth.value.format('YYYY-MM');
			tableData.value = calculateMonthlyRank(yearMonth);
		} else if (rankMode.value === 'year' && selectedYear.value) {
			const year = selectedYear.value.format('YYYY');
			tableData.value = calculateYearlyRank(year);
		}
		nextTick(updateTableLayout);
		loading.value = false;
	}, 100);
};

/**
 * 绂佺敤鏈潵鐨勫勾浠?
 */
const disabledYear = (current: Dayjs) => {
	return current && current.year() > dayjs().year();
};

/**
 * 绂佺敤鏈潵鐨勬湀浠?
 */
const disabledMonth = (current: Dayjs) => {
	return current && current.isAfter(dayjs());
};

/**
 * 骞翠唤鍙樺寲
 */
const onYearChange = () => {
	if (rankMode.value === 'year') {
		updateTableData();
	} else if (selectedMonth.value) {
		// 鏈堝害妯″紡涓嬶紝骞翠唤鍙樺寲鍚庯紝璋冩暣鏈堜唤鍒板悓涓€骞?
		const newMonth = selectedMonth.value.year(selectedYear.value!.year());
		if (!disabledMonth(newMonth)) {
			selectedMonth.value = newMonth;
		}
	}
};

/**
 * 鏈堜唤鍙樺寲
 */
const onMonthChange = () => {
	selectedYear.value = selectedMonth.value;
	updateTableData();
};

// 鐩戝惉鎺掑悕妯″紡鍙樺寲
watch(rankMode, () => {
	updateTableData();
});

/**
 * Resize table body so 10 rows always fit
 */
const updateTableLayout = () => {
	requestAnimationFrame(() => {
		const container = tableContentRef.value;
		if (!container) return;

		const containerRect = container.getBoundingClientRect();
		const tableHead = container.querySelector('.ant-table-thead') as HTMLElement | null;
		const headerHeight = tableHead?.getBoundingClientRect().height ?? 0;

		const availableBodyHeight = Math.max(containerRect.height - headerHeight - BODY_GAP, 0);
		if (availableBodyHeight <= 0) return;

		const rows = Math.max(tableData.value.length || 0, 10);
		const idealRowHeight = availableBodyHeight / rows;

		rowHeight.value = idealRowHeight;
		bodyHeight.value = availableBodyHeight;
		fontSize.value = Math.min(14, Math.max(11, idealRowHeight * 0.36));
	});
};

watch(
	() => tableData.value.length,
	() => {
		nextTick(updateTableLayout);
	}
);

/**
 * 鍔犺浇鎵€鏈夐」鐩殑OpenRank鏁版嵁
 */
const loadOpenRankData = async () => {
	loading.value = true;
	try {
		const res = await getOpenRankData();
		if (res.code === 200) {
			allProjectsData.value = res.data || [];
			initDefaultDate();
			updateTableData();
			nextTick(updateTableLayout);
		}
	} catch (error) {
		console.error('Failed to load OpenRank data:', error);
	} finally {
		loading.value = false;
	}
};

// 缁勪欢鎸傝浇鏃跺垵濮嬪寲
onMounted(() => {
	loadOpenRankData();
	window.addEventListener('resize', updateTableLayout);
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', updateTableLayout);
});
</script>

<style lang="scss" scoped>
.openrank-table {
	height: 100%;
	display: flex;
	flex-direction: column;
	padding: 8px;
	padding-bottom: 10px;

	.table-filters {
		margin-bottom: 12px;
		display: flex;
		align-items: center;
		flex-shrink: 0;

		:deep(.ant-space) {
			flex-wrap: nowrap !important;
		}

		.rank-mode-group {
			:deep(.ant-radio-button-wrapper) {
				min-width: 50px;
				padding: 0 10px;
				font-size: 13px;
			}
		}

		.year-picker {
			width: 85px !important;
		}

		.month-picker {
			width: 75px !important;
		}

		:deep(.ant-radio-group) {
			.ant-radio-button-wrapper {
				background: rgba(15, 23, 42, 0.6);
				border-color: rgba(56, 189, 248, 0.3);
				color: #94a3b8;

				&:hover {
					color: #38bdf8;
				}

				&.ant-radio-button-wrapper-checked {
					background: rgba(56, 189, 248, 0.2);
					border-color: #38bdf8;
					color: #38bdf8;
				}
			}
		}

		:deep(.ant-picker) {
			background: rgba(15, 23, 42, 0.6);
			border-color: rgba(56, 189, 248, 0.3);

			.ant-picker-input > input {
				color: #e2e8f0;
				font-size: 13px;

				&::placeholder {
					color: #64748b;
					font-size: 12px;
				}
			}

			.ant-picker-suffix {
				color: #94a3b8;
			}

			&:hover {
				border-color: rgba(56, 189, 248, 0.6);
			}
		}
	}

	.openrank-table-content {
		flex: 1;
		overflow: hidden;
		display: flex;

		:deep(.ant-table-wrapper),
		:deep(.ant-spin-nested-loading),
		:deep(.ant-spin-container),
		:deep(.ant-table) {
			flex: 1;
			display: flex;
			flex-direction: column;
			background: transparent;
			color: #e2e8f0;
		overflow: hidden;
		}

		:deep(.ant-table-container) {
			flex: 1;
			display: flex;
			flex-direction: column;
		overflow: hidden;
		}

		:deep(.ant-table-thead > tr > th) {
			background: rgba(15, 23, 42, 0.8);
			border-bottom: 1px solid rgba(56, 189, 248, 0.3);
			color: #38bdf8;
			font-weight: 600;
			padding: 12px 8px;
		}

		:deep(.ant-table-body) {
			flex: 1;
			max-height: none;
			height: var(--openrank-body-height);
			overflow-y: auto;
			overflow-x: hidden;

			/* 隐藏滚动条但保持滚动功能 */
			&::-webkit-scrollbar {
				width: 0;
				height: 0;
			}

			scrollbar-width: none;
			-ms-overflow-style: none;
		}

		:deep(.ant-table-tbody > tr) {
			background: rgba(15, 23, 42, 0.4);
			height: var(--openrank-row-height);

			&:hover > td {
				background: rgba(56, 189, 248, 0.1);
			}

			> td {
				border-bottom: 1px solid rgba(56, 189, 248, 0.1);
				padding: 8px;
				vertical-align: middle;
				font-size: var(--openrank-font-size);
				line-height: 1.2;
			}
		}

		:deep(.ant-table-placeholder) {
			background: rgba(15, 23, 42, 0.4);
			color: #64748b;

			.ant-empty-description {
				color: #64748b;
			}
		}

		.rank-cell {
			font-weight: 600;
			font-size: calc(var(--openrank-font-size) + 1px);

			&.rank-1 {
				color: #fbbf24;
			}

			&.rank-2 {
				color: #94a3b8;
			}

			&.rank-3 {
				color: #f59e0b;
			}
		}

		.project-cell {
			color: #e2e8f0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.openrank-cell {
			color: #38bdf8;
			font-weight: 500;
			font-family: 'Consolas', 'Monaco', monospace;
		}
	}
}
</style>



