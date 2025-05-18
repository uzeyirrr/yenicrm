import { pb, ensureAuth } from './pocketbase';

// Şirket tipi
export type Company = {
  id: string;
  name: string;
  description: string;
  address: string;
  tel: string;
  email: string;
  website: string;
  logo: string;
  created: string;
  updated: string;
};

// PocketBase record'unu Company tipine dönüştürme
function recordToCompany(record: any): Company {
  return {
    id: record.id,
    name: record.name || '',
    description: record.description || '',
    address: record.address || '',
    tel: record.tel || '',
    email: record.email || '',
    website: record.website || '',
    logo: record.logo || '',
    created: record.created,
    updated: record.updated
  };
}

// Tüm şirketleri getir
export async function getCompanies(filters: {
  search?: string;
} = {}) {
  try {
    // Ensure authentication
    await ensureAuth();
    
    console.log('Fetching companies with filters:', filters);
    
    // Build filter string
    const filterConditions = [];
    
    if (filters.search) {
      filterConditions.push(`name ~ '${filters.search}'`);
    }
    
    const filterString = filterConditions.length > 0 ? filterConditions.join(' && ') : '';
    
    // Get companies
    const records = await pb.collection('companies').getList(1, 100, {
      sort: 'name',
      filter: filterString
    });
    
    console.log(`Successfully fetched ${records.items.length} companies`);
    
    // Map to consistent format
    return records.items.map(recordToCompany);
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
}

// Tek bir şirketi ID'ye göre getir
export async function getCompany(id: string) {
  try {
    // Ensure authentication
    await ensureAuth();
    
    console.log(`Fetching company with ID: ${id}`);
    
    // Get company
    const record = await pb.collection('companies').getOne(id);
    
    return recordToCompany(record);
  } catch (error) {
    console.error(`Error fetching company with ID ${id}:`, error);
    throw error;
  }
}

// Yeni şirket oluştur
export async function createCompany(data: Omit<Company, 'id' | 'created' | 'updated'>) {
  try {
    // Ensure authentication
    await ensureAuth();
    
    console.log('Creating new company:', data);
    
    // Create company
    const record = await pb.collection('companies').create(data);
    
    return recordToCompany(record);
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
}

// Şirket güncelle
export async function updateCompany(id: string, data: Partial<Company>) {
  try {
    // Ensure authentication
    await ensureAuth();
    
    console.log(`Updating company ${id} with data:`, data);
    
    // Update company
    const record = await pb.collection('companies').update(id, data);
    
    return recordToCompany(record);
  } catch (error) {
    console.error(`Error updating company with ID ${id}:`, error);
    throw error;
  }
}

// Şirket sil
export async function deleteCompany(id: string) {
  try {
    // Ensure authentication
    await ensureAuth();
    
    console.log(`Deleting company with ID: ${id}`);
    
    // Delete company
    await pb.collection('companies').delete(id);
    
    return true;
  } catch (error) {
    console.error(`Error deleting company with ID ${id}:`, error);
    throw error;
  }
}

// Şirketle ilişkili slotları getir
export async function getCompanySlots(companyId: string) {
  try {
    // Ensure authentication
    await ensureAuth();
    
    console.log(`Fetching slots for company ID: ${companyId}`);
    
    // Get slots with expanded relations
    const records = await pb.collection('appointments_slots').getList(1, 100, {
      sort: '-date,-created',
      filter: `company = '${companyId}'`,
      expand: 'team,category'
    });
    
    console.log(`Successfully fetched ${records.items.length} slots for company ID: ${companyId}`);
    
    // Map to consistent format
    return records.items.map((record: any) => {
      return {
        id: record.id,
        name: record.name || '',
        start: record.start || '',
        end: record.end || '',
        team: record.expand?.team || record.team || '',
        capacity: record.capacity || 0,
        space: record.space || 0,
        category: record.expand?.category || record.category || '',
        company: record.company || '',
        deaktif: record.deaktif || false,
        date: record.date || '',
        created: record.created,
        updated: record.updated,
        expand: record.expand || {}
      };
    });
  } catch (error) {
    console.error(`Error fetching slots for company ID ${companyId}:`, error);
    throw error;
  }
}
