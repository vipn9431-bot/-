const { 
  Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, 
  ButtonStyle, ChannelType, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, Collection 
} = require('discord.js');
const { token, prefix, welcomeChannelId, logChannelId, applyChannelId, ticketCategoryId, supportRoleId } = require('./tokens.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// ذاكرة مؤقتة لنظام المستويات (يفضل لاحقاً ربطها بقاعدة بيانات)
const xpSystem = new Collection();

client.once('ready', () => {
  console.log(`✅ تم تشغيل البوت الشامل: ${client.user.tag}`);
  client.user.setActivity('إدارة السيرفر بالكامل 🚀', { type: 3 });
});

// ==========================================
// 1. بوت الترحيب (Welcome Bot)
// ==========================================
client.on('guildMemberAdd', async (member) => {
  const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
  if (!welcomeChannel) return;

  const welcomeEmbed = new EmbedBuilder()
    .setColor('#ffcc00')
    .setTitle('👋 أهلاً بك في السيرفر!')
    .setDescription(`نورتنا يا <@${member.id}>، أنت العضو رقم **${member.guild.memberCount}**`)
    .setThumbnail(member.user.displayAvatarURL());
  
  welcomeChannel.send({ embeds: [welcomeEmbed] });
});

// ==========================================
// 5. بوت السجلات (Logs Bot) - الرسائل المحذوفة
// ==========================================
client.on('messageDelete', async (message) => {
  if (message.author?.bot) return;
  const logChannel = message.guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const logEmbed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('🗑️ رسالة محذوفة')
    .addFields(
      { name: 'المرسل', value: `<@${message.author.id}>`, inline: true },
      { name: 'الروم', value: `<#${message.channel.id}>`, inline: true },
      { name: 'المحتوى', value: message.content || 'فارغ/صورة' }
    )
    .setTimestamp();
  
  logChannel.send({ embeds: [logEmbed] });
});

// ==========================================
// التفاعل مع الرسائل (الأوامر + الحماية + المستويات)
// ==========================================
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // 2. بوت الحماية (Protection Bot) - منع الروابط
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  if (linkRegex.test(message.content) && !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    await message.delete().catch(() => {});
    return message.channel.send(`🛡️ <@${message.author.id}>، يُمنع إرسال الروابط في هذا السيرفر!`).then(m => setTimeout(() => m.delete(), 3000));
  }

  // 4. بوت المستويات (Levels Bot) - إضافة XP
  const currentXp = xpSystem.get(message.author.id) || { xp: 0, level: 1 };
  currentXp.xp += Math.floor(Math.random() * 10) + 5; // يعطي من 5 إلى 15 نقطة
  if (currentXp.xp >= currentXp.level * 100) {
    currentXp.level += 1;
    message.channel.send(`🎉 مبروك <@${message.author.id}>! وصلت للمستوى **${currentXp.level}**!`);
  }
  xpSystem.set(message.author.id, currentXp);

  // === التعامل مع الأوامر ===
  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // 3. بوت التذاكر - أمر اللوحة
  if (command === 'setup-ticket') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const ticketEmbed = new EmbedBuilder().setTitle('📩 الدعم الفني').setDescription('اضغط على الزر لفتح تذكرة.').setColor('#00ffcc');
    const ticketBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('open_ticket').setLabel('فتح تذكرة').setStyle(ButtonStyle.Primary));
    await message.channel.send({ embeds: [ticketEmbed], components: [ticketBtn] });
  }

  // 6. بوت الاستمارات - أمر إرسال لوحة التقديم للكلان
  if (command === 'setup-apply') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const applyEmbed = new EmbedBuilder().setTitle('📋 التقديم لكلان الرشايدة').setDescription('اضغط على الزر لتعبئة استمارة الانضمام للفريق.').setColor('#ff3366');
    const applyBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('apply_form_btn').setLabel('تقديم طلب').setStyle(ButtonStyle.Success));
    await message.channel.send({ embeds: [applyEmbed], components: [applyBtn] });
  }

  // 7. بوت الألعاب - رمي عملة (حجر ورقة مقص أو قرعة)
  if (command === 'coinflip') {
    const result = Math.random() < 0.5 ? 'شعار 👑' : 'كتابة 📝';
    message.reply(`🪙 نتيجة القرعة: **${result}**`);
  }

  // 8. بوت الإعلانات (Announcements Bot)
  if (command === 'announce') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const announcement = args.join(' ');
    if (!announcement) return message.reply('❌ اكتب الإعلان بعد الأمر.');
    const announceEmbed = new EmbedBuilder().setTitle('📢 إعلان إداري').setDescription(announcement).setColor('#ff4444').setFooter({ text: `بواسطة: ${message.author.username}` });
    message.channel.send({ embeds: [announceEmbed] });
    message.delete();
  }

  // 9. بوت التصويت (Voting Bot)
  if (command === 'poll') {
    const pollQuestion = args.join(' ');
    if (!pollQuestion) return message.reply('❌ اكتب سؤال التصويت.');
    const pollEmbed = new EmbedBuilder().setTitle('📊 تصويت جديد').setDescription(`**${pollQuestion}**`).setColor('#33ccff');
    const pollMsg = await message.channel.send({ embeds: [pollEmbed] });
    await pollMsg.react('👍');
    await pollMsg.react('👎');
    message.delete();
  }

  // أمر فحص المستوى (تابع لبوت المستويات)
  if (command === 'rank') {
    const userXp = xpSystem.get(message.author.id) || { xp: 0, level: 1 };
    message.reply(`🏆 مستواك: **${userXp.level}** | النقاط: **${userXp.xp} XP**`);
  }
});

// ==========================================
// التفاعل مع الأزرار والنماذج (Tickets & Forms)
// ==========================================
client.on('interactionCreate', async (interaction) => {
  // 6. بوت الاستمارات - فتح النموذج
  if (interaction.isButton() && interaction.customId === 'apply_form_btn') {
    const modal = new ModalBuilder().setCustomId('clan_application').setTitle('استمارة الانضمام');
    
    const ageInput = new TextInputBuilder().setCustomId('age').setLabel('كم عمرك؟').setStyle(TextInputStyle.Short).setRequired(true);
    const reasonInput = new TextInputBuilder().setCustomId('reason').setLabel('لماذا تريد الانضمام للكلان؟').setStyle(TextInputStyle.Paragraph).setRequired(true);
    
    modal.addComponents(new ActionRowBuilder().addComponents(ageInput), new ActionRowBuilder().addComponents(reasonInput));
    await interaction.showModal(modal);
  }

  // 6. بوت الاستمارات - استلام الطلب
  if (interaction.isModalSubmit() && interaction.customId === 'clan_application') {
    const age = interaction.fields.getTextInputValue('age');
    const reason = interaction.fields.getTextInputValue('reason');
    
    const applyChannel = interaction.guild.channels.cache.get(applyChannelId);
    if (applyChannel) {
      const formEmbed = new EmbedBuilder().setTitle('📝 طلب انضمام جديد').addFields({ name: 'مقدم الطلب', value: `<@${interaction.user.id}>` }, { name: 'العمر', value: age }, { name: 'السبب', value: reason }).setColor('#9900ff');
      applyChannel.send({ embeds: [formEmbed] });
    }
    await interaction.reply({ content: '✅ تم إرسال طلبك للإدارة بنجاح.', ephemeral: true });
  }

  // 3. بوت التذاكر - فتح التذكرة
  if (interaction.isButton() && interaction.customId === 'open_ticket') {
    const ticketChannel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: ticketCategoryId,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: supportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ],
    });
    const actionRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق 🔒').setStyle(ButtonStyle.Danger));
    await ticketChannel.send({ content: `أهلاً بك <@${interaction.user.id}>`, components: [actionRow] });
    await interaction.reply({ content: `✅ تم فتح التذكرة: <#${ticketChannel.id}>`, ephemeral: true });
  }

  // 3. بوت التذاكر - إغلاق التذكرة
  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    await interaction.reply('🔒 جاري إغلاق التذكرة...');
    setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
  }
});

client.login(token);

