import React from 'react';
import { PatientDashboard } from '@/components/dashboard/patient-dashboard';

interface DashboardProps {
  onNavigateToPatient?: (patientId: string) => void;
  onNavigateToHistory?: (filter?: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToPatient, onNavigateToHistory }) => {
    return (
        <PatientDashboard 
          onNavigateToPatient={onNavigateToPatient} 
          onNavigateToHistory={onNavigateToHistory}
        />
    )
}

export default Dashboard;