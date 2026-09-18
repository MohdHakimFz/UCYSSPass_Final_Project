// People sign in on the customer site, then are sent back here with their session.
export const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL ?? "http://localhost:5175";
export const signInUrl = `${CUSTOMER_URL}/login?portal=admin`;
