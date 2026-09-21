
    // --- OFFLINE SYNC LOGIC ---
    let offlineDB;
    let pendingOfflineFiles = [];
    
    const req = indexedDB.open('DosjeOfflineStore', 3);
    req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('inspections_cache')) db.createObjectStore('inspections_cache', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'id' });
    };
    req.onsuccess = (e) => { offlineDB = e.target.result; updateNetworkUI(); };

    function updateNetworkUI() {
        const isOnline = navigator.onLine;
        const dot = document.getElementById('net-status-dot');
        const txt = document.getElementById('net-status-text');
        const syncBtn = document.getElementById('sync-now-btn');
        if (!offlineDB) return;
        const tx = offlineDB.transaction('outbox', 'readonly');
        const countReq = tx.objectStore('outbox').count();
        countReq.onsuccess = () => {
            const count = countReq.result;
            if (isOnline) {
                if (count > 0) {
                    dot.className = 'w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse';
                    txt.textContent = `${count} Pending Sync`;
                    syncBtn.classList.remove('hidden');
                } else {
                    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse';
                    txt.textContent = 'Online';
                    syncBtn.classList.add('hidden');
                }
            } else {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-red-500';
                txt.textContent = 'Offline';
                if (count > 0) {
                    txt.textContent = `Offline (${count} Pending)`;
                    syncBtn.classList.remove('hidden');
                } else {
                    syncBtn.classList.add('hidden');
                }
            }
        };
    }

    window.addEventListener('online', () => { updateNetworkUI(); manualSync(); });
    window.addEventListener('offline', updateNetworkUI);

    async function manualSync() {
        if (!navigator.onLine || !offlineDB) return;
        const tx = offlineDB.transaction('outbox', 'readonly');
        const outbox = tx.objectStore('outbox');
        const allReq = outbox.getAll();
        allReq.onsuccess = async () => {
            const reports = allReq.result;
            for (let r of reports) {
                try {
                    // 1. Create Report if needed
                    let repId = r.reportId;
                    if (!repId || String(repId).startsWith('offline-')) {
                        const createRes = await Auth.fetchWithAuth('/api/reports/', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ inspection: r.inspectionId, findings: "" })
                        });
                        const createData = await createRes.json();
                        repId = createData.id;
                    }

                    // 2. Upload Files
                    if (r.files && r.files.length > 0) {
                        for (let fileObj of r.files) {
                            const formData = new FormData();
                            formData.append('report', repId);
                            formData.append('file', fileObj.file, fileObj.file.name || 'upload.jpg');
                            if (fileObj.lat) formData.append('geo_lat', fileObj.lat);
                            if (fileObj.lng) formData.append('geo_lng', fileObj.lng);
                            await Auth.fetchWithAuth(`/api/reports/${repId}/evidence/`, { method: 'POST', body: formData }, false);
                        }
                    }

                    // 3. Finalize
                    r.payload.client_submission_id = r.id;
                    const finalRes = await Auth.fetchWithAuth(`/api/reports/${repId}/finalize/`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(r.payload)
                    });

                    if (finalRes.ok) {
                        const dTx = offlineDB.transaction('outbox', 'readwrite');
                        dTx.objectStore('outbox').delete(r.id);
                        if (r.id === currentReportId) {
                            document.getElementById('evidence-success').classList.remove('hidden');
                            document.getElementById('btn-finalize-report').disabled = true;
                            document.getElementById('btn-finalize-report').innerHTML = `✅ Report Synced Successfully`;
                        }
                    }
                } catch (e) {
                    console.error("Manual sync failed for", r.id, e);
                    const uTx = offlineDB.transaction('outbox', 'readwrite');
                    r.retryCount = (r.retryCount || 0) + 1;
                    uTx.objectStore('outbox').put(r);
                }
            }
            updateNetworkUI();
        };
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered!'));
    }



    
    // --- ADVANCED SCHEME CONFIGURATION ---
    const SCHEME_CHECKLISTS = {
        'AVYAY': [
            { category: 'Infrastructure', question: 'Are wheelchair ramps and accessible toilets available?' },
            { category: 'Healthcare', question: 'Is the Mobile Medical Unit fully functional and staffed?' },
            { category: 'General', question: 'Are recreation facilities well-maintained?' }
        ],
        'NAPDDR': [
            { category: 'Rehabilitation', question: 'Are detox beds and rehab facilities sanitary and operational?' },
            { category: 'Records', question: 'Are counseling session records accurately maintained?' },
            { category: 'Staff', question: 'Is trained psychiatric/social work staff present?' }
        ],
        'SMILE': [
            { category: 'Accommodation', question: 'Does the Garima Greh provide adequate, safe shelter?' },
            { category: 'Training', question: 'Are skill training equipment operational and accessible?' }
        ],
        'ELDERLINE': [
            { category: 'Operations', question: 'Are toll-free operators active and logging queries?' },
            { category: 'Infrastructure', question: 'Are workstations and UPS backups fully operational?' }
        ],
        'SWAVALAMBAN': [
            { category: 'Accessibility', question: 'Are all vocational tools accessible to PwDs?' },
            { category: 'Safety', question: 'Are emergency exits and pathways unobstructed?' }
        ],
        'DDRS': [
            { category: 'Education', question: 'Are special education kits available and used?' },
            { category: 'Transport', question: 'Are transport vans for PwDs in working condition?' }
        ],
        'NATIONAL_TRUST': [
            { category: 'Therapy', question: 'Are sensory integration kits available in good condition?' },
            { category: 'Staff', question: 'Is a certified special educator or therapist on site?' }
        ],
        'VAYOSHRI': [
            { category: 'Distribution', question: 'Are assistive devices distributed directly to identified seniors?' },
            { category: 'Condition', question: 'Are hearing aids and spectacles of approved quality?' }
        ],
        'SAGE': [
            { category: 'Awareness', question: 'Are promotional kiosks and banners displayed visibly?' },
            { category: 'Operations', question: 'Are survey tablets functioning and used for registration?' }
        ],
        'PM_AJAY': [
            { category: 'Hostel', question: 'Is the hostel capacity sufficient with adequate beds and ventilation?' },
            { category: 'Infrastructure', question: 'Are solar panels and water purifiers functioning?' },
            { category: 'Nutrition', question: 'Is the mess food quality adequate and menu adhered to?' }
        ],
        'OTHER': [
            { category: 'General', question: 'Is the project operating as per guidelines?' },
            { category: 'Finance', question: 'Are registers and accounts well maintained?' }
        ]
    };
    
    let currentScheme = 'OTHER';
    let currentAssets = [];
    let currentBeneficiaries = [];
    
// --- INCOMING CALL LOGIC ---
    
    async function pollIncomingCalls() {
        if (incomingCallInspId) return; // currently ringing

        try {
            const res = await Auth.fetchWithAuth(`/api/inspections/vc-status/`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'pending' && !notifiedCalls.has(data.event_id)) {
                    notifiedCalls.add(data.event_id);
                    
                    const insp = assignments.find(a => a.id === data.inspection_id) || {id: data.inspection_id};
                    
                    incomingCallInspId = data.inspection_id;
                    incomingCallRoom = data.jitsi_room_name;
                    currentEventId = data.event_id;
                    
                    const proj = projectsData[insp.project] || {title: 'Active Inspection'};
                    document.getElementById('incoming-call-title').textContent = proj?.title || `Inspection #${insp.id}`;
                    
                    document.getElementById('incoming-call-modal').classList.remove('hidden');
                    
                    playRingtone();
                    
                    // Auto-dismiss after 20 seconds
                    callTimeout = setTimeout(() => {
                        autoMissCall();
                    }, 20000);
                }
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }
    
    let currentEventId = null;
    
    async function autoMissCall() {
        stopRingtone();
        document.getElementById('incoming-call-modal').classList.add('hidden');
        incomingCallInspId = null;
        incomingCallRoom = null;
        // No explicit API call needed for miss, backend handles timeout on Official side polling
    }
        async function acceptCall() {
        const eventId = currentEventId;
        const roomName = incomingCallRoom;
        
        stopRingtone();
        if (callTimeout) clearTimeout(callTimeout);
        document.getElementById('incoming-call-modal').classList.add('hidden');
        incomingCallInspId = null;
        incomingCallRoom = null;
        
        try {
            const res = await Auth.fetchWithAuth(`/api/inspections/${eventId}/respond-vc/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({response: 'accept'})
            });
            if (res.ok) {
                document.getElementById('jitsi-modal').classList.remove('hidden');
                const container = document.getElementById('jitsi-container');
                container.innerHTML = ''; 
        
                jitsiApi = new JitsiMeetExternalAPI('jitsi.riot.im', {
                    roomName: roomName,
                    width: '100%', height: '100%', parentNode: container,
                    configOverwrite: { startWithAudioMuted: true, startWithVideoMuted: true },
                    userInfo: { displayName: 'Inspector' }
                });
                jitsiApi.addEventListener('videoConferenceLeft', async () => {
                    await Auth.fetchWithAuth(`/api/inspections/${eventId}/end-vc/`, { method: 'POST' });
                    closeJitsiModal();
                });
                jitsiApi.addEventListener('connectionFailed', () => {
                    alert('Call connection failed. Please try again.');
                    closeJitsiModal();
                });
            }
        } catch (e) {}
    }
    
    async function declineCall() {
        const eventId = currentEventId;
        stopRingtone();
        if (callTimeout) clearTimeout(callTimeout);
        document.getElementById('incoming-call-modal').classList.add('hidden');
        incomingCallInspId = null;
        incomingCallRoom = null;
        
        try {
            await Auth.fetchWithAuth(`/api/inspections/${eventId}/respond-vc/`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({response: 'decline'})
            });
        } catch (e) {}
    }

    async function acceptCall() {
        const inspId = incomingCallInspId;
        const roomName = incomingCallRoom;
        
        declineCall(); // Stops ringtone and hides modal
        
        // Load the inspection into the UI
        await openInspection(inspId);
        
        // Instantly launch the Jitsi Call
        document.getElementById('jitsi-modal').classList.remove('hidden');
        const container = document.getElementById('jitsi-container');
        container.innerHTML = ''; 

        jitsiApi = new JitsiMeetExternalAPI('jitsi.riot.im', {
            roomName: roomName,
            width: '100%', height: '100%', parentNode: container,
            configOverwrite: { startWithAudioMuted: true, startWithVideoMuted: true },
            userInfo: { displayName: 'Inspector' }
        });
        jitsiApi.addEventListener('videoConferenceLeft', closeJitsiModal);
        jitsiApi.addEventListener('connectionFailed', () => {
            alert('Call connection failed. Please try again.');
            closeJitsiModal();
        });
    }

