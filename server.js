const fs = require('fs');
const express = require('express');
const session = require('express-session');
const { Client, GatewayIntentBits, PermissionFlagsBits, ChannelType, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { DISCORD_TOKEN, CLIENT_ID, CLIENT_SECRET, BASE_URL, SESSION_SECRET } = process.env;
const DB = process.env.DATA_PATH || './data.json';
const db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : {};
const save = () => fs.writeFileSync(DB, JSON.stringify(db));
const cfg = id => db[id] || (db[id] = { welcomeChannel: '', welcomeMsg: 'Irhab bik {user} f {server}! 🌸', autoRole: '', logChannel: '' });

const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildModeration] });
const cmds = [
  new SlashCommandBuilder().setName('ping').setDescription('Check Nayupi'),
  new SlashCommandBuilder().setName('kick').setDescription('Kick member').addUserOption(o => o.setName('user').setRequired(true).setDescription('Member')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName('ban').setDescription('Ban member').addUserOption(o => o.setName('user').setRequired(true).setDescription('Member')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
].map(c => c.toJSON());

bot.once('ready', async () => {
  console.log('Nayupi online:', bot.user.tag);
  bot.user.setActivity('your server 🌸');
  await new REST().setToken(DISCORD_TOKEN).put(Routes.applicationCommands(CLIENT_ID), { body: cmds });
});
const log = (g, text) => { const c = g.channels.cache.get(cfg(g.id).logChannel); if (c) c.send({ embeds: [new EmbedBuilder().setColor(0xff7eb6).setDescription(text)] }).catch(() => {}); };
bot.on('guildMemberAdd', async m => {
  const c = cfg(m.guild.id);
  const ch = m.guild.channels.cache.get(c.welcomeChannel);
  if (ch) ch.send(c.welcomeMsg.replace('{user}', `<@${m.id}>`).replace('{server}', m.guild.name)).catch(() => {});
  if (c.autoRole) m.roles.add(c.autoRole).catch(() => {});
  log(m.guild, `🌸 **${m.user.tag}** joined`);
});
bot.on('guildMemberRemove', m => log(m.guild, `👋 **${m.user.tag}** left`));
bot.on('interactionCreate', async i => {
  if (!i.isChatInputCommand()) return;
  if (i.commandName === 'ping') return i.reply(`Pong! ${bot.ws.ping}ms ✨`);
  const u = i.options.getMember('user');
  try { await (i.commandName === 'kick' ? u.kick() : u.ban()); i.reply(`${i.commandName} done: ${u.user.tag}`); log(i.guild, `🔨 ${i.user.tag} used /${i.commandName} on ${u.user.tag}`); }
  catch { i.reply({ content: 'Ma9dertch (permissions/role).', ephemeral: true }); }
});
bot.login(DISCORD_TOKEN);

const app = express();
app.set('trust proxy', 1);
app.use(express.json());
app.use(session({ secret: SESSION_SECRET || 'dev', resave: false, saveUninitialized: false, cookie: { secure: 'auto', maxAge: 6048e5 } }));
app.use(express.static('public'));
const redirect = `${BASE_URL}/callback`;
app.get('/login', (q, r) => r.redirect(`https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&scope=identify%20guilds&redirect_uri=${encodeURIComponent(redirect)}`));
app.get('/callback', async (q, r) => {
  try {
    const t = await (await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code', code: q.query.code, redirect_uri: redirect }) })).json();
    const h = { Authorization: `Bearer ${t.access_token}` };
    q.session.user = await (await fetch('https://discord.com/api/users/@me', { headers: h })).json();
    q.session.guilds = await (await fetch('https://discord.com/api/users/@me/guilds', { headers: h })).json();
  } catch {}
  r.redirect('/');
});
app.get('/logout', (q, r) => q.session.destroy(() => r.redirect('/')));
const auth = (q, r, n) => q.session.user ? n() : r.status(401).json({ error: 'login' });
const manage = (q, r, n) => {
  const g = (q.session.guilds || []).find(x => x.id === q.params.id);
  const ok = g && (BigInt(g.permissions) & (PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator));
  q.guild = bot.guilds.cache.get(q.params.id);
  ok && q.guild ? n() : r.status(403).json({ error: 'forbidden' });
};
app.get('/api/me', auth, (q, r) => r.json({
  user: q.session.user,
  botId: CLIENT_ID,
  guilds: (q.session.guilds || []).filter(g => BigInt(g.permissions) & (PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator))
    .map(g => ({ id: g.id, name: g.name, icon: g.icon, hasBot: bot.guilds.cache.has(g.id) })),
}));
app.get('/api/guild/:id', auth, manage, async (q, r) => {
  const g = q.guild;
  r.json({
    name: g.name, members: g.memberCount, online: g.approximateMemberCount || null, boosts: g.premiumSubscriptionCount,
    channels: g.channels.cache.filter(c => c.type === ChannelType.GuildText).map(c => ({ id: c.id, name: c.name })),
    roles: g.roles.cache.filter(x => !x.managed && x.id !== g.id).map(x => ({ id: x.id, name: x.name })),
    settings: cfg(g.id),
  });
});
app.post('/api/guild/:id/settings', auth, manage, (q, r) => {
  const { welcomeChannel = '', welcomeMsg = '', autoRole = '', logChannel = '' } = q.body;
  Object.assign(cfg(q.guild.id), { welcomeChannel, welcomeMsg: welcomeMsg.slice(0, 500), autoRole, logChannel }); save(); r.json({ ok: true });
});
app.post('/api/guild/:id/announce', auth, manage, async (q, r) => {
  const ch = q.guild.channels.cache.get(q.body.channel);
  if (!ch || !q.body.text) return r.status(400).json({ error: 'bad' });
  await ch.send({ embeds: [new EmbedBuilder().setColor(0xb388ff).setTitle(String(q.body.title || '📢').slice(0, 200)).setDescription(String(q.body.text).slice(0, 3500))] });
  r.json({ ok: true });
});
app.post('/api/guild/:id/mod', auth, manage, async (q, r) => {
  try {
    const m = await q.guild.members.fetch(q.body.userId);
    await (q.body.action === 'ban' ? m.ban({ reason: 'Nayupi dashboard' }) : m.kick('Nayupi dashboard'));
    log(q.guild, `🔨 ${q.session.user.username} ${q.body.action}ed ${m.user.tag} (dashboard)`); r.json({ ok: true });
  } catch { r.status(400).json({ error: 'failed' }); }
});
app.listen(process.env.PORT || 3000, () => console.log('Dashboard up'));
