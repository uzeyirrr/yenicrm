import { pb, ensureAuth } from './pocketbase';
import { Customer } from './types';

// RecordModel'i Customer tipine dönüştür
function recordToCustomer(record: any): Customer {
    return {
        id: record.id,
        surname: record.surname || '',
        tel: record.tel || '',
        home_tel: record.home_tel || '',
        email: record.email || '',
        home_people_number: record.home_people_number || 0,
        age: record.age || 0,
        location: record.location || '',
        street: record.street || '',
        postal_code: record.postal_code || '',
        who_is_customer: record.who_is_customer || '',
        roof_type: record.roof_type || '',
        what_talked: record.what_talked || '',
        roof: record.roof || '',
        note: record.note || '',
        qc_on: record.qc_on || 'Yeni',
        qc_final: record.qc_final || 'Yeni',
        agent: record.agent || '',
        created: record.created || '',
        updated: record.updated || ''
    };
}

// Get all customers with pagination and error handling
export async function getCustomers(page: number = 1, perPage: number = 100) {
    try {
        // Ensure authentication before making the request
        await ensureAuth();

        // Add retry logic for network issues
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const records = await pb.collection('customers').getList(page, perPage, {
                    sort: '-created',
                    requestKey: 'customers-list-' + Date.now() // Prevent request caching
                });

                // Return just the array of customers for easier handling in the QC page
                return records.items.map(record => recordToCustomer(record));
            } catch (err) {
                attempts++;
                if (attempts === maxAttempts) throw err;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
            }
        }
        
        // Fallback empty array
        return [];
    } catch (error: any) {
        console.error('Error fetching customers:', error);
        // Enhance error message based on error type
        if (error.status === 403) {
            throw new Error('Yetkilendirme hatası. Lütfen tekrar giriş yapın.');
        } else if (error.status === 0) {
            throw new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
        }
        throw error;
    }
}

// Tek müşteri getir
export async function getCustomer(id: string) {
    // Validate ID
    if (!id) {
        console.error('Geçersiz müşteri ID');
        throw new Error('Geçersiz müşteri ID');
    }
    
    console.log('Fetching customer with ID:', id);
    
    // Add retry logic
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
        try {
            attempts++;
            console.log(`Attempt ${attempts}/${maxAttempts} to fetch customer data`);
            
            // Ensure we're authenticated
            await ensureAuth();
            
            // Try using PocketBase SDK first
            try {
                console.log('Trying to fetch with PocketBase SDK...');
                const record = await pb.collection('customers').getOne(id, {
                    requestKey: `customer-${id}-${Date.now()}` // Prevent request caching
                });
                console.log('Successfully fetched customer with SDK');
                return recordToCustomer(record);
            } catch (sdkError) {
                console.warn('SDK fetch failed, falling back to direct fetch', sdkError);
                
                // Fall back to direct fetch
                // Fix double slash in URL if present
                const baseUrl = pb.baseUrl.endsWith('/') ? pb.baseUrl.slice(0, -1) : pb.baseUrl;
                console.log(`Making direct fetch to ${baseUrl}/api/collections/customers/records/${id}`);
                
                const response = await fetch(`${baseUrl}/api/collections/customers/records/${id}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': pb.authStore.token,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    mode: 'cors',
                    cache: 'no-cache' // Prevent caching
                });
                
                if (!response.ok) {
                    throw new Error(`API yanıt hatası: ${response.status} ${response.statusText}`);
                }
                
                const record = await response.json();
                console.log('Successfully fetched customer with direct fetch');
                return recordToCustomer(record);
            }
        } catch (error) {
            console.error(`Attempt ${attempts}/${maxAttempts} failed:`, error);
            
            // If we've reached max attempts, throw the error
            if (attempts >= maxAttempts) {
                console.error('All attempts to fetch customer failed');
                throw new Error(`Müşteri bilgileri alınırken hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
    }
    
    // This should never be reached due to the throw in the catch block above
    throw new Error('Müşteri bilgileri alınamadı');
}

// Yeni müşteri ekle
export async function createCustomer(customerData: Omit<Customer, 'id' | 'created' | 'updated'>) {
    try {
        await ensureAuth();
        const record = await pb.collection('customers').create(customerData);
        return recordToCustomer(record);
    } catch (error) {
        console.error('Müşteri eklenirken hata:', error);
        throw error;
    }
}

// Müşteri güncelle
export async function updateCustomer(id: string, customerData: Partial<Customer>) {
    try {
        await ensureAuth();
        const record = await pb.collection('customers').update(id, customerData);
        return recordToCustomer(record);
    } catch (error) {
        console.error('Müşteri güncellenirken hata:', error);
        throw error;
    }
}

// Müşteri sil
export async function deleteCustomer(id: string) {
    try {
        await ensureAuth();
        await pb.collection('customers').delete(id);
    } catch (error) {
        console.error('Müşteri silinirken hata:', error);
        throw error;
    }
}

// Müşteri ara
export async function searchCustomers(searchTerm: string) {
    try {
        // Ensure authentication before making the request
        await ensureAuth();
        
        if (!searchTerm || searchTerm.trim() === '') {
            return getCustomers(); // Return all customers if search term is empty
        }
        
        console.log(`Searching customers with term: ${searchTerm}`);
        
        // Add retry logic for network issues
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                // Search in multiple fields
                const records = await pb.collection('customers').getList(1, 100, {
                    filter: `surname~"${searchTerm}" || tel~"${searchTerm}" || email~"${searchTerm}" || location~"${searchTerm}"`,
                    sort: '-created',
                    requestKey: 'customers-search-' + Date.now() // Prevent request caching
                });

                console.log(`Found ${records.items.length} customers matching search term`);
                
                // Return just the array of customers for easier handling
                return records.items.map(record => recordToCustomer(record));
            } catch (err) {
                attempts++;
                if (attempts === maxAttempts) throw err;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
            }
        }
        
        // Fallback empty array
        return [];
    } catch (error: any) {
        console.error('Error searching customers:', error);
        // Enhance error message based on error type
        if (error.status === 403) {
            throw new Error('Yetkilendirme hatası. Lütfen tekrar giriş yapın.');
        } else if (error.status === 0) {
            throw new Error('Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.');
        }
        throw error;
    }
}

// QC durumları
export const QC_ON_OPTIONS = ['Yeni', 'Aranacak', 'Rausgefallen', 'Rausgefallen WP'] as const;
export const QC_FINAL_OPTIONS = ['Yeni', 'Okey', 'Neuleger', 'Neuleger WP', 'Rausgefallen', 'Rausgefallen WP'] as const;
