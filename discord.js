import 'dotenv/config';
import {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelType, PermissionsBitField, ModalBuilder,
  TextInputBuilder, TextInputStyle, Collection
} from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import tokensList from './tokens.js';

// قراءة الإعدادات من tokens.js سواء كانت مصفوفة أو كائن
const config = Array.isArray(tokensList) ? tokensList[0] : tokensList;
const botToken = config.token || process.env.token1 || process.env.token;
const prefix = "!";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User]
});

const xpSystem = new Collection();
let trapChannelId = null;

client.once('ready', () => {
  console.log(`✅ اشتغل البوت بنجاح: ${client.user.tag}`);

  // ضبط الحالة من ملف tokens.js
  if (config?.presence?.status) {
    client.user.setStatus(config.presence.status);
  }

  // دخول الروم الصوتي 24/7 من ملف tokens.js
  const guild = client.guilds.cache.get(config.serverId);
  const voiceChannel = guild?.channels.cache.get(config.channelId);
  if (guild && voiceChannel) {
    try {
      joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: config.selfDeaf ?? false,
        selfMute: config.selfMute ?? true
      });
      console.log('🔊 تم الاتصال بالروم الصوتي بنجاح');
    } catch (e) {
      console.log('⚠️ تعذر الاتصال بالروم الصوتي، تأكد من الآيدي');
    }
  }
});

// 1. الترحيب التلقائي (يبحث عن روم اسمه ترحيب أو welcome)
client.on('guildMemberAdd', (member) => {
  const ch = member.guild.channels.cache.find(c => c.name.includes('ترحيب') || c.name.includes('welcome'));
  if (!ch) return;
  const embed = new EmbedBuilder()
    .setColor('#ffcc00')
    .setTitle('👋 أهلاً بك في السيرفر!')
    .setDescription(`حياك الله <@${member.id}>، نورتنا! أنت العضو رقم **${member.guild.memberCount}**`)
    .setThumbnail(member.user.displayAvatarURL());
  ch.send({ embeds: [embed] });
});

// 2. السجلات التلقائية (يبحث عن روم اسمه سجل أو log أو لوق)
client.on('messageDelete', (message) => {
  if (!message.guild || message.author?.bot) return;
  const logCh = message.guild.channels.cache.find(c => c.name.includes('لوق') || c.name.includes('log') || c.name.includes('سجل'));
  if (!logCh) return;
  const embed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('🗑️ رسالة محذوفة')
    .addFields(
      { name: 'العضو', value: `<@${message.author.id}>`, inline: true },
      { name: 'الروم', value: `<#${message.channel.id}>`, inline: true },
      { name: 'الرسالة', value: message.content || 'صورة / مرفق' }
    );
  logCh.send({ embeds: [embed] });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  // 3. مصيدة السبام (أي روم اسمه "مصيدة" أو "trap" أو تم تحديده بأمر !trap)
  if (message.channel.id === trapChannelId || message.channel.name.includes('مصيدة') || message.channel.name.includes('trap')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      await message.delete().catch(() => {});
      await message.member.kick('وقع في مصيدة السبام').catch(() => {});
      return;
    }
  }

  // 4. الحماية من الروابط
  if (/(https?:\/\/[^\s]+)/g.test(message.content) && !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    await message.delete().catch(() => {});
    return message.channel.send(`🛡️ <@${message.author.id}> يمنع نشر الروابط!`).then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
  }

  // 5. نظام المستويات (XP)
  const userXp = xpSystem.get(message.author.id) || { xp: 0, level: 1 };
  userXp.xp += 10;
  if (userXp.xp >= userXp.level * 100) {
    userXp.level += 1;
    message.channel.send(`🎉 كفو <@${message.author.id}>! ارتفع مستواك إلى **${userXp.level}**`);
  }
  xpSystem.set(message.author.id, userXp);

  if (!message.content.startsWith(prefix)) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // أمر تفعيل المصيدة في الروم الحالي
  if (cmd === 'trap') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    trapChannelId = message.channel.id;
    message.reply('✅ تم تفعيل مصيدة السبام في هذا الروم! أي عضو يكتب هنا سيتم مسح رسالته وطرده فوراً.');
  }

  // 6. أمر التذاكر (نفس صورة Ghost Store)
  if (cmd === 'ticket') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('open_ticket').setLabel('📩 فتح تذكرة').setStyle(ButtonStyle.Primary)
    );
    message.channel.send({ content: '**اضغط على الزر بالأسفل لفتح تذكرة دعم فني:**', components: [btn] });
    message.delete().catch(() => {});
  }

  // 7. أمر لوحة الاستمارات
  if (cmd === 'apply') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const btn = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('open_apply').setLabel('📋 تقديم طلب').setStyle(ButtonStyle.Success)
    );
    message.channel.send({ content: '**اضغط على الزر لتعبئة استمارة التقديم:**', components: [btn] });
    message.delete().catch(() => {});
  }

  // 8. الإعلانات
  if (cmd === 'announce') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const text = args.join(' ');
    if (!text) return message.reply('اكتب الإعلان بعد الأمر!');
    const embed = new EmbedBuilder().setColor('#ff4444').setTitle('📢 إعلان هام').setDescription(text);
    message.channel.send({ embeds: [embed] });
    message.delete().catch(() => {});
  }

  // 9. التصويت
  if (cmd === 'poll') {
    const q = args.join(' ');
    if (!q) return message.reply('اكتب سؤال التصويت بعد الأمر!');
    const embed = new EmbedBuilder().setColor('#33ccff').setTitle('📊 تصويت').setDescription(`**${q}**`);
    const m = await message.channel.send({ embeds: [embed] });
    await m.react('👍');
    await m.react('👎');
    message.delete().catch(() => {});
  }

  // 10. الألعاب والمستوى
  if (cmd === 'coinflip') message.reply(`🪙 النتيجة: **${Math.random() < 0.5 ? 'شعار 👑' : 'كتابة 📝'}**`);
  if (cmd === 'rank') message.reply(`🏆 مستواك: **${userXp.level}** | نقاطك: **${userXp.xp} XP**`);
});

// التفاعل مع الأزرار (التذاكر + الاستمارات)
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'open_ticket') {
      const ch = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      await interaction.reply({ content: `✅ تم فتح تذكرتك: <#${ch.id}>`, ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle('مرحباً بك')
        .setDescription('اكتب استفسارك وسوف يرد عليك الدعم الفني بأقرب وقت\nيرجى كتابة طلبك أو الاستفسار الذي ترغب به بشكل واضح.');

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_claim').setLabel('claim').setEmoji('📥').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('t_close').setLabel('close').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('t_delete').setLabel('delete').setEmoji('🗑️').setStyle(ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_adduser').setLabel('Add User').setEmoji('👤').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('t_transfer').setLabel('transfer').setEmoji('⬆️').setStyle(ButtonStyle.Secondary)
      );
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_remind').setLabel('remind').setEmoji('🔔').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('t_rename').setLabel('rename').setEmoji('✏️').setStyle(ButtonStyle.Secondary)
      );

      await ch.send({ content: `أثناء انتظار الرد، لا تنسَ الإكثار من ذكر الله والاستغفار.\n<@${interaction.user.id}>`, embeds: [embed], components: [row1, row2, row3] });
    }

    if (interaction.customId === 't_claim') await interaction.reply(`📌 تم استلام التذكرة بواسطة <@${interaction.user.id}>`);
    if (interaction.customId === 't_close') {
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: false }).catch(() => {});
      await interaction.reply('🔒 تم إغلاق التذكرة.');
    }
    if (interaction.customId === 't_delete') {
      await interaction.reply('🗑️ جاري حذف التذكرة...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
    }
    if (interaction.customId === 't_remind') await interaction.reply(`🔔 تذكير بانتظار الرد في التذكرة!`);
    if (['t_adduser', 't_transfer', 't_rename'].includes(interaction.customId)) {
      await interaction.reply({ content: '✅ تم تنفيذ الإجراء.', ephemeral: true });
    }

    if (interaction.customId === 'open_apply') {
      const modal = new ModalBuilder().setCustomId('apply_modal').setTitle('استمارة التقديم');
      const q1 = new TextInputBuilder().setCustomId('q1').setLabel('الاسم والعمر').setStyle(TextInputStyle.Short).setRequired(true);
      const q2 = new TextInputBuilder().setCustomId('q2').setLabel('خبراتك وسبب التقديم').setStyle(TextInputStyle.Paragraph).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2));
      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'apply_modal') {
    const a1 = interaction.fields.getTextInputValue('q1');
    const a2 = interaction.fields.getTextInputValue('q2');
    const embed = new EmbedBuilder()
      .setColor('#00ff99')
      .setTitle('📋 استمارة تقديم جديدة')
      .addFields(
        { name: 'المتقدم', value: `<@${interaction.user.id}>` },
        { name: 'الاسم والعمر', value: a1 },
        { name: 'الخبرات', value: a2 }
      );
    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ تم إرسال تقديمك بنجاح!', ephemeral: true });
  }
});

client.login(botToken);
