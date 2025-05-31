require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials, EmbedBuilder,
  PermissionsBitField, ButtonBuilder, ActionRowBuilder,
  ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ActivityType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  client.user.setPresence({
    activities: [{
      name: 'Ticket KMS-SHOP',
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/SupremeB0ts'
    }],
    status: 'online'
  });

  sendTicketPanel();
});

async function sendTicketPanel() {
  const channel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);
  if (!channel) return console.log("Salon d'accueil non trouvé.");

  const embed = new EmbedBuilder()
    .setTitle('Kms・Support')
    .setColor('#eb37f1')
    .setDescription('` 🇫🇷 ` Choisissez une __catégorie__ ci-dessous pour __ouvrir__ un ticket.\n` 🇬🇧 ` Choose a __category__ below to __open__ a ticket.\n\n***__Règles :__***\n`-` **__Pas de spam__**\n **__Restez respectueux__**\n`-` Les tickets abusifs seront **__sanctionnés__**\n -# __Kms Ticket__');
    
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_achat')
      .setLabel('Achat')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_partenariat')
      .setLabel('Partenariat')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_question')
      .setLabel('Question')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [buttons] });
}

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const { customId, user, guild } = interaction;

    if (customId === 'ticket_question') {
      const modal = new ModalBuilder()
        .setTitle('Poser une question')
        .setCustomId('modal_question')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('question_input')
              .setLabel('Ta question')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    const type = customId.split('_')[1]; // achat / partenariat
    const channelName = `${type}-${user.username}`;
    const categoryId = process.env.TICKET_CATEGORY_ID;

    const existing = guild.channels.cache.find(c => c.name === channelName);
    if (existing) return interaction.reply({ content: `Tu as déjà un ticket ouvert : <#${existing.id}>`, ephemeral: true });

    const channel = await guild.channels.create({
      name: channelName,
      parent: categoryId,
      type: 0,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: '1375220253553987767', allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: '1375220255080714330', allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(`📩 Ticket ${type}`)
      .setDescription(`Bonjour ${user}, merci de nous avoir contactés.\nExplique ta demande ci-dessous.`)
      .setColor('#eb37f1');

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content:
        type === 'achat'
          ? `<@&1375220253553987767>`
          : type === 'partenariat'
          ? `<@&1375220253553987767> <@&1375220255080714330>`
          : '',
      embeds: [embed],
      components: [closeBtn]
    });

    await interaction.reply({ content: `🎫 Ticket créé ici : <#${channel.id}>`, ephemeral: true });
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_question') {
    const question = interaction.fields.getTextInputValue('question_input');

    const channel = await interaction.guild.channels.create({
      name: `question-${interaction.user.username}`,
      parent: process.env.TICKET_CATEGORY_ID,
      type: 0,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: '1375220255080714330', allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('❓ Nouvelle question')
      .setDescription(`**Question posée :**\n${question}`)
      .setColor('#eb37f1');

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@&1375220255080714330>`,
      embeds: [embed],
      components: [closeBtn]
    });

    await interaction.reply({ content: `🎫 Question envoyée ici : <#${channel.id}>`, ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    const confirmEmbed = new EmbedBuilder()
      .setColor('#eb37f1')
      .setDescription('✅ Le ticket sera fermé dans **5 secondes**...');

    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

    setTimeout(async () => {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const transcript = messages
        .reverse()
        .map(m => `${m.author.tag} : ${m.content}`)
        .join('\n');

      const transcriptPath = path.join(__dirname, `transcript-${interaction.channel.id}.txt`);
      fs.writeFileSync(transcriptPath, transcript);

      const users = [...new Set(messages.map(m => m.author.tag))];

      const logEmbed = new EmbedBuilder()
        .setTitle('Ticket fermé')
        .addFields(
          { name: '📂 Salon', value: interaction.channel.name, inline: true },
          { name: '👤 Ouvert par', value: `<@${interaction.channel.topic}>`, inline: true },
          { name: '🛠️ Fermé par', value: `<@${interaction.user.id}>`, inline: true },
          { name: '👥 Utilisateurs ayant parlé', value: users.join(', ').slice(0, 1024) }
        )
        .setFooter({ text: `Fermé le ${new Date().toLocaleString()}` })
        .setColor('#eb37f1');

      const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
      if (logChannel) {
        await logChannel.send({
          embeds: [logEmbed],
          files: [transcriptPath]
        });
      }

      await interaction.channel.delete().catch(() => {});
      fs.unlinkSync(transcriptPath);
    }, 5000);
  }
});

client.login(process.env.TOKEN);
