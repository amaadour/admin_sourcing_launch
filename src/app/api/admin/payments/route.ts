import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Direct SQL query to Supabase for better performance
    const supabase = createRouteHandlerClient({ cookies });
    
    // Verify admin status (you should implement proper admin check)
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Execute direct SQL query to get ALL payments without any pagination
    const { data, error } = await supabase.from('payments').select('*');
    
    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Success!
    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error in payments API:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 
 