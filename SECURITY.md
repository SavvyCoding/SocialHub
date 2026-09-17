# Security Policy

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues, discussions or pull requests.

Instead, use GitHub's private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**. If that option is unavailable to you, contact the maintainer directly through their GitHub profile and ask for a private channel.

Include as much of the following as you can:

- The type of issue (for example authentication bypass, injection, data exposure, rate-limit bypass)
- The affected component or endpoint (tRPC procedure, route, job, socket event)
- Steps to reproduce, or a proof of concept
- The impact you believe it has

You should receive an acknowledgement within 5 working days. We will keep you informed of progress and credit you in the release notes if you would like.

## Supported versions

SocialHub does not yet publish versioned releases. Security fixes are made on the `main` branch. If you self-host, track `main` and rebuild your images after a fix lands.

## Scope

In scope:

- The web application in `apps/web`, including the tRPC API, authentication, background jobs and the Prisma data layer
- The Socket.IO server in `apps/socket-server`
- The production Docker Compose stack in `deployment/`

Out of scope:

- Third-party services the app integrates with (Cloudinary, TMDB, Open Library, Mapbox, Resend, Sentry). Report those to the vendor.
- Issues that require a compromised host, database or Redis instance
- Demo data and the seeded example accounts

## Hardening notes for self-hosters

- Generate a strong `AUTH_SECRET` (`openssl rand -base64 32`) and never reuse it between environments. The same secret authenticates socket connections.
- Keep `deployment/.env` out of version control; it is already ignored.
- Put the stack behind TLS. Neither the web app nor the socket server terminates HTTPS themselves.
- The socket server's internal `POST /notify` endpoint is authenticated with the shared secret and should not be exposed publicly.
- Rate limits are enforced in Redis. Running without Redis disables them.
