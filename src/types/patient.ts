export interface Patient {
    id: string;
    name: string;
    age: number;
    gender: string;
    lastVisit: string;
    diagnosis: string;
    medication: string;
    icdNote: string;
    icdPmh: string;
    refillRequestDate: string;
    lastFilled: string;
    labs: string;
    allergies: string;
    comorbidities: string;
    refillHistory: string;
    notes: string;
    last_processed_request_date?: string; // Optional field for processed status
}