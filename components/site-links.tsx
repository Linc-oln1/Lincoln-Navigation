import Link from "next/link"
import { cn } from "@/lib/utils"

const linkClass = "underline underline-offset-2 hover:text-foreground"

/**
 * "By continuing you agree to our Terms and Privacy Policy."
 * With `purchase`, also names the Refund Policy (checkout buttons).
 */
export function AgreeLine({ className, purchase }: { className?: string; purchase?: boolean }) {
  return (
    <p className={cn("text-[11px] leading-snug text-muted-foreground", className)}>
      By continuing you agree to our{" "}
      <Link href="/terms" className={linkClass}>Terms</Link>
      {purchase ? ", " : " and "}
      <Link href="/privacy" className={linkClass}>Privacy Policy</Link>
      {purchase && (
        <>
          {" "}and{" "}
          <Link href="/refunds" className={linkClass}>Refund Policy</Link>
        </>
      )}
      .
    </p>
  )
}
