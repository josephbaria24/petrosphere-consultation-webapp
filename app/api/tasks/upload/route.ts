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

    const client = new Client();
    // client.ftp.verbose = true;

    await client.access({
      host: process.env.HOSTINGER_SFTP_HOST,
      user: process.env.HOSTINGER_SFTP_USER,
      password: process.env.HOSTINGER_SFTP_PASS,
      secure: false, // Standard FTP access (or adjust if Hostinger requires FTPS)
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
