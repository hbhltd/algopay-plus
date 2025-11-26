// Analytics Module for Supportly
// Provides comprehensive analytics for creators

// =====================================================
// DASHBOARD ANALYTICS
// =====================================================

async function getDashboardAnalytics(supabase, creatorId, period = 30) {
  try {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period);

    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - period);

    // Current period donations
    const { data: currentDonations } = await supabase
      .from('donations')
      .select('amount, donor_wallet, donor_email, created_at')
      .eq('creator_id', creatorId)
      .eq('status', 'completed')
      .gte('created_at', periodStart.toISOString());

    // Previous period donations (for growth calculation)
    const { data: previousDonations } = await supabase
      .from('donations')
      .select('amount')
      .eq('creator_id', creatorId)
      .eq('status', 'completed')
      .gte('created_at', prevPeriodStart.toISOString())
      .lt('created_at', periodStart.toISOString());

    // All-time donations
    const { data: allTimeDonations } = await supabase
      .from('donations')
      .select('amount')
      .eq('creator_id', creatorId)
      .eq('status', 'completed');

    // Calculate metrics
    const currentRevenue = currentDonations?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
    const previousRevenue = previousDonations?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
    const allTimeRevenue = allTimeDonations?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;

    const growthPercent = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
      : currentRevenue > 0 ? 100 : 0;

    const donationCount = currentDonations?.length || 0;
    const uniqueSupporters = new Set(
      currentDonations?.map(d => d.donor_wallet || d.donor_email).filter(Boolean)
    ).size;

    const avgDonation = donationCount > 0 ? (currentRevenue / donationCount).toFixed(2) : 0;

    // Payment method breakdown
    const { data: paymentBreakdown } = await supabase
      .from('donations')
      .select('payment_method, amount')
      .eq('creator_id', creatorId)
      .eq('status', 'completed')
      .gte('created_at', periodStart.toISOString());

    const cryptoRevenue = paymentBreakdown?.filter(d => d.payment_method === 'crypto')
      .reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;

    const cardRevenue = paymentBreakdown?.filter(d => d.payment_method === 'card')
      .reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;

    return {
      period: `${period} days`,
      revenue: {
        current: parseFloat(currentRevenue.toFixed(2)),
        allTime: parseFloat(allTimeRevenue.toFixed(2)),
        growth: parseFloat(growthPercent)
      },
      donations: {
        count: donationCount,
        average: parseFloat(avgDonation),
        crypto: paymentBreakdown?.filter(d => d.payment_method === 'crypto').length || 0,
        card: paymentBreakdown?.filter(d => d.payment_method === 'card').length || 0
      },
      supporters: {
        unique: uniqueSupporters,
        total: donationCount
      },
      breakdown: {
        crypto: parseFloat(cryptoRevenue.toFixed(2)),
        card: parseFloat(cardRevenue.toFixed(2))
      }
    };
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    throw error;
  }
}

// =====================================================
// REVENUE ANALYTICS (with time series)
// =====================================================

async function getRevenueAnalytics(supabase, creatorId, period = 30) {
  try {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period);

    const { data: donations } = await supabase
      .from('donations')
      .select('amount, created_at, payment_method')
      .eq('creator_id', creatorId)
      .eq('status', 'completed')
      .gte('created_at', periodStart.toISOString())
      .order('created_at', { ascending: true });

    // Group by day
    const dailyRevenue = {};
    donations?.forEach(donation => {
      const date = new Date(donation.created_at).toISOString().split('T')[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = 0;
      }
      dailyRevenue[date] += parseFloat(donation.amount);
    });

    // Convert to chart data
    const chartData = Object.entries(dailyRevenue).map(([date, amount]) => ({
      date,
      revenue: parseFloat(amount.toFixed(2))
    }));

    // Hourly distribution
    const hourlyDistribution = Array(24).fill(0);
    donations?.forEach(donation => {
      const hour = new Date(donation.created_at).getHours();
      hourlyDistribution[hour]++;
    });

    // Day of week distribution
    const weeklyDistribution = Array(7).fill(0);
    donations?.forEach(donation => {
      const day = new Date(donation.created_at).getDay();
      weeklyDistribution[day]++;
    });

    return {
      chartData,
      patterns: {
        hourly: hourlyDistribution.map((count, hour) => ({ hour, count })),
        weekly: weeklyDistribution.map((count, day) => ({
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
          count
        }))
      },
      totalRevenue: donations?.reduce((sum, d) => sum + parseFloat(d.amount), 0).toFixed(2) || '0.00'
    };
  } catch (error) {
    console.error('Revenue analytics error:', error);
    throw error;
  }
}

// =====================================================
// SUPPORTER ANALYTICS
// =====================================================

async function getSupporterAnalytics(supabase, creatorId) {
  try {
    const { data: donations } = await supabase
      .from('donations')
      .select('donor_wallet, donor_email, donor_name, amount, created_at')
      .eq('creator_id', creatorId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // Group by supporter
    const supporters = {};
    donations?.forEach(donation => {
      const key = donation.donor_wallet || donation.donor_email || 'anonymous';
      if (!supporters[key]) {
        supporters[key] = {
          identifier: key,
          name: donation.donor_name || 'Anonymous',
          totalDonated: 0,
          donationCount: 0,
          firstDonation: donation.created_at,
          lastDonation: donation.created_at
        };
      }
      supporters[key].totalDonated += parseFloat(donation.amount);
      supporters[key].donationCount++;
      if (new Date(donation.created_at) < new Date(supporters[key].firstDonation)) {
        supporters[key].firstDonation = donation.created_at;
      }
    });

    // Convert to array and sort by total donated
    const supporterList = Object.values(supporters)
      .map(s => ({
        ...s,
        totalDonated: parseFloat(s.totalDonated.toFixed(2)),
        avgDonation: parseFloat((s.totalDonated / s.donationCount).toFixed(2))
      }))
      .sort((a, b) => b.totalDonated - a.totalDonated);

    // Top 10 supporters
    const topSupporters = supporterList.slice(0, 10);

    // Retention metrics
    const repeatSupporters = supporterList.filter(s => s.donationCount > 1).length;
    const retentionRate = supporterList.length > 0
      ? ((repeatSupporters / supporterList.length) * 100).toFixed(1)
      : '0';

    return {
      total: supporterList.length,
      repeat: repeatSupporters,
      retentionRate: parseFloat(retentionRate),
      topSupporters,
      all: supporterList
    };
  } catch (error) {
    console.error('Supporter analytics error:', error);
    throw error;
  }
}

// =====================================================
// PAYMENT METHOD BREAKDOWN
// =====================================================

async function getPaymentBreakdown(supabase, creatorId) {
  try {
    const { data: donations } = await supabase
      .from('donations')
      .select('payment_method, amount')
      .eq('creator_id', creatorId)
      .eq('status', 'completed');

    const breakdown = {
      crypto: {
        count: 0,
        revenue: 0
      },
      card: {
        count: 0,
        revenue: 0
      }
    };

    donations?.forEach(donation => {
      const method = donation.payment_method || 'crypto';
      breakdown[method].count++;
      breakdown[method].revenue += parseFloat(donation.amount);
    });

    // Amount distribution (group into ranges)
    const ranges = {
      '0-10': 0,
      '10-25': 0,
      '25-50': 0,
      '50-100': 0,
      '100+': 0
    };

    donations?.forEach(donation => {
      const amount = parseFloat(donation.amount);
      if (amount < 10) ranges['0-10']++;
      else if (amount < 25) ranges['10-25']++;
      else if (amount < 50) ranges['25-50']++;
      else if (amount < 100) ranges['50-100']++;
      else ranges['100+']++;
    });

    return {
      byMethod: {
        crypto: {
          count: breakdown.crypto.count,
          revenue: parseFloat(breakdown.crypto.revenue.toFixed(2)),
          percentage: donations?.length > 0
            ? ((breakdown.crypto.count / donations.length) * 100).toFixed(1)
            : 0
        },
        card: {
          count: breakdown.card.count,
          revenue: parseFloat(breakdown.card.revenue.toFixed(2)),
          percentage: donations?.length > 0
            ? ((breakdown.card.count / donations.length) * 100).toFixed(1)
            : 0
        }
      },
      amountDistribution: Object.entries(ranges).map(([range, count]) => ({
        range,
        count
      }))
    };
  } catch (error) {
    console.error('Payment breakdown error:', error);
    throw error;
  }
}

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

async function exportAnalyticsCSV(supabase, creatorId) {
  try {
    const { data: donations } = await supabase
      .from('donations')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // CSV headers
    let csv = 'Date,Donor Name,Donor Email,Donor Wallet,Amount,Payment Method,Transaction Hash,Message\n';

    // CSV rows
    donations?.forEach(donation => {
      const row = [
        new Date(donation.created_at).toLocaleString(),
        donation.donor_name || '',
        donation.donor_email || '',
        donation.donor_wallet || '',
        donation.amount,
        donation.payment_method || 'crypto',
        donation.tx_hash || '',
        (donation.message || '').replace(/"/g, '""') // Escape quotes
      ];
      csv += `"${row.join('","')}"\n`;
    });

    return csv;
  } catch (error) {
    console.error('CSV export error:', error);
    throw error;
  }
}

async function exportAnalyticsJSON(supabase, creatorId) {
  try {
    const [donations, dashboard, revenue, supporters, breakdown] = await Promise.all([
      supabase
        .from('donations')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false }),
      getDashboardAnalytics(supabase, creatorId, 30),
      getRevenueAnalytics(supabase, creatorId, 30),
      getSupporterAnalytics(supabase, creatorId),
      getPaymentBreakdown(supabase, creatorId)
    ]);

    return {
      exportedAt: new Date().toISOString(),
      creatorId,
      summary: dashboard,
      revenue: revenue,
      supporters: supporters,
      breakdown: breakdown,
      donations: donations.data
    };
  } catch (error) {
    console.error('JSON export error:', error);
    throw error;
  }
}

module.exports = {
  getDashboardAnalytics,
  getRevenueAnalytics,
  getSupporterAnalytics,
  getPaymentBreakdown,
  exportAnalyticsCSV,
  exportAnalyticsJSON
};
