"use client"

import { useEffect } from "react"
import { listenForOAuthReturn } from "@/lib/native"

/* Renders nothing. Inside the iPhone app it catches the
   com.lincolnnavigation.app://auth-callback deep link that Google /
   Apple sign-in returns to, and finishes the sign-in in the app's
   web view (lib/native.ts). No-op in browsers. */
export function NativeBridge() {
  useEffect(() => listenForOAuthReturn(), [])
  return null
}
