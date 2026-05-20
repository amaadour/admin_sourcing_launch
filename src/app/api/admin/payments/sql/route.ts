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
    
    // Execute raw SQL query to get ALL payments directly
    const { data, error } = await supabase.rpc('admin_get_all_payments');
    
    // If RPC function doesn't exist, try direct SQL
    if (error && error.message.includes('function "admin_get_all_payments" does not exist')) {
      // Use a simple query instead
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('payments')
        .select('*')
        .limit(1000);
        
      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
      
      return NextResponse.json(fallbackData);
    }
    
    if (error) {
      console.error('Error executing SQL query:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Success!
    return NextResponse.json(data);
  } catch (err) {
    console.error('Unexpected error in payments SQL API:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 
 