import { NextResponse } from "next/server";
import { Client } from "basic-ftp";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "../../../../lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. Get current avatar to delete it later if it's on Hostinger
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", session.user.id)
      .single();

    const oldAvatarUrl = profile?.avatar_url;

    // 2. Prepare new file
    const fileExt = file.name.split(".").pop();
    const fileName = `avatar-${session.user.id}-${uuidv4()}.${fileExt}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 3. FTP Configuration
    const host = process.env.HOSTINGER_SFTP_HOST;
    const user = process.env.HOSTINGER_SFTP_USER;
    const pass = process.env.HOSTINGER_SFTP_PASS;

    if (!host || !user || !pass) {
      return NextResponse.json({ error: "FTP configuration error" }, { status: 500 });
    }

    const client = new Client();
    client.ftp.ipFamily = 4;
    // client.ftp.verbose = true; // Enable if debugging on server logs

    console.log(`[ProfilePicture] Connecting to ${host}...`);
    await client.access({
      host,
      user,
      password: pass,
      secure: false,
    });
    console.log(`[ProfilePicture] Connected successfully`);

    // 4. Delete old file if it exists on Hostinger
    if (oldAvatarUrl && oldAvatarUrl.includes("petrosphere.com.ph") && oldAvatarUrl.includes("/uploads/avatars/")) {
      try {
        const oldFileName = oldAvatarUrl.split("/").pop();
        if (oldFileName && oldFileName !== "avatars") {
          console.log(`[ProfilePicture] Requesting deletion of ${oldFileName}`);
          await client.remove(`/uploads/avatars/${oldFileName}`).catch(e => console.warn("Deletion skip:", e.message));
        }
      } catch (err) {
        console.warn("[ProfilePicture] Deletion logic failed (ignoring):", err);
      }
    }

    // 5. Upload new file
    const readableStream = new Readable();
    readableStream._read = () => { };
    readableStream.push(fileBuffer);
    readableStream.push(null);

    await client.ensureDir("/uploads/avatars");
    await client.uploadFrom(readableStream, `/uploads/avatars/${fileName}`);
    client.close();

    // 6. Update database
    const publicUrl = `https://petrosphere.com.ph/safetyvitals/uploads/avatars/${fileName}`;
    
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("user_id", session.user.id);

    if (updateError) {
      console.error("[ProfilePicture] DB Update error:", updateError);
      return NextResponse.json({ error: "Failed to update profile record" }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl }, { status: 200 });

  } catch (error: any) {
    console.error("[ProfilePicture] CRITICAL ERROR:", error);
    return NextResponse.json({ 
      error: "Upload failed. Please check server logs for details.",
      details: error.message 
    }, { status: 500 });
  }
}
