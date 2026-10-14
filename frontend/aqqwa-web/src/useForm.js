// Shared form logic: "Saving..." state, 422 field errors, and a page-level error message.
//
//   const form = useForm()
//   await form.submit(() => api.post('/events', data))
//
// - 422: each message goes under its field (form.errors.title, ...).
// - 403: "You are not allowed to do this." at the top of the form.
// - anything else (404, 409, 429, 5xx, offline, timeout): the friendly message from api.js.
// Every error is already { status, message, errors } because api.js builds it.

import { reactive, ref } from 'vue'

export function useForm() {
  const errors = reactive({})
  const error = ref('')
  const saving = ref(false)

  function clearErrors() {
    for (const key of Object.keys(errors)) delete errors[key]
    error.value = ''
  }

  // Call from @input on a field so its red message disappears while the user fixes it.
  function clearField(field) {
    delete errors[field]
  }

  function fieldError(field) {
    return errors[field] ? errors[field][0] : ''
  }

  function showError(err) {
    if (err.status === 422) {
      for (const [field, messages] of Object.entries(err.errors || {})) {
        errors[field] = messages
      }
    }
    error.value = err.message
  }

  // Runs the request; returns its result, or null if it failed (the error is already shown).
  async function submit(requestFn) {
    clearErrors()
    saving.value = true
    try {
      return await requestFn()
    } catch (err) {
      showError(err)
      return null
    } finally {
      saving.value = false
    }
  }

  return { errors, error, saving, submit, clearField, clearErrors, fieldError, showError }
}
