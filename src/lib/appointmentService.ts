import { pb, ensureAuth } from './pocketbase';
import { Appointment } from './types';
export type { Appointment } from './types';

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

// Get all appointments with optional filtering
export async function getAppointments(filters: {
    slot?: string;
    customer?: string;
    agent?: string;
    status?: string;
} = {}) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log('Fetching appointments with filters:', filters);
        
        // Build filter string
        const filterConditions = [];
        
        if (filters.slot) {
            filterConditions.push(`slot = "${filters.slot}"`);
        }
        
        if (filters.customer) {
            filterConditions.push(`customer = "${filters.customer}"`);
        }
        
        if (filters.agent) {
            filterConditions.push(`agent = "${filters.agent}"`);
        }
        
        if (filters.status) {
            filterConditions.push(`status = "${filters.status}"`);
        }
        
        const filterString = filterConditions.length > 0 
            ? filterConditions.join(' && ')
            : '';
        
        // Get appointments with expanded relations
        const records = await pb.collection('appointments').getList(1, 100, {
            sort: 'created',
            filter: filterString,
            expand: 'customer,slot,agent'
        });
        
        // Map records to appointments
        const appointments = records.items.map(record => ({
            id: record.id,
            title: record.title || '',
            description: record.description || '',
            slot: record.slot || '',
            customer: record.customer || '',
            agent: record.agent || '',
            status: record.status || 'empty',
            created: record.created,
            updated: record.updated,
            expand: record.expand || {}
        }));
        
        return appointments;
    }, 'getAppointments');
}

// Get a single appointment
export async function getAppointment(id: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Fetching appointment with ID: ${id}`);
        
        // Get appointment with expanded relations
        const record = await pb.collection('appointments').getOne(id, {
            expand: 'customer,slot,agent'
        });
        
        return {
            id: record.id,
            title: record.title || '',
            description: record.description || '',
            slot: record.slot || '',
            customer: record.customer || '',
            agent: record.agent || '',
            status: record.status || 'empty',
            created: record.created,
            updated: record.updated,
            expand: record.expand || {}
        };
    }, `getAppointment(${id})`);
}

// Create a new appointment
export async function createAppointment(data: {
    title: string;
    description?: string;
    slot: string;
    customer?: string;
    status?: string;
}) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log('Creating appointment:', data);
        
        // Get current user
        const user = pb.authStore.model;
        
        if (!user) {
            throw new Error('Kullanıcı oturumu geçersiz');
        }
        
        // Create appointment
        const record = await pb.collection('appointments').create({
            title: data.title,
            description: data.description || '',
            slot: data.slot,
            customer: data.customer || '',
            agent: user.id,
            status: data.status || 'empty'
        });
        
        return {
            id: record.id,
            title: record.title || '',
            description: record.description || '',
            slot: record.slot || '',
            customer: record.customer || '',
            agent: record.agent || '',
            status: record.status || 'empty',
            created: record.created,
            updated: record.updated
        };
    }, 'createAppointment');
}

// Update an appointment
export async function updateAppointment(id: string, data: {
    title?: string;
    description?: string;
    slot?: string;
    customer?: string;
    status?: string;
}) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Updating appointment ${id}:`, data);
        
        // Update appointment
        const record = await pb.collection('appointments').update(id, {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.slot !== undefined && { slot: data.slot }),
            ...(data.customer !== undefined && { customer: data.customer }),
            ...(data.status !== undefined && { status: data.status })
        });
        
        return {
            id: record.id,
            title: record.title || '',
            description: record.description || '',
            slot: record.slot || '',
            customer: record.customer || '',
            agent: record.agent || '',
            status: record.status || 'empty',
            created: record.created,
            updated: record.updated
        };
    }, `updateAppointment(${id})`);
}

// Delete an appointment
export async function deleteAppointment(id: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Deleting appointment with ID: ${id}`);
        
        // Delete appointment
        await pb.collection('appointments').delete(id);
        
        return true;
    }, `deleteAppointment(${id})`);
}

// Update appointment status
export async function updateAppointmentStatus(id: string, status: 'empty' | 'edit' | 'okay') {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Updating appointment ${id} status to ${status}`);
        
        // Update appointment status
        const record = await pb.collection('appointments').update(id, {
            status: status
        });
        
        return {
            id: record.id,
            status: record.status
        };
    }, `updateAppointmentStatus(${id}, ${status})`);
}

// Subscribe to appointment changes
export function subscribeToAppointments(callback: (data: any) => void) {
    // Ensure authentication is already done before calling this
    
    // Subscribe to appointments collection
    return pb.collection('appointments').subscribe('*', (data) => {
        console.log('Appointment change detected:', data);
        callback(data);
    });
}

// Unsubscribe from appointment changes
export function unsubscribeFromAppointments() {
    pb.collection('appointments').unsubscribe();
}
