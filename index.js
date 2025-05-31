
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
  ActivityType,
  ChannelType
} = require('discord.js');
const fs = require('fs');

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
  if (interaction.isButton()) {
    let ticketType = null;
    if (interaction.customId === 'ticket_achat') ticketType = 'achat';
    if (interaction.customId === 'ticket_partenariat') ticketType = 'partenariat';

    if (ticketType) {
      const channel = await interaction.guild.channels.create({
        name: `${ticketType}-${interaction.user.username}`,
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
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle(`🎫 Ticket ${ticketType}`)
        .setDescription(`Merci ${interaction.user} d'avoir contacté **Kms Shop**.
__Explique ta demande ci-dessous.__`)
        .setColor('#eb37f1');

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Fermer le ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ embeds: [embed], components: [closeButton] });
      await interaction.reply({ content: `🎫 Ton ticket a été créé ici : <#${channel.id}>`, ephemeral: true });
    }

    if (interaction.customId === 'ticket_question') {
      const modal = new ModalBuilder()
        .setCustomId('question_modal')
        .setTitle('Pose ta question');

      const questionInput = new TextInputBuilder()
        .setCustomId('question_text')
        .setLabel("Ta question")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(questionInput);
      modal.addComponents(firstActionRow);
      await interaction.showModal(modal);
    }

    if (interaction.customId === 'close_ticket') {
      const confirm = new EmbedBuilder()
        .setDescription('🔒 Le ticket sera fermé dans 5 secondes...')
        .setColor('#eb37f1');
      await interaction.reply({ embeds: [confirm], ephemeral: true });

      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      const content = messages.reverse().map(m => `${m.author.tag}: ${m.content}`).join('\n');
      const fileName = `transcript-${interaction.channel.name}.txt`;
      fs.writeFileSync(fileName, content);

      const logChannel = await client.channels.fetch(process.env.TICKET_LOG_CHANNEL_ID);
      if (logChannel) {
        await logChannel.send({
          content: `🎫 Ticket **${interaction.channel.name}** fermé par ${interaction.user.tag}`,
          files: [fileName]
        });
      }

      setTimeout(() => {
        fs.unlinkSync(fileName);
        interaction.channel.delete();
      }, 5000);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'question_modal') {
      const response = interaction.fields.getTextInputValue('question_text');

      const channel = await interaction.guild.channels.create({
        name: `question-${interaction.user.username}`,
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
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle('❓ Question reçue')
        .setDescription(`**Utilisateur :** ${interaction.user}\n**Question :** ${response}`)
        .setColor('#eb37f1');

      const closeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Fermer le ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({ embeds: [embed], components: [closeButton] });
      await interaction.reply({ content: `❓ Ta question a été envoyée ici : <#${channel.id}>`, ephemeral: true });
    }
  }
});

client.on('ready', async () => {
  const channel = await client.channels.fetch(process.env.TICKET_CHANNEL_ID);

  const embed = new EmbedBuilder()
    .setTitle('🎫 Kms • Support ✨')
.setDescription(`🇫🇷
Ticket abusif ou troll = **ban**
Évitez de mentionner le responsable inutilement
S'il ne répond pas, il n’est pas disponible
Merci de votre compréhension.

🇬🇧
Abusive or trolling ticket = **ban**
Avoid mentioning the manager unnecessarily
If they don't respond, they're not available
Thank you for your understanding.

Kms Gestion`)
    .setColor('#eb37f1')
    .setThumbnail('https://cdn.discordapp.com/attachments/1375912569193234643/1378470888986378311/pp.png?ex=683cb88e&is=683b670e&hm=d5e6fde90f288db55de0255f4715994052fcfc0c9e37f46404741c7ec4916d66&');

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_partenariat').setLabel('Partenariat').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_achat').setLabel('Achat').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_question').setLabel('Question').setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [buttons] });
});

client.login(process.env.TOKEN);
