/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API, renderQuota } from '../../helpers';
import { StatusContext } from '../../context/Status';
import { UserContext } from '../../context/User';
import {
  HomeAnnouncementCard,
  HomeHeroCard,
  HomeInviteCard,
  HomeRebateCard,
} from '../../components/h5/home';

const cleanMarkdownText = (value = '') =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\-]/g, ' ')
    .replace(/\[[^\]]+\]\([^\)]+\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

const MobileConsoleHome = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [statusState] = useContext(StatusContext);
  const [userState] = useContext(UserContext);
  const [noticeSummary, setNoticeSummary] = useState('');
  const [rebateInfo, setRebateInfo] = useState({
    percent: 0,
    maxCount: 0,
  });

  const announcements = statusState?.status?.announcements || [];

  const latestAnnouncements = useMemo(
    () => (Array.isArray(announcements) ? announcements.slice(0, 3) : []),
    [announcements],
  );

  const userName = userState?.user?.username || t('用户');
  const balance = renderQuota(userState?.user?.quota || 0);
  const usedQuota = renderQuota(userState?.user?.used_quota || 0);
  const statQuota = renderQuota(
    (userState?.user?.used_quota || 0) + (userState?.user?.quota || 0),
  );
  const requestCount = Number(userState?.user?.request_count || 0).toLocaleString();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [noticeRes, topupRes] = await Promise.all([
        API.get('/api/notice').catch(() => null),
        API.get('/api/user/topup/info').catch(() => null),
      ]);

      if (!mounted) return;

      if (noticeRes?.data?.success && noticeRes.data.data) {
        setNoticeSummary(cleanMarkdownText(noticeRes.data.data));
      }

      if (topupRes?.data?.success) {
        const data = topupRes.data.data || {};
        setRebateInfo({
          percent: data.topup_rebate_percent || 0,
          maxCount: data.topup_rebate_max_count || 0,
        });
      }
    };

    load().catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className='h5-console-page h5-home-app-shell h5-home-app-offset px-2 pb-3'>
      <div className='h5-home-app-layout'>
        <HomeHeroCard
          t={t}
          userName={userName}
          balance={balance}
          usedQuota={usedQuota}
          statQuota={statQuota}
          requestCount={requestCount}
          onTopup={() => navigate('/console/topup')}
          onViewLog={() => navigate('/console/log')}
        />

        <HomeAnnouncementCard
          t={t}
          latestAnnouncements={latestAnnouncements}
          noticeSummary={noticeSummary}
          cleanMarkdownText={cleanMarkdownText}
          formatDate={formatDate}
          onViewMore={() => navigate('/console/messages')}
        />

        <HomeInviteCard
          t={t}
          affQuota={renderQuota(userState?.user?.aff_quota || 0)}
          affHistoryQuota={renderQuota(userState?.user?.aff_history_quota || 0)}
          affCount={userState?.user?.aff_count || 0}
          onView={() => navigate('/console/topup')}
        />

        <HomeRebateCard
          t={t}
          rebateInfo={rebateInfo}
          onTopup={() => navigate('/console/topup')}
        />
      </div>
    </div>
  );
};

export default MobileConsoleHome;
