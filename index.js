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
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
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

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const CATEGORY_ID = process.env.TICKET_CATEGORY_ID;

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

client.on('ready', async () => {
  const channel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('🎟️ Support - KMS SHOP')
    .setColor('#eb37f1')
    .setDescription(`🇫🇷 Sélectionne une catégorie pour ouvrir un ticket :\n\n・**Achat** : pour passer une commande\n・**Partenariat** : demande de partenariat\n・**Question** : poser une question rapidement\n\n🇬🇧 Select a category to open a ticket.`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('achat')
      .setLabel('🛒 Achat')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('partenariat')
      .setLabel('🤝 Partenariat')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('question')
      .setLabel('❓ Question')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
});

// Tickets
client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const { customId, user, guild } = interaction;
    let ticketName = '';
    let pingRoles = [];

    if (customId === 'achat') {
      ticketName = `achat-${user.username}`;
      pingRoles = ['1375220253553987767'];
    } else if (customId === 'partenariat') {
      ticketName = `partenariat-${user.username}`;
      pingRoles = ['1375220253553987767', '1375220255080714330'];
    } else if (customId === 'question') {
      const modal = new ModalBuilder()
        .setCustomId('question_modal')
        .setTitle('❓ Pose ta question')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('question_input')
              .setLabel('Quelle est ta question ?')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    const existing = guild.channels.cache.find(c => c.name === ticketName);
    if (existing) {
      return interaction.reply({ content: `❌ Un ticket est déjà ouvert ici : <#${existing.id}>`, ephemeral: true });
    }

    const channel = await guild.channels.create({
      name: ticketName,
      type: 0,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.id,
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
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket créé')
      .setDescription(`Merci ${user} d'avoir contacté le support KMS SHOP.\nUn membre du staff va vous répondre.`)
      .setColor('#eb37f1');

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: pingRoles.map(r => `<@&${r}>`).join(' '), embeds: [embed], components: [closeButton] });
    await interaction.reply({ content: `🎫 Ton ticket a été créé ici : <#${channel.id}>`, ephemeral: true });
  }

  // Modal : Question
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'question_modal') {
      const content = interaction.fields.getTextInputValue('question_input');
      const channel = await interaction.guild.channels.create({
        name: `question-${interaction.user.username}`,
        type: 0,
        parent: CATEGORY_ID,
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
            id: '1375220255080714330',
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle('❓ Question posée')
        .setDescription(`**Question :** ${content}\n**Auteur :** ${interaction.user}`)
        .setColor('#eb37f1');

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Fermer le ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ content: `<@&1375220255080714330>`, embeds: [embed], components: [closeButton] });
      await interaction.reply({ content: `❓ Ticket de question créé ici : <#${channel.id}>`, ephemeral: true });
    }
  }

  // Fermeture
  if (interaction.customId === 'close_ticket') {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription('❗ Fermeture du ticket dans 5 secondes...')
          .setColor('#eb37f1')
      ],
      ephemeral: true
    });

    setTimeout(async () => {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const content = messages
        .reverse()
        .map(m => `${m.author.tag} (${m.createdAt.toLocaleString()}): ${m.content}`)
        .join('\n');

      const filename = `transcript-${interaction.channel.name}.txt`;
      const filepath = path.join(__dirname, filename);
      fs.writeFileSync(filepath, content);

      const participants = [...new Set(messages.map(m => m.author.tag))].join(', ');

      const logEmbed = new EmbedBuilder()
        .setTitle('🎟️ Ticket fermé')
        .setColor('#2f3136')
        .addFields(
          { name: 'Ticket', value: interaction.channel.name, inline: true },
          { name: 'Fermé par', value: interaction.user.tag, inline: true },
          { name: 'Participants', value: participants || 'Aucun' },
          { name: 'Date', value: new Date().toLocaleString() }
        );

      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
      await logChannel.send({
        embeds: [logEmbed],
        files: [filepath]
      });

      await interaction.channel.delete();
      fs.unlinkSync(filepath);
    }, 5000);
  }
});

client.login(process.env.TOKEN);
