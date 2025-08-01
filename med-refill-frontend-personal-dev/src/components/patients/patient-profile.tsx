import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, User, Pill, Check, X, Clock, Heart, TestTube } from "lucide-react"
import { PatientHistory } from "@/components/history/history-tab"

interface PatientProfileProps {
  patientId: string
  onBack: () => void
}

export function PatientProfile({ patientId, onBack }: PatientProfileProps) {
  const [patientData, setPatientData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/v1/patients/${patientId}`, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch patient");
        return res.json();
      })
      .then(setPatientData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div className="p-4 text-blue-600">Loading patient...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!patientData) return <div className="p-4 text-gray-600">No patient data found.</div>;

  const handleAcceptAI = () => {
    alert(`AI decision accepted for ${patientData.name}`)
    onBack()
  }

  const handleOverride = () => {
    alert(`Decision overridden for ${patientData.name}`)
    onBack()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{patientData.name}</h1>
          <p className="text-muted-foreground">Patient ID: {patientData.patient_id}</p>
        </div>
      </div>

      {/* Pending Decision Alert */}
      {patientData.pendingDecision && (
        <div className="border border-orange-200 bg-orange-50 rounded-md p-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="font-medium text-orange-900">
                  {patientData.pendingDecision.type} - Requires Your Review
                </div>
                <div className="text-sm text-orange-800">
                  <strong>Reason:</strong> {patientData.pendingDecision.escalationReason}
                </div>
                <div className="text-sm text-orange-800">
                  <strong>AI Recommendation:</strong> {patientData.pendingDecision.aiRecommendation}
                </div>
                <div className="text-sm text-orange-800">
                  <strong>Confidence:</strong> {patientData.pendingDecision.confidence}%
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <Button size="sm" onClick={handleAcceptAI} className="bg-green-600 hover:bg-green-700">
                  <Check className="mr-2 h-4 w-4" />
                  Accept AI
                </Button>
                <Button size="sm" variant="destructive" onClick={handleOverride}>
                  <X className="mr-2 h-4 w-4" />
                  Override
                </Button>
              </div>
            </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="decisions">Decision History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Demographics */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium">{patientData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Patient ID:</span>
                  <span className="text-sm font-medium">{patientData.patient_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Age:</span>
                  <span className="text-sm font-medium">{patientData.age} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gender:</span>
                  <span className="text-sm font-medium">{patientData.gender}</span>
                </div>
              </CardContent>
            </Card>

            {/* Current Request */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Current Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Request Date:</span>
                  <span className="text-sm font-medium">{patientData.refill_request_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Filled:</span>
                  <span className="text-sm font-medium">{patientData.last_filled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Visit:</span>
                  <span className="text-sm font-medium">{patientData.last_visit}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Requested Medication:</span>
                    <span className="text-sm font-medium">{patientData.medication}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Summary */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Medical Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Primary Diagnosis:</span>
                  <span className="text-sm font-medium">{patientData.diagnosis}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Allergies:</span>
                  <span className="text-sm font-medium">{patientData.allergies}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-muted-foreground">Comorbidities:</span>
                  <span className="text-sm font-medium">{patientData.comorbidities}</span>
                </div>
              </CardContent>
            </Card>

            {/* Current Medications */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Current Medications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Current Prescription:</span>
                  <span className="text-sm font-medium">{patientData.medication}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Refill History:</span>
                  <span className="text-sm font-medium">{patientData.refill_history}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Refill Notes:</span>
                  <span className="text-sm font-medium text-right ml-2">{patientData.refill_notes}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Labs & Vitals */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Recent Labs & Vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patientData.labs.split(", ").map((lab: string, i: number) => {
                  const [label, value] = lab.split(": ");
                  return (
                    <div key={i} className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">{label}</span>
                      <span className="text-sm font-medium">{value}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis */}
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <PatientHistory 
            patientId={patientId} 
            activeTab="history"
            onHistoryUpdate={() => {
              window.dispatchEvent(new CustomEvent('historyUpdated'));
            }}
            showPatientButton={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
