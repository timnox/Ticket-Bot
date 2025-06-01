require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: 'Ticket KMS-SHOP', type: ActivityType.Streaming, url: 'https://www.twitch.tv/SupremeB0ts' }],
    status: 'online'
  });

  const ticketChannel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);
  if (!ticketChannel) {
    console.error("❌ Erreur : Le salon des tickets (TICKET_CHANNEL_ID) n'existe pas !");
    return;
  }

  console.log(`📩 Envoi du message de création de ticket dans : ${ticketChannel.name}`);

  const embed = new EmbedBuilder()
    .setTitle(' **Support KMS-SHOP**')
    .setDescription('Clique sur le bouton pour ouvrir un ticket.\n-# Kms Ticket vous remercie.')
    .setColor('#eb37f1');

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('create_ticket').setLabel('Ouvrir un ticket').setStyle(ButtonStyle.Primary)
  );

  const sentMessage = await ticketChannel.send({ embeds: [embed], components: [buttons] });
  await sentMessage.pin();
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton() && interaction.customId === 'create_ticket') {
    console.log(`🛠 Création du ticket demandée par ${interaction.user.username}`);

    const channelName = `ticket-${interaction.user.username}`;

    try {
      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: 0,
        parent: process.env.TICKET_CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: '1375220253553987767', allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ],
      });

      const embed = new EmbedBuilder()
        .setTitle(`Ticket créé`)
        .setDescription(`Bonjour ${interaction.user}, explique ici ton problème et un membre du support te répondra dans les plus brefs délais.`)
        .setColor('#eb37f1');

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('❌ Fermer le ticket').setStyle(ButtonStyle.Danger)
      );

      const sentMessage = await channel.send({ content: `<@&1375220253553987767>`, embeds: [embed], components: [button] });
      await sentMessage.pin();

      await interaction.reply({ content: `🎫 Ton ticket a été créé ici : <#${channel.id}>`, ephemeral: true });
    } catch (err) {
      console.error("❌ Erreur lors de la création du ticket :", err);
      await interaction.reply({ content: "❌ Impossible de créer le ticket.", ephemeral: true });
    }
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    console.log(`🔒 Fermeture du ticket demandée : ${interaction.channel.name}`);

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Confirmation')
      .setDescription('Es-tu sûr de vouloir fermer ce ticket ?')
      .setColor('#eb37f1');

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('close_ticket_confirmed').setLabel('✅ Oui, fermer le ticket').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('close_ticket_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embed], components: [buttons], ephemeral: true });
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket_confirmed') {
    console.log(`✅ Ticket fermé : ${interaction.channel.name}`);

    const transcriptDir = path.join(__dirname, 'transcripts');
    const transcriptPath = path.join(transcriptDir, `${interaction.channel.name}.txt`);

    if (!fs.existsSync(transcriptDir)) {
        fs.mkdirSync(transcriptDir);
    }

    if (!fs.existsSync(transcriptPath)) {
        fs.writeFileSync(transcriptPath, `Transcript du ticket ${interaction.channel.name} :\n\n`);
        console.log(`✅ Fichier transcript généré : ${transcriptPath}`);
    }

    await interaction.channel.delete();
  }
});

client.login(process.env.TOKEN);