


    let assignments = [];
    let projectsData = {};
    let ngosData = {};
    let beneficiariesData = {};
    let currentInspection = null;
    let currentReportId = null;
    let jitsiApi = null;
    let gpsInterval = null;
    let watchId = null;
    let currentCoords = null;
    let swapInspectionId = null;

    // Incoming Call System
    let notifiedCalls = new Set();
    let callTimeout = null;
    let ringtoneInterval = null;
    let audioCtx = null;
    let knownAssignmentIds = null;
    let incomingCallRoom = null;
    let incomingCallInspId = null;

    document.addEventListener('DOMContentLoaded', () => {
        loadData();
        document.getElementById('leave-form').addEventListener('submit', submitLeave);
        loadLeaves();
        setInterval(pollIncomingCalls, 5000); // Poll for incoming calls
        setInterval(loadData, 30000); // Auto-refresh data
    });

    async function loadData() {
        try {
            const [inspRes, projRes, ngoRes] = await Promise.all([
                Auth.fetchWithAuth('/api/inspections/'),
                Auth.fetchWithAuth('/api/projects/'),
                Auth.fetchWithAuth('/api/ngos/')
            ]);
            
            assignments = await inspRes.json();
            if (!Array.isArray(assignments)) assignments = [];
            const projectsArray = await projRes.json();
            if (Array.isArray(projectsArray)) projectsArray.forEach(p => projectsData[p.id] = p);
            const ngosArray = await ngoRes.json();
            if (Array.isArray(ngosArray)) ngosArray.forEach(n => ngosData[n.id] = n);
            
            // Fetch beneficiaries for active projects
            for (let a of assignments) {
                if (a.status === 'pending' || a.status === 'in_progress') {
                    if (!beneficiariesData[a.project]) {
                        try {
                            const res = await Auth.fetchWithAuth(`/api/projects/${a.project}/beneficiaries/`);
                            if (res.ok) beneficiariesData[a.project] = await res.json();
                        } catch (err) {}
                    }
                }
            }
            if (offlineDB) {
                const tx = offlineDB.transaction('inspections_cache', 'readwrite');
                tx.objectStore('inspections_cache').put({id: 'data', assignments, projectsData, ngosData, beneficiariesData});
            }
            renderPendingInspections();
            renderCompletedInspections();
        } catch (e) {
            if (offlineDB) {
                const tx = offlineDB.transaction('inspections_cache', 'readonly');
                const req = tx.objectStore('inspections_cache').get('data');
                req.onsuccess = () => {
                    if (req.result) {
                        assignments = req.result.assignments;
                        projectsData = req.result.projectsData;
                        ngosData = req.result.ngosData;
                        beneficiariesData = req.result.beneficiariesData || {};
                        renderPendingInspections();
                        renderCompletedInspections();
                    }
                };
            }
        }
    }


    function renderPendingInspections() {
        const list = document.getElementById('pending-inspections-list');
        list.innerHTML = '';
        
        const pending = assignments.filter(a => a.status === 'pending' || a.status === 'in_progress');
        document.getElementById('pending-count').textContent = pending.length;

        if (pending.length === 0) {
            list.innerHTML = '<div class="text-center py-8 text-slate-400 text-sm">No active assignments today.</div>';
            return;
        }

        pending.forEach(a => {
            const proj = projectsData[a.project];
            const ngo = proj ? ngosData[proj.ngo] : null;
            const d = new Date(a.scheduled_time);
            
            const isAccepted = a.assignments && a.assignments.length > 0 ? a.assignments[0].is_accepted : false;
            
            let titleHtml = proj?.title || 'Project';
            if (ngo) titleHtml += ` <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 ml-1">NGO: ${ngo.name}</span>`;

            let actionHtml = '';
            if (!isAccepted) {
                actionHtml = `
                    <button onclick="acceptAssignment(${a.id})" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition w-full">
                        I Accept Assignment
                    </button>
                `;
            } else if (a.status === 'pending') {
                actionHtml = `
                    <button onclick="startInspection(${a.id})" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition">
                        Start Inspection
                    </button>
                    <button onclick="openSwapModal(${a.id})" class="text-[10px] text-slate-400 hover:text-red-600 font-bold uppercase tracking-wider transition underline">
                        Swap
                    </button>
                `;
            } else if (a.status === 'in_progress') {
                actionHtml = `
                    <button onclick="openInspection(${a.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition">
                        Continue Inspection
                    </button>
                `;
            }

            list.innerHTML += `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 hover:border-blue-400 transition cursor-default">
                    <div>
                        <h3 class="font-bold text-slate-800 leading-tight flex items-center flex-wrap gap-1">${titleHtml}</h3>
                        <div class="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                            <a href="https://www.google.com/maps/search/?api=1&query=${proj?.latitude},${proj?.longitude}" target="_blank" class="flex items-center gap-1 hover:text-blue-600 hover:underline transition" title="View on Maps">📍 View Location</a>
                            <span class="flex items-center gap-1">📅 ${d.toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                        ${actionHtml}
                    </div>
                </div>
            `;
        });
    }

    function renderCompletedInspections() {
        const list = document.getElementById('completed-inspections-list');
        list.innerHTML = '';
        
        const completed = assignments.filter(a => a.status === 'completed');

        if (completed.length === 0) {
            list.innerHTML = '<li class="p-6 text-slate-400 text-sm text-center">No completed inspections yet.</li>';
            return;
        }

        completed.forEach(a => {
            const proj = projectsData[a.project];
            const ngo = proj ? ngosData[proj.ngo] : null;
            const d = new Date(a.scheduled_time);
            
            let titleHtml = proj?.title || 'Project';
            if (ngo) titleHtml += ` <span class="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 ml-1">NGO: ${ngo.name}</span>`;

            list.innerHTML += `
                <li class="p-5 flex justify-between items-center hover:bg-slate-50 transition">
                    <div class="flex items-center gap-4">
                <!-- Network Status -->
                <div class="flex items-center gap-3 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                    <div id="net-status-dot" class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span id="net-status-text" class="text-xs font-bold text-slate-700 uppercase tracking-wider">Online</span>
                    <button id="sync-now-btn" onclick="manualSync()" class="hidden text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded shadow transition">Sync Now</button>
                </div>
                        <div class="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-lg border border-slate-200">✅</div>
                        <div>
                            <h4 class="font-bold text-slate-800 text-sm flex items-center flex-wrap gap-1">${titleHtml}</h4>
                            <p class="text-xs text-slate-500"><a href="https://www.google.com/maps/search/?api=1&query=${proj?.latitude},${proj?.longitude}" target="_blank" class="hover:text-blue-600 hover:underline transition">View Location</a> • ${d.toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-emerald-600 font-bold text-xs uppercase tracking-wider block">Status</span>
                        <span class="text-slate-600 text-sm font-medium">Completed</span>
                    </div>
                </li>
            `;
        });
    }

    
    
    async function acceptAssignment(id) {
        try {
            const res = await fetch(`/api/inspections/${id}/accept/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
            });
            if (res.ok) {
                alert("Assignment accepted successfully!");
                await loadData();
                openInspection(id);
            } else {
                alert("Failed to accept assignment.");
            }
        } catch (e) {
            console.error(e);
            alert("Error connecting to server.");
        }
    }


    async function openInspection(id) {
        currentInspection = assignments.find(a => a.id === id);
        const proj = projectsData[currentInspection.project];
        const ngo = proj ? ngosData[proj.ngo] : null;
        
        currentScheme = proj.scheme_name || 'OTHER';
        
        // Populate Header Data
        let pTitle = proj.title;
        if (ngo) pTitle += ` (NGO: ${ngo.name})`;
        document.getElementById('proj-title').textContent = pTitle;
        document.getElementById('sched-time').textContent = new Date(currentInspection.scheduled_time).toLocaleString();
        document.getElementById('scheme-badge').textContent = currentScheme;
        
        // Hide empty state, show panel
        const emptyState = document.getElementById('no-inspection-selected');
        const activePanel = document.getElementById('active-inspection-panel');
        
        emptyState.classList.add('hidden');
        activePanel.classList.remove('opacity-0', 'pointer-events-none');
        activePanel.classList.add('opacity-100');
        
        checkJitsiWindow();
        
        // Render Checklists Based on Scheme
        const pList = document.getElementById('purpose-checklist');
        pList.innerHTML = '';
        const schemeQuestions = SCHEME_CHECKLISTS[currentScheme] || SCHEME_CHECKLISTS['OTHER'];
        schemeQuestions.forEach((q, idx) => {
            pList.innerHTML += `
                <label class="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer hover:border-blue-400 transition">
                    <input type="checkbox" class="purpose-cb w-5 h-5 mt-0.5 text-blue-600 focus:ring-blue-500 border-slate-300 rounded" data-category="${q.category}" data-question="${q.question}">
                    <div class="leading-snug">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">${q.category}</span>
                        <span class="text-slate-800">${q.question}</span>
                    </div>
                </label>
            `;
        });
        
        // Use pre-fetched data from cache
        currentAssets = proj.assets || [];
        renderAssetsTable();
        document.getElementById('random-bens-container').innerHTML = '<p class="text-sm text-slate-500 italic text-center py-4">Click the randomize button to select beneficiaries for live verification.</p>';
        
        if (navigator.onLine) {
            try {
                const benRes = await Auth.fetchWithAuth(`/api/projects/${proj.id}/beneficiaries/`);
                if (benRes.ok) {
                    currentBeneficiaries = await benRes.json();
                    beneficiariesData[proj.id] = currentBeneficiaries;
                } else {
                    currentBeneficiaries = beneficiariesData[proj.id] || [];
                }
            } catch (e) {
                currentBeneficiaries = beneficiariesData[proj.id] || [];
            }
        } else {
            currentBeneficiaries = beneficiariesData[proj.id] || [];
        }

        try {
            const checkRes = await Auth.fetchWithAuth(`/api/reports/?inspection=${id}`);
            let report;
            if (checkRes.ok) {
                const existing = await checkRes.json();
                if (existing.length > 0) report = existing[0];
            }
            if (!report) {
                const createRes = await Auth.fetchWithAuth('/api/reports/', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ inspection: id, findings: "" })
                });
                report = await createRes.json();
            }
            currentReportId = report.id;
        } catch (e) {
            currentReportId = 'offline-' + id;
        }
        pendingOfflineFiles = [];
        document.getElementById('evidence-list').innerHTML = '';
        document.getElementById('geo-warning').classList.add('hidden');
        document.getElementById('geo-success').classList.add('hidden');
        document.getElementById('btn-finalize-report').disabled = false;
        document.getElementById('btn-finalize-report').innerHTML = `s, Finalize & Secure on Blockchain`;

    }
    
    function renderAssetsTable() {
        const tbody = document.getElementById('assets-tbody');
        tbody.innerHTML = '';
        if(currentAssets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500 text-sm">No assets registered for this project.</td></tr>';
            return;
        }
        currentAssets.forEach((asset) => {
            tbody.innerHTML += `
                <tr class="border-b hover:bg-slate-50 asset-row" data-id="${asset.id}" data-approved="${asset.approved_quantity}">
                    <td class="p-3 text-sm font-bold text-slate-800">${asset.asset_name}</td>
                    <td class="p-3 text-sm text-center">${asset.approved_quantity}</td>
                    <td class="p-3 text-sm"><input type="number" class="found-qty w-full p-2 border border-slate-300 rounded focus:ring-blue-500" placeholder="0" min="0" onchange="checkAssetDiscrepancy(this)"></td>
                    <td class="p-3 text-sm"><input type="text" class="asset-condition w-full p-2 border border-slate-300 rounded focus:ring-blue-500" placeholder="e.g. Good, Broken"></td>
                </tr>
            `;
        });
    }
    
    function checkAssetDiscrepancy(input) {
        const tr = input.closest('tr');
        const approved = parseInt(tr.dataset.approved);
        const found = parseInt(input.value) || 0;
        if(found < approved) {
            tr.classList.add('bg-red-50');
            tr.classList.remove('hover:bg-slate-50');
        } else {
            tr.classList.remove('bg-red-50');
            tr.classList.add('hover:bg-slate-50');
        }
    }
    
    function randomizeBeneficiaries() {
        const container = document.getElementById('random-bens-container');
        container.innerHTML = '';
        if(currentBeneficiaries.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-500 italic">No beneficiaries found for this project.</p>';
            return;
        }
        
        let shuffled = [...currentBeneficiaries].sort(() => 0.5 - Math.random());
        let selected = shuffled.slice(0, 3);
        
        selected.forEach(b => {
            container.innerHTML += `
                <div class="ben-log-card bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-sm" data-id="${b.id}">
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="font-bold text-slate-800">${b.name} <span class="text-xs font-normal text-slate-500 ml-2">(PAN: ${b.pan_number || 'N/A'})</span></h4>
                        <button onclick="alert('Verification call simulation launched for ${b.name}')" class="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-1 px-3 rounded shadow-sm">🎥 Verify</button>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mt-3">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Interaction Notes</label>
                            <input type="text" class="ben-notes w-full p-2 border border-slate-300 rounded text-sm focus:ring-blue-500" placeholder="e.g. Identity verified.">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Score (1-10)</label>
                            <input type="number" class="ben-score w-full p-2 border border-slate-300 rounded text-sm focus:ring-blue-500" min="1" max="10" placeholder="10">
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    function addViolation() {
        const list = document.getElementById('violations-list');
        const id = Date.now();
        list.innerHTML += `
            <div class="violation-card flex gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm mb-3" id="vio-${id}">
                <select class="vio-severity border-slate-300 rounded focus:ring-red-500 text-sm font-bold bg-slate-50">
                    <option value="minor">🟡 Minor</option>
                    <option value="major">🟠 Major</option>
                    <option value="critical">🔴 Critical</option>
                </select>
                <input type="text" class="vio-desc flex-grow border-slate-300 rounded text-sm focus:ring-red-500" placeholder="Describe the violation...">
                <input type="date" class="vio-deadline border-slate-300 rounded text-sm focus:ring-red-500 text-slate-500">
                <button onclick="document.getElementById('vio-${id}').remove()" class="text-red-500 hover:bg-red-50 p-2 rounded">🗑️</button>
            </div>
        `;
    }
function checkJitsiWindow() {
        if (!currentInspection) return;
        const now = new Date();
        const schedTime = new Date(currentInspection.scheduled_time);
        const diffMins = (now - schedTime) / 60000;
        const inWindow = diffMins >= -5 && diffMins <= 60;
        
        const btn = document.getElementById('btn-join-call');
        const gpsBtn = document.getElementById('btn-gps-track');
        const txt = document.getElementById('vc-status-text');

        if (inWindow) {
            btn.disabled = false;
            btn.classList.remove('bg-slate-400');
            btn.classList.add('bg-blue-600');
            btn.innerHTML = '🎥 Join Video Call Consultation';
            
            gpsBtn.classList.remove('hidden');
            if (gpsInterval) {
                gpsBtn.innerHTML = '📍 Tracking Active (Live)';
                gpsBtn.classList.replace('bg-emerald-600', 'bg-green-600');
            } else {
                gpsBtn.innerHTML = '📍 Start Live GPS Tracking';
                gpsBtn.classList.replace('bg-green-600', 'bg-emerald-600');
            }
            
            txt.textContent = 'Window is currently open.';
            txt.classList.add('text-emerald-600');
        } else {
            btn.disabled = true;
            btn.classList.add('bg-slate-400');
            btn.classList.remove('bg-blue-600');
            btn.innerHTML = 'Join Call Unavailable';
            
            gpsBtn.classList.add('hidden');
            stopGpsTracking();
            
            txt.textContent = diffMins < 0 ? `Call opens in ${Math.round(Math.abs(diffMins))} mins` : 'Call window has expired.';
            txt.classList.remove('text-emerald-600');
        }
    }

    async function joinCall() {
        try {
            const res = await Auth.fetchWithAuth(`/api/inspections/${currentInspection.id}/vc-room/`);
            const data = await res.json();
            if(!res.ok) {
                alert(data.error || 'Cannot join call at this time.');
                return;
            }
            document.getElementById('jitsi-modal').classList.remove('hidden');
            const container = document.getElementById('jitsi-container');
            container.innerHTML = ''; 

            jitsiApi = new JitsiMeetExternalAPI('jitsi.riot.im', {
                roomName: data.jitsi_room_name,
                width: '100%', height: '100%', parentNode: container,
                configOverwrite: { startWithAudioMuted: true, startWithVideoMuted: true },
                userInfo: { displayName: 'Inspector' }
            });
            jitsiApi.addEventListener('videoConferenceLeft', closeJitsiModal);
            jitsiApi.addEventListener('connectionFailed', () => {
                alert('Call connection failed. Please try again.');
                closeJitsiModal();
            });
        } catch (e) { alert('Error connecting to video call.'); }
    }

    function closeJitsiModal() {
        document.getElementById('jitsi-modal').classList.add('hidden');
        if (jitsiApi) { jitsiApi.dispose(); jitsiApi = null; }
    }

    function startGpsTracking() {
        if (!currentInspection) return;
        if (confirm("Privacy Notice: Your location will be shared with your official during this inspection window only. Do you consent?")) {
            if ("geolocation" in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        const firstTime = (currentCoords === null);
                        currentCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                        if (firstTime) {
                            sendGpsPing(); // Send immediately on first lock
                        }
                    },
                    (error) => { alert("Could not read GPS location."); },
                    { enableHighAccuracy: true }
                );
                gpsInterval = setInterval(sendGpsPing, 15000); // Poll more frequently (15s instead of 30s)
                checkJitsiWindow();
            } else { alert("Geolocation is not supported by your browser."); }
        }
    }

    function stopGpsTracking() {
        if (gpsInterval) { clearInterval(gpsInterval); gpsInterval = null; }
        if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
        currentCoords = null;
    }

    async function sendGpsPing() {
        if (!currentInspection || !currentCoords) return;
        try {
            await Auth.fetchWithAuth(`/api/inspections/${currentInspection.id}/location-ping/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: currentCoords.lat, lng: currentCoords.lng })
            });
        } catch (e) {}
    }

    async function uploadEvidence() {
        const fileInput = document.getElementById('evidence-file');
        if (!fileInput.files.length) { alert("Please select a file first."); return; }

        const warnDiv = document.getElementById('geo-warning');
        const succDiv = document.getElementById('geo-success');
        warnDiv.classList.add('hidden'); succDiv.classList.add('hidden');

        const performUpload = async (lat, lng) => {
            const formData = new FormData();
            formData.append('report', currentReportId);
            formData.append('file', fileInput.files[0]);
            if (lat && lng) {
                formData.append('geo_lat', lat);
                formData.append('geo_lng', lng);
                succDiv.classList.remove('hidden');
            }

            if (!navigator.onLine || String(currentReportId).startsWith('offline-')) {
                pendingOfflineFiles.push({ file: fileInput.files[0], lat: lat, lng: lng });
                const list = document.getElementById('evidence-list');
                list.innerHTML += `<div class="bg-slate-50 border border-slate-200 p-2 rounded text-xs flex justify-between items-center"><span class="truncate">${fileInput.files[0].name}</span><span class="text-orange-500 font-bold">Queued</span></div>`;
                fileInput.value = '';
                return;
            }
            try {
                const res = await Auth.fetchWithAuth(`/api/reports/${currentReportId}/evidence/`, { method: 'POST', body: formData }, false);
                if (res.ok) {
                    const data = await res.json();
                    let badge = '';
                    if (data.geo_lat && data.geo_lng && data.consistency_checked) {
                        if (data.location_flagged) badge = '<span class="bg-red-100 text-red-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded ml-2">⚠️ Outside expected radius</span>';
                        else badge = '<span class="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded ml-2">📍 Location Consistency Verified</span>';
                    } else if (data.geo_lat && data.geo_lng) {
                        badge = '<span class="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded ml-2">📍 GPS Captured (No Site Coordinates)</span>';
                    }
                    document.getElementById('evidence-list').innerHTML += `<li class="flex items-center">📁 ${data.file.split('/').pop()} ${badge}</li>`;
                    fileInput.value = '';
                } else { alert("Failed to upload evidence."); }
            } catch(e) { alert("Network error during upload."); }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => { performUpload(pos.coords.latitude, pos.coords.longitude); },
                (err) => { warnDiv.classList.remove('hidden'); performUpload(null, null); },
                { timeout: 5000 }
            );
        } else {
            warnDiv.classList.remove('hidden');
            performUpload(null, null);
        }
    }

    async function finalizeReport() {
        const fileInput = document.getElementById('evidence-file');
        if (fileInput && fileInput.files.length > 0) {
            alert("You have selected an evidence file but haven't uploaded it. Please click 'Upload File' first.");
            return;
        }

        if (!confirm("⚠️ WARNING ⚠️\n\nFinalizing this report will permanently hash it onto the blockchain ledger. You cannot edit it after this step. Proceed?")) return;

        let verifiedCount = 0;
        document.querySelectorAll('.beneficiary-cb').forEach(cb => { if(cb.checked) verifiedCount++; });

        let answers = [];
        document.querySelectorAll('.purpose-cb').forEach(cb => {
            answers.push({
                category: cb.dataset.category,
                question: cb.dataset.question,
                is_compliant: cb.checked,
                remarks: ""
            });
        });

        let asset_verifications = [];
        let violations = [];
        document.querySelectorAll('.asset-row').forEach(row => {
            const assetId = row.dataset.id;
            const approved = parseInt(row.dataset.approved) || 0;
            const foundInput = row.querySelector('.found-qty');
            const found = foundInput.value === '' ? 0 : parseInt(foundInput.value);
            const condition = row.querySelector('.asset-condition').value;

            asset_verifications.push({
                asset_id: assetId,
                found_quantity: found,
                condition: condition
            });

            if (found < approved) {
                violations.push({
                    severity: 'major',
                    description: `Asset Deficit: Found ${found} instead of ${approved} for Asset ID ${assetId}`
                });
            }
        });

        const cctvStatus = document.getElementById('cctv-status').value;
        if (cctvStatus === 'Offline' || cctvStatus === 'Not Installed') {
            violations.push({
                severity: 'minor',
                description: `CCTV is ${cctvStatus}`
            });
        }

        let findings = document.getElementById('input-findings').value;
        const payload = {
            findings: findings,
            beneficiaries_verified_count: verifiedCount,
            cctv_status: cctvStatus,
            checklist_answers: answers,
            asset_verifications: asset_verifications,
            violations: violations
        };

        const fundStr = document.getElementById('input-funds').value;
        if (fundStr) payload.fund_utilized_verified = fundStr;

        if (!navigator.onLine || String(currentReportId).startsWith('offline-')) {
            const outboxItem = {
                id: 'sync-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                inspectionId: currentInspection.id,
                reportId: currentReportId,
                payload: payload,
                files: pendingOfflineFiles,
                createdAt: new Date().toISOString(),
                status: 'pending',
                retryCount: 0
            };
            const tx = offlineDB.transaction('outbox', 'readwrite');
            tx.objectStore('outbox').put(outboxItem);
            
            alert("Network offline! Report queued for sync.");
            stopGpsTracking();
            document.getElementById('active-inspection-panel').classList.add('opacity-0', 'pointer-events-none');
            document.getElementById('no-inspection-selected').classList.remove('hidden');
            currentInspection = null;
            currentReportId = null;
            updateNetworkUI();
            
            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-reports').catch(err => console.log('Sync registration failed', err)));
            }
            return;
        }

        try {
            const res = await Auth.fetchWithAuth(`/api/reports/${currentReportId}/finalize/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                alert(`SUCCESS! Report finalized.
Blockchain Hash: ${data.block_hash.substring(0,16)}...`);
                stopGpsTracking();
                
                document.getElementById('active-inspection-panel').classList.add('opacity-0', 'pointer-events-none');
                document.getElementById('no-inspection-selected').classList.remove('hidden');
                currentInspection = null;
                loadData();
            } else { 
                const err = await res.json();
                alert('Failed to finalize: ' + JSON.stringify(err)); 
            }
        } catch(e) { alert('Network error finalizing report.'); }
    }

    // Leave Logic
    async function submitLeave(e) {
        e.preventDefault();
        try {
            const res = await Auth.fetchWithAuth('/api/leaves/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    start_date: document.getElementById('leave-start').value, 
                    end_date: document.getElementById('leave-end').value, 
                    reason: document.getElementById('leave-reason').value 
                })
            });
            if (res.ok) {
                alert('Leave applied successfully.');
                document.getElementById('leave-form').reset();
                loadLeaves();
            } else { alert('Failed to apply leave.'); }
        } catch(e) { alert('Network error.'); }
    }

    async function loadLeaves() {
        try {
            const res = await Auth.fetchWithAuth('/api/leaves/');
            const leaves = await res.json();
            const list = document.getElementById('leave-list');
            list.innerHTML = '';
            if (leaves.length === 0) { list.innerHTML = '<li class="text-xs text-slate-400">No leave history.</li>'; return; }
            leaves.forEach(l => {
                let color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                if (l.status === 'approved') color = 'bg-green-100 text-green-800 border-green-200';
                if (l.status === 'rejected') color = 'bg-red-100 text-red-800 border-red-200';
                list.innerHTML += `
                    <li class="p-2.5 bg-white border rounded shadow-sm flex justify-between items-center gap-2">
                        <div class="truncate">
                            <div class="text-[11px] font-bold text-slate-700">${l.start_date} to ${l.end_date}</div>
                            <div class="text-[10px] text-slate-500 truncate w-32">${l.reason}</div>
                        </div>
                        <span class="${color} border text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">${l.status}</span>
                    </li>
                `;
            });
        } catch(e) {}
    }

    // Swap Logic
    async function openSwapModal(inspectionId) {
        swapInspectionId = inspectionId;
        const select = document.getElementById('swap-partner');
        select.innerHTML = '<option>Loading available inspectors...</option>';
        document.getElementById('swap-modal').classList.remove('hidden');

        try {
            const res = await Auth.fetchWithAuth('/api/users/available_inspectors/');
            const available = await res.json();
            select.innerHTML = '<option value="">-- Select Replacement Inspector --</option>';
            available.forEach(insp => {
                const phone = insp.phone ? `(${insp.phone})` : '';
                select.innerHTML += `<option value="${insp.id}">${insp.first_name} ${insp.last_name} ${phone}</option>`;
            });
        } catch(e) { select.innerHTML = '<option>Failed to load.</option>'; }
    }

    function closeSwapModal() {
        document.getElementById('swap-modal').classList.add('hidden');
        swapInspectionId = null;
        document.getElementById('swap-partner').value = '';
        document.getElementById('swap-reason').value = '';
    }

    async function submitSwapRequest() {
        const partner = document.getElementById('swap-partner').value;
        const reason = document.getElementById('swap-reason').value;
        if (!partner || !reason) { alert('Please select a partner and enter a reason.'); return; }

        try {
            const res = await Auth.fetchWithAuth('/api/duty-swaps/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inspection: swapInspectionId, proposed_inspector: partner, reason: reason })
            });
            if (res.ok) {
                alert('Swap request submitted to Official.');
                closeSwapModal();
            } else { alert('Failed to submit swap request.'); }
        } catch (e) { alert('Failed to request swap.'); }
    }

