import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import basicSsl from '@vitejs/plugin-basic-ssl';
import Icons from 'unplugin-icons/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), basicSsl(), Icons({autoInstall:true, compiler:'svelte'})],
  server: {
    host: true,
  },

})
