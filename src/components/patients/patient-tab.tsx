import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Plus, Search, Loader2, Users, CheckCircle, AlertCircle, Clock, User } from 'lucide-react';
import { PatientProfile } from './patient-profile';
import { useAuth } from '@/context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

function isPatientReady(patient: any) {
  const requiredFields = [
    "patient_id",
    "name",
    "age",
    "gender",
    "diagnosis",
    "comorbidities",
    "allergies",
    "icd_notes",
    "labs",
    "medication",
    "refill_request_date",
    "last_filled",
    "refill_history",
    "refill_notes"
  ];
  for (const field of requiredFields) {
    const value = patient[field];
    if (value === null || value === undefined || value.toString().trim() === "") {
      return false;
    }
  }
  return true;
}

function getPatientStatus(patient: any) {
  // Check if patient has been processed
  const hasBeenProcessed = patient.last_processed_request_date;
  
  if (!isPatientReady(patient)) {
    return { label: "Incomplete", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle };
  }
  
  // Check if the refill request date has changed since last processing
  if (hasBeenProcessed) {
    const lastProcessedDate = patient.last_processed_request_date;
    const currentRequestDate = patient.refill_request_date;
    
    // If the refill request date is different from the last processed date,
    // the patient needs to be processed again
    if (lastProcessedDate !== currentRequestDate) {
      return { label: "Ready", color: "bg-blue-100 text-blue-800", icon: Clock };
    }
    
    return { label: "Up-to-date", color: "bg-green-100 text-green-800", icon: CheckCircle };
  }
  
  return { label: "Ready", color: "bg-blue-100 text-blue-800", icon: Clock };
}

interface PatientsListProps {
  onSelectPatient?: (patientId: string) => void;
  patientToNavigateTo?: string | null;
  onPatientNavigated?: () => void;
}

function PatientsList({ patientToNavigateTo, onPatientNavigated }: PatientsListProps) {
  const { authState } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editPatient, setEditPatient] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any | null>(null);
  const [showDelete, setShowDelete] = useState<{ open: boolean, patient: any | null }>({ open: false, patient: null });
  const [showCreate, setShowCreate] = useState(false);

  const [analysisPatient, setAnalysisPatient] = useState<any>(null);
  const [analysisTypes, setAnalysisTypes] = useState({
    prescriptionRefill: true,
    icdPrediction: true,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [createForm, setCreateForm] = useState<any>({
    name: '',
    patient_id: '',
    age: '',
    gender: '',
    diagnosis: '',
    comorbidities: '',
    allergies: '',
    icd_notes: '',
    icd_pmh: '',
    labs: '',
    medication: '',
    refill_request_date: '',
    last_filled: '',
    refill_history: '',
    refill_notes: '',
    isActive: true,
  });
  const [createErrors, setCreateErrors] = useState<{[key: string]: string}>({});
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/patients`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch patients");
        return res.json();
      })
      .then((allPatients) => {
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
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Handle navigation to specific patient from outside
  useEffect(() => {
    if (patientToNavigateTo) {
      setSelectedPatientId(patientToNavigateTo);
      if (onPatientNavigated) {
        onPatientNavigated();
      }
    }
  }, [patientToNavigateTo, onPatientNavigated]);

  const handleEdit = (patient: any) => {
    setEditPatient(patient);
    setEditForm({ ...patient });
  };

  const handleQuickAnalysis = (patient: any) => {
    setAnalysisPatient(patient);
    setAnalysisResults(null);
  };

  const handleAnalysisTypeChange = (type: keyof typeof analysisTypes, checked: boolean) => {
    setAnalysisTypes(prev => ({
      ...prev,
      [type]: checked,
    }));
  };

  const handleAnalyze = async () => {
    if (!analysisPatient || (!analysisTypes.prescriptionRefill && !analysisTypes.icdPrediction)) {
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResults(null);

    try {
      const requests = [];
      const histories: any[] = [];
      
      if (analysisTypes.prescriptionRefill) {
        const refillPayload = {
          refill_request: {
            patient_id: analysisPatient.patient_id,
            medication: analysisPatient.medication || "Not specified",
            refill_request_date: new Date().toISOString().split('T')[0],
            last_filled: analysisPatient.last_filled || "Not specified",
          },
          patient_context: {
            last_visit: analysisPatient.last_visit || "Not specified",
            labs: analysisPatient.labs || "Not specified",
            diagnosis: analysisPatient.diagnosis || "Not specified",
            notes: analysisPatient.refill_notes || "Not specified",
            age: analysisPatient.age || "Not specified",
            gender: analysisPatient.gender || "Not specified",
            allergies: analysisPatient.allergies || "Not specified",
            comorbidities: analysisPatient.comorbidities || "Not specified",
            refill_history: analysisPatient.refill_history || "Not specified",
          },
        };
        requests.push(
          fetch(`${API_BASE}/api/v1/evaluate-refill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(refillPayload),
            credentials: "include",
          }).then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (authState.user) {
              const rawRefillStatus = data.refill_decision?.decision || data.decision || "unknown";
              const refillReasoning = data.reason;
              
              const standardizeStatus = (status: string) => {
                const lowerStatus = status.toLowerCase();
                if (lowerStatus === "approved" || lowerStatus === "approve") return "approve";
                if (lowerStatus === "denied" || lowerStatus === "deny") return "deny";
                if (lowerStatus === "pending" || lowerStatus === "escalated" || lowerStatus === "escalate") return "escalate";
                return status;
              };
              
              const refillStatus = standardizeStatus(rawRefillStatus);
              let decisionBy = "AI";
      
              if (refillStatus === "escalate") {
                const doctorName = authState.user ? `${authState.user.first_name} ${authState.user.last_name}` : "Unknown";
                decisionBy = `AI -> Dr. ${doctorName}`;
              }
              
              histories.push({
                user_id: Number(authState.user.id),
                patient_id: analysisPatient.patient_id,
                action_type: "Prescription Refill",
                medication: analysisPatient.medication || "Not specified",
                status: refillStatus,
                decision_by: decisionBy,
                icd_codes: null,
                reasoning: refillReasoning,
                original_status: refillStatus,
                original_reasoning: refillReasoning,
              });
            }
            return data;
          })
        );
      }

      if (analysisTypes.icdPrediction) {
        const icdPayload = {
          note: analysisPatient.icd_notes || "No clinical notes available",
          age: analysisPatient.age || "Not specified",
          sex: analysisPatient.gender || "Not specified",
          past_medical_history: analysisPatient.icd_pmh || "none",
        };

        requests.push(
          fetch(`${API_BASE}/api/v1/predict-icd`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(icdPayload),
            credentials: "include",
          }).then(async (res) => {
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            if (authState.user) {
              const icdStatus = data.predictions && data.predictions.length > 0 ? "Found" : "No Codes Found";
              const icdCodes = data.predictions
                ? data.predictions.map((pred: any) => pred.icd_code).join(', ')
                : null;
              const icdReasoning = data.predictions
                ? data.predictions.map((pred: any) => pred.justification).join(' | ')
                : null;
              histories.push({
                user_id: Number(authState.user.id),
                patient_id: analysisPatient.patient_id,
                action_type: "ICD Prediction",
                medication: analysisPatient.medication || "Not specified",
                status: icdStatus,
                decision_by: "AI",
                icd_codes: icdCodes,
                reasoning: icdReasoning,
                original_status: icdStatus,
                original_reasoning: icdReasoning,
              });
            }
            return data;
          })
        );
      }

      const results = await Promise.all(requests);
      const resultObj: any = {};
      let idx = 0;
      if (analysisTypes.prescriptionRefill) {
        resultObj.refill = results[idx++];
      }
      if (analysisTypes.icdPrediction) {
        resultObj.icd = results[idx++];
      }
      
      if (histories.length > 0 && authState.user) {
        await fetch(`${API_BASE}/api/v1/history/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(histories),
          credentials: "include",
        });
        
        window.dispatchEvent(new CustomEvent('historyUpdated'));
      }

      setAnalysisResults(resultObj);
    } catch (err: any) {
      setAnalysisResults({ error: err.message || "Unknown error" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisResults(null);
    setAnalysisTypes({
      prescriptionRefill: true,
      icdPrediction: true,
    });
  };

  const handleEditSubmit = async (e: any) => {
    e.preventDefault();
    await fetch(`${API_BASE}/api/v1/patients/${editForm.patient_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
      credentials: "include",
    });
    setPatients((prev: any[]) => prev.map(p => p.patient_id === editForm.patient_id ? { ...editForm } : p));
    setEditPatient(null);
    setEditForm(null);
    
    // Trigger global update for all components
    window.dispatchEvent(new CustomEvent('patientUpdated'));
    window.dispatchEvent(new CustomEvent('historyUpdated'));
  };

  const handleDelete = async (patient: any) => {
    await fetch(`${API_BASE}/api/v1/patients/${patient.patient_id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setPatients((prev: any[]) => prev.filter(p => p.patient_id !== patient.patient_id));
    setShowDelete({ open: false, patient: null });
    
    // Trigger global update for all components
    window.dispatchEvent(new CustomEvent('patientUpdated'));
    window.dispatchEvent(new CustomEvent('historyUpdated'));
  };

  const handleCreateSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/v1/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create patient: ${response.statusText}`);
      }
      
      const createdPatient = await response.json();
      setPatients((prev: any[]) => [...prev, createdPatient]);
      setShowCreate(false);
      setCreateForm({
        name: '',
        patient_id: '',
        age: '',
        gender: '',
        diagnosis: '',
        comorbidities: '',
        allergies: '',
        icd_notes: '',
        icd_pmh: '',
        labs: '',
        medication: '',
        refill_request_date: '',
        last_filled: '',
        refill_history: '',
        refill_notes: '',
        isActive: true,
      });
      
      // Trigger global update for all components
      window.dispatchEvent(new CustomEvent('patientUpdated'));
      window.dispatchEvent(new CustomEvent('historyUpdated'));
    } catch (error) {
      console.error('Error creating patient:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setCreateErrors({ general: `Failed to create patient: ${errorMessage}` });
    }
  };

  if (selectedPatientId) {
    return <PatientProfile patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />;
  }

  return (
    <div className="flex gap-6">
      {/* Left: Patient List */}
      <div className="flex-1">
        <Card className="border-0 bg-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="h-5 w-5 text-primary" />
              Patient Directory
            </CardTitle>
            <CardDescription className="text-gray-500">
              View and manage patient information
            </CardDescription>
            <div className="flex justify-end mt-3">
              <Button 
                onClick={() => setShowCreate(true)}
                className="group relative flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 transition-all duration-300 ease-out hover:scale-105 rounded-full text-gray-600 hover:text-gray-800"
                aria-label="Create Patient"
              >
                <Plus className="w-5 h-5 transition-transform duration-300 group-hover:scale-105" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            
            {loading ? (
              <div className="text-blue-600 py-4">Loading patients...</div>
            ) : error ? (
              <div className="text-red-600 py-4">{error}</div>
            ) : (
              <div className="space-y-3">
                {patients.map((p: any) => {
                  const status = getPatientStatus(p);
                  const isComplete = isPatientReady(p);
                  
                  return (
                    <div
                      key={p.patient_id}
                      className={`p-4 rounded-xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-200 cursor-pointer focus:outline-none ${
                        analysisPatient?.patient_id === p.patient_id 
                          ? 'ring-2 ring-blue-200 bg-blue-50/30' 
                          : 'hover:bg-gray-50/50'
                      }`}
                      onClick={() => setSelectedPatientId(p.patient_id)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center justify-between">
                        {/* Left: Patient Information */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <User className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {p.name}
                            </h3>
                            <span className="text-sm text-gray-500">
                              {p.patient_id}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>Last Visit: {p.last_visit || 'N/A'}</span>
                            {/* Status Badge - Centered vertically */}
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              <status.icon className="h-3 w-3" />
                              {status.label}
                            </span>
                          </div>
                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex items-center gap-2 ml-4">
                          <Button 
                            size="icon" 
                            variant={analysisPatient?.patient_id === p.patient_id ? "default" : "ghost"}
                            onClick={e => { 
                              e.stopPropagation(); 
                              if (analysisPatient?.patient_id === p.patient_id) {
                                setAnalysisPatient(null);
                                setAnalysisResults(null);
                              } else if (isComplete) {
                                handleQuickAnalysis(p);
                              }
                            }}
                            disabled={!isComplete}
                            title={!isComplete ? "Complete patient data to enable analysis" : analysisPatient?.patient_id === p.patient_id ? "Unselect Analysis" : "Quick Analysis"}
                            className={`rounded-full transition-all duration-200 ${
                              !isComplete 
                                ? 'opacity-50 cursor-not-allowed' 
                                : analysisPatient?.patient_id === p.patient_id 
                                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                                  : 'hover:bg-gray-100'
                            }`}
                          >
                            <Search className="h-4 w-4" />
                            <span className="sr-only">Quick Analysis</span>
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={e => { e.stopPropagation(); handleEdit(p); }}
                            className="rounded-full hover:bg-gray-100 transition-all duration-200"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={e => { e.stopPropagation(); setShowDelete({ open: true, patient: p }); }} 
                            className="rounded-full hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right: Quick Analysis Panel */}
      <div className="w-96 flex-shrink-0">
        <Card className="border-0 bg-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-xl sticky top-12">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Search className="h-5 w-5 text-primary" />
              Quick Analysis
            </CardTitle>
            <CardDescription className="text-gray-500">
              {analysisPatient ? `${analysisPatient.name} (${analysisPatient.patient_id})` : 'No patient selected'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {!analysisPatient ? (
              <div className="text-center py-8 text-gray-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-base">Select a patient to analyze</p>
              </div>
            ) : !analysisResults ? (
              <div className="space-y-6">
                {/* Analysis Type Selection */}
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={analysisTypes.prescriptionRefill}
                      onChange={e => handleAnalysisTypeChange("prescriptionRefill", e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">Prescription Refill Decision</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={analysisTypes.icdPrediction}
                      onChange={e => handleAnalysisTypeChange("icdPrediction", e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">ICD Code Prediction</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || (!analysisTypes.prescriptionRefill && !analysisTypes.icdPrediction)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 rounded-xl shadow-sm hover:shadow-md py-2.5"
                    size="default"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        <span className="text-sm font-medium">Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Search className="mr-1.5 h-3 w-3" />
                        <span className="text-sm font-medium">Analyze Patient</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {analysisResults.error && (
                  <div className="text-red-600 font-medium text-base p-3 rounded-lg bg-red-50 border border-red-100">Error: {analysisResults.error}</div>
                )}
                
                {analysisResults.refill && (
                  <div className="space-y-3 p-4 rounded-lg bg-white border border-gray-100">
                    <h4 className="text-base font-semibold text-gray-900">Prescription Refill Decision</h4>
                    <div className="space-y-2">
                      {(() => {
                        const refill = analysisResults.refill;
                        const d = (refill.refill_decision?.decision || refill.decision || '').toLowerCase();
                        const reason = refill.refill_decision?.reason ?? refill.reason;
                        const confidence = refill.confidence;
                        if (d || reason || confidence) {
                          return <>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold
                                ${d === 'approve' ? 'bg-green-100 text-green-800' : d === 'deny' ? 'bg-red-100 text-red-800' : d === 'escalate' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}
                              >
                                {(refill.refill_decision?.decision || refill.decision || 'N/A').toUpperCase()}
                              </span>
                              {typeof confidence === 'number' && (
                                <span className="text-sm text-gray-500">Confidence: {confidence}%</span>
                              )}
                            </div>
                            {reason && (
                              <div className="text-sm text-gray-600">
                                <span className="font-semibold">Reason:</span> {reason}
                              </div>
                            )}
                          </>;
                        }
                        return <p className="text-sm text-gray-500">No refill decision available</p>;
                      })()}
                    </div>
                  </div>
                )}
                
                {analysisResults.icd && (
                  <div className="space-y-3 p-4 rounded-lg bg-white border border-gray-100">
                    <h4 className="text-base font-semibold text-gray-900">ICD Code Prediction</h4>
                    <div className="space-y-2">
                      {(() => {
                        const icd = analysisResults.icd;
                        const predictions = icd.predictions;
                        if (predictions && predictions.length > 0) {
                          return (
                            <div className="space-y-2">
                              {predictions.map((pred: any, idx: number) => (
                                <div key={idx} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-800">
                                      {pred.icd_code}
                                    </span>
                                  </div>
                                  {pred.justification && (
                                    <div className="text-sm text-gray-600">
                                      <span className="font-semibold">Justification:</span> {pred.justification}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return <p className="text-sm text-gray-500">No ICD codes predicted</p>;
                      })()}
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={resetAnalysis}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Patient Modal */}
      <Dialog open={!!editPatient} onOpenChange={() => setEditPatient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Patient ID *</label>
                <input
                  type="text"
                  value={editForm?.patient_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, patient_id: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Name *</label>
                <input
                  type="text"
                  value={editForm?.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Age</label>
                <input
                  type="number"
                  value={editForm?.age || ''}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <input
                  type="text"
                  value={editForm?.gender || ''}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Diagnosis *</label>
                <input
                  type="text"
                  value={editForm?.diagnosis || ''}
                  onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Comorbidities *</label>
                <input
                  type="text"
                  value={editForm?.comorbidities || ''}
                  onChange={(e) => setEditForm({ ...editForm, comorbidities: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Allergies *</label>
                <input
                  type="text"
                  value={editForm?.allergies || ''}
                  onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Medication *</label>
                <input
                  type="text"
                  value={editForm?.medication || ''}
                  onChange={(e) => setEditForm({ ...editForm, medication: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Clinical Notes *</label>
              <textarea
                value={editForm?.icd_notes || ''}
                onChange={(e) => setEditForm({ ...editForm, icd_notes: e.target.value })}
                className="w-full p-2 border rounded"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Past Medical History</label>
              <input
                type="text"
                value={editForm?.icd_pmh || ''}
                onChange={(e) => setEditForm({ ...editForm, icd_pmh: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Lab Results *</label>
              <input
                type="text"
                value={editForm?.labs || ''}
                onChange={(e) => setEditForm({ ...editForm, labs: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Refill Request Date *</label>
                <input
                  type="date"
                  value={editForm?.refill_request_date || ''}
                  onChange={(e) => setEditForm({ ...editForm, refill_request_date: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Filled *</label>
                <input
                  type="date"
                  value={editForm?.last_filled || ''}
                  onChange={(e) => setEditForm({ ...editForm, last_filled: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Refill History *</label>
              <input
                type="text"
                value={editForm?.refill_history || ''}
                onChange={(e) => setEditForm({ ...editForm, refill_history: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Refill Notes *</label>
              <textarea
                value={editForm?.refill_notes || ''}
                onChange={(e) => setEditForm({ ...editForm, refill_notes: e.target.value })}
                className="w-full p-2 border rounded"
                rows={3}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Save Changes</Button>
              <Button type="button" variant="outline" onClick={() => setEditPatient(null)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Patient Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {createErrors.general && (
              <div className="text-red-600 text-sm">{createErrors.general}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Patient ID *</label>
                <input
                  type="text"
                  value={createForm.patient_id}
                  onChange={(e) => setCreateForm({ ...createForm, patient_id: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Age</label>
                <input
                  type="number"
                  value={createForm.age}
                  onChange={(e) => setCreateForm({ ...createForm, age: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gender</label>
                <input
                  type="text"
                  value={createForm.gender}
                  onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Diagnosis</label>
                <input
                  type="text"
                  value={createForm.diagnosis}
                  onChange={(e) => setCreateForm({ ...createForm, diagnosis: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Comorbidities</label>
                <input
                  type="text"
                  value={createForm.comorbidities}
                  onChange={(e) => setCreateForm({ ...createForm, comorbidities: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Allergies</label>
                <input
                  type="text"
                  value={createForm.allergies}
                  onChange={(e) => setCreateForm({ ...createForm, allergies: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Medication</label>
                <input
                  type="text"
                  value={createForm.medication}
                  onChange={(e) => setCreateForm({ ...createForm, medication: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Clinical Notes</label>
              <textarea
                value={createForm.icd_notes}
                onChange={(e) => setCreateForm({ ...createForm, icd_notes: e.target.value })}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Past Medical History</label>
              <input
                type="text"
                value={createForm.icd_pmh}
                onChange={(e) => setCreateForm({ ...createForm, icd_pmh: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Lab Results</label>
              <input
                type="text"
                value={createForm.labs}
                onChange={(e) => setCreateForm({ ...createForm, labs: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Refill Request Date</label>
                <input
                  type="date"
                  value={createForm.refill_request_date}
                  onChange={(e) => setCreateForm({ ...createForm, refill_request_date: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Last Filled</label>
                <input
                  type="date"
                  value={createForm.last_filled}
                  onChange={(e) => setCreateForm({ ...createForm, last_filled: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Refill History</label>
              <input
                type="text"
                value={createForm.refill_history}
                onChange={(e) => setCreateForm({ ...createForm, refill_history: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Refill Notes</label>
              <textarea
                value={createForm.refill_notes}
                onChange={(e) => setCreateForm({ ...createForm, refill_notes: e.target.value })}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Create Patient</Button>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDelete.open} onOpenChange={(open) => setShowDelete({ open, patient: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete {showDelete.patient?.name}? This action cannot be undone.</p>
          <div className="flex gap-2">
            <Button onClick={() => handleDelete(showDelete.patient)} variant="destructive">Delete</Button>
            <Button variant="outline" onClick={() => setShowDelete({ open: false, patient: null })}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PatientsList;
