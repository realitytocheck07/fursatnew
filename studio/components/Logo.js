import { createElement as h } from 'react'

// Fursat logo in the Studio top bar (file lives in studio/static/).
export default function Logo() {
  return h('img', { src: '/static/fursat-logo.webp', alt: 'Fursat Kitchen | Bar', style: { display: 'block', height: 32, width: 'auto' } })
}
