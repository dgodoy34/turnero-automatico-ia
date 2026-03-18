import { supabase } from "@/lib/supabaseClient"

export const dynamic = "force-dynamic"

export default async function RestaurantPage({ params }: any){

  const slug = params.slug

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select(`
      id,
      name,
      phone_number_id,
      restaurant_licenses(
        status,
        expires_at,
        subscription_plans(
          name
        )
      )
    `)
    .eq("slug", slug)
    .single()

  if(!restaurant){
    return <div>Restaurante no encontrado</div>
  }

  const license = restaurant.restaurant_licenses?.[0]
  const plan = license?.subscription_plans?.[0]

  return(

    <div className="p-8">

      <h1 className="text-3xl font-bold mb-4">
        {restaurant.name}
      </h1>

      <div className="space-y-2">

        <div>
          WhatsApp: {restaurant.phone_number_id ? "🟢 conectado" : "🔴 no conectado"}
        </div>

        <div>
          Licencia: {license?.status || "sin licencia"}
        </div>

        <div>
          Plan: {plan?.name || "-"}
        </div>

      </div>

    </div>

  )

}