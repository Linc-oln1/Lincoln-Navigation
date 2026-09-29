# Supabase auth email templates

Branded to match the /login and /signup pages. Supabase hosts these, so they
don't deploy with the site: paste each one into Supabase → Authentication →
Emails → Templates. Regenerate them by editing and re-pasting the HTML.

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
