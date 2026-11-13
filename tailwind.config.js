/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./brigada-mantenimiento/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1D3557',
          teal: '#2A9D8F',
          coral: '#E63946',
          light: '#F8F9FA',
          border: '#E5E7EB',
          sand: '#E9C46A',
          ochre: '#F4A261'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};
