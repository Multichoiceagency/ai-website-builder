import VueApexCharts from 'vue3-apexcharts'
import 'flatpickr/dist/flatpickr.min.css'
import 'jsvectormap/dist/jsvectormap.css'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

/**
 * Client-only UI libraries shared across the dashboard.
 * Import ApexCharts / Flatpickr / Headless UI / jsVectorMap / Swiper from
 * components as needed — this plugin registers ApexCharts globally and loads CSS.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('ApexChart', VueApexCharts)
})
