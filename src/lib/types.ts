export type AuthModel = {
    id: string;
    email: string;
    username: string;
    created: string;
    updated: string;
};

export type User = {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
    username?: string;
    created?: string;
    updated?: string;
};

export type Slot = {
    id: string;
    name: string;
    start: string;
    end: string;
    team: string;
    capacity: number;
    space: number;
    category: string;
    company: string;
    deaktif: boolean;
    appointments: string[];
    date: string;
    created: string;
    updated: string;
    expand?: {
        team?: any;
        category?: any;
        company?: any;
        appointments?: any[];
    };
};

export type Appointment = {
    id: string;
    title: string;
    description?: string;
    slot: string;
    customer: string;
    agent: string;
    status: string;
    created: string;
    updated: string;
    expand?: {
        slot?: Slot;
        customer?: Customer;
        agent?: User;
    };
};

export type Customer = {
    id: string;
    surname: string;
    tel: string;
    home_tel: string;
    email: string;
    home_people_number: number;
    age: number;
    location: string;
    street: string;
    postal_code: string;
    who_is_customer: string;
    roof_type: string;
    what_talked: string;
    roof: string;
    note: string;
    qc_on: 'Yeni' | 'Aranacak' | 'Rausgefallen' | 'Rausgefallen WP';
    qc_final: 'Yeni' | 'Okey' | 'Rausgefallen' | 'Rausgefallen WP' | 'Neuleger' | 'Neuleger WP';
    agent: string;
    created: string;
    updated: string;
};
