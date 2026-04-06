# Wiseoak

This site now submits enquiry forms through a server-side endpoint at `/api/submit-enquiry` so HubSpot configuration stays out of browser code.

Vercel setup:

1. In the Vercel project, open `Settings -> Environment Variables`.
2. Add `HUBSPOT_PORTAL_ID`.
3. Add `HUBSPOT_FORM_ID_STEP1`.
4. Add `HUBSPOT_FORM_ID_STEP2`.
5. Add them for at least the `Production` environment.
6. Redeploy after saving the variables.

Notes:

1. Do not use `NEXT_PUBLIC_` or any client-exposed prefix for these values.
2. `vercel.json` enables clean URLs and trailing slashes so `/thank-you/` resolves cleanly.
3. The server-side function lives at [api/submit-enquiry.js](/c:/Users/aksha/Desktop/wiseoak/api/submit-enquiry.js).

Important:

The browser no longer needs HubSpot IDs, but this is only secure in production if those variables are configured in the hosting platform and not committed to git.
