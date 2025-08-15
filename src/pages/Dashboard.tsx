import React from 'react';
import { PatientDashboard } from '@/components/dashboard/patient-dashboard';

interface DashboardProps {
  onNavigateToPatient?: (patientId: string) => void;
  onNavigateToHistory?: (filter?: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToPatient, onNavigateToHistory, onNavigateToTab }) => {
    return (
        <PatientDashboard 
          onNavigateToPatient={onNavigateToPatient} 
          onNavigateToHistory={onNavigateToHistory}
          onNavigateToTab={onNavigateToTab}
        />
    )
}

export default Dashboard;