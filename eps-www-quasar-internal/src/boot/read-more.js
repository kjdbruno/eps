import { boot } from 'quasar/wrappers'
import ReadMore from '@lazgram/vue3-read-more'
import '@lazgram/vue3-read-more/dist/style.css'

export default boot(({ app }) => {
  app.use(ReadMore)
})