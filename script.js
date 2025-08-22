const API_BASE = "http://localhost:3000";

let editingPatientId = null; 


async function loadPatients() {
  const res = await fetch(`${API_BASE}/patients`);
  const data = await res.json();

  const container = document.getElementById("patientsContainer");
  container.innerHTML = "";

  data.patients.forEach((p) => {
    const admissionDate = new Date(p.admission_datetime).toLocaleString();

    const profilePic = p.file_name
      ? `${API_BASE}/patients/${p.patient_id}/document`
      : "https://via.placeholder.com/100";

      container.innerHTML += `
      <div class="bg-white border rounded-lg shadow p-6 flex flex-col items-center text-center">
        
        ${
          p.file_name
            ? `<img src="${API_BASE}/patients/${p.patient_id}/document" 
                   alt="Profile" 
                   class="w-28 h-28 rounded-full object-cover mb-4">`
            : `<div class="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                 <span class="text-gray-500 text-sm">No Image</span>
               </div>`
        }
        
        <h3 class="text-lg font-semibold">${p.name}</h3>
        <p class="text-gray-600 text-sm mb-2">Patient ID: ${p.patient_id}</p>
        <p class="text-gray-600">Age: ${p.age}</p>
        <p class="text-gray-600">Address: ${p.address}</p>
        <p class="text-gray-600">Email: ${p.email || "N/A"}</p>
        <p class="text-gray-600 text-sm mt-2">Admitted: ${admissionDate}</p>
        
        <div class="mt-4 flex space-x-2">
          <button 
            onclick='editPatient(${JSON.stringify(p)})' 
            class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded">
            Edit
          </button>
          <button 
            onclick="deletePatient('${p.patient_id}')" 
            class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
            Delete
          </button>
        </div>
      </div>
    `;
    
  });
}


function editPatient(patient) {
  editingPatientId = patient.patient_id;

  document.getElementById("patient_id").value = patient.patient_id;
  document.getElementById("name").value = patient.name;
  document.getElementById("age").value = patient.age;
  document.getElementById("address").value = patient.address;
  document.getElementById("email").value = patient.email || "";
  document.getElementById("admission_datetime").value = patient.admission_datetime;
document.getElementById("file_name").value=patient.file_name;
  document.querySelector("button[type=submit]").textContent = "Update Patient";
}


async function deletePatient(id) {
  if (!confirm("Are you sure you want to delete this patient?")) return;

  try {
    const res = await fetch(`${API_BASE}/patients/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || "Failed to delete");
      return;
    }

    const result = await res.json();
    alert(result.message || "Patient deleted successfully");
    loadPatients();
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Failed to delete patient");
  }
}


document.getElementById("addPatientForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);

  try {
    let res;
    if (editingPatientId) {
   
      res = await fetch(`${API_BASE}/patients/${editingPatientId}`, {
        method: "PUT",
        body: formData,
      });
    } else {
    
      res = await fetch(`${API_BASE}/patients`, {
        method: "POST",
        body: formData,
      });
    }

    if (!res.ok) {
      const errorData = await res.json();
      alert(errorData.error || "Something went wrong");
      return;
    }

    const result = await res.json();
    alert(result.message || (editingPatientId ? "Patient updated" : "Patient admitted"));

    loadPatients();
    e.target.reset(); 
    editingPatientId = null;
    document.querySelector("button[type=submit]").textContent = "Confirm Admission";
  } catch (err) {
    console.error("Request failed:", err);
    alert("Failed to submit form");
  }
});
