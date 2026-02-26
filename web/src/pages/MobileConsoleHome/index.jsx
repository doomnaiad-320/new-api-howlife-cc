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
import { API, copy, renderQuota, setUserData, showSuccess } from '../../helpers';
import { StatusContext } from '../../context/Status';
import { UserContext } from '../../context/User';
import { useNotifications } from '../../hooks/common/useNotifications';
import {
  HomeAnnouncementCard,
  HomeHeroCard,
  HomeInviteCard,
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
  const [userState, userDispatch] = useContext(UserContext);
  const [noticeSummary, setNoticeSummary] = useState('');
  const [rebateInfo, setRebateInfo] = useState({
    percent: 0,
    maxCount: 0,
  });
  const [inviteCode, setInviteCode] = useState('');
  const { unreadCount, handleNoticeClose } = useNotifications(statusState);

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
  const inviteCodeValue = inviteCode || userState?.user?.aff_code || '';
  const inviteLink = inviteCodeValue
    ? `${window.location.origin}/register?aff=${inviteCodeValue}`
    : '';

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [noticeRes, topupRes, userRes, affRes] = await Promise.all([
        API.get('/api/notice').catch(() => null),
        API.get('/api/user/topup/info').catch(() => null),
        API.get('/api/user/self').catch(() => null),
        API.get('/api/user/aff').catch(() => null),
      ]);

      if (!mounted) return;

      if (userRes?.data?.success && userRes.data.data) {
        userDispatch({ type: 'login', payload: userRes.data.data });
        setUserData(userRes.data.data);
      }

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

      if (affRes?.data?.success && affRes.data.data) {
        setInviteCode(String(affRes.data.data));
      }
    };

    load().catch(() => {});

    return () => {
      mounted = false;
    };
  }, [userDispatch]);

  const handleCopyInviteCode = async () => {
    if (!inviteCodeValue) return;
    const ok = await copy(inviteCodeValue);
    if (ok) {
      showSuccess(t('邀请码已复制到剪切板'));
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink) return;
    const ok = await copy(inviteLink);
    if (ok) {
      showSuccess(t('邀请链接已复制到剪切板'));
    }
  };

  const handleOpenNotices = () => {
    handleNoticeClose();
    navigate('/console/messages');
  };

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
          noticeUnreadCount={unreadCount}
          onOpenNotices={handleOpenNotices}
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
          rebatePercent={rebateInfo.percent}
          inviteCode={inviteCodeValue}
          inviteLink={inviteLink}
          affHistoryQuota={renderQuota(userState?.user?.aff_history_quota || 0)}
          affCount={Number(userState?.user?.aff_count || 0).toLocaleString()}
          onCopyInviteCode={handleCopyInviteCode}
          onCopyInviteLink={handleCopyInviteLink}
        />
      </div>
    </div>
  );
};

export default MobileConsoleHome;
