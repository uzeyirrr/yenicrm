import { pb, ensureAdminAuth } from './pocketbase';

export type AppointmentCategory = {
    id: string;
    name: string;
    description: string;
    color: string;
    deaktif: boolean;
    created: string;
    updated: string;
};

// Tüm randevu kategorilerini getir
export async function getAppointmentCategories() {
    try {
        // Ensure authentication
        await ensureAdminAuth();
        
        console.log('Fetching appointment categories...');
        
        // Get appointment categories
        const records = await pb.collection('appointments_category').getList(1, 100, {
            sort: 'name',
            requestKey: `appointment-categories-${Date.now()}` // Prevent request caching
        });
        
        console.log(`Successfully fetched ${records.items.length} appointment categories`);
        
        // Map to consistent format
        const categories = records.items.map((record: any) => ({
            id: record.id,
            name: record.name || '',
            description: record.description || '',
            color: record.color || '',
            deaktif: record.deaktif || false,
            created: record.created,
            updated: record.updated
        }));
        
        return categories;
    } catch (error) {
        console.error('Error fetching appointment categories:', error);
        throw error;
    }
}

// Tek bir randevu kategorisi getir
export async function getAppointmentCategory(id: string) {
    try {
        // Ensure authentication
        await ensureAdminAuth();
        
        console.log(`Fetching appointment category with ID: ${id}`);
        
        // Get appointment category
        const record = await pb.collection('appointments_category').getOne(id);
        
        return {
            id: record.id,
            name: record.name || '',
            description: record.description || '',
            color: record.color || '',
            deaktif: record.deaktif || false,
            created: record.created,
            updated: record.updated
        };
    } catch (error) {
        console.error('Error fetching appointment category:', error);
        throw error;
    }
}

// Yeni randevu kategorisi oluştur
export async function createAppointmentCategory(data: Omit<AppointmentCategory, 'id' | 'created' | 'updated'>) {
    try {
        // Ensure authentication
        await ensureAdminAuth();
        
        console.log('Creating new appointment category:', data);
        
        // Create appointment category
        const record = await pb.collection('appointments_category').create(data);
        
        return {
            id: record.id,
            name: record.name || '',
            description: record.description || '',
            color: record.color || '',
            deaktif: record.deaktif || false,
            created: record.created,
            updated: record.updated
        };
    } catch (error) {
        console.error('Error creating appointment category:', error);
        throw error;
    }
}

// Randevu kategorisi güncelle
export async function updateAppointmentCategory(id: string, data: Partial<AppointmentCategory>) {
    try {
        // Ensure authentication
        await ensureAdminAuth();
        
        console.log(`Updating appointment category ${id} with data:`, data);
        
        // Update appointment category
        const record = await pb.collection('appointments_category').update(id, data);
        
        return {
            id: record.id,
            name: record.name || '',
            description: record.description || '',
            color: record.color || '',
            deaktif: record.deaktif || false,
            created: record.created,
            updated: record.updated
        };
    } catch (error) {
        console.error('Error updating appointment category:', error);
        throw error;
    }
}

// Randevu kategorisi sil
export async function deleteAppointmentCategory(id: string) {
    try {
        // Ensure authentication
        await ensureAdminAuth();
        
        console.log(`Deleting appointment category with ID: ${id}`);
        
        // Delete appointment category
        await pb.collection('appointments_category').delete(id);
        
        return true;
    } catch (error) {
        console.error('Error deleting appointment category:', error);
        throw error;
    }
}
