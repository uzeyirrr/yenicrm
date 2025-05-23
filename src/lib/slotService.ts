import { pb, ensureAuth } from './pocketbase';
import { Appointment, Slot } from './types';
export type { Slot } from './types';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function for retrying operations
async function withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`${operationName} attempt ${attempt}/${MAX_RETRIES}`);
            return await operation();
        } catch (error: any) {
            lastError = error;
            console.error(`${operationName} failed (attempt ${attempt}/${MAX_RETRIES}):`, error);
            
            // Check if it's an authentication error (403)
            if (error?.status === 403) {
                console.log('Authentication error detected, clearing auth store');
                pb.authStore.clear();
                // Force re-authentication on next attempt
                await ensureAuth();
            }
            
            // If not the last attempt, wait before retrying
            if (attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY * attempt;
                console.log(`Retrying ${operationName} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`All ${operationName} attempts failed`);
                throw lastError;
            }
        }
    }
    
    // This should never be reached due to the throw in the loop
    throw lastError;
}

// Get all slots with optional filtering
export async function getSlots(filters: {
    date?: string;
    team?: string;
    company?: string;
    category?: string;
    deaktif?: boolean;
    startDate?: string;
    endDate?: string;
    search?: string;
} = {}) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log('Fetching slots with filters:', filters);
        
        // Build filter string
        const filterConditions = [];
        
        if (filters.date) {
            // Exact date match
            filterConditions.push(`date ~ "${filters.date}"`);
        } else if (filters.startDate && filters.endDate) {
            // Date range match
            filterConditions.push(`date >= "${filters.startDate}" && date <= "${filters.endDate}"`);
        }
        
        if (filters.team) {
            // Handle multiple teams (comma-separated)
            if (filters.team.includes(',')) {
                const teamIds = filters.team.split(',');
                const teamConditions = teamIds.map(id => `team ~ "${id}"`).join(' || ');
                filterConditions.push(`(${teamConditions})`);
            } else {
                filterConditions.push(`team ~ "${filters.team}"`);
            }
        }
        
        if (filters.company) {
            filterConditions.push(`company = "${filters.company}"`);
        }
        
        if (filters.category) {
            filterConditions.push(`category = "${filters.category}"`);
        }
        
        if (filters.deaktif !== undefined) {
            filterConditions.push(`deaktif = ${filters.deaktif}`);
        }
        
        if (filters.search) {
            filterConditions.push(`name ~ '${filters.search}'`);
        }
        
        const filterString = filterConditions.length > 0 
            ? filterConditions.join(' && ')
            : '';
        
        // Get slots with expanded relations
        const records = await pb.collection('appointments_slots').getList(1, 100, {
            sort: '-date,-start',
            filter: filterString,
            expand: 'team,category,company,appointments',
            requestKey: `slots-${Date.now()}` // Prevent request caching
        });
        
        console.log(`Successfully fetched ${records.items.length} slots`);
        
        // Map to consistent format
        const slots = records.items.map((record: any) => {
            // Genişletilmiş verileri doğrudan slot nesnesine aktaralım
            return {
                id: record.id,
                name: record.name || '',
                start: record.start || '',
                end: record.end || '',
                team: record.expand?.team || record.team || '',
                capacity: record.capacity || 0,
                space: record.space || 0,
                category: record.expand?.category || record.category || '',
                company: record.expand?.company || record.company || '',
                deaktif: record.deaktif || false,
                appointments: record.expand?.appointments || record.appointments || [],
                date: record.date || '',
                created: record.created,
                updated: record.updated,
                expand: record.expand || {}
            };
        });
        
        return slots;
    }, 'getSlots');
}

// Get a single slot
export async function getSlot(id: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Fetching slot with ID: ${id}`);
        
        // Get slot with expanded relations
        const record = await pb.collection('appointments_slots').getOne(id, {
            expand: 'team,category,company,appointments,appointments.customer,appointments.agent'
        });
        
        return {
            id: record.id,
            name: record.name || '',
            start: record.start || '',
            end: record.end || '',
            team: record.team || '',
            capacity: record.capacity || 0,
            space: record.space || 0,
            category: record.category || '',
            company: record.company || '',
            deaktif: record.deaktif || false,
            appointments: record.appointments || [],
            date: record.date || '',
            created: record.created,
            updated: record.updated,
            expand: record.expand || {}
        };
    }, `getSlot(${id})`);
}

// Create a new slot
export async function createSlot(data: {
    name: string;
    start: string;
    end: string;
    team: string;
    capacity: number;
    space: number;
    category: string;
    company: string;
    deaktif?: boolean;
    date: string;
}) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log('Creating new slot:', data);
        
        // Create slot
        const record = await pb.collection('appointments_slots').create({
            ...data,
            deaktif: data.deaktif !== undefined ? data.deaktif : false
        });
        
        // Fetch the created slot with expanded relations
        return getSlot(record.id);
    }, 'createSlot');
}

// Update a slot
export async function updateSlot(id: string, data: {
    name?: string;
    start?: string;
    end?: string;
    team?: string;
    capacity?: number;
    space?: number;
    category?: string;
    company?: string;
    deaktif?: boolean;
    date?: string;
}) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Updating slot ${id} with data:`, data);
        
        // Update slot
        await pb.collection('appointments_slots').update(id, data);
        
        // Fetch the updated slot with expanded relations
        return getSlot(id);
    }, `updateSlot(${id})`);
}

// Delete a slot
export async function deleteSlot(id: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Deleting slot with ID: ${id}`);
        
        // Delete slot
        await pb.collection('appointments_slots').delete(id);
        
        return true;
    }, `deleteSlot(${id})`);
}

// Get appointments for a slot
export async function getSlotAppointments(slotId: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Fetching appointments for slot ID: ${slotId}`);
        
        try {
            // Önce slot'u getir ve appointments alanını kontrol et
            const slotRecord = await pb.collection('appointments_slots').getOne(slotId, {
                expand: 'appointments'
            });
            
            console.log('Slot record:', slotRecord);
            
            if (slotRecord.expand?.appointments && Array.isArray(slotRecord.expand.appointments)) {
                console.log(`Found ${slotRecord.expand.appointments.length} appointments in slot expand`);
                
                // Expanded appointments'ları dönüştür
                const appointments = slotRecord.expand.appointments.map((record: any) => {
                    return {
                        id: record.id,
                        name: record.name || '',
                        date: record.date || '',
                        time: record.time || '',
                        slot: record.slot || '',
                        customer: record.customer || '',
                        team: record.team || [],
                        category: record.category || '',
                        company: record.company || '',
                        status: record.status || '',
                        created: record.created,
                        updated: record.updated,
                        expand: record.expand || {}
                    };
                });
                
                return appointments;
            } else {
                // Alternatif yöntem: doğrudan appointments koleksiyonundan sorgula
                console.log('No expanded appointments found, querying appointments collection directly');
                
                const records = await pb.collection('appointments').getList(1, 100, {
                    filter: `slot = '${slotId}'`,
                    expand: 'customer,customer.company',
                    sort: 'created'
                });
                
                console.log(`Directly fetched ${records.items.length} appointments for slot ${slotId}`);
                
                // Map to consistent format
                const appointments = records.items.map((record: any) => {
                    return {
                        id: record.id,
                        name: record.name || '',
                        date: record.date || '',
                        time: record.time || '',
                        slot: record.slot || '',
                        customer: record.customer || '',
                        team: record.team || [],
                        category: record.category || '',
                        company: record.company || '',
                        status: record.status || '',
                        created: record.created,
                        updated: record.updated,
                        expand: record.expand || {}
                    };
                });
                
                return appointments;
            }
        } catch (error) {
            console.error(`Error fetching appointments for slot ${slotId}:`, error);
            // Hata durumunda boş dizi döndür
            return [];
        }
    }, `getSlotAppointments(${slotId})`);
}

// Empty an appointment (remove customer and set status to empty)
export async function emptyAppointment(appointmentId: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Emptying appointment with ID: ${appointmentId}`);
        
        try {
            // Update appointment to remove customer and set status to empty
            const updatedAppointment = await pb.collection('appointments').update(appointmentId, {
                customer: null,  // Remove customer relation
                status: "empty" // Set status to empty
            });
            
            console.log(`Successfully emptied appointment ${appointmentId}`);
            return updatedAppointment;
        } catch (error) {
            console.error(`Error emptying appointment ${appointmentId}:`, error);
            throw error;
        }
    }, `emptyAppointment(${appointmentId})`);
}

// Generate PDF data for a slot
export async function generateSlotPdfData(slotId: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        // Get slot with all related data
        const slot = await getSlot(slotId);
        
        // Get appointments for the slot
        const appointments = await getSlotAppointments(slotId);
        
        // Return combined data for PDF generation
        return {
            slot,
            appointments
        };
    }, `generateSlotPdfData(${slotId})`);
}

// Subscribe to slot changes
export function subscribeToSlots(callback: (data: any) => void, options: any = {}) {
    // Ensure authentication is already done before calling this
    
    // Subscribe to slots collection
    return pb.collection('appointments_slots').subscribe('*', (data) => {
        console.log('Slot change detected:', data);
        callback(data);
    }, options);
}

// Subscribe to specific slot changes
export function subscribeToSlot(id: string, callback: (data: any) => void, options: any = {}) {
    // Ensure authentication is already done before calling this
    
    // Subscribe to specific slot
    return pb.collection('appointments_slots').subscribe(id, (data) => {
        console.log(`Slot ${id} change detected:`, data);
        callback(data);
    }, options);
}

// Unsubscribe from all slot changes
export function unsubscribeFromSlots() {
    pb.collection('appointments_slots').unsubscribe();
}

// Unsubscribe from specific slot changes
export function unsubscribeFromSlot(id: string) {
    pb.collection('appointments_slots').unsubscribe(id);
}
