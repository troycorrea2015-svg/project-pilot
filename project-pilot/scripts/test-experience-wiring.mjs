import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const tests = [];
function check(name, condition) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  tests.push(name);
}

const dashboard = read('app/dashboard/page.js');
const dashboardCss = read('app/dashboard/dashboard.css');
const permit = read('components/FullServicePermitStart.js');
const permitCss = read('components/FullServicePermitStart.module.css');
const assistant = read('components/GuidanceAssistant.js');
const pilotRoute = read('app/api/pilot/route.js');
const projectPage = read('app/project/[id]/page.js');
const adminCase = read('app/admin/permit-concierge/[id]/page.js');
const home = read('app/page.js');
const homeCss = read('app/page.css');
const adminNotify = read('app/api/admin/permit-service/notify/route.js');
const homeownerNotify = read('app/api/permit-service/message-notify/route.js');

check('dashboard has current project command center', dashboard.includes('projectCommandCenter'));
check('dashboard separates Project Pilot work from customer action', dashboard.includes("WHAT’S HAPPENING") && dashboard.includes('WHAT YOU NEED TO DO'));
check('dashboard shows next checkpoint and next update', dashboard.includes('NEXT CHECKPOINT') && dashboard.includes('NEXT UPDATE'));
check('dashboard uses real permit progress', dashboard.includes('permitProgressPercent') && dashboard.includes('primaryPermitProgress'));
check('dashboard surfaces latest visible permit event', dashboard.includes('primaryPermitEvents[0]'));
check('dashboard command center has responsive styling', dashboardCss.includes('@media(max-width:760px)') && dashboardCss.includes('.projectCommandGrid{grid-template-columns:1fr}'));

check('permit screen has right-now command center', permit.includes('customerCommandCenter') && permit.includes('RIGHT NOW'));
check('permit screen explicitly says when nothing is needed', permit.includes('Nothing needed from you'));
check('permit screen shows Project Pilot work', permit.includes('WHAT PROJECT PILOT IS DOING'));
check('permit screen shows next checkpoint and update expectation', permit.includes('NEXT CHECKPOINT') && permit.includes('NEXT UPDATE'));
check('permit screen shows official permit source panel', permit.includes('OFFICIAL PERMIT SOURCE'));
check('permit screen shows recent visible updates without opening a disclosure', permit.includes('RECENT PERMIT UPDATES') && permit.includes('events.slice(0, 3)'));
check('permit command center has mobile layout', permitCss.includes('.commandCenterGrid{grid-template-columns:1fr}'));

check('Su auto-resolves active dashboard project', pilotRoute.includes('pagePath.startsWith("/dashboard")') && pilotRoute.includes('.order("updated_at", { ascending: false })'));
check('Su receives Permit Concierge context', pilotRoute.includes('PERMIT CONCIERGE SERVICE CONTEXT') && pilotRoute.includes('permitServiceTasks'));
check('Su is instructed to say nothing is needed when appropriate', pilotRoute.includes('Nothing is needed from you right now'));
check('assistant can retain auto-resolved project ID for confirmed actions', assistant.includes('contextProjectId') && assistant.includes('projectIdFromPath(pathname) || contextProjectId'));
check('assistant has status/action quick prompts', assistant.includes('What’s happening?') && assistant.includes('Do I need to do anything?'));

check('project overview distinguishes Project Pilot-owned work', projectPage.includes('PROJECT PILOT IS WORKING') && projectPage.includes('projectPilotOwnsNextAction'));
check('project overview routes managed permit work to permit status', projectPage.includes('View Permit Status'));

check('admin workbench previews customer experience', adminCase.includes('CUSTOMER EXPERIENCE PREVIEW') && adminCase.includes('customerViewCheckpoint'));
check('admin preview reminds operator to keep customer wording clear', adminCase.includes('If this preview is vague, stale'));
check('major permit updates can email the homeowner', adminCase.includes('emailCustomer(') && adminNotify.includes('Open your live permit status'));
check('homeowner permit messages can notify operations', permit.includes('/api/permit-service/message-notify') && homeownerNotify.includes('PERMIT_CONCIERGE_EMAIL'));

check('homepage uses clean house-only daytime hero', home.includes('/homepage-hero-house-clean-4-5c.jpg'));
check('homepage active copy does not claim fabricated customer totals', !home.includes('10,000+') && !home.includes('4.9/5'));
check('mobile homepage retains a visible start CTA', homeCss.includes('.heroHeader .navCta{display:inline-flex'));
check('old full promotional hero is not in public assets', !fs.existsSync(path.join(root, 'public/homepage-hero-day.png')));
check('new house-only hero exists', fs.existsSync(path.join(root, 'public/homepage-hero-house-clean-4-5c.jpg')));

console.log(`Experience wiring tests passed: ${tests.length}/${tests.length}`);
