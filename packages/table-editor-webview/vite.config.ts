import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
  },
  define: {
    // Make ReactGrid behave as though it's using Safari
    // This makes handleCopy work properly; otherwise
    // you get some weird race condition:
    'window.navigator.userAgent.indexOf("Safari")': '1',
    'navigator.userAgent.indexOf("Chrome")': '-1',
    // this substitution enables pasting content copied from
    // the table into plain-text contexts. To get the function h
    // do esbuild --minify --bundle html-table-to-tsv.ts in src/
    'e.clipboardData.setData("text/html",n.innerHTML)': '(function() {function h(s) {let q=s.children[0].children,n=[];for(let t=0;t<q.length;t++){let j=[];let r=q[t].children;for(let o=0;o<r.length;o++){j.push(r[o].textContent||"")};n.push(j)}return n.map((t)=>t.join("\\t")).join("\\n");}e.clipboardData.setData("text/html",n.innerHTML);e.clipboardData.setData("text/plain",h(n.children[0]));})()',
  },
});
