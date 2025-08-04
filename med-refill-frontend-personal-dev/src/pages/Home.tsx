import React, { useState } from 'react';
import Dashboard from '../pages/Dashboard'
import { ImportPatients } from '../pages/ImportPatients';
import { BatchProcessing } from '../components/batch/batch-processing';
import { PatientAnalysis } from '../components/patients/patient-analysis';
import { PatientHistory } from '../components/history/history-tab';
import { AppHeader } from '../components/ui/app-header';
import PatientsList from '../components/patients/patient-tab';
import { PatientProfile } from '../components/patients/patient-profile';

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientToNavigateTo, setPatientToNavigateTo] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Simple Tabs */}
      <AppHeader 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onUpload={() => setShowUploadModal(true)}
        showBackButton={!!selectedPatientId}
        onBack={() => setSelectedPatientId(null)}
      />

      {/* Content Area */}
      <div className="px-10 py-6">
                        {selectedPatientId ? (
          <PatientProfile 
            patientId={selectedPatientId} 
            onBack={() => setSelectedPatientId(null)}
          />
        ) : (
          <div className="w-full">
            <div className={activeTab === "dashboard" ? "block" : "hidden"}>
              <Dashboard 
                onNavigateToPatient={(patientId) => {
                  setPatientToNavigateTo(patientId);
                  setActiveTab("patients");
                }}
                onNavigateToHistory={(filter) => {
                  setHistoryFilter(filter || null);
                  setActiveTab("history");
                }}
              />
            </div>
            <div className={activeTab === "patients" ? "block" : "hidden"}>
              <PatientsList 
                patientToNavigateTo={patientToNavigateTo}
                onPatientNavigated={() => setPatientToNavigateTo(null)}
              />
            </div>
            <div className={activeTab === "analysis" ? "block" : "hidden"}>
              <PatientAnalysis />
            </div>
            <div className={activeTab === "batch" ? "block" : "hidden"}>
              <BatchProcessing />
            </div>
            <div className={activeTab === "history" ? "block" : "hidden"}>
              <PatientHistory 
                onNavigateToPatient={(patientId) => {
                  setPatientToNavigateTo(patientId);
                  setActiveTab("patients");
                }}
                activeTab={activeTab}
                initialFilter={historyFilter}
                onFilterChange={setHistoryFilter}
                onHistoryUpdate={() => {
                  // Trigger global refresh
                  window.dispatchEvent(new CustomEvent('historyUpdated'));
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="w-full max-w-md relative">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="absolute top-8 right-4 text-gray-400 hover:text-gray-600 text-lg"
            >
              ✕
            </button>
            <ImportPatients />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 