const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

const envPath = path.resolve(__dirname, '.env');
const envExamplePath = path.resolve(__dirname, '.env.example');

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else if (fs.existsSync(envExamplePath)) {
  require('dotenv').config({ path: envExamplePath });
}

const token = process.env.DISCORD_TOKEN;

if (!token || token.includes('your_bot_token_here')) {
  console.error('❌ Token Discord introuvable ou invalide. Ajoutez votre vrai token bot dans le fichier .env.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const promoMessage = `## 🧠 Cheapest OG & Secret Brainrots 🧠 
-------------------------

💸  **The best OG & Secret Brainrots prices!** 💸 
## 🔗 LINK: [Brainrots - Buy NOW](<https://gameboost.com/steal-a-brainrot/items?cmpid=385>)
- ⚡ Instant Delivery
- 🛒 Huge, trusted gaming marketplace (2M+ monthly visitors!)
- 💰 Best prices in the market
- 💳 Crypto payments available

Strawberry Elephants, Skibidi Toilet, Meowl, Hadless Horseman, Griffin, Dragon Cannelloni, Capitano Moby, Garama And Madundung - AND MORE...
https://cdn.discordapp.com/attachments/1521792875107582006/1532681734062084157/image.png?ex=6a6dbc99&is=6a6c6b19&hm=4e1737703a0435e8e0957b4af4ce93055cef9dc11c1d8fce7fd898e2a48dce03`;

const PROMO_BUTTON_ID = 'promo_button_ephemeral';

const channelCounters = new Map();

client.once('ready', () => {
  console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
});

// Periodically post the promo+button in all text channels and delete the previous one
const POST_INTERVAL_MS = 5000; // 5 seconds

client.once('ready', () => {
  console.log('🔁 Lancement du poster périodique toutes les', POST_INTERVAL_MS / 1000, 'secondes');

  setInterval(async () => {
    try {
      const channels = client.channels.cache.filter(c => c.isTextBased() && c.guild);
      for (const [id, channel] of channels) {
        try {
          const perms = channel.permissionsFor(client.user);
          if (!perms || !perms.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel])) continue;

          const state = channelCounters.get(id) || { count: 0, promoMessageId: null, sending: false };

          // Post only the button (no promo text) so users click to see the promo.
          // Send the new message first, then delete the previous one immediately.
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(PROMO_BUTTON_ID)
              .setLabel('🍓 Cheapest OG & Secret Brainrot 🍓')
              .setStyle(ButtonStyle.Primary)
          );

          const sent = await channel.send({ content: 'Click the button to view the promo (visible only to you)', components: [row] }).catch(() => null);
          if (sent) {
            const oldId = state.promoMessageId;
            state.promoMessageId = sent.id;
            channelCounters.set(id, state);

            if (oldId && oldId !== sent.id) {
              // delete previous promo right after posting the new one
              const old = await channel.messages.fetch(oldId).catch(() => null);
              if (old) await old.delete().catch(() => {});
            }
          }
        } catch (err) {
          // ignore per-channel errors
        }
      }
    } catch (err) {
      console.error('Erreur dans la tâche périodique :', err);
    }
  }, POST_INTERVAL_MS);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton() && interaction.customId === PROMO_BUTTON_ID) {
      await interaction.reply({ content: promoMessage, ephemeral: true });
    }
  } catch (err) {
    console.error('Erreur interaction:', err);
  }
});

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.channel || !message.channel.isTextBased()) return;

  // Admin command to post a button that users can click to receive the promo ephemerally
  if (message.content === '!postbutton') {
    if (!message.member.permissions.has('ManageGuild')) {
      await message.reply('Tu n\'as pas la permission de faire ça.');
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(PROMO_BUTTON_ID)
        .setLabel('🍓 Cheapest OG & Secret Brainrot 🍓')
        .setStyle(ButtonStyle.Primary)
    );

    // Post the full promo message in the channel with the ephemeral button attached
    await message.channel.send({ content: promoMessage, components: [row] });
    return;
  }

  // No per-message posting behavior. Periodic poster handles button posting every 10s.
});

client.login(token);
