import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { PatientProfile } from './patient-profile';
import { useAuth } from '@/context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface PatientsListProps {
  onSelectPatient?: (patientId: string) => void;
  patientToNavigateTo?: string | null;
  onPatientNavigated?: () => void;
}

function PatientsList({ patientToNavigateTo, onPatientNavigated }: PatientsListProps) {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editPatient, setEditPatient] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any | null>(null);
  const [showDelete, setShowDelete] = useState<{ open: boolean, patient: any | null }>({ open: false, patient: null });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<any>({
    name: '',
    patient_id: '',
    age: '',
    gender: '',
    isActive: true,
  });
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const { authState } = useAuth();

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

  const handleEditSubmit = async (e: any) => {
    e.preventDefault();
    await fetch(`${API_BASE}/api/v1/patients/${editForm.patient_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, user_id: authState.user?.id }),
      credentials: "include",
    });
    setPatients((prev: any[]) => prev.map(p => p.patient_id === editForm.patient_id ? { ...editForm } : p));
    setEditPatient(null);
    setEditForm(null);
  };

  const handleDelete = async (patient: any) => {
    await fetch(`${API_BASE}/api/v1/patients/${patient.patient_id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setPatients((prev: any[]) => prev.filter(p => p.patient_id !== patient.patient_id));
    setShowDelete({ open: false, patient: null });
  };

  const handleCreateSubmit = async (e: any) => {
    e.preventDefault();
    const newPatient = { ...createForm, user_id: authState.user?.id };
    await fetch(`${API_BASE}/api/v1/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPatient),
      credentials: "include",
    });
    setPatients((prev: any[]) => [...prev, newPatient]);
    setShowCreate(false);
    setCreateForm({ name: '', patient_id: '', age: '', gender: '', isActive: true });
  };

  if (selectedPatientId) {
    return <PatientProfile patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />;
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Patient Directory
          </CardTitle>
          <CardDescription>
            View and manage patient information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Patient
        </Button>
          </div>
          
        {loading ? (
          <div className="text-blue-600 py-4">Loading patients...</div>
        ) : error ? (
          <div className="text-red-600 py-4">{error}</div>
        ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead className="w-24 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {patients.map((p: any) => (
                    <TableRow
                      key={p.patient_id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedPatientId(p.patient_id)}
                    >
                      <TableCell>{p.patient_id}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.age}</TableCell>
                      <TableCell>{p.gender}</TableCell>
                      <TableCell className="text-right w-24 pr-2">
                        <div className="flex gap-2 justify-end">
                          <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); handleEdit(p); }}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                          <Button size="icon" variant="outline" onClick={e => { e.stopPropagation(); setShowDelete({ open: true, patient: p }); }} className="hover:text-red-600 hover:border-red-300">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                        </div>
                      </TableCell>
                    </TableRow>
        ))}
                </TableBody>
              </Table>
          </div>
        )}
      </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editPatient} onOpenChange={open => { if (!open) { setEditPatient(null); setEditForm(null); } }}>
        {editPatient && (
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Patient</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleEditSubmit}>
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium">Patient ID</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.patient_id} onChange={e => setEditForm({ ...editForm, patient_id: e.target.value })} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium">Age</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium">Gender</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium">Diagnosis</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.diagnosis || ''} onChange={e => setEditForm({ ...editForm, diagnosis: e.target.value })} placeholder="Enter diagnosis" />
              </div>
              <div>
                <label className="block text-sm font-medium">Comorbidities</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.comorbidities || ''} onChange={e => setEditForm({ ...editForm, comorbidities: e.target.value })} placeholder="Enter comorbidities" />
              </div>
              <div>
                <label className="block text-sm font-medium">Allergies</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.allergies || ''} onChange={e => setEditForm({ ...editForm, allergies: e.target.value })} placeholder="Enter allergies" />
              </div>
              <div>
                <label className="block text-sm font-medium">Clinical Note</label>
                <textarea className="w-full border rounded px-2 py-1" value={editForm.icd_notes || ''} onChange={e => setEditForm({ ...editForm, icd_notes: e.target.value })} placeholder="Enter clinical note" />
              </div>
              <div>
                <label className="block text-sm font-medium">Past Medical History</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.icd_pmh || ''} onChange={e => setEditForm({ ...editForm, icd_pmh: e.target.value })} placeholder="Enter past medical history" />
              </div>
              <div>
                <label className="block text-sm font-medium">Lab Results</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.labs || ''} onChange={e => setEditForm({ ...editForm, labs: e.target.value })} placeholder="Enter lab results" />
              </div>
              <div>
                <label className="block text-sm font-medium">Medication</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.medication || ''} onChange={e => setEditForm({ ...editForm, medication: e.target.value })} placeholder="Enter medication" />
              </div>
              <div>
                <label className="block text-sm font-medium">Date of Refill Request</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.refill_request_date || ''} onChange={e => setEditForm({ ...editForm, refill_request_date: e.target.value })} placeholder="mm/dd/yyyy" />
              </div>
              <div>
                <label className="block text-sm font-medium">Date of Last Fill</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.last_filled || ''} onChange={e => setEditForm({ ...editForm, last_filled: e.target.value })} placeholder="mm/dd/yyyy" />
              </div>
              <div>
                <label className="block text-sm font-medium">Medication Refill History</label>
                <input className="w-full border rounded px-2 py-1" value={editForm.refill_history || ''} onChange={e => setEditForm({ ...editForm, refill_history: e.target.value })} placeholder="Enter refill history" />
              </div>
              <div>
                <label className="block text-sm font-medium">Refill Notes</label>
                <textarea className="w-full border rounded px-2 py-1" value={editForm.refill_notes || ''} onChange={e => setEditForm({ ...editForm, refill_notes: e.target.value })} placeholder="Enter refill notes" />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setEditPatient(null); setEditForm(null); }}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete.open} onOpenChange={open => { if (!open) setShowDelete({ open: false, patient: null }); }}>
        {showDelete.patient && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Patient</DialogTitle>
            </DialogHeader>
            <div className="py-4">Are you sure you want to delete patient <span className="font-semibold">{showDelete.patient.name}</span>?</div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDelete({ open: false, patient: null })}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={() => handleDelete(showDelete.patient)}>Delete</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Patient</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateSubmit}>
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Patient ID</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.patient_id} onChange={e => setCreateForm({ ...createForm, patient_id: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Age</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.age} onChange={e => setCreateForm({ ...createForm, age: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Gender</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.gender} onChange={e => setCreateForm({ ...createForm, gender: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium">Diagnosis</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.diagnosis || ''} onChange={e => setCreateForm({ ...createForm, diagnosis: e.target.value })} placeholder="Enter diagnosis" />
            </div>
            <div>
              <label className="block text-sm font-medium">Comorbidities</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.comorbidities || ''} onChange={e => setCreateForm({ ...createForm, comorbidities: e.target.value })} placeholder="Enter comorbidities" />
            </div>
            <div>
              <label className="block text-sm font-medium">Allergies</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.allergies || ''} onChange={e => setCreateForm({ ...createForm, allergies: e.target.value })} placeholder="Enter allergies" />
            </div>
            <div>
              <label className="block text-sm font-medium">Clinical Note</label>
              <textarea className="w-full border rounded px-2 py-1" value={createForm.icd_notes || ''} onChange={e => setCreateForm({ ...createForm, icd_notes: e.target.value })} placeholder="Enter clinical note" />
            </div>
            <div>
              <label className="block text-sm font-medium">Past Medical History</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.icd_pmh || ''} onChange={e => setCreateForm({ ...createForm, icd_pmh: e.target.value })} placeholder="Enter past medical history" />
            </div>
            <div>
              <label className="block text-sm font-medium">Lab Results</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.labs || ''} onChange={e => setCreateForm({ ...createForm, labs: e.target.value })} placeholder="Enter lab results" />
            </div>
            <div>
              <label className="block text-sm font-medium">Medication</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.medication || ''} onChange={e => setCreateForm({ ...createForm, medication: e.target.value })} placeholder="Enter medication" />
            </div>
            <div>
              <label className="block text-sm font-medium">Date of Refill Request</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.refill_request_date || ''} onChange={e => setCreateForm({ ...createForm, refill_request_date: e.target.value })} placeholder="mm/dd/yyyy" />
            </div>
            <div>
              <label className="block text-sm font-medium">Date of Last Fill</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.last_filled || ''} onChange={e => setCreateForm({ ...createForm, last_filled: e.target.value })} placeholder="mm/dd/yyyy" />
            </div>
            <div>
              <label className="block text-sm font-medium">Medication Refill History</label>
              <input className="w-full border rounded px-2 py-1" value={createForm.refill_history || ''} onChange={e => setCreateForm({ ...createForm, refill_history: e.target.value })} placeholder="Enter refill history" />
            </div>
            <div>
              <label className="block text-sm font-medium">Refill Notes</label>
              <textarea className="w-full border rounded px-2 py-1" value={createForm.refill_notes || ''} onChange={e => setCreateForm({ ...createForm, refill_notes: e.target.value })} placeholder="Enter refill notes" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PatientsList;