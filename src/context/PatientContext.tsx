import React, { createContext, useContext, useState, useEffect } from "react";

export interface Patient {
    name: string;
    icd_request_data: {
        note: string;
        age: string | number;
        sex: string;
        past_medical_history: string;
    };
    refill_request_data: {
        refill_request: {
            patient_id: string;
            medication: string;
            refill_request_date: string;
            last_filled: string;
        };
        patient_context: {
            last_visit: string;
            labs: string;
            diagnosis: string;
            notes: string;
            age: string | number;
            gender: string;
            allergies: string;
            comorbidities: string;
            refill_history: string;
        };
    };
}

interface PatientContextType {
    patients: Patient[];
    setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
    refreshPatients: () => void;
    triggerGlobalUpdate: () => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function usePatients() {
    const context = useContext(PatientContext);
    if (!context) throw new Error("usePatients must be used within a PatientProvider");
    return context;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function PatientProvider({ children }: { children: React.ReactNode }) {
    const [patients, setPatients] = useState<Patient[]>([]);

    const fetchPatients = () => {
      fetch(`${API_BASE}/api/v1/patients`, { credentials: "include" })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((allPatients) => {
          // Check if allPatients is an array
          if (!Array.isArray(allPatients)) {
            console.error("Expected array but got:", allPatients);
            setPatients([]);
            return;
          }
          

          
          // Convert date objects to strings if they exist
          const processedPatients = allPatients.map((patient: any) => ({
            ...patient,
            last_processed_request_date: patient.last_processed_request_date 
              ? (typeof patient.last_processed_request_date === 'object' 
                  ? patient.last_processed_request_date.toISOString().split('T')[0]
                  : patient.last_processed_request_date)
              : patient.last_processed_request_date
          }));
          setPatients(processedPatients);
        })
        .catch((error) => {
          console.error("Error fetching patients:", error);
          setPatients([]);
        });
    };

    useEffect(() => {
      fetchPatients();
    }, []);

    // Listen for patient updates from other components
    useEffect(() => {
      const handlePatientUpdate = () => {
        console.log("PatientContext received patientUpdated event, refreshing patients");
        fetchPatients();
      };
      
      window.addEventListener('patientUpdated', handlePatientUpdate);
      return () => window.removeEventListener('patientUpdated', handlePatientUpdate);
    }, []);

    const triggerGlobalUpdate = () => {
      fetchPatients();
      window.dispatchEvent(new CustomEvent('patientUpdated'));
      window.dispatchEvent(new CustomEvent('historyUpdated'));
    };

    return (
        <PatientContext.Provider value={{ patients, setPatients, refreshPatients: fetchPatients, triggerGlobalUpdate }}>
            {children}
        </PatientContext.Provider>
    );
}