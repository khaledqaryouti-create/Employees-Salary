import React from 'react'

interface AuthLayoutProps {
  readonly children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <>{children}</>
}
