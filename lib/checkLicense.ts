import { supabase } from "@/lib/supabaseClient"

export async function checkLicense(restaurant_id: string){

const { data } = await supabase
.from("restaurant_licenses")
.select("*")
.eq("restaurant_id", restaurant_id)
.eq("status","active")
.gt("expires_at", new Date().toISOString())
.limit(1)
.single()

return !!data
}