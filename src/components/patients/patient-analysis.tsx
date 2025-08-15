import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, User, Search, RefreshCw } from "lucide-react"
import { useAuth } from "../../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"



export function PatientAnalysis() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [analysisTypes, setAnalysisTypes] = useState({
    prescriptionRefill: true,
    icdPrediction: true,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { authState } = useAuth();
  
  const fetchPatients = () => {
    fetch(`${API_BASE}/api/v1/patients`, { credentials: "include" })
      .then(res => res.json())
      .then((allPatients) => {
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
      .catch(console.error);
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const handlePatientUpdate = () => {
      fetchPatients();
    };
    
    window.addEventListener('patientUpdated', handlePatientUpdate);
    return () => window.removeEventListener('patientUpdated', handlePatientUpdate);
  }, []);

  // Filter patients by name or ID
  const filteredPatients = query.length === 0 ? [] : patients.filter(p => {
    const name = p.name?.toLowerCase() || "";
    const id = p.patient_id?.toLowerCase() || "";
    return name.includes(query.toLowerCase()) || id.includes(query.toLowerCase());
  });

  // Handle patient selection from autocomplete
  const handlePatientAutocomplete = (patientId: string) => {
    setShowDropdown(false);
    const patient = patients.find((p) => p.patient_id === patientId);
    if (patient) {
      setSelectedPatient(patient);
      setQuery(`${patient.name} (${patient.patient_id})`);
    }
  };



  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleAnalysisTypeChange = (type: keyof typeof analysisTypes, checked: boolean) => {
    setAnalysisTypes(prev => ({
      ...prev,
        [type]: checked,
    }));
  };

  const handleAnalyze = async () => {
    if (!selectedPatient) {
      alert("Please select a patient");
      return;
    }

    if (!analysisTypes.prescriptionRefill && !analysisTypes.icdPrediction) {
      alert("Please select at least one analysis type.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResults(null);
    let error = null;

    try {
      const requests = [];
      const histories: any[] = [];
      
      if (analysisTypes.prescriptionRefill) {
        const refillPayload = {
          refill_request: {
            patient_id: selectedPatient.patient_id,
            medication: selectedPatient.medication || "Not specified",
            refill_request_date: new Date().toISOString().split('T')[0],
            last_filled: selectedPatient.last_filled || "Not specified",
          },
          patient_context: {
            last_visit: selectedPatient.last_visit || "Not specified",
            labs: selectedPatient.labs || "Not specified",
            diagnosis: selectedPatient.diagnosis || "Not specified",
            notes: selectedPatient.refill_notes || "Not specified",
            age: selectedPatient.age || "Not specified",
            gender: selectedPatient.gender || "Not specified",
            allergies: selectedPatient.allergies || "Not specified",
            comorbidities: selectedPatient.comorbidities || "Not specified",
            refill_history: selectedPatient.refill_history || "Not specified",
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
                patient_id: selectedPatient.patient_id,
                action_type: "Prescription Refill",
                medication: selectedPatient.medication || "Not specified",
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
          note: selectedPatient.icd_notes || "No clinical notes available",
          age: selectedPatient.age || "Not specified",
          sex: selectedPatient.gender || "Not specified",
          past_medical_history: selectedPatient.icd_pmh || "none",
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
                patient_id: selectedPatient.patient_id,
                action_type: "ICD Prediction",
                medication: selectedPatient.medication || "Not specified",
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
      error = err.message || "Unknown error";
      setAnalysisResults({ error });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setQuery("");
    setShowDropdown(false);
    setAnalysisResults(null);
    setAnalysisTypes({
        prescriptionRefill: true,
        icdPrediction: true,
    });
  };

  if (analysisResults) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Analysis Results - {selectedPatient?.name} ({selectedPatient?.patient_id})
                </CardTitle>
                <CardDescription>AI-powered clinical decision support results</CardDescription>
              </div>
              <Button variant="outline" onClick={resetForm}>
                New Analysis
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysisResults.error && (
              <div className="text-red-600 font-medium">Error: {analysisResults.error}</div>
            )}
            {analysisResults.refill && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Prescription Refill Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const refill = analysisResults.refill;
                    const d = (refill.refill_decision?.decision || refill.decision || '').toLowerCase();
                    const reason = refill.refill_decision?.reason ?? refill.reason;
                    const justification = refill.refill_decision?.justification ?? refill.justification;
                    const confidence = refill.confidence;
                    if (d || reason || justification || confidence) {
                      return <>
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold
                            ${d === 'approve' ? 'bg-green-100 text-green-800' : d === 'deny' ? 'bg-red-100 text-red-800' : d === 'escalate' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {(refill.refill_decision?.decision || refill.decision || 'N/A').toUpperCase()}
                          </span>
                          {typeof confidence === 'number' && (
                            <span className="text-sm text-muted-foreground">AI Confidence: {confidence}%</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 mb-2">
                          <span className="font-semibold">Reason:</span> {reason || 'N/A'}
                        </div>
                        {justification && (
                          <div className="text-sm text-gray-600">
                            <span className="font-semibold">Justification:</span> {justification}
                          </div>
                        )}
                      </>;
                    } else {
                      return <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(refill, null, 2)}</pre>;
                    }
                  })()}
                </CardContent>
              </Card>
            )}
            {analysisResults.icd && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">ICD Code Prediction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.isArray(analysisResults.icd.predictions) && analysisResults.icd.predictions.length > 0 ? (
                    analysisResults.icd.predictions.map((pred: any, i: number) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-blue-700 bg-blue-100 rounded px-3 py-1 text-sm">{pred.icd_code}</span>
                          <span className="text-sm text-gray-700 font-medium">{pred.description}</span>
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
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
          Patient Analysis
        </CardTitle>
        <CardDescription>
              Search for a patient and select analysis types for AI-powered clinical decision support.
        </CardDescription>
      </CardHeader>
      <CardContent>
          <div className="space-y-6">
              {/* Patient Search */}
          <div className="relative">
              <label className="block text-sm font-medium mb-2 text-muted-foreground">Search Patient</label>
            <input
              ref={inputRef}
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={patients.length === 0 ? "No patients available" : "Type name or ID..."}
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
                onFocus={() => {
                  const hasSelectedPatient = patients.some(p => query === `${p.name} (${p.patient_id})`);
                  if (!hasSelectedPatient) {
                    setShowDropdown(true);
                  }
                }}
              disabled={patients.length === 0}
            />
            {showDropdown && filteredPatients.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-background border border-input rounded-md shadow max-h-56 overflow-y-auto">
                {filteredPatients.map((p) => (
                  <li
                    key={p.patient_id}
                    className="px-4 py-2 cursor-pointer hover:bg-primary/10"
                    onMouseDown={() => handlePatientAutocomplete(p.patient_id)}
                  >
                    <div className="font-medium text-base">{p.name} <span className="text-xs text-muted-foreground">({p.patient_id})</span></div>
                    <div className="text-xs text-muted-foreground">Age: {p.age ?? "-"}, Last Visit: {p.last_visit ?? "-"}</div>
                  </li>
                ))}
              </ul>
            )}
            {showDropdown && query && filteredPatients.length === 0 && (
              <div className="absolute z-10 mt-1 w-full bg-background border border-input rounded-md shadow px-4 py-2 text-muted-foreground text-sm">No matches found</div>
            )}
          </div>

              {/* Analysis Type Selection */}
          <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Analysis Options</h3>
          <div className="space-y-2">
                <label className="text-sm font-medium">Analysis Type <span className="text-red-500">*</span></label>
                <div className="flex space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                        checked={analysisTypes.prescriptionRefill}
                  onChange={e => handleAnalysisTypeChange("prescriptionRefill", e.target.checked)}
                />
                <span className="text-sm">Prescription Refill Decision</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                        checked={analysisTypes.icdPrediction}
                  onChange={e => handleAnalysisTypeChange("icdPrediction", e.target.checked)}
                />
                <span className="text-sm">ICD Code Prediction</span>
              </label>
            </div>
          </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
            <Button
              onClick={handleAnalyze}
                  disabled={isAnalyzing || !selectedPatient || (!analysisTypes.prescriptionRefill && !analysisTypes.icdPrediction)}
                className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                </>
              ) : (
                <>
                    <Search className="mr-2 h-4 w-4" />
                    Analyze Patient
                </>
              )}
            </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
              </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardDescription>Your recent patient analyses</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {[
            { id: "P-1001", time: "2 hours ago", status: "Approved" },
            { id: "P-1002", time: "3 hours ago", status: "Denied" },
            { id: "P-1003", time: "5 hours ago", status: "Escalated" },
          ].map((patient, i) => (
            <li key={i} className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-primary"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">Patient #{patient.id}</p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      patient.status === "Approved"
                        ? "bg-green-100 text-green-800"
                        : patient.status === "Denied"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {patient.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Analyzed {patient.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
