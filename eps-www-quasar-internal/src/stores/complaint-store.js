import { defineStore, acceptHMRUpdate } from 'pinia'

export const useComplaintStore = defineStore('complaintStore', {
  state: () => ({
    component: null,
    details: null,
    year: '',
    //
    dialog: false,
    isLoading: false
  }),

  getters: {
    
  },

  
  actions: {
    
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useComplaintStore, import.meta.hot))
}
