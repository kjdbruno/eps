import { defineStore, acceptHMRUpdate } from 'pinia'

export const useFeedbackStore = defineStore('feedbackStore', {
  state: () => ({
    component: null,
    details: null,
    year: ''
  }),

  getters: {
    
  },

  
  actions: {
    
  },
  persist: true,
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFeedbackStore, import.meta.hot))
}
