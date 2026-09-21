import os
html = """{% extends "base.html" %}

{% block content %}
<div class="flex h-screen bg-slate-50 overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div class="p-6 border-b border-slate-700">
            <h1 class="text-2xl font-bold tracking-tight text-white">DoSJE</h1>
            <p class="text-slate-400 text-sm mt-1">Super Admin</p>
        </div>
        <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <a href="#" onclick="showSection('dashboard')" class="nav-link block px-4 py-3 rounded bg-blue-600 text-white font-medium transition">?? Overview</a>
            <a href="#" onclick="showSection('audit')" class="nav-link block px-4 py-3 rounded text-slate-300 hover:bg-slate-800 hover:text-white transition">?? System Audit Log</a>
        </nav>
        <div class="p-4 border-t border-slate-700">
            <button onclick="Auth.logout()" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-red-600 hover:text-white transition">Logout</button>
        </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto p-4 md:p-8">
        <header class="flex justify-between items-center mb-8">
            <div><h2 class="text-3xl font-black text-slate-800 tracking-tight">Admin Operations</h2></div>
        </header>

        <!-- SECTION: Dashboard -->
        <div id="sec-dashboard" class="content-section space-y-8">
            <div class="bg-white shadow p-6 rounded-xl border border-slate-200">
                <p class="text-slate-600">Overview dashboard content...</p>
            </div>
        </div>

        <!-- SECTION: Audit Log -->
        <div id="sec-audit" class="content-section hidden space-y-8">
            <div class="bg-white shadow p-6 rounded-xl border border-slate-200">
                <h2 class="text-xl font-bold mb-6 text-slate-800">System Audit Log</h2>
                <div class="flex gap-4 mb-6">
                    <input type="date" id="audit-start" class="border border-slate-300 p-2 rounded">
                    <input type="date" id="audit-end" class="border border-slate-300 p-2 rounded">
                    <button onclick="loadAuditLogs()" class="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 transition">Filter</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-slate-600">
                        <thead class="bg-slate-50 text-slate-800 text-xs uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th class="p-4">Timestamp</th>
                                <th class="p-4">User</th>
                                <th class="p-4">Action</th>
                                <th class="p-4">Model (ID)</th>
                                <th class="p-4">Field</th>
                                <th class="p-4">Old Value</th>
                                <th class="p-4">New Value</th>
                            </tr>
                        </thead>
                        <tbody id="audit-tbody" class="divide-y divide-slate-100"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>
</div>

<script>
    Auth.requireRole('super_admin');

    function showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
        document.getElementById('sec-' + sectionId).classList.remove('hidden');
        document.querySelectorAll('.nav-link').forEach(el => {
            el.classList.remove('bg-blue-600', 'text-white');
            el.classList.add('text-slate-300', 'hover:bg-slate-800');
        });
        const activeLink = document.querySelector(`a[onclick="showSection('${sectionId}')"]`);
        if(activeLink) {
            activeLink.classList.remove('text-slate-300', 'hover:bg-slate-800');
            activeLink.classList.add('bg-blue-600', 'text-white');
        }
    }

    async function loadAuditLogs() {
        const start = document.getElementById('audit-start').value;
        const end = document.getElementById('audit-end').value;
        let url = '/api/audit-logs/?';
        if (start) url += `start_date=${start}&`;
        if (end) url += `end_date=${end}T23:59:59&`;

        try {
            const res = await Auth.fetchWithAuth(url);
            const data = await res.json();
            const tbody = document.getElementById('audit-tbody');
            tbody.innerHTML = '';
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">No audit logs found.</td></tr>';
                return;
            }
            data.forEach(log => {
                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="p-4 whitespace-nowrap">${new Date(log.timestamp).toLocaleString()}</td>
                        <td class="p-4 font-bold">${log.username || 'System'} <span class="text-[10px] text-slate-400 block uppercase">${log.role || ''}</span></td>
                        <td class="p-4"><span class="bg-indigo-100 text-indigo-800 px-2 py-1 text-[10px] rounded uppercase font-bold tracking-wider">${log.action}</span></td>
                        <td class="p-4">${log.model_name} (#${log.object_id})</td>
                        <td class="p-4 font-mono text-xs">${log.field_name}</td>
                        <td class="p-4 text-red-600 line-through text-xs max-w-xs truncate">${log.old_value || '-'}</td>
                        <td class="p-4 text-emerald-600 font-bold text-xs max-w-xs truncate">${log.new_value || '-'}</td>
                    </tr>
                `;
            });
        } catch(e) { console.error(e); }
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadAuditLogs();
    });
</script>
{% endblock %}
"""

with open('templates/dashboards/admin.html', 'w', encoding='utf-8') as f:
    f.write(html)
