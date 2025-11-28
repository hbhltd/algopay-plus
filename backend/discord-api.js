/**
 * Discord API Routes
 * RESTful API endpoints for Discord integration
 */

const express = require('express');
const router = express.Router();
const discordService = require('./discord-service');
const { requireFeature } = require('./subscription-middleware');

/**
 * GET /api/discord/auth-url/:creatorId
 * Get Discord OAuth URL for connecting server
 */
router.get('/auth-url/:creatorId', requireFeature('discordIntegration'), (req, res) => {
  try {
    const { creatorId } = req.params;
    const authUrl = discordService.getDiscordAuthUrl(creatorId);

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Error generating Discord auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Discord authorization URL'
    });
  }
});

/**
 * GET /api/discord/callback
 * OAuth callback from Discord
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state: creatorId } = req.query;

    if (!code || !creatorId) {
      return res.status(400).json({
        success: false,
        error: 'Missing code or creator ID'
      });
    }

    // Exchange code for token
    const tokenData = await discordService.exchangeCodeForToken(code);

    // Get user's guilds
    const guilds = await discordService.getUserGuilds(tokenData.access_token);

    if (guilds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No Discord servers found where you have management permissions'
      });
    }

    // If only one guild, auto-connect it
    if (guilds.length === 1) {
      await discordService.connectDiscordServer(
        creatorId,
        guilds[0].id,
        tokenData.access_token
      );

      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/integrations?discord=connected`);
    }

    // Multiple guilds - redirect to selection page
    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/integrations/discord/select?` +
      `guilds=${encodeURIComponent(JSON.stringify(guilds))}&` +
      `token=${encodeURIComponent(tokenData.access_token)}&` +
      `creatorId=${creatorId}`
    );
  } catch (error) {
    console.error('Error in Discord OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/integrations?discord=error`);
  }
});

/**
 * POST /api/discord/connect
 * Connect a specific Discord server
 * Body: { creatorId, guildId, accessToken }
 */
router.post('/connect', requireFeature('discordIntegration'), async (req, res) => {
  try {
    const { creatorId, guildId, accessToken } = req.body;

    if (!creatorId || !guildId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'creatorId, guildId, and accessToken are required'
      });
    }

    const settings = await discordService.connectDiscordServer(
      creatorId,
      guildId,
      accessToken
    );

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error connecting Discord server:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect Discord server'
    });
  }
});

/**
 * POST /api/discord/disconnect
 * Disconnect Discord server
 * Body: { creatorId }
 */
router.post('/disconnect', async (req, res) => {
  try {
    const { creatorId } = req.body;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        error: 'creatorId is required'
      });
    }

    await discordService.disconnectDiscordServer(creatorId);

    res.json({
      success: true,
      message: 'Discord server disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Discord server:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Discord server'
    });
  }
});

/**
 * GET /api/discord/settings/:creatorId
 * Get Discord settings for creator
 */
router.get('/settings/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    const settings = await discordService.getDiscordSettings(creatorId);

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching Discord settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Discord settings'
    });
  }
});

/**
 * GET /api/discord/guild/:creatorId/roles
 * Get Discord server roles
 */
router.get('/guild/:creatorId/roles', requireFeature('discordIntegration'), async (req, res) => {
  try {
    const { creatorId } = req.params;

    const settings = await discordService.getDiscordSettings(creatorId);

    if (!settings || !settings.connected) {
      return res.status(400).json({
        success: false,
        error: 'Discord server not connected'
      });
    }

    const roles = await discordService.getGuildRoles(settings.guild_id);

    // Filter out @everyone and managed roles
    const availableRoles = roles.filter(role =>
      role.name !== '@everyone' && !role.managed
    );

    res.json({
      success: true,
      roles: availableRoles
    });
  } catch (error) {
    console.error('Error fetching Discord roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Discord roles'
    });
  }
});

/**
 * GET /api/discord/guild/:creatorId/channels
 * Get Discord server channels
 */
router.get('/guild/:creatorId/channels', requireFeature('discordIntegration'), async (req, res) => {
  try {
    const { creatorId } = req.params;

    const settings = await discordService.getDiscordSettings(creatorId);

    if (!settings || !settings.connected) {
      return res.status(400).json({
        success: false,
        error: 'Discord server not connected'
      });
    }

    const channels = await discordService.getGuildChannels(settings.guild_id);

    res.json({
      success: true,
      channels
    });
  } catch (error) {
    console.error('Error fetching Discord channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Discord channels'
    });
  }
});

/**
 * PUT /api/discord/notifications
 * Update Discord notification settings
 * Body: { creatorId, enabled, channelId, channelName }
 */
router.put('/notifications', requireFeature('discordIntegration'), async (req, res) => {
  try {
    const { creatorId, enabled, channelId, channelName } = req.body;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        error: 'creatorId is required'
      });
    }

    const settings = await discordService.updateNotificationSettings(creatorId, {
      enabled,
      channelId,
      channelName
    });

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error updating Discord notification settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Discord notification settings'
    });
  }
});

/**
 * PUT /api/discord/auto-roles
 * Update Discord auto-role settings
 * Body: { creatorId, enabled, roleTiers, welcomeMessage, sendDmOnRole }
 */
router.put('/auto-roles', requireFeature('discordIntegration'), async (req, res) => {
  try {
    const { creatorId, enabled, roleTiers, welcomeMessage, sendDmOnRole } = req.body;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        error: 'creatorId is required'
      });
    }

    const settings = await discordService.updateAutoRoleSettings(creatorId, {
      enabled,
      roleTiers,
      welcomeMessage,
      sendDmOnRole
    });

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error updating Discord auto-role settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Discord auto-role settings'
    });
  }
});

/**
 * POST /api/discord/test-notification
 * Send a test notification to Discord
 * Body: { creatorId }
 */
router.post('/test-notification', requireFeature('discordIntegration'), async (req, res) => {
  try {
    const { creatorId } = req.params;

    const settings = await discordService.getDiscordSettings(creatorId);

    if (!settings || !settings.connected || !settings.notification_channel_id) {
      return res.status(400).json({
        success: false,
        error: 'Discord notifications not configured'
      });
    }

    const embed = {
      title: '🧪 Test Notification',
      description: 'This is a test notification from Supportly!',
      color: 0x667eea,
      fields: [
        {
          name: 'Status',
          value: '✅ Discord integration is working correctly!',
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };

    await discordService.sendChannelMessage(
      settings.notification_channel_id,
      null,
      embed
    );

    res.json({
      success: true,
      message: 'Test notification sent successfully!'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test notification'
    });
  }
});

/**
 * POST /api/discord/assign-role
 * Manually assign role to Discord member
 * Body: { creatorId, discordUserId, donationAmount }
 */
router.post('/assign-role', requireFeature('discordIntegration'), async (req, res) => {
  try {
    const { creatorId, discordUserId, donationAmount } = req.body;

    if (!creatorId || !discordUserId || !donationAmount) {
      return res.status(400).json({
        success: false,
        error: 'creatorId, discordUserId, and donationAmount are required'
      });
    }

    const result = await discordService.assignRoleToMember(
      creatorId,
      discordUserId,
      donationAmount
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error assigning Discord role:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign Discord role'
    });
  }
});

module.exports = router;
