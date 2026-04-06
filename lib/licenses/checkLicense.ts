import { supabase } from "../supabaseClient"

export async function checkLicense(restaurantId:string){

  const { data,error } = await supabase
  .from("restaurant_licenses")
  .select(`
    status,
    expires_at,
    subscription_plans(
      name,
      max_users,
      max_reservations
    )
  `)
  .eq("business_id", restaurantId)
  .single()

  if(error || !data){
    return { valid:false }
  }

  if(data.status !== "active"){
    return { valid:false }
  }

  if(data.expires_at && new Date(data.expires_at) < new Date()){
    return { valid:false }
  }

  return {
    valid:true,
    plan:data.subscription_plans
  }

}