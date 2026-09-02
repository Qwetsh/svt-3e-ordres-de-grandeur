import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Chemins relatifs : l'application fonctionne quel que soit le sous-dossier
  // dans lequel elle est déposée sur l'ENT, sans reconfiguration.
  base: './',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Ordres de grandeur du monde microscopique',
        short_name: 'Ordres de grandeur',
        description: 'Zoom continu de 100 nm à 1 mm, tous les objets à la même échelle réelle.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#0b0f16',
        theme_color: '#0b0f16',
        icons: [{ src: './favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // Tout est mis en cache dès la première visite : ensuite l'application
        // fonctionne intégralement hors ligne, ce qui est le cas d'usage réel
        // en salle de classe.
        // Le .glb est le modèle 3D du Demodex : sans lui dans cette liste,
        // l'acarien retomberait sur son modèle simplifié dès que la tablette
        // est hors ligne.
        globPatterns: ['**/*.{js,css,html,svg,woff2,glb}'],
        // Three.js pèse à lui seul plus que le plafond par défaut de 2 Mo.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],

  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Three.js dans un fichier séparé : lors d'une mise à jour du contenu
        // pédagogique, les tablettes ne retéléchargent pas le moteur 3D.
        manualChunks: { three: ['three'] },
      },
    },
  },
})
