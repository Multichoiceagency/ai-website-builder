import VueApexCharts from 'vue3-apexcharts'
import 'flatpickr/dist/flatpickr.min.css'
import 'jsvectormap/dist/jsvectormap.css'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

/**
 * Client-only UI libraries shared across the storefront.
 * ApexCharts is registered globally; Flatpickr, Headless UI, jsVectorMap and
 * Swiper are available via direct import in components.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('ApexChart', VueApexCharts)
})
