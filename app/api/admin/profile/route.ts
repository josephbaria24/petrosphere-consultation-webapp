import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAdminFromCookie() {
  const cookieStore = await cookies();
  const adminId = cookieStore.get("admin_id")?.value;
  if (!adminId) return { adminId: null, admin: null };

  const supabaseAdmin = getAdminClient();
  const { data: admin, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, full_name")
    .eq("id", adminId)
    .single();

  if (error || !admin) return { adminId, admin: null };
  return { adminId, admin };
}

export async function GET() {
  try {
    const { admin } = await getAdminFromCookie();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name ?? "",
    });
  } catch (error) {
    console.error("[AdminProfile][GET] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { adminId, admin } = await getAdminFromCookie();
    if (!adminId || !admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const { error } = await supabaseAdmin
      .from("admin_users")
      .update({ full_name: fullName })
      .eq("id", adminId);

    if (error) {
      console.error("[AdminProfile][POST] Update error:", error);
      return NextResponse.json({ error: "Failed to update admin profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: adminId,
        email: admin.email,
        full_name: fullName,
      },
    });
  } catch (error) {
    console.error("[AdminProfile][POST] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
