"use client"

import { Suspense } from "react"
import RestaurantsList from "./restaurants-list"

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <RestaurantsList />
    </Suspense>
  )
}