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
  ActivityType,
  ChannelType
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

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_ticket') {
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: process.env.TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: '1375220253553987767',
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: '1375220255080714330',
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
        {
          id: '1375220249124798485',
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket créé')
      .setDescription(`Merci ${interaction.user} d'avoir contacté **Kms Shop**.\n__Explique ta demande ci-dessous.__`)
      .setColor('#eb37f1');

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const ticketMessage = await channel.send({ embeds: [embed], components: [closeBtn] });
    await ticketMessage.pin();

    await channel.send({
      content: `<@&1375220253553987767> <@&1375220255080714330> <@&1375220249124798485>`
    });

    await interaction.reply({
      content: `🎫 Ton ticket a été créé ici : <#${channel.id}>`,
      ephemeral: true
    });
  }

  if (interaction.customId === 'close_ticket') {
    const confirmEmbed = new EmbedBuilder()
      .setColor('#eb37f1')
      .setTitle('⚠️ Confirmation')
      .setDescription('Es-tu sûr de vouloir fermer ce ticket ?');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_close')
        .setLabel('Oui, fermer')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('cancel_close')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
  }

  if (interaction.customId === 'cancel_close') {
    await interaction.update({
      content: '❌ Fermeture annulée.',
      embeds: [],
      components: [],
    });
  }

  if (interaction.customId === 'confirm_close') {
    const channel = interaction.channel;

    // Transcript
    const messages = await channel.messages.fetch({ limit: 100 });
    const content = messages
      .reverse()
      .map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`)
      .join('\n');

    const transcriptPath = `./transcripts/transcript-${channel.id}.txt`;
    fs.mkdirSync('./transcripts', { recursive: true });
    fs.writeFileSync(transcriptPath, content);

    // Annonce de fermeture
    const closingEmbed = new EmbedBuilder()
      .setColor('#eb37f1')
      .setTitle('Fermeture du ticket')
      .setDescription('Ce ticket sera fermé dans **5 secondes**...');

    await interaction.update({ embeds: [closingEmbed], components: [] });

    // Log + fichier dans salon
    const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
    const logEmbed = new EmbedBuilder()
      .setColor('#eb37f1')
      .setTitle('📁 Ticket fermé')
      .addFields(
        { name: 'Nom du salon', value: channel.name, inline: true },
        { name: 'Fermé par', value: interaction.user.tag, inline: true }
      )
      .setTimestamp();

    await logChannel.send({
      embeds: [logEmbed],
      files: [transcriptPath]
    });

    // Supprimer après 5s
    setTimeout(() => {
      channel.delete().catch(console.error);
      fs.unlinkSync(transcriptPath); // Nettoyage du fichier
    }, 5000);
  }
});

client.login(process.env.TOKEN);
