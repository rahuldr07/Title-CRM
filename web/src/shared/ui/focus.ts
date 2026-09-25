export function focusElement(el: HTMLElement | null) {
  if (!el) return
  el.scrollIntoView({ block: 'start', behavior: 'smooth' })
  el.classList.add('lit')
  setTimeout(() => el.classList.remove('lit'), 1500)
}

export const focusSection = (id: string) => focusElement(document.getElementById(id))
