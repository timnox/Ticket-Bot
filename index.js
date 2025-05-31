require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle, ActivityType } = require('discord.js');
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
      type: 0, // GUILD_TEXT
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
      .setColor('#2f3136');

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const ticketMessage = await channel.send({ embeds: [embed], components: [button] });
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
    await interaction.channel.delete();
  }
});

client.on('ready', async () => {
  const channel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle('Contacter le support')
    .setDescription('Pour contacter le support de **Kms Shop**, clique sur le bouton __ci-dessous__.\n\n**Rappels :**\n- **__Sois courtois__**\n- **__Sois patient__**\n- **__Ne ping pas le staff__**\n\n-# **Note:** __***Nous n’acceptons pas les publicités & partenariat.***__')
    .setColor('#2f3136');

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('Créer un ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [button] });
});

client.login(process.env.TOKEN);
