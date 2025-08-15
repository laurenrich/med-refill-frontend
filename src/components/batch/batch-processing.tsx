import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, CheckCircle, AlertCircle, Clock, BarChart3, ArrowUpRight, RefreshCw, Users, User } from "lucide-react"
import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

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
    return { label: "Incomplete", color: "bg-yellow-100 text-yellow-800", icon: "alert" };
  }
  
  // Check if the refill request date has changed since last processing
  if (hasBeenProcessed) {
    const lastProcessedDate = patient.last_processed_request_date;
    const currentRequestDate = patient.refill_request_date;
    
    // If the refill request date is different from the last processed date,
    // the patient needs to be processed again
    if (lastProcessedDate !== currentRequestDate) {
      return { label: "Ready", color: "bg-blue-100 text-blue-800", icon: "clock" };
    }
    
    return { label: "Up-to-date", color: "bg-green-100 text-green-800", icon: "check" };
  }
  
  return { label: "Ready", color: "bg-blue-100 text-blue-800", icon: "clock" };
}

export function BatchProcessing() {
  const [selectedPatients, setSelectedPatients] = useState<any[]>([])
  const [processingResults, setProcessingResults] = useState<any[]>([])
  const [processedPatients, setProcessedPatients] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [patients, setPatients] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { authState } = useAuth();

  useEffect(() => {
    if (!authState.isAuthenticated) {
      setError("Please log in to view patients");
      setFetching(false);
      return;
    }

    setFetching(true);
    fetch(`${API_BASE}/api/v1/patients`, { credentials: "include" })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Please log in to view patients");
          }
          throw new Error("Failed to fetch patients");
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
      .catch(err => setError(err.message))
      .finally(() => setFetching(false));
  }, [authState.isAuthenticated]);

  // Listen for patient updates from other components
  useEffect(() => {
    const handlePatientUpdate = () => {
      // Refetch patients when they're updated elsewhere
      if (authState.isAuthenticated) {
        setFetching(true);
        fetch(`${API_BASE}/api/v1/patients`, { credentials: "include" })
          .then(res => {
            if (!res.ok) {
              if (res.status === 401) {
                throw new Error("Please log in to view patients");
              }
              throw new Error("Failed to fetch patients");
            }
            return res.json();
          })
          .then((allPatients) => {
            if (!Array.isArray(allPatients)) {
              console.error("Expected array but got:", allPatients);
              setPatients([]);
              return;
            }
            
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
          .finally(() => setFetching(false));
      }
    };
    
    window.addEventListener('patientUpdated', handlePatientUpdate);
    return () => window.removeEventListener('patientUpdated', handlePatientUpdate);
  }, [authState.isAuthenticated]);

  // Create unified list with proper sorting
  const sortedPatients = patients.sort((a: any, b: any) => {
    const aStatus = getPatientStatus(a);
    const bStatus = getPatientStatus(b);
    
    // Priority order: Ready > Incomplete > Up-to-date
    const priority = { "Ready": 1, "Incomplete": 2, "Up-to-date": 3 };
    
    return (priority[aStatus.label as keyof typeof priority] || 4) - 
           (priority[bStatus.label as keyof typeof priority] || 4);
  });

  // Filter patients based on search query
  const filterPatients = (patientList: any[]) => {
    if (!searchQuery.trim()) return patientList;
    
    const query = searchQuery.toLowerCase();
    return patientList.filter((patient: any) => 
      patient.patient_id?.toLowerCase().includes(query) ||
      patient.name?.toLowerCase().includes(query) ||
      patient.medication?.toLowerCase().includes(query)
    );
  };

  const currentPatients = filterPatients(sortedPatients);

  if (fetching) return <div className="p-4 text-blue-600">Loading patients...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!Array.isArray(patients)) return <div className="p-4 text-gray-600">No patients found.</div>;

  const togglePatientSelection = (patient: any) => {
    setSelectedPatients((prev) =>
      prev.some((p: any) => p.patient_id === patient.patient_id)
        ? prev.filter((p: any) => p.patient_id !== patient.patient_id)
        : [...prev, patient]
    );
  };

  const processBatch = async () => {
    setShowResults(false);
    setProcessingResults([]);
    setLoading(true);
    setError(null);
    try {
      const payload = {
        patients: selectedPatients.map((p) => ({
          icd_request_data: {
            note: p.icd_notes || "",
            age: p.age,
            sex: p.gender,
            past_medical_history: p.comorbidities || "",
          },
          refill_request_data: {
            refill_request: {
              patient_id: p.patient_id,
              medication: p.medication,
              refill_request_date: p.refill_request_date,
              last_filled: p.last_filled,
            },
            patient_context: {
              last_visit: p.last_visit || "",
              labs: p.labs || "",
              diagnosis: p.diagnosis || "",
              notes: p.refill_notes || "",
              age: p.age,
              gender: p.gender || "",
              allergies: p.allergies || "",
              comorbidities: p.comorbidities || "",
              refill_history: p.refill_history || "",
            }
          }
        }))
      };
      const response = await fetch(`${API_BASE}/api/v1/combined_icd_refill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data = await response.json();
      setProcessingResults(data.results || []);
      setProcessedPatients([...selectedPatients]); // Store processed patients for display
      setShowResults(true);

      if (authState.user) {
        const userId = authState.user.id;
        const histories: any[] = [];
        
        (data.results || []).forEach((result: any, idx: number) => {
          const patient = selectedPatients[idx];
          
          // Add refill history entry
          const rawRefillStatus = result.refill_decision?.decision || "unknown";
          const refillReasoning = result.refill_decision?.reason;
          
          // Standardize status values for storage
          const standardizeStatus = (status: string) => {
            const lowerStatus = status.toLowerCase();
            if (lowerStatus === "approved" || lowerStatus === "approve") return "approve";
            if (lowerStatus === "denied" || lowerStatus === "deny") return "deny";
            if (lowerStatus === "pending" || lowerStatus === "escalated" || lowerStatus === "escalate") return "escalate";
            return status; // Keep other statuses as-is
          };
          
          const refillStatus = standardizeStatus(rawRefillStatus);
          
          // Set decision_by based on status
          let decisionBy = "AI";
          console.log("Raw refill status:", rawRefillStatus, "Standardized:", refillStatus);
          if (refillStatus === "escalate") {
            // Only use arrow if AI escalated, not if user changed it
            const doctorName = authState.user ? `${authState.user.first_name} ${authState.user.last_name}` : "Unknown";
            decisionBy = `AI -> Dr. ${doctorName}`;
            console.log("Setting decision_by to:", decisionBy);
          }
          
          histories.push({
            user_id: Number(userId),
            patient_id: patient.patient_id,
            action_type: "Prescription Refill",
            medication: patient.medication,
            status: refillStatus,
            decision_by: decisionBy,
            icd_codes: null,
            reasoning: refillReasoning,
            original_status: refillStatus,
            original_reasoning: refillReasoning,
          });
          
          // Add ICD history entry
          const icdStatus = result.icd_prediction?.predictions && result.icd_prediction.predictions.length > 0 ? "Found" : "No Codes Found";
          const icdCodes = result.icd_prediction?.predictions
            ? result.icd_prediction.predictions.map((pred: any) => pred.icd_code).join(', ')
            : null;
          const icdReasoning = result.icd_prediction?.predictions
            ? result.icd_prediction.predictions.map((pred: any) => pred.justification).join(' | ')
            : null;
          histories.push({
            user_id: Number(userId),
            patient_id: patient.patient_id,
            action_type: "ICD Prediction",
            medication: patient.medication,
            status: icdStatus,
            decision_by: "AI",
            icd_codes: icdCodes,
            reasoning: icdReasoning,
            original_status: icdStatus,
            original_reasoning: icdReasoning,
          });
        });
        if (histories.length > 0) {
          console.log("Sending histories to backend:", histories);
          const historyRes = await fetch(`${API_BASE}/api/v1/history/batch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(histories),
            credentials: "include",
          });
          if (!historyRes.ok) {
            const errorText = await historyRes.text();
            console.error("History API error:", errorText);
          } else {
            // Trigger dashboard refresh
            window.dispatchEvent(new CustomEvent('historyUpdated'));
          }
        }

        // Update last_processed_request_date for all processed patients
        const updatePromises = selectedPatients.map(async (patient: any) => {
          try {
            const updateRes = await fetch(`${API_BASE}/api/v1/patients/${patient.patient_id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...patient,
                last_processed_request_date: patient.refill_request_date,
                user_id: authState.user?.id
              }),
              credentials: "include",
            });
            if (!updateRes.ok) {
              console.error(`Failed to update patient ${patient.patient_id}`);
            }
          } catch (err) {
            console.error(`Error updating patient ${patient.patient_id}:`, err);
          }
        });

        await Promise.all(updatePromises);

        // Refresh the patient list
        const refreshRes = await fetch(`${API_BASE}/api/v1/patients`, { credentials: "include" });
        if (refreshRes.ok) {
          const allPatients = await refreshRes.json();
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
        } else {
          console.error("Failed to refresh patient list:", await refreshRes.text());
        }

        // Clear selected patients after successful processing
        setSelectedPatients([]);

      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Left: Patient List */}
      <div className="flex-1">
        <Card className="border-0 bg-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <BarChart3 className="h-5 w-5 text-primary" />
              Analysis
            </CardTitle>
            <CardDescription className="text-gray-500">
              Select patients to process in batch for prescription refill decisions and ICD code predictions
            </CardDescription>
            <div className="flex justify-end mt-3">
                  <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{selectedPatients.length} selected</span>
                <Button 
                  onClick={processBatch} 
                  disabled={selectedPatients.length === 0 || loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 rounded-xl shadow-sm hover:shadow-md"
                >
                  {loading ? "Processing..." : "Process Selected"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Search Bar */}
            <div className="mb-4">
                  <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="search"
                      placeholder="Search patients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                </div>
              </div>

            {/* Select All Button */}
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                              const readyPatients = currentPatients.filter(p => getPatientStatus(p).label === "Ready");
                  if (selectedPatients.length === readyPatients.length && readyPatients.length > 0) {
                    // If all ready patients are selected, deselect all
                    setSelectedPatients([]);
                  } else {
                    // Select all ready patients
                              setSelectedPatients(readyPatients);
                            }
                          }}
                          disabled={currentPatients.filter(p => getPatientStatus(p).label === "Ready").length === 0}
                className="text-sm bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 transition-all duration-200"
              >
                {selectedPatients.length === currentPatients.filter(p => getPatientStatus(p).label === "Ready").length && currentPatients.filter(p => getPatientStatus(p).label === "Ready").length > 0
                  ? "Deselect All"
                  : `Select All (${currentPatients.filter(p => getPatientStatus(p).label === "Ready").length})`
                }
              </Button>
            </div>

            {/* Patient Grid */}
            <div className="grid gap-1.5">
                    {currentPatients.map((patient: any) => {
                      const status = getPatientStatus(patient);
                const isSelected = selectedPatients.some((p: any) => p.patient_id === patient.patient_id);
                const isReady = status.label === "Ready";
                
                      return (
                  <div
                    key={patient.patient_id}
                    className={`p-2.5 rounded-lg border transition-all duration-200 cursor-pointer focus:outline-none ${
                      isSelected 
                        ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200 shadow-lg' 
                        : isReady
                          ? 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}
                    onClick={() => {
                      if (isReady) {
                        togglePatientSelection(patient);
                      }
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Patient Info */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {patient.name}
                            </h3>
                            <span className="text-sm text-gray-500">
                            {patient.patient_id}
                            </span>
                          </div>
                          {patient.last_processed_request_date && (
                            <div className="text-sm text-gray-600 mt-0.5">
                              Last Processed: {patient.last_processed_request_date}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Status and Actions */}
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
                          {status.label === "Ready" && <Clock className="h-4 w-4" />}
                          {status.label === "Incomplete" && <AlertCircle className="h-4 w-4" />}
                          {status.label === "Up-to-date" && <CheckCircle className="h-4 w-4" />}
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>
                      );
                    })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Queue Stats and Results */}
      <div className="w-80 flex-shrink-0">
        <div className="space-y-6">
          {/* Queue Stats */}
          <Card className="border-0 bg-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <RefreshCw className="h-5 w-5 text-primary" />
                Queue Status
              </CardTitle>
              <CardDescription className="text-gray-500">
                Current processing status
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
        <div className="space-y-4">
                {/* Total Patients */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Total</p>
                      <p className="text-sm text-gray-600">Available patients</p>
            </div>
                  </div>
                  <span className="text-xl font-bold text-gray-900">{currentPatients.length}</span>
          </div>

                {/* Ready for Processing */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900">Ready</p>
                      <p className="text-sm text-blue-600">Ready for analysis</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-blue-900">
                    {currentPatients.filter(p => getPatientStatus(p).label === "Ready").length}
                  </span>
        </div>

                {/* Incomplete */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 border border-yellow-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Incomplete</p>
                      <p className="text-sm text-yellow-600">Missing data</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-yellow-900">
                    {currentPatients.filter(p => getPatientStatus(p).label === "Incomplete").length}
                    </span>
                </div>

                {/* Up-to-date */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Up-to-date</p>
                      <p className="text-sm text-green-600">Recently processed</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-green-900">
                    {currentPatients.filter(p => getPatientStatus(p).label === "Up-to-date").length}
                  </span>
                </div>

                {/* Processing Status */}
                {loading && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 text-orange-600 animate-spin" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-900">Processing</p>
                        <p className="text-xs text-orange-600">Analysis in progress</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-orange-900">...</span>
                  </div>
                )}
                  </div>
                </CardContent>
              </Card>

          {/* Results Panel */}
          {showResults && (
            <Card className="border-0 bg-gray-50 shadow-[0_2px_4px_rgba(0,0,0,0.05)] rounded-xl sticky top-12">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <ArrowUpRight className="h-5 w-5 text-primary" />
                  Processing Results
                </CardTitle>
                <CardDescription className="text-gray-500">
                  {processingResults.length} patients processed
                </CardDescription>
                </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {processingResults.map((result: any, index: number) => {
                    const patient = processedPatients[index];
                    return (
                      <div key={index} className="p-4 rounded-lg bg-white border border-gray-100">
                        <h4 className="text-base font-semibold text-gray-900 mb-3">
                          {patient?.name} ({patient?.patient_id})
                        </h4>
                        
                        {/* Refill Decision */}
                        {result.refill_decision && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Prescription Refill</h5>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold
                                  ${result.refill_decision.decision?.toLowerCase() === 'approve' ? 'bg-green-100 text-green-800' : 
                                    result.refill_decision.decision?.toLowerCase() === 'deny' ? 'bg-red-100 text-red-800' : 
                                    'bg-yellow-100 text-yellow-800'}`}
                                >
                                  {result.refill_decision.decision?.toUpperCase() || 'N/A'}
                                </span>
                              </div>
                              {result.refill_decision.reason && (
                                <div className="text-sm text-gray-600">
                                  <span className="font-semibold">Reason:</span> {result.refill_decision.reason}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ICD Prediction */}
                        {result.icd_prediction && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">ICD Codes</h5>
                            <div className="space-y-2">
                              {result.icd_prediction.predictions && result.icd_prediction.predictions.length > 0 ? (
                                result.icd_prediction.predictions.map((pred: any, predIndex: number) => (
                                  <div key={predIndex} className="space-y-2">
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
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No ICD predictions returned.</div>
                  )}
            </div>
            </div>
        )}
                      </div>
                    );
                  })}
              </div>
              </CardContent>
            </Card>
          )}
              </div>
              </div>
    </div>
  );
}


