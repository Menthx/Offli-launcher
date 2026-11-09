import type { Directive } from 'vue'

/** v-focus: focuses the element when it appears (autofocus only works on page load) */
export const vFocus: Directive<HTMLElement, boolean | undefined> = {
  mounted(el, binding) {
    if (binding.value !== false) el.focus()
  }
}
