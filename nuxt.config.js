// Juego client-only (canvas + GSAP), sin SSR.
export default defineNuxtConfig({
  ssr: false,

  modules: ['@nuxtjs/tailwindcss'],

  // Auto-import sin prefijo de carpeta: <Hud>, <WelcomeScene>, <DiceGame> resuelven
  // aunque vivan en subcarpetas (ui/, scenes/, minigames/).
  components: [{ path: '~/components', pathPrefix: false }],

  css: ['~/assets/css/main.css'],

  // GSAP se importa dinámico en varios minijuegos. Pre-declararla evita que Vite
  // re-optimice deps a mitad del arranque (error 504 "Outdated Optimize Dep").
  vite: {
    optimizeDeps: { include: ['gsap'] }
  },

  app: {
    head: {
      title: 'Buenos Aires 1810',
      htmlAttrs: { lang: 'es' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Timba criolla en la Plaza de Mayo, 1810. Saldá tu deuda con la mafia.' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico?v=2' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap'
        }
      ]
    }
  },

  compatibilityDate: '2025-01-01'
})
