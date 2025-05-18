import { pb, ensureAuth } from './pocketbase';
import { User } from './types';

export type Team = {
    id: string;
    name: string;
    description: string;
    members: User[];
    leader: User;
    created: string;
    updated: string;
};

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

// Teams koleksiyonundan tüm takımları getir
export async function getTeams() {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log('Fetching teams...');
        
        // Get teams with expanded relations
        const records = await pb.collection('teams').getList(1, 100, {
            sort: 'name',
            expand: 'members,leader',
            requestKey: `teams-${Date.now()}` // Prevent request caching
        });
        
        console.log(`Successfully fetched ${records.items.length} teams`);
        
        // Map to consistent format
        const teams = records.items.map((record: any) => {
            // Process members array
            const members = record.expand?.members || [];
            const mappedMembers = Array.isArray(members) 
                ? members.map((member: any) => ({
                    id: member.id,
                    name: member.name || '',
                    email: member.email || '',
                    avatar: member.avatar || '',
                    role: member.role || '',
                }))
                : [];
            
            // Process leader
            const leader = record.expand?.leader || {};
            const mappedLeader = {
                id: leader.id || '',
                name: leader.name || '',
                email: leader.email || '',
                avatar: leader.avatar || '',
                role: leader.role || '',
            };
            
            return {
                id: record.id,
                name: record.name || '',
                description: record.description || '',
                members: mappedMembers,
                leader: mappedLeader,
                created: record.created,
                updated: record.updated
            };
        });
        
        return teams;
    }, 'getTeams');
}

// Tek bir takım getir
export async function getTeam(id: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Fetching team with ID: ${id}`);
        
        // Get team with expanded relations
        const record = await pb.collection('teams').getOne(id, {
            expand: 'members,leader'
        });
        
        // Process members array
        const members = record.expand?.members || [];
        const mappedMembers = Array.isArray(members) 
            ? members.map((member: any) => ({
                id: member.id,
                name: member.name || '',
                email: member.email || '',
                avatar: member.avatar || '',
                role: member.role || '',
            }))
            : [];
        
        // Process leader
        const leader = record.expand?.leader || {};
        const mappedLeader = {
            id: leader.id || '',
            name: leader.name || '',
            email: leader.email || '',
            avatar: leader.avatar || '',
            role: leader.role || '',
        };
        
        return {
            id: record.id,
            name: record.name || '',
            description: record.description || '',
            members: mappedMembers,
            leader: mappedLeader,
            created: record.created,
            updated: record.updated
        };
    }, `getTeam(${id})`);
}

// Yeni takım oluştur
export async function createTeam(data: {
    name: string;
    description: string;
    members: string[];
    leader: string;
}) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log('Creating new team:', data);
        
        // Create team
        const record = await pb.collection('teams').create(data);
        
        // Fetch the created team with expanded relations
        return getTeam(record.id);
    }, 'createTeam');
}

// Takım güncelle
export async function updateTeam(id: string, data: {
    name?: string;
    description?: string;
    members?: string[];
    leader?: string;
}) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Updating team ${id} with data:`, data);
        
        // Update team
        await pb.collection('teams').update(id, data);
        
        // Fetch the updated team with expanded relations
        return getTeam(id);
    }, `updateTeam(${id})`);
}

// Takım sil
export async function deleteTeam(id: string) {
    return withRetry(async () => {
        // Ensure authentication
        await ensureAuth();
        
        console.log(`Deleting team with ID: ${id}`);
        
        // Delete team
        await pb.collection('teams').delete(id);
        
        return true;
    }, `deleteTeam(${id})`);
}
