
require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionsBitField,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActivityType
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
});

// Handle ticket creation buttons
client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const user = interaction.user;
    let channelName = '';
    let pingRoles = [];

    if (interaction.customId === 'achat') {
      channelName = `achat-${user.username}`;
      pingRoles = ['1375220253553987767'];
    } else if (interaction.customId === 'partenariat') {
      channelName = `partenariat-${user.username}`;
      pingRoles = ['1375220253553987767', '1375220255080714330'];
    }

    if (channelName) {
      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: 0,
        parent: process.env.TICKET_CATEGORY_ID,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
          ...pingRoles.map(roleId => ({
            id: roleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          }))
        ],
      });

      const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket créé')
        .setDescription(`Merci ${user} d'avoir contacté **Kms Shop**.\nExplique ta demande ci-dessous.`)
        .setColor('#eb37f1');

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Fermer le ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ content: pingRoles.map(r => `<@&${r}>`).join(' '), embeds: [embed], components: [button] });
      await interaction.reply({ content: `🎫 Ton ticket a été créé ici : <#${ticketChannel.id}>`, ephemeral: true });
    }

    if (interaction.customId === 'question') {
      const modal = new ModalBuilder()
        .setCustomId('modal_question')
        .setTitle('Poser une question');

      const input = new TextInputBuilder()
        .setCustomId('question_content')
        .setLabel('Quelle est votre question ?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'close_ticket') {
      await interaction.deferUpdate();

      const channel = interaction.channel;
      const messages = await channel.messages.fetch({ limit: 100 });
      const transcript = messages
        .map(m => `${m.author.tag}: ${m.content}`)
        .reverse()
        .join('\n');

      const transcriptPath = path.join(__dirname, `transcript-${channel.id}.txt`);
      fs.writeFileSync(transcriptPath, transcript);

      const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID);
      const uniqueUsers = [...new Set(messages.map(m => m.author.tag))];

      const logEmbed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle('Ticket fermé')
        .addFields(
          { name: 'Salon', value: channel.name, inline: true },
          { name: 'Fermé par', value: interaction.user.tag, inline: true },
          { name: 'Heure de fermeture', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
          { name: 'Utilisateurs ayant parlé', value: uniqueUsers.join(', ') || 'Aucun' }
        );

      await logChannel.send({ embeds: [logEmbed], files: [transcriptPath] });
      fs.unlinkSync(transcriptPath);

      const confirmEmbed = new EmbedBuilder()
        .setColor('#2f3136')
        .setDescription('Le ticket sera fermé dans **5 secondes**...');
      await channel.send({ embeds: [confirmEmbed] });

      setTimeout(async () => {
        if (channel && channel.deletable) await channel.delete().catch(console.error);
      }, 5000);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_question') {
    const content = interaction.fields.getTextInputValue('question_content');
    const user = interaction.user;

    const ticketChannel = await interaction.guild.channels.create({
      name: `question-${user.username}`,
      type: 0,
      parent: process.env.TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: '1375220255080714330',
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        }
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle('❓ Nouvelle question reçue')
      .addFields(
        { name: 'Auteur', value: `${user.tag}`, inline: true },
        { name: 'Contenu de la question', value: content }
      )
      .setColor('#eb37f1');

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `<@&1375220255080714330>`, embeds: [embed], components: [button] });
    await interaction.reply({ content: `✅ Votre question a été envoyée ici : <#${ticketChannel.id}>`, ephemeral: true });
  }
});

client.on('ready', async () => {
  const channel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle('Support・Kms')
    .setDescription(`🇫🇷\nTicket abusif ou troll = **ban**\n*Évitez de mentionner le responsable inutilement*\n*S’il ne répond pas, il n’est pas disponible*\nMerci de votre compréhension.\n\n` +
  `🇬🇧\nAbusive or trolling ticket = **ban**\n*Avoid mentioning the manager unnecessarily*\n*If they don’t respond, they’re not available*\nThank you for your understanding.\n\n-# Équipe Kms-Shop.`)

    .setColor('#eb37f1');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('achat')
      .setLabel(' Achat')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('partenariat')
      .setLabel(' Partenariat')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('question')
      .setLabel(' Question')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

client.login(process.env.TOKEN);
