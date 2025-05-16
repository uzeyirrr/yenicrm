import { pb, ensureAdminAuth } from './pocketbase';
import { Slot, Appointment } from './types';

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
                await ensureAdminAuth();
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
    search?: string;
} = {}) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAdminAuth();
        
        console.log('Fetching slots with filters:', filters);
        
        // Build filter string
        const filterConditions = [];
        
        if (filters.date) {
            filterConditions.push(`date = '${filters.date}'`);
        }
        
        if (filters.team) {
            filterConditions.push(`team = '${filters.team}'`);
        }
        
        if (filters.company) {
            filterConditions.push(`company = '${filters.company}'`);
        }
        
        if (filters.category) {
            filterConditions.push(`category = '${filters.category}'`);
        }
        
        if (filters.deaktif !== undefined) {
            filterConditions.push(`deaktif = ${filters.deaktif}`);
        }
        
        if (filters.search) {
            filterConditions.push(`name ~ '${filters.search}'`);
        }
        
        const filterString = filterConditions.length > 0 ? filterConditions.join(' && ') : '';
        
        // Get slots with expanded relations
        const records = await pb.collection('appointments_slots').getList(1, 100, {
            sort: '-date,-created',
            filter: filterString,
            expand: 'team,category,company,appointments',
            requestKey: `slots-${Date.now()}` // Prevent request caching
        });
        
        console.log(`Successfully fetched ${records.items.length} slots`);
        
        // Map to consistent format
        const slots = records.items.map((record: any) => {
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
        });
        
        return slots;
    }, 'getSlots');
}

// Get a single slot
export async function getSlot(id: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAdminAuth();
        
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
        await ensureAdminAuth();
        
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
        await ensureAdminAuth();
        
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
        await ensureAdminAuth();
        
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
        await ensureAdminAuth();
        
        console.log(`Fetching appointments for slot ID: ${slotId}`);
        
        // Get appointments with expanded relations
        const records = await pb.collection('appointments').getList(1, 100, {
            filter: `slot = '${slotId}'`,
            expand: 'customer,agent',
            sort: 'created'
        });
        
        console.log(`Successfully fetched ${records.items.length} appointments for slot ${slotId}`);
        
        // Map to consistent format
        const appointments = records.items.map((record: any) => {
            return {
                id: record.id,
                title: record.title || '',
                description: record.description || '',
                slot: record.slot || '',
                customer: record.customer || '',
                agent: record.agent || '',
                status: record.status || '',
                created: record.created,
                updated: record.updated,
                expand: record.expand || {}
            };
        });
        
        return appointments;
    }, `getSlotAppointments(${slotId})`);
}

// Generate PDF data for a slot
export async function generateSlotPdfData(slotId: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAdminAuth();
        
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
