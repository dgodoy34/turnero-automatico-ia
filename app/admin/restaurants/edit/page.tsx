import { Suspense } from "react"
import EditRestaurant from "./edit-restaurant"

export default function Page(){
  return(
    <Suspense fallback={<div>Cargando...</div>}>
      <EditRestaurant/>
    </Suspense>
  )
}