// Initialize app data structure
function initializeAppData() {
    if (!localStorage.getItem('appData')) {
        const initialData = {
            users: {
                patients: {},
                doctors: {},
                insurers: {}
            },
            medicalRecords: {},
            appointments: {},
            prescriptions: {},
            insuranceClaims: {}
        };
        localStorage.setItem('appData', JSON.stringify(initialData));
    }
    return JSON.parse(localStorage.getItem('appData'));
}

// Save app data
function saveAppData(data) {
    localStorage.setItem('appData', JSON.stringify(data));
}

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser'));
}

// Set current user
function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

// Clear current user
function clearCurrentUser() {
    localStorage.removeItem('currentUser');
}

// Add new user
function addUser(userData) {
    const appData = initializeAppData();
    const { userId, userType, fullName, age, password } = userData;
    
    // Create new user object with all provided data
    const newUser = {
        userId,
        fullName,
        age,
        password,
        userType,
        createdAt: new Date().toISOString()
    };
    
    // Add user to appropriate category
    appData.users[userType + 's'][userId] = newUser;
    
    // Initialize additional data structures based on user type
    if (userType === 'patient') {
        appData.medicalRecords[userId] = {
            generalInfo: {
                bloodType: userData.bloodType || '',
                allergies: userData.allergies || [],
                medicalConditions: userData.medicalConditions || '',
                currentMedications: userData.currentMedications || ''
            },
            visits: [],
            authorizedDoctors: []
        };
    }
    
    // Save updated data
    saveAppData(appData);
    return newUser;
}

// Authenticate user
function authenticateUser(userId, password) {
    const appData = initializeAppData();
    let user = null;
    
    // Check in all user categories
    ['patients', 'doctors', 'insurers'].forEach(category => {
        if (appData.users[category][userId]) {
            const foundUser = appData.users[category][userId];
            if (foundUser.password === password) {
                user = foundUser;
            }
        }
    });
    
    if (!user) {
        throw new Error('Invalid credentials');
    }
    
    return user;
}

// Get user by ID
function getUserById(userId) {
    const appData = initializeAppData();
    let user = null;
    
    ['patients', 'doctors', 'insurers'].forEach(category => {
        if (appData.users[category][userId]) {
            user = appData.users[category][userId];
        }
    });
    
    return user;
}

// Get patient medical records
function getPatientRecords(patientId) {
    const appData = initializeAppData();
    return appData.medicalRecords[patientId] || null;
}

// Update patient medical records
function updatePatientRecords(patientId, records) {
    const appData = initializeAppData();
    if (!appData.medicalRecords[patientId]) {
        appData.medicalRecords[patientId] = {
            generalInfo: {},
            visits: [],
            authorizedDoctors: []
        };
    }
    appData.medicalRecords[patientId].generalInfo = {
        ...appData.medicalRecords[patientId].generalInfo,
        ...records
    };
    saveAppData(appData);
    return appData.medicalRecords[patientId];
}

// Function to handle logout
function handleLogout() {
    clearCurrentUser();
    window.location.href = 'index.html';
}

// Function to load user data
function loadUserData() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Update navbar
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = currentUser.fullName;
    }

    // Load specific data based on user type
    if (currentUser.userType === 'patient') {
        loadPatientData(currentUser);
    } else if (currentUser.userType === 'doctor') {
        loadDoctorData(currentUser);
    }
}

// Function to load patient data
function loadPatientData(user) {
    const records = getPatientRecords(user.userId);
    
    // Update personal information
    document.getElementById('patientName').textContent = user.fullName;
    document.getElementById('patientAge').textContent = user.age;
    
    if (records && records.generalInfo) {
        // Update blood type
        const bloodTypeSelect = document.getElementById('bloodType');
        if (bloodTypeSelect) {
            bloodTypeSelect.value = records.generalInfo.bloodType || '';
        }

        // Update allergies
        const allergiesList = document.getElementById('allergiesList');
        if (allergiesList && records.generalInfo.allergies) {
            allergiesList.innerHTML = records.generalInfo.allergies
                .map(allergy => `<li class="list-group-item">${allergy}</li>`)
                .join('');
        }

        // Update medications
        const medicationsList = document.getElementById('medicationsList');
        if (medicationsList && records.generalInfo.currentMedications) {
            const medications = records.generalInfo.currentMedications.split('\n').filter(med => med.trim());
            medicationsList.innerHTML = medications
                .map(med => `<li class="list-group-item">${med}</li>`)
                .join('');
        }

        // Update medical conditions
        const conditionsList = document.getElementById('conditionsList');
        if (conditionsList && records.generalInfo.medicalConditions) {
            const conditions = records.generalInfo.medicalConditions.split('\n').filter(condition => condition.trim());
            conditionsList.innerHTML = conditions
                .map(condition => `<li class="list-group-item">${condition}</li>`)
                .join('');
        }
    }
}

// Function to load doctor data
function loadDoctorData(user) {
    // Update personal information
    document.getElementById('doctorName').textContent = user.fullName;
    document.getElementById('doctorAge').textContent = user.age;
    
    // Load accessible patients
    loadAccessiblePatients(user.userId);
}

// Function to get accessible patients for a doctor
function loadAccessiblePatients(doctorId) {
    const appData = initializeAppData();
    const accessiblePatients = Object.values(appData.users.patients).filter(patient => {
        const records = getPatientRecords(patient.userId);
        return records && records.authorizedDoctors && records.authorizedDoctors.includes(doctorId);
    });

    const tbody = document.getElementById('patientsTable');
    if (tbody) {
        tbody.innerHTML = accessiblePatients.map(patient => {
            const records = getPatientRecords(patient.userId);
            return `
                <tr>
                    <td>${patient.fullName}</td>
                    <td>${patient.age}</td>
                    <td>${records.generalInfo.bloodType || 'Not specified'}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="viewPatientDetails('${patient.userId}')">
                            View Details
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// Function to get all doctors
function getAllDoctors() {
    const appData = initializeAppData();
    return Object.values(appData.users.doctors);
}

// Function to give doctor access to patient records
function giveDoctorAccess(patientId, doctorId) {
    const appData = initializeAppData();
    const records = getPatientRecords(patientId);
    
    if (!records) {
        throw new Error('Patient records not found');
    }
    
    if (!records.authorizedDoctors) {
        records.authorizedDoctors = [];
    }
    
    if (!records.authorizedDoctors.includes(doctorId)) {
        records.authorizedDoctors.push(doctorId);
        saveAppData(appData);
        return true;
    }
    return false;
}

// Function to revoke doctor access
function revokeDoctorAccess(patientId, doctorId) {
    const appData = initializeAppData();
    const records = getPatientRecords(patientId);
    
    if (!records || !records.authorizedDoctors) {
        return false;
    }
    
    records.authorizedDoctors = records.authorizedDoctors.filter(id => id !== doctorId);
    saveAppData(appData);
    return true;
}

// Function to get authorized doctors for a patient
function getAuthorizedDoctors(patientId) {
    const appData = initializeAppData();
    const records = getPatientRecords(patientId);
    
    if (!records || !records.authorizedDoctors) {
        return [];
    }
    
    return records.authorizedDoctors.map(doctorId => {
        const doctor = appData.users.doctors[doctorId];
        return doctor ? {
            userId: doctor.userId,
            fullName: doctor.fullName,
            age: doctor.age
        } : null;
    }).filter(doctor => doctor !== null);
}

// Add event listener to load user data when the page loads
window.addEventListener('load', function() {
    initializeAppData();
    loadUserData();
});