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

// Admin login with retry logic
export const adminLogin = async () => {
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
        
        console.log('Attempting admin login as superuser...');
        const authData = await pb.admins.authWithPassword(
            'uzeyirismailbahtiyar@gmail.com',
            'Babacik.54!'
        );
        console.log('Admin login successful');
        return authData;
    } catch (error) {
        console.error('Admin login failed:', error);
        
        // Fallback to user login if admin login fails
        try {
            console.log('Attempting user login as fallback...');
            const userData = await pb.collection('users').authWithPassword(
                'uzeyirismailbahtiyar@gmail.com',
                'Babacik.54!'
            );
            console.log('User login successful');
            return userData;
        } catch (userError) {
            console.error('User login also failed:', userError);
            throw error; // Throw the original admin error
        }
    } finally {
        authInProgress = false;
    }
};

// Maximum retry attempts for authentication
const MAX_AUTH_RETRIES = 3;

// Ensure admin authentication with retry logic
export const ensureAdminAuth = async () => {
    let retryCount = 0;
    
    const tryAuthentication = async () => {
        try {
            console.log(`Authentication attempt ${retryCount + 1}/${MAX_AUTH_RETRIES}`);
            
            // Check if already authenticated
            if (pb.authStore.isValid) {
                console.log('Auth store is valid, using existing session');
                return pb.authStore.model;
            }
            
            console.log('Auth store is not valid, attempting login...');
            return await adminLogin();
        } catch (error) {
            console.error(`Authentication error (attempt ${retryCount + 1}/${MAX_AUTH_RETRIES}):`, error);
            
            // Clear auth store for a fresh attempt
            pb.authStore.clear();
            
            // If we have retries left, wait and try again
            if (retryCount < MAX_AUTH_RETRIES - 1) {
                retryCount++;
                const delay = 1000 * retryCount; // Increasing delay with each retry
                console.log(`Retrying authentication in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return tryAuthentication();
            }
            
            // No more retries
            console.error('All authentication attempts failed');
            throw error;
        }
    };
    
    return tryAuthentication();
};

// Check authentication status
export const isAuthenticated = () => {
    return pb.authStore.isValid;
};

// Get current user
export const getCurrentUser = () => {
    return pb.authStore.model;
};

// Initialize authentication on client side
if (typeof window !== 'undefined') {
    // Attempt initial login
    console.log('Initializing authentication on page load...');
    adminLogin().then(() => {
        console.log('Initial authentication successful');
    }).catch(error => {
        console.error('Initial authentication failed:', error);
    });
    
    // Set up auto-refresh of authentication
    pb.authStore.onChange(() => {
        console.log('Auth store changed, current status:', pb.authStore.isValid ? 'valid' : 'invalid');
        if (!pb.authStore.isValid) {
            console.log('Auth became invalid, attempting re-login...');
            adminLogin().then(() => {
                console.log('Re-authentication successful');
            }).catch(error => {
                console.error('Re-authentication failed:', error);
            });
        }
    });
}
