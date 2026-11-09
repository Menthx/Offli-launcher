import { createApp } from 'vue'
import '@fontsource-variable/inter'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import App from './App.vue'
import './theme'
import './styles/index.css'
import { installTooltips } from './tooltip'

// DA tooltips on every [data-tooltip] element and icon button
installTooltips()

createApp(App).mount('#app')
