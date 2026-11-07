import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * One RAF loop for Lenis and GSAP, opt-in per section through
 * `data-motion="reveal"`. Without JavaScript the content is already visible;
 * with reduced motion the script never starts.
 */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

let lenis: Lenis | null = null
let tick: ((time: number) => void) | null = null
let context: gsap.Context | null = null

function stop(): void {
  context?.revert()
  context = null
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
  if (tick) {
    gsap.ticker.remove(tick)
    tick = null
  }
  lenis?.destroy()
  lenis = null
}

function start(): void {
  if (lenis || reducedMotion.matches) return

  gsap.registerPlugin(ScrollTrigger)

  lenis = new Lenis({
    smoothWheel: true,
    autoRaf: false,
    anchors: { offset: -84 },
  })
  lenis.on('scroll', ScrollTrigger.update)

  tick = (time: number) => {
    lenis?.raf(time * 1000)
  }
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  context = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('[data-motion="reveal"]').forEach((element) => {
      gsap.from(element, {
        opacity: 0,
        y: 16,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: element,
          start: 'top 88%',
          once: true,
        },
      })
    })
  })

  document.documentElement.classList.add('motion-ready')
}

start()

reducedMotion.addEventListener('change', (event) => {
  if (event.matches) {
    stop()
    document.documentElement.classList.remove('motion-ready')
  } else {
    start()
  }
})
