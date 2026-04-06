import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseClient"

// =========================
// GET LICENSES
// =========================

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get("business_id")

  let query = supabase
    .from("restaurant_licenses")
    .select(`
      id,
      business_id,
      status,
      expires_at,
      restaurants(name),
      subscription_plans(
        name,
        max_users,
        max_reservations,
        price
      )
    `)
    .order("expires_at", { ascending: false })

  // 🔥 filtro correcto
  if (businessId) {
    query = query.eq("business_id", businessId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }

  // 🔥 normalizamos nombre (para frontend limpio)
  const formatted = data?.map((l: any) => ({
    ...l,
    business_name: l.restaurants?.name || "Sin nombre"
  }))

  return NextResponse.json({
    success: true,
    licenses: formatted
  })
}



// =========================
// CREATE LICENSE
// =========================

export async function POST(req: Request) {

  try {

    const body = await req.json()

    const { business_id, plan_id, months } = body

    if (!business_id || !plan_id) {
      return NextResponse.json({
        success: false,
        error: "business_id y plan_id son requeridos"
      })
    }

    const expires = new Date()
    expires.setMonth(expires.getMonth() + (months || 1))

    const { error } = await supabase
      .from("restaurant_licenses")
      .insert({
        business_id,
        plan_id,
        status: "active",
        expires_at: expires
      })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }

    return NextResponse.json({
      success: true
    })

  } catch (err: any) {

    return NextResponse.json({
      success: false,
      error: err.message
    })

  }

}



// =========================
// DELETE LICENSE
// =========================

export async function DELETE(req: Request) {

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ success: false })
  }

  const { error } = await supabase
    .from("restaurant_licenses")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }

  return NextResponse.json({
    success: true
  })

}



// =========================
// UPDATE LICENSE STATUS
// =========================

export async function PATCH(req: Request) {

  const body = await req.json()

  const { id, status } = body

  if (!id) {
    return NextResponse.json({ success: false })
  }

  const { error } = await supabase
    .from("restaurant_licenses")
    .update({
      status
    })
    .eq("id", id)

  if (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }

  return NextResponse.json({
    success: true
  })

}