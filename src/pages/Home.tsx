import React, { useState } from 'react';
import Dashboard from '../pages/Dashboard'
import { ImportPatients } from '../pages/ImportPatients';
import { BatchProcessing } from '../components/batch/batch-processing';

import { PatientHistory } from '../components/history/history-tab';
import { AppHeader } from '../components/ui/app-header';
import PatientsList from '../components/patients/patient-tab';
import { PatientProfile } from '../components/patients/patient-profile';
import { DemoModal } from '../components/ui/demo-modal';

const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientToNavigateTo, setPatientToNavigateTo] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Simple Tabs */}
      <AppHeader 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onUpload={() => setShowUploadModal(true)}
        onDemo={() => setShowDemoModal(true)}
        showBackButton={!!selectedPatientId}
        onBack={() => setSelectedPatientId(null)}
      />

      {/* Content Area */}
      <div className="flex-1 px-10 py-6">
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
                onNavigateToTab={(tab) => {
                  setActiveTab(tab);
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl relative">
            <button 
              onClick={() => setShowUploadModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors duration-200 text-2xl font-light"
            >
              ✕
            </button>
            <ImportPatients />
          </div>
        </div>
      )}

      {/* Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md relative">
            <button 
              onClick={() => setShowDemoModal(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors duration-200 text-2xl font-light"
            >
              ✕
            </button>
            <DemoModal onClose={() => setShowDemoModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 