"use client"

import { Suspense } from "react"
import RestaurantDetail from "../detail/restaurant-detail"

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <RestaurantDetail />
    </Suspense>
  )
}