import { defineStore, acceptHMRUpdate } from 'pinia'

export const usePreferenceStore = defineStore('preferenceStore', {
  state: () => ({
    component: null,
    filter: null,
    isEdit: false,
    dialog: false,
    isLoading: false,
    isLoadingTable: false,
    office: null,
    holiday: null,
    canned: null,
    client: null,
    user: null,
  }),

  getters: {
    
  },

  
  actions: {
    
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(usePreferenceStore, import.meta.hot))
}
