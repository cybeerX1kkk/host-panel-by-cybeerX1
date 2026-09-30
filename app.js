const $ = id => document.getElementById(id);
let gid, me;
const api = (u, body) => fetch(u, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}).then(r => { if (!r.ok) throw 0; return r.json(); });
const toast = t => { const e = $('toast'); e.textContent = t; e.className = 'on'; setTimeout(() => e.className = '', 2200); };
const opts = (el, list, sel, none) => el.innerHTML = `<option value="">${none}</option>` + list.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${x.name.replace(/</g, '&lt;')}</option>`).join('');

for (let i = 0; i < 14; i++) { const p = document.createElement('i'); p.style.cssText = `left:${Math.random() * 100}%;animation-duration:${8 + Math.random() * 8}s;animation-delay:-${Math.random() * 10}s`; $('petals').append(p); }

async function init() {
  try { me = await api('/api/me'); } catch { return; }
  $('login').hidden = true; $('servers').hidden = false;
  $('who').innerHTML = `<img src="https://cdn.discordapp.com/avatars/${me.user.id}/${me.user.avatar}.png?size=64" alt=""><span>${me.user.username}</span><a href="/logout">Logout</a>`;
  $('list').innerHTML = me.guilds.map(g => `<div class="srv" tabindex="0" onclick="pick('${g.id}',${g.hasBot})">
    ${g.icon ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128" alt="">` : `<i>${g.name[0]}</i>`}<b>${g.name.replace(/</g, '&lt;')}</b><span>${g.hasBot ? 'Manage' : 'Invite Nayupi'}</span></div>`).join('') || '<p>Ma3ndk ta server b permission Manage Server.</p>';
}
function pick(id, hasBot) {
  if (!hasBot) return open(`https://discord.com/oauth2/authorize?client_id=${me.botId}&scope=bot%20applications.commands&permissions=1099511627775&guild_id=${id}`);
  load(id);
}
async function load(id) {
  gid = id; const d = await api('/api/guild/' + id);
  $('servers').hidden = true; $('panel').hidden = false;
  $('gname').textContent = d.name; $('sm').textContent = d.members; $('sb').textContent = d.boosts || 0;
  const s = d.settings;
  opts($('wc'), d.channels, s.welcomeChannel, '— off —'); opts($('lc'), d.channels, s.logChannel, '— off —');
  opts($('ar'), d.roles, s.autoRole, '— none —'); opts($('ac'), d.channels, '', 'Choose channel');
  $('wm').value = s.welcomeMsg;
}
const back = () => { $('panel').hidden = true; $('servers').hidden = false; };
async function saveSet(e) {
  e.preventDefault();
  try { await api(`/api/guild/${gid}/settings`, { welcomeChannel: $('wc').value, welcomeMsg: $('wm').value, autoRole: $('ar').value, logChannel: $('lc').value }); toast('Saved ✨'); } catch { toast('Error'); }
}
async function announce(e) {
  e.preventDefault();
  try { await api(`/api/guild/${gid}/announce`, { channel: $('ac').value, title: $('at').value, text: $('ax').value }); toast('Sent 📢'); $('ax').value = ''; } catch { toast('Choose channel + text'); }
}
async function mod(action) {
  if (!confirm(`${action} ${$('mu').value}?`)) return;
  try { await api(`/api/guild/${gid}/mod`, { action, userId: $('mu').value.trim() }); toast(action + ' done'); } catch { toast('Failed'); }
}
init();
