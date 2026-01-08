import { defineStore } from 'pinia';

const useOptionStore = defineStore('option', {
	state: () => ({
		option: [],
		dateList: [] as string[]
	})
});

export default useOptionStore;
