"use client"

import { Suspense } from "react"
import LicensesPage from "./licenses-page"

export default function Page(){
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LicensesPage/>
    </Suspense>
  )
}