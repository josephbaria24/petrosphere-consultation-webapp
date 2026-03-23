import { createClient } from "@supabase/supabase-js";
import fs from 'fs';

// Read .env.local manually
const envLines = fs.readFileSync('.env.local', 'utf8').split('\n');
const envMap = {};
for (const line of envLines) {
    if (line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        envMap[key.trim()] = valueParts.join('=').trim();
    }
}

const supabase = createClient(
    envMap.NEXT_PUBLIC_SUPABASE_URL,
    envMap.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log("Checking profiles table...");
    const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", "00000000-0000-0000-0000-000000000000"); // Dummy ID

    if (error) {
        console.log("Supabase Error Code:", error.code);
        console.log("Supabase Error Message:", error.message);
    } else {
        console.log("Column avatar_url EXISTS!");
    }
}

check();
