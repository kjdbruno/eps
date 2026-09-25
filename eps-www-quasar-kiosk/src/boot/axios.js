import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'

// Same pattern as eps-www-quasar-external's boot/axios.js — baseURL + api key come from
// quasar.config.js's build.env block (VUE_APP_*), not hardcoded here. The kiosk has no login of
// its own, so there's no JWT/Authorization header to attach — every request is just the shared
// API key, same as the external app's guest (unauthenticated) requests.
const api = axios.create({
  baseURL: `${process.env.VUE_APP_BACKEND_URL}/api`,
})

api.interceptors.request.use(config => {
  config.headers.api = process.env.VUE_APP_API_KEY
  return config
}, error => {
  return Promise.reject(error)
})

export default defineBoot(({ app }) => {
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }
