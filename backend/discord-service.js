/**
 * Discord Integration Service
 * Handles Discord OAuth, bot integration, and role management
 */

const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const DISCORD_API_BASE = 'https://discord.com/api/v10';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/discord/callback';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

/**
 * Generate Discord OAuth URL for server connection
 */
function getDiscordAuthUrl(creatorId) {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'guilds identify guilds.members.read',
    state: creatorId // Pass creator ID as state
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
async function exchangeCodeForToken(code) {
  try {
    const response = await axios.post(
      `${DISCORD_API_BASE}/oauth2/token`,
      new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get user's Discord guilds
 */
async function getUserGuilds(accessToken) {
  try {
    const response = await axios.get(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    // Filter guilds where user has MANAGE_GUILD permission (0x00000020)
    return response.data.filter(guild => (guild.permissions & 0x00000020) === 0x00000020);
  } catch (error) {
    console.error('Error fetching user guilds:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get guild information using bot token
 */
async function getGuildInfo(guildId) {
  try {
    const response = await axios.get(`${DISCORD_API_BASE}/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching guild info:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get guild roles using bot token
 */
async function getGuildRoles(guildId) {
  try {
    const response = await axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/roles`, {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching guild roles:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get guild channels using bot token
 */
async function getGuildChannels(guildId) {
  try {
    const response = await axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`
      }
    });

    // Filter text channels only
    return response.data.filter(channel => channel.type === 0);
  } catch (error) {
    console.error('Error fetching guild channels:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Add role to guild member
 */
async function addRoleToMember(guildId, userId, roleId) {
  try {
    await axios.put(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {},
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error adding role to member:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Remove role from guild member
 */
async function removeRoleFromMember(guildId, userId, roleId) {
  try {
    await axios.delete(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error removing role from member:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send DM to user
 */
async function sendDirectMessage(userId, content) {
  try {
    // Create DM channel
    const dmResponse = await axios.post(
      `${DISCORD_API_BASE}/users/@me/channels`,
      { recipient_id: userId },
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const channelId = dmResponse.data.id;

    // Send message
    await axios.post(
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      { content },
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Error sending DM:', error.response?.data || error.message);
    // Don't throw - DMs might be disabled
    return false;
  }
}

/**
 * Send message to channel with embed
 */
async function sendChannelMessage(channelId, content, embed = null) {
  try {
    const payload = { content };
    if (embed) {
      payload.embeds = [embed];
    }

    const response = await axios.post(
      `${DISCORD_API_BASE}/channels/${channelId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending channel message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Connect Discord server for creator
 */
async function connectDiscordServer(creatorId, guildId, accessToken) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get guild info
    const guildInfo = await getGuildInfo(guildId);

    // Calculate token expiry (typically 7 days for Discord)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save Discord settings
    const result = await client.query(`
      INSERT INTO discord_settings (
        creator_id,
        guild_id,
        guild_name,
        guild_icon,
        access_token,
        token_expires_at,
        connected,
        connection_status,
        last_connected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (creator_id) DO UPDATE SET
        guild_id = $2,
        guild_name = $3,
        guild_icon = $4,
        access_token = $5,
        token_expires_at = $6,
        connected = $7,
        connection_status = $8,
        last_connected_at = $9,
        updated_at = NOW()
      RETURNING *
    `, [
      creatorId,
      guildId,
      guildInfo.name,
      guildInfo.icon,
      accessToken,
      expiresAt,
      true,
      'connected',
      new Date()
    ]);

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error connecting Discord server:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Disconnect Discord server
 */
async function disconnectDiscordServer(creatorId) {
  await pool.query(`
    UPDATE discord_settings
    SET connected = false,
        connection_status = 'disconnected',
        updated_at = NOW()
    WHERE creator_id = $1
  `, [creatorId]);

  return { success: true };
}

/**
 * Get Discord settings for creator
 */
async function getDiscordSettings(creatorId) {
  const result = await pool.query(`
    SELECT * FROM discord_settings
    WHERE creator_id = $1
  `, [creatorId]);

  return result.rows[0] || null;
}

/**
 * Update Discord notification settings
 */
async function updateNotificationSettings(creatorId, settings) {
  const result = await pool.query(`
    UPDATE discord_settings
    SET notifications_enabled = $2,
        notification_channel_id = $3,
        notification_channel_name = $4,
        updated_at = NOW()
    WHERE creator_id = $1
    RETURNING *
  `, [
    creatorId,
    settings.enabled,
    settings.channelId,
    settings.channelName
  ]);

  return result.rows[0];
}

/**
 * Update auto-role settings
 */
async function updateAutoRoleSettings(creatorId, settings) {
  const result = await pool.query(`
    UPDATE discord_settings
    SET auto_role_enabled = $2,
        role_tiers = $3,
        welcome_message = $4,
        send_dm_on_role = $5,
        updated_at = NOW()
    WHERE creator_id = $1
    RETURNING *
  `, [
    creatorId,
    settings.enabled,
    JSON.stringify(settings.roleTiers),
    settings.welcomeMessage,
    settings.sendDmOnRole
  ]);

  return result.rows[0];
}

/**
 * Process donation and assign Discord role
 */
async function processDonationForDiscord(creatorId, donation) {
  try {
    // Get Discord settings
    const settings = await getDiscordSettings(creatorId);

    if (!settings || !settings.connected || !settings.auto_role_enabled) {
      return { success: false, reason: 'Discord not configured' };
    }

    // Get role tiers
    const roleTiers = settings.role_tiers || [];
    if (roleTiers.length === 0) {
      return { success: false, reason: 'No role tiers configured' };
    }

    // Find applicable role based on donation amount
    const applicableRole = roleTiers
      .filter(tier => donation.amount >= tier.minAmount)
      .sort((a, b) => b.minAmount - a.minAmount)[0];

    if (!applicableRole) {
      return { success: false, reason: 'Donation amount too low for any role' };
    }

    // TODO: Need Discord user ID from donor
    // This would require donors to link their Discord account
    // For now, we'll log it and return

    console.log(`Would assign role ${applicableRole.roleName} for donation of $${donation.amount}`);

    return {
      success: true,
      roleToAssign: applicableRole,
      message: 'Discord integration ready - donor needs to link Discord account'
    };
  } catch (error) {
    console.error('Error processing donation for Discord:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Assign role to Discord member
 */
async function assignRoleToMember(creatorId, discordUserId, donationAmount) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get Discord settings
    const settings = await getDiscordSettings(creatorId);

    if (!settings || !settings.connected) {
      throw new Error('Discord not connected');
    }

    // Find applicable role
    const roleTiers = settings.role_tiers || [];
    const applicableRole = roleTiers
      .filter(tier => donationAmount >= tier.minAmount)
      .sort((a, b) => b.minAmount - a.minAmount)[0];

    if (!applicableRole) {
      throw new Error('No applicable role for this donation amount');
    }

    // Add role via Discord API
    await addRoleToMember(settings.guild_id, discordUserId, applicableRole.roleId);

    // Track in database
    await client.query(`
      INSERT INTO discord_members (
        creator_id,
        discord_user_id,
        roles_assigned,
        total_donated
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (creator_id, discord_user_id) DO UPDATE SET
        roles_assigned = discord_members.roles_assigned || $3::jsonb,
        total_donated = discord_members.total_donated + $4,
        last_updated_at = NOW()
    `, [
      creatorId,
      discordUserId,
      JSON.stringify([{
        roleId: applicableRole.roleId,
        roleName: applicableRole.roleName,
        assignedAt: new Date()
      }]),
      donationAmount
    ]);

    // Send welcome DM if enabled
    if (settings.send_dm_on_role) {
      await sendDirectMessage(discordUserId, settings.welcome_message);
    }

    await client.query('COMMIT');

    return {
      success: true,
      role: applicableRole
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error assigning role to member:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Send Discord notification for new donation
 */
async function sendDonationNotification(creatorId, donation) {
  const client = await pool.connect();

  try {
    // Get Discord settings
    const settings = await getDiscordSettings(creatorId);

    if (!settings || !settings.connected || !settings.notifications_enabled) {
      return { success: false, reason: 'Discord notifications not enabled' };
    }

    if (!settings.notification_channel_id) {
      return { success: false, reason: 'No notification channel configured' };
    }

    // Create embed
    const embed = {
      title: '💰 New Donation Received!',
      color: 0x667eea, // Purple color
      fields: [
        {
          name: 'Amount',
          value: `$${parseFloat(donation.amount).toFixed(2)}`,
          inline: true
        },
        {
          name: 'From',
          value: donation.donor_name || 'Anonymous',
          inline: true
        },
        {
          name: 'Payment Method',
          value: donation.payment_method === 'crypto' ? '🔷 Crypto (USDC)' : '💳 Card',
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    if (donation.message) {
      embed.fields.push({
        name: 'Message',
        value: donation.message,
        inline: false
      });
    }

    // Send message
    const message = await sendChannelMessage(
      settings.notification_channel_id,
      null,
      embed
    );

    // Log notification
    await client.query(`
      INSERT INTO discord_notifications (
        creator_id,
        donation_id,
        notification_type,
        channel_id,
        message_id,
        embeds,
        status,
        sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      creatorId,
      donation.id,
      'new_donation',
      settings.notification_channel_id,
      message.id,
      JSON.stringify([embed]),
      'sent',
      new Date()
    ]);

    return {
      success: true,
      messageId: message.id
    };
  } catch (error) {
    // Log failed notification
    await client.query(`
      INSERT INTO discord_notifications (
        creator_id,
        donation_id,
        notification_type,
        status,
        error_message
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      creatorId,
      donation.id,
      'new_donation',
      'failed',
      error.message
    ]);

    console.error('Error sending Discord notification:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

module.exports = {
  getDiscordAuthUrl,
  exchangeCodeForToken,
  getUserGuilds,
  getGuildInfo,
  getGuildRoles,
  getGuildChannels,
  connectDiscordServer,
  disconnectDiscordServer,
  getDiscordSettings,
  updateNotificationSettings,
  updateAutoRoleSettings,
  processDonationForDiscord,
  assignRoleToMember,
  sendDonationNotification,
  addRoleToMember,
  removeRoleFromMember,
  sendDirectMessage,
  sendChannelMessage
};
