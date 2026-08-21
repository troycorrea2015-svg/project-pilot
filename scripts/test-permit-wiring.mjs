import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const read=(p)=>fs.readFile(new URL(`../${p}`,import.meta.url),'utf8');
const [customer,admin,sync,server,sql]=await Promise.all([read('components/FullServicePermitStart.js'),read('app/admin/permit-concierge/[id]/page.js'),read('app/api/permit-service/sync/route.js'),read('lib/permit-service-server.js'),read('RUN_THIS_IN_SUPABASE_4_5_UPGRADE.sql')]);
const checks=[
 ['customer sync API',customer.includes('/api/permit-service/sync')],
 ['15-second customer refresh',customer.includes('15000')&&customer.includes('setInterval')],
 ['7-stage milestone UI',customer.includes('PERMIT_PROGRESS_STAGES.map')],
 ['paid activation starts intake',server.includes('status: "intake_review"')],
 ['operator task queue seeded',server.includes('Verify jurisdiction and filing authority')&&server.includes('Coordinate inspections and closeout')],
 ['admin task completion advances',admin.includes('Task completed and permit progress advanced.')&&admin.includes('syncProjectPermitState(nextStatus')],
 ['corrections workflow',admin.includes('updateCorrectionStatus')&&admin.includes('resubmitted')&&admin.includes('resolved')],
 ['inspection workflow',admin.includes('updateInspectionStatus')&&admin.includes('closeout')],
 ['visible sync events',sync.includes('event_type: "progress_sync"')&&sync.includes('visible_to_homeowner: true')],
 ['project status synchronization',sync.includes('projectStatusForPermitStatus')&&sync.includes('.from("projects")')],
];
for(const status of ['requested','intake_review','preparing','waiting_on_homeowner','ready_for_submission','filing','submitted','corrections','approved','inspections','closeout','closed','cancelled']) checks.push([`SQL ${status}`,sql.includes(`'${status}'`)]);
for(const [name,ok] of checks) assert.ok(ok,name);
console.log(`Permit wiring tests passed: ${checks.length}/${checks.length}`);
