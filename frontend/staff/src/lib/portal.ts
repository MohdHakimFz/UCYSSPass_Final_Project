// People sign in on the customer site, then are sent back here with their session.
export const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_URL ?? 'http://localhost:5175'
export const signInUrl = `${CUSTOMER_URL}/login?portal=organiser`
