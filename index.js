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
  console.log(`Connecté en tant que ${client.user.tag}`);
  client.user.setPresence({
    activities: [{
      name: 'Ticket KMS-SHOP',
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/SupremeB0ts'
    }],
    status: 'online'
  });
});

client.on('ready', async () => {
  const channel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);
  if (!channel) return console.error("Salon introuvable pour les boutons tickets.");

  const embed = new EmbedBuilder()
    .setTitle(' Kms • Support ')
    .setDescription(
      `🇫🇷\nTicket abusif ou troll = **ban**\nÉvitez de mentionner le responsable inutilement\nS’il ne répond pas, il n’est pas disponible\nMerci de votre compréhension.\n\n` +
      `🇬🇧\nAbusive or trolling ticket = **ban**\nAvoid mentioning the manager unnecessarily\nIf they don’t respond, they’re not available\nThank you for your understanding.\n\n-# Kms Ticket`
    )
    .setColor('#eb37f1')
    .setThumbnail('https://cdn.discordapp.com/attachments/1375912569193234643/1378470888986378311/pp.png?ex=683cb88e&is=683b670e&hm=d5e6fde90f288db55de0255f4715994052fcfc0c9e37f46404741c7ec4916d66&');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('partenariat')
      .setLabel('Partenariat')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('achat')
      .setLabel('Achat')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('question')
      .setLabel('Question')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

// CRÉATION DES TICKETS
client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    let type = interaction.customId;
    let ticketName = `${type}-${interaction.user.username}`;
    let rolePing = [];

    if (type === 'achat') {
      rolePing = ['1375220253553987767'];
    } else if (type === 'partenariat') {
      rolePing = ['1375220253553987767', '1375220255080714330'];
    }

    if (type === 'achat' || type === 'partenariat') {
      const ticketChannel = await interaction.guild.channels.create({
        name: ticketName.toLowerCase(),
        type: 0,
        parent: process.env.TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          ...rolePing.map(id => ({
            id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          }))
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket ouvert')
        .setDescription(`Merci ${interaction.user}, explique ta demande ci-dessous.`)
        .setColor('#eb37f1');

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Fermer le ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ content: rolePing.map(r => `<@&${r}>`).join(' '), embeds: [embed], components: [closeButton] });

      await interaction.reply({
        content: `🎫 Ton ticket a été créé ici : <#${ticketChannel.id}>`,
        ephemeral: true
      });
    }

    if (type === 'question') {
      const modal = new ModalBuilder()
        .setCustomId('question_modal')
        .setTitle('Pose ta question');

      const questionInput = new TextInputBuilder()
        .setCustomId('question_text')
        .setLabel("Quelle est ta question ?")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(questionInput);
      modal.addComponents(row);
      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'question_modal') {
    const userQuestion = interaction.fields.getTextInputValue('question_text');

    const ticketChannel = await interaction.guild.channels.create({
      name: `question-${interaction.user.username}`,
      type: 0,
      parent: process.env.TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        {
          id: '1375220255080714330',
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('❓ Question posée')
      .setDescription(`> ${userQuestion}`)
      .setColor('#eb37f1');

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: '<@&1375220255080714330>',
      embeds: [embed],
      components: [closeButton]
    });

    await interaction.reply({
      content: `❓ Ta question a été envoyée ici : <#${ticketChannel.id}>`,
      ephemeral: true
    });
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    const channel = interaction.channel;
    const messages = await channel.messages.fetch({ limit: 100 });
    const content = messages
      .map(m => `${m.author.tag}: ${m.content}`)
      .reverse()
      .join('\n');

    const transcriptPath = path.join(__dirname, `transcript-${channel.id}.txt`);
    fs.writeFileSync(transcriptPath, content);

    const uniqueUsers = [...new Set(messages.map(m => m.author.tag))];

    const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle('📁 Ticket fermé')
      .setColor('#2f3136')
      .addFields(
        { name: '👤 Ouvert par', value: `${channel.name.split('-')[1]}`, inline: true },
        { name: '❌ Fermé par', value: `${interaction.user.tag}`, inline: true },
        { name: '🕒 Fermeture', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        { name: '🧾 Utilisateurs ayant parlé', value: uniqueUsers.join(', ') || 'Aucun' }
      );

    await logChannel.send({
      embeds: [embed],
      files: [transcriptPath]
    });

    fs.unlinkSync(transcriptPath); // supprime le fichier local
    await channel.delete();
  }
});

client.login(process.env.TOKEN);
