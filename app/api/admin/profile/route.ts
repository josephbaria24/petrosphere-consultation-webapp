import { NextResponse } from "next/server";
import { createServiceRoleClient, getVerifiedAdminFromCookie } from "../../../../lib/server/admin-auth";

export async function GET() {
  try {
    const admin = await getVerifiedAdminFromCookie();
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
    const admin = await getVerifiedAdminFromCookie();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";

    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    const supabaseAdmin = createServiceRoleClient();
    const { error } = await supabaseAdmin
      .from("admin_users")
      .update({ full_name: fullName })
      .eq("id", admin.id);

    if (error) {
      console.error("[AdminProfile][POST] Update error:", error);
      return NextResponse.json({ error: "Failed to update admin profile" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: fullName,
      },
    });
  } catch (error) {
    console.error("[AdminProfile][POST] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
