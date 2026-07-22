import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: '空间站 Space Station',
        short_name: 'Space Station',
        description: 'SillyTavern 角色卡编辑与 AI 预设管理',
        theme_color: '#6366f1',
        background_color: '#0b1121',
        display: 'standalone',
        icons: [
          { src: 'favicon.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Token 统计默认关闭；运行库只在首次启用后进入运行时缓存。
        globIgnores: ['**/tokenizer.worker-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/tokenizer\.worker-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tokenizer-runtime-v1',
              expiration: { maxEntries: 2, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /\/tokenizers\/[^/]+\.(json|model)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tokenizer-assets-v1',
              expiration: { maxEntries: 3, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https?:\/\/.*\.(png|jpg|jpeg|webp|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
