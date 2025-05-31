require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, ButtonBuilder, ActionRowBuilder, ButtonStyle, ActivityType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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
    activities: [{ name: 'Ticket KMS-SHOP', type: ActivityType.Streaming, url: 'https://www.twitch.tv/SupremeB0ts' }],
    status: 'online'
  });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('create_ticket')) {
    let ticketType = interaction.customId.split('_')[2]; 
    let channelName = `ticket-${interaction.user.username}-${ticketType}`;
    
    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: 0, // GUILD_TEXT
      parent: process.env.TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎫 Ticket ${ticketType} créé`)
      .setDescription(`Merci ${interaction.user} d'avoir contacté **Kms Shop**.\nExplique ta demande ci-dessous.`)
      .setColor('#eb37f1');

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket_confirm')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [button] });
    await interaction.reply({ content: `🎫 Ton ticket a été créé ici : <#${channel.id}>`, ephemeral: true });
  }

  if (interaction.customId === 'close_ticket_confirm') {
    const embed = new EmbedBuilder()
      .setTitle('⏳ Confirmation')
      .setDescription('Es-tu sûr de vouloir fermer ce ticket ?')
      .setColor('#eb37f1');

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Oui, fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [button], ephemeral: true });
  }

  if (interaction.customId === 'close_ticket') {
    const logChannel = await interaction.guild.channels.fetch(process.env.LOG_CHANNEL_ID);
    fs.writeFileSync(`transcripts/${interaction.channel.name}.txt`, `Ticket fermé par ${interaction.user.username}`);

    const logEmbed = new EmbedBuilder()
      .setTitle('📜 Ticket fermé')
      .setDescription(`Ticket **${interaction.channel.name}** fermé par ${interaction.user}`)
      .setColor('#eb37f1');

    await logChannel.send({ embeds: [logEmbed] });
    await interaction.channel.delete();
  }

  if (interaction.customId === 'question_form') {
    const modal = new ModalBuilder()
      .setCustomId('question_form_submit')
      .setTitle('Poser une question');

    const questionInput = new TextInputBuilder()
      .setCustomId('question_input')
      .setLabel("Décris ta question")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(questionInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  }
});

client.on('ready', async () => {
  const channel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle('Contacter le support')
    .setDescription('Pour contacter le support de **Kms Shop**, clique sur le bouton __ci-dessous__.\n\n**Rappels :**\n- **__Sois courtois__**\n- **__Sois patient__**\n- **__Ne ping pas le staff__**\n\n-# __***Kms Ticket vous remercie ***__')
    .setColor('#eb37f1');

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket_achat')
      .setLabel('Ticket Achat')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('create_ticket_partenariat')
      .setLabel('Ticket Partenariat')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('question_form')
      .setLabel('Poser une Question')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [buttons] });
});

client.login(process.env.TOKEN);