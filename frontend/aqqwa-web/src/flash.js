// One message shown at the top of the page (e.g. "Your session has expired",
// or a warning when a user opens another role's page).

import { reactive } from 'vue'

// keep = true lets the message survive the next page change (it is usually set right before a redirect).
export const flash = reactive({ type: '', text: '', keep: false })

export function showFlash(text, type = 'info') {
  flash.text = text
  flash.type = type
  flash.keep = true
}

export function clearFlash() {
  flash.text = ''
  flash.type = ''
  flash.keep = false
}

// Called by the router on every page change.
export function onPageChange() {
  if (flash.keep) flash.keep = false
  else clearFlash()
}
