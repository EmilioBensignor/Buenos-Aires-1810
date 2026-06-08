/** @type {import('tailwindcss').Config} */
// Paleta y tipografía de época: todo oscuro salvo donde hay fuego.
export default {
  content: [
    './app/**/*.{vue,js}',
    './app.vue'
  ],
  theme: {
    extend: {
      colors: {
        // Fondos
        noche: '#0d0b0f',
        'noche-2': '#14110d',
        tierra: '#2a2018',

        // Texto claro (cuerpo sobre fondo oscuro)
        light: '#f0e6d2',

        // Fuego / farol (acentos cálidos)
        farol: '#ffb24d',
        dorado: '#ffd27a',
        brasa: '#e8731f',
        ascua: '#9e4a2f',

        // Materiales de época
        madera: '#6b4423',
        'madera-claro': '#8a5a2b',
        adobe: '#c89b6a',
        'adobe-osc': '#a87b4a',
        tejado: '#9e4a2f',

        // Estados de juego
        ganancia: '#7bc96f',
        perdida: '#d65a4a',

        // Cielo de atardecer (loaders / resultado)
        'cielo-naranja': '#e8731f',
        'cielo-violeta': '#3a2a4d'
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        cuerpo: ['"Crimson Pro"', 'Georgia', 'serif']
      },
      screens: {
        xxl: '1440px'
      },
      boxShadow: {
        farol: '0 0 24px rgba(255, 178, 77, 0.45)',
        'farol-lg': '0 0 48px rgba(255, 178, 77, 0.55)'
      }
    }
  },
  plugins: []
}
