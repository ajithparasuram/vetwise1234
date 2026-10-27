// VetWise send-notification edge function v76
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, subject, body, clientId, patientName, appointmentDate, appointmentTime, userId, role } = await req.json();

    if (!recipientEmail || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "recipientEmail, subject, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert into notifications table using existing columns
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        type: type ?? "appointment",
        title: subject,
        message: body,
        recipient_email: recipientEmail,
        subject: subject,
        body: body,
        delivery_status: "sent",
        user_id: userId ?? "00000000-0000-0000-0000-000000000000",
        role: role ?? "client",
        entity_id: clientId ?? null,
        entity_type: type ?? "appointment",
        metadata: { patientName, appointmentDate, appointmentTime, recipientName },
      })
      .select()
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: "Failed to store notification: " + error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // If this is an appointment reminder, also record it in appointment_reminders
    if (type === "appointment" && appointmentDate) {
      // Check for existing reminder to prevent duplicates
      const { data: existing } = await supabase
        .from("appointment_reminders")
        .select("id")
        .eq("appointment_id", clientId ?? "unknown")
        .eq("status", "sent")
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("appointment_reminders").insert({
          appointment_id: clientId ?? null,
          reminder_type: "24h",
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          status: "sent",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, notificationId: data.id, message: `Email notification queued for ${recipientEmail}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
