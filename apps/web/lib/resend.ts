import { Resend } from "resend"

// Only instantiate when the API key is present — v6.9.2 throws at construction
// if the key is missing, which would crash the tRPC module at load time.
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export const FROM_ADDRESS = "SocialHub <notifications@socialhub.app>"
