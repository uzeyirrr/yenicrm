import { pb } from './pocketbase';
import { AuthModel } from './types';

export async function register(email: string, password: string, passwordConfirm: string) {
    const data = {
        email,
        password,
        passwordConfirm,
    };
    return await pb.collection('users').create(data);
}

export async function login(email: string, password: string) {
    return await pb.collection('users').authWithPassword(email, password);
}

export function logout() {
    pb.authStore.clear();
}

export function isUserLoggedIn() {
    return pb.authStore.isValid;
}

export function getCurrentUser(): AuthModel | null {
    const model = pb.authStore.model;
    if (!model) return null;
    
    return {
        id: model.id,
        email: model.email,
        username: model.username,
        created: model.created,
        updated: model.updated
    };
}
