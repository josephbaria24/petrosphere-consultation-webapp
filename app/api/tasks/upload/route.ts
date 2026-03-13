import { NextResponse } from "next/server";
import { Client } from "basic-ftp";
import { Readable } from "stream";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Validate Environment Variables (Required for Vercel deployment)
    const host = process.env.HOSTINGER_SFTP_HOST;
    const user = process.env.HOSTINGER_SFTP_USER;
    const pass = process.env.HOSTINGER_SFTP_PASS;

    if (!host || !user || !pass) {
      console.error("Missing FTP configuration environment variables");
      return NextResponse.json({ 
        error: "Server configuration error: Missing FTP credentials. Please ensure HOSTINGER_SFTP_HOST, HOSTINGER_SFTP_USER, and HOSTINGER_SFTP_PASS are set in Vercel environment variables." 
      }, { status: 500 });
    }

    const client = new Client();
    client.ftp.ipFamily = 4; // Force IPv4 to avoid socket hangup issues
    // client.ftp.verbose = true;

    await client.access({
      host,
      user,
      password: pass,
      secure: false, // Standard FTP access
    });

    const readableStream = new Readable();
    readableStream._read = () => { };
    readableStream.push(fileBuffer);
    readableStream.push(null);

    // Upload to the 'public_html/storage' or 'storage' directory on Hostinger
    // You must ensure this folder exists or change this path
    const remotePath = `/uploads/tasks/${fileName}`;

    // Ensure directory exists
    await client.ensureDir("/uploads/tasks");

    await client.uploadFrom(readableStream, remotePath);
    client.close();

    // Construct the public URL
    // e.g. https://petrosphere.com.ph/uploads/tasks/filename.jpg
    const publicUrl = `https://petrosphere.com.ph/safetyvitals/uploads/tasks/${fileName}`;

    return NextResponse.json({ url: publicUrl, fileName }, { status: 200 });

  } catch (error: any) {
    console.error("FTP Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
