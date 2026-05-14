import { supabase } from './src/lib/supabaseWrapper.js';

async function deleteNeema() {
  const { error } = await supabase
    .from('livestock')
    .delete()
    .eq('name', 'NEEMA');

  if (error) {
    console.error('Error deleting NEEMA:', error);
  } else {
    console.log('Successfully deleted NEEMA entry');
  }
}

deleteNeema();