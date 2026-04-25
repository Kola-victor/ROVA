import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    // Verify requester
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requester }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !requester) {
      throw new Error('Unauthorized')
    }

    // Since we only want admins to invite staff, we check if requester is staff
    const { data: requesterTeamMember } = await supabaseAdmin
      .from('team_members')
      .select('role')
      .eq('invite_email', requester.email)
      .maybeSingle()

    if (requesterTeamMember?.role === 'staff') {
      throw new Error('Staff members cannot invite new staff')
    }

    const { email, fullName, redirectTo } = await req.json()

    if (!email || !fullName) {
      throw new Error('Email and full name are required')
    }

    // Invite the user
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo
    })

    if (inviteError) {
      throw inviteError
    }

    const newUserId = inviteData.user.id

    // Insert into team_members
    const { error: teamError } = await supabaseAdmin.from('team_members').insert({
      owner_id: requester.id,
      member_id: newUserId,
      invite_email: email,
      role: 'staff',
      status: 'pending',
    })

    if (teamError) {
      throw teamError
    }

    // Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_id: requester.id,
      owner_id: requester.id,
      action: 'created',
      entity_type: 'staff_account',
      entity_label: email,
      metadata: { role: 'staff' },
    })

    return new Response(JSON.stringify({ success: true, user: inviteData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
