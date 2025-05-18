import PocketBase from 'pocketbase';

// PocketBase instance
let pb: PocketBase;

// Initialize PocketBase based on environment
if (typeof window !== 'undefined') {
    // Client-side initialization
    pb = new PocketBase('http://server.crm-sb.com:32778');
    console.log('PocketBase initialized on client-side');
} else {
    // Server-side initialization
    pb = new PocketBase('http://server.crm-sb.com:32778');
    console.log('PocketBase initialized on server-side');
}

// Configure global fetch options for CORS
pb.autoCancellation(false); // Disable auto-cancellation to avoid race conditions

// Add authentication event listener
pb.authStore.onChange(() => {
    console.log('Auth store changed, current status:', pb.authStore.isValid ? 'valid' : 'invalid');
});

export { pb };

// Authentication state
let authInProgress = false;
let lastAuthAttempt = 0;
const AUTH_COOLDOWN = 2000; // 2 seconds cooldown between auth attempts

// Admin login with credentials
export const adminLogin = async (email: string, password: string) => {
    // Prevent multiple simultaneous auth attempts
    if (authInProgress) {
        console.log('Auth already in progress, waiting...');
        await new Promise(resolve => setTimeout(resolve, 500));
        if (pb.authStore.isValid) {
            console.log('Auth became valid while waiting');
            return pb.authStore.model;
        }
    }
    
    // Check if we're in cooldown period
    const now = Date.now();
    if (now - lastAuthAttempt < AUTH_COOLDOWN) {
        console.log('Auth in cooldown, waiting...');
        await new Promise(resolve => setTimeout(resolve, AUTH_COOLDOWN));
    }
    
    try {
        authInProgress = true;
        lastAuthAttempt = Date.now();
        
        console.log('Attempting admin login...');
        const authData = await pb.admins.authWithPassword(email, password);
        console.log('Admin login successful');
        return authData;
    } catch (error) {
        console.error('Admin login failed:', error);
        throw error;
    } finally {
        authInProgress = false;
    }
};

// Maximum retry attempts for authentication
const MAX_AUTH_RETRIES = 3;

// Ensure user is authenticated
export const ensureAuth = async () => {
    // Check if already authenticated
    if (pb.authStore.isValid) {
        console.log('Auth store is valid, using existing session');
        return pb.authStore.model;
    }
    
    // If not authenticated, throw error - user needs to login
    throw new Error('Kullanıcı oturumu geçersiz. Lütfen tekrar giriş yapın.');
};

// Check authentication status
export const isAuthenticated = () => {
    return pb.authStore.isValid;
};

// Get current user
export const getCurrentUser = () => {
    return pb.authStore.model;
};

// Initialize authentication listener on client side
if (typeof window !== 'undefined') {
    // Set up authentication change listener
    pb.authStore.onChange(() => {
        console.log('Auth store changed, current status:', pb.authStore.isValid ? 'valid' : 'invalid');
        if (!pb.authStore.isValid) {
            console.log('Auth became invalid, user needs to login again');
            // Redirect to login page if needed
            // window.location.href = '/login';
        }
    });
}
