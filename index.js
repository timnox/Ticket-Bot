require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials,
  EmbedBuilder, PermissionsBitField, ButtonBuilder,
  ActionRowBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle, AttachmentBuilder
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

client.once('ready', async () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
  const channel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle(' Kms • Support ')
    .setDescription(
      `🇫🇷\nTicket abusif ou troll = **ban**\nÉvitez de mentionner le responsable inutilement\nS’il ne répond pas, il n’est pas disponible\nMerci de votre compréhension.\n\n` +
      `🇬🇧\nAbusive or trolling ticket = **ban**\nAvoid mentioning the manager unnecessarily\nIf they don’t respond, they’re not available\nThank you for your understanding.\n\n-m Kms Ticket`
    )
    .setColor('#eb37f1')
    .setThumbnail('https://cdn.discordapp.com/attachments/1375912569193234643/1378470888986378311/pp.png?ex=683cb88e&is=683b670e&hm=d5e6fde90f288db55de0255f4715994052fcfc0c9e37f46404741c7ec4916d66&');

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('partenariat').setLabel('Partenariat').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('achat').setLabel('Achat').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('question').setLabel('Question').setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [buttons] });
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const user = interaction.user;
    let channelName = '';
    let pingRoles = [];
    let isModal = false;

    if (interaction.customId === 'achat') {
      channelName = `achat-${user.username}`;
      pingRoles = ['1375220253553987767'];
    } else if (interaction.customId === 'partenariat') {
      channelName = `partenariat-${user.username}`;
      pingRoles = ['1375220253553987767', '1375220255080714330'];
    } else if (interaction.customId === 'question') {
      isModal = true;
    }

    if (isModal) {
      const modal = new ModalBuilder()
        .setCustomId('questionModal')
        .setTitle('❓ Pose ta question');

      const questionInput = new TextInputBuilder()
        .setCustomId('questionText')
        .setLabel("Explique ta question")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(questionInput));
      return await interaction.showModal(modal);
    }

    // Crée le salon
    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: 0,
      parent: process.env.TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ...pingRoles.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }))
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket ouvert')
      .setDescription(`Merci ${user} d’avoir contacté le support.\nExplique ta demande ci-dessous.`)
      .setColor('#eb37f1');

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await ticketChannel.send({
      content: pingRoles.map(r => `<@&${r}>`).join(' '),
      embeds: [embed],
      components: [closeButton]
    });

    await message.pin();

    await interaction.reply({ content: `✅ Ton ticket est créé ici : <#${ticketChannel.id}>`, ephemeral: true });

    ticketChannel.setTopic(`Ouvert par ${user.tag} (${user.id})`);
    ticketChannel.createdBy = user.id;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'questionModal') {
    const user = interaction.user;
    const content = interaction.fields.getTextInputValue('questionText');
    const channelName = `question-${user.username}`;
    const pingRoles = ['1375220255080714330'];

    const ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: 0,
      parent: process.env.TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ...pingRoles.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }))
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('❓ Question reçue')
      .setDescription(`Merci ${user} ! Voici ta question :\n> ${content}`)
      .setColor('#eb37f1');

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const message = await ticketChannel.send({
      content: pingRoles.map(r => `<@&${r}>`).join(' '),
      embeds: [embed],
      components: [closeButton]
    });

    await message.pin();

    await interaction.reply({ content: `✅ Ta question a été envoyée ici : <#${ticketChannel.id}>`, ephemeral: true });

    ticketChannel.setTopic(`Ouvert par ${user.tag} (${user.id})`);
    ticketChannel.createdBy = user.id;
  }

  if (interaction.isButton() && interaction.customId === 'close_ticket') {
    const channel = interaction.channel;
    const closer = interaction.user;

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor('#eb37f1')
        .setDescription('🕐 Ce ticket sera fermé dans 5 secondes...')
      ],
      ephemeral: true
    });

    setTimeout(async () => {
      // Génère transcript
      const messages = await channel.messages.fetch({ limit: 100 });
      const content = messages
        .filter(m => !m.author.bot)
        .map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`)
        .reverse()
        .join('\n');

      const transcriptPath = path.join(__dirname, `transcript-${channel.id}.txt`);
      fs.writeFileSync(transcriptPath, content);

      const participants = [...new Set(messages.map(m => m.author.tag))].join(', ');

      const logChannel = await client.channels.fetch(process.env.TICKET_LOG_CHANNEL_ID);
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle(`📁 Ticket fermé`)
            .addFields(
              { name: 'Salon', value: `#${channel.name}`, inline: true },
              { name: 'Ouvert par', value: channel.topic || 'inconnu', inline: true },
              { name: 'Fermé par', value: closer.tag, inline: true },
              { name: 'Utilisateurs', value: participants }
            )
            .setFooter({ text: `Fermé le ${new Date().toLocaleString()}` })
            .setColor('#2f3136')
        ],
        files: [new AttachmentBuilder(transcriptPath)]
      });

      await channel.delete();
      fs.unlinkSync(transcriptPath);
    }, 5000);
  }
});

client.login(process.env.TOKEN);
