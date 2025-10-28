document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("receptionForm");
  const purposeSelect = document.getElementById("purpose");
  const otherPurposeGroup = document.getElementById("otherPurposeGroup");
  
  // DOM ELEMENTS
  const appointmentSelect = document.getElementById("appointment");
  const appointmentDetailsGroup = document.getElementById("appointmentDetailsGroup");
  const whomToMeetInput = document.getElementById("reference");
  const appointmentDateTimeInput = document.getElementById("appointmentDateTime");
  

  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw-mvr6zP0PxNyQKNoyMyXEiM9U2aGjCnfKXJlmIqYec6NIRAMNmURMAmAV0TIBSbY2/exec";
  

  purposeSelect.addEventListener("change", () => {
    otherPurposeGroup.classList.toggle("hidden", purposeSelect.value !== "other");
  });

  // LOGIC for Appointment Select
  appointmentSelect.addEventListener("change", () => {
    const isAppointmentYes = appointmentSelect.value === "Yes";
    
    // Toggle visibility of the group
    appointmentDetailsGroup.classList.toggle("hidden", !isAppointmentYes);
    
    // Set required attribute dynamically
    whomToMeetInput.required = isAppointmentYes;
    appointmentDateTimeInput.required = isAppointmentYes;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = {
      formType: "reception",
      visitorName: document.getElementById("visitorName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      purpose: document.getElementById("purpose").value.trim(),
      otherPurpose: document.getElementById("otherPurpose").value.trim(),
      department: document.getElementById("department").value.trim(),
      
      // Included the 'Appointment' value
      appointment: appointmentSelect.value.trim(), 
      
      // The dynamically shown/hidden fields
      reference: whomToMeetInput.value.trim(),
      appointmentDateTime: appointmentDateTimeInput.value.trim(),

      referenceBy: document.getElementById("referenceBy").value.trim(),
    };

    try {
      // Save Reception data to Google Sheet
      const response = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to save data");
      }

      // Redirect based on purpose
      const purpose = formData.purpose.toLowerCase();

      // === MODIFICATION ===
      // Both "interview" and "training" redirects have been removed.
      
      if (purpose === "bikedelivery") {
        window.location.href = "vehicle.html";
      } else if (purpose === "accessories") {
        window.location.href = "accessories.html";
      } else {
        // "Interview", "Training", and all "Other" purposes will now run this code
        alert("✅ Reception data saved!");
        form.reset();
        otherPurposeGroup.classList.add("hidden");
        // Hide the appointment group on reset
        appointmentDetailsGroup.classList.add("hidden"); 
      }

    } catch (error) {
      console.error("Error submitting reception data:", error);
      alert("❌ Error submitting data!");
    }
  });
});