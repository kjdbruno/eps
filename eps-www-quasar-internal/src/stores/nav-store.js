import { defineStore, acceptHMRUpdate } from 'pinia';

export const useNavigationStore = defineStore('navStore', {
  state: () => ({
    analyticsRoute: null,
    complaintRoute: null,
    feedbackRoute: null,
    discussionRoute: null,
    preferenceRoute: null,
    reportRoute: null,
    accountRoute: null,
    logRoute: null
  }),

  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useNavigationStore, import.meta.hot))
}
