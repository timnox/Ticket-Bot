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
    // Vérifie s’il existe déjà un ticket
    const existing = interaction.guild.channels.cache.find(
      c => c.name === `ticket-${interaction.user.username.toLowerCase()}`
    );
    if (existing) {
      return interaction.reply({
        content: `❗ Tu as déjà un ticket ouvert : <#${existing.id}>`,
        ephemeral: true
      });
    }

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

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await channel.send({ embeds: [embed], components: [closeButton] });
    await msg.pin();

    await channel.send({ content: `<@&1375220253553987767> <@&1375220255080714330> <@&1375220249124798485>` });

    await interaction.reply({
      content: `🎫 Ton ticket a été créé ici : <#${channel.id}>`,
      ephemeral: true
    });
  }

  // Étape 1 : demande confirmation
  if (interaction.customId === 'close_ticket') {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_close')
        .setLabel('✅ Confirmer')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel_close')
        .setLabel('❌ Annuler')
        .setStyle(ButtonStyle.Secondary)
    );

    const confirmEmbed = new EmbedBuilder()
      .setColor('#eb37f1')
      .setTitle('❗ Confirmation')
      .setDescription('Es-tu sûr de vouloir fermer ce ticket ?');

    await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow], ephemeral: true });
  }

  // Étape 2 : fermeture confirmée
  if (interaction.customId === 'confirm_close') {
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor('#eb37f1')
          .setDescription('🔒 **Ce ticket sera fermé dans 5 secondes...**')
      ],
      components: []
    });

    const channel = interaction.channel;

    const messages = await channel.messages.fetch({ limit: 100 });
    const transcript = messages
      .reverse()
      .map(m => `${m.author.tag}: ${m.content}`)
      .join('\n');

    const filePath = path.join(__dirname, `transcript-${channel.id}.txt`);
    fs.writeFileSync(filePath, transcript);

    const logChannel = await client.channels.fetch(process.env.TICKET_LOG_CHANNEL_ID);
    const creator = channel.permissionOverwrites.cache.find(perm => perm.allow.has(PermissionsBitField.Flags.SendMessages) && perm.type === 1);

    const logEmbed = new EmbedBuilder()
      .setColor('#eb37f1')
      .setTitle('📁 Ticket fermé')
      .addFields(
        { name: '📌 Salon', value: `#${channel.name}`, inline: true },
        { name: '👤 Créé par', value: `<@${creator?.id || 'inconnu'}>`, inline: true },
        { name: '❌ Fermé par', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp();

    await logChannel.send({
      embeds: [logEmbed],
      files: [filePath]
    });

    setTimeout(() => {
      fs.unlinkSync(filePath);
      channel.delete().catch(console.error);
    }, 5000);
  }

  if (interaction.customId === 'cancel_close') {
    await interaction.update({
      content: '❌ Fermeture annulée.',
      components: [],
      embeds: [],
      ephemeral: true
    });
  }
});

client.on('ready', async () => {
  const channel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle('Contacter le support')
    .setDescription('Pour contacter le support de **Kms Shop**, clique sur le bouton __ci-dessous__.\n\n**Rappels :**\n- **__Sois courtois__**\n- **__Sois patient__**\n- **__Ne ping pas le staff__**\n\n-# **Note:** __***Nous n’acceptons pas les publicités & partenariat.***__')
    .setColor('#eb37f1');

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel('Créer un ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [button] });
});

client.login(process.env.TOKEN);
