import { supabase } from "@/lib/supabaseClient"

export async function checkLicense(business_id: string){

const { data } = await supabase
.from("restaurant_licenses")
.select("*")
.eq("business_id", business_id)
.eq("status","active")
.gt("expires_at", new Date().toISOString())
.limit(1)
.single()

return !!data
}