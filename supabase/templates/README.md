# Supabase auth email templates

Same look as the app's billing emails (lib/email.ts): white rounded card on
soft blue, logo, a big illustration, bold centred heading, "Hi {name}!", one
button, a sign-off and a dark footer bar. **Generated** — edit the copy in
`build.mjs`, run `node supabase/templates/build.mjs`, then paste each changed
file into Supabase → Authentication → Emails → Templates (Supabase hosts them,
so they don't deploy with the site). Logos load from
`https://www.lincolnnavigation.com/email/*.png` (public/email), so those must
stay deployed.

| Supabase template | Subject | File |
|---|---|---|
| Confirm sign up | Confirm your LincolnNavigation account | `confirm-signup.html` |
| Reset password | Reset your LincolnNavigation password | `reset-password.html` |
| Magic link or OTP | Your LincolnNavigation sign-in link | `magic-link.html` |
| Change email address | Confirm your new email address | `change-email.html` |
| Invite user | You're invited to LincolnNavigation | `invite-user.html` |
| Reauthentication | Your LincolnNavigation verification code | `reauthentication.html` |

Links go to `/auth/confirm?token_hash={{ .TokenHash }}&type=…&next=…` (verified server-side,
so they work on any device). Variables used: `{{ .TokenHash }}`, `{{ .Token }}`, `{{ .Email }}`,
`{{ .NewEmail }}`, `{{ .SiteURL }}`, and `{{ .Data.full_name }}` (set by /signup).

## Security notices

Sent after an account change (off by default — each has an "Enable
notification" switch in the same dashboard page). No action link; a
"Secure my account" button goes to /login.

| Supabase template | Subject | File |
|---|---|---|
| Password changed | Your LincolnNavigation password was changed | `notify-password-changed.html` |
| Email address changed | Your LincolnNavigation email address was changed | `notify-email-changed.html` |
| Phone number changed | Your LincolnNavigation phone number was changed | `notify-phone-changed.html` |
| Sign-in method linked | A new sign-in method was added to your account | `notify-identity-linked.html` |
| Sign-in method removed | A sign-in method was removed from your account | `notify-identity-unlinked.html` |
| MFA method added | Two-step verification was added to your account | `notify-mfa-added.html` |
| MFA method removed | Two-step verification was removed from your account | `notify-mfa-removed.html` |

Extra variables used here: `{{ .OldEmail }}`, `{{ .Phone }}`, `{{ .OldPhone }}`,
`{{ .Provider }}`, `{{ .FactorType }}`.
